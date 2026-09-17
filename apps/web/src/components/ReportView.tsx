import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card } from '@dailyglow/ui';
import { fetchReport, reportAsText, type ActivityStat, type Report } from '@/lib/report';

/**
 * 학습 리포트 — 부모 화면(설정) 안에 있다.
 *
 * 아이가 앱에서 무엇을 얼마나 했고, 무엇이 되고 무엇이 안 되는지를 보여준다.
 * 종이 문제집이나 다른 학습기 기록은 앱이 볼 수 없으므로 여기 들어 있지 않다.
 *
 * **숫자만 내놓고 판단은 떠넘기지 않는다.** 숫자만 보면 "맞춤법 54%" 가 무슨
 * 뜻인지 알 수 없다. 그래서 눈에 띄는 것은 문장으로 적어 준다 — 다만 앱이
 * 아는 만큼만이고, 넘겨짚지 않는다.
 */
export function ReportView({ profileId, name }: { profileId: string; name: string }) {
  const [weeks, setWeeks] = useState(1);
  const { data: report, isPending } = useQuery({
    queryKey: ['report', profileId, weeks],
    queryFn: () => fetchReport(profileId, weeks),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {[
          { n: 1, label: '이번 주' },
          { n: 4, label: '지난 4주' },
          { n: 12, label: '지난 12주' },
        ].map(({ n, label }) => (
          <Button
            key={n}
            variant={weeks === n ? 'primary' : 'ghost'}
            data-testid="report-range"
            onClick={() => setWeeks(n)}
          >
            {label}
          </Button>
        ))}
      </div>

      {isPending || !report ? (
        <Card className="text-center text-slate-400">불러오는 중이에요…</Card>
      ) : report.rounds === 0 ? (
        <Card className="text-center text-slate-500" data-testid="report-empty">
          이 기간에 한 기록이 없어요.
        </Card>
      ) : (
        <ReportBody name={name} report={report} />
      )}
    </div>
  );
}

function ReportBody({ name, report }: { name: string; report: Report }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-1" data-testid="report-summary">
        <p className="text-2xl font-bold text-glow-700">
          {report.days}일 · {report.rounds}판 · {report.minutes}분
        </p>
        <p className="text-sm text-slate-500">
          끝낸 판만 셉니다. 중간에 그만둔 것은 기록에 남지 않아요.
        </p>
      </Card>

      {/* 활동별 — 약한 것이 위로 온다. */}
      <Card className="flex flex-col gap-3">
        <h3 className="font-bold text-glow-700">활동별</h3>
        {report.activities.map((a) => (
          <ActivityRow key={a.title} stat={a} />
        ))}
      </Card>

      <Notes report={report} />

      {report.wrongTop.length > 0 ? (
        <Card className="flex flex-col gap-2" data-testid="report-wrong">
          <h3 className="font-bold text-glow-700">자주 틀린 것</h3>
          <div className="flex flex-wrap gap-2">
            {report.wrongTop.map((w) => (
              <span
                key={w.label}
                className="rounded-2xl bg-rose-50 px-3 py-1 text-rose-500"
              >
                {w.label}
                {w.count > 1 ? <b className="ml-1">{w.count}번</b> : null}
              </span>
            ))}
          </div>
          <p className="text-sm text-slate-400">
            첫 시도에 틀린 것만 셉니다. 다시 풀어 맞힌 것도 여기 들어가요.
          </p>
        </Card>
      ) : null}

      <div className="flex justify-center">
        <Button
          variant="ghost"
          data-testid="report-copy"
          onClick={() => {
            void navigator.clipboard
              ?.writeText(reportAsText(name, report))
              .then(() => setCopied(true))
              .catch(() => setCopied(false));
          }}
        >
          {copied ? '복사했어요' : '글로 복사하기'}
        </Button>
      </div>
    </div>
  );
}

function ActivityRow({ stat }: { stat: ActivityStat }) {
  const rate = stat.rate;
  const color =
    rate === null
      ? 'text-slate-400'
      : rate >= 90
        ? 'text-glow-600'
        : rate >= 70
          ? 'text-slate-600'
          : 'text-rose-500';

  return (
    <div data-testid="report-activity" className="flex flex-col gap-1 border-b border-glow-100 pb-2 last:border-none">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-bold text-slate-700">{stat.title}</span>
        <span className={`font-bold ${color}`}>
          {rate === null ? `${stat.rounds}판` : `${rate}%`}
        </span>
      </div>
      <p className="text-sm text-slate-400">
        {stat.rounds}판
        {stat.total > 0 ? ` · 첫 시도 ${stat.correct}/${stat.total}` : ''}
        {stat.perProblem !== null ? ` · 문제당 ${stat.perProblem}초` : ''}
      </p>
    </div>
  );
}

/**
 * 눈에 띄는 것을 문장으로.
 *
 * **아는 만큼만 적는다.** 판이 몇 안 되면 "아직 이르다" 고 적고, 오래 걸린 판을
 * 두고 집중했다거나 딴짓했다고 말하지 않는다. 앱은 그것을 알 수 없다.
 */
function Notes({ report }: { report: Report }) {
  const notes: { tone: 'good' | 'warn' | 'plain'; text: string }[] = [];

  const scored = report.activities.filter((a) => a.rate !== null);
  const weak = scored.filter((a) => (a.rate ?? 100) < 70);
  const strong = scored.filter((a) => (a.rate ?? 0) >= 90 && a.total >= 5);
  const rushed = scored.filter((a) => a.perProblem !== null && a.perProblem < 2);
  const recovered = scored.filter((a) => a.alwaysRecovered && (a.rate ?? 100) < 90);

  for (const a of strong) {
    notes.push({
      tone: 'good',
      text: `${a.title} — ${a.total}문제 중 ${a.correct}개를 첫 시도에 맞혔어요. 더 어려운 쪽으로 올려도 될 자리입니다.`,
    });
  }
  for (const a of recovered) {
    notes.push({
      tone: 'good',
      text: `${a.title} — 첫 시도는 ${a.rate}%였지만 다시 풀어 끝내 다 맞혔어요. 모르는 것이 아니라 처음에 놓친 것입니다.`,
    });
  }
  for (const a of rushed) {
    notes.push({
      tone: 'warn',
      text: `${a.title} — 문제 하나에 ${a.perProblem}초. 읽고 고르기에는 짧은 시간이에요.`,
    });
  }
  for (const a of weak.filter((w) => !recovered.includes(w))) {
    notes.push({
      tone: 'warn',
      text: `${a.title} — 첫 시도 ${a.rate}%. 다시 풀어도 남는 것이 있어 한 번 더 볼 자리입니다.`,
    });
  }

  if (report.rounds < 5) {
    notes.push({
      tone: 'plain',
      text: `기록이 ${report.rounds}판뿐이라 아직 버릇이라고 말하기는 일러요. 2~3주쯤 쌓이면 요일과 시간대까지 보입니다.`,
    });
  }

  if (notes.length === 0) return null;

  return (
    <Card className="flex flex-col gap-2" data-testid="report-notes">
      <h3 className="font-bold text-glow-700">눈에 띄는 것</h3>
      {notes.map((n) => (
        <p
          key={n.text}
          className={`rounded-2xl px-4 py-2 text-slate-600 ${
            n.tone === 'good' ? 'bg-glow-50' : n.tone === 'warn' ? 'bg-rose-50' : 'bg-slate-50'
          }`}
        >
          {n.text}
        </p>
      ))}
    </Card>
  );
}

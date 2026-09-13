import { useState } from 'react';
import { Button, Card } from '@dailyglow/ui';
import { spawnConfetti } from '@/lib/confetti';
import { speak } from '@/lib/speak';
import type { ActivityProps } from '@/activities/types';
import {
  layoutFor,
  makeSheet,
  optionsForStage,
  type SheetKind,
  type SheetRow,
} from './generate';

/**
 * 쓰기 연습지.
 *
 * **화면에서 쓰지 않는다.** 인쇄해서 연필로 쓴다. 여섯 살은 손에 힘을 키워야 할
 * 나이라, 태블릿에 스타일러스로 쓰는 것이 연필을 쥐고 종이에 눌러 쓰는 것을
 * 대신하지 못한다. 태블릿의 몫은 아이 단계에 맞는 글자를 골라 인쇄해 주는 것까지다.
 *
 * 그래서 화면은 두 걸음뿐이다 — 무엇을 쓸지 고르고, 연습지를 보고 인쇄한다.
 */
export function WorksheetActivity({ lesson, onFinish }: ActivityProps) {
  const stage = Math.max(1, lesson.childLevel);
  const options = optionsForStage(stage);

  const [kind, setKind] = useState<SheetKind | null>(null);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [startedAt, setStartedAt] = useState(0);
  const [saved, setSaved] = useState(false);

  function begin(chosen: SheetKind) {
    setKind(chosen);
    setRows(makeSheet(chosen, stage));
    setStartedAt(Date.now());
    setSaved(false);
  }

  // ── ① 무엇을 쓸지 고르기 ──────────────────────────────
  if (kind === null) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-center text-3xl font-bold text-glow-600">쓰기 연습지</h1>
        <p className="text-center text-slate-500">
          인쇄해서 연필로 써요. 무엇을 써볼까요?
        </p>
        {options.map((o) => (
          <button
            key={o.kind}
            data-testid="kind"
            data-kind={o.kind}
            onClick={() => begin(o.kind)}
            className="min-h-touch rounded-3xl bg-white p-5 text-left text-2xl font-bold text-glow-700 ring-1 ring-black/5 transition-transform active:scale-95"
          >
            ✏️ {o.label}
          </button>
        ))}
      </div>
    );
  }

  // ── ② 연습지 ──────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-2xl font-bold text-glow-600">
          {options.find((o) => o.kind === kind)?.label}
        </h1>
        <Button variant="ghost" onClick={() => setKind(null)}>
          ← 다시 고르기
        </Button>
      </div>

      <Card className="flex flex-wrap gap-2 print:hidden">
        <Button size="lg" onClick={() => window.print()}>
          🖨️ 인쇄하기
        </Button>
        <Button variant="ghost" onClick={() => setRows(makeSheet(kind, stage))}>
          🔄 다른 글자로
        </Button>
      </Card>

      <Sheet rows={rows} kind={kind} onSpeak={(t) => speak(t)} />

      <Card className="flex flex-col items-center gap-3 text-center print:hidden">
        {saved ? (
          <p data-testid="saved" className="font-bold text-glow-600">
            잘했어요! 오늘 쓰기 연습을 마쳤어요. ✏️
          </p>
        ) : (
          <>
            <p className="text-slate-500">종이에 다 쓰고 나면 눌러주세요.</p>
            <Button
              size="lg"
              onClick={() => {
                setSaved(true);
                spawnConfetti();
                onFinish({
                  totalCount: rows.length,
                  // 종이에 쓴 글씨는 앱이 채점하지 않는다. 점수 대신 "했다" 만 남긴다.
                  correctCount: rows.length,
                  durationSec: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
                  mode: 'paper',
                  meta: { kind, stage, scored: false },
                });
              }}
            >
              다 썼어요
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}

/**
 * 연습지 한 장.
 *
 * 여섯 살이 쓰는 것이라 칸을 크게, 줄 사이를 넓게 잡는다. 손을 가누기 어려운
 * 나이라 칸이 작으면 글씨가 삐져나가고, 줄이 붙어 있으면 어디에 쓸지 헷갈린다.
 * 첫 번째는 따라 쓰도록 흐리게 본보기를 보여주고 나머지는 비운다.
 */
function Sheet({
  rows,
  kind,
  onSpeak,
}: {
  rows: SheetRow[];
  kind: SheetKind;
  onSpeak: (text: string) => void;
}) {
  const layout = layoutFor(kind);
  // 낱말은 글자가 둘셋이라 다섯 번이면 줄이 길어진다. 칸을 조금 줄여 한 줄에 담는다.
  const boxSize =
    kind === 'word'
      ? 'h-14 w-14 text-3xl print:h-16 print:w-16 print:text-4xl'
      : 'h-20 w-20 text-5xl print:h-28 print:w-28 print:text-6xl';

  return (
    <div data-testid="sheet" className="flex flex-col gap-6 print:gap-10">
      {rows.map((row) => (
        <div key={row.text} data-testid="sheet-row" className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onSpeak(row.sound)}
            aria-label={`${row.sound} 읽어주기`}
            className="self-start text-sm text-glow-600 print:hidden"
          >
            🔊 {row.sound}
          </button>

          {layout.ruled ? (
            <RuledSentence text={row.text} blankLines={layout.blankLines} />
          ) : (
            <div className="flex flex-wrap gap-3 print:gap-4">
              {Array.from({ length: layout.writes }).map((_, i) => (
                // 한 벌은 통째로 붙어 있어야 한다 — 낱말이 줄 끝에서 쪼개지면
                // 아이가 무엇을 쓰는 중인지 놓친다.
                <span key={i} className="flex flex-nowrap gap-1">
                  {[...row.text].map((ch, ci) => (
                    <span
                      key={ci}
                      data-testid="box"
                      className={`flex items-center justify-center rounded-xl border-2 border-dashed border-glow-300 font-bold ${boxSize}`}
                    >
                      {/* 첫 번째만 본보기. 흐리게 보여줘 따라 쓰게 한다. */}
                      <span className={i === 0 ? 'text-glow-300' : 'text-transparent'}>
                        {ch}
                      </span>
                    </span>
                  ))}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * 문장 한 줄과 그 아래 빈 줄들.
 *
 * 문장은 칸에 가두지 않는다. 칸에 넣으면 띄어쓰기가 사라지고, 학교에서 쓰는
 * 줄공책과 모양이 달라 쓰는 법이 몸에 붙지 않는다.
 *
 * 대신 **띄어쓰는 자리에 ∨ 를 위에 찍어** 어디서 띄는지 눈에 보이게 한다.
 * 여섯 살에게 띄어쓰기는 규칙이 아니라 눈에 보이는 표시로 먼저 익히는 것이다.
 */
function RuledSentence({ text, blankLines }: { text: string; blankLines: number }) {
  const words = text.split(' ');

  return (
    <div className="flex flex-col gap-6 print:gap-8">
      <div
        data-testid="sample-line"
        className="flex flex-wrap items-end border-b-2 border-glow-300 pb-1 pt-5 text-4xl font-bold text-glow-300 print:text-5xl"
      >
        {words.map((w, i) => (
          <span key={i} className="flex items-end">
            {i > 0 ? (
              // 띄어쓰는 자리. 글자만큼 자리를 비우고 그 위에 ∨ 를 찍는다.
              <span data-testid="space-mark" className="relative inline-block w-8 print:w-10">
                <span
                  aria-hidden
                  className="absolute -top-5 left-1/2 -translate-x-1/2 text-2xl text-glow-500 print:text-3xl"
                >
                  ∨
                </span>
              </span>
            ) : null}
            <span>{w}</span>
          </span>
        ))}
      </div>

      {Array.from({ length: blankLines }).map((_, i) => (
        <div
          key={i}
          data-testid="blank-line"
          className="h-12 border-b-2 border-glow-300 print:h-16"
        />
      ))}
    </div>
  );
}

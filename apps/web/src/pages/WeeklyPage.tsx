import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@dailyglow/ui';
import { spawnConfetti } from '@/lib/confetti';
import { canSpeak, speak } from '@/lib/speak';
import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/stores/profile';
import { supabase } from '@/lib/supabase';
import { queueSession } from '@/lib/sync';
import { LetterGlyph, StrokeOrder } from '@/components/StrokeGuide';
import { hasStrokes } from '@/lib/strokes';
import {
  spotProblems,
  stepForDay,
  weeklyFocus,
  type SpotProblem,
  type WeeklyFocus,
} from '@/lib/weekly';

/** 한 판에 낼 문제 수 */
const SPOT_COUNT = 5;

/**
 * 이번 주의 글자.
 *
 * 아이가 활동 목록에서 아무거나 골라 풀면 그날그날 다른 것을 조금씩 건드리고
 * 끝난다. 교재가 한 주에 글자 하나를 붙잡는 데는 까닭이 있다 — **같은 글자를
 * 여러 날에 걸쳐 여러 방식으로 만나야** 손과 눈에 남는다.
 *
 * 그래서 한 주 내내 글자 하나를 두고, 날마다 만나는 방식만 바꾼다.
 * 무엇을 배울 차례인지는 아이의 한글 단계가 정한다.
 */
export function WeeklyPage() {
  const levels = useProfile((s) => s.levels);
  // 단계는 과목 id 로 담겨 있으므로, 한글 과목의 id 를 먼저 찾아야 한다.
  const { data: hangulId } = useQuery({
    queryKey: ['subject-id', 'hangul'],
    staleTime: Infinity,
    queryFn: async (): Promise<string | null> => {
      const { data } = await supabase.from('subjects').select('id').eq('slug', 'hangul').maybeSingle();
      return data?.id ?? null;
    },
  });
  const focus = weeklyFocus(hangulId ? (levels[hangulId]?.level ?? 1) : 1);
  const step = stepForDay();

  if (!focus) {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-bold text-glow-600">이번 주에 배울 글자가 없어요</h1>
        <p className="text-slate-500">
          지금 단계는 새 글자를 배우는 자리가 아니에요. 활동을 골라서 해볼까요?
        </p>
        <Link to="/">
          <Button size="lg">활동 고르러 가기</Button>
        </Link>
      </Card>
    );
  }

  const letter = focus.letters[0]!;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold text-glow-600">
          이번 주는 <span className="text-3xl">{focus.letters.join(' ')}</span>
        </h1>
        <span className="text-sm text-slate-400">
          오늘 · {step.name}
        </span>
      </div>

      {step.kind === 'spot' ? (
        <SpotGame focus={focus} letter={letter} />
      ) : step.kind === 'write' ? (
        <WriteStep />
      ) : step.kind === 'review' ? (
        <ReviewStep focus={focus} letter={letter} />
      ) : (
        <MeetStep focus={focus} letter={letter} kind={step.kind} />
      )}
    </div>
  );
}

/**
 * 글자·낱말 만나기.
 *
 * 보여주고 들려주는 걸음이다. 문제를 내지 않는다 — 처음 만나는 글자를 바로
 * 문제로 내면 아이는 찍을 수밖에 없다.
 *
 * 획순(어떻게 긋는지)은 아직 없다. 영숙님이 옆에서 알려주기로 했다.
 */
function MeetStep({
  focus,
  letter,
  kind,
}: {
  focus: WeeklyFocus;
  letter: string;
  kind: 'meet' | 'words' | 'find';
}) {
  const words = focus.words;
  const [card, setCard] = useState(0);

  if (kind === 'meet' || words.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <button
          type="button"
          onClick={() => speak(letter)}
          aria-label={`${letter} 소리 듣기`}
          className="min-h-touch min-w-touch rounded-full bg-glow-100 text-3xl transition-transform active:scale-95"
        >
          🔊
        </button>

        {/* 왼쪽은 익혀야 할 글자 모양 그대로, 오른쪽은 쓰는 법.
            어디서 시작해 어디로 긋는지를 알려주지 않으면 모양만 베끼게 된다. */}
        {hasStrokes(letter) ? (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center justify-center gap-5">
              <LetterGlyph letter={letter} className="h-40 w-40" />
              <div className="flex flex-col items-center gap-1">
                <p className="font-bold text-glow-700">이렇게 써요</p>
                <StrokeOrder letter={letter} className="h-40 w-40" />
              </div>
            </div>
            <p className="text-sm text-slate-400">번호 차례대로, 화살표 쪽으로 그어요</p>
          </div>
        ) : (
          <span
            data-testid="weekly-big-letter"
            className="rounded-3xl bg-glow-50 px-12 py-6 text-[8rem] font-bold leading-none text-slate-700"
          >
            {letter}
          </span>
        )}

        {words.length > 0 ? (
          <div className="flex w-full flex-col items-center gap-1 border-t border-glow-100 pt-4">
            <p className="font-bold text-glow-700">이런 낱말에 들어가 있어요</p>
            <p className="text-sm text-slate-400">낱말을 누르면 읽어줘요</p>
            {/* 낱말마다 스피커를 따로 달지 않는다 — 낱말 자체가 단추다.
                여기는 글자를 처음 만나는 자리라 소리가 곧 배울 내용이다. */}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {words.map((w) => (
                <button
                  key={w}
                  type="button"
                  data-testid="weekly-word-button"
                  onClick={() => speak(w)}
                  aria-label={`${w} 읽어주기`}
                  className="min-h-touch rounded-2xl bg-glow-100 px-4 py-2 text-2xl font-bold text-glow-700 transition-transform active:scale-95"
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!canSpeak() ? (
          <p className="text-sm text-slate-400">이 기기에서는 소리가 안 나요. 옆에서 읽어주세요.</p>
        ) : null}
      </Card>
    );
  }

  // 낱말 만나기 / 낱말에서 찾기 — 낱말을 하나씩 넘겨 본다.
  const word = words[card]!;
  return (
    <Card className="flex flex-col items-center gap-4 text-center">
      <button
        type="button"
        onClick={() => speak(word)}
        aria-label={`${word} 읽어주기`}
        className="min-h-touch min-w-touch rounded-full bg-glow-100 text-3xl transition-transform active:scale-95"
      >
        🔊
      </button>

      <span
        data-testid="weekly-word"
        className="rounded-3xl bg-glow-50 px-8 py-5 text-6xl font-bold text-slate-700"
      >
        {word}
      </span>

      <p className="text-slate-500">
        여기 어디에 <span className="font-bold text-glow-600">{letter}</span> 가 있을까요?
      </p>

      <div className="flex w-full items-center justify-between gap-3">
        <Button variant="ghost" disabled={card === 0} onClick={() => setCard((c) => c - 1)}>
          ← 앞으로
        </Button>
        <span className="text-slate-400">
          {card + 1} / {words.length}
        </span>
        <Button
          disabled={card === words.length - 1}
          onClick={() => setCard((c) => c + 1)}
        >
          다음 →
        </Button>
      </div>
    </Card>
  );
}

/**
 * 주말 — 이번 주에 배운 글자가 든 낱말을 열 개 읽는다.
 *
 * 새것을 배우는 자리가 아니라 한 주에 만난 것을 모아 읽어 보는 자리다.
 * 낱말을 한꺼번에 늘어놓고, 하나씩 눌러 읽어 보게 한다. 누른 낱말에는 표시가
 * 남아 어디까지 읽었는지 아이가 스스로 안다.
 */
function ReviewStep({ focus, letter }: { focus: WeeklyFocus; letter: string }) {
  const [read, setRead] = useState<Set<string>>(new Set());
  const words = focus.words;

  if (words.length === 0) {
    return (
      <Card className="text-center text-slate-500">
        아직 읽을 수 있는 낱말이 적어요. 활동을 조금 더 하고 와요.
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-center gap-4 text-center">
      <p className="text-xl font-bold text-glow-700">
        <span className="text-2xl">{letter}</span> 가 든 낱말을 읽어봐요
      </p>
      <p data-testid="review-progress" className="text-slate-400">
        {read.size} / {words.length}
      </p>

      <div className="flex w-full flex-col gap-2">
        {words.map((w) => (
          <button
            key={w}
            type="button"
            data-testid="review-word"
            data-read={read.has(w) ? 'yes' : undefined}
            onClick={() => {
              speak(w);
              setRead((prev) => new Set(prev).add(w));
            }}
            aria-label={`${w} 읽어주기`}
            className={`min-h-touch rounded-2xl px-5 py-3 text-3xl font-bold transition-transform active:scale-95 ${
              read.has(w) ? 'bg-glow-100 text-slate-400' : 'bg-glow-50 text-slate-700'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-400">
        먼저 읽어보고, 눌러서 맞는지 들어봐요
      </p>

      {read.size === words.length ? (
        <p data-testid="review-done" className="font-bold text-glow-600">
          다 읽었어요! 🎉
        </p>
      ) : null}
    </Card>
  );
}

/** 써보기 — 연습지로 보낸다. 쓰는 일은 종이에서 한다. */
function WriteStep() {
  return (
    <Card className="flex flex-col items-center gap-4 text-center">
      <span className="text-6xl">✏️</span>
      <h2 className="text-2xl font-bold text-glow-700">오늘은 써보는 날이에요</h2>
      <p className="text-slate-500">
        쓰기 연습지를 인쇄해서 연필로 써봐요. 화면에 쓰는 것과는 달라요.
      </p>
      <Link to="/">
        <Button size="lg">쓰기 연습지 고르러 가기</Button>
      </Link>
    </Card>
  );
}

/**
 * 틀린 글자 찾기.
 *
 * 닮은 글자들 사이에서 이번 주의 글자를 짚어낸다. 22단계에서 23단계로 넘어갈 때의
 * 진짜 고비가 ㅐ 와 ㅔ 를 가리는 것이라, 바로 그 일을 시킨다.
 */
function SpotGame({ focus, letter }: { focus: WeeklyFocus; letter: string }) {
  const profile = useProfile((s) => s.profile);
  const [problems] = useState<SpotProblem[]>(() => spotProblems(letter, SPOT_COUNT));
  const [at, setAt] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrongAt, setWrongAt] = useState<number | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [saved, setSaved] = useState(false);

  const done = at >= problems.length;

  useEffect(() => {
    if (!done || saved || !profile) return;
    setSaved(true);
    spawnConfetti();
    void queueSession({
      profileId: profile.id,
      // 이 놀이는 레슨 목록에 없는 것이라 레슨을 가리키지 않는다.
      lessonId: null,
      activityKind: 'spot_letter',
      mode: 'screen',
      durationSec: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      totalCount: problems.length,
      correctCount: correct,
      meta: { stage: focus.stage, letter },
      createdAt: new Date().toISOString(),
    });
  }, [done, saved, profile, correct, problems.length, startedAt, focus.stage, letter]);

  if (problems.length === 0) {
    return (
      <Card className="text-center text-slate-500">
        이 글자는 아직 찾기 놀이를 만들지 못했어요.
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <span className="text-6xl">🎉</span>
        <h2 className="text-2xl font-bold text-glow-600">끝까지 다 찾았어요!</h2>
        <p className="text-slate-500">
          {problems.length}개 중 {correct}개를 한 번에 찾았어요.
        </p>
        <Link to="/">
          <Button size="lg">홈으로</Button>
        </Link>
      </Card>
    );
  }

  const problem = problems[at]!;

  function pick(chosen: string, index: number) {
    if (chosen === letter) {
      if (wrongAt === null) setCorrect((c) => c + 1);
      spawnConfetti(6);
      setWrongAt(null);
      setAt((i) => i + 1);
    } else {
      // 틀린 칸을 짚어 준다. 같은 문제에 머물러 맞힐 때까지 찾는다.
      setWrongAt(index);
    }
  }

  return (
    <Card className="flex flex-col items-center gap-5 text-center">
      <p className="text-2xl font-bold text-glow-700">
        <span className="text-4xl">{letter}</span> 를 찾아보세요
      </p>
      <p data-testid="spot-progress" className="text-slate-400">
        {at + 1} / {problems.length}
      </p>

      <div className="grid w-full grid-cols-3 gap-3">
        {problem.choices.map((c, i) => (
          <button
            key={i}
            type="button"
            data-testid="spot-choice"
            data-letter={c}
            onClick={() => pick(c, i)}
            aria-label={c}
            className={`flex aspect-square items-center justify-center rounded-2xl text-5xl font-bold transition-transform active:scale-95 ${
              wrongAt === i ? 'bg-rose-100 text-rose-400' : 'bg-glow-50 text-slate-700'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="min-h-[1.75rem] font-bold text-glow-600">
        {wrongAt !== null ? '다시 잘 봐요 🤔' : ''}
      </p>
    </Card>
  );
}

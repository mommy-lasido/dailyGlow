import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card } from '@dailyglow/ui';
import { spawnConfetti } from '@/lib/confetti';
import { mixReview, recentWrong, rememberWrong } from '@/lib/review';
import { speakEnglish } from '@/lib/speak';
import { useProfile } from '@/stores/profile';
import type { ActivityProps } from '@/activities/types';
import { gameOf, PHONICS_GAMES, type PhonicsStage } from './words';
import { makeProblem, makeSet, PHONICS_PROBLEM_COUNT, type PhonicsProblem } from './generate';

/** 소리가 나기 전에 화면이 자리를 잡도록 잠깐 기다린다. */
const SPEAK_DELAY_MS = 400;

/**
 * Listen & Find — 소리를 듣고 글자를 고른다.
 *
 * 시윤이가 영어 놀이터에 들어가고 싶어 했는데 거기 있는 것이 라윤이의 Spell It
 * 뿐이었다. 시윤이는 파닉스를 배우는 중이라 **글자를 보고 고르는 것이 아니라
 * 소리를 듣고 고르는 것**부터 한다 — 영숙님이 그렇게 정했다.
 *
 * **낱말을 화면에 적지 않는다.** 적어 두면 소리를 갈라 듣는 일을 건너뛰고 글자만
 * 보고 고른다. 맞힌 뒤에야 낱말이 나타난다.
 *
 * **단계는 다 펼쳐 둔다.** 영숙님이 "단계는 그냥 다 보이게 해주고 알아서 골라서
 * 하게" 라고 했다. 앞 단계를 다 해야 다음이 열리는 식이 아니다.
 *
 * 화면은 온통 영어다. 한국어로 거들면 아이가 영어를 알아서 맞힌 것인지 갈라낼
 * 수 없다.
 */
export function PhonicsActivity({ onFinish }: ActivityProps) {
  const profileId = useProfile((s) => s.profile?.id ?? null);

  /** 고른 단계. 아직 안 골랐으면 null — 그때는 단계 목록이 나온다. */
  const [stage, setStage] = useState<PhonicsStage | null>(null);
  const [problems, setProblems] = useState<PhonicsProblem[]>([]);
  const [at, setAt] = useState(0);
  /** 이 문제에서 한 번이라도 잘못 눌렀는가 */
  const [missed, setMissed] = useState(false);
  /** 방금 잘못 누른 보기. 잠깐 붉었다가 돌아온다. */
  const [missTap, setMissTap] = useState<string | null>(null);
  /** 맞혔는가 — 맞히면 낱말이 나타난다. */
  const [solved, setSolved] = useState(false);
  const [wrongWords, setWrongWords] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [done, setDone] = useState(false);

  const game = useMemo(() => (stage ? gameOf(stage) : null), [stage]);
  const problem = problems[at] ?? null;

  // 소리가 곧 문제다. 새 문제가 나오면 한 번 읽어준다.
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (!problem || solved || done) return;
    timer.current = window.setTimeout(() => speakEnglish(problem.word), SPEAK_DELAY_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [problem, solved, done]);

  function begin(which: PhonicsStage) {
    const chosen = gameOf(which);
    // 지난 판에 틀린 낱말이 다시 섞여 나온다.
    const pool = mixReview(
      chosen.words,
      (w) => w.word,
      recentWrong(profileId, `phonics:${which}`),
      PHONICS_PROBLEM_COUNT,
    );
    setProblems(
      pool.length > 0
        ? pool.map((w) => makeProblem(chosen, w))
        : makeSet(which, PHONICS_PROBLEM_COUNT),
    );
    setStage(which);
    setAt(0);
    setMissed(false);
    setSolved(false);
    setWrongWords([]);
    setStartedAt(Date.now());
    setDone(false);
  }

  function finish(wrong: string[]) {
    setDone(true);
    spawnConfetti();
    rememberWrong(profileId, `phonics:${stage}`, wrong);
    onFinish({
      totalCount: problems.length,
      // 한 번에 맞힌 것만 센다. 고쳐서 맞힌 것은 "결국 됐다" 는 뜻이다.
      correctCount: problems.length - wrong.length,
      durationSec: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      meta: { stage, wrong },
    });
  }

  function pick(letter: string) {
    if (!problem || solved) return;

    if (letter !== problem.answer) {
      setMissed(true);
      setMissTap(letter);
      window.setTimeout(() => setMissTap(null), 500);
      return;
    }

    // 맞혔다. 이제야 낱말을 보여주고, 소리와 글자를 잇게 한 번 더 읽어준다.
    setSolved(true);
    spawnConfetti(8);
    speakEnglish(problem.word);
    const wrong = missed ? [...wrongWords, problem.word] : wrongWords;
    setWrongWords(wrong);

    window.setTimeout(() => {
      if (at + 1 >= problems.length) {
        finish(wrong);
        return;
      }
      setAt(at + 1);
      setMissed(false);
      setSolved(false);
    }, 1400);
  }

  // ── 무엇을 해볼까 ────────────────────────────────────
  if (!stage || !game) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-center text-3xl font-bold text-glow-600">Listen and find</h1>
        <p className="text-center text-slate-500">Tap a game to start.</p>

        {PHONICS_GAMES.map((g) => (
          <button
            key={g.stage}
            type="button"
            data-testid="phonics-game"
            data-stage={g.stage}
            onClick={() => begin(g.stage)}
            className="min-h-touch rounded-3xl bg-white p-5 text-left ring-1 ring-black/5 transition-transform active:scale-95"
          >
            <span className="block text-2xl font-bold text-glow-700">{g.name}</span>
            <span className="block text-sm text-slate-400">{g.example}</span>
          </button>
        ))}
      </div>
    );
  }

  // ── 끝 ──────────────────────────────────────────────
  if (done) {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <span className="text-6xl">🎉</span>
        <h2 className="text-2xl font-bold text-glow-600">All done!</h2>
        <p className="text-lg text-slate-600">
          {problems.length - wrongWords.length} of {problems.length} on the first try
        </p>
        {wrongWords.length > 0 ? (
          <p data-testid="phonics-wrong" className="text-slate-500">
            Words to listen for again: <b>{wrongWords.join(', ')}</b>
          </p>
        ) : null}

        <Button size="lg" onClick={() => begin(stage)}>
          One more round
        </Button>
        <Button variant="ghost" onClick={() => setStage(null)}>
          ← Pick a game
        </Button>
      </Card>
    );
  }

  if (!problem) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-glow-600">{game.name}</p>
        <p className="text-slate-400">
          {at + 1} / {problems.length}
        </p>
      </div>

      <Card className="flex flex-col items-center gap-6 text-center">
        {/* 소리가 문제다. 크게 두어 몇 번이고 다시 들을 수 있게 한다. */}
        <button
          type="button"
          data-testid="phonics-say"
          onClick={() => speakEnglish(problem.word)}
          aria-label="Listen again"
          className="min-h-touch rounded-3xl bg-glow-50 px-12 py-6 text-6xl transition-transform active:scale-95"
        >
          🔊
        </button>

        <p className="text-xl text-slate-600">{game.ask}</p>

        {/* 맞히기 전에는 낱말을 적지 않는다 — 적으면 듣지 않고 글자만 보고 고른다. */}
        {solved ? (
          <p
            data-testid="phonics-word"
            className="animate-pop text-5xl font-bold tracking-wide text-glow-600"
          >
            {problem.word}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-center gap-3">
          {problem.choices.map((c) => (
            <button
              key={c}
              type="button"
              data-testid="phonics-choice"
              data-letter={c}
              disabled={solved}
              onClick={() => pick(c)}
              className={`min-h-touch min-w-touch rounded-3xl px-6 py-3 text-4xl font-bold transition-transform active:scale-95 ${
                solved && c === problem.answer
                  ? 'bg-glow-300 text-slate-700'
                  : missTap === c
                    ? 'bg-rose-100 text-rose-400'
                    : 'bg-glow-50 text-slate-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <p className="min-h-[1.75rem] font-bold text-glow-600">
          {solved ? 'Nice!' : missTap !== null ? 'Listen again.' : ''}
        </p>
      </Card>

      {/* 하던 판을 놓고 다른 단계를 고르러 가는 길. */}
      <Button variant="ghost" onClick={() => setStage(null)}>
        ← Pick a game
      </Button>
    </div>
  );
}

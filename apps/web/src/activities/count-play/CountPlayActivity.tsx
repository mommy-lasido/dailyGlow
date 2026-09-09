import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@dailyglow/ui';
import { spawnConfetti } from '@/lib/confetti';
import { speak } from '@/lib/speak';
import type { ActivityProps } from '@/activities/types';
import {
  createQuiz,
  currentIndex,
  nextRound,
  submit,
  type QuizState,
} from '@/activities/quiz-flow';
import {
  COUNT_SETTINGS,
  countHint,
  KOREAN_COUNT,
  makeCountProblem,
  type CountProblem,
  type CountRange,
} from './generate';

/**
 * 더하기 놀이는 10문제지만 여기는 5문제다.
 * 이 활동을 쓰는 아이는 만 3~4세라 한 번에 집중할 수 있는 시간이 훨씬 짧다.
 */
const PROBLEM_COUNT = 5;

const ROUND_TITLE: Record<number, string> = {
  2: '틀린 문제를 다시 세어봐요',
  3: '이번엔 번호를 보면서 세어봐요',
};

const QUESTION = '몇 개일까?';

export function CountPlayActivity({ onFinish }: ActivityProps) {
  const [range, setRange] = useState<CountRange | null>(null);
  const [problems, setProblems] = useState<CountProblem[]>([]);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  /** 3차에서 방금 틀렸을 때만 쓰는 안내 */
  const [retryMessage, setRetryMessage] = useState('');

  function begin(chosen: CountRange) {
    setRange(chosen);
    setProblems(Array.from({ length: PROBLEM_COUNT }, () => makeCountProblem(chosen)));
    setQuiz(createQuiz(PROBLEM_COUNT));
    setStartedAt(Date.now());
    setRetryMessage('');
  }

  function finish(state: QuizState) {
    spawnConfetti();
    onFinish({
      totalCount: state.total,
      correctCount: state.firstTryCorrect,
      durationSec: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      // range 는 단계 승급 판정에 쓴다 — 가장 어려운 단계에서 잘해야 다음 과목으로 넘어간다.
      meta: { range, roundScores: state.roundScores },
    });
  }

  function pick(value: number) {
    if (!quiz) return;
    const index = currentIndex(quiz);
    if (index === null) return;

    const isCorrect = value === problems[index]!.answer;
    // 3차에서 틀리면 같은 문제에 머문다 — 흐름은 submit 이 알아서 처리한다.
    setRetryMessage(quiz.round === 3 && !isCorrect ? '괜찮아요, 다시 세어볼까? 🤔' : '');
    if (isCorrect) spawnConfetti(6);

    const next = submit(quiz, isCorrect);
    setQuiz(next);
    if (next.phase === 'done') finish(next);
  }

  function goOn() {
    if (!quiz) return;
    const next = nextRound(quiz);
    setQuiz(next);
    setRetryMessage('');
    if (next.phase === 'done') finish(next);
  }

  // ── 얼마까지 세어볼지 고르기 ───────────────────────────
  if (!quiz || range === null) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-center text-4xl font-bold text-glow-600">얼마까지 세어볼까?</h1>
        <p className="text-center text-slate-500">그림을 하나씩 짚어가며 세어봐요</p>
        {COUNT_SETTINGS.map((s) => (
          <button
            key={s.range}
            onClick={() => begin(s.range)}
            className="min-h-touch rounded-3xl bg-white p-5 text-left shadow-lg ring-1 ring-black/5 transition-transform active:scale-95"
          >
            <span className="flex items-center gap-5">
              <span className="text-5xl">{s.icon}</span>
              <span>
                <span className="block text-2xl font-bold text-slate-700">{s.name}</span>
                <span className="block text-sm text-slate-400">{s.desc}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    );
  }

  // ── 끝 ────────────────────────────────────────────────
  if (quiz.phase === 'done') {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <span className="text-6xl">🎉🔢✨</span>
        <h2 className="text-2xl font-bold text-glow-600">
          5문제 중 {quiz.firstTryCorrect}개 맞혔어요!
        </h2>
        {quiz.roundScores.length > 1 ? (
          <p className="text-slate-500">
            처음엔 {quiz.roundScores[0]}개였는데 끝까지 다 세었어요. 잘했어요!
          </p>
        ) : (
          <p className="text-slate-500">한 번에 다 맞혔어요. 정말 대단해요!</p>
        )}
        <Link to="/">
          <Button size="lg">홈으로</Button>
        </Link>
      </Card>
    );
  }

  // ── 채점 ──────────────────────────────────────────────
  if (quiz.phase === 'grading') {
    const scored = quiz.roundScores[quiz.roundScores.length - 1] ?? 0;
    const asked = scored + quiz.missed.length;
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <span className="text-6xl">{quiz.missed.length === 0 ? '🎉' : '📋'}</span>
        <h2 className="text-2xl font-bold text-glow-600">
          {asked}개 중 {scored}개 맞았어요!
        </h2>
        <p className="text-slate-500">
          {quiz.missed.length === 0
            ? '다 맞았어요!'
            : `틀린 ${quiz.missed.length}개를 다시 세어볼까요?`}
        </p>
        <Button size="lg" onClick={goOn}>
          계속하기
        </Button>
      </Card>
    );
  }

  // ── 문제 풀기 ─────────────────────────────────────────
  const index = currentIndex(quiz);
  if (index === null) return null;
  const problem = problems[index]!;
  const done = quiz.cursor;
  const left = quiz.queue.length - quiz.cursor;
  // 3차에서는 그림마다 번호를 붙여준다. 이것이 이 활동의 진짜 힌트다 —
  // 답을 말해주는 대신 세는 방법을 보여준다.
  const numbered = quiz.round === 3;

  return (
    <div className="flex flex-col gap-5">
      {quiz.round > 1 ? (
        <p className="text-center font-bold text-glow-600">{ROUND_TITLE[quiz.round]}</p>
      ) : null}

      {/* 1·2차에는 정답 여부를 알려주지 않으므로 진행 정도만 보여준다. */}
      <div className="flex flex-wrap justify-center gap-1 text-xl" aria-label="진행">
        {quiz.queue.map((_, i) => (
          <span key={i}>{i < done ? '🐾' : '·'}</span>
        ))}
      </div>

      <Card className="flex flex-col items-center gap-5 text-center">
        <div
          data-testid="objects"
          className="flex min-h-[6rem] flex-wrap items-end justify-center gap-2 rounded-2xl bg-glow-50 px-4 py-3"
        >
          {Array.from({ length: problem.answer }).map((_, i) => (
            <span key={i} className="flex flex-col items-center">
              <span className="text-5xl">{problem.icon}</span>
              {numbered ? (
                <span className="text-sm font-bold text-glow-600">
                  {i + 1} {KOREAN_COUNT[i]}
                </span>
              ) : null}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3">
          <span data-testid="question" className="text-4xl font-bold text-slate-700">
            {QUESTION}
          </span>
          <button
            type="button"
            onClick={() => speak(QUESTION)}
            aria-label="문제 읽어주기"
            className="min-h-touch min-w-touch rounded-full bg-glow-100 text-3xl shadow-md transition-transform active:scale-95"
          >
            🔊
          </button>
        </div>

        {numbered ? (
          <p
            data-testid="hint"
            className="rounded-2xl bg-glow-50 px-4 py-3 text-lg text-glow-700"
          >
            💡 {countHint()}
          </p>
        ) : null}

        {/* 숫자를 아직 못 읽는 아이도 고를 수 있게 숫자 밑에 점을 함께 찍어준다. */}
        <div className="flex justify-center gap-4">
          {problem.choices.map((c) => (
            <button
              key={c}
              data-testid="choice"
              onClick={() => pick(c)}
              aria-label={`${c}개`}
              className="min-h-touch min-w-touch rounded-3xl bg-glow-100 px-5 py-3 shadow-md transition-transform active:scale-95"
            >
              <span className="block text-4xl font-bold text-slate-700">{c}</span>
              <span className="mt-1 flex max-w-[4.5rem] flex-wrap justify-center gap-[2px] leading-none">
                {Array.from({ length: c }).map((_, i) => (
                  <span key={i} className="text-[10px] text-glow-600">
                    ●
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>

        <p className="min-h-[1.75rem] font-bold text-glow-600">
          {retryMessage || (quiz.round === 1 ? `${left}개 남았어요` : '')}
        </p>
      </Card>
    </div>
  );
}

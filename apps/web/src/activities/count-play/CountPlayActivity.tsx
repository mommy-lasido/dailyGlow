import { useState } from 'react';
import { Card } from '@dailyglow/ui';
import { spawnConfetti } from '@/lib/confetti';
import { speak } from '@/lib/speak';
import type { ActivityProps } from '@/activities/types';
import { Finished } from '@/activities/Finished';
import { Grading } from '@/activities/Grading';
import { Progress } from '@/activities/Progress';
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
  countQuestion,
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

    // 다 맞혔으면 채점 화면을 건너뛴다. "5개 중 5개 맞았어요" 와
    // "5문제 중 5개 맞혔어요" 를 잇달아 보여주고 계속하기까지 누르게 할 이유가 없다.
    const next = submit(quiz, isCorrect);
    const settled =
      next.phase === 'grading' && next.missed.length === 0 ? nextRound(next) : next;
    setQuiz(settled);
    if (settled.phase === 'done') finish(settled);
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
    return <Finished emoji="🎉🔢✨" quiz={quiz} />;
  }

  // ── 채점 ──────────────────────────────────────────────
  // 다 맞힌 판은 pick 에서 곧장 끝으로 보내므로, 이 화면은 틀린 문제가 있을 때만 뜬다.
  if (quiz.phase === 'grading') {
    return <Grading quiz={quiz} retryLabel="다시 세기" onNext={goOn} />;
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
  // "사과가 몇 개일까?" / "물고기가 몇 마리일까?" — 세는 말도 같이 익힌다.
  const question = countQuestion(problem.object);

  return (
    <div className="flex flex-col gap-5">
      {quiz.round > 1 ? (
        <p className="text-center font-bold text-glow-600">{ROUND_TITLE[quiz.round]}</p>
      ) : null}

      <Progress total={quiz.queue.length} done={done} />

      <Card className="flex flex-col items-center gap-5 text-center">
        <div
          data-testid="objects"
          className="flex min-h-[6rem] flex-wrap items-end justify-center gap-2 rounded-2xl bg-glow-50 px-4 py-3"
        >
          {Array.from({ length: problem.answer }).map((_, i) => (
            <span key={i} className="flex flex-col items-center">
              <span className="text-5xl">{problem.object.icon}</span>
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
            {question}
          </span>
          <button
            type="button"
            onClick={() => speak(question)}
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
            💡 {countHint(problem.object)}
          </p>
        ) : null}

        {/* 숫자를 아직 못 읽는 아이도 고를 수 있게 숫자 밑에 점을 함께 찍어준다. */}
        <div className="flex justify-center gap-4">
          {problem.choices.map((c) => (
            <button
              key={c}
              data-testid="choice"
              data-value={c}
              onClick={() => pick(c)}
              aria-label={`${c}${problem.object.unit}`}
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

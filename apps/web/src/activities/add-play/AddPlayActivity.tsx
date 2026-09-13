import { useState } from 'react';
import { Card } from '@dailyglow/ui';
import { useProfile } from '@/stores/profile';
import { spawnConfetti } from '@/lib/confetti';
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
  ADD_SETTINGS,
  addHint,
  makeAddProblem,
  type AddProblem,
  type AddSetting,
} from './generate';

const PROBLEM_COUNT = 10;
const ROUND_TITLE: Record<number, string> = {
  2: '틀린 문제를 다시 풀어봐요',
  3: '이번엔 힌트를 보고 풀어봐요',
};

export function AddPlayActivity({ onFinish }: ActivityProps) {
  const isPreReader = useProfile((s) => s.profile?.reading_level) === 'pre_reader';

  const [setting, setSetting] = useState<AddSetting | null>(null);
  const [problems, setProblems] = useState<AddProblem[]>([]);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  /** 3차에서 방금 틀렸을 때만 쓰는 안내 */
  const [retryMessage, setRetryMessage] = useState('');

  function begin(chosen: AddSetting) {
    setSetting(chosen);
    setProblems(Array.from({ length: PROBLEM_COUNT }, () => makeAddProblem(chosen)));
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
      meta: { setting, roundScores: state.roundScores },
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

  // ── 무엇을 연습할지 고르기 ─────────────────────────────
  if (!quiz || setting === null) {
    return (
      <div className="flex flex-col gap-4">
        <h1
          className={`text-center font-bold text-glow-600 ${isPreReader ? 'text-4xl' : 'text-3xl'}`}
        >
          뭘 연습해볼까?
        </h1>
        <p className="text-center text-slate-500">그림을 보면서 세어봐도 좋아요</p>
        {ADD_SETTINGS.map((s) => (
          <button
            key={s.setting}
            onClick={() => begin(s.setting)}
            className="min-h-touch rounded-3xl bg-white p-5 text-left ring-1 ring-black/5 transition-transform active:scale-95"
          >
            <span className="flex items-center gap-5">
              <span className="text-5xl">{s.icon}</span>
              <span>
                <span
                  className={`block font-bold text-slate-700 ${isPreReader ? 'text-2xl' : 'text-xl'}`}
                >
                  {s.name}
                </span>
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
    return <Finished emoji="🎉➕✨" quiz={quiz} />;
  }

  // ── 채점 ──────────────────────────────────────────────
  // 다 맞힌 판은 pick 에서 곧장 끝으로 보내므로, 이 화면은 틀린 문제가 있을 때만 뜬다.
  if (quiz.phase === 'grading') {
    return <Grading quiz={quiz} retryLabel="다시 풀기" onNext={goOn} />;
  }

  // ── 문제 풀기 ─────────────────────────────────────────
  const index = currentIndex(quiz);
  if (index === null) return null;
  const problem = problems[index]!;
  const done = quiz.cursor;
  const left = quiz.queue.length - quiz.cursor;

  return (
    <div className="flex flex-col gap-5">
      {quiz.round > 1 ? (
        <p className="text-center font-bold text-glow-600">{ROUND_TITLE[quiz.round]}</p>
      ) : null}

      <Progress total={quiz.queue.length} done={done} />

      <Card className="flex flex-col items-center gap-5 text-center">
        <div className="flex min-h-[3.5rem] flex-wrap items-center justify-center gap-3 text-3xl">
          <span className="flex flex-wrap justify-center gap-1 rounded-2xl bg-glow-50 px-3 py-2">
            {Array.from({ length: problem.a }).map((_, i) => (
              <span key={i}>{problem.icon}</span>
            ))}
          </span>
          <span className="text-slate-400">＋</span>
          <span className="flex flex-wrap justify-center gap-1 rounded-2xl bg-glow-50 px-3 py-2">
            {Array.from({ length: problem.b }).map((_, i) => (
              <span key={i}>{problem.icon}</span>
            ))}
          </span>
        </div>

        <div
          data-testid="equation"
          className={`font-bold text-slate-700 ${isPreReader ? 'text-6xl' : 'text-4xl'}`}
        >
          {problem.a} + {problem.b} = ?
        </div>

        {quiz.round === 3 ? (
          <p
            data-testid="hint"
            className="rounded-2xl bg-glow-50 px-4 py-3 text-lg text-glow-700"
          >
            💡 {addHint(problem)}
          </p>
        ) : null}

        <div className="flex justify-center gap-4">
          {problem.choices.map((c) => (
            <button
              key={c}
              data-testid="choice"
              onClick={() => pick(c)}
              className="min-h-touch min-w-touch rounded-3xl bg-glow-100 px-6 text-3xl font-bold text-slate-700 transition-transform active:scale-95"
            >
              {c}
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

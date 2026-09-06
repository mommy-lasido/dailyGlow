import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@dailyglow/ui';
import { useProfile } from '@/stores/profile';
import { spawnConfetti } from '@/lib/confetti';
import type { ActivityProps } from '@/activities/types';
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

const ROUNDS = 10;
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
    setProblems(Array.from({ length: ROUNDS }, () => makeAddProblem(chosen)));
    setQuiz(createQuiz(ROUNDS));
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
            className="min-h-touch rounded-3xl bg-white p-5 text-left shadow-lg ring-1 ring-black/5 transition-transform active:scale-95"
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
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <span className="text-6xl">🎉➕✨</span>
        <h2 className="text-2xl font-bold text-glow-600">
          10문제 중 {quiz.firstTryCorrect}개 맞혔어요!
        </h2>
        {quiz.roundScores.length > 1 ? (
          <p className="text-slate-500">
            처음엔 {quiz.roundScores[0]}개였는데 끝까지 다 이해했어요. 잘했어요!
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
            : `틀린 ${quiz.missed.length}개를 다시 풀어볼까요?`}
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
              className="min-h-touch min-w-touch rounded-3xl bg-glow-100 px-6 text-3xl font-bold text-slate-700 shadow-md transition-transform active:scale-95"
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

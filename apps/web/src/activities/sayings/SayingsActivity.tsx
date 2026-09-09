import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@dailyglow/ui';
import { spawnConfetti } from '@/lib/confetti';
import type { ActivityProps } from '@/activities/types';
import {
  createQuiz,
  currentIndex,
  nextRound,
  submit,
  type QuizState,
} from '@/activities/quiz-flow';
import type { SayingKind } from './content';
import {
  choiceText,
  makeSayingSet,
  SAYING_PROBLEM_COUNT,
  poolFor,
  sayingHint,
  sayingQuestion,
  type SayingProblem,
} from './generate';

const ROUND_TITLE: Record<number, string> = {
  2: '틀린 문제를 다시 풀어봐요',
  3: '이번엔 힌트를 보고 풀어봐요',
};

/** lessons.config 의 kind 로 속담 판인지 사자성어 판인지 정한다. */
function kindOf(config: unknown): SayingKind {
  if (config && typeof config === 'object') {
    const kind = (config as { kind?: unknown }).kind;
    if (kind === 'idiom') return 'idiom';
  }
  return 'proverb';
}

export function SayingsActivity({ lesson, onFinish }: ActivityProps) {
  const kind = kindOf(lesson.config);
  const pool = poolFor(kind);

  const [problems, setProblems] = useState<SayingProblem[]>([]);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [retryMessage, setRetryMessage] = useState('');

  function begin() {
    // 한 판 분량을 한꺼번에 만든다 — 하나씩 뽑으면 같은 표현이 겹쳐 나온다.
    const set = makeSayingSet(pool);
    setProblems(set);
    setQuiz(createQuiz(set.length));
    setStartedAt(Date.now());
    setRetryMessage('');
  }

  function finish(state: QuizState) {
    spawnConfetti();
    onFinish({
      totalCount: state.total,
      correctCount: state.firstTryCorrect,
      durationSec: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      meta: { kind, roundScores: state.roundScores },
    });
  }

  function pick(text: string) {
    if (!quiz) return;
    const index = currentIndex(quiz);
    if (index === null) return;

    const isCorrect = text === problems[index]!.answer.text;
    setRetryMessage(quiz.round === 3 && !isCorrect ? '괜찮아요, 힌트를 다시 볼까? 🤔' : '');
    if (isCorrect) spawnConfetti(6);

    // 다 맞혔으면 채점 화면을 건너뛴다.
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

  // ── 시작하기 ──────────────────────────────────────────
  if (!quiz) {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold text-glow-600">{lesson.title}</h1>
        {/* 자료를 어디서 골랐는지는 아이에게 아무 쓸모가 없다. 무엇을 하게 되는지만 쓴다. */}
        <p className="text-slate-500">{Math.min(SAYING_PROBLEM_COUNT, pool.length)}문제를 풀어봐요.</p>
        <Button size="lg" onClick={begin}>
          시작하기
        </Button>
      </Card>
    );
  }

  // ── 끝 ────────────────────────────────────────────────
  if (quiz.phase === 'done') {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <span className="text-6xl">🎉📜✨</span>
        <h2 className="text-2xl font-bold text-glow-600">
          {quiz.total}문제 중 {quiz.firstTryCorrect}개 맞혔어요!
        </h2>
        {quiz.roundScores.length > 1 ? (
          <p className="text-slate-500">
            처음엔 {quiz.roundScores[0]}개였는데 끝까지 다 알아냈어요. 잘했어요!
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
        <span className="text-6xl">📋</span>
        <h2 className="text-2xl font-bold text-glow-600">
          {asked}개 중 {scored}개 맞았어요!
        </h2>
        <p className="text-slate-500">틀린 {quiz.missed.length}개를 다시 풀어볼까요?</p>
        <Button size="lg" onClick={goOn}>
          틀린 {quiz.missed.length}개 다시 풀기
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

      <Card className="flex flex-col gap-5">
        <p data-testid="question" className="text-center text-2xl font-bold text-slate-700">
          {sayingQuestion(problem)}
        </p>

        {/* 뜻을 주고 표현을 고르는 판에서는 그 뜻을 크게 보여준다. */}
        {problem.direction === 'toText' ? (
          <p
            data-testid="prompt-meaning"
            className="rounded-2xl bg-glow-50 px-5 py-4 text-center text-xl text-glow-700"
          >
            {problem.answer.meaning}
          </p>
        ) : null}

        {quiz.round === 3 ? (
          <p
            data-testid="hint"
            className="rounded-2xl bg-glow-50 px-4 py-3 text-lg text-glow-700"
          >
            💡 {sayingHint(problem)}
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          {problem.choices.map((c) => (
            <button
              key={c.text}
              data-testid="choice"
              data-text={c.text}
              onClick={() => pick(c.text)}
              className="min-h-touch rounded-3xl bg-glow-100 px-5 py-4 text-left text-lg font-bold text-slate-700 shadow-md transition-transform active:scale-95"
            >
              {choiceText(c, problem.direction)}
            </button>
          ))}
        </div>

        <p className="min-h-[1.75rem] text-center font-bold text-glow-600">
          {retryMessage || (quiz.round === 1 ? `${left}개 남았어요` : '')}
        </p>
      </Card>
    </div>
  );
}

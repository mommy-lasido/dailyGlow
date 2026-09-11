import { useState } from 'react';
import { Button, Card } from '@dailyglow/ui';
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
import type { Saying, SayingKind } from './content';
import {
  choiceText,
  hanjaOf,
  makeSayingSet,
  SAYING_PROBLEM_COUNT,
  poolFor,
  sayingHint,
  sayingQuestion,
  type SayingProblem,
} from './generate';

/**
 * 모아 보기에서 한 쪽에 담는 개수.
 *
 * 다섯 개다. 아이가 **스크롤을 내리지 않고 한눈에** 볼 수 있어야 하기 때문이다.
 * 사자성어는 한자와 글자별 뜻까지 붙어 한 칸이 높아서, 열 개를 담으면 화면 밖으로
 * 한참 밀려난다.
 */
export const PAGE_SIZE = 5;

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

  /** 먼저 모아 보고, 그다음에 푼다. 배경지식이 없으면 찍는 것밖에 못 한다. */
  const [phase, setPhase] = useState<'learn' | 'quiz'>('learn');
  /**
   * 목록을 다섯 개씩 끊어 보여준다. 속담이 마흔일곱 개라 한 화면에 다 쏟아 놓으면
   * 아이가 어디까지 읽었는지 놓치고, 아래로 한참 밀어야 퀴즈 단추가 나온다.
   */
  const [page, setPage] = useState(0);
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
    setPhase('quiz');
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

  // ── ① 모아 보기 ───────────────────────────────────────
  if (phase === 'learn' || !quiz) {
    const pageCount = Math.ceil(pool.length / PAGE_SIZE);
    const shown = pool.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
    const last = page === pageCount - 1;

    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-center text-3xl font-bold text-glow-600">{lesson.title}</h1>
        <p className="text-center text-slate-500">
          먼저 읽어보고 나서 {Math.min(SAYING_PROBLEM_COUNT, pool.length)}문제를 풀어요.
        </p>

        <ol className="flex flex-col gap-3">
          {shown.map((s, i) => (
            <li key={s.text}>
              <SayingCard saying={s} index={page * PAGE_SIZE + i + 1} />
            </li>
          ))}
        </ol>

        {/* 쪽 넘기기. 어디까지 왔는지 보이고, 마지막 쪽에서만 퀴즈로 넘어간다. */}
        <div data-testid="pager" className="flex items-center justify-between gap-3">
          <Button variant="ghost" disabled={page === 0} onClick={() => setPage((n) => n - 1)}>
            ← 앞으로
          </Button>
          <span className="text-slate-500">
            {page + 1} / {pageCount}쪽
          </span>
          {last ? (
            <Button onClick={begin}>퀴즈 풀기</Button>
          ) : (
            <Button onClick={() => setPage((n) => n + 1)}>다음 →</Button>
          )}
        </div>
      </div>
    );
  }

  // ── 끝 ────────────────────────────────────────────────
  if (quiz.phase === 'done') {
    return <Finished emoji="🎉📜✨" quiz={quiz} />;
  }

  // ── 채점 ──────────────────────────────────────────────
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

      <Card className="flex flex-col gap-5">
        <p data-testid="question" className="text-center text-2xl font-bold text-slate-700">
          {sayingQuestion(problem)}
        </p>
        {/* 사자성어는 한자를 같이 보여준다. 글자 뜻에서 말뜻을 짐작하는 힘이 붙는다. */}
        {problem.direction === 'toMeaning' && hanjaOf(problem.answer) ? (
          <p data-testid="question-hanja" className="text-center text-xl text-slate-400">
            {hanjaOf(problem.answer)}
          </p>
        ) : null}

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
              {problem.direction === 'toText' && hanjaOf(c) ? (
                <span className="ml-2 text-base font-normal text-slate-400">
                  {hanjaOf(c)}
                </span>
              ) : null}
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

/** 모아 보기 화면의 한 줄. 사자성어는 한자와 글자별 뜻까지 보여준다. */
function SayingCard({ saying, index }: { saying: Saying; index: number }) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-sm font-bold text-glow-300">{index}</span>
        <span className="text-xl font-bold text-glow-700">{saying.text}</span>
        {saying.hanja ? (
          <span data-testid="list-hanja" className="text-lg text-glow-600">
            {saying.hanja}
          </span>
        ) : null}
      </div>
      {saying.chars ? (
        <p className="text-sm text-slate-400">{saying.chars.join(' · ')}</p>
      ) : null}
      <p className="text-slate-600">{saying.meaning}</p>
      <p className="text-sm text-slate-400">{saying.example}</p>
    </Card>
  );
}

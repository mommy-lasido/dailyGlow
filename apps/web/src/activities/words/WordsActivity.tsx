import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@dailyglow/ui';
import { spawnConfetti } from '@/lib/confetti';
import { canSpeak, speak } from '@/lib/speak';
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
import type { WordItem } from './content';
import {
  makeWordSet,
  MIN_POOL,
  poolForStage,
  wordQuestion,
  type WordProblem,
} from './generate';

const ROUND_TITLE: Record<number, string> = {
  2: '틀린 낱말을 다시 읽어봐요',
  3: '이번엔 소리를 들으며 읽어봐요',
};

/**
 * 낱말 읽기.
 *
 * 먼저 낱말 카드를 넘겨 보고, 그다음에 찾는다. 소리는 **아이가 누를 때만** 난다 —
 * 문제마다 읽어주면 글자를 보지 않고 소리만 기다리게 되어, 읽기 연습이 되지 않는다.
 * 3차에서만 답의 소리를 들려준다.
 */
export function WordsActivity({ lesson, onFinish }: ActivityProps) {
  const pool = poolForStage(lesson.childLevel);

  const [phase, setPhase] = useState<'learn' | 'quiz'>('learn');
  const [card, setCard] = useState(0);
  const [problems, setProblems] = useState<WordProblem[]>([]);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [retryMessage, setRetryMessage] = useState('');

  function begin() {
    const set = makeWordSet(pool);
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
      meta: { stage: lesson.childLevel, roundScores: state.roundScores },
    });
  }

  function pick(word: string) {
    if (!quiz) return;
    const index = currentIndex(quiz);
    if (index === null) return;

    const isCorrect = word === problems[index]!.answer.word;
    setRetryMessage(quiz.round === 3 && !isCorrect ? '괜찮아요, 천천히 읽어볼까? 🤔' : '');
    if (isCorrect) spawnConfetti(6);

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

  // 아직 읽을 수 있는 낱말이 셋도 안 되면 문제를 낼 수 없다.
  if (pool.length < MIN_POOL) {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <span className="text-6xl">🌱</span>
        <h1 className="text-2xl font-bold text-glow-600">아직 읽을 낱말이 적어요</h1>
        <p className="text-slate-500">
          자음모음 배우기를 조금 더 하고 오면 낱말이 늘어나요.
        </p>
        <Link to="/">
          <Button size="lg">홈으로</Button>
        </Link>
      </Card>
    );
  }

  // ── ① 낱말 카드 보기 ──────────────────────────────────
  if (phase === 'learn' || !quiz) {
    const item = pool[card]!;
    const last = card === pool.length - 1;
    return (
      <div className="flex flex-col gap-5">
        <p className="text-center text-slate-500">지금 읽을 수 있는 낱말 {pool.length}개</p>

        <Card className="flex flex-col items-center gap-4 text-center">
          <span className="text-8xl">{item.emoji}</span>
          <button
            type="button"
            onClick={() => speak(item.word)}
            aria-label={`${item.word} 읽어주기`}
            className="min-h-touch rounded-3xl bg-glow-50 px-8 py-3"
          >
            <span data-testid="card-word" className="text-5xl font-bold text-slate-700">
              {item.word}
            </span>
            <span className="ml-3 text-2xl">🔊</span>
          </button>

          <div className="flex w-full items-center justify-between gap-3">
            <Button variant="ghost" disabled={card === 0} onClick={() => setCard((c) => c - 1)}>
              ← 앞으로
            </Button>
            <span className="text-slate-400">
              {card + 1} / {pool.length}
            </span>
            {last ? (
              <Button onClick={begin}>다 봤어요</Button>
            ) : (
              <Button onClick={() => setCard((c) => c + 1)}>다음 →</Button>
            )}
          </div>
        </Card>

        <div className="flex flex-wrap justify-center gap-2">
          {pool.map((w, i) => (
            <button
              key={w.word}
              onClick={() => setCard(i)}
              aria-label={w.word}
              className={`min-h-touch rounded-2xl px-3 text-lg font-bold transition-transform active:scale-95 ${
                i === card ? 'bg-glow-500 text-white' : 'bg-white text-slate-500'
              }`}
            >
              {w.emoji}
            </button>
          ))}
        </div>

        {!canSpeak() ? (
          <p className="text-center text-sm text-slate-400">
            이 기기에서는 소리가 안 나요. 옆에서 읽어주세요.
          </p>
        ) : null}
      </div>
    );
  }

  if (quiz.phase === 'done') return <Finished emoji="🎉📗✨" quiz={quiz} />;
  if (quiz.phase === 'grading')
    return <Grading quiz={quiz} retryLabel="다시 읽기" onNext={goOn} />;

  // ── ② 읽고 고르기 ─────────────────────────────────────
  const index = currentIndex(quiz);
  if (index === null) return null;
  const problem = problems[index]!;
  const left = quiz.queue.length - quiz.cursor;

  return (
    <div className="flex flex-col gap-5">
      {quiz.round > 1 ? (
        <p className="text-center font-bold text-glow-600">{ROUND_TITLE[quiz.round]}</p>
      ) : null}

      <Progress total={quiz.queue.length} done={quiz.cursor} />

      <Card className="flex flex-col items-center gap-5 text-center">
        <p className="text-2xl font-bold text-glow-700">{wordQuestion(problem)}</p>

        {/* 그림을 보고 낱말을 고르거나, 낱말을 보고 그림을 고르거나. */}
        {problem.direction === 'toWord' ? (
          <span data-testid="prompt" className="text-8xl">
            {problem.answer.emoji}
          </span>
        ) : (
          <span data-testid="prompt" className="text-6xl font-bold text-slate-700">
            {problem.answer.word}
          </span>
        )}

        {/* 3차에만 답을 읽어준다. 그 전에 읽어주면 글자를 보지 않게 된다. */}
        {quiz.round === 3 ? (
          <button
            type="button"
            data-testid="hint"
            onClick={() => speak(problem.answer.word)}
            className="min-h-touch rounded-2xl bg-glow-50 px-5 text-lg text-glow-700"
          >
            💡 눌러서 들어보기 🔊
          </button>
        ) : null}

        <div className="flex flex-wrap justify-center gap-3">
          {problem.choices.map((c: WordItem) => (
            <button
              key={c.word}
              data-testid="choice"
              data-word={c.word}
              onClick={() => pick(c.word)}
              aria-label={c.word}
              className="min-h-touch min-w-touch rounded-3xl bg-glow-100 px-5 py-3 shadow-md transition-transform active:scale-95"
            >
              {problem.direction === 'toWord' ? (
                <span className="text-3xl font-bold text-slate-700">{c.word}</span>
              ) : (
                <span className="text-5xl">{c.emoji}</span>
              )}
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

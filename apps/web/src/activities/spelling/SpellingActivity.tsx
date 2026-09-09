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
import {
  BLANK,
  filledSentence,
  makeSpellingSet,
  SPELLING_PROBLEM_COUNT,
  spellingHint,
  type SpellingProblem,
} from './generate';

const ROUND_TITLE: Record<number, string> = {
  2: '틀린 문제를 다시 풀어봐요',
  3: '이번엔 힌트를 보고 풀어봐요',
};

/** 빈칸을 눈에 띄게 그린다. 문장 어디가 물음인지 한눈에 보여야 한다. */
function Sentence({ text }: { text: string }) {
  const [before, after] = text.split(BLANK);
  return (
    <p data-testid="sentence" className="text-center text-2xl leading-relaxed text-slate-700">
      {before}
      <span className="mx-1 inline-block min-w-[3rem] border-b-4 border-glow-400 align-bottom text-glow-600">
        &nbsp;
      </span>
      {after}
    </p>
  );
}

/**
 * 풀이 — 문제마다 어느 말이 맞고 왜 그런지 보여준다.
 *
 * 이 설명이 이 활동에서 실제로 배우는 부분이다. 다만 문제를 푸는 도중에는
 * 띄우지 않는다 — 맞았는지 알려주는 셈이 되어 1차 점수가 무너진다.
 * 그래서 한 회차를 다 푼 뒤 채점 화면과 완료 화면에서 펼친다.
 */
function Review({ problems }: { problems: SpellingProblem[] }) {
  return (
    <ol data-testid="review" className="flex w-full flex-col gap-4 text-left">
      {problems.map((p, i) => (
        <li key={`${p.sentence}-${i}`} className="rounded-2xl bg-glow-50 px-4 py-3">
          <p className="text-lg font-bold text-slate-700">
            {filledSentence(p.sentence, p.answer.text)}
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {p.options.map((o) => (
              <li key={o.text} className="text-sm text-slate-600">
                <span className={o.correct ? 'font-bold text-glow-600' : 'text-slate-400'}>
                  {o.correct ? '⭕' : '❌'} {o.text}
                </span>{' '}
                — {o.note}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

export function SpellingActivity({ onFinish }: ActivityProps) {
  const [problems, setProblems] = useState<SpellingProblem[]>([]);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [retryMessage, setRetryMessage] = useState('');

  function begin() {
    // 한 판 분량을 한꺼번에 만든다 — 하나씩 뽑으면 같은 낱말쌍이 겹쳐 나온다.
    const set = makeSpellingSet();
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
      meta: { roundScores: state.roundScores },
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
        <h1 className="text-3xl font-bold text-glow-600">맞춤법 탐험대</h1>
        <p className="text-slate-500">
          빈칸에 알맞은 말을 골라요. {SPELLING_PROBLEM_COUNT}문제예요.
        </p>
        <Button size="lg" onClick={begin}>
          시작하기
        </Button>
      </Card>
    );
  }

  // ── 끝 ────────────────────────────────────────────────
  if (quiz.phase === 'done') {
    return (
      <Finished emoji="🎉🔍✨" quiz={quiz}>
        <Review problems={problems} />
      </Finished>
    );
  }

  // ── 채점 ──────────────────────────────────────────────
  if (quiz.phase === 'grading') {
    return (
      <Grading quiz={quiz} retryLabel="다시 풀기" onNext={goOn}>
        <Review problems={quiz.queue.map((i) => problems[i]!)} />
      </Grading>
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

      <Progress total={quiz.queue.length} done={done} />

      <Card className="flex flex-col gap-5">
        <Sentence text={problem.sentence} />

        {quiz.round === 3 ? (
          <p
            data-testid="hint"
            className="rounded-2xl bg-glow-50 px-4 py-3 text-lg text-glow-700"
          >
            💡 {spellingHint(problem)}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-center gap-4">
          {problem.options.map((o) => (
            <button
              key={o.text}
              data-testid="choice"
              data-text={o.text}
              onClick={() => pick(o.text)}
              className="min-h-touch min-w-touch rounded-3xl bg-glow-100 px-8 text-3xl font-bold text-slate-700 shadow-md transition-transform active:scale-95"
            >
              {o.text}
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

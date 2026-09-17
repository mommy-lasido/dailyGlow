import { useEffect, useMemo, useState } from 'react';
import { Button, Card } from '@dailyglow/ui';
import { spawnConfetti } from '@/lib/confetti';
import { canSpeak, speak } from '@/lib/speak';
import type { ActivityProps } from '@/activities/types';
import { useProfile } from '@/stores/profile';
import { rememberWrong } from '@/lib/review';
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
  makeSentenceSet,
  MIN_POOL,
  pickRound,
  poolForStage,
  sentenceQuestion,
  type SentenceProblem,
} from './generate';

/** 화면이 넘어가고 나서 읽어주기까지 기다리는 시간. */
const SPEAK_DELAY_MS = 2000;

const ROUND_TITLE: Record<number, string> = {
  2: '틀린 문장을 다시 찾아봐요',
  3: '이번엔 천천히 들어봐요',
};

/**
 * 문장 읽기.
 *
 * 먼저 문장 카드를 넘겨 보고, 그다음에 찾는다. **문제는 소리로 낸다** — 앱이
 * 읽어주는 문장을 보기 중에서 찾는 것이다. 그래서 문제 화면에서는 소리가 저절로
 * 난다. 소리가 곧 문제이기 때문이다.
 *
 * 카드를 넘겨 볼 때는 아이가 누를 때만 난다. 거기서 저절로 읽어주면 글자를 보지
 * 않고 소리만 기다리게 된다.
 *
 * 낱말 읽기와 다른 점은 **보기를 헷갈리게 고른다**는 것이다. 같은 낱말을 많이 쓰는
 * 문장을 오답으로 붙여, 첫 낱말만 듣고 찍지 못하게 한다.
 */
export function SentencesActivity({ lesson, onFinish }: ActivityProps) {
  const profileId = useProfile((s) => s.profile?.id ?? null);
  const pool = poolForStage(lesson.childLevel);
  // 오늘 볼 것만 뽑는다. 다 넘겨 본 뒤에 풀게 하면 아이가 못 견딘다.
  const round = useMemo(() => pickRound(pool), [pool]);

  const [phase, setPhase] = useState<'learn' | 'quiz'>('learn');
  const [card, setCard] = useState(0);
  const [problems, setProblems] = useState<SentenceProblem[]>([]);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [retryMessage, setRetryMessage] = useState('');

  const index = quiz && quiz.phase === 'solving' ? currentIndex(quiz) : null;
  const asked = index === null ? null : (problems[index]?.answer ?? null);

  /**
   * 문제가 바뀌면 읽어준다. 소리가 곧 문제라 아이가 누르기를 기다릴 수 없다.
   *
   * 다만 **곧바로 읽지 않고 조금 기다린다.** 화면이 넘어가는 순간에 소리가 겹쳐
   * 나면 아이가 아직 화면을 보고 있어서 못 듣는다. 두 셈 쉬었다가 읽어준다.
   */
  useEffect(() => {
    if (!asked) return;
    const id = setTimeout(() => speak(asked), SPEAK_DELAY_MS);
    return () => clearTimeout(id);
  }, [asked]);

  function begin() {
    // 방금 본 문장들 안에서 낸다 — 못 본 문장이 나오면 카드를 본 뜻이 없다.
    const set = makeSentenceSet(round);
    setProblems(set);
    setQuiz(createQuiz(set.length));
    setStartedAt(Date.now());
    setRetryMessage('');
    setPhase('quiz');
  }

  function finish(state: QuizState) {
    const wrongLabels = state.firstMissed.map((i) => problems[i]!.answer);
    rememberWrong(profileId, 'sentences', wrongLabels);
    spawnConfetti();
    onFinish({
      totalCount: state.total,
      correctCount: state.firstTryCorrect,
      durationSec: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      meta: { stage: lesson.childLevel, roundScores: state.roundScores, wrong: wrongLabels },
    });
  }

  function pick(sentence: string) {
    if (!quiz) return;
    const at = currentIndex(quiz);
    if (at === null) return;

    const isCorrect = sentence === problems[at]!.answer;
    setRetryMessage(quiz.round === 3 && !isCorrect ? '괜찮아요, 다시 들어볼까? 🤔' : '');
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

  // 아직 읽을 수 있는 문장이 셋도 안 되면 문제를 낼 수 없다.
  if (pool.length < MIN_POOL) {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-bold text-glow-600">아직 읽을 문장이 적어요</h1>
        <p className="text-slate-500">낱말 읽기를 조금 더 하고 오면 문장이 늘어나요.</p>
      </Card>
    );
  }

  // ── ① 문장 카드 보기 ──────────────────────────────────
  if (phase === 'learn' || !quiz) {
    const sentence = round[card]!;
    const last = card === round.length - 1;
    return (
      <div className="flex flex-col gap-5">
        <p className="text-center text-slate-500">오늘 읽어볼 문장 {round.length}개</p>

        <Card className="flex flex-col items-center gap-4 text-center">
          {/* 낱말 읽기와 같은 까닭으로 스피커를 글자와 따로 둔다 — 글자를 눌러
              소리가 나면 읽기 연습이 듣기가 되어 버린다. */}
          <button
            type="button"
            onClick={() => speak(sentence)}
            aria-label={`${sentence} 읽어주기`}
            className="min-h-touch min-w-touch rounded-full bg-glow-100 text-3xl transition-transform active:scale-95"
          >
            🔊
          </button>

          <span
            data-testid="card-sentence"
            className="rounded-3xl bg-glow-50 px-6 py-5 text-3xl font-bold text-slate-700"
          >
            {sentence}
          </span>

          <p className="text-slate-500">먼저 읽어보고, 모르겠으면 🔊 를 눌러요</p>

          <div className="flex w-full items-center justify-between gap-3">
            <Button variant="ghost" disabled={card === 0} onClick={() => setCard((c) => c - 1)}>
              ← 앞으로
            </Button>
            <span className="text-slate-400">
              {card + 1} / {round.length}
            </span>
            {last ? (
              <Button onClick={begin}>다 봤어요</Button>
            ) : (
              <Button onClick={() => setCard((c) => c + 1)}>다음 →</Button>
            )}
          </div>
        </Card>

        {!canSpeak() ? (
          <p className="text-center text-sm text-slate-400">
            이 기기에서는 소리가 안 나요. 옆에서 읽어주세요.
          </p>
        ) : null}
      </div>
    );
  }

  if (quiz.phase === 'done') return <Finished emoji="🎉📖✨" quiz={quiz} />;
  if (quiz.phase === 'grading')
    return <Grading quiz={quiz} retryLabel="다시 듣기" onNext={goOn} />;

  // ── ② 듣고 고르기 ─────────────────────────────────────
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
        <p className="text-2xl font-bold text-glow-700">{sentenceQuestion()}</p>

        {/* 소리가 곧 문제다. 못 들었으면 다시 들을 수 있어야 한다. */}
        <button
          type="button"
          data-testid="prompt"
          onClick={() => speak(problem.answer)}
          aria-label="다시 들어보기"
          className="min-h-touch rounded-3xl bg-glow-50 px-10 py-6 text-6xl transition-transform active:scale-95"
        >
          🔊
        </button>

        <div className="flex w-full flex-col gap-3">
          {problem.choices.map((c) => (
            <button
              key={c}
              data-testid="choice"
              data-sentence={c}
              onClick={() => pick(c)}
              aria-label={c}
              className="min-h-touch rounded-3xl bg-glow-100 px-5 py-4 transition-transform active:scale-95"
            >
              <span className="text-2xl font-bold text-slate-700">{c}</span>
            </button>
          ))}
        </div>

        <p className="min-h-[1.75rem] font-bold text-glow-600">
          {retryMessage || (quiz.round === 1 ? `${left}개 남았어요` : '')}
        </p>
      </Card>

      {!canSpeak() ? (
        <p className="text-center text-sm text-slate-400">
          이 기기에서는 소리가 안 나요. 옆에서 문장을 읽어주세요.
        </p>
      ) : null}
    </div>
  );
}

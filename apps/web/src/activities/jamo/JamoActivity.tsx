import { useEffect, useRef, useState } from 'react';
import { Button, Card } from '@dailyglow/ui';
import { hangulStage } from '@dailyglow/utils';
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
import {
  consonantsForStage,
  JAMO_MAX_STAGE,
  jamoHint,
  lettersForStage,
  makeJamoSet,
  BASIC_VOWELS,
  type JamoItem,
  type JamoProblem,
} from './generate';

/** 무엇을 배울지. 자음 모양 → 모음 모양 → 둘이 만난 글자 순서다. */
type JamoMode = 'consonant' | 'vowel' | 'syllable';

const ROUND_TITLE: Record<number, string> = {
  2: '틀린 글자를 다시 찾아봐요',
  3: '이번엔 글자를 보면서 찾아봐요',
};

/**
 * 자음모음 배우기.
 *
 * 먼저 **보고 듣고**, 그다음에 **찾는다.** 한 번도 본 적 없는 글자를 바로
 * 문제로 내면 아이는 찍을 수밖에 없다. 카드의 이름이 "배우기" 인 이유다.
 */
export function JamoActivity({ lesson, onFinish }: ActivityProps) {
  // 아이가 배운 데까지의 글자. 15단계를 넘긴 아이는 자음·모음을 이미 뗐으므로
  // 마지막 자음으로 맞춰 복습이 된다.
  const stage = Math.min(Math.max(lesson.childLevel, 1), JAMO_MAX_STAGE);
  const stageLabel = hangulStage(stage)?.label ?? '자음과 모음';

  const [mode, setMode] = useState<JamoMode | null>(null);
  const [phase, setPhase] = useState<'learn' | 'quiz'>('learn');
  /** 배우기 화면에서 지금 보고 있는 글자 */
  const [card, setCard] = useState(0);
  /** 배우기 화면에서 한 번이라도 소리를 들은 글자들 */
  const [heard, setHeard] = useState<Set<number>>(new Set());

  const [problems, setProblems] = useState<JamoProblem[]>([]);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [retryMessage, setRetryMessage] = useState('');

  const speechOk = canSpeak();

  const items: JamoItem[] =
    mode === 'consonant'
      ? consonantsForStage(stage)
      : mode === 'vowel'
        ? BASIC_VOWELS
        : mode === 'syllable'
          ? lettersForStage(stage)
          : [];

  function begin(chosen: JamoMode) {
    setMode(chosen);
    setPhase('learn');
    setCard(0);
    setHeard(new Set());
  }

  // ── 무엇을 배울지 고르기 ───────────────────────────────
  if (mode === null) {
    const consonantCount = consonantsForStage(stage).length;
    const menu = [
      {
        mode: 'consonant' as JamoMode,
        icon: 'ㄱ',
        name: '자음 배우기',
        desc: consonantsForStage(stage)
          .map((i) => i.letter)
          .join(' '),
      },
      {
        mode: 'vowel' as JamoMode,
        icon: 'ㅏ',
        name: '모음 배우기',
        desc: BASIC_VOWELS.map((i) => i.letter).join(' '),
      },
      // 자음과 모음이 만난 글자는 책의 2단계부터다. 아직 거기 못 간 아이에게는
      // 무엇을 배우는 칸인지 알 수 없는 빈 카드가 되므로 보여주지 않는다.
      ...(stage >= 2
        ? [
            {
              mode: 'syllable' as JamoMode,
              icon: '가',
              name: '글자 배우기',
              desc: lettersForStage(stage)
                .map((i) => i.letter)
                .join(' '),
            },
          ]
        : []),
    ];

    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-center text-4xl font-bold text-glow-600">뭘 배워볼까?</h1>
        <p className="text-center text-slate-500">
          {stage}단계 · 자음 {consonantCount}개
        </p>
        {menu.map((m) => (
          <button
            key={m.mode}
            onClick={() => begin(m.mode)}
            className="min-h-touch rounded-3xl bg-white p-5 text-left shadow-lg ring-1 ring-black/5 transition-transform active:scale-95"
          >
            <span className="flex items-center gap-5">
              <span className="text-5xl font-bold text-glow-500">{m.icon}</span>
              <span className="min-w-0">
                <span className="block text-2xl font-bold text-slate-700">{m.name}</span>
                <span className="block truncate text-sm text-slate-400">{m.desc}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    );
  }

  function playCard(index: number) {
    speak(items[index]!.sound);
    setHeard((prev) => new Set(prev).add(index));
  }

  function startQuiz() {
    // 한 판 분량을 한꺼번에 만든다 — 하나씩 뽑으면 같은 글자가 겹쳐 나온다.
    const set = makeJamoSet(items);
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
      meta: { stage, mode, roundScores: state.roundScores },
    });
  }

  function pick(letter: string) {
    if (!quiz) return;
    const index = currentIndex(quiz);
    if (index === null) return;

    const isCorrect = letter === problems[index]!.answer.letter;
    setRetryMessage(quiz.round === 3 && !isCorrect ? '괜찮아요, 다시 들어볼까? 🤔' : '');
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

  // ── ① 배우기 ──────────────────────────────────────────
  if (phase === 'learn') {
    const item = items[card]!;
    const last = card === items.length - 1;
    return (
      <div className="flex flex-col gap-5">
        <p className="text-center text-slate-500">
          {mode === 'consonant'
            ? '자음 배우기'
            : mode === 'vowel'
              ? '모음 배우기'
              : `${stage}단계 · ${stageLabel}`}
        </p>

        <Card className="flex flex-col items-center gap-5 text-center">
          <button
            type="button"
            onClick={() => playCard(card)}
            aria-label={`${item.sound} 소리 듣기`}
            className="min-h-touch rounded-3xl bg-glow-50 px-10 py-6 transition-transform active:scale-95"
          >
            <span data-testid="letter" className="block text-8xl font-bold text-slate-700">
              {item.letter}
            </span>
            <span className="mt-2 block text-2xl text-glow-600">🔊 {item.sound}</span>
          </button>

          <p className="text-slate-500">글자를 누르면 소리가 나요</p>

          <div className="flex w-full items-center justify-between gap-3">
            <Button
              variant="ghost"
              disabled={card === 0}
              onClick={() => setCard((c) => c - 1)}
            >
              ← 앞으로
            </Button>
            <span className="text-slate-400">
              {card + 1} / {items.length}
            </span>
            {last ? (
              <Button onClick={startQuiz}>다 봤어요</Button>
            ) : (
              <Button onClick={() => setCard((c) => c + 1)}>다음 →</Button>
            )}
          </div>
        </Card>

        {/* 어디까지 들어봤는지 보여준다. 소리를 안 들은 글자는 흐리게. */}
        <div className="flex flex-wrap justify-center gap-2">
          {items.map((it, i) => (
            <button
              key={it.letter}
              onClick={() => setCard(i)}
              aria-label={it.letter}
              className={`min-h-touch min-w-touch rounded-2xl px-3 text-2xl font-bold transition-transform active:scale-95 ${
                i === card
                  ? 'bg-glow-500 text-white'
                  : heard.has(i)
                    ? 'bg-glow-100 text-slate-700'
                    : 'bg-white text-slate-300'
              }`}
            >
              {it.letter}
            </button>
          ))}
        </div>

        {!speechOk ? (
          <p className="text-center text-sm text-slate-400">
            이 기기에서는 소리가 안 나요. 옆에서 읽어주세요.
          </p>
        ) : null}
      </div>
    );
  }

  if (!quiz) return null;

  // ── 끝 ────────────────────────────────────────────────
  if (quiz.phase === 'done') {
    return <Finished emoji="🎉🔤✨" quiz={quiz} />;
  }

  // ── 채점 ──────────────────────────────────────────────
  // 다 맞힌 판은 pick 에서 곧장 끝으로 보내므로, 이 화면은 틀린 글자가 있을 때만 뜬다.
  if (quiz.phase === 'grading') {
    return <Grading quiz={quiz} retryLabel="다시 찾기" onNext={goOn} />;
  }

  // ── ② 찾기 ────────────────────────────────────────────
  const index = currentIndex(quiz);
  if (index === null) return null;
  const problem = problems[index]!;
  const done = quiz.cursor;
  const left = quiz.queue.length - quiz.cursor;

  return (
    <JamoQuestion
      problem={problem}
      round={quiz.round}
      roundTitle={ROUND_TITLE[quiz.round]}
      queueLength={quiz.queue.length}
      done={done}
      left={left}
      retryMessage={retryMessage}
      speechOk={speechOk}
      onPick={pick}
    />
  );
}

/**
 * 소리를 듣고 글자를 고르는 화면.
 *
 * 문제가 바뀔 때마다 소리를 한 번 내준다. 이 활동에서 소리는 거들어 주는 것이
 * 아니라 **문제 그 자체**라, 누르기를 기다리면 아이는 무엇을 고를지 알 수 없다.
 * 별도 컴포넌트로 뺀 것은 문제가 바뀔 때만 소리가 나게 하기 위해서다.
 */
function JamoQuestion({
  problem,
  round,
  roundTitle,
  queueLength,
  done,
  left,
  retryMessage,
  speechOk,
  onPick,
}: {
  problem: JamoProblem;
  round: number;
  roundTitle: string | undefined;
  queueLength: number;
  done: number;
  left: number;
  retryMessage: string;
  speechOk: boolean;
  onPick: (letter: string) => void;
}) {
  const sound = problem.answer.sound;
  const spokenFor = useRef('');

  useEffect(() => {
    // 같은 문제에 머무는 동안(3차에서 틀렸을 때) 소리가 거듭 나지 않게 한다.
    const key = `${round}:${sound}`;
    if (spokenFor.current === key) return;
    spokenFor.current = key;
    speak(sound);
  }, [round, sound]);

  return (
    <div className="flex flex-col gap-5">
      {roundTitle ? (
        <p className="text-center font-bold text-glow-600">{roundTitle}</p>
      ) : null}

      <Progress total={queueLength} done={done} />

      <Card className="flex flex-col items-center gap-5 text-center">
        <button
          type="button"
          onClick={() => speak(sound)}
          aria-label="다시 듣기"
          className="min-h-touch rounded-full bg-glow-100 px-8 py-4 text-5xl shadow-md transition-transform active:scale-95"
        >
          🔊
        </button>
        <p className="text-2xl font-bold text-slate-700">어느 글자일까?</p>

        {round === 3 ? (
          <p
            data-testid="hint"
            className="flex flex-col items-center gap-2 rounded-2xl bg-glow-50 px-4 py-3 text-lg text-glow-700"
          >
            <span>💡 {jamoHint(problem)}</span>
            <span className="text-6xl font-bold">{problem.answer.letter}</span>
          </p>
        ) : null}

        <div className="flex justify-center gap-4">
          {problem.choices.map((c: JamoItem) => (
            <button
              key={c.letter}
              data-testid="choice"
              data-letter={c.letter}
              onClick={() => onPick(c.letter)}
              aria-label={c.letter}
              className="min-h-touch min-w-touch rounded-3xl bg-glow-100 px-6 py-4 text-5xl font-bold text-slate-700 shadow-md transition-transform active:scale-95"
            >
              {c.letter}
            </button>
          ))}
        </div>

        <p className="min-h-[1.75rem] font-bold text-glow-600">
          {retryMessage || (round === 1 ? `${left}개 남았어요` : '')}
        </p>

        {!speechOk ? (
          <p className="text-sm text-slate-400">
            이 기기에서는 소리가 안 나요. 옆에서 &lsquo;{sound}&rsquo; 라고 읽어주세요.
          </p>
        ) : null}
      </Card>
    </div>
  );
}

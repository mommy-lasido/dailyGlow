import { useEffect, useState } from 'react';
import { Button, Card } from '@dailyglow/ui';
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
  countAloud,
  COUNT_SETTINGS,
  countHint,
  countQuestion,
  KOREAN_COUNT,
  makeCountProblem,
  stepOf,
  type CountProblem,
  type CountSetting,
} from './generate';
import {
  makeNumberSet,
  numberQuestion,
  readNumber,
  type NumberProblem,
} from './numbers';

/**
 * 더하기 놀이는 10문제지만 여기는 5문제다.
 * 이 활동을 쓰는 아이는 만 3~4세라 한 번에 집중할 수 있는 시간이 훨씬 짧다.
 */
const PROBLEM_COUNT = 5;

/** 화면이 넘어가고 나서 수를 읽어주기까지 기다리는 시간. */
const SPEAK_DELAY_MS = 2000;

const ROUND_TITLE: Record<number, string> = {
  2: '틀린 문제를 다시 세어봐요',
  3: '이번엔 번호를 보면서 세어봐요',
};

export function CountPlayActivity({ onFinish }: ActivityProps) {
  const [setting, setSetting] = useState<CountSetting | null>(null);
  const [problems, setProblems] = useState<CountProblem[]>([]);
  /** 스물이 넘는 단계에서 쓰는 문제들. 그림 세기와 서로 배타적이다. */
  const [numbers, setNumbers] = useState<NumberProblem[]>([]);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  /** 3차에서 방금 틀렸을 때만 쓰는 안내 */
  const [retryMessage, setRetryMessage] = useState('');
  /** 지금 짚어 둔 보기. 아직 답으로 낸 것은 아니다. */
  const [chosen, setChosen] = useState<number | null>(null);

  /**
   * 듣고 찾기 문제는 소리가 곧 문제다. 화면에 들어오면 읽어준다.
   * 화면이 넘어가는 순간에 소리가 겹치면 아이가 못 들으므로 두 셈 쉬었다가 읽는다.
   */
  const askIndex = quiz && quiz.phase === 'solving' ? currentIndex(quiz) : null;
  const askNumber = askIndex === null ? null : (numbers[askIndex] ?? null);
  const askAloud = askNumber && !askNumber.sequence ? askNumber.answer : null;
  useEffect(() => {
    if (askAloud === null) return;
    const id = setTimeout(() => speak(readNumber(askAloud)), SPEAK_DELAY_MS);
    return () => clearTimeout(id);
  }, [askAloud]);

  function begin(chosen: CountSetting) {
    setSetting(chosen);
    if (chosen.mode === 'count') {
      setProblems(Array.from({ length: PROBLEM_COUNT }, () => makeCountProblem(chosen.range)));
      setNumbers([]);
    } else {
      setProblems([]);
      // 뛰어 세기는 다섯씩·열씩 건너뛴다 — 10 20 □ 40 50.
      setNumbers(makeNumberSet(chosen.range, PROBLEM_COUNT, stepOf(chosen.mode)));
    }
    setQuiz(createQuiz(PROBLEM_COUNT));
    setStartedAt(Date.now());
    setRetryMessage('');
    setChosen(null);
  }

  function finish(state: QuizState) {
    spawnConfetti();
    onFinish({
      totalCount: state.total,
      correctCount: state.firstTryCorrect,
      durationSec: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      // range 는 단계 승급 판정에 쓴다 — 가장 어려운 단계에서 잘해야 다음 과목으로 넘어간다.
      meta: { range: setting?.range ?? null, mode: setting?.mode ?? null, roundScores: state.roundScores },
    });
  }

  /**
   * 보기를 짚는다. **아직 답이 아니다.**
   *
   * 누르자마자 답으로 넘어가면 아이가 보기를 견주어 볼 수 없다. 세 살에게는
   * "셋은 어떻게 들리고 넷은 어떻게 들리나" 를 번갈아 들어보는 것이 곧 공부다.
   * 그래서 누르면 소리만 나고, 답은 아래 단추로 낸다.
   */
  function tap(value: number) {
    if (!quiz) return;
    const index = currentIndex(quiz);
    if (index === null) return;
    setChosen(value);
    // 만 세 살은 숫자 모양과 수량이 아직 이어지지 않아 점을 보지 않고 그냥 찍는다.
    // 누를 때마다 그 수의 이름을 들으면 3 과 '세 개' 가 같은 것이라는 것이 붙는다.
    // 스물이 넘는 단계에서는 세는 말 없이 수만 읽어준다 — '삼십일'.
    const unit = problems[index]?.object.unit;
    speak(unit ? countAloud(value, unit) : readNumber(value));
  }

  function pick(value: number) {
    if (!quiz) return;
    const index = currentIndex(quiz);
    if (index === null) return;
    setChosen(null);

    const isCorrect = value === (problems[index] ?? numbers[index]!).answer;
    // 3차에서 틀리면 같은 문제에 머문다 — 흐름은 submit 이 알아서 처리한다.
    setRetryMessage(
      quiz.round === 3 && !isCorrect
        ? setting?.mode === 'count'
          ? '괜찮아요, 다시 세어볼까? 🤔'
          : '괜찮아요, 다시 들어볼까? 🤔'
        : '',
    );
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
    setChosen(null);
    if (next.phase === 'done') finish(next);
  }

  // ── 얼마까지 세어볼지 고르기 ───────────────────────────
  if (!quiz || setting === null) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-center text-4xl font-bold text-glow-600">얼마까지 세어볼까?</h1>
        {COUNT_SETTINGS.map((s) => (
          <button
            key={`${s.mode}-${s.range}`}
            data-testid="setting"
            data-mode={s.mode}
            data-range={s.range}
            onClick={() => begin(s)}
            className="min-h-touch rounded-3xl bg-white p-5 text-left ring-1 ring-black/5 transition-transform active:scale-95"
          >
            <span className="flex items-center gap-5">
              <span className="text-5xl">{s.icon}</span>
              <span>
                <span className="block text-2xl font-bold text-glow-700">{s.name}</span>
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
  const problem = problems[index] ?? null;
  const number = numbers[index] ?? null;
  const current = problem ?? number!;
  const done = quiz.cursor;
  const left = quiz.queue.length - quiz.cursor;
  // 3차에서는 그림마다 번호를 붙여준다. 이것이 이 활동의 진짜 힌트다 —
  // 답을 말해주는 대신 세는 방법을 보여준다.
  const numbered = quiz.round === 3 && problem !== null;
  // "사과가 몇 개일까?" / "물고기가 몇 마리일까?" — 세는 말도 같이 익힌다.
  // 스물이 넘는 단계는 무엇을 묻는지가 문제마다 다르다.
  const question = problem ? countQuestion(problem.object) : numberQuestion(number!);

  return (
    <div className="flex flex-col gap-5">
      {quiz.round > 1 ? (
        <p className="text-center font-bold text-glow-600">{ROUND_TITLE[quiz.round]}</p>
      ) : null}

      <Progress total={quiz.queue.length} done={done} />

      <Card className="flex flex-col items-center gap-5 text-center">
        {problem ? (
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
        ) : number!.sequence ? (
          // 빠진 수 채우기. 라윤이가 쓰던 수 배열판(100칸)을 한 줄로 자른 것이다.
          <div
            data-testid="sequence"
            className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-glow-50 px-4 py-4"
          >
            {number!.sequence!.map((n, i) => (
              <span
                key={i}
                data-testid={n === null ? 'blank' : 'seq-number'}
                className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-bold ${
                  n === null
                    ? 'border-2 border-dashed border-glow-500 text-glow-500'
                    : 'bg-white text-slate-700'
                }`}
              >
                {n ?? '?'}
              </span>
            ))}
          </div>
        ) : (
          // 듣고 찾기. 소리가 곧 문제라 눌러서 다시 들을 수 있어야 한다.
          <button
            type="button"
            data-testid="say-number"
            onClick={() => speak(readNumber(number!.answer))}
            aria-label="다시 들어보기"
            className="min-h-touch rounded-3xl bg-glow-50 px-10 py-6 text-6xl transition-transform active:scale-95"
          >
            🔊
          </button>
        )}

        <div className="flex items-center justify-center gap-3">
          <span data-testid="question" className="text-4xl font-bold text-slate-700">
            {question}
          </span>
          <button
            type="button"
            onClick={() => speak(question)}
            aria-label="문제 읽어주기"
            className="min-h-touch min-w-touch rounded-full bg-glow-100 text-3xl transition-transform active:scale-95"
          >
            🔊
          </button>
        </div>

        {numbered ? (
          <p
            data-testid="hint"
            className="rounded-2xl bg-glow-50 px-4 py-3 text-lg text-glow-700"
          >
            💡 {countHint(problem!.object)}
          </p>
        ) : null}

        {/* 숫자를 아직 못 읽는 아이도 고를 수 있게 숫자 밑에 점을 함께 찍어준다.
            스물이 넘어가면 점을 찍지 않는다 — 여든일곱 개의 점은 아무 도움이 안 된다. */}
        <div className="flex flex-wrap justify-center gap-4">
          {current.choices.map((c) => (
            <button
              key={c}
              data-testid="choice"
              data-value={c}
              data-chosen={c === chosen ? 'yes' : undefined}
              onClick={() => tap(c)}
              aria-label={problem ? `${c}${problem.object.unit}` : String(c)}
              className={`min-h-touch min-w-touch rounded-3xl px-5 py-3 transition-transform active:scale-95 ${
                c === chosen ? 'bg-glow-300 ring-4 ring-glow-500' : 'bg-glow-100'
              }`}
            >
              <span className="block text-4xl font-bold text-slate-700">{c}</span>
              <span
                className={`mt-1 flex max-w-[4.5rem] flex-wrap justify-center gap-[2px] leading-none ${
                  problem ? '' : 'hidden'
                }`}
              >
                {Array.from({ length: c }).map((_, i) => (
                  <span key={i} className="text-[10px] text-glow-600">
                    ●
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>

        {/* 짚어 보고 나서 답을 낸다. 짚기 전에는 누를 것이 없다. */}
        <Button
          size="lg"
          data-testid="confirm"
          disabled={chosen === null}
          onClick={() => pick(chosen!)}
        >
          {chosen === null ? '눌러서 들어봐요' : '이거예요!'}
        </Button>

        <p className="min-h-[1.75rem] font-bold text-glow-600">
          {retryMessage || (quiz.round === 1 ? `${left}개 남았어요` : '')}
        </p>
      </Card>
    </div>
  );
}

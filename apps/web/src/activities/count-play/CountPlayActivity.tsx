import { useEffect, useState } from 'react';
import { Button, Card } from '@dailyglow/ui';
import { hasMenuArt, MenuIcon } from '@/components/MenuIcon';
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
  COUNT_GROUPS,
  countHint,
  countQuestion,
  KOREAN_COUNT,
  makeCountSet,
  settingsOf,
  stepOf,
  type CountGroup,
  type CountProblem,
  type CountSetting,
} from './generate';
import {
  bondHint,
  bondQuestion,
  makeBondSet,
  type BondProblem,
} from './bonds';
import {
  makeLineSet,
  makeNumberSet,
  makeOrderSet,
  numberQuestion,
  readNumber,
  type LineProblem,
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
  /** 무엇을 하는 묶음을 고르는 중인가. 고르고 나면 그 안의 단계를 고른다. */
  const [group, setGroup] = useState<CountGroup | null>(null);
  const [setting, setSetting] = useState<CountSetting | null>(null);
  const [problems, setProblems] = useState<CountProblem[]>([]);
  /** 스물이 넘는 단계에서 쓰는 문제들. 그림 세기와 서로 배타적이다. */
  const [numbers, setNumbers] = useState<NumberProblem[]>([]);
  /** 모으기·가르기 문제들 */
  const [bonds, setBonds] = useState<BondProblem[]>([]);
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
  // 수직선은 소리로 묻지 않는다 — 화살표를 보고 찾는 것이 이 단계의 일이다.
  const askAloud =
    askNumber && !askNumber.sequence && setting?.mode !== 'line' ? askNumber.answer : null;
  useEffect(() => {
    if (askAloud === null) return;
    const id = setTimeout(() => speak(readNumber(askAloud)), SPEAK_DELAY_MS);
    return () => clearTimeout(id);
  }, [askAloud]);

  function begin(chosen: CountSetting) {
    setSetting(chosen);
    if (chosen.mode === 'count') {
      setProblems(makeCountSet(chosen.range, PROBLEM_COUNT));
      setNumbers([]);
      setBonds([]);
    } else if (chosen.mode === 'gather' || chosen.mode === 'split') {
      setProblems([]);
      setNumbers([]);
      setBonds(makeBondSet(chosen.mode, PROBLEM_COUNT));
    } else {
      setProblems([]);
      setBonds([]);
      // 단계마다 내는 것이 다르다.
      //   순서 — 빠진 수 채우기만. 수직선 — 화살표가 가리키는 수만.
      //   읽기 — 듣고 찾기와 빈칸 채우기를 번갈아. 뛰어 세기 — 다섯씩·열씩.
      setNumbers(
        chosen.mode === 'order'
          ? makeOrderSet(chosen.range, PROBLEM_COUNT)
          : chosen.mode === 'line'
            ? makeLineSet(chosen.range, PROBLEM_COUNT)
            : makeNumberSet(chosen.range, PROBLEM_COUNT, stepOf(chosen.mode)),
      );
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
      meta: {
        range: setting?.range ?? null,
        mode: setting?.mode ?? null,
        roundScores: state.roundScores,
        // 1차에 틀린 수. 나중에 "어떤 수에서 자꾸 막히는가" 를 보는 재료가 된다.
        wrong: state.firstMissed.map((i) =>
          String((problems[i] ?? numbers[i] ?? bonds[i])?.answer ?? ''),
        ),
      },
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
    // **하나씩 세기에서만 보기를 읽어준다.** 만 세 살은 숫자 모양과 수량이 아직
    // 이어지지 않아 점을 보지 않고 그냥 찍는다. 누를 때마다 그 수의 이름을 들으면
    // 3 과 '세 개' 가 같은 것이라는 것이 붙는다.
    //
    // 숫자 읽기·뛰어 세기에서는 읽어주지 않는다. 그 단계는 **숫자를 보고 아는
    // 것**이 배울 내용이라, 보기를 읽어주면 눌러 보기만 해도 답이 가려진다.
    const unit = problems[index]?.object.unit;
    if (unit) speak(countAloud(value, unit));
  }

  function pick(value: number) {
    if (!quiz) return;
    const index = currentIndex(quiz);
    if (index === null) return;
    setChosen(null);

    const isCorrect = value === (problems[index] ?? numbers[index] ?? bonds[index]!).answer;
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

  /**
   * 하던 판을 놓고 단계 고르는 화면으로 돌아간다.
   *
   * 한 칸만 물러난다 — 묶음(무엇을 해볼까)은 그대로 두고 단계만 다시 고른다.
   * 거기서 한 번 더 물러나면 묶음 고르기가 나온다.
   */
  function backToMenu() {
    setQuiz(null);
    setSetting(null);
    setRetryMessage('');
    setChosen(null);
  }

  function goOn() {
    if (!quiz) return;
    const next = nextRound(quiz);
    setQuiz(next);
    setRetryMessage('');
    setChosen(null);
    if (next.phase === 'done') finish(next);
  }

  // ── ① 무엇을 해볼지 고르기 ─────────────────────────────
  //
  // 단계가 여덟이 되어 한 화면에 늘어놓으니 아이가 무엇이 무엇인지 가리기 어려웠다.
  // 하는 일이 같은 것끼리 셋으로 묶고, 묶음을 고른 뒤에 단계를 고르게 한다.
  if (!quiz || setting === null) {
    if (group === null) {
      return (
        <div className="flex flex-col gap-4">
          <h1 className="text-center text-4xl font-bold text-glow-600">뭘 해볼까?</h1>
          {COUNT_GROUPS.map((g) => (
            <MenuRow
              key={g.group}
              testId="group"
              icon={g.icon}
              art={g.art}
              name={g.name}
              desc={g.desc}
              onClick={() => setGroup(g.group)}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-center text-4xl font-bold text-glow-600">어디까지 해볼까?</h1>
        {settingsOf(group).map((s) => (
          <MenuRow
            key={`${s.mode}-${s.range}`}
            testId="setting"
            icon={s.icon}
            art={s.art}
            name={s.name}
            desc={s.desc}
            mode={s.mode}
            range={s.range}
            onClick={() => begin(s)}
          />
        ))}
        <Button variant="ghost" onClick={() => setGroup(null)}>
          ← 다시 고르기
        </Button>
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
  const bond = bonds[index] ?? null;
  const current = problem ?? number ?? bond!;
  const done = quiz.cursor;
  const left = quiz.queue.length - quiz.cursor;
  // 3차에서는 그림마다 번호를 붙여준다. 이것이 이 활동의 진짜 힌트다 —
  // 답을 말해주는 대신 세는 방법을 보여준다.
  const numbered = quiz.round === 3 && problem !== null;
  const bondHelp = quiz.round === 3 && bond !== null;
  // "사과가 몇 개일까?" / "물고기가 몇 마리일까?" — 세는 말도 같이 익힌다.
  // 스물이 넘는 단계는 무엇을 묻는지가 문제마다 다르다.
  const question = problem
    ? countQuestion(problem.object)
    : bond
      ? bondQuestion(bond.kind)
      : setting?.mode === 'line'
        ? '화살표가 가리키는 수는?'
        : numberQuestion(number!);

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
        ) : bond ? (
          <BondBoard bond={bond} />
        ) : setting?.mode === 'line' ? (
          <NumberLine problem={number as LineProblem} />
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

        {/* 듣고 찾기에는 위에 이미 큰 스피커가 있다. 여기에 또 두면 한 화면에
            스피커가 둘이 되어 아이가 어느 것을 눌러야 할지 헷갈린다. */}
        <div className="flex items-center justify-center gap-3">
          <span data-testid="question" className="text-4xl font-bold text-slate-700">
            {question}
          </span>
          {problem || bond || number?.sequence || setting?.mode === 'line' ? (
            <button
              type="button"
              onClick={() => speak(question)}
              aria-label="문제 읽어주기"
              className="min-h-touch min-w-touch rounded-full bg-glow-100 text-3xl transition-transform active:scale-95"
            >
              🔊
            </button>
          ) : null}
        </div>

        {numbered || bondHelp ? (
          <p
            data-testid="hint"
            className="rounded-2xl bg-glow-50 px-4 py-3 text-lg text-glow-700"
          >
            💡 {bondHelp ? bondHint(bond!) : countHint(problem!.object)}
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

      {/* 시작한 판에서 빠져나오는 길. 껍데기의 단추는 활동을 통째로 나가 버리므로,
          다른 단계를 해보고 싶은 아이는 갈 곳이 없었다. 여기서는 **한 칸만**
          물러난다 — 단계를 고르는 화면으로. */}
      <Button variant="ghost" onClick={backToMenu}>
        ← 다시 고르기
      </Button>
    </div>
  );
}

/**
 * 고르는 화면의 한 줄.
 *
 * 묶음을 고를 때와 단계를 고를 때가 같은 모양이라 한 군데서 그린다.
 * 그림 자리의 너비를 고정해 두어야 '🍎' 와 '100' 처럼 폭이 다른 것이 섞여도
 * 이름이 들쭉날쭉해지지 않는다.
 */
function MenuRow({
  testId,
  icon,
  art,
  name,
  desc,
  mode,
  range,
  onClick,
}: {
  testId: string;
  icon: string;
  /** `public/menu-art/` 의 그림 이름. 그림이 없으면 icon 을 글자로 그린다. */
  art?: string;
  name: string;
  desc: string;
  mode?: string;
  range?: number;
  onClick: () => void;
}) {
  return (
    <button
      data-testid={testId}
      data-mode={mode}
      data-range={range}
      onClick={onClick}
      className="min-h-touch rounded-3xl bg-white p-5 text-left ring-1 ring-black/5 transition-transform active:scale-95"
    >
      <span className="flex items-center gap-5">
        <span className="flex w-16 shrink-0 justify-center text-5xl font-bold text-glow-600">
          {art && hasMenuArt(art) ? <MenuIcon id={art} alt={name} className="h-16 w-16" /> : icon}
        </span>
        <span>
          <span className="block text-2xl font-bold text-glow-700">{name}</span>
          <span className="block text-sm text-slate-400">{desc}</span>
        </span>
      </span>
    </button>
  );
}

/**
 * 수직선.
 *
 * 0 부터 끝 수까지 눈금을 긋고, 찾아야 할 자리에 화살표를 세운다. 수를 세는 것도
 * 읽는 것도 아니고 **수가 줄 위에 나란히 놓여 있다**는 것을 아는 자리다. 이것을
 * 알아야 나중에 "7은 5보다 오른쪽" 같은 말이 뜻을 갖는다.
 *
 * 눈금에 수를 적어 두지 않는다 — 적어 두면 화살표 아래를 읽기만 하면 되어,
 * 줄을 따라 세어 보는 일이 없어진다. 처음(0)과 끝만 적는다.
 */
function NumberLine({ problem }: { problem: LineProblem }) {
  const { answer, lineMax } = problem;
  const ticks = Array.from({ length: lineMax + 1 }, (_, i) => i);

  return (
    <div
      data-testid="number-line"
      data-answer={answer}
      className="w-full rounded-2xl bg-glow-50 px-3 py-5"
    >
      <svg viewBox="0 0 100 26" className="w-full" role="img" aria-label="수직선">
        {/* 줄 */}
        <line x1="4" y1="16" x2="96" y2="16" stroke="#94a3b8" strokeWidth="0.8" />

        {ticks.map((n) => {
          const x = 4 + (n / lineMax) * 92;
          return (
            <g key={n}>
              <line x1={x} y1="13" x2={x} y2="19" stroke="#94a3b8" strokeWidth="0.8" />
              {/* 처음과 끝에만 수를 적는다 */}
              {n === 0 || n === lineMax ? (
                <text x={x} y="25" textAnchor="middle" fontSize="5" fill="#94a3b8">
                  {n}
                </text>
              ) : null}
              {/* 찾아야 할 자리 */}
              {n === answer ? (
                <g>
                  <polygon
                    points={`${x},11 ${x - 3},5 ${x + 3},5`}
                    fill="#5e9a44"
                  />
                  <text x={x} y="3.5" textAnchor="middle" fontSize="4.5" fill="#5e9a44">
                    ?
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * 모으기·가르기 판.
 *
 * 교재의 모양을 그대로 따른다 — 위에 전체, 아래에 두 몫, 사이를 선으로 잇는다.
 * 비어 있는 자리에는 물음표를 둔다.
 *
 * 아는 수 아래에는 **점을 그 수만큼 찍는다.** 이 나이의 아이는 숫자 5 를 보고
 * 곧바로 다섯을 떠올리지 못한다. 점이 있어야 세어 보고 모으고 덜어낼 수 있다.
 */
function BondBoard({ bond }: { bond: BondProblem }) {
  const cell = (value: number, hidden: boolean, testId: string) => (
    <div
      data-testid={testId}
      className={`flex min-w-[4.5rem] flex-col items-center gap-1 rounded-2xl px-3 py-2 ${
        hidden ? 'border-2 border-dashed border-glow-500' : 'bg-white'
      }`}
    >
      <span className="text-4xl font-bold text-slate-700">{hidden ? '?' : value}</span>
      <span className="flex min-h-[0.9rem] max-w-[4rem] flex-wrap justify-center gap-[2px] leading-none">
        {hidden
          ? null
          : Array.from({ length: value }).map((_, i) => (
              <span key={i} className="text-[10px] text-glow-600">
                ●
              </span>
            ))}
      </span>
    </div>
  );

  return (
    <div
      data-testid="bond-board"
      className="flex w-full flex-col items-center gap-1 rounded-2xl bg-glow-50 px-4 py-4"
    >
      {cell(bond.total, bond.missing === 'total', 'bond-total')}

      {/* 위와 아래를 잇는 두 줄 */}
      <svg viewBox="0 0 100 18" className="h-5 w-40" aria-hidden>
        <line x1="50" y1="0" x2="18" y2="18" stroke="#a8d18c" strokeWidth="2" />
        <line x1="50" y1="0" x2="82" y2="18" stroke="#a8d18c" strokeWidth="2" />
      </svg>

      <div className="flex items-start gap-4">
        {cell(bond.left, bond.missing === 'left', 'bond-left')}
        {cell(bond.right, bond.missing === 'right', 'bond-right')}
      </div>
    </div>
  );
}

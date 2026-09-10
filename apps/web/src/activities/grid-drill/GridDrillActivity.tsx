import { useEffect, useState } from 'react';
import { Button, Card } from '@dailyglow/ui';
import { spawnConfetti } from '@/lib/confetti';
import type { ActivityProps } from '@/activities/types';
import { Finished } from '@/activities/Finished';
import { Grading } from '@/activities/Grading';
import {
  createQuiz,
  currentIndex,
  nextRound,
  submit,
  type QuizState,
} from '@/activities/quiz-flow';
import {
  answerAt,
  cellAt,
  DRILL_CELLS,
  DRILL_OPS,
  DRILL_SIZE,
  formatDuration,
  makeTable,
  needsConfirm,
  opSign,
  type DrillOp,
  type DrillTable,
} from './generate';

const ROUND_TITLE: Record<number, string> = {
  2: '틀린 칸을 다시 채워봐요',
  3: '이번엔 답을 보고 채워봐요',
};

/** 채운 칸을 기억한다. 칸 번호 → 아이가 적은 수 */
type Filled = Record<number, number>;

export function GridDrillActivity({ onFinish }: ActivityProps) {
  const [table, setTable] = useState<DrillTable | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [filled, setFilled] = useState<Filled>({});
  const [typed, setTyped] = useState('');
  const [startedAt, setStartedAt] = useState(0);
  /** 1차를 채우는 데 걸린 시간. 빠르기는 1차로만 잰다. */
  const [firstRoundSec, setFirstRoundSec] = useState(0);
  const [now, setNow] = useState(0);
  const [retryMessage, setRetryMessage] = useState('');

  // 시계는 문제를 푸는 동안에만 돈다.
  const solving = quiz?.phase === 'solving';
  useEffect(() => {
    if (!solving) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [solving]);

  function begin(op: DrillOp) {
    setTable(makeTable(op));
    setQuiz(createQuiz(DRILL_CELLS));
    setFilled({});
    setTyped('');
    setFirstRoundSec(0);
    setRetryMessage('');
    const t = Date.now();
    setStartedAt(t);
    setNow(t);
  }

  /**
   * `first` 를 인자로 받는 이유 — 한 번에 백 칸을 다 맞히면 1차 시간을 재는 것과
   * 끝내는 것이 같은 순간에 일어난다. 이때 setFirstRoundSec 이 아직 반영되기
   * 전이라 상태에서 읽으면 0 이 기록된다.
   */
  function finish(state: QuizState, first: number) {
    spawnConfetti();
    onFinish({
      totalCount: state.total,
      correctCount: state.firstTryCorrect,
      durationSec: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      // 빠르기는 1차 시간으로만 잰다 — 다시 푼 시간까지 더하면 비교가 안 된다.
      meta: { op: table?.op, firstRoundSec: first, roundScores: state.roundScores },
    });
  }

  function commit(value: number) {
    if (!quiz || !table) return;
    const index = currentIndex(quiz);
    if (index === null) return;

    const isCorrect = value === answerAt(table, index);
    setFilled((prev) => ({ ...prev, [index]: value }));
    setTyped('');
    setRetryMessage(quiz.round === 3 && !isCorrect ? '괜찮아요, 답을 다시 볼까? 🤔' : '');

    const next = submit(quiz, isCorrect);
    // 1차를 마친 순간의 시간을 잡아 둔다.
    // 회차 번호는 nextRound 에서 올라가므로 여기서는 아직 1 이다.
    // 채점으로 넘어갔는지(= 백 칸을 다 채웠는지)로 판단해야 한다.
    let first = firstRoundSec;
    if (quiz.round === 1 && next.phase !== 'solving') {
      first = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      setFirstRoundSec(first);
    }
    const settled =
      next.phase === 'grading' && next.missed.length === 0 ? nextRound(next) : next;
    setQuiz(settled);
    if (settled.phase === 'done') finish(settled, first);
  }

  function press(digit: string) {
    if (!table) return;
    const value = typed + digit;
    if (needsConfirm(table.op, value)) setTyped(value);
    else commit(Number(value));
  }

  function goOn() {
    if (!quiz) return;
    const next = nextRound(quiz);
    setQuiz(next);
    setTyped('');
    setRetryMessage('');
    if (next.phase === 'done') finish(next, firstRoundSec);
  }

  // ── 어떤 셈을 할지 고르기 ──────────────────────────────
  if (!quiz || !table) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-center text-3xl font-bold text-glow-600">100칸 계산</h1>
        <p className="text-center text-slate-500">백 칸을 얼마나 빨리 채우는지 재봐요.</p>
        {DRILL_OPS.map((o) => (
          <button
            key={o.op}
            onClick={() => begin(o.op)}
            className="min-h-touch rounded-3xl bg-white p-5 text-left shadow-lg ring-1 ring-black/5 transition-transform active:scale-95"
          >
            <span className="flex items-center gap-5">
              <span className="text-5xl font-bold text-glow-500">{o.sign}</span>
              <span className="text-2xl font-bold text-slate-700">{o.name}</span>
            </span>
          </button>
        ))}
      </div>
    );
  }

  if (quiz.phase === 'done') {
    return (
      <Finished emoji="🎉🔢✨" quiz={quiz}>
        <p data-testid="elapsed" className="text-lg font-bold text-glow-600">
          처음 백 칸을 {formatDuration(firstRoundSec)} 만에 채웠어요.
        </p>
        <DrillTableView table={table} filled={filled} showAnswers />
      </Finished>
    );
  }

  if (quiz.phase === 'grading') {
    return (
      <Grading quiz={quiz} retryLabel="다시 채우기" onNext={goOn}>
        {quiz.round === 1 ? (
          <p data-testid="elapsed" className="font-bold text-glow-600">
            {formatDuration(firstRoundSec)} 걸렸어요.
          </p>
        ) : null}
        <DrillTableView table={table} filled={filled} showAnswers />
      </Grading>
    );
  }

  // ── 채우기 ────────────────────────────────────────────
  const index = currentIndex(quiz);
  if (index === null) return null;
  const { row, col } = cellAt(table, index);
  const elapsed = Math.max(0, Math.round((now - startedAt) / 1000));

  return (
    <div className="flex flex-col gap-4">
      {quiz.round > 1 ? (
        <p className="text-center font-bold text-glow-600">{ROUND_TITLE[quiz.round]}</p>
      ) : null}

      <div className="flex items-baseline justify-between px-1">
        <span className="text-slate-500">
          {quiz.cursor} / {quiz.queue.length}칸
        </span>
        <span data-testid="timer" className="text-lg font-bold text-glow-600">
          {formatDuration(elapsed)}
        </span>
      </div>

      <DrillTableView table={table} filled={filled} current={index} />

      <Card className="flex flex-col items-center gap-4">
        <p data-testid="problem" className="text-4xl font-bold text-slate-700">
          {row} {opSign(table.op)} {col} ={' '}
          <span className="text-glow-600">{typed || '?'}</span>
        </p>

        {/* 3차에는 답을 보여준다. 셈을 새로 배우는 활동이 아니라 익히는 활동이라,
            막힌 칸은 답을 보고 손으로 한 번 써 보는 편이 낫다. */}
        {quiz.round === 3 ? (
          <p data-testid="hint" className="rounded-2xl bg-glow-50 px-4 py-2 text-lg text-glow-700">
            💡 답은 {answerAt(table, index)} 이에요.
          </p>
        ) : null}

        <div className="grid grid-cols-5 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => (
            <button
              key={d}
              data-testid="key"
              data-digit={d}
              onClick={() => press(d)}
              className="min-h-touch min-w-touch rounded-2xl bg-glow-100 text-3xl font-bold text-slate-700 shadow-md transition-transform active:scale-95"
            >
              {d}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setTyped('')}>
            지우기
          </Button>
          <Button disabled={typed === ''} onClick={() => commit(Number(typed))}>
            확인
          </Button>
        </div>

        <p className="min-h-[1.5rem] font-bold text-glow-600">{retryMessage}</p>
      </Card>
    </div>
  );
}

/**
 * 표. 채운 칸은 아이가 적은 수를, 아직 안 채운 칸은 빈칸을 보여준다.
 * 채점 뒤에는 틀린 칸에 바른 답을 함께 보여준다.
 */
function DrillTableView({
  table,
  filled,
  current,
  showAnswers = false,
}: {
  table: DrillTable;
  filled: Filled;
  current?: number;
  showAnswers?: boolean;
}) {
  return (
    // 표가 화면보다 넓어지면 표 안에서만 옆으로 밀리게 한다.
    <div className="overflow-x-auto">
      <table data-testid="drill-table" className="mx-auto border-collapse text-center">
        <thead>
          <tr>
            <th className="h-9 w-9 rounded-tl-lg bg-glow-500 text-white">
              {opSign(table.op)}
            </th>
            {table.cols.map((c) => (
              <th key={c} className="h-9 w-9 bg-glow-100 text-sm font-bold text-glow-700">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, ri) => (
            <tr key={r}>
              <th className="h-9 w-9 bg-glow-100 text-sm font-bold text-glow-700">{r}</th>
              {table.cols.map((c, ci) => {
                const index = ri * DRILL_SIZE + ci;
                const wrote = filled[index];
                const right = answerAt(table, index);
                const wrong = showAnswers && wrote !== undefined && wrote !== right;
                return (
                  <td
                    key={c}
                    data-testid="cell"
                    data-index={index}
                    className={`h-9 w-9 border border-glow-100 text-sm font-bold ${
                      index === current
                        ? 'bg-glow-300 text-white'
                        : wrong
                          ? 'bg-red-50 text-red-500'
                          : 'text-slate-600'
                    }`}
                  >
                    {wrong ? right : (wrote ?? '')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

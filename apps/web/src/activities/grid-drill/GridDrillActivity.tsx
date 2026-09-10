import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@dailyglow/ui';
import { spawnConfetti } from '@/lib/confetti';
import type { ActivityProps } from '@/activities/types';
import {
  answerAt,
  cellAt,
  DRILL_OPS,
  DRILL_SIZES,
  formatTime,
  isCellCorrect,
  isCellFilled,
  levelsOf,
  makePuzzle,
  sideOf,
  type CellInput,
  type DrillCells,
  type DrillOp,
  type DrillPuzzle,
} from './generate';

/** 화면에서 풀 것인지, 인쇄해서 종이로 풀 것인지 */
type DrillMode = 'screen' | 'paper';

/**
 * 100칸 계산.
 *
 * 예전 앱의 짜임을 그대로 옮겼다 — 네 가지 셈, 25·64·100칸, 단계별 수 범위,
 * 그리고 **화면에서 풀기와 인쇄해서 종이로 풀기** 두 갈래.
 *
 * 이 활동에는 다른 활동의 3단계 흐름을 쓰지 않는다. 백 칸을 한 칸씩 물어보면
 * 표를 채우는 맛이 사라지고 빠르기를 재는 일도 어그러진다. 대신 표를 다 채우고
 * 채점한 뒤 틀린 칸만 고치게 한다 — 예전 앱과 같다.
 */
export function GridDrillActivity({ onFinish }: ActivityProps) {
  const [op, setOp] = useState<DrillOp>('+');
  const [levelId, setLevelId] = useState(1);
  const [cells, setCells] = useState<DrillCells>(100);
  const [mode, setMode] = useState<DrillMode>('screen');

  const [puzzle, setPuzzle] = useState<DrillPuzzle | null>(null);
  const [wrote, setWrote] = useState<Record<number, CellInput>>({});
  const [graded, setGraded] = useState(false);
  /** 처음 채점했을 때 맞은 칸 수. 실력은 이 숫자로 잰다. */
  const [firstScore, setFirstScore] = useState<number | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  /** 시계는 **첫 글자를 적는 순간** 시작한다. 표를 들여다보는 시간은 세지 않는다. */
  const startedAt = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const [now, setNow] = useState(0);
  const [finalSec, setFinalSec] = useState<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [running]);

  function start() {
    setPuzzle(makePuzzle(op, cells, levelId));
    setWrote({});
    setGraded(false);
    setFirstScore(null);
    setShowAnswers(false);
    startedAt.current = null;
    setRunning(false);
    setFinalSec(null);
  }

  function type(index: number, field: 'value' | 'remainder', text: string) {
    // 숫자만 받는다. 답이 음수가 되는 단계는 없으므로 빼기표는 받지 않는다.
    const clean = text.replace(/[^0-9]/g, '').slice(0, 4);
    if (startedAt.current === null) {
      startedAt.current = Date.now();
      setNow(Date.now());
      setRunning(true);
    }
    setWrote((prev) => ({
      ...prev,
      [index]: { value: '', ...prev[index], [field]: clean },
    }));
  }

  function grade() {
    if (!puzzle) return;
    const correct = countCorrect(puzzle, wrote);
    setGraded(true);
    const first = firstScore ?? correct;
    if (firstScore === null) setFirstScore(correct);

    if (correct !== puzzle.cells) return;

    const sec = startedAt.current
      ? Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))
      : 1;
    setFinalSec(sec);
    setRunning(false);
    spawnConfetti();
    onFinish({
      totalCount: puzzle.cells,
      // 실력은 처음 채점했을 때의 점수로 잰다 — 고친 뒤의 만점으로는 재지 못한다.
      correctCount: first,
      durationSec: sec,
      meta: { op: puzzle.op, cells: puzzle.cells, levelId, elapsedSec: sec },
    });
  }

  // ── 무엇을 풀지 고르기 ────────────────────────────────
  if (!puzzle) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-center text-3xl font-bold text-glow-600">100칸 계산</h1>

        <Card className="flex flex-col gap-3">
          <p className="font-bold text-slate-700">어떤 셈을 할까요?</p>
          <div className="flex flex-wrap gap-2">
            {DRILL_OPS.map((o) => (
              <button
                key={o.op}
                data-testid="op"
                data-op={o.op}
                onClick={() => {
                  setOp(o.op);
                  setLevelId(1);
                }}
                className={`min-h-touch flex-1 rounded-2xl px-4 text-lg font-bold shadow-md ${
                  op === o.op ? 'bg-glow-500 text-white' : 'bg-glow-100 text-slate-700'
                }`}
              >
                {o.label} {o.op}
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <p className="font-bold text-slate-700">어느 단계로 할까요?</p>
          <div className="flex flex-col gap-2">
            {levelsOf(op).map((l) => (
              <button
                key={l.id}
                data-testid="level"
                data-level={l.id}
                onClick={() => setLevelId(l.id)}
                className={`min-h-touch rounded-2xl px-4 text-left text-lg font-bold shadow-md ${
                  levelId === l.id ? 'bg-glow-500 text-white' : 'bg-glow-100 text-slate-700'
                }`}
              >
                {l.badge} {l.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <p className="font-bold text-slate-700">몇 칸으로 할까요?</p>
          <div className="flex flex-wrap gap-2">
            {DRILL_SIZES.map((s) => (
              <button
                key={s.cells}
                data-testid="size"
                data-cells={s.cells}
                onClick={() => setCells(s.cells)}
                className={`min-h-touch flex-1 rounded-2xl px-3 text-base font-bold shadow-md ${
                  cells === s.cells ? 'bg-glow-500 text-white' : 'bg-glow-100 text-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-400">
            100칸이 버거우면 25칸부터 시작해도 괜찮아요.
          </p>
        </Card>

        <Card className="flex flex-col gap-3">
          <p className="font-bold text-slate-700">어디서 풀까요?</p>
          <div className="flex gap-2">
            {(
              [
                { m: 'screen' as DrillMode, label: '💻 화면에서 풀기' },
                { m: 'paper' as DrillMode, label: '🖨️ 인쇄해서 풀기' },
              ]
            ).map((x) => (
              <button
                key={x.m}
                data-testid="mode"
                data-mode={x.m}
                onClick={() => setMode(x.m)}
                className={`min-h-touch flex-1 rounded-2xl px-4 text-lg font-bold shadow-md ${
                  mode === x.m ? 'bg-glow-500 text-white' : 'bg-glow-100 text-slate-700'
                }`}
              >
                {x.label}
              </button>
            ))}
          </div>
        </Card>

        <Button size="lg" onClick={start}>
          시작하기
        </Button>
      </div>
    );
  }

  const elapsed =
    finalSec ?? (startedAt.current ? Math.round((now - startedAt.current) / 1000) : 0);
  const filledCount = Array.from({ length: puzzle.cells }).filter((_, i) =>
    isCellFilled(puzzle.op, wrote[i]),
  ).length;
  const done = finalSec !== null;

  // ── 인쇄해서 풀기 ─────────────────────────────────────
  if (mode === 'paper') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <h1 className="text-2xl font-bold text-glow-600">인쇄해서 풀기</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setShowAnswers((v) => !v)}>
              {showAnswers ? '답 숨기기' : '답 보기'}
            </Button>
            <Button variant="ghost" onClick={start}>
              새 문제
            </Button>
            <Button onClick={() => window.print()}>🖨️ 인쇄하기</Button>
          </div>
        </div>
        <p className="text-slate-500 print:hidden">
          인쇄해서 연필로 풀어요. 다 풀면 여기서 &lsquo;답 보기&rsquo; 로 맞춰봐요.
        </p>
        <PuzzleTable puzzle={puzzle} wrote={{}} readOnly showAnswers={showAnswers} />
        <Link to="/" className="print:hidden">
          <Button variant="ghost">홈으로</Button>
        </Link>
      </div>
    );
  }

  // ── 화면에서 풀기 ─────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between px-1">
        <span className="text-slate-500">
          {filledCount} / {puzzle.cells}칸
        </span>
        <span data-testid="timer" className="text-xl font-bold text-glow-600">
          {formatTime(elapsed)}
        </span>
      </div>

      <PuzzleTable puzzle={puzzle} wrote={wrote} graded={graded} onType={type} />

      {done ? (
        <Card className="flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">🎉</span>
          <h2 className="text-2xl font-bold text-glow-600">다 맞혔어요!</h2>
          <p data-testid="result" className="text-slate-600">
            {formatTime(finalSec!)} 만에 {puzzle.cells}칸을 다 채웠어요.
          </p>
          {firstScore !== null && firstScore < puzzle.cells ? (
            <p className="text-sm text-slate-400">
              처음 채점에서는 {firstScore}칸이 맞았어요.
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button onClick={start}>새 문제</Button>
            <Link to="/">
              <Button variant="ghost">홈으로</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col items-center gap-3 text-center">
          {graded ? (
            <p data-testid="score" className="text-lg font-bold text-glow-600">
              {puzzle.cells}칸 중 {countCorrect(puzzle, wrote)}칸 맞았어요. 빨간 칸을 고쳐볼까요?
            </p>
          ) : (
            <p className="text-slate-500">다 채우면 채점해요. 엔터를 누르면 다음 칸으로 가요.</p>
          )}
          <div className="flex gap-3">
            <Button size="lg" onClick={grade}>
              채점하기
            </Button>
            <Button variant="ghost" onClick={start}>
              새 문제
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function countCorrect(p: DrillPuzzle, wrote: Record<number, CellInput>): number {
  let n = 0;
  for (let i = 0; i < p.cells; i += 1) {
    if (isCellCorrect(p, i, wrote[i] ?? { value: '' })) n += 1;
  }
  return n;
}

/**
 * 표.
 *
 * 인쇄할 때는 표만 남기고 나머지를 감춘다(`print:hidden`).
 */
function PuzzleTable({
  puzzle,
  wrote,
  graded = false,
  readOnly = false,
  showAnswers = false,
  onType,
}: {
  puzzle: DrillPuzzle;
  wrote: Record<number, CellInput>;
  graded?: boolean;
  readOnly?: boolean;
  showAnswers?: boolean;
  onType?: (index: number, field: 'value' | 'remainder', text: string) => void;
}) {
  const side = sideOf(puzzle.cells);

  /** 엔터를 누르면 다음 칸으로. 예전 앱과 같다. */
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const inputs = Array.from(
      e.currentTarget.closest('table')?.querySelectorAll('input') ?? [],
    ) as HTMLInputElement[];
    const i = inputs.indexOf(e.currentTarget);
    if (i >= 0 && i < inputs.length - 1) inputs[i + 1]!.focus();
    else e.currentTarget.blur();
  }

  return (
    <div className="overflow-x-auto">
      <table data-testid="drill-table" className="mx-auto border-collapse">
        <tbody>
          <tr>
            <td className="h-12 w-12 border border-glow-300 bg-glow-500 text-center text-lg font-bold text-white">
              {puzzle.op}
            </td>
            {puzzle.colHeaders.map((c, ci) => (
              <td
                key={ci}
                className="h-12 w-12 border border-glow-300 bg-glow-100 text-center font-bold text-glow-700"
              >
                {c}
              </td>
            ))}
          </tr>
          {puzzle.rowHeaders.map((r, ri) => (
            <tr key={ri}>
              <td className="h-12 w-12 border border-glow-300 bg-glow-100 text-center font-bold text-glow-700">
                {r}
              </td>
              {puzzle.colHeaders.map((_, ci) => {
                const index = ri * side + ci;
                const a = answerAt(puzzle, index);
                const mine = wrote[index] ?? { value: '' };
                const wrong = graded && !isCellCorrect(puzzle, index, mine);
                const { row, col } = cellAt(puzzle, index);
                return (
                  <td
                    key={ci}
                    data-testid="cell"
                    data-index={index}
                    className={`h-12 w-12 border border-glow-300 text-center ${
                      wrong ? 'bg-red-50' : ''
                    }`}
                  >
                    {readOnly ? (
                      <span className="text-sm font-bold text-glow-700">
                        {showAnswers
                          ? puzzle.op === '÷'
                            ? `${a.quotient}…${a.remainder}`
                            : a.value
                          : ''}
                      </span>
                    ) : puzzle.op === '÷' ? (
                      <span className="flex flex-col">
                        <input
                          data-testid="input"
                          data-index={index}
                          data-field="value"
                          inputMode="numeric"
                          aria-label={`${row} 나누기 ${col} 의 몫`}
                          value={mine.value}
                          onKeyDown={onKeyDown}
                          onChange={(e) => onType?.(index, 'value', e.target.value)}
                          className="w-full bg-transparent text-center text-sm font-bold outline-none"
                          placeholder="몫"
                        />
                        <input
                          data-testid="input"
                          data-index={index}
                          data-field="remainder"
                          inputMode="numeric"
                          aria-label={`${row} 나누기 ${col} 의 나머지`}
                          value={mine.remainder ?? ''}
                          onKeyDown={onKeyDown}
                          onChange={(e) => onType?.(index, 'remainder', e.target.value)}
                          className="w-full bg-transparent text-center text-xs text-slate-500 outline-none"
                          placeholder="나머지"
                        />
                      </span>
                    ) : (
                      <input
                        data-testid="input"
                        data-index={index}
                        data-field="value"
                        inputMode="numeric"
                        aria-label={`${row} ${puzzle.op} ${col}`}
                        value={mine.value}
                        onKeyDown={onKeyDown}
                        onChange={(e) => onType?.(index, 'value', e.target.value)}
                        className="w-full bg-transparent text-center text-lg font-bold outline-none"
                      />
                    )}
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

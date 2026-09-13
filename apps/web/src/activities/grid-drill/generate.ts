/**
 * 100칸 계산의 표 만들기.
 *
 * 영숙님이 직접 만든 예전 앱(`files_라윤/index.html`)의 짜임을 그대로 옮겼다 —
 * 네 가지 셈, 세 가지 칸 수, 셈마다의 단계별 수 범위까지 같다.
 *
 * 이 활동의 목적은 새로운 셈을 배우는 것이 아니라 **이미 아는 셈을 빠르고
 * 정확하게** 하는 것이다. 그래서 문제를 어렵게 만들지 않고, 얼마나 빨리
 * 채우는지를 잰다.
 */

export type DrillOp = '+' | '-' | '×' | '÷';

export const DRILL_OPS = [
  { op: '+' as DrillOp, label: '덧셈' },
  { op: '-' as DrillOp, label: '뺄셈' },
  { op: '×' as DrillOp, label: '곱셈' },
  { op: '÷' as DrillOp, label: '나눗셈' },
] as const;

/** 칸 수와 한 줄의 길이. 100칸이 어려우면 25칸부터 해도 된다. */
export const DRILL_SIZES = [
  { cells: 25, side: 5, label: '25칸 (5×5)' },
  { cells: 64, side: 8, label: '64칸 (8×8)' },
  { cells: 100, side: 10, label: '100칸 (10×10)' },
] as const;

export type DrillCells = (typeof DRILL_SIZES)[number]['cells'];

export function sideOf(cells: DrillCells): number {
  return DRILL_SIZES.find((s) => s.cells === cells)!.side;
}

export interface DrillRange {
  rowMin: number;
  rowMax: number;
  colMin: number;
  colMax: number;
}

export interface DrillLevel {
  id: number;
  badge: string;
  label: string;
  range: DrillRange;
}

/** 셈마다의 단계. 예전 앱의 값을 그대로 옮겼다. */
export const DRILL_LEVELS: Record<DrillOp, DrillLevel[]> = {
  '+': [
    { id: 1, badge: '🌱', label: '0~9 + 0~9', range: { rowMin: 0, rowMax: 9, colMin: 0, colMax: 9 } },
    { id: 2, badge: '🌿', label: '10~19 + 0~9', range: { rowMin: 10, rowMax: 19, colMin: 0, colMax: 9 } },
    { id: 3, badge: '🌳', label: '10~19 + 10~19', range: { rowMin: 10, rowMax: 19, colMin: 10, colMax: 19 } },
    { id: 4, badge: '🌟', label: '20~49 + 10~19', range: { rowMin: 20, rowMax: 49, colMin: 10, colMax: 19 } },
  ],
  '-': [
    { id: 1, badge: '🌱', label: '9~18 − 0~9', range: { rowMin: 9, rowMax: 18, colMin: 0, colMax: 9 } },
    { id: 2, badge: '🌿', label: '20~29 − 10~19', range: { rowMin: 20, rowMax: 29, colMin: 10, colMax: 19 } },
    { id: 3, badge: '🌳', label: '30~49 − 10~29', range: { rowMin: 30, rowMax: 49, colMin: 10, colMax: 29 } },
    { id: 4, badge: '🌟', label: '50~99 − 10~49', range: { rowMin: 50, rowMax: 99, colMin: 10, colMax: 49 } },
  ],
  '×': [
    { id: 1, badge: '🌱', label: '구구단 (0~9 × 0~9)', range: { rowMin: 0, rowMax: 9, colMin: 0, colMax: 9 } },
    { id: 2, badge: '🌟', label: '10~19 × 0~9', range: { rowMin: 10, rowMax: 19, colMin: 0, colMax: 9 } },
  ],
  '÷': [
    { id: 1, badge: '🌱', label: '10~19 ÷ 1~9', range: { rowMin: 10, rowMax: 19, colMin: 1, colMax: 9 } },
    { id: 2, badge: '🌿', label: '20~49 ÷ 1~9', range: { rowMin: 20, rowMax: 49, colMin: 1, colMax: 9 } },
    { id: 3, badge: '🌟', label: '50~99 ÷ 1~9', range: { rowMin: 50, rowMax: 99, colMin: 1, colMax: 9 } },
  ],
};

export function levelsOf(op: DrillOp): DrillLevel[] {
  return DRILL_LEVELS[op];
}

export interface DrillPuzzle {
  op: DrillOp;
  cells: DrillCells;
  side: number;
  rowHeaders: number[];
  colHeaders: number[];
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * 머리줄에 쓸 수를 뽑는다.
 *
 * 범위가 칸 수보다 좁을 수 있다 — 예를 들어 0~9 에서 여덟 개를 뽑으면 되지만,
 * 열 개를 뽑으면 딱 맞고, 더 넓은 범위(20~49)에서는 그중 일부만 쓴다.
 * 범위가 모자라면 앞에서부터 다시 쓴다.
 */
export function pickHeaders(
  min: number,
  max: number,
  count: number,
  rand: () => number = Math.random,
): number[] {
  const pool = shuffle(
    Array.from({ length: max - min + 1 }, (_, i) => min + i),
    rand,
  );
  const out: number[] = [];
  while (out.length < count) out.push(...pool.slice(0, count - out.length));
  return out;
}

export function makePuzzle(
  op: DrillOp,
  cells: DrillCells,
  levelId: number,
  rand: () => number = Math.random,
): DrillPuzzle {
  const side = sideOf(cells);
  const level = levelsOf(op).find((l) => l.id === levelId) ?? levelsOf(op)[0]!;
  const r = level.range;
  return {
    op,
    cells,
    side,
    rowHeaders: pickHeaders(r.rowMin, r.rowMax, side, rand),
    colHeaders: pickHeaders(r.colMin, r.colMax, side, rand),
  };
}

/**
 * 한 칸의 답.
 *
 * 나눗셈만 답이 둘이다 — 몫과 나머지. 예전 앱과 같이 두 칸에 나눠 적는다.
 */
export interface CellAnswer {
  value: number;
  /** 나눗셈일 때만 */
  quotient?: number;
  remainder?: number;
}

export function cellAnswer(op: DrillOp, row: number, col: number): CellAnswer {
  if (op === '+') return { value: row + col };
  if (op === '-') return { value: row - col };
  if (op === '×') return { value: row * col };
  return {
    value: Math.floor(row / col),
    quotient: Math.floor(row / col),
    remainder: row % col,
  };
}

/** 표를 왼쪽 위에서 오른쪽 아래로 훑는 순서 */
export function cellAt(p: DrillPuzzle, index: number): { row: number; col: number } {
  return {
    row: p.rowHeaders[Math.floor(index / p.side)]!,
    col: p.colHeaders[index % p.side]!,
  };
}

export function answerAt(p: DrillPuzzle, index: number): CellAnswer {
  const { row, col } = cellAt(p, index);
  return cellAnswer(p.op, row, col);
}

/** 아이가 적은 것이 맞는가. 나눗셈은 몫과 나머지가 둘 다 맞아야 한다. */
export function isCellCorrect(p: DrillPuzzle, index: number, wrote: CellInput): boolean {
  const a = answerAt(p, index);
  if (p.op === '÷') {
    return Number(wrote.value) === a.quotient && Number(wrote.remainder) === a.remainder;
  }
  return wrote.value !== '' && Number(wrote.value) === a.value;
}

/** 한 칸에 아이가 적은 것. 나눗셈이면 나머지 칸도 쓴다. */
export interface CellInput {
  value: string;
  remainder?: string;
}

export function isCellFilled(op: DrillOp, wrote: CellInput | undefined): boolean {
  if (!wrote) return false;
  if (op === '÷') return wrote.value !== '' && (wrote.remainder ?? '') !== '';
  return wrote.value !== '';
}

/** 걸린 시간을 "1:23" 으로. 예전 앱과 같은 모양이다. */
export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

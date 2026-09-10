/**
 * 100칸 계산의 표 만들기.
 *
 * 이 활동의 목적은 새로운 셈을 배우는 것이 아니라 **이미 아는 셈을 빠르고
 * 정확하게** 하는 것이다. 그래서 문제를 어렵게 만들지 않는다 — 한 자리 수끼리의
 * 셈 백 개를 순서 없이 늘어놓고, 얼마나 빨리 채우는지를 본다.
 *
 * 종이로 하는 100칸 계산과 같은 짜임이다. 가로 머리줄과 세로 머리줄에 숫자가
 * 하나씩 있고, 두 수를 셈한 값을 칸에 적는다.
 */

export type DrillOp = 'add' | 'sub' | 'mul';

export const DRILL_SIZE = 10;
/** 표의 칸 수. 10×10 이라 백 칸이다. */
export const DRILL_CELLS = DRILL_SIZE * DRILL_SIZE;

export const DRILL_OPS = [
  { op: 'add' as DrillOp, sign: '＋', name: '더하기 100칸' },
  { op: 'sub' as DrillOp, sign: '－', name: '빼기 100칸' },
  { op: 'mul' as DrillOp, sign: '×', name: '곱하기 100칸' },
] as const;

export function opSign(op: DrillOp): string {
  return DRILL_OPS.find((o) => o.op === op)!.sign;
}

export interface DrillTable {
  op: DrillOp;
  /** 가로 머리줄 열 개 */
  cols: number[];
  /** 세로 머리줄 열 개 */
  rows: number[];
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
 * 빼기는 세로 머리줄을 10~19 로 둔다. 그래야 답이 음수로 내려가지 않는다.
 * 종이 교재도 같은 방식으로 짠다.
 */
function rowHeaders(op: DrillOp): number[] {
  if (op === 'sub') return Array.from({ length: DRILL_SIZE }, (_, i) => i + 10);
  return Array.from({ length: DRILL_SIZE }, (_, i) => i);
}

export function makeTable(op: DrillOp, rand: () => number = Math.random): DrillTable {
  return {
    op,
    cols: shuffle(
      Array.from({ length: DRILL_SIZE }, (_, i) => i),
      rand,
    ),
    rows: shuffle(rowHeaders(op), rand),
  };
}

export function answerOf(op: DrillOp, row: number, col: number): number {
  if (op === 'add') return row + col;
  if (op === 'sub') return row - col;
  return row * col;
}

/** 표를 왼쪽 위에서 오른쪽 아래로 훑는 순서. 칸 번호 → (세로, 가로) */
export function cellAt(table: DrillTable, index: number): { row: number; col: number } {
  return {
    row: table.rows[Math.floor(index / DRILL_SIZE)]!,
    col: table.cols[index % DRILL_SIZE]!,
  };
}

export function answerAt(table: DrillTable, index: number): number {
  const { row, col } = cellAt(table, index);
  return answerOf(table.op, row, col);
}

/** 이 셈에서 나올 수 있는 답 전부 */
export function possibleAnswers(op: DrillOp): number[] {
  const set = new Set<number>();
  for (const r of rowHeaders(op)) {
    for (let c = 0; c < DRILL_SIZE; c += 1) set.add(answerOf(op, r, c));
  }
  return [...set].sort((a, b) => a - b);
}

/**
 * 지금까지 누른 숫자가 답이 될 수도 있고, 더 눌러야 할 수도 있는가.
 *
 * 더하기에서 '1' 을 눌렀으면 답이 1 일 수도 있고 12 일 수도 있다. 이럴 때는
 * 아이가 확인 단추를 눌러야 하고, 그렇지 않으면 누르는 즉시 다음 칸으로 넘어간다.
 * 빠르기를 재는 활동이라 확인 단추를 누르는 손짓 하나가 아깝다.
 */
export function needsConfirm(op: DrillOp, typed: string): boolean {
  if (typed === '') return true;
  return possibleAnswers(op).some((a) => {
    const s = String(a);
    return s.length > typed.length && s.startsWith(typed);
  });
}

/** 걸린 시간을 "1분 23초" 로. 1분이 안 되면 초만. */
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

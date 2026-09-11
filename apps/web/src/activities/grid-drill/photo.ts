/**
 * 종이에 푼 연습지를 사진으로 채점하기.
 *
 * 사진에서 **읽는 일**은 서버 뒤편(`functions/api/read-sheet.ts`)이 하고,
 * **맞았는지 판단하는 일**은 여기서 한다. 앱은 정답을 이미 알고 있으므로 셈을
 * 남에게 맡길 이유가 없다 — 맡기면 AI 가 계산을 틀릴 때 아이가 맞게 쓴 것을
 * 틀렸다고 하게 된다.
 */

import { answerAt, type DrillPuzzle } from './generate';

const ENDPOINT = '/api/read-sheet';

/** 사진 읽기를 쓸 수 있는가. 열쇠가 없으면 앱이 사진 칸을 아예 감춘다. */
export async function photoGradingAvailable(): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT);
    if (!res.ok) return false;
    const body = (await res.json()) as { available?: boolean };
    return body.available === true;
  } catch {
    // 인터넷이 끊겼거나 아직 올라가지 않았다. 사진 칸을 감추면 될 뿐이다.
    return false;
  }
}

/** 사진 파일을 base64 로. data: 접두어는 뗀다. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('사진을 여는 데 실패했어요.'));
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export interface PhotoResult {
  /** 아이가 칸마다 적은 것, 읽은 그대로 */
  cells: string[][];
  correct: number;
  total: number;
  /** 틀린 칸 번호 */
  wrongIndexes: number[];
  /** 아이가 아직 안 쓴 칸. 사진 탓이 아니다. */
  blankIndexes: number[];
  /** 적혀 있긴 한데 알아보지 못한 칸. 이것만 사진 탓이다. */
  unreadIndexes: number[];
  /** 읽어 온 표의 차례가 어긋나 바로잡았는가 */
  shifted?: boolean;
}

/**
 * 읽어 온 것을 정답과 견준다.
 *
 * 칸을 세 갈래로 나눈다.
 *   **빈칸** — 아이가 아직 안 쓴 칸. 사진 탓이 아니므로 "못 읽었다" 고 하면 안 된다.
 *              스물다섯 칸 중 열세 칸만 풀었으면 열두 칸이 비어 있는 것이 당연하다.
 *   **못 읽은 칸(`?`)** — 적혀 있긴 한데 흐려서 알아보지 못한 칸. 이것만 사진 탓이다.
 *   **틀린 칸** — 읽었는데 답과 다른 칸.
 *
 * 빈칸도 못 읽은 칸도 **틀린 것으로 세지 않는다.** 아이가 틀린 것이 아니기 때문이다.
 */
export function gradeCells(puzzle: DrillPuzzle, cells: string[][]): PhotoResult {
  const wrongIndexes: number[] = [];
  const blankIndexes: number[] = [];
  const unreadIndexes: number[] = [];
  let correct = 0;

  for (let r = 0; r < puzzle.side; r += 1) {
    for (let c = 0; c < puzzle.side; c += 1) {
      const index = r * puzzle.side + c;
      const wrote = (cells[r]?.[c] ?? '').trim();
      const a = answerAt(puzzle, index);

      if (wrote === '') {
        blankIndexes.push(index);
        continue;
      }
      if (wrote === '?') {
        unreadIndexes.push(index);
        continue;
      }

      const ok =
        puzzle.op === '÷'
          ? (() => {
              const [q, rem] = wrote.split(/[,.…·\s]+/);
              return Number(q) === a.quotient && Number(rem) === a.remainder;
            })()
          : Number(wrote) === a.value;

      if (ok) correct += 1;
      else wrongIndexes.push(index);
    }
  }

  return {
    cells,
    correct,
    total: puzzle.cells,
    wrongIndexes,
    blankIndexes,
    unreadIndexes,
  };
}

/**
 * 읽어 온 표를 우리가 낸 표에 맞춰 바로잡는다.
 *
 * AI 가 머리줄을 칸으로 세거나 줄 차례를 바꿔 읽으면, 열세 칸을 다 맞게 썼는데도
 * 두 칸만 맞다고 나온다. 실제로 그런 일이 있었다. 그래서 읽어 온 머리줄을 함께
 * 받아 **우리가 낸 머리줄과 견주고, 차례가 다르면 제자리로 돌려놓는다.**
 *
 * 머리줄에 같은 수가 두 번 나오면 어느 줄인지 가릴 수 없으므로 손대지 않는다.
 */
export function realign(
  puzzle: DrillPuzzle,
  cells: string[][],
  readCols: number[] | null,
  readRows: number[] | null,
): { cells: string[][]; shifted: boolean } {
  const fix = (
    mine: number[],
    read: number[] | null,
  ): { order: number[]; moved: boolean } | null => {
    const keep = { order: mine.map((_, i) => i), moved: false };
    if (!read || read.length !== mine.length) return keep;
    // 같은 수가 두 번 있으면 가릴 수 없다.
    if (new Set(mine).size !== mine.length) return keep;
    // 읽어 온 것이 우리 것과 같은 수들이 아니면 믿을 수 없다.
    if ([...read].sort((a, b) => a - b).join() !== [...mine].sort((a, b) => a - b).join())
      return null;

    const order = mine.map((v) => read.indexOf(v));
    return { order, moved: order.some((v, i) => v !== i) };
  };

  const rowFix = fix(puzzle.rowHeaders, readRows);
  const colFix = fix(puzzle.colHeaders, readCols);
  if (!rowFix || !colFix) {
    // 머리줄부터 다르게 읽었다면 표를 잘못 본 것이다. 바로잡지 않고 그대로 둔다.
    return { cells, shifted: false };
  }

  const moved = rowFix.moved || colFix.moved;
  if (!moved) return { cells, shifted: false };

  const fixed = rowFix.order.map((r) => colFix.order.map((c) => cells[r]?.[c] ?? ''));
  return { cells: fixed, shifted: true };
}

/** 사진을 보내 읽어 오고, 정답과 견주어 돌려준다. */
export async function readAndGrade(
  puzzle: DrillPuzzle,
  file: File,
): Promise<PhotoResult> {
  const imageBase64 = await fileToBase64(file);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      mediaType: file.type,
      op: puzzle.op,
      colHeaders: puzzle.colHeaders,
      rowHeaders: puzzle.rowHeaders,
    }),
  });

  const body = (await res.json()) as {
    cells?: string[][];
    colHeaders?: number[] | null;
    rowHeaders?: number[] | null;
    error?: string;
  };
  // 실패를 조용히 넘기지 않는다 — 부모가 왜 안 됐는지 알아야 다시 찍든 손으로 세든 한다.
  if (!res.ok || !body.cells) throw new Error(body.error ?? '사진을 읽지 못했어요.');

  const { cells, shifted } = realign(
    puzzle,
    body.cells,
    body.colHeaders ?? null,
    body.rowHeaders ?? null,
  );
  return { ...gradeCells(puzzle, cells), shifted };
}

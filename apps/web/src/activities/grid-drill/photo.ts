/**
 * 종이에 푼 연습지를 사진으로 채점하기.
 *
 * 사진에서 **읽는 일**은 넷리파이 뒤편(`netlify/functions/read-sheet.ts`)이 하고,
 * **맞았는지 판단하는 일**은 여기서 한다. 앱은 정답을 이미 알고 있으므로 셈을
 * 남에게 맡길 이유가 없다 — 맡기면 AI 가 계산을 틀릴 때 아이가 맞게 쓴 것을
 * 틀렸다고 하게 된다.
 */

import { answerAt, type DrillPuzzle } from './generate';

const ENDPOINT = '/.netlify/functions/read-sheet';

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
  /** 알아보지 못한 칸 번호. 이건 틀린 것과 다르게 다뤄야 한다. */
  unreadIndexes: number[];
}

/**
 * 읽어 온 것을 정답과 견준다.
 *
 * **알아보지 못한 칸(`?`)은 틀린 것으로 세지 않는다.** 아이가 틀린 것이 아니라
 * 사진이 흐린 것이므로, 그것까지 오답으로 세면 아이가 억울하다. 대신 몇 칸을
 * 못 읽었는지 따로 알려주고 부모가 눈으로 확인하게 한다.
 */
export function gradeCells(puzzle: DrillPuzzle, cells: string[][]): PhotoResult {
  const wrongIndexes: number[] = [];
  const unreadIndexes: number[] = [];
  let correct = 0;

  for (let r = 0; r < puzzle.side; r += 1) {
    for (let c = 0; c < puzzle.side; c += 1) {
      const index = r * puzzle.side + c;
      const wrote = (cells[r]?.[c] ?? '').trim();
      const a = answerAt(puzzle, index);

      if (wrote === '?' || wrote === '') {
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
    unreadIndexes,
  };
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

  const body = (await res.json()) as { cells?: string[][]; error?: string };
  // 실패를 조용히 넘기지 않는다 — 부모가 왜 안 됐는지 알아야 다시 찍든 손으로 세든 한다.
  if (!res.ok || !body.cells) throw new Error(body.error ?? '사진을 읽지 못했어요.');

  return gradeCells(puzzle, body.cells);
}

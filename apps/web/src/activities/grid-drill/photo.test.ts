import { describe, expect, it } from 'vitest';
import { answerAt, makePuzzle } from './generate';
import { gradeCells, realign } from './photo';

/** 표를 정답으로 가득 채운 모양 */
function correctCells(p: ReturnType<typeof makePuzzle>): string[][] {
  return Array.from({ length: p.side }, (_, r) =>
    Array.from({ length: p.side }, (_, c) => {
      const a = answerAt(p, r * p.side + c);
      return p.op === '÷' ? `${a.quotient},${a.remainder}` : String(a.value);
    }),
  );
}

describe('gradeCells', () => {
  it('다 맞게 적혔으면 다 맞다고 한다', () => {
    const p = makePuzzle('+', 25, 1);
    const g = gradeCells(p, correctCells(p));
    expect(g.correct).toBe(25);
    expect(g.wrongIndexes).toEqual([]);
    expect(g.unreadIndexes).toEqual([]);
  });

  it('틀린 칸을 짚어낸다', () => {
    const p = makePuzzle('+', 25, 1);
    const cells = correctCells(p);
    cells[0]![0] = String(Number(cells[0]![0]) + 1);
    cells[2]![3] = '99';
    const g = gradeCells(p, cells);
    expect(g.correct).toBe(23);
    expect(g.wrongIndexes).toEqual([0, 13]);
  });

  it('아직 안 쓴 칸은 "못 읽었다" 고 하지 않는다', () => {
    // 스물다섯 칸 중 열세 칸만 풀었으면 열두 칸이 비어 있는 것이 당연하다.
    // 그것을 사진 탓으로 돌리면 부모가 사진을 다시 찍게 된다.
    const p = makePuzzle('+', 25, 1);
    const cells = correctCells(p);
    for (let i = 13; i < 25; i += 1) cells[Math.floor(i / 5)]![i % 5] = '';
    const g = gradeCells(p, cells);
    expect(g.correct).toBe(13);
    expect(g.blankIndexes).toHaveLength(12);
    expect(g.unreadIndexes).toEqual([]);
    expect(g.wrongIndexes).toEqual([]);
  });

  it('흐려서 못 읽은 칸만 사진 탓으로 센다', () => {
    const p = makePuzzle('+', 25, 1);
    const cells = correctCells(p);
    cells[0]![0] = '?';
    cells[1]![1] = '';
    const g = gradeCells(p, cells);
    expect(g.correct).toBe(23);
    expect(g.wrongIndexes).toEqual([]);
    expect(g.unreadIndexes).toEqual([0]);
    expect(g.blankIndexes).toEqual([6]);
  });

  it('나눗셈은 몫과 나머지가 둘 다 맞아야 한다', () => {
    const p = makePuzzle('÷', 25, 1);
    const cells = correctCells(p);
    const g1 = gradeCells(p, cells);
    expect(g1.correct).toBe(25);

    const a = answerAt(p, 0);
    cells[0]![0] = `${a.quotient},${(a.remainder ?? 0) + 1}`;
    expect(gradeCells(p, cells).wrongIndexes).toEqual([0]);
  });

  it('나눗셈은 여러 가지 구분 기호를 받아들인다', () => {
    // 사진에서 읽어 온 글자가 "3…2" 일 수도 "3, 2" 일 수도 있다.
    const p = makePuzzle('÷', 25, 1);
    const a = answerAt(p, 0);
    for (const sep of [',', '…', '.', ' ', ' , ']) {
      const cells = correctCells(p);
      cells[0]![0] = `${a.quotient}${sep}${a.remainder}`;
      expect(gradeCells(p, cells).wrongIndexes).not.toContain(0);
    }
  });

  it('줄이 모자란 사진에도 터지지 않는다', () => {
    const p = makePuzzle('+', 25, 1);
    const g = gradeCells(p, [[]]);
    expect(g.total).toBe(25);
    expect(g.blankIndexes).toHaveLength(25);
    expect(g.correct).toBe(0);
  });

  it('앞뒤 빈칸은 무시한다', () => {
    const p = makePuzzle('+', 25, 1);
    const cells = correctCells(p);
    cells[0]![0] = `  ${cells[0]![0]}  `;
    expect(gradeCells(p, cells).correct).toBe(25);
  });
});

describe('realign', () => {
  it('차례가 같으면 손대지 않는다', () => {
    const p = makePuzzle('+', 25, 1);
    const cells = correctCells(p);
    const r = realign(p, cells, p.colHeaders, p.rowHeaders);
    expect(r.shifted).toBe(false);
    expect(r.cells).toBe(cells);
  });

  it('줄 차례가 뒤바뀌어 읽혔으면 제자리로 돌린다', () => {
    // 열세 칸을 다 맞게 썼는데 두 칸만 맞다고 나온 일이 실제로 있었다.
    const p = makePuzzle('+', 25, 1);
    const right = correctCells(p);
    const readRows = [...p.rowHeaders].reverse();
    const asRead = [...right].reverse();
    const r = realign(p, asRead, p.colHeaders, readRows);
    expect(r.shifted).toBe(true);
    expect(gradeCells(p, r.cells).correct).toBe(25);
  });

  it('칸 차례가 뒤바뀌어도 제자리로 돌린다', () => {
    const p = makePuzzle('+', 25, 1);
    const right = correctCells(p);
    const readCols = [...p.colHeaders].reverse();
    const asRead = right.map((row) => [...row].reverse());
    const r = realign(p, asRead, readCols, p.rowHeaders);
    expect(r.shifted).toBe(true);
    expect(gradeCells(p, r.cells).correct).toBe(25);
  });

  it('머리줄을 못 읽어 왔으면 손대지 않는다', () => {
    const p = makePuzzle('+', 25, 1);
    const cells = correctCells(p);
    expect(realign(p, cells, null, null).shifted).toBe(false);
  });

  it('머리줄이 우리 것과 아예 다르면 바로잡지 않는다', () => {
    // 표를 잘못 본 것이므로 억지로 맞추면 더 나빠진다.
    const p = makePuzzle('+', 25, 1);
    const cells = correctCells(p);
    const r = realign(p, cells, [1, 2, 3, 4, 5].map((n) => n + 100), p.rowHeaders);
    expect(r.shifted).toBe(false);
    expect(r.cells).toBe(cells);
  });

  it('머리줄에 같은 수가 두 번 있으면 손대지 않는다', () => {
    // 어느 줄인지 가릴 수 없다.
    const p = { ...makePuzzle('+', 25, 1), rowHeaders: [3, 3, 1, 2, 4] };
    const cells = correctCells(p);
    expect(realign(p, cells, p.colHeaders, [1, 2, 3, 3, 4]).shifted).toBe(false);
  });
});

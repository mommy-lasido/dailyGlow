import { describe, expect, it } from 'vitest';
import { answerAt, makePuzzle } from './generate';
import { gradeCells } from './photo';

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

  it('알아보지 못한 칸은 틀린 것으로 세지 않는다', () => {
    // 아이가 틀린 것이 아니라 사진이 흐린 것이다. 오답으로 세면 억울하다.
    const p = makePuzzle('+', 25, 1);
    const cells = correctCells(p);
    cells[0]![0] = '?';
    cells[1]![1] = '';
    const g = gradeCells(p, cells);
    expect(g.correct).toBe(23);
    expect(g.wrongIndexes).toEqual([]);
    expect(g.unreadIndexes).toEqual([0, 6]);
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
    expect(g.unreadIndexes).toHaveLength(25);
    expect(g.correct).toBe(0);
  });

  it('앞뒤 빈칸은 무시한다', () => {
    const p = makePuzzle('+', 25, 1);
    const cells = correctCells(p);
    cells[0]![0] = `  ${cells[0]![0]}  `;
    expect(gradeCells(p, cells).correct).toBe(25);
  });
});

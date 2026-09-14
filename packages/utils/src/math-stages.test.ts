import { describe, expect, it } from 'vitest';
import {
  MATH_BOOKS,
  MATH_MAX_STAGE,
  MATH_STAGES,
  mathBook,
  mathStage,
} from './math-stages';

describe('MATH_STAGES', () => {
  it('40단계를 빠짐없이 담는다', () => {
    expect(MATH_STAGES).toHaveLength(40);
    expect(MATH_MAX_STAGE).toBe(40);
    expect(MATH_STAGES.map((s) => s.stage)).toEqual(
      Array.from({ length: 40 }, (_, i) => i + 1),
    );
  });

  it('권마다 여덟 단계씩이다', () => {
    for (const book of MATH_BOOKS) {
      const inBook = MATH_STAGES.filter((s) => s.book === book.book);
      expect(inBook, `${book.book}권`).toHaveLength(8);
      expect(inBook[0]!.stage).toBe(book.from);
      expect(inBook.at(-1)!.stage).toBe(book.to);
    }
  });

  it('단계 이름이 비어 있지 않다', () => {
    for (const s of MATH_STAGES) expect(s.label.length).toBeGreaterThan(0);
  });

  it('책의 차례를 그대로 따른다', () => {
    // 내가 순서를 지어내지 않는다. 몇 곳을 짚어 두어 잘못 고치면 걸리게 한다.
    expect(mathStage(1)!.label).toBe('10까지의 수');
    expect(mathStage(9)!.label).toBe('2~9 모으기 가르기 ①');
    expect(mathStage(17)!.label).toBe('10 모으기와 가르기');
    expect(mathStage(25)!.label).toBe('10보다 큰 덧셈 ①');
    expect(mathStage(40)!.label).toBe('몇십몇의 뺄셈 ②');
  });

  it('모으기·가르기가 덧셈보다 먼저 온다', () => {
    // 교재의 뼈대다. 가르고 모으는 것을 몸에 익힌 뒤라야 덧셈이 셈이 된다.
    const gather = MATH_STAGES.find((s) => s.label.includes('모으기'))!;
    const add = MATH_STAGES.find((s) => s.label.includes('9까지의 덧셈'))!;
    expect(gather.stage).toBeLessThan(add.stage);
  });
});

describe('mathStage · mathBook', () => {
  it('없는 단계는 null', () => {
    expect(mathStage(0)).toBeNull();
    expect(mathStage(41)).toBeNull();
    expect(mathBook(99)).toBeNull();
  });

  it('단계가 실린 권을 찾아준다', () => {
    expect(mathBook(1)!.book).toBe(1);
    expect(mathBook(16)!.book).toBe(2);
    expect(mathBook(33)!.book).toBe(5);
  });
});

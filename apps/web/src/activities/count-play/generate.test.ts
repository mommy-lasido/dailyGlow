import { describe, expect, it } from 'vitest';
import {
  COUNT_SETTINGS,
  countHint,
  KOREAN_COUNT,
  makeCountProblem,
  type CountRange,
} from './generate';

/** 0, 0.5, 0.99 를 돌려가며 주는 가짜 난수 — 난수를 주입해 결과를 확인한다. */
function cyclingRand(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

const RANGES: CountRange[] = [3, 5, 10];

describe('makeCountProblem', () => {
  it.each(RANGES)('range %i 에서 정답은 1 이상 range 이하다', (range) => {
    for (let i = 0; i < 200; i += 1) {
      const p = makeCountProblem(range);
      expect(p.answer).toBeGreaterThanOrEqual(1);
      expect(p.answer).toBeLessThanOrEqual(range);
    }
  });

  it.each(RANGES)('range %i 에서 보기는 항상 서로 다른 3개다', (range) => {
    for (let i = 0; i < 200; i += 1) {
      const p = makeCountProblem(range);
      expect(p.choices).toHaveLength(3);
      expect(new Set(p.choices).size).toBe(3);
    }
  });

  it.each(RANGES)('range %i 에서 보기에 정답이 반드시 들어 있다', (range) => {
    for (let i = 0; i < 200; i += 1) {
      const p = makeCountProblem(range);
      expect(p.choices).toContain(p.answer);
    }
  });

  it.each(RANGES)('range %i 에서 보기는 1..range 를 벗어나지 않는다', (range) => {
    for (let i = 0; i < 200; i += 1) {
      const p = makeCountProblem(range);
      for (const c of p.choices) {
        expect(c).toBeGreaterThanOrEqual(1);
        expect(c).toBeLessThanOrEqual(range);
      }
    }
  });

  it('오답은 정답에서 2 이내로만 떨어져 있다', () => {
    // 너무 먼 수를 보기로 주면 세지 않고도 답이 보인다.
    for (let i = 0; i < 200; i += 1) {
      const p = makeCountProblem(10);
      for (const c of p.choices) {
        expect(Math.abs(c - p.answer)).toBeLessThanOrEqual(2);
      }
    }
  });

  it('가장 좁은 range 3 에서도 보기 3개를 채운다', () => {
    // 정답이 1, 2, 3 어느 쪽으로 나와도 후보가 부족하면 안 된다.
    for (const r of [0, 0.5, 0.99]) {
      const p = makeCountProblem(3, cyclingRand([r]));
      expect(new Set(p.choices).size).toBe(3);
      expect(p.choices).toContain(p.answer);
    }
  });

  it('설정에 맞는 그림을 쓴다', () => {
    expect(makeCountProblem(3).icon).toBe('🍎');
    expect(makeCountProblem(5).icon).toBe('🐟');
    expect(makeCountProblem(10).icon).toBe('🌸');
  });

  it('난수를 주입하면 결과가 정해진다', () => {
    const a = makeCountProblem(10, cyclingRand([0.35, 0.1, 0.8, 0.2, 0.6]));
    const b = makeCountProblem(10, cyclingRand([0.35, 0.1, 0.8, 0.2, 0.6]));
    expect(a).toEqual(b);
  });
});

describe('COUNT_SETTINGS', () => {
  it('쉬운 것부터 어려운 순서로 놓여 있다', () => {
    expect(COUNT_SETTINGS.map((s) => s.range)).toEqual([3, 5, 10]);
  });
});

describe('KOREAN_COUNT', () => {
  it('열까지의 우리말 수사를 순서대로 담는다', () => {
    expect(KOREAN_COUNT).toHaveLength(10);
    expect(KOREAN_COUNT[0]).toBe('하나');
    expect(KOREAN_COUNT[9]).toBe('열');
  });
});

describe('countHint', () => {
  it('세는 방법만 알려주고 답은 말하지 않는다', () => {
    // 세는 것 자체가 배울 내용이라 답을 알려주면 배울 것이 남지 않는다.
    expect(countHint()).toContain('짚어가며');
    expect(countHint()).not.toMatch(/모두|전부|개예요/);
  });
});

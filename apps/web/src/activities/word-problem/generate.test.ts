import { describe, expect, it } from 'vitest';
import { askChoices, makeProblem, makeSet, PROBLEM_COUNT } from './generate';

/** 늘 같은 차례를 내주는 난수 — 같은 문제를 두고 따져볼 수 있게. */
function seeded(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

describe('문장제 만들기', () => {
  it('답이 늘 0보다 큰 정수다', () => {
    // 음수나 소수가 나오면 초등 3학년이 풀 수 없는 문제가 된다.
    for (let i = 0; i < 300; i += 1) {
      const p = makeProblem(seeded(i + 1));
      expect(Number.isInteger(p.answer)).toBe(true);
      expect(p.answer).toBeGreaterThan(0);
    }
  });

  it('묻는 것과 그럴듯한 오답이 함께 있다', () => {
    // 오답은 대개 중간에 구하는 값이다. 이것이 이 활동의 핵심이다.
    for (let i = 0; i < 100; i += 1) {
      const p = makeProblem(seeded(i + 7));
      expect(p.asks).not.toBe('');
      expect(p.decoys.length).toBeGreaterThanOrEqual(2);
      expect(p.decoys).not.toContain(p.asks);
    }
  });

  it('문제에 짚어 주는 말이 두 가지 다 있다', () => {
    // 묻는 것을 잘못 읽은 것과 셈이 틀린 것은 다른 일이라 짚는 말도 달라야 한다.
    for (let i = 0; i < 100; i += 1) {
      const p = makeProblem(seeded(i + 13));
      expect(p.askHint.length).toBeGreaterThan(5);
      expect(p.answerHint.length).toBeGreaterThan(5);
      expect(p.askHint).not.toBe(p.answerHint);
    }
  });

  it('문제 안에 답이 그대로 적혀 있지 않다', () => {
    // 답이 문장에 보이면 읽지 않고 그 숫자를 베껴 쓴다.
    const shown = (p: { text: string; answer: number }) =>
      new RegExp(`(^|[^0-9])${p.answer}([^0-9]|$)`).test(p.text);
    let leaked = 0;
    for (let i = 0; i < 300; i += 1) {
      if (shown(makeProblem(seeded(i + 1)))) leaked += 1;
    }
    expect(leaked).toBe(0);
  });

  it('한 판에서 함정의 종류가 겹치지 않는다', () => {
    // 같은 함정이 잇따르면 문장을 읽지 않고 앞 문제의 수법을 그대로 쓴다.
    for (let i = 0; i < 50; i += 1) {
      const set = makeSet(PROBLEM_COUNT, seeded(i + 3));
      expect(new Set(set.map((p) => p.kind)).size).toBe(set.length);
    }
  });

  it('보기에는 답이 하나만 들어 있다', () => {
    const p = makeProblem(seeded(5));
    const choices = askChoices(p, seeded(9));
    expect(choices).toContain(p.asks);
    expect(choices.filter((c) => c === p.asks)).toHaveLength(1);
    expect(choices).toHaveLength(p.decoys.length + 1);
  });
});

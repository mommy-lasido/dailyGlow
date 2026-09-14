import { describe, expect, it } from 'vitest';
import {
  BOND_MAX,
  BOND_MIN,
  bondHint,
  bondQuestion,
  makeBondProblem,
  makeBondSet,
} from './bonds';

describe('makeBondProblem', () => {
  it('두 몫을 모으면 전체가 된다', () => {
    for (let i = 0; i < 300; i += 1) {
      const p = makeBondProblem('gather');
      expect(p.left + p.right).toBe(p.total);
    }
  });

  it('두 몫은 모두 1 이상이다', () => {
    // 0 을 쓰면 "5는 5와 0" 이 되어 가르는 뜻이 없어진다.
    for (let i = 0; i < 300; i += 1) {
      const p = makeBondProblem('split');
      expect(p.left).toBeGreaterThanOrEqual(1);
      expect(p.right).toBeGreaterThanOrEqual(1);
    }
  });

  it('책이 정한 2~9 안에서만 낸다', () => {
    for (let i = 0; i < 300; i += 1) {
      const p = makeBondProblem('gather');
      expect(p.total).toBeGreaterThanOrEqual(BOND_MIN);
      expect(p.total).toBeLessThanOrEqual(BOND_MAX);
    }
  });

  it('모으기는 위를 묻고, 가르기는 아래 하나를 묻는다', () => {
    for (let i = 0; i < 100; i += 1) {
      expect(makeBondProblem('gather').missing).toBe('total');
      expect(['left', 'right']).toContain(makeBondProblem('split').missing);
    }
  });

  it('보기는 서로 다른 3개이고 정답이 들어 있다', () => {
    for (const kind of ['gather', 'split'] as const) {
      for (let i = 0; i < 200; i += 1) {
        const p = makeBondProblem(kind);
        expect(new Set(p.choices).size).toBe(3);
        expect(p.choices).toContain(p.answer);
      }
    }
  });

  it('오답은 바로 옆 수로 낸다', () => {
    // 멀리 있는 수를 붙이면 세어 보지 않고도 답이 보인다.
    for (let i = 0; i < 200; i += 1) {
      const p = makeBondProblem('split');
      for (const c of p.choices) {
        expect(Math.abs(c - p.answer)).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe('makeBondSet', () => {
  it('같은 문제가 잇달아 나오지 않는다', () => {
    for (let i = 0; i < 100; i += 1) {
      const set = makeBondSet('gather', 5);
      for (let j = 1; j < set.length; j += 1) {
        const before = set[j - 1]!;
        const now = set[j]!;
        expect(`${before.total}-${before.left}`).not.toBe(`${now.total}-${now.left}`);
      }
    }
  });

  it('낸 만큼 돌려준다', () => {
    expect(makeBondSet('split', 5)).toHaveLength(5);
  });
});

describe('bondQuestion · bondHint', () => {
  it('무엇을 묻는지 갈라 말한다', () => {
    expect(bondQuestion('gather')).toContain('모으면');
    expect(bondQuestion('split')).toContain('갈라질까');
  });

  it('힌트는 세는 방법만 알려주고 답은 말하지 않는다', () => {
    const p = makeBondProblem('gather');
    expect(bondHint(p)).not.toContain(String(p.answer));
    expect(bondHint(p)).toContain('세어봐요');
  });
});

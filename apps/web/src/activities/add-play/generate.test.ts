import { describe, expect, it } from 'vitest';
import {
  ADD_SETTINGS,
  addHint,
  makeAddProblem,
  makeAddSet,
  type AddSetting,
} from './generate';

/** 정해둔 값을 차례로 돌려주는 가짜 난수. 결과가 결정적이 된다. */
function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

describe('makeAddProblem', () => {
  it('더하는 수는 고른 설정 그대로다', () => {
    for (const setting of [1, 2, 3] as AddSetting[]) {
      expect(makeAddProblem(setting, seq([0])).b).toBe(setting);
    }
  });

  it('섞어서(0)를 고르면 1~3 중 하나가 나온다', () => {
    for (let i = 0; i < 20; i += 1) {
      expect([1, 2, 3]).toContain(makeAddProblem(0).b);
    }
  });

  it('앞의 수는 1~5 사이다', () => {
    for (let i = 0; i < 50; i += 1) {
      const p = makeAddProblem(0);
      expect(p.a).toBeGreaterThanOrEqual(1);
      expect(p.a).toBeLessThanOrEqual(5);
    }
  });

  it('정답은 두 수의 합이다', () => {
    for (let i = 0; i < 50; i += 1) {
      const p = makeAddProblem(0);
      expect(p.answer).toBe(p.a + p.b);
    }
  });

  it('보기는 항상 서로 다른 3개이고 정답을 포함한다', () => {
    for (let i = 0; i < 100; i += 1) {
      const p = makeAddProblem(0);
      expect(p.choices).toHaveLength(3);
      expect(new Set(p.choices).size).toBe(3);
      expect(p.choices).toContain(p.answer);
    }
  });

  it('보기는 모두 1~10 사이다', () => {
    for (let i = 0; i < 100; i += 1) {
      for (const c of makeAddProblem(0).choices) {
        expect(c).toBeGreaterThanOrEqual(1);
        expect(c).toBeLessThanOrEqual(10);
      }
    }
  });

  it('같은 난수를 주면 같은 문제가 나온다', () => {
    const a = makeAddProblem(2, seq([0.1, 0.4, 0.7, 0.2, 0.9]));
    const b = makeAddProblem(2, seq([0.1, 0.4, 0.7, 0.2, 0.9]));
    expect(a).toEqual(b);
  });

  it('그림은 고른 설정에 딸린 것을 쓴다', () => {
    expect(makeAddProblem(1, seq([0])).icon).toBe('⭐');
    expect(makeAddProblem(2, seq([0])).icon).toBe('🍎');
    expect(makeAddProblem(3, seq([0])).icon).toBe('🎈');
    expect(makeAddProblem(0, seq([0])).icon).toBe('🧸');
  });
});

describe('addHint', () => {
  it('앞의 수에서 이어서 세는 법을 알려준다', () => {
    expect(addHint({ a: 3, b: 2, answer: 5, icon: '🍎', choices: [] })).toBe(
      '3에서 시작해서 4, 5 — 이렇게 2만큼 더 세어봐요.',
    );
  });

  it('1을 더할 때는 다음 수 하나만 말한다', () => {
    expect(addHint({ a: 4, b: 1, answer: 5, icon: '⭐', choices: [] })).toBe(
      '4에서 시작해서 5 — 이렇게 1만큼 더 세어봐요.',
    );
  });

  it('3을 더할 때는 세 수를 이어서 말한다', () => {
    expect(addHint({ a: 2, b: 3, answer: 5, icon: '🎈', choices: [] })).toBe(
      '2에서 시작해서 3, 4, 5 — 이렇게 3만큼 더 세어봐요.',
    );
  });
});

describe('ADD_SETTINGS', () => {
  it('네 가지를 한국어 이름과 함께 내놓는다', () => {
    expect(ADD_SETTINGS).toHaveLength(4);
    expect(ADD_SETTINGS.map((s) => s.setting)).toEqual([1, 2, 3, 0]);
    expect(ADD_SETTINGS[0]!.name).toBe('하나 더하기');
    expect(ADD_SETTINGS[3]!.name).toBe('섞어서 하기');
  });
});

describe('makeAddSet', () => {
  it('같은 문제가 잇달아 나오지 않는다', () => {
    // 다섯 살에게 방금 푼 문제를 곧바로 또 내면, 두 번째는 세어 보지 않고
    // 조금 전 손이 갔던 자리를 누른다. 문제 하나가 통째로 사라진다.
    for (const setting of [1, 2, 3, 0] as const) {
      for (let i = 0; i < 200; i += 1) {
        const set = makeAddSet(setting);
        for (let j = 1; j < set.length; j += 1) {
          const before = set[j - 1]!;
          const now = set[j]!;
          expect(`${before.a}+${before.b}`).not.toBe(`${now.a}+${now.b}`);
        }
      }
    }
  });

  it('열 문제를 낸다', () => {
    expect(makeAddSet(1)).toHaveLength(10);
  });

  it('떨어져서 겹치는 것은 막지 않는다', () => {
    // '하나 더하기' 는 낼 수 있는 문제가 다섯뿐이라 열 문제면 반드시 겹친다.
    const set = makeAddSet(1);
    expect(new Set(set.map((p) => `${p.a}+${p.b}`)).size).toBeLessThan(set.length);
  });
});

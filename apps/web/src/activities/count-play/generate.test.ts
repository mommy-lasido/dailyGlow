import { describe, expect, it } from 'vitest';
import {
  countAloud,
  COUNT_OBJECTS,
  COUNT_SETTINGS,
  countHint,
  countQuestion,
  KOREAN_COUNT,
  makeCountProblem,
  stepOf,
  subjectParticle,
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

  it('세는 대상은 목록 안에서 나온다', () => {
    for (let i = 0; i < 100; i += 1) {
      expect(COUNT_OBJECTS).toContain(makeCountProblem(5).object);
    }
  });

  it('난수를 주입하면 결과가 정해진다', () => {
    const a = makeCountProblem(10, cyclingRand([0.35, 0.1, 0.8, 0.2, 0.6]));
    const b = makeCountProblem(10, cyclingRand([0.35, 0.1, 0.8, 0.2, 0.6]));
    expect(a).toEqual(b);
  });
});

describe('COUNT_OBJECTS', () => {
  it('네 살이 아는 세는 말만 쓴다 — 개와 마리', () => {
    // 송이·권·대·잔 같은 말은 이 나이에 배울 것이 아니다. 세는 것 자체가 어려운데
    // 말까지 낯설면 못 푸는 이유가 둘로 늘어난다.
    const units = new Set(COUNT_OBJECTS.map((o) => o.unit));
    expect([...units].sort()).toEqual(['개', '마리']);
  });

  it('개와 마리를 둘 다 넉넉히 담는다', () => {
    expect(COUNT_OBJECTS.filter((o) => o.unit === '개').length).toBeGreaterThanOrEqual(2);
    expect(COUNT_OBJECTS.filter((o) => o.unit === '마리').length).toBeGreaterThanOrEqual(2);
  });
});

describe('subjectParticle', () => {
  it('받침이 없으면 "가"', () => {
    expect(subjectParticle('사과')).toBe('가');
    expect(subjectParticle('물고기')).toBe('가');
    expect(subjectParticle('강아지')).toBe('가');
  });

  it('받침이 있으면 "이"', () => {
    expect(subjectParticle('공')).toBe('이');
    expect(subjectParticle('꽃')).toBe('이');
  });
});

describe('countQuestion', () => {
  it('무엇을 무슨 말로 세는지 함께 묻는다', () => {
    expect(countQuestion({ icon: '🍎', name: '사과', unit: '개' })).toBe('사과가 몇 개일까?');
    expect(countQuestion({ icon: '🐟', name: '물고기', unit: '마리' })).toBe(
      '물고기가 몇 마리일까?',
    );
    expect(countQuestion({ icon: '⚽', name: '공', unit: '개' })).toBe('공이 몇 개일까?');
  });
});

describe('COUNT_SETTINGS', () => {
  it('쉬운 것부터 어려운 순서로 놓여 있다', () => {
    expect(COUNT_SETTINGS.map((s) => s.range)).toEqual([
      3, 5, 10, 10, 10, 10, 10, 20, 50, 100, 100, 100,
    ]);
  });

  it('열까지는 그림을 세고, 스물부터는 읽는다', () => {
    // 사과 여든일곱 개를 화면에 그릴 수는 없다. 스물을 넘어가면 하는 일이 달라진다.
    for (const s of COUNT_SETTINGS) {
      if (s.group === 'count') expect(s.mode).toBe('count');
      else expect(['order', 'line', 'gather', 'split', 'read', 'skip5', 'skip']).toContain(s.mode);
    }
    expect(COUNT_SETTINGS.filter((s) => s.mode === 'count')).toHaveLength(3);
    expect(COUNT_SETTINGS.filter((s) => s.mode === 'read')).toHaveLength(3);
    // 『기적의 계산법 예비초등』 2·3단계 — 세는 것 다음에 오는 자리.
    expect(COUNT_SETTINGS.filter((s) => s.group === 'order')).toHaveLength(2);
    // 9·10단계 — 덧셈보다 먼저 오는 자리.
    expect(COUNT_SETTINGS.filter((s) => s.group === 'bond')).toHaveLength(2);
  });

  it('뛰어 세기는 다섯씩과 열씩 둘 다 있다', () => {
    const steps = COUNT_SETTINGS.map((s) => stepOf(s.mode)).filter((n) => n > 1);
    expect(steps.sort((a, b) => a - b)).toEqual([5, 10]);
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
    const hint = countHint({ icon: '🍎', name: '사과', unit: '개' });
    expect(hint).toContain('짚어가며');
    expect(hint).not.toMatch(/모두|전부/);
    expect(hint).not.toMatch(/\d/);
  });

  it('그 물건을 세는 말로 세어준다', () => {
    expect(countHint({ icon: '🐟', name: '물고기', unit: '마리' })).toContain('한 마리, 두 마리');
    expect(countHint({ icon: '🍎', name: '사과', unit: '개' })).toContain('한 개, 두 개');
  });
});

describe('countAloud', () => {
  it('단위 앞에서는 "한 개, 두 개, 세 개" 로 읽는다', () => {
    // "하나 개" 는 아이가 집에서 듣는 말이 아니다.
    expect(countAloud(1, '개')).toBe('한 개');
    expect(countAloud(2, '개')).toBe('두 개');
    expect(countAloud(3, '개')).toBe('세 개');
    expect(countAloud(4, '마리')).toBe('네 마리');
  });

  it('다섯부터는 수사 그대로다', () => {
    expect(countAloud(5, '마리')).toBe('다섯 마리');
    expect(countAloud(10, '개')).toBe('열 개');
  });
});

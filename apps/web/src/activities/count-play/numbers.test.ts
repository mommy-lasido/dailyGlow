import { describe, expect, it } from 'vitest';
import {
  makeLineSet,
  makeNumberSet,
  makeOrderSet,
  numberQuestion,
  pickNumberDistractors,
  readNumber,
} from './numbers';

describe('readNumber', () => {
  it('한자어로 읽는다 — 숫자를 보고 읽을 때 쓰는 말이다', () => {
    expect(readNumber(1)).toBe('일');
    expect(readNumber(10)).toBe('십');
    expect(readNumber(11)).toBe('십일');
    expect(readNumber(13)).toBe('십삼');
    expect(readNumber(20)).toBe('이십');
    expect(readNumber(31)).toBe('삼십일');
    expect(readNumber(87)).toBe('팔십칠');
    expect(readNumber(99)).toBe('구십구');
    expect(readNumber(100)).toBe('백');
  });
});

describe('pickNumberDistractors', () => {
  it('헷갈리는 수를 붙인다 — 자리를 바꾼 수와 이웃한 수', () => {
    // '삼십일' 과 '십삼' 을 가르는 것이 두 자리 수 읽기의 고비다.
    const wrong = pickNumberDistractors(31, 100);
    expect(wrong).toHaveLength(2);
    for (const w of wrong) {
      expect([13, 41, 21, 32, 30]).toContain(w);
    }
  });

  it('정답을 오답으로 내지 않고, 범위를 벗어나지 않는다', () => {
    for (const max of [20, 50, 100]) {
      for (let n = 1; n <= max; n += 1) {
        const wrong = pickNumberDistractors(n, max);
        expect(wrong).toHaveLength(2);
        expect(wrong).not.toContain(n);
        expect(new Set(wrong).size).toBe(2);
        for (const w of wrong) {
          expect(w).toBeGreaterThanOrEqual(1);
          expect(w).toBeLessThanOrEqual(max);
        }
      }
    }
  });
});

describe('makeNumberSet', () => {
  it('한 판 안에서 같은 수가 두 번 나오지 않는다', () => {
    for (let i = 0; i < 50; i += 1) {
      const set = makeNumberSet(100, 5);
      const answers = set.map((p) => p.answer);
      expect(new Set(answers).size).toBe(answers.length);
    }
  });

  it('듣고 찾기와 빠진 수 채우기를 섞어 낸다', () => {
    const set = makeNumberSet(100, 5);
    expect(set.some((p) => p.sequence === null)).toBe(true);
    expect(set.some((p) => p.sequence !== null)).toBe(true);
  });

  it('보기는 서로 다른 3개이고 정답이 들어 있다', () => {
    for (const p of makeNumberSet(50, 5)) {
      expect(new Set(p.choices).size).toBe(3);
      expect(p.choices).toContain(p.answer);
    }
  });

  it('빠진 수 자리는 한 곳뿐이고 나머지는 순서대로다', () => {
    for (const p of makeNumberSet(100, 5)) {
      if (!p.sequence) continue;
      expect(p.sequence.filter((n) => n === null)).toHaveLength(1);
      const shown = p.sequence.map((n) => n ?? p.answer);
      for (let i = 1; i < shown.length; i += 1) {
        expect(shown[i]! - shown[i - 1]!).toBe(1);
      }
    }
  });

  it('열씩 뛰어 세기는 10 20 30 … 만 쓴다', () => {
    for (const p of makeNumberSet(100, 5, 10)) {
      expect(p.answer % 10).toBe(0);
      expect(p.sequence).not.toBeNull();
      const shown = p.sequence!.map((n) => n ?? p.answer);
      for (let i = 1; i < shown.length; i += 1) {
        expect(shown[i]! - shown[i - 1]!).toBe(10);
      }
    }
  });

  it('범위를 넘는 수는 내지 않는다', () => {
    for (const p of makeNumberSet(20, 5)) {
      expect(p.answer).toBeLessThanOrEqual(20);
      for (const c of p.choices) expect(c).toBeLessThanOrEqual(20);
    }
  });
});

describe('numberQuestion', () => {
  it('무엇을 묻는지 문제마다 다르게 말한다', () => {
    expect(numberQuestion({ answer: 3, choices: [3], sequence: null })).toBe('어떤 수일까?');
    expect(numberQuestion({ answer: 3, choices: [3], sequence: [2, null, 4] })).toBe(
      '빠진 수는 무엇일까?',
    );
  });
});

describe('makeOrderSet — 수의 순서', () => {
  it('빠진 수 채우기만 낸다', () => {
    // 이 단계는 순서 하나만 붙잡는 자리다. 듣고 찾기를 섞지 않는다.
    for (const p of makeOrderSet(10, 5)) {
      expect(p.sequence).not.toBeNull();
      expect(p.sequence!.filter((n) => n === null)).toHaveLength(1);
    }
  });

  it('열까지의 수 안에서만 낸다', () => {
    for (const p of makeOrderSet(10, 5)) {
      expect(p.answer).toBeGreaterThanOrEqual(1);
      expect(p.answer).toBeLessThanOrEqual(10);
      for (const c of p.choices) expect(c).toBeLessThanOrEqual(10);
    }
  });

  it('한 판 안에서 같은 수가 두 번 나오지 않는다', () => {
    for (let i = 0; i < 50; i += 1) {
      const answers = makeOrderSet(10, 5).map((p) => p.answer);
      expect(new Set(answers).size).toBe(answers.length);
    }
  });
});

describe('makeLineSet — 수직선', () => {
  it('줄의 끝 수를 함께 준다', () => {
    for (const p of makeLineSet(10, 5)) {
      expect(p.lineMax).toBe(10);
      expect(p.sequence).toBeNull();
    }
  });

  it('오답은 바로 옆 수로 낸다', () => {
    // 멀리 있는 수를 붙이면 화살표를 안 보고도 답이 보인다.
    for (let i = 0; i < 100; i += 1) {
      for (const p of makeLineSet(10, 5)) {
        for (const c of p.choices) {
          expect(Math.abs(c - p.answer)).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it('보기는 서로 다른 3개이고 정답이 들어 있다', () => {
    for (const p of makeLineSet(10, 5)) {
      expect(new Set(p.choices).size).toBe(3);
      expect(p.choices).toContain(p.answer);
    }
  });
});

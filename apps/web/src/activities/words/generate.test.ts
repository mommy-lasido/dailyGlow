import { describe, expect, it } from 'vitest';
import { minStageFor } from '@dailyglow/utils';
import { WORD_ITEMS } from './content';
import { makeWordSet, MIN_POOL, poolForStage, wordQuestion } from './generate';

describe('자료', () => {
  it('모든 낱말이 책의 자모만으로 이루어져 있다', () => {
    // 겹받침이나 쌍받침이 들어가면 계산이 null 을 돌려준다 — 그런 낱말은 쓸 수 없다.
    for (const w of WORD_ITEMS) {
      expect(minStageFor(w.word)).not.toBeNull();
    }
  });

  it('모든 낱말에 그림이 있다', () => {
    // 그림을 보고 글자를 고르는 활동이라 그림 없는 낱말은 쓸 수 없다.
    for (const w of WORD_ITEMS) {
      expect(w.emoji.length).toBeGreaterThan(0);
    }
  });

  it('같은 낱말이 두 번 들어가지 않는다', () => {
    expect(new Set(WORD_ITEMS.map((w) => w.word)).size).toBe(WORD_ITEMS.length);
  });

  it('1단계부터 33단계까지 빠짐없이 낱말이 있다', () => {
    const stages = new Set(WORD_ITEMS.map((w) => minStageFor(w.word)));
    for (let s = 1; s <= 33; s += 1) {
      expect(stages.has(s)).toBe(true);
    }
  });
});

describe('poolForStage', () => {
  it('배운 데까지의 낱말만 고른다', () => {
    for (const stage of [1, 5, 14, 21, 28, 35]) {
      for (const w of poolForStage(stage)) {
        expect(minStageFor(w.word)!).toBeLessThanOrEqual(stage);
      }
    }
  });

  it('단계가 오를수록 읽을 수 있는 낱말이 늘어난다', () => {
    expect(poolForStage(20).length).toBeGreaterThan(poolForStage(10).length);
    expect(poolForStage(10).length).toBeGreaterThan(poolForStage(3).length);
  });

  it('1단계 아이는 모음만으로 된 낱말을 읽는다', () => {
    expect(poolForStage(1).map((w) => w.word)).toEqual(['오이', '우유', '여우', '아이']);
  });

  it('35단계면 모든 낱말을 읽는다', () => {
    expect(poolForStage(35)).toHaveLength(WORD_ITEMS.length);
  });
});

describe('makeWordSet', () => {
  it('한 판 안에서 같은 낱말이 두 번 나오지 않는다', () => {
    const pool = poolForStage(20);
    for (let i = 0; i < 100; i += 1) {
      const words = makeWordSet(pool).map((p) => p.answer.word);
      expect(new Set(words).size).toBe(words.length);
    }
  });

  it('보기는 서로 다른 3개이고 정답이 들어 있다', () => {
    const pool = poolForStage(20);
    for (const p of makeWordSet(pool)) {
      expect(new Set(p.choices.map((c) => c.word)).size).toBe(3);
      expect(p.choices).toContain(p.answer);
    }
  });

  it('오답도 아이가 읽을 수 있는 낱말에서 고른다', () => {
    // 못 읽는 낱말을 보기에 섞으면 읽지 않고도 답이 보인다.
    const stage = 7;
    const pool = poolForStage(stage);
    for (const p of makeWordSet(pool)) {
      for (const c of p.choices) {
        expect(minStageFor(c.word)!).toBeLessThanOrEqual(stage);
      }
    }
  });

  it('두 방향으로 낸다', () => {
    const pool = poolForStage(20);
    const seen = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      for (const p of makeWordSet(pool)) seen.add(p.direction);
    }
    expect([...seen].sort()).toEqual(['toEmoji', 'toWord']);
  });

  it('낱말이 모자라면 있는 만큼만 낸다', () => {
    expect(makeWordSet(poolForStage(1))).toHaveLength(4);
  });

  it('낱말이 셋도 안 되면 아예 내지 않는다', () => {
    expect(makeWordSet(WORD_ITEMS.slice(0, 2))).toEqual([]);
    expect(MIN_POOL).toBe(3);
  });
});

describe('wordQuestion', () => {
  it('방향에 맞게 묻는다', () => {
    const w = WORD_ITEMS[0]!;
    expect(wordQuestion({ answer: w, direction: 'toWord', choices: [w] })).toBe('무엇일까?');
    expect(wordQuestion({ answer: w, direction: 'toEmoji', choices: [w] })).toBe(
      '어느 그림일까?',
    );
  });
});

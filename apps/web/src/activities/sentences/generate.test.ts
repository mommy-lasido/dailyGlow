import { describe, expect, it } from 'vitest';
import { minStageFor } from '@dailyglow/utils';
import { SENTENCE_ITEMS } from './content';
import {
  makeSentenceSet,
  MIN_POOL,
  pickDistractors,
  poolForStage,
  sentenceQuestion,
  sharedWords,
} from './generate';

describe('자료', () => {
  it('모든 문장이 책의 자모만으로 이루어져 있다', () => {
    for (const s of SENTENCE_ITEMS) {
      expect(minStageFor(s.sentence)).not.toBeNull();
    }
  });

  it('모든 문장에 장면 그림이 있다', () => {
    for (const s of SENTENCE_ITEMS) {
      expect(s.emoji.length).toBeGreaterThan(0);
    }
  });

  it('같은 문장이 두 번 들어가지 않는다', () => {
    expect(new Set(SENTENCE_ITEMS.map((s) => s.sentence)).size).toBe(SENTENCE_ITEMS.length);
  });

  it('낱말 하나만 다른 짝을 일부러 넣어 두었다', () => {
    // "곰이 밥을 먹어요" 옆에 "개가 밥을 먹어요" 가 있어야 끝까지 읽게 된다.
    const pairs = SENTENCE_ITEMS.filter((a) =>
      SENTENCE_ITEMS.some(
        (b) =>
          b.sentence !== a.sentence &&
          a.sentence.split(' ').length === b.sentence.split(' ').length &&
          sharedWords(a.sentence, b.sentence) === a.sentence.split(' ').length - 1,
      ),
    );
    expect(pairs.length).toBeGreaterThanOrEqual(10);
  });
});

describe('sharedWords', () => {
  it('같은 낱말이 몇 개인지 센다', () => {
    expect(sharedWords('곰이 밥을 먹어요', '개가 밥을 먹어요')).toBe(2);
    expect(sharedWords('곰이 밥을 먹어요', '코가 커요')).toBe(0);
    expect(sharedWords('코가 커요', '코가 커요')).toBe(2);
  });
});

describe('poolForStage', () => {
  it('배운 데까지의 문장만 고른다', () => {
    for (const stage of [9, 14, 21, 28, 35]) {
      for (const s of poolForStage(stage)) {
        expect(minStageFor(s.sentence)!).toBeLessThanOrEqual(stage);
      }
    }
  });

  it('단계가 오를수록 읽을 수 있는 문장이 늘어난다', () => {
    expect(poolForStage(25).length).toBeGreaterThan(poolForStage(15).length);
    expect(poolForStage(15).length).toBeGreaterThan(poolForStage(9).length);
  });

  it('35단계면 모든 문장을 읽는다', () => {
    expect(poolForStage(35)).toHaveLength(SENTENCE_ITEMS.length);
  });
});

describe('pickDistractors', () => {
  it('오답 둘을 고르고 정답은 넣지 않는다', () => {
    const pool = poolForStage(25);
    for (const answer of pool) {
      const wrong = pickDistractors(answer, pool);
      expect(wrong).toHaveLength(2);
      expect(wrong.some((w) => w.sentence === answer.sentence)).toBe(false);
    }
  });

  it('같은 낱말을 많이 쓰는 문장을 먼저 고른다', () => {
    // "코가 커요" 같은 짧고 다른 문장을 붙이면 읽지 않고도 답이 보인다.
    const pool = poolForStage(25);
    const answer = pool.find((s) => s.sentence === '곰이 밥을 먹어요')!;
    for (let i = 0; i < 50; i += 1) {
      const wrong = pickDistractors(answer, pool);
      for (const w of wrong) {
        expect(sharedWords(answer.sentence, w.sentence)).toBeGreaterThan(0);
      }
    }
  });
});

describe('makeSentenceSet', () => {
  it('한 판 안에서 같은 문장이 두 번 나오지 않는다', () => {
    const pool = poolForStage(25);
    for (let i = 0; i < 100; i += 1) {
      const shown = makeSentenceSet(pool).map((p) => p.answer.sentence);
      expect(new Set(shown).size).toBe(shown.length);
    }
  });

  it('보기는 서로 다른 3개이고 정답이 들어 있다', () => {
    for (const p of makeSentenceSet(poolForStage(25))) {
      expect(new Set(p.choices.map((c) => c.sentence)).size).toBe(3);
      expect(p.choices).toContain(p.answer);
    }
  });

  it('오답도 아이가 읽을 수 있는 문장에서 고른다', () => {
    const stage = 14;
    for (const p of makeSentenceSet(poolForStage(stage))) {
      for (const c of p.choices) {
        expect(minStageFor(c.sentence)!).toBeLessThanOrEqual(stage);
      }
    }
  });

  it('두 방향으로 낸다', () => {
    const pool = poolForStage(25);
    const seen = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      for (const p of makeSentenceSet(pool)) seen.add(p.direction);
    }
    expect([...seen].sort()).toEqual(['toEmoji', 'toSentence']);
  });

  it('문장이 셋도 안 되면 아예 내지 않는다', () => {
    expect(makeSentenceSet(SENTENCE_ITEMS.slice(0, 2))).toEqual([]);
    expect(MIN_POOL).toBe(3);
  });
});

describe('sentenceQuestion', () => {
  it('방향에 맞게 묻는다', () => {
    const s = SENTENCE_ITEMS[0]!;
    expect(sentenceQuestion({ answer: s, direction: 'toSentence', choices: [s] })).toBe(
      '어느 문장일까?',
    );
    expect(sentenceQuestion({ answer: s, direction: 'toEmoji', choices: [s] })).toBe(
      '어느 그림일까?',
    );
  });
});

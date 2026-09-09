import { describe, expect, it } from 'vitest';
import { SPELLING_ITEMS } from './content';
import {
  BLANK,
  filledSentence,
  makeSpellingProblem,
  makeSpellingSet,
  spellingHint,
} from './generate';

describe('자료', () => {
  it('예전 앱의 101개 항목을 그대로 담는다', () => {
    expect(SPELLING_ITEMS).toHaveLength(101);
  });

  it('모든 항목에 빈칸 문장이 있고 빈칸이 정확히 하나다', () => {
    for (const item of SPELLING_ITEMS) {
      expect(item.templates.length).toBeGreaterThan(0);
      for (const t of item.templates) {
        expect(t.split(BLANK)).toHaveLength(2);
      }
    }
  });

  it('모든 항목에 정답이 정확히 하나다', () => {
    for (const item of SPELLING_ITEMS) {
      expect(item.options.filter((o) => o.correct)).toHaveLength(1);
      expect(item.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('모든 보기에 왜 맞고 틀리는지 설명이 붙어 있다', () => {
    for (const item of SPELLING_ITEMS) {
      for (const o of item.options) {
        expect(o.note.length).toBeGreaterThan(5);
      }
    }
  });

  it('한 항목 안에서 보기끼리 겹치지 않는다', () => {
    for (const item of SPELLING_ITEMS) {
      const texts = item.options.map((o) => o.text);
      expect(new Set(texts).size).toBe(texts.length);
    }
  });
});

describe('makeSpellingProblem', () => {
  it('그 항목의 문장 중 하나를 쓰고 정답을 짚어낸다', () => {
    for (const item of SPELLING_ITEMS) {
      const p = makeSpellingProblem(item);
      expect(item.templates).toContain(p.sentence);
      expect(p.answer.correct).toBe(true);
      expect(p.options).toHaveLength(item.options.length);
      expect(p.options).toContain(p.answer);
    }
  });

  it('문장이 여럿인 항목은 낼 때마다 달라질 수 있다', () => {
    // 같은 낱말쌍이라도 매번 같은 문장이면 문장을 외워 버린다.
    const many = SPELLING_ITEMS.find((i) => i.templates.length > 1)!;
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) seen.add(makeSpellingProblem(many).sentence);
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('makeSpellingSet', () => {
  it('열 문제를 낸다', () => {
    expect(makeSpellingSet()).toHaveLength(10);
  });

  it('한 판 안에서 같은 낱말쌍이 두 번 나오지 않는다', () => {
    for (let i = 0; i < 100; i += 1) {
      const answers = makeSpellingSet().map((p) => p.answer.text + '|' + p.sentence);
      expect(new Set(answers).size).toBe(answers.length);
    }
  });

  it('항목이 모자라면 있는 만큼만 낸다', () => {
    expect(makeSpellingSet(SPELLING_ITEMS.slice(0, 4))).toHaveLength(4);
  });
});

describe('filledSentence', () => {
  it('빈칸에 고른 말을 넣는다', () => {
    expect(filledSentence('학교에 ___ 갔어요.', '안')).toBe('학교에 안 갔어요.');
  });
});

describe('spellingHint', () => {
  it('왜 그 말이 맞는지 설명해 준다', () => {
    const p = makeSpellingProblem(SPELLING_ITEMS[0]!);
    expect(spellingHint(p)).toBe(p.answer.note);
    expect(spellingHint(p).length).toBeGreaterThan(5);
  });
});

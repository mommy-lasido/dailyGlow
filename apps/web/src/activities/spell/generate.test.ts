import { describe, expect, it } from 'vitest';
import {
  isDone,
  isNext,
  makeSpellSet,
  scramble,
  SPELL_PROBLEM_COUNT,
  todayWords,
} from './generate';
import { lessonsOf, VOCAB_BOOKS, wordsOf } from './words';

describe('scramble', () => {
  it('글자를 하나도 잃거나 더하지 않는다', () => {
    const letters = scramble('sculpture');
    expect([...letters].sort().join('')).toBe([...'sculpture'].sort().join(''));
  });

  it('원래 차례 그대로 내놓지 않는다', () => {
    // 섞이지 않은 낱말이 나오면 아이가 글자를 짚지 않고 그대로 눌러 버린다.
    for (const word of ['journey', 'planet', 'gratitude']) {
      expect(scramble(word).join('')).not.toBe(word);
    }
  });
});

describe('isNext · isDone', () => {
  it('다음 차례의 글자만 받는다', () => {
    expect(isNext('cage', '', 'c')).toBe(true);
    expect(isNext('cage', '', 'a')).toBe(false);
    expect(isNext('cage', 'ca', 'g')).toBe(true);
  });

  it('같은 글자가 여러 번 나와도 받아준다', () => {
    // 아이에게는 같은 글자이므로 어느 것을 눌러도 옳다.
    expect(isNext('settle', 'set', 't')).toBe(true);
  });

  it('다 채우면 끝난 것으로 본다', () => {
    expect(isDone('cage', 'cage')).toBe(true);
    expect(isDone('cage', 'cag')).toBe(false);
  });
});

describe('makeSpellSet', () => {
  it('한 판에 같은 낱말이 두 번 나오지 않는다', () => {
    const set = makeSpellSet(wordsOf(2));
    expect(new Set(set.map((p) => p.answer)).size).toBe(set.length);
  });

  it('낼 것이 모자라면 있는 만큼만 낸다', () => {
    const set = makeSpellSet(wordsOf(2, 1).slice(0, 3));
    expect(set).toHaveLength(3);
  });

  it('한 판은 다섯 낱말이다', () => {
    expect(makeSpellSet(wordsOf(2))).toHaveLength(SPELL_PROBLEM_COUNT);
  });
});

describe('낱말 목록', () => {
  it('뜻이 적힌 낱말만 낸다', () => {
    // 뜻이 없으면 아이는 무슨 낱말을 맞춰야 하는지 알 길이 없다.
    for (const w of wordsOf(2)) expect(w.meaning).toBeTruthy();
  });

  it('뜻 안에 답이 들어 있지 않다', () => {
    // 답이 새면 맞히는 놀이가 되지 않는다.
    for (const w of wordsOf(2)) {
      expect(w.meaning!.toLowerCase()).not.toContain(w.word);
    }
  });

  it('과마다 열 낱말씩 들어 있다', () => {
    for (const book of VOCAB_BOOKS) {
      for (const n of lessonsOf(book.book)) {
        expect(book.words.filter((w) => w.lesson === n)).toHaveLength(10);
      }
    }
  });

  it('낱말은 모두 소문자 영어다', () => {
    for (const book of VOCAB_BOOKS) {
      for (const w of book.words) expect(w.word).toMatch(/^[a-z]+$/);
    }
  });
});

describe('todayWords', () => {
  const 오늘 = new Date(2026, 8, 19);
  const 내일 = new Date(2026, 8, 20);

  it('오늘 안에는 몇 번을 열어도 같은 낱말이 나온다', () => {
    // 아이가 "오늘 건 다 했다" 를 알 수 있어야 한다.
    const a = todayWords(wordsOf(2), '아이1', 5, 오늘);
    const b = todayWords(wordsOf(2), '아이1', 5, 오늘);
    expect(a.map((w) => w.word)).toEqual(b.map((w) => w.word));
  });

  it('내일이면 다른 낱말이 나온다', () => {
    const a = todayWords(wordsOf(2), '아이1', 5, 오늘);
    const b = todayWords(wordsOf(2), '아이1', 5, 내일);
    expect(a.map((w) => w.word)).not.toEqual(b.map((w) => w.word));
  });

  it('아이마다 다른 낱말이 나온다', () => {
    const a = todayWords(wordsOf(2), '아이1', 5, 오늘);
    const b = todayWords(wordsOf(2), '아이2', 5, 오늘);
    expect(a.map((w) => w.word)).not.toEqual(b.map((w) => w.word));
  });
});

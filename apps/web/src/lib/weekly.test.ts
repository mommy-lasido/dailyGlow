import { describe, expect, it } from 'vitest';
import { weeklyFocus, weeklyLetters, weeklyWords, wordHasLetter } from './weekly';

describe('weeklyLetters', () => {
  it('단계 이름의 따옴표 안 글자를 꺼낸다', () => {
    expect(weeklyLetters(22)).toEqual(['ㅐ']); // 복잡한 모음 'ㅐ'
    expect(weeklyLetters(2)).toEqual(['ㄱ']); // 기본 자음 'ㄱ'
    expect(weeklyLetters(19)).toEqual(['ㄱ']); // 기본 받침 'ㄱ'
  });

  it('한 단계에 둘을 배우는 자리도 둘 다 꺼낸다', () => {
    expect(weeklyLetters(25)).toEqual(['ㅘ', 'ㅢ']); // 복잡한 모음 'ㅘ, ㅢ'
  });

  it('배울 글자가 정해지지 않은 단계는 빈 목록이다', () => {
    // 34·35단계는 정리 학습이라 따옴표 안의 글자가 없다.
    expect(weeklyLetters(35)).toEqual([]);
    expect(weeklyLetters(99)).toEqual([]);
  });
});

describe('wordHasLetter', () => {
  it('첫소리·가운뎃소리·받침 어디에 있어도 찾는다', () => {
    expect(wordHasLetter('개', 'ㅐ')).toBe(true);
    expect(wordHasLetter('고기', 'ㄱ')).toBe(true);
    expect(wordHasLetter('곰', 'ㅁ')).toBe(true); // 받침
    expect(wordHasLetter('오이', 'ㅐ')).toBe(false);
  });
});

describe('weeklyWords', () => {
  it('그 글자가 든 낱말만 고른다', () => {
    for (const w of weeklyWords(22)) {
      expect(wordHasLetter(w, 'ㅐ')).toBe(true);
    }
  });

  it('아이가 읽을 수 있는 낱말에서만 고른다', () => {
    // 이번 주 글자가 들어 있어도 나머지 자모를 못 배웠으면 읽을 방법이 없다.
    const words = weeklyWords(22);
    expect(words.length).toBeGreaterThan(0);
    expect(words).toContain('개');
  });
});

describe('weeklyFocus', () => {
  it('22단계는 ㅐ 를 배운다', () => {
    const focus = weeklyFocus(22)!;
    expect(focus.letters).toEqual(['ㅐ']);
    expect(focus.label).toContain('ㅐ');
    expect(focus.examples).toContain('개');
    expect(focus.words.length).toBeGreaterThan(0);
  });

  it('1단계는 기본 모음의 첫 글자 ㅏ 를 배운다', () => {
    // 1단계는 모음 열 개를 다루지만, 한 주에 하나씩 붙잡는 것이 이 칸의 뜻이다.
    expect(weeklyFocus(1)!.letters).toEqual(['ㅏ']);
  });

  it('배울 글자가 없는 단계에는 아무것도 돌려주지 않는다', () => {
    // 34·35단계는 정리 학습이라 붙잡을 글자가 따로 없다. 빈 칸을 두느니 없는 편이 낫다.
    expect(weeklyFocus(35)).toBeNull();
  });
});

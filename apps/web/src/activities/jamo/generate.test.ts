import { describe, expect, it } from 'vitest';
import { HANGUL_STAGES } from '@dailyglow/utils';
import {
  BASIC_VOWELS,
  composeSyllable,
  JAMO_MAX_STAGE,
  jamoHint,
  lettersForStage,
  makeJamoProblem,
  makeJamoSet,
  stageLetter,
} from './generate';

describe('BASIC_VOWELS', () => {
  it('1단계 기본 모음 열 개를 책 차례대로 담는다', () => {
    expect(BASIC_VOWELS.map((v) => v.letter).join(' ')).toBe(
      'ㅏ ㅑ ㅓ ㅕ ㅗ ㅛ ㅜ ㅠ ㅡ ㅣ',
    );
    // 『기적의 한글 학습』 1단계의 예시 줄과 같아야 한다.
    expect(HANGUL_STAGES[0]!.examples).toBe(BASIC_VOWELS.map((v) => v.letter).join(' '));
  });

  it('모음은 소리 나는 대로 읽어준다 — ㅏ 는 "아"', () => {
    // 'ㅏ' 를 그대로 읽히면 기기마다 소리가 다르거나 아예 안 난다.
    expect(BASIC_VOWELS.map((v) => v.sound).join('')).toBe('아야어여오요우유으이');
  });
});

describe('composeSyllable', () => {
  it('첫소리와 가운뎃소리를 합친다', () => {
    expect(composeSyllable('ㄱ', 'ㅏ')).toBe('가');
    expect(composeSyllable('ㄱ', 'ㅣ')).toBe('기');
    expect(composeSyllable('ㅎ', 'ㅡ')).toBe('흐');
    expect(composeSyllable('ㅂ', 'ㅛ')).toBe('뵤');
  });

  it('한글이 아닌 것을 받으면 빈 글자를 돌려준다', () => {
    expect(composeSyllable('A', 'ㅏ')).toBe('');
    expect(composeSyllable('ㄱ', '1')).toBe('');
  });
});

describe('stageLetter', () => {
  it('단계 이름의 따옴표 안 글자를 꺼낸다', () => {
    expect(stageLetter(1)).toBe('ㅏ');
    expect(stageLetter(2)).toBe('ㄱ');
    expect(stageLetter(14)).toBe('ㅎ');
  });

  it('없는 단계는 null', () => {
    expect(stageLetter(0)).toBeNull();
    expect(stageLetter(99)).toBeNull();
  });
});

describe('lettersForStage', () => {
  it('1단계는 기본 모음을 배운다', () => {
    expect(lettersForStage(1)).toEqual(BASIC_VOWELS);
  });

  it('2단계는 ㄱ 이 모음과 만난 글자를 배운다', () => {
    // 책의 2단계 예시가 "가, 갸, 거, 겨…" 다.
    expect(lettersForStage(2).map((i) => i.letter).join('')).toBe('가갸거겨고교구규그기');
  });

  it('자음 단계에서는 글자가 곧 소리다', () => {
    for (const item of lettersForStage(5)) {
      expect(item.sound).toBe(item.letter);
    }
  });

  it('1~14단계 모두 열 글자씩 나오고 빈 글자가 없다', () => {
    for (let s = 1; s <= JAMO_MAX_STAGE; s += 1) {
      const items = lettersForStage(s);
      expect(items).toHaveLength(10);
      for (const i of items) expect(i.letter).not.toBe('');
    }
  });

  it('받침 단계로 넘어간 아이는 마지막 자음으로 복습한다', () => {
    // 15단계부터는 받침이라 이 활동이 다룰 내용이 아니다.
    expect(lettersForStage(20)).toEqual(lettersForStage(JAMO_MAX_STAGE));
    expect(lettersForStage(35)).toEqual(lettersForStage(JAMO_MAX_STAGE));
  });

  it('단계가 1보다 작아도 터지지 않는다', () => {
    expect(lettersForStage(0)).toEqual(BASIC_VOWELS);
    expect(lettersForStage(-3)).toEqual(BASIC_VOWELS);
  });
});

describe('makeJamoProblem', () => {
  it('보기는 서로 다른 3개이고 정답이 들어 있다', () => {
    const items = lettersForStage(2);
    for (let i = 0; i < 100; i += 1) {
      const p = makeJamoProblem(items);
      expect(p.choices).toHaveLength(3);
      expect(new Set(p.choices.map((c) => c.letter)).size).toBe(3);
      expect(p.choices).toContain(p.answer);
    }
  });

  it('오답도 같은 단계 안에서 고른다', () => {
    // 전혀 다른 글자를 섞으면 소리를 안 듣고도 모양만으로 답이 보인다.
    const items = lettersForStage(3);
    const allowed = new Set(items.map((i) => i.letter));
    for (let i = 0; i < 100; i += 1) {
      for (const c of makeJamoProblem(items).choices) {
        expect(allowed.has(c.letter)).toBe(true);
      }
    }
  });
});

describe('makeJamoSet', () => {
  it('한 판 안에서 같은 글자가 두 번 나오지 않는다', () => {
    for (let i = 0; i < 200; i += 1) {
      const set = makeJamoSet(lettersForStage(1));
      const letters = set.map((p) => p.answer.letter);
      expect(new Set(letters).size).toBe(letters.length);
    }
  });

  it('다섯 문제를 낸다', () => {
    expect(makeJamoSet(lettersForStage(1))).toHaveLength(5);
  });

  it('글자가 모자라면 있는 만큼만 낸다', () => {
    expect(makeJamoSet(BASIC_VOWELS.slice(0, 3))).toHaveLength(3);
  });

  it('문제마다 보기 3개가 제대로 붙는다', () => {
    for (const p of makeJamoSet(lettersForStage(2))) {
      expect(new Set(p.choices.map((c) => c.letter)).size).toBe(3);
      expect(p.choices).toContain(p.answer);
    }
  });
});

describe('jamoHint', () => {
  it('어떤 소리였는지 다시 말해준다', () => {
    const p = { answer: { letter: 'ㅏ', sound: '아' }, choices: [] };
    expect(jamoHint(p)).toContain('아');
  });
});

import { describe, expect, it } from 'vitest';
import { HANGUL_STAGES } from '@dailyglow/utils';
import {
  BASIC_VOWELS,
  composeSyllable,
  JAMO_MAX_STAGE,
  jamoHint,
  learnedLeads,
  lettersForStage,
  makeJamoProblem,
  makeJamoSet,
  pickLetters,
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

  it('단계는 "여기까지 왔다" 는 뜻이라 앞 단계 글자도 함께 나온다', () => {
    // 3단계(ㄴ)까지 온 아이는 ㄱ 도 아는 아이다. '가' 도 '나' 도 나와야 한다.
    const letters = lettersForStage(3).map((i) => i.letter);
    expect(letters).toContain('가');
    expect(letters).toContain('나');
    expect(letters).toHaveLength(20);
  });

  it('1~14단계 모두 빈 글자 없이 열 글자씩 늘어난다', () => {
    expect(lettersForStage(1)).toHaveLength(10);
    for (let s = 2; s <= JAMO_MAX_STAGE; s += 1) {
      const items = lettersForStage(s);
      expect(items).toHaveLength((s - 1) * 10);
      for (const i of items) expect(i.letter).not.toBe('');
    }
  });

  it('받침 단계로 넘어간 아이는 배운 글자 전부로 복습한다', () => {
    // 15단계부터는 받침이라 이 활동이 다룰 내용이 아니다. 마지막 자음(ㅎ)만
    // 내놓으면 다 뗀 아이에게 늘 '하 햐 허 혀' 만 나온다.
    const all = lettersForStage(JAMO_MAX_STAGE);
    expect(lettersForStage(20)).toEqual(all);
    expect(lettersForStage(35)).toEqual(all);
    expect(all.map((i) => i.letter)).toContain('가');
    expect(all.map((i) => i.letter)).toContain('하');
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

describe('learnedLeads · pickLetters', () => {
  it('단계가 오를수록 배운 자음이 하나씩 늘어난다', () => {
    expect(learnedLeads(1)).toEqual([]);
    expect(learnedLeads(2)).toEqual(['ㄱ']);
    expect(learnedLeads(4)).toEqual(['ㄱ', 'ㄴ', 'ㄷ']);
    expect(learnedLeads(JAMO_MAX_STAGE)).toHaveLength(13);
  });

  it('받침 단계로 넘어가도 자음은 열셋에서 멈춘다', () => {
    expect(learnedLeads(35)).toEqual(learnedLeads(JAMO_MAX_STAGE));
  });

  it('열 자 이하면 책의 차례를 그대로 둔다', () => {
    const ten = lettersForStage(2);
    expect(pickLetters(ten)).toEqual(ten);
  });

  it('열 자보다 많으면 섞어서 열 자만 뽑는다', () => {
    const many = lettersForStage(JAMO_MAX_STAGE);
    const picked = pickLetters(many);
    expect(picked).toHaveLength(10);
    // 뽑은 글자는 모두 배운 글자 안에 있고, 서로 겹치지 않는다.
    const letters = picked.map((i) => i.letter);
    expect(new Set(letters).size).toBe(10);
    for (const l of letters) expect(many.some((i) => i.letter === l)).toBe(true);
  });
});

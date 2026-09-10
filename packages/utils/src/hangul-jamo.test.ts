import { describe, expect, it } from 'vitest';
import {
  canRead,
  compose,
  decompose,
  isHangulSyllable,
  minStageFor,
} from './hangul-jamo';

describe('decompose', () => {
  it('받침 없는 글자를 쪼갠다', () => {
    expect(decompose('가')).toEqual({ lead: 'ㄱ', vowel: 'ㅏ', tail: '' });
    expect(decompose('의')).toEqual({ lead: 'ㅇ', vowel: 'ㅢ', tail: '' });
  });

  it('받침 있는 글자를 쪼갠다', () => {
    expect(decompose('감')).toEqual({ lead: 'ㄱ', vowel: 'ㅏ', tail: 'ㅁ' });
    expect(decompose('닭')).toEqual({ lead: 'ㄷ', vowel: 'ㅏ', tail: 'ㄺ' });
  });

  it('한글이 아니면 null', () => {
    expect(decompose('A')).toBeNull();
    expect(decompose('ㄱ')).toBeNull();
    expect(decompose(' ')).toBeNull();
  });
});

describe('compose', () => {
  it('쪼갠 것을 되돌린다', () => {
    for (const ch of '가나다라마바사아자차카타파하강곰물눈목밥옷의왜뭐예') {
      expect(compose(decompose(ch)!)).toBe(ch);
    }
  });

  it('자모가 아닌 것을 받으면 빈 글자', () => {
    expect(compose({ lead: 'X', vowel: 'ㅏ', tail: '' })).toBe('');
  });
});

describe('isHangulSyllable', () => {
  it('가부터 힣까지가 한글 한 글자다', () => {
    expect(isHangulSyllable('가')).toBe(true);
    expect(isHangulSyllable('힣')).toBe(true);
    expect(isHangulSyllable('ㄱ')).toBe(false);
    expect(isHangulSyllable('1')).toBe(false);
  });
});

describe('minStageFor', () => {
  it('1단계 아이가 읽을 수 있는 것은 모음뿐이다', () => {
    // 'ㅇ' 은 소리가 나지 않아 1단계에서 '아, 오, 이' 로 이미 만난다.
    expect(minStageFor('아이')).toBe(1);
    expect(minStageFor('오이')).toBe(1);
  });

  it('첫소리가 늦게 나오는 낱말은 그만큼 단계가 높다', () => {
    expect(minStageFor('가')).toBe(2); // ㄱ 은 2단계
    expect(minStageFor('나')).toBe(3); // ㄴ 은 3단계
    expect(minStageFor('하')).toBe(14); // ㅎ 은 14단계
  });

  it('받침이 있으면 받침 단계까지 배워야 한다', () => {
    expect(minStageFor('강')).toBe(15); // 받침 ㅇ
    expect(minStageFor('곰')).toBe(16); // 받침 ㅁ
    expect(minStageFor('물')).toBe(17); // 받침 ㄹ
    expect(minStageFor('눈')).toBe(18); // 받침 ㄴ
    expect(minStageFor('목')).toBe(19); // 받침 ㄱ
    expect(minStageFor('밥')).toBe(20); // 받침 ㅂ
    expect(minStageFor('옷')).toBe(21); // 받침 ㅅ
  });

  it('복잡한 모음도 셈에 들어간다', () => {
    expect(minStageFor('개')).toBe(22); // ㅐ
    expect(minStageFor('네')).toBe(23); // ㅔ
    expect(minStageFor('쥐')).toBe(24); // ㅟ
    expect(minStageFor('과자')).toBe(25); // ㅘ
  });

  it('쌍자음은 5권에서 배운다', () => {
    expect(minStageFor('꿈')).toBe(29); // ㄲ 29, 받침 ㅁ 16 → 29
    expect(minStageFor('빵')).toBe(31); // ㅃ
  });

  it('여러 글자면 가장 높은 단계를 따른다', () => {
    // 사과 — ㅅ 8단계, ㄱ 2단계, ㅘ 25단계 → 25
    expect(minStageFor('사과')).toBe(25);
    // 나비 — ㄴ 3단계, ㅂ 7단계 → 7
    expect(minStageFor('나비')).toBe(7);
  });

  it('책이 다루지 않는 겹받침이 있으면 쓰지 않는다', () => {
    expect(minStageFor('닭')).toBeNull();
    expect(minStageFor('값')).toBeNull();
    expect(minStageFor('있다')).toBeNull(); // 쌍받침 ㅆ
  });

  it('한글이 없으면 null', () => {
    expect(minStageFor('abc')).toBeNull();
    expect(minStageFor('')).toBeNull();
  });

  it('사이띄개나 문장부호는 세지 않는다', () => {
    expect(minStageFor('아 이')).toBe(1);
    expect(minStageFor('나비?')).toBe(7);
  });
});

describe('canRead', () => {
  it('배운 단계까지의 낱말만 읽을 수 있다', () => {
    expect(canRead('나비', 7)).toBe(true);
    expect(canRead('나비', 6)).toBe(false);
    expect(canRead('아이', 1)).toBe(true);
  });

  it('책이 다루지 않는 낱말은 몇 단계여도 읽지 않는다', () => {
    expect(canRead('닭', 35)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  ROWS_PER_SHEET,
  WRITES_PER_ROW,
  layoutFor,
  makeSheet,
  optionsForStage,
  sourceFor,
  traceFor,
} from './generate';

describe('optionsForStage', () => {
  it('1단계 아이는 자음과 모음만 쓴다', () => {
    expect(optionsForStage(1).map((o) => o.kind)).toEqual(['consonant', 'vowel']);
  });

  it('2단계부터 글자를 쓴다', () => {
    expect(optionsForStage(2).map((o) => o.kind)).toContain('letter');
  });

  it('5단계부터 낱말을 쓴다', () => {
    expect(optionsForStage(4).map((o) => o.kind)).not.toContain('word');
    expect(optionsForStage(5).map((o) => o.kind)).toContain('word');
  });

  it('14단계부터 문장을 쓴다', () => {
    // 못 읽는 문장을 베껴 쓰는 것은 글자 모양 그리기일 뿐이다.
    expect(optionsForStage(13).map((o) => o.kind)).not.toContain('sentence');
    expect(optionsForStage(14).map((o) => o.kind)).toContain('sentence');
  });

  it('1단계 아이는 ㅇ 하나를 쓴다', () => {
    expect(sourceFor('consonant', 1).map((r) => r.text)).toEqual(['ㅇ']);
  });

  it('자음이 맨 앞이다', () => {
    // 가갸거겨보다 ㄱㄴㄷㄹ 모양이 먼저다.
    expect(optionsForStage(20)[0]!.kind).toBe('consonant');
  });
});

describe('sourceFor', () => {
  it('모음은 기본 모음 열 개', () => {
    expect(sourceFor('vowel', 1)).toHaveLength(10);
    expect(sourceFor('vowel', 1)[0]).toEqual({ text: 'ㅏ', sound: '아' });
  });

  it('자음은 단계에 따라 늘어난다', () => {
    expect(sourceFor('consonant', 1)).toHaveLength(1);
    expect(sourceFor('consonant', 10).length).toBeGreaterThan(4);
  });

  it('글자는 그 단계의 자음이 모음과 만난 것', () => {
    expect(sourceFor('letter', 2).map((r) => r.text).join('')).toBe('가갸거겨고교구규그기');
  });

  it('낱말은 아이가 읽을 수 있는 것만', () => {
    // 낱말 읽기와 같은 자료를 쓰므로 읽을 수 있는 것만 쓰게 된다.
    expect(sourceFor('word', 20).length).toBeGreaterThan(sourceFor('word', 5).length);
  });

  it('모든 줄에 읽어줄 말이 있다', () => {
    for (const kind of ['vowel', 'consonant', 'letter', 'word'] as const) {
      for (const r of sourceFor(kind, 20)) {
        expect(r.text.length).toBeGreaterThan(0);
        expect(r.sound.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('layoutFor', () => {
  it('자음·모음·글자는 한 줄에 다섯 번씩 쓴다', () => {
    for (const kind of ['vowel', 'consonant', 'letter'] as const) {
      expect(layoutFor(kind)).toEqual({ writes: 5, rows: 8, ruled: false, blankLines: 0 });
    }
  });

  it('낱말도 다섯 번씩 쓰되 한 장에 넣는 줄을 줄인다', () => {
    // 낱말은 글자가 둘셋이라 한 줄이 길다. 여덟 줄을 넣으면 종이를 넘친다.
    expect(layoutFor('word')).toEqual({ writes: 5, rows: 5, ruled: false, blankLines: 0 });
  });

  it('문장은 칸이 아니라 줄에 쓰고, 본보기 아래 빈 줄 셋을 둔다', () => {
    expect(layoutFor('sentence')).toEqual({
      writes: 1,
      rows: 4,
      ruled: true,
      blankLines: 3,
    });
  });
});

describe('makeSheet', () => {
  it('한 장에 여덟 줄까지 넣는다', () => {
    expect(makeSheet('letter', 30)).toHaveLength(ROWS_PER_SHEET);
  });

  it('낱말 연습지는 다섯 줄을 넣는다', () => {
    expect(makeSheet('word', 30)).toHaveLength(5);
  });

  it('쓸 것이 적으면 있는 만큼만 넣는다', () => {
    // 같은 글자를 두 줄에 넣어 억지로 채우면 연습지가 지루해진다.
    expect(makeSheet('consonant', 1)).toHaveLength(1);
  });

  it('같은 글자가 두 줄에 나오지 않는다', () => {
    for (let i = 0; i < 50; i += 1) {
      const rows = makeSheet('letter', 5).map((r) => r.text);
      expect(new Set(rows).size).toBe(rows.length);
    }
  });

  it('문장 연습지는 네 문장을 넣는다', () => {
    // 문장마다 본보기 한 줄에 빈 줄 셋이 붙으므로 넷이면 한 장이 찬다.
    expect(makeSheet('sentence', 35)).toHaveLength(4);
  });

  it('낼 때마다 글자가 달라진다', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i += 1) seen.add(makeSheet('word', 30).map((r) => r.text).join(''));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('한 줄에 다섯 번 쓴다', () => {
    // 첫 번째는 따라 쓰는 본보기다.
    expect(WRITES_PER_ROW).toBe(5);
  });
});

describe('traceFor', () => {
  it('14단계까지는 두 칸을 따라 쓴다', () => {
    for (const s of [1, 5, 14]) expect(traceFor(s)).toBe(2);
  });

  it('자음·모음을 다 뗀 뒤에는 한 칸만 본보기다', () => {
    for (const s of [15, 21, 35]) expect(traceFor(s)).toBe(1);
  });
});

describe('makeSheet — 자음·모음은 차례대로', () => {
  it('모음은 책의 차례 그대로 열 개를 다 낸다', () => {
    // ㅏ ㅑ ㅓ ㅕ … 는 아이가 외우는 순서다. 섞으면 아는 차례와 어긋난다.
    const sheet = makeSheet('vowel', 5).map((r) => r.text);
    expect(sheet.join('')).toBe('ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ');
  });

  it('자음은 책 차례대로, 단계마다 하나씩 늘어난다', () => {
    const at = (s: number) => makeSheet('consonant', s).map((r) => r.text).join('');
    // 1단계 모음(아·야·어·여)이 곧 'ㅇ' 과 모음이 만난 소리라 ㅇ 이 맨 앞이다.
    expect(at(1)).toBe('ㅇ');
    // 그 뒤로 책의 차례가 한 단계에 하나씩 이어진다.
    expect(at(2)).toBe('ㅇㄱ');
    expect(at(3)).toBe('ㅇㄱㄴ');
    expect(at(6)).toBe('ㅇㄱㄴㄷㄹㅁ');
    expect(at(7)).toBe('ㅇㄱㄴㄷㄹㅁㅂ');
    // 14단계면 책이 다루는 열셋을 다 배운다.
    expect(at(14)).toBe('ㅇㄱㄴㄷㄹㅁㅂㅅㅈㅊㅋㅌㅍㅎ');
  });

  it('낼 때마다 같은 연습지가 나온다', () => {
    // 자음·모음은 배운 것 전부라 뽑을 것이 없다. 섞지 않으므로 늘 같다.
    const a = makeSheet('vowel', 5).map((r) => r.text).join('');
    const b = makeSheet('vowel', 5).map((r) => r.text).join('');
    expect(a).toBe(b);
  });
});

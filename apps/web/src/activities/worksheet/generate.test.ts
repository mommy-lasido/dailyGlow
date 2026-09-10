import { describe, expect, it } from 'vitest';
import {
  makeSheet,
  optionsForStage,
  ROWS_PER_SHEET,
  sourceFor,
  WRITES_PER_ROW,
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
    expect(sourceFor('consonant', 1)).toHaveLength(4);
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

describe('makeSheet', () => {
  it('한 장에 여덟 줄까지 넣는다', () => {
    expect(makeSheet('word', 30)).toHaveLength(ROWS_PER_SHEET);
  });

  it('쓸 것이 적으면 있는 만큼만 넣는다', () => {
    // 같은 글자를 두 줄에 넣어 억지로 채우면 연습지가 지루해진다.
    expect(makeSheet('consonant', 1)).toHaveLength(4);
  });

  it('같은 글자가 두 줄에 나오지 않는다', () => {
    for (let i = 0; i < 50; i += 1) {
      const rows = makeSheet('letter', 5).map((r) => r.text);
      expect(new Set(rows).size).toBe(rows.length);
    }
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

import { describe, expect, it } from 'vitest';
import {
  HANGUL_BOOKS,
  HANGUL_STAGES,
  hangulStage,
  hangulStageOptionLabel,
} from './hangul-stages';

describe('HANGUL_STAGES', () => {
  it('35단계가 번호 순서대로 빠짐없이 있다', () => {
    expect(HANGUL_STAGES).toHaveLength(35);
    expect(HANGUL_STAGES.map((s) => s.stage)).toEqual(
      Array.from({ length: 35 }, (_, i) => i + 1),
    );
  });

  it('모든 단계가 1~5권 중 하나에 속한다', () => {
    for (const s of HANGUL_STAGES) {
      expect(s.book).toBeGreaterThanOrEqual(1);
      expect(s.book).toBeLessThanOrEqual(5);
      expect(s.label.length).toBeGreaterThan(0);
    }
  });

  it('권 경계가 책과 같다 — 1권 1~7, 2권 8~14, 3권 15~21, 4권 22~28, 5권 29~35', () => {
    const range = (book: number) => HANGUL_STAGES.filter((s) => s.book === book).map((s) => s.stage);
    expect(range(1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(range(2)).toEqual([8, 9, 10, 11, 12, 13, 14]);
    expect(range(3)).toEqual([15, 16, 17, 18, 19, 20, 21]);
    expect(range(4)).toEqual([22, 23, 24, 25, 26, 27, 28]);
    expect(range(5)).toEqual([29, 30, 31, 32, 33, 34, 35]);
  });

  it('4권의 복잡한 모음 단계가 책대로 적혀 있다', () => {
    expect(hangulStage(25)).toEqual({
      stage: 25,
      book: 4,
      label: "복잡한 모음 'ㅘ, ㅢ'",
      examples: '과자, 기와, 의사, 유희…',
    });
    expect(hangulStage(26)).toEqual({
      stage: 26,
      book: 4,
      label: "복잡한 모음 'ㅚ, ㅙ'",
      examples: '쇠, 죄, 돼지, 횃불…',
    });
    expect(hangulStage(27)).toEqual({
      stage: 27,
      book: 4,
      label: "복잡한 모음 'ㅝ, ㅞ'",
      examples: '뭐, 병원, 훼방, 웬일…',
    });
    expect(hangulStage(28)).toEqual({
      stage: 28,
      book: 4,
      label: "복잡한 모음 'ㅒ, ㅖ'",
      examples: '얘, 걔, 예, 시계…',
    });
  });

  it('예시가 있는 단계는 34·35단계를 빼고 전부다', () => {
    const empty = HANGUL_STAGES.filter((s) => s.examples === '').map((s) => s.stage);
    expect(empty).toEqual([34, 35]);
  });

  it('범위를 벗어난 단계는 찾지 못한다', () => {
    expect(hangulStage(0)).toBeUndefined();
    expect(hangulStage(36)).toBeUndefined();
  });
});

describe('HANGUL_BOOKS', () => {
  it('다섯 권의 제목이 책과 같다', () => {
    expect(HANGUL_BOOKS.map((b) => b.title)).toEqual([
      '기본자 학습 1',
      '기본자 학습 2',
      '받침 학습',
      '복잡한 모음 학습',
      '쌍자음과 한글을 예쁘게 쓰는 순서 1, 2',
    ]);
  });

  it('긴 5권 제목은 짧은 이름을 따로 갖는다', () => {
    expect(HANGUL_BOOKS[4]!.shortTitle).toBe('쌍자음과 예쁘게 쓰기');
  });
});

describe('hangulStageOptionLabel', () => {
  it('단계·설명·예시를 한 줄로 붙인다', () => {
    expect(hangulStageOptionLabel(hangulStage(4)!)).toBe("4단계 · 기본 자음 'ㄷ' (다, 댜, 더, 뎌…)");
  });

  it('예시가 없으면 빈 괄호를 남기지 않는다', () => {
    expect(hangulStageOptionLabel(hangulStage(34)!)).toBe('34단계 · 한글을 예쁘게 쓰는 순서 1');
  });
});

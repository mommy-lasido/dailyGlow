import { describe, expect, it } from 'vitest';
import { hasStrokes, strokeAngle, STROKES } from './strokes';
import { BASIC_CONSONANTS, BASIC_VOWELS } from '@/activities/jamo/generate';
import { weeklyLetters } from './weekly';

describe('STROKES', () => {
  it('기본 자음·모음은 모두 획순을 갖고 있다', () => {
    for (const v of BASIC_VOWELS) expect(hasStrokes(v.letter)).toBe(true);
    for (const c of BASIC_CONSONANTS) expect(hasStrokes(c.letter)).toBe(true);
  });

  it('단계표가 가리키는 글자도 모두 갖고 있다', () => {
    // 이번 주의 글자로 나올 수 있는 것은 빠짐없이 그릴 수 있어야 한다.
    for (let stage = 1; stage <= 35; stage += 1) {
      for (const letter of weeklyLetters(stage)) {
        expect(hasStrokes(letter), `${stage}단계 ${letter}`).toBe(true);
      }
    }
  });

  it('획은 적어도 두 점을 지난다', () => {
    for (const [letter, strokes] of Object.entries(STROKES)) {
      expect(strokes.length, letter).toBeGreaterThan(0);
      for (const stroke of strokes) {
        expect(stroke.length, letter).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('획은 100×100 칸 안에 있다', () => {
    for (const [letter, strokes] of Object.entries(STROKES)) {
      for (const stroke of strokes) {
        for (const [x, y] of stroke) {
          expect(x, letter).toBeGreaterThanOrEqual(0);
          expect(x, letter).toBeLessThanOrEqual(100);
          expect(y, letter).toBeGreaterThanOrEqual(0);
          expect(y, letter).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('가로획은 왼쪽에서 오른쪽으로, 세로획은 위에서 아래로 긋는다', () => {
    // 한글 필순의 큰 규칙이다. 거꾸로 적어 두면 아이가 거꾸로 배운다.
    for (const [letter, strokes] of Object.entries(STROKES)) {
      for (const stroke of strokes) {
        const [x1, y1] = stroke[0]!;
        const [x2, y2] = stroke[1]!;
        if (y1 === y2) expect(x2, `${letter} 가로획`).toBeGreaterThan(x1);
        if (x1 === x2) expect(y2, `${letter} 세로획`).toBeGreaterThan(y1);
      }
    }
  });
});

describe('strokeAngle', () => {
  it('오른쪽으로 긋는 획은 0도', () => {
    expect(strokeAngle([[0, 0], [10, 0]])).toBe(0);
  });

  it('아래로 긋는 획은 90도', () => {
    expect(strokeAngle([[0, 0], [0, 10]])).toBe(90);
  });

  it('꺾이는 획은 마지막 방향을 본다', () => {
    // ㄱ 은 오른쪽으로 갔다가 아래로 내린다. 화살촉은 아래를 가리켜야 한다.
    expect(strokeAngle([[0, 0], [10, 0], [8, 10]])).toBeGreaterThan(45);
  });
});

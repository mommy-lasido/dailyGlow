import { describe, expect, it } from 'vitest';
import { buildReviewQueue, intervalForStreak, reviewScore, type TypeStat } from './srs';
import { levelFromXp, xpForLevel } from './level';

const now = 1_700_000_000_000;

function stat(over: Partial<TypeStat>): TypeStat {
  return { typeId: 't', attempts: 10, correct: 5, lastSeenAt: now, streak: 0, ...over };
}

describe('srs', () => {
  it('오답률이 높은 유형이 더 높은 점수를 가진다', () => {
    const bad = reviewScore(stat({ typeId: 'bad', correct: 2 }), now);
    const good = reviewScore(stat({ typeId: 'good', correct: 9 }), now);
    expect(bad.score).toBeGreaterThan(good.score);
  });

  it('streak 이 커지면 복습 간격이 늘어난다', () => {
    expect(intervalForStreak(0)).toBe(0);
    expect(intervalForStreak(1)).toBeLessThan(intervalForStreak(3));
  });

  it('복습 큐는 점수 내림차순', () => {
    const q = buildReviewQueue(
      [stat({ typeId: 'a', correct: 9 }), stat({ typeId: 'b', correct: 1 })],
      now,
    );
    expect(q[0]?.typeId).toBe('b');
  });
});

describe('level', () => {
  it('레벨 1 은 0 XP', () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it('XP 가 늘면 레벨이 오른다', () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(10_000).level).toBeGreaterThan(1);
  });

  it('진행 비율은 0..1 범위', () => {
    const p = levelFromXp(250);
    expect(p.ratio).toBeGreaterThanOrEqual(0);
    expect(p.ratio).toBeLessThanOrEqual(1);
  });
});

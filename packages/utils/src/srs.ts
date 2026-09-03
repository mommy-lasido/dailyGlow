/**
 * "자주 틀리는 유형 반복 학습" 을 위한 아주 단순한 간격 반복(spaced repetition) 로직.
 * 유형(type)별 정답/오답 이력을 받아 다음 복습 우선순위 점수를 계산한다.
 * 점수가 높을수록 먼저 다시 풀려야 하는 유형.
 */

export interface TypeStat {
  /** 문제 유형 식별자 (예: "math.add.carry") */
  typeId: string;
  attempts: number;
  correct: number;
  /** 마지막으로 푼 시각 (epoch ms) */
  lastSeenAt: number;
  /** 연속 정답 수 */
  streak: number;
}

export interface ReviewScore {
  typeId: string;
  score: number;
  accuracy: number;
  overdue: boolean;
}

const DAY = 24 * 60 * 60 * 1000;

/** streak 에 따라 다음 복습까지 권장 간격(ms). 0,1,2,3,4+ -> 즉시, 1일, 3일, 7일, 14일 */
export function intervalForStreak(streak: number): number {
  const table = [0, 1, 3, 7, 14];
  return (table[Math.min(streak, table.length - 1)] ?? 14) * DAY;
}

export function reviewScore(stat: TypeStat, now: number): ReviewScore {
  const accuracy = stat.attempts === 0 ? 0 : stat.correct / stat.attempts;
  const elapsed = now - stat.lastSeenAt;
  const interval = intervalForStreak(stat.streak);
  const overdue = elapsed >= interval;

  // 오답률이 높을수록, 복습 시점이 지났을수록 점수가 커진다.
  const errorWeight = (1 - accuracy) * 100;
  const overdueWeight = interval === 0 ? 50 : Math.min(elapsed / interval, 3) * 20;
  const coldStart = stat.attempts < 3 ? 15 : 0;

  return {
    typeId: stat.typeId,
    score: Math.round(errorWeight + overdueWeight + coldStart),
    accuracy,
    overdue,
  };
}

/** 복습 큐: 점수 내림차순으로 정렬된 유형 목록 */
export function buildReviewQueue(stats: TypeStat[], now: number): ReviewScore[] {
  return stats
    .map((s) => reviewScore(s, now))
    .sort((a, b) => b.score - a.score);
}

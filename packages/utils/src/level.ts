/**
 * 레벨 / 경험치 시스템.
 * 레벨 n -> n+1 로 올라가는 데 필요한 누적 XP 는 완만한 곡선(제곱근 기반의 역함수)으로 계산한다.
 * 아이 대상이라 초반 레벨업이 빠르고 뒤로 갈수록 천천히 오르도록 설계.
 */

const BASE_XP = 100;
const GROWTH = 1.35;

/** 해당 레벨에 "도달"하기 위해 필요한 누적 XP. level 1 == 0 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let l = 1; l < level; l += 1) {
    total += Math.round(BASE_XP * Math.pow(GROWTH, l - 1));
  }
  return total;
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  ratio: number;
}

/** 누적 XP 로부터 현재 레벨과 다음 레벨까지의 진행도를 구한다. */
export function levelFromXp(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level += 1;
  }
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const xpIntoLevel = xp - floor;
  const xpForNextLevel = ceil - floor;
  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    ratio: xpForNextLevel === 0 ? 1 : xpIntoLevel / xpForNextLevel,
  };
}

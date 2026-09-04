/**
 * 프로필 도메인: 학년 · 읽기 수준 · 성별 타입과 추천값 계산.
 *
 * 추천값은 온보딩에서 "이 정도일 것 같아요" 하고 미리 채워주는 용도다.
 * 최종 결정은 항상 사람이 한다 — 조기입학이나 학제 차이 때문에
 * 생일만으로 학년을 확정하면 틀린다.
 */

export const GRADES = ['preschool', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6'] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_LABEL: Record<Grade, string> = {
  preschool: '미취학',
  g1: '초등 1학년',
  g2: '초등 2학년',
  g3: '초등 3학년',
  g4: '초등 4학년',
  g5: '초등 5학년',
  g6: '초등 6학년',
};

export const READING_LEVELS = ['pre_reader', 'learning', 'fluent'] as const;
export type ReadingLevel = (typeof READING_LEVELS)[number];

export const READING_LEVEL_LABEL: Record<ReadingLevel, string> = {
  pre_reader: '아직 못 읽어요',
  learning: '배우는 중이에요',
  fluent: '혼자 잘 읽어요',
};

export type Gender = 'female' | 'male';

export const GENDER_LABEL: Record<Gender, string> = {
  female: '여자',
  male: '남자',
};

export const DAILY_GOAL_OPTIONS = [5, 10, 15, 20] as const;

/** 학년 서수. DB 의 lessons.min_grade / max_grade 와 같은 매핑이다. */
export function gradeOrdinal(grade: Grade): number {
  return GRADES.indexOf(grade);
}

/** 서수를 학년으로 되돌린다. 범위를 벗어나면 양 끝으로 자른다. */
export function gradeFromOrdinal(ord: number): Grade {
  const clamped = Math.min(Math.max(Math.round(ord), 0), GRADES.length - 1);
  return GRADES[clamped]!;
}

/** 만 나이 */
function ageAt(birthDate: Date, today: Date): number {
  let age = today.getFullYear() - birthDate.getFullYear();
  const beforeBirthday =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * 한국 학제 기준 추천 학년.
 * 초등학교는 만 6세가 된 해의 다음 해 3월에 입학하므로 입학연도 = 출생연도 + 7.
 * 학년도는 3월에 바뀐다.
 */
export function recommendGrade(birthDate: Date, today: Date): Grade {
  const entryYear = birthDate.getFullYear() + 7;
  // 3월 이전이면 아직 지난 학년도
  const schoolYear = today.getMonth() >= 2 ? today.getFullYear() : today.getFullYear() - 1;
  const gradeNumber = schoolYear - entryYear + 1;
  if (gradeNumber < 1) return 'preschool';
  return gradeFromOrdinal(Math.min(gradeNumber, 6));
}

/** 추천 읽기 수준. 미취학이라도 만 5세부터는 한글을 배우기 시작한다고 본다. */
export function recommendReadingLevel(
  grade: Grade,
  birthDate: Date,
  today: Date,
): ReadingLevel {
  if (grade === 'preschool') {
    return ageAt(birthDate, today) >= 5 ? 'learning' : 'pre_reader';
  }
  return gradeOrdinal(grade) <= 2 ? 'learning' : 'fluent';
}

/**
 * 추천 한글 단계.
 *
 * 여기서 돌려주는 숫자는 '기적의 한글 학습'(길벗스쿨, 5권 35단계)의 단계 번호(1~35)다.
 * 한글 과목에서는 profile_subject_levels.level 이 곧 이 단계 번호다.
 *
 * 읽기 수준만으로 단계를 정확히 맞힐 수는 없다. 온보딩에서 "이 정도부터 시작해 볼까요" 하고
 * 제안하는 값일 뿐이고, 부모가 설정 화면에서 언제든 바꿀 수 있다.
 *   - 아직 못 읽어요 → 1단계 (기본 모음부터)
 *   - 배우는 중이에요 → 4단계 (낱말 읽기가 열리는 지점)
 *   - 혼자 잘 읽어요 → 35단계 (한글 과정을 뗀 것으로 본다)
 */
export function recommendHangulStage(readingLevel: ReadingLevel | null): number {
  if (readingLevel === 'fluent') return 35;
  if (readingLevel === 'learning') return 4;
  return 1;
}

/** 추천 하루 목표 시간(분). 어릴수록 짧게. */
export function recommendDailyGoalMinutes(grade: Grade): number {
  const ord = gradeOrdinal(grade);
  if (ord === 0) return 5;
  if (ord <= 2) return 10;
  if (ord <= 4) return 15;
  return 20;
}

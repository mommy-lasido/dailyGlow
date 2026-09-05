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

/**
 * 생일 입력에 허용할 가장 이른 날.
 * 이보다 먼저 태어난 아이는 초등 과정을 이미 지났다.
 */
export const BIRTH_DATE_MIN = '2005-01-01';

/**
 * `<input type="date">` 의 max 에 넣을 오늘 날짜(YYYY-MM-DD).
 *
 * min/max 가 없으면 브라우저가 202511 같은 여섯 자리 연도도 그대로 받아준다.
 * toISOString() 은 UTC 라 한국 시간으로 저녁이면 하루 전 날짜가 나오므로
 * 지역 시간 그대로 직접 만든다.
 */
export function toISODate(date: Date = new Date()): string {
  const yyyy = String(date.getFullYear()).padStart(4, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 이름 뒤에 붙일 호격 조사를 고른다 — 받침이 있으면 '아', 없으면 '야'.
 *
 * 예전에는 무조건 '아' 를 붙였다. '라윤아' 는 맞지만 '지호아' 는 틀린다.
 *
 * 한글 음절은 유니코드에서 (초성 × 중성 × 종성) 순서로 촘촘히 배열돼 있고
 * 종성이 '없음' 을 포함해 28가지다. 그래서 (코드포인트 - 0xAC00) % 28 이
 * 0 이면 받침이 없는 글자다.
 *
 * 마지막 글자가 한글 음절이 아니면(영어 이름, 이모지) 받침을 따질 수 없다.
 * 이때는 어느 쪽에도 덜 어색한 '야' 를 쓴다.
 */
export function vocativeParticle(name: string): string {
  const last = name.trim().at(-1);
  if (!last) return '야';

  const code = last.codePointAt(0)!;
  const isHangulSyllable = code >= 0xac00 && code <= 0xd7a3;
  if (!isHangulSyllable) return '야';

  return (code - 0xac00) % 28 !== 0 ? '아' : '야';
}

/**
 * 저장된 이름을 입력 폼의 두 칸(성 · 이름)으로 되돌린다.
 *
 * display_name 은 성을 포함한 온전한 이름, given_name 은 성을 뺀 이름이다.
 * given_name 이 없는 예전 행은 온전한 이름을 이름 칸에 넣는다 — 성을 자동으로
 * 떼어내면 남궁·선우 같은 두 글자 성에서 틀린다.
 */
export function splitName(
  displayName: string | null,
  givenName: string | null,
): { familyName: string; givenName: string } {
  const full = (displayName ?? '').trim();
  const given = (givenName ?? '').trim();

  if (!given) return { familyName: '', givenName: full };
  if (full.endsWith(given)) {
    return { familyName: full.slice(0, full.length - given.length), givenName: given };
  }
  // 둘이 서로 안 맞으면(손으로 고친 데이터) 이름만 믿는다.
  return { familyName: '', givenName: given };
}

/** 성 + 이름을 온전한 이름으로 합친다. 성이 비어 있으면 이름만 남는다. */
export function joinName(familyName: string, givenName: string): string {
  return `${familyName.trim()}${givenName.trim()}`;
}

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

/**
 * 한글 단계 조절 UI(단계 고르기 · 여기서 멈춰 · 지금 단계 설명)를 숨긴다면 그 이유.
 * `null` 이면 보여준다.
 *
 * 한글 활동(자음모음 배우기 · 낱말 읽기 · 문장 읽기 · 쓰기 연습지)은 전부
 * min_grade 0, max_grade 1 로 등록돼 있어 미취학·초1 을 넘어가면 아예 나오지
 * 않는다. 그리고 '혼자 잘 읽어요'(fluent) 는 35단계(교재를 뗀 것)로 취급해
 * 더 낮출 이유가 없다. 이 두 경우엔 단계 숫자를 바꿔도 실제로는 아무것도
 * 달라지지 않으니, 뜻 없는 드롭다운을 보여주느니 이유를 말해주는 편이 낫다.
 *
 * 온보딩·설정 화면이 서로 다른 조건으로 판단하면 "설정에서는 보이는데
 * 온보딩에서는 안 보인다" 같은 불일치가 생긴다. 그래서 두 화면 모두 이 함수
 * 하나로만 판단한다.
 *
 * 학년을 아직 고르지 않았으면(빈 값) 부모가 말하지 않은 학년을 함부로
 * 가정하지 않는다 — 조건을 만족하는 것으로 보고 보여준다.
 */
export type HangulStageHiddenReason = 'grade' | 'fluent';

export function hangulStageHiddenReason(
  grade: Grade | '',
  readingLevel: ReadingLevel | '',
): HangulStageHiddenReason | null {
  if (grade !== '' && gradeOrdinal(grade) > 1) return 'grade';
  if (readingLevel === 'fluent') return 'fluent';
  return null;
}

/** 위 각 이유에 맞춰 컨트롤이 있던 자리에 그대로 보여줄 한 줄 설명. */
export const HANGUL_STAGE_HIDDEN_MESSAGE: Record<HangulStageHiddenReason, string> = {
  grade: '한글 활동은 초등 2학년부터는 나오지 않아서, 단계는 쓰이지 않아요.',
  fluent: '한글을 다 뗀 것으로 보고 있어요. 위에서 읽기 수준을 바꾸면 단계가 다시 나타나요.',
};

/** 추천 하루 목표 시간(분). 어릴수록 짧게. */
export function recommendDailyGoalMinutes(grade: Grade): number {
  const ord = gradeOrdinal(grade);
  if (ord === 0) return 5;
  if (ord <= 2) return 10;
  if (ord <= 4) return 15;
  return 20;
}

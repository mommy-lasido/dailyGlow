/**
 * 한글 35단계 교육과정표.
 *
 * 출처: 『기적의 한글 학습』(길벗스쿨, 5권 35단계). 책 뒤표지의 단계표를 그대로 옮겼다.
 * profile_subject_levels 에서 한글 과목의 level 이 곧 여기 stage 번호(1~35)다.
 *
 * Phase 2 의 자모 게이팅(어느 단계까지 배운 아이에게 어떤 글자를 보여줄지)과
 * 낱말·문장 콘텐츠를 이 표 위에 얹는다. 다시 만들지 말고 여기를 고쳐 쓸 것.
 *
 * 아직 옮기지 않은 것: 책마다 3단계와 7단계 뒤에 '복습' 이, 권 끝에 '정리 학습' 이
 * 하나씩 더 있다. Phase 2 에서 중간 점검 지점으로 쓸 수 있다.
 */

export interface HangulStage {
  /** 1~35. 한글 과목의 profile_subject_levels.level 과 같은 번호다. */
  stage: number;
  /** 이 단계가 실린 권 (1~5) */
  book: number;
  /** 무엇을 배우는지 — 단계표의 왼쪽 칸 */
  label: string;
  /** 그 단계에 나오는 낱말 예시. 34·35단계처럼 예시가 없으면 빈 문자열. */
  examples: string;
}

export interface HangulBook {
  book: number;
  /** 책에 적힌 권 제목 그대로 */
  title: string;
  /** <optgroup> 처럼 폭이 좁은 곳에 쓸 짧은 제목 */
  shortTitle: string;
}

export const HANGUL_BOOKS: HangulBook[] = [
  { book: 1, title: '기본자 학습 1', shortTitle: '기본자 학습 1' },
  { book: 2, title: '기본자 학습 2', shortTitle: '기본자 학습 2' },
  { book: 3, title: '받침 학습', shortTitle: '받침 학습' },
  { book: 4, title: '복잡한 모음 학습', shortTitle: '복잡한 모음 학습' },
  {
    book: 5,
    title: '쌍자음과 한글을 예쁘게 쓰는 순서 1, 2',
    // 원 제목이 길어 드롭다운 머리글에서 줄이 넘친다. 데이터에는 원문을 남겨 둔다.
    shortTitle: '쌍자음과 예쁘게 쓰기',
  },
];

export const HANGUL_STAGES: HangulStage[] = [
  // 1권 · 기본자 학습 1
  { stage: 1, book: 1, label: "기본 모음 'ㅏ'", examples: 'ㅏ ㅑ ㅓ ㅕ ㅗ ㅛ ㅜ ㅠ ㅡ ㅣ' },
  { stage: 2, book: 1, label: "기본 자음 'ㄱ'", examples: '가, 갸, 거, 겨…' },
  { stage: 3, book: 1, label: "기본 자음 'ㄴ'", examples: '나, 냐, 너, 녀…' },
  { stage: 4, book: 1, label: "기본 자음 'ㄷ'", examples: '다, 댜, 더, 뎌…' },
  { stage: 5, book: 1, label: "기본 자음 'ㄹ'", examples: '라, 랴, 러, 려…' },
  { stage: 6, book: 1, label: "기본 자음 'ㅁ'", examples: '마, 먀, 머, 며…' },
  { stage: 7, book: 1, label: "기본 자음 'ㅂ'", examples: '바, 뱌, 버, 벼…' },

  // 2권 · 기본자 학습 2
  { stage: 8, book: 2, label: "기본 자음 'ㅅ'", examples: '사, 샤, 서, 셔…' },
  { stage: 9, book: 2, label: "기본 자음 'ㅈ'", examples: '자, 쟈, 저, 져…' },
  { stage: 10, book: 2, label: "기본 자음 'ㅊ'", examples: '차, 챠, 처, 쳐…' },
  { stage: 11, book: 2, label: "기본 자음 'ㅋ'", examples: '카, 캬, 커, 켜…' },
  { stage: 12, book: 2, label: "기본 자음 'ㅌ'", examples: '타, 탸, 터, 텨…' },
  { stage: 13, book: 2, label: "기본 자음 'ㅍ'", examples: '파, 퍄, 퍼, 펴…' },
  { stage: 14, book: 2, label: "기본 자음 'ㅎ'", examples: '하, 햐, 허, 혀…' },

  // 3권 · 받침 학습
  { stage: 15, book: 3, label: "기본 받침 'ㅇ'", examples: '강, 방, 상, 장…' },
  { stage: 16, book: 3, label: "기본 받침 'ㅁ'", examples: '곰, 몸, 봄, 솜…' },
  { stage: 17, book: 3, label: "기본 받침 'ㄹ'", examples: '굴, 물, 불, 풀…' },
  { stage: 18, book: 3, label: "기본 받침 'ㄴ'", examples: '눈, 돈, 반, 손…' },
  { stage: 19, book: 3, label: "기본 받침 'ㄱ'", examples: '목, 벽, 죽, 턱…' },
  { stage: 20, book: 3, label: "기본 받침 'ㅂ'", examples: '답, 밥, 입, 탑…' },
  { stage: 21, book: 3, label: "기본 받침 'ㅅ'", examples: '맛, 옷, 빗, 엿…' },

  // 4권 · 복잡한 모음 학습
  { stage: 22, book: 4, label: "복잡한 모음 'ㅐ'", examples: '개, 배, 새, 해…' },
  { stage: 23, book: 4, label: "복잡한 모음 'ㅔ'", examples: '게, 네, 세, 체…' },
  { stage: 24, book: 4, label: "복잡한 모음 'ㅟ'", examples: '귀, 뒤, 위, 쥐…' },
  { stage: 25, book: 4, label: "복잡한 모음 'ㅘ, ㅢ'", examples: '과자, 기와, 의사, 유희…' },
  { stage: 26, book: 4, label: "복잡한 모음 'ㅚ, ㅙ'", examples: '쇠, 죄, 돼지, 횃불…' },
  { stage: 27, book: 4, label: "복잡한 모음 'ㅝ, ㅞ'", examples: '뭐, 병원, 훼방, 웬일…' },
  { stage: 28, book: 4, label: "복잡한 모음 'ㅒ, ㅖ'", examples: '얘, 걔, 예, 시계…' },

  // 5권 · 쌍자음과 한글을 예쁘게 쓰는 순서 1, 2
  { stage: 29, book: 5, label: "쌍자음 'ㄲ'", examples: '꾀, 깨, 꼬마, 꿈…' },
  { stage: 30, book: 5, label: "쌍자음 'ㄸ'", examples: '띠, 때, 떡, 딱지…' },
  { stage: 31, book: 5, label: "쌍자음 'ㅃ'", examples: '뼈, 뽀뽀, 빵, 뿔…' },
  { stage: 32, book: 5, label: "쌍자음 'ㅆ'", examples: '씨, 쓰다, 쌀, 눈썹…' },
  { stage: 33, book: 5, label: "쌍자음 'ㅉ'", examples: '짜다, 찌르다, 짹짹, 번쩍…' },
  { stage: 34, book: 5, label: '한글을 예쁘게 쓰는 순서 1', examples: '' },
  { stage: 35, book: 5, label: '한글을 예쁘게 쓰는 순서 2', examples: '' },
];

/** 단계 번호로 찾는다. 1~35 밖이면 undefined. */
export function hangulStage(stage: number): HangulStage | undefined {
  return HANGUL_STAGES.find((s) => s.stage === stage);
}

/**
 * 드롭다운 한 줄에 쓸 문구 — `4단계 · 기본 자음 'ㄷ' (다, 댜, 더, 뎌…)`.
 * 예시가 없는 34·35단계에서는 괄호를 아예 붙이지 않는다.
 */
export function hangulStageOptionLabel(s: HangulStage): string {
  const examples = s.examples ? ` (${s.examples})` : '';
  return `${s.stage}단계 · ${s.label}${examples}`;
}

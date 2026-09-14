/**
 * 수학(연산) 40단계 교육과정표.
 *
 * 출처: 『기적의 계산법 예비초등』 1~5권 (길벗스쿨, 기적학습연구소).
 * 초등 1학년 연산 전 과정을 40단계로 나눠 놓은 책이고, 한글 쪽에서 쓰는
 * 『기적의 한글 학습』과 **같은 출판사·같은 짜임**이라 나란히 놓기 좋다.
 *
 * 차례는 내가 짓지 않는다. 영숙님이 정한 규칙이다 — 학습 내용과 단계 순서는
 * 실제로 많이 팔리는 시중 교재의 순서를 그대로 따른다. 짐작으로 순서를 지어내면
 * 반드시 어긋나는 데가 생긴다.
 *
 * `profile_subject_levels` 에서 수학 과목의 level 이 곧 여기 stage 번호(1~40)다.
 */

export interface MathStage {
  /** 1~40. 수학 과목의 profile_subject_levels.level 과 같은 번호다. */
  stage: number;
  /** 이 단계가 실린 권 (1~5) */
  book: number;
  /** 무엇을 배우는지 — 책 차례의 이름 그대로 */
  label: string;
}

export interface MathBook {
  book: number;
  title: string;
  /** 이 권이 다루는 단계 범위 */
  from: number;
  to: number;
}

export const MATH_BOOKS: MathBook[] = [
  { book: 1, title: '수와 연산의 첫걸음', from: 1, to: 8 },
  { book: 2, title: '9까지의 덧셈과 뺄셈', from: 9, to: 16 },
  { book: 3, title: '10을 이용한 셈', from: 17, to: 24 },
  { book: 4, title: '10보다 큰 덧셈과 뺄셈', from: 25, to: 32 },
  { book: 5, title: '두 자리 수', from: 33, to: 40 },
];

export const MATH_STAGES: MathStage[] = [
  // 1권 — 수를 알고, 기호 없이 더하고 빼는 데까지
  { stage: 1, book: 1, label: '10까지의 수' },
  { stage: 2, book: 1, label: '수의 순서' },
  { stage: 3, book: 1, label: '수직선' },
  { stage: 4, book: 1, label: '연산 기호가 없는 덧셈' },
  { stage: 5, book: 1, label: '연산 기호가 없는 뺄셈' },
  { stage: 6, book: 1, label: '+, -, = 기호' },
  { stage: 7, book: 1, label: '구조적 연산 훈련 ①' },
  { stage: 8, book: 1, label: '구조적 연산 훈련 ②' },

  // 2권 — 모으기·가르기에서 9까지의 덧셈과 뺄셈으로
  { stage: 9, book: 2, label: '2~9 모으기 가르기 ①' },
  { stage: 10, book: 2, label: '2~9 모으기 가르기 ②' },
  { stage: 11, book: 2, label: '9까지의 덧셈 ①' },
  { stage: 12, book: 2, label: '9까지의 덧셈 ②' },
  { stage: 13, book: 2, label: '9까지의 뺄셈 ①' },
  { stage: 14, book: 2, label: '9까지의 뺄셈 ②' },
  { stage: 15, book: 2, label: '덧셈식과 뺄셈식' },
  { stage: 16, book: 2, label: '덧셈과 뺄셈 종합' },

  // 3권 — 10을 사이에 두고
  { stage: 17, book: 3, label: '10 모으기와 가르기' },
  { stage: 18, book: 3, label: '10이 되는 덧셈' },
  { stage: 19, book: 3, label: '10에서 빼는 뺄셈' },
  { stage: 20, book: 3, label: '19까지의 수' },
  { stage: 21, book: 3, label: '십몇의 순서' },
  { stage: 22, book: 3, label: '(십몇)+(몇), (십몇)-(몇)' },
  { stage: 23, book: 3, label: '10을 이용한 덧셈' },
  { stage: 24, book: 3, label: '10을 이용한 뺄셈' },

  // 4권 — 받아올림·받아내림
  { stage: 25, book: 4, label: '10보다 큰 덧셈 ①' },
  { stage: 26, book: 4, label: '10보다 큰 덧셈 ②' },
  { stage: 27, book: 4, label: '10보다 큰 덧셈 ③' },
  { stage: 28, book: 4, label: '10보다 큰 뺄셈 ①' },
  { stage: 29, book: 4, label: '10보다 큰 뺄셈 ②' },
  { stage: 30, book: 4, label: '10보다 큰 뺄셈 ③' },
  { stage: 31, book: 4, label: '덧셈과 뺄셈의 성질' },
  { stage: 32, book: 4, label: '덧셈과 뺄셈 종합' },

  // 5권 — 두 자리 수
  { stage: 33, book: 5, label: '몇십의 구조' },
  { stage: 34, book: 5, label: '몇십몇의 구조' },
  { stage: 35, book: 5, label: '두 자리 수의 순서' },
  { stage: 36, book: 5, label: '몇십의 덧셈과 뺄셈' },
  { stage: 37, book: 5, label: '몇십몇의 덧셈 ①' },
  { stage: 38, book: 5, label: '몇십몇의 덧셈 ②' },
  { stage: 39, book: 5, label: '몇십몇의 뺄셈 ①' },
  { stage: 40, book: 5, label: '몇십몇의 뺄셈 ②' },
];

/** 이 단계표가 다루는 마지막 단계 */
export const MATH_MAX_STAGE = MATH_STAGES.length;

export function mathStage(stage: number): MathStage | null {
  return MATH_STAGES.find((s) => s.stage === stage) ?? null;
}

/** 이 단계가 실린 권 */
export function mathBook(stage: number): MathBook | null {
  const found = mathStage(stage);
  return found ? (MATH_BOOKS.find((b) => b.book === found.book) ?? null) : null;
}

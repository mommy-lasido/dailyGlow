/**
 * 정답이 있는 활동(choice_quiz)의 한 판을 굴리는 상태 기계. spec §14.
 *
 *   1차  전체를 쭉 푼다 — 맞았는지 그때그때 알려주지 않는다
 *   2차  1차에 틀린 것만 다시
 *   3차  2차에도 틀린 것에 힌트를 띄우고, 맞힐 때까지
 *
 * 점수(firstTryCorrect)는 1차 것만 센다. 2·3차에 맞힌 건 "결국 이해했다"는
 * 뜻이지 실력 수치가 아니다.
 *
 * 화면과 문제 내용을 전혀 모른다 — 맞았는지 여부만 받는다. 그래서 더하기 놀이와
 * 맞춤법 탐험대가 같은 모듈을 쓴다.
 */

export interface QuizState {
  /** 1차에 낸 문제 수 */
  total: number;
  round: 1 | 2 | 3;
  phase: 'solving' | 'grading' | 'done';
  /** 이번 라운드에 풀 문제의 index 목록 */
  queue: number[];
  /** queue 안에서의 위치 */
  cursor: number;
  /** 이번 라운드에서 틀린 문제 index */
  missed: number[];
  /** 1차 정답 개수 = 기록에 남는 점수 */
  firstTryCorrect: number;
  /** 라운드별 정답 개수. "7개 → 9개 → 10개" 를 보여주는 데 쓴다. */
  roundScores: number[];
}

export function createQuiz(total: number): QuizState {
  return {
    total,
    round: 1,
    phase: 'solving',
    queue: Array.from({ length: total }, (_, i) => i),
    cursor: 0,
    missed: [],
    firstTryCorrect: 0,
    roundScores: [],
  };
}

/** 지금 풀 문제의 index. 이번 라운드를 다 풀었으면 null. */
export function currentIndex(s: QuizState): number | null {
  if (s.phase !== 'solving') return null;
  return s.queue[s.cursor] ?? null;
}

export function submit(s: QuizState, isCorrect: boolean): QuizState {
  if (s.phase !== 'solving') return s;
  const index = s.queue[s.cursor];
  if (index === undefined) return s;

  // 3차는 맞힐 때까지 같은 문제에 머문다.
  if (s.round === 3 && !isCorrect) return s;

  const missed = isCorrect ? s.missed : [...s.missed, index];
  const cursor = s.cursor + 1;
  const firstTryCorrect =
    s.round === 1 && isCorrect ? s.firstTryCorrect + 1 : s.firstTryCorrect;

  // 아직 남았으면 다음 문제로.
  if (cursor < s.queue.length) {
    return { ...s, cursor, missed, firstTryCorrect };
  }

  const scored = s.queue.length - missed.length;
  const roundScores = [...s.roundScores, scored];

  // 3차는 전부 맞혀야만 여기 도달하므로 곧바로 끝난다.
  if (s.round === 3) {
    return { ...s, cursor, missed, firstTryCorrect, roundScores, phase: 'done' };
  }

  return { ...s, cursor, missed, firstTryCorrect, roundScores, phase: 'grading' };
}

/** 채점 화면에서 "계속" 을 눌렀을 때. 틀린 게 없으면 끝난다. */
export function nextRound(s: QuizState): QuizState {
  if (s.phase !== 'grading') return s;
  if (s.missed.length === 0) return { ...s, phase: 'done' };

  return {
    ...s,
    round: (s.round + 1) as 2 | 3,
    phase: 'solving',
    queue: s.missed,
    cursor: 0,
    missed: [],
  };
}

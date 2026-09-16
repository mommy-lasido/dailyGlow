/**
 * 스물이 넘는 수를 익히는 문제 만들기.
 *
 * **스물을 넘어가면 그림을 셀 수 없다.** 사과 여든일곱 개를 화면에 그릴 수는 없고,
 * 그릴 수 있다 해도 아이가 하나씩 짚어 세다가 지친다. 그래서 스물부터는 하는 일이
 * 달라진다 — 세는 것이 아니라 **읽고 순서를 아는 것**이다. 시중 교재도 여기서
 * 성격이 바뀐다(9까지의 수 → 50까지의 수 → 100까지의 수).
 *
 * 두 가지를 낸다.
 *   **듣고 찾기** — "서른하나" 를 듣고 31 을 고른다. 읽는 법을 익힌다.
 *   **빈칸 채우기** — 28 29 □ 31 32 에서 빠진 수를 찾는다. 순서를 익힌다.
 *                    라윤이가 쓰던 수 배열판(100칸)을 한 줄로 자른 것과 같다.
 */

/** 한자어 수 읽기의 낱자리. 21 → '이십일' */
const SINO_ONES = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'] as const;

/**
 * 숫자를 소리 내어 읽는 말. 100까지만 다룬다.
 *
 * 한자어로 읽는다 — 숫자 31 을 보고 읽을 때 쓰는 말이 '삼십일' 이기 때문이다.
 * (열 이하를 그림으로 셀 때 쓰는 '하나 둘 셋' 은 세는 말이라 쓰임이 다르다.)
 */
export function readNumber(n: number): string {
  if (n === 100) return '백';
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const tensText = tens === 0 ? '' : tens === 1 ? '십' : `${SINO_ONES[tens]}십`;
  return `${tensText}${SINO_ONES[ones]}` || '영';
}

export interface NumberProblem {
  answer: number;
  choices: number[];
  /**
   * 빈칸 채우기일 때의 수 줄. 빈칸은 null 이다.
   * 듣고 찾기일 때는 null — 줄이 없다.
   */
  sequence: (number | null)[] | null;
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** 두 자리 수의 십의 자리와 일의 자리를 뒤집는다. 31 → 13. 못 뒤집으면 null. */
function swapDigits(n: number): number | null {
  if (n < 10 || n > 99) return null;
  const flipped = (n % 10) * 10 + Math.floor(n / 10);
  return flipped === n || flipped < 1 ? null : flipped;
}

/**
 * 오답 둘을 고른다.
 *
 * 아무 수나 붙이면 듣지 않고도 답이 보인다. **아이가 실제로 헷갈리는 것**을 붙인다.
 *   자리 바꾸기 — 31 과 13. '삼십일' 과 '십삼' 을 가르는 것이 두 자리 수 읽기의 고비다.
 *   십의 자리 이웃 — 31 과 41. 십의 자리를 잘못 들으면 이렇게 된다.
 *   바로 옆 수 — 31 과 32. 일의 자리를 잘못 들으면 이렇게 된다.
 */
export function pickNumberDistractors(
  answer: number,
  max: number,
  rand: () => number = Math.random,
): number[] {
  const candidates: number[] = [];
  const add = (n: number | null) => {
    if (n === null) return;
    if (n < 1 || n > max || n === answer) return;
    if (!candidates.includes(n)) candidates.push(n);
  };

  add(swapDigits(answer));
  add(answer + 10);
  add(answer - 10);
  add(answer + 1);
  add(answer - 1);
  // 그래도 모자라면(1, 2 처럼 이웃이 없는 수) 아무 수로나 채운다.
  for (let n = 1; n <= max && candidates.length < 2; n += 1) add(n);

  return shuffle(candidates, rand).slice(0, 2);
}

/** 수 하나와 보기 셋. */
function makeOne(
  answer: number,
  max: number,
  sequence: (number | null)[] | null,
  rand: () => number,
): NumberProblem {
  const wrong = pickNumberDistractors(answer, max, rand);
  return { answer, choices: shuffle([answer, ...wrong], rand), sequence };
}

/** 빈칸 채우기 한 줄. 답을 가운데 두고 앞뒤로 늘어놓는다. */
function makeSequence(answer: number, step: number, max: number): (number | null)[] {
  const row: (number | null)[] = [];
  for (let i = -2; i <= 2; i += 1) {
    const n = answer + i * step;
    // 줄 끝이 1보다 작거나 max 를 넘으면 그 자리는 비워 두지 않고 아예 뺀다.
    if (n >= 1 && n <= max) row.push(i === 0 ? null : n);
  }
  return row;
}

/**
 * 한 판 분량.
 *
 * 듣고 찾기와 빈칸 채우기를 **번갈아** 낸다. 한 가지만 내리 풀면 아이가 요령으로
 * 넘기고, 두 가지가 섞이면 매번 무엇을 묻는지 보게 된다.
 *
 * `step` 이 10 이면 열씩 뛰어 세기다 — 10 20 □ 40 50. 교과서에서 100까지 세기와
 * 한 묶음으로 나오는 내용이고, 하나씩 세는 것과는 다른 공부다.
 */
export function makeNumberSet(
  max: number,
  count: number,
  step = 1,
  rand: () => number = Math.random,
): NumberProblem[] {
  // 뽑을 수 있는 수들. 뛰어 세기는 10, 20, 30 … 만 쓴다.
  const pool: number[] = [];
  for (let n = step; n <= max; n += step) pool.push(n);

  return shuffle(pool, rand)
    .slice(0, Math.min(count, pool.length))
    .map((answer, i) => {
      const withSequence = i % 2 === 1 || step > 1;
      return makeOne(answer, max, withSequence ? makeSequence(answer, step, max) : null, rand);
    });
}

/** 문제마다 무엇을 묻는지. */
export function numberQuestion(p: NumberProblem): string {
  return p.sequence ? '빠진 수는 무엇일까?' : '어떤 수일까?';
}

/**
 * 수의 순서 — 빠진 수 채우기만 낸다.
 *
 * 『기적의 계산법 예비초등』 2단계다. 20까지 읽기에서도 빠진 수를 채우지만,
 * 거기는 듣고 찾기와 번갈아 나온다. 이 단계는 **순서 하나만** 붙잡는 자리라
 * 줄에서 빠진 수를 찾는 것만 낸다.
 */
export function makeOrderSet(
  max: number,
  count: number,
  rand: () => number = Math.random,
): NumberProblem[] {
  const pool: number[] = [];
  for (let n = 1; n <= max; n += 1) pool.push(n);

  return shuffle(pool, rand)
    .slice(0, Math.min(count, pool.length))
    .map((answer) => makeOne(answer, max, makeSequence(answer, 1, max), rand));
}

export interface LineProblem extends NumberProblem {
  /** 수직선의 끝 수. 0 부터 이 수까지 그린다. */
  lineMax: number;
}

/**
 * 수직선 — 화살표가 가리키는 수 찾기.
 *
 * 『기적의 계산법 예비초등』 3단계다. 수를 세는 것도 읽는 것도 아니고, **수가
 * 줄 위에 나란히 놓여 있다**는 것을 아는 자리다. 이것을 알아야 나중에 "7은 5보다
 * 오른쪽" 같은 말이 뜻을 갖는다.
 *
 * 오답은 바로 옆 수로 낸다. 멀리 있는 수를 붙이면 화살표를 안 보고도 답이 보인다.
 */
export function makeLineSet(
  max: number,
  count: number,
  rand: () => number = Math.random,
): LineProblem[] {
  const pool: number[] = [];
  for (let n = 1; n <= max; n += 1) pool.push(n);

  return shuffle(pool, rand)
    .slice(0, Math.min(count, pool.length))
    .map((answer) => {
      const near = [answer - 1, answer + 1, answer - 2, answer + 2].filter(
        (n) => n >= 0 && n <= max && n !== answer,
      );
      const wrong = shuffle(near, rand).slice(0, 2);
      return {
        answer,
        choices: shuffle([answer, ...wrong], rand),
        sequence: null,
        lineMax: max,
      };
    });
}

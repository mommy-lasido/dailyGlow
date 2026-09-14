/**
 * 모으기와 가르기.
 *
 * 『기적의 계산법 예비초등』 9·10단계다. 표를 옮겨 놓고 보니 **모으기·가르기가
 * 덧셈보다 먼저**였다 — 교재의 뼈대다.
 *
 * "5는 2와 3" 을 몸으로 아는 아이는 2+3 을 셈으로 푼다. 그것이 없으면 손가락을
 * 하나씩 세어 답을 얻고, 수가 커지면 손가락이 모자라 막힌다. 덧셈을 가르치기 전에
 * 이 걸음을 밟아야 하는 까닭이다.
 *
 * 화면에 그리는 모양은 교재의 **모으기·가르기 판**을 그대로 따른다.
 *
 *        5            ← 전체
 *       ╱ ╲
 *      2   3          ← 두 몫
 *
 * 모으기는 아래 둘을 주고 위를 묻고, 가르기는 위와 아래 하나를 주고 나머지를 묻는다.
 */

export type BondKind = 'gather' | 'split';

export interface BondProblem {
  kind: BondKind;
  /** 위에 놓이는 전체 */
  total: number;
  /** 아래 왼쪽 몫 */
  left: number;
  /** 아래 오른쪽 몫 */
  right: number;
  /** 어느 자리를 비워 두는가 */
  missing: 'total' | 'left' | 'right';
  answer: number;
  choices: number[];
}

/**
 * 다루는 수의 범위.
 *
 * 책이 "2~9 모으기 가르기" 라고 못 박아 두었다. 1 은 가를 수 없고(1 = 1과 0),
 * 10 부터는 따로 17단계에서 다룬다.
 */
export const BOND_MIN = 2;
export const BOND_MAX = 9;

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * 오답 둘을 고른다.
 *
 * 바로 옆 수를 붙인다 — 하나 더 세거나 덜 센 것이 이 나이에 가장 흔한 어긋남이다.
 * 멀리 있는 수를 붙이면 세어 보지 않고도 답이 보인다.
 */
function distractors(answer: number, max: number, rand: () => number): number[] {
  const near = [answer - 1, answer + 1, answer - 2, answer + 2].filter(
    (n) => n >= 0 && n <= max && n !== answer,
  );
  return shuffle(near, rand).slice(0, 2);
}

/** 문제 하나. */
export function makeBondProblem(
  kind: BondKind,
  rand: () => number = Math.random,
): BondProblem {
  const total = BOND_MIN + Math.floor(rand() * (BOND_MAX - BOND_MIN + 1));
  // 두 몫은 모두 1 이상이라야 한다. 0 을 쓰면 "5는 5와 0" 이 되어 가르는 뜻이 없다.
  const left = 1 + Math.floor(rand() * (total - 1));
  const right = total - left;

  // 모으기는 위를 묻고, 가르기는 아래 둘 중 하나를 묻는다.
  const missing =
    kind === 'gather' ? 'total' : rand() < 0.5 ? ('left' as const) : ('right' as const);
  const answer = missing === 'total' ? total : missing === 'left' ? left : right;

  return {
    kind,
    total,
    left,
    right,
    missing,
    answer,
    choices: shuffle([answer, ...distractors(answer, BOND_MAX, rand)], rand),
  };
}

/**
 * 한 판 분량.
 *
 * 같은 문제가 잇달아 나오지 않게 한다 — 방금 푼 것을 곧바로 또 내면 아이는 세어
 * 보지 않고 조금 전 손이 갔던 자리를 누른다. 더하기 놀이·수 세기와 같은 규칙이다.
 */
export function makeBondSet(
  kind: BondKind,
  count: number,
  rand: () => number = Math.random,
): BondProblem[] {
  const out: BondProblem[] = [];
  for (let i = 0; i < count; i += 1) {
    let next = makeBondProblem(kind, rand);
    for (
      let t = 0;
      t < 20 && i > 0 && same(out[i - 1]!, next);
      t += 1
    ) {
      next = makeBondProblem(kind, rand);
    }
    out.push(next);
  }
  return out;
}

function same(a: BondProblem, b: BondProblem): boolean {
  return a.total === b.total && a.left === b.left && a.missing === b.missing;
}

/** 무엇을 묻는지. */
export function bondQuestion(kind: BondKind): string {
  return kind === 'gather' ? '모으면 얼마일까?' : '얼마와 얼마로 갈라질까?';
}

/**
 * 3차(힌트)에 띄울 안내.
 *
 * 답을 말해주지 않는다. 세는 방법만 일러 준다 — 모으기·가르기 자체가 배울
 * 내용이라 답을 알려주면 배울 것이 남지 않는다.
 */
export function bondHint(p: BondProblem): string {
  return p.kind === 'gather'
    ? '아래 두 개를 이어서 세어봐요.'
    : `${p.total}개에서 아는 만큼 덜어내고 남은 것을 세어봐요.`;
}

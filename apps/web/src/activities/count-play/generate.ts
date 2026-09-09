/**
 * 수 세기 놀이의 문제 만들기.
 *
 * 유아 수학의 첫 단계다. 그림을 몇 개 보여주고 개수를 고르게 한다.
 * 더하기 놀이와 같은 방식으로 후보를 모두 만든 뒤 섞어서 보기를 고른다.
 */

/** 셀 수 있는 가장 큰 수. 단계이자 설정이다. */
export type CountRange = 3 | 5 | 10;

export interface CountProblem {
  /** 화면에 그릴 그림의 개수이자 정답 */
  answer: number;
  /** 세는 데 쓰는 그림 */
  icon: string;
  /** 보기 3개. 정답 하나와 가까운 오답 둘. */
  choices: number[];
}

export const COUNT_SETTINGS = [
  { range: 3 as CountRange, name: '셋까지 세기', icon: '🍎', desc: '1부터 3까지' },
  { range: 5 as CountRange, name: '다섯까지 세기', icon: '🐟', desc: '1부터 5까지' },
  { range: 10 as CountRange, name: '열까지 세기', icon: '🌸', desc: '1부터 10까지' },
] as const;

/** 아이가 아직 숫자를 못 읽어도 소리 내어 셀 수 있도록 우리말 수사를 함께 쓴다. */
export const KOREAN_COUNT = [
  '하나',
  '둘',
  '셋',
  '넷',
  '다섯',
  '여섯',
  '일곱',
  '여덟',
  '아홉',
  '열',
] as const;

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function makeCountProblem(
  range: CountRange,
  rand: () => number = Math.random,
): CountProblem {
  const answer = 1 + Math.floor(rand() * range);

  // 정답 바로 옆 수만 오답으로 쓴다. 1~range 를 벗어나는 것은 버린다.
  // 가장 좁은 range 3 에서도 후보가 항상 2개는 남으므로 보기 3개를 채울 수 있다.
  const pool = [-2, -1, 1, 2].map((d) => answer + d).filter((c) => c >= 1 && c <= range);
  const wrong = shuffle(pool, rand).slice(0, 2);

  const setting = COUNT_SETTINGS.find((s) => s.range === range)!;
  return { answer, icon: setting.icon, choices: shuffle([answer, ...wrong], rand) };
}

/**
 * 3차(힌트 라운드)에 띄울 안내.
 *
 * 더하기와 달리 정답인 수를 말해주지 않는다. 세는 것 자체가 배울 내용이라
 * 답을 알려주면 배울 것이 남지 않기 때문이다. 대신 화면에서 그림마다
 * 번호를 붙여주고, 여기서는 세는 방법만 일러준다.
 */
export function countHint(): string {
  return '하나씩 짚어가며 세어봐요. 하나, 둘, 셋…';
}

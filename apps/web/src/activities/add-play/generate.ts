/**
 * 더하기 놀이의 문제 만들기.
 *
 * 기존 시윤이 앱(단일 HTML)의 규칙을 그대로 옮기되, 보기를 고르는 부분만 바꿨다.
 * 원본은 서로 다른 보기 3개가 모일 때까지 난수를 계속 뽑는 while 문이라
 * 난수를 주입해 검사하기 어려웠다. 여기서는 후보를 모두 만든 뒤 섞어서 고른다.
 */

/** 0 은 "섞어서", 1~3 은 그 수만 더한다. */
export type AddSetting = 0 | 1 | 2 | 3;

export interface AddProblem {
  /** 앞의 수 */
  a: number;
  /** 더하는 수 */
  b: number;
  answer: number;
  /** 개수를 세는 데 쓰는 그림 */
  icon: string;
  /** 보기 3개. 정답 하나와 가까운 오답 둘. */
  choices: number[];
}

const ICONS: Record<AddSetting, string> = { 1: '⭐', 2: '🍎', 3: '🎈', 0: '🧸' };

export const ADD_SETTINGS = [
  { setting: 1 as AddSetting, name: '하나 더하기', icon: '⭐', desc: '1을 더해요' },
  { setting: 2 as AddSetting, name: '둘 더하기', icon: '🍎', desc: '2를 더해요' },
  { setting: 3 as AddSetting, name: '셋 더하기', icon: '🎈', desc: '3을 더해요' },
  { setting: 0 as AddSetting, name: '섞어서 하기', icon: '🧸', desc: '1, 2, 3을 섞어서' },
] as const;

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function makeAddProblem(
  setting: AddSetting,
  rand: () => number = Math.random,
): AddProblem {
  const b = setting === 0 ? ([1, 2, 3][Math.floor(rand() * 3)] as number) : setting;
  const a = 1 + Math.floor(rand() * 5);
  const answer = a + b;

  // 정답 바로 옆 수들만 오답으로 쓴다. 1~10 을 벗어나는 것은 버린다.
  // answer 는 2~8 이라 후보가 최소 3개는 남으므로 항상 2개를 고를 수 있다.
  const pool = [-2, -1, 1, 2].map((d) => answer + d).filter((c) => c >= 1 && c <= 10);
  const wrong = shuffle(pool, rand).slice(0, 2);

  return { a, b, answer, icon: ICONS[setting], choices: shuffle([answer, ...wrong], rand) };
}

/**
 * 3차(힌트 라운드)에 띄울 안내. 이어세기를 그대로 읽어준다 —
 * 5세에게는 "3 더하기 2" 보다 "3 다음에 4, 5" 가 훨씬 잡힌다.
 */
export function addHint(p: AddProblem): string {
  const steps = Array.from({ length: p.b }, (_, i) => p.a + i + 1).join(', ');
  return `${p.a}에서 시작해서 ${steps} — 이렇게 ${p.b}만큼 더 세어봐요.`;
}

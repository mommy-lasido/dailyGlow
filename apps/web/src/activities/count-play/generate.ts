/**
 * 수 세기 놀이의 문제 만들기.
 *
 * 유아 수학의 첫 단계다. 그림을 몇 개 보여주고 개수를 고르게 한다.
 * 더하기 놀이와 같은 방식으로 후보를 모두 만든 뒤 섞어서 보기를 고른다.
 */

/** 셀 수 있는 가장 큰 수. 단계이자 설정이다. */
export type CountRange = 3 | 5 | 10 | 20 | 50 | 100;

/**
 * 무엇을 하는 단계인가.
 *
 * **스물을 넘어가면 하는 일이 달라진다.** 사과 여든일곱 개를 화면에 그릴 수 없고,
 * 그린다 해도 하나씩 짚어 세다 아이가 지친다. 그래서 스물부터는 세는 것이 아니라
 * 읽고 순서를 아는 것으로 넘어간다. 시중 교재의 차례도 이렇게 나뉜다 —
 * 9까지의 수(세기) → 50까지의 수(읽기) → 100까지의 수(읽기·뛰어 세기).
 */
export type CountMode = 'count' | 'order' | 'line' | 'read' | 'skip5' | 'skip';

/** 한 번에 몇씩 건너뛰는가. 뛰어 세기가 아니면 하나씩이다. */
export function stepOf(mode: CountMode): number {
  if (mode === 'skip') return 10;
  if (mode === 'skip5') return 5;
  return 1;
}

/** 세는 대상과 그것을 세는 말 */
export interface CountObject {
  icon: string;
  /** 무엇인지 (문제 문장에 쓴다) */
  name: string;
  /** 세는 말 */
  unit: string;
}

export interface CountProblem {
  /** 화면에 그릴 그림의 개수이자 정답 */
  answer: number;
  object: CountObject;
  /** 보기 3개. 정답 하나와 가까운 오답 둘. */
  choices: number[];
}

/**
 * 세는 말은 **개**와 **마리** 둘만 쓴다.
 *
 * 이 활동을 하는 아이는 만 3~4세다. 송이(꽃)·권(책)·대(자동차)·잔(우유) 같은 말은
 * 이 나이에 배울 것이 아니고, 세는 것 자체가 어려운데 말까지 낯설면 문제를
 * 못 푸는 이유가 둘로 늘어난다. 개와 마리는 아이가 이미 듣고 자란 말이다.
 */
export const COUNT_OBJECTS: readonly CountObject[] = [
  { icon: '🍎', name: '사과', unit: '개' },
  { icon: '🍪', name: '쿠키', unit: '개' },
  { icon: '⚽', name: '공', unit: '개' },
  { icon: '🐟', name: '물고기', unit: '마리' },
  { icon: '🐶', name: '강아지', unit: '마리' },
  { icon: '🐤', name: '병아리', unit: '마리' },
] as const;

/**
 * 단계 묶음.
 *
 * 단계가 여덟이 되니 고르는 화면이 길어져, 아이가 무엇이 무엇인지 가리기 어려워졌다.
 * **하는 일이 같은 것끼리** 셋으로 묶는다 — 세는 것, 읽는 것, 뛰는 것.
 */
export type CountGroup = 'count' | 'order' | 'read' | 'skip';

export interface CountGroupInfo {
  group: CountGroup;
  name: string;
  icon: string;
  desc: string;
}

export const COUNT_GROUPS: readonly CountGroupInfo[] = [
  { group: 'count', name: '하나씩 세기', icon: '🍎', desc: '그림을 짚어가며 세어요' },
  // 『기적의 계산법 예비초등』 2·3단계. 세는 것 다음에 오는 자리다 —
  // 수가 어떤 차례로 늘어서는지, 줄 위 어디에 놓이는지를 안다.
  { group: 'order', name: '수의 순서', icon: '🔢', desc: '빠진 수 채우고, 수직선에서 찾아요' },
  { group: 'read', name: '숫자 읽기', icon: '🔢', desc: '듣고 찾고, 빠진 수 채워요' },
  { group: 'skip', name: '뛰어 세기', icon: '🐇', desc: '다섯씩, 열씩 건너뛰어요' },
] as const;

export interface CountSetting {
  group: CountGroup;
  range: CountRange;
  mode: CountMode;
  name: string;
  /** 고르는 화면에 크게 띄울 것. 숫자 단계는 **그 숫자 자체**가 가장 잘 보인다. */
  icon: string;
  desc: string;
}

export const COUNT_SETTINGS: readonly CountSetting[] = [
  // 그림을 하나씩 짚어 세는 단계
  { group: 'count', range: 3, mode: 'count', name: '셋까지 세기', icon: '🍎', desc: '1부터 3까지' },
  { group: 'count', range: 5, mode: 'count', name: '다섯까지 세기', icon: '🐟', desc: '1부터 5까지' },
  { group: 'count', range: 10, mode: 'count', name: '열까지 세기', icon: '🐤', desc: '1부터 10까지' },
  // 수의 순서 — 『기적의 계산법 예비초등』 2·3단계
  { group: 'order', range: 10, mode: 'order', name: '빠진 수 채우기', icon: '10', desc: '1 2 3 ? 5' },
  { group: 'order', range: 10, mode: 'line', name: '수직선에서 찾기', icon: '📏', desc: '화살표가 가리키는 수' },
  // 숫자를 읽고 순서를 아는 단계.
  // 그림글자(2️⃣ 5️⃣)로는 스물·쉰이 보이지 않는다. 숫자를 그대로 크게 띄운다.
  { group: 'read', range: 20, mode: 'read', name: '스물까지 읽기', icon: '20', desc: '1부터 20까지' },
  { group: 'read', range: 50, mode: 'read', name: '쉰까지 읽기', icon: '50', desc: '1부터 50까지' },
  { group: 'read', range: 100, mode: 'read', name: '백까지 읽기', icon: '100', desc: '1부터 100까지' },
  // 뛰어 세기. 하나씩 세는 것과는 다른 공부라 교재에서도 따로 다룬다.
  // 다섯씩이 열씩보다 촘촘해 먼저 온다.
  { group: 'skip', range: 100, mode: 'skip5', name: '다섯씩 뛰어 세기', icon: '5', desc: '5 10 15 … 100' },
  { group: 'skip', range: 100, mode: 'skip', name: '열씩 뛰어 세기', icon: '10', desc: '10 20 30 … 100' },
] as const;

/** 이 묶음에 든 단계들 */
export function settingsOf(group: CountGroup): CountSetting[] {
  return COUNT_SETTINGS.filter((s) => s.group === group);
}

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

/**
 * 받침이 있으면 "이", 없으면 "가". 사과**가**, 공**이**.
 * 한글 음절은 유니코드에서 가(0xAC00)부터 28개씩 묶여 있고, 그 묶음의
 * 첫 글자가 받침 없는 글자다.
 */
export function subjectParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return '가';
  return (code - 0xac00) % 28 === 0 ? '가' : '이';
}

/**
 * 단위 앞에 붙는 우리말 수사. 하나→**한** 개, 둘→**두** 개, 셋→**세** 개.
 *
 * "하나 개" 라고 읽으면 아이가 처음 듣는 말이 되어 버린다. 세는 말은 수사와
 * 짝이 정해져 있고, 아이가 집에서 듣는 것도 "세 개" 지 "셋 개" 가 아니다.
 */
const COUNT_PREFIX = ['한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'] as const;

/** "세 개" / "다섯 마리" — 고른 숫자를 소리 내어 확인해준다. */
export function countAloud(value: number, unit: string): string {
  const prefix = COUNT_PREFIX[value - 1] ?? String(value);
  return `${prefix} ${unit}`;
}

/** "사과가 몇 개일까?" / "물고기가 몇 마리일까?" */
export function countQuestion(object: CountObject): string {
  return `${object.name}${subjectParticle(object.name)} 몇 ${object.unit}일까?`;
}

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
  // 문제마다 다른 것을 세게 한다 — 개와 마리를 번갈아 만나야 세는 말이 몸에 붙는다.
  const object = COUNT_OBJECTS[Math.floor(rand() * COUNT_OBJECTS.length)]!;

  // 정답 바로 옆 수만 오답으로 쓴다. 1~range 를 벗어나는 것은 버린다.
  // 가장 좁은 range 3 에서도 후보가 항상 2개는 남으므로 보기 3개를 채울 수 있다.
  const pool = [-2, -1, 1, 2].map((d) => answer + d).filter((c) => c >= 1 && c <= range);
  const wrong = shuffle(pool, rand).slice(0, 2);

  return { answer, object, choices: shuffle([answer, ...wrong], rand) };
}

/**
 * 한 판 분량을 한꺼번에 만든다.
 *
 * **같은 문제가 잇달아 나오지 않게 한다.** 더하기 놀이와 같은 까닭이다 — 방금
 * 센 것을 곧바로 또 내면 아이는 세어 보지 않고 조금 전 손이 갔던 자리를 누른다.
 * 여기는 셋까지 세는 단계가 있어 낼 수 있는 문제가 셋뿐일 때도 있으므로, 한 판
 * 안에서 아예 겹치지 않게 하지는 않는다. 붙어 나오지만 않으면 된다.
 */
export function makeCountSet(
  range: CountRange,
  count: number,
  rand: () => number = Math.random,
): CountProblem[] {
  const out: CountProblem[] = [];
  for (let i = 0; i < count; i += 1) {
    let next = makeCountProblem(range, rand);
    // 스무 번까지만 다시 뽑는다. 난수를 주입한 검사에서 끝없이 돌지 않게 한다.
    for (let t = 0; t < 20 && i > 0 && out[i - 1]!.answer === next.answer; t += 1) {
      next = makeCountProblem(range, rand);
    }
    out.push(next);
  }
  return out;
}

/**
 * 3차(힌트 라운드)에 띄울 안내.
 *
 * 더하기와 달리 정답인 수를 말해주지 않는다. 세는 것 자체가 배울 내용이라
 * 답을 알려주면 배울 것이 남지 않기 때문이다. 대신 화면에서 그림마다
 * 번호를 붙여주고, 여기서는 세는 방법만 일러준다.
 */
export function countHint(object: CountObject): string {
  return `하나씩 짚어가며 세어봐요. 한 ${object.unit}, 두 ${object.unit}…`;
}

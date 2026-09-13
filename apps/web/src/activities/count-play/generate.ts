/**
 * 수 세기 놀이의 문제 만들기.
 *
 * 유아 수학의 첫 단계다. 그림을 몇 개 보여주고 개수를 고르게 한다.
 * 더하기 놀이와 같은 방식으로 후보를 모두 만든 뒤 섞어서 보기를 고른다.
 */

/** 셀 수 있는 가장 큰 수. 단계이자 설정이다. */
export type CountRange = 3 | 5 | 10;

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

export const COUNT_SETTINGS = [
  { range: 3 as CountRange, name: '셋까지 세기', icon: '🍎', desc: '1부터 3까지' },
  { range: 5 as CountRange, name: '다섯까지 세기', icon: '🐟', desc: '1부터 5까지' },
  { range: 10 as CountRange, name: '열까지 세기', icon: '🐤', desc: '1부터 10까지' },
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
 * 3차(힌트 라운드)에 띄울 안내.
 *
 * 더하기와 달리 정답인 수를 말해주지 않는다. 세는 것 자체가 배울 내용이라
 * 답을 알려주면 배울 것이 남지 않기 때문이다. 대신 화면에서 그림마다
 * 번호를 붙여주고, 여기서는 세는 방법만 일러준다.
 */
export function countHint(object: CountObject): string {
  return `하나씩 짚어가며 세어봐요. 한 ${object.unit}, 두 ${object.unit}…`;
}

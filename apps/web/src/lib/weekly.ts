/**
 * 이번 주의 글자.
 *
 * 아이가 목록에서 아무거나 골라 풀면, 그날그날 다른 것을 조금씩 건드리고 끝난다.
 * 교재가 한 주에 글자 하나를 파고드는 데는 까닭이 있다 — **같은 글자를 여러 날에
 * 걸쳐 여러 방식으로 만나야** 손과 눈에 남는다.
 *
 * 그래서 아이의 단계가 가리키는 글자 하나를 한 주의 과제로 세운다. 22단계면 'ㅐ',
 * 23단계면 'ㅔ' 다. 무엇을 배울 차례인지는 『기적의 한글 학습』 단계표가 이미
 * 정해 두었으므로, 여기서 새로 정하지 않고 그 표에서 꺼내 쓴다.
 */

import { decompose, hangulStage } from '@dailyglow/utils';
import { poolForStage } from '@/activities/words/generate';

/**
 * 이 단계에서 배우는 글자들.
 *
 * 단계 이름의 따옴표 안에 들어 있다 — "복잡한 모음 'ㅐ'" → ㅐ.
 * 25단계처럼 한 단계에 둘을 배우는 자리도 있다 — "복잡한 모음 'ㅘ, ㅢ'" → ㅘ, ㅢ.
 */
export function weeklyLetters(stage: number): string[] {
  const label = hangulStage(stage)?.label;
  const quoted = label?.match(/'([^']+)'/)?.[1];
  if (!quoted) return [];
  return quoted
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 이 글자가 이 낱말 안에 들어 있는가. 첫소리·가운뎃소리·받침 어디든. */
export function wordHasLetter(word: string, letter: string): boolean {
  for (const ch of word) {
    const s = decompose(ch);
    if (!s) continue;
    if (s.lead === letter || s.vowel === letter || s.tail === letter) return true;
  }
  return false;
}

/**
 * 이번 주의 글자가 든 낱말들.
 *
 * **아이가 읽을 수 있는 낱말에서만 고른다.** 이번 주에 배우는 글자가 들어 있어도
 * 나머지 자모를 아직 못 배웠으면 읽을 방법이 없다.
 */
export function weeklyWords(stage: number, max = 8): string[] {
  const letters = weeklyLetters(stage);
  if (letters.length === 0) return [];
  return poolForStage(stage)
    .filter((w) => letters.some((l) => wordHasLetter(w, l)))
    .slice(0, max);
}

export interface WeeklyFocus {
  stage: number;
  /** 이번 주에 배우는 글자들 */
  letters: string[];
  /** 단계표에 적힌 이름 — "복잡한 모음 'ㅐ'" */
  label: string;
  /** 그 글자가 든, 아이가 읽을 수 있는 낱말 */
  words: string[];
  /** 단계표가 들고 있는 예시 — 아직 못 읽는 낱말도 들어 있다 */
  examples: string;
}

/**
 * 이번 주에 무엇을 할지.
 *
 * 배울 글자가 없는 단계(1단계는 기본 모음 열 개, 34·35단계는 정리)에서는 null 을
 * 돌려준다. 그때는 홈에 이 칸을 두지 않는다 — 빈 칸을 두느니 없는 편이 낫다.
 */
export function weeklyFocus(stage: number): WeeklyFocus | null {
  const found = hangulStage(stage);
  const letters = weeklyLetters(stage);
  if (!found || letters.length === 0) return null;

  return {
    stage,
    letters,
    label: found.label,
    words: weeklyWords(stage),
    examples: found.examples,
  };
}

/**
 * 서로 헷갈리는 글자들.
 *
 * 틀린 글자 찾기의 오답으로 쓴다. **아무 글자나 섞으면 안 된다** — ㅐ 옆에 ㅁ 을
 * 놓으면 보자마자 갈라지므로 고르는 일이 되지 않는다. 22단계에서 23단계로 넘어갈
 * 때의 진짜 고비는 ㅐ 와 ㅔ 를 가리는 것이고, 그 짝을 여기 적어 둔다.
 *
 * 짝은 **모양이 닮은 것**으로 골랐다. 소리가 닮은 것은 소리로 내는 문제가 따로
 * 있으므로 여기서 다루지 않는다.
 */
export const CONFUSABLE: Record<string, string[]> = {
  // 모음 — 획 하나가 늘거나 방향이 바뀐 것들
  ㅏ: ['ㅑ', 'ㅓ', 'ㅐ'],
  ㅑ: ['ㅏ', 'ㅕ', 'ㅒ'],
  ㅓ: ['ㅕ', 'ㅏ', 'ㅔ'],
  ㅕ: ['ㅓ', 'ㅑ', 'ㅖ'],
  ㅗ: ['ㅛ', 'ㅜ', 'ㅚ'],
  ㅛ: ['ㅗ', 'ㅠ', 'ㅕ'],
  ㅜ: ['ㅠ', 'ㅗ', 'ㅟ'],
  ㅠ: ['ㅜ', 'ㅛ', 'ㅡ'],
  ㅡ: ['ㅜ', 'ㅣ', 'ㅢ'],
  ㅣ: ['ㅡ', 'ㅏ', 'ㅓ'],
  ㅐ: ['ㅔ', 'ㅒ', 'ㅏ'],
  ㅔ: ['ㅐ', 'ㅖ', 'ㅓ'],
  ㅒ: ['ㅖ', 'ㅐ', 'ㅑ'],
  ㅖ: ['ㅒ', 'ㅔ', 'ㅕ'],
  ㅘ: ['ㅚ', 'ㅙ', 'ㅗ'],
  ㅚ: ['ㅘ', 'ㅙ', 'ㅗ'],
  ㅙ: ['ㅚ', 'ㅘ', 'ㅞ'],
  ㅝ: ['ㅞ', 'ㅟ', 'ㅜ'],
  ㅞ: ['ㅝ', 'ㅙ', 'ㅟ'],
  ㅟ: ['ㅝ', 'ㅜ', 'ㅢ'],
  ㅢ: ['ㅡ', 'ㅟ', 'ㅣ'],
  // 자음 — 획이 하나 더 붙거나 방향이 뒤집힌 것들
  ㄱ: ['ㅋ', 'ㄲ', 'ㄴ'],
  ㄴ: ['ㄱ', 'ㄷ', 'ㄹ'],
  ㄷ: ['ㄸ', 'ㅌ', 'ㄴ'],
  ㄹ: ['ㄷ', 'ㅁ', 'ㄴ'],
  ㅁ: ['ㅂ', 'ㅇ', 'ㄹ'],
  ㅂ: ['ㅁ', 'ㅃ', 'ㅍ'],
  ㅅ: ['ㅈ', 'ㅆ', 'ㅊ'],
  ㅇ: ['ㅁ', 'ㅎ', 'ㅍ'],
  ㅈ: ['ㅅ', 'ㅊ', 'ㅉ'],
  ㅊ: ['ㅈ', 'ㅅ', 'ㅎ'],
  ㅋ: ['ㄱ', 'ㅌ', 'ㄲ'],
  ㅌ: ['ㄷ', 'ㅋ', 'ㄸ'],
  ㅍ: ['ㅂ', 'ㅁ', 'ㅃ'],
  ㅎ: ['ㅊ', 'ㅇ', 'ㅈ'],
  ㄲ: ['ㄱ', 'ㅋ', 'ㄸ'],
  ㄸ: ['ㄷ', 'ㅌ', 'ㄲ'],
  ㅃ: ['ㅂ', 'ㅍ', 'ㅁ'],
  ㅆ: ['ㅅ', 'ㅈ', 'ㅊ'],
  ㅉ: ['ㅈ', 'ㅊ', 'ㅅ'],
};

export interface SpotProblem {
  /** 찾아야 할 글자 */
  answer: string;
  /** 늘어놓을 글자들. 정답 하나와 닮은 글자 여럿. */
  choices: string[];
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * 틀린 글자 찾기 한 판.
 *
 * 닮은 글자들 사이에서 **이번 주의 글자 하나**를 짚어낸다. 여섯 칸을 늘어놓고
 * 그중 하나만 정답이다. 닮은 짝이 모자라면 있는 만큼만 쓰되, 같은 글자가 두 번
 * 나오지 않게 한다 — 정답이 둘이 되어 버린다.
 */
export function spotProblems(
  letter: string,
  count = 5,
  rand: () => number = Math.random,
  size = 6,
): SpotProblem[] {
  const near = CONFUSABLE[letter] ?? [];
  if (near.length === 0) return [];

  return Array.from({ length: count }, () => {
    const fillers: string[] = [];
    // 닮은 글자를 돌려가며 칸을 채운다. 짝이 셋뿐이라 여섯 칸이면 겹쳐 써야 한다.
    while (fillers.length < size - 1) {
      fillers.push(...shuffle(near, rand).slice(0, size - 1 - fillers.length));
    }
    return { answer: letter, choices: shuffle([letter, ...fillers], rand) };
  });
}

/** 요일마다 무엇을 할지. 월요일이 0 이다. */
export type WeeklyStepKind = 'meet' | 'words' | 'spot' | 'find' | 'write';

export const WEEKLY_STEPS: { kind: WeeklyStepKind; name: string; desc: string }[] = [
  { kind: 'meet', name: '글자 만나기', desc: '어떻게 생겼고 어떤 소리가 나는지' },
  { kind: 'words', name: '낱말 만나기', desc: '이 글자가 든 낱말을 하나씩' },
  { kind: 'spot', name: '틀린 글자 찾기', desc: '닮은 글자 사이에서 찾아내기' },
  { kind: 'find', name: '낱말에서 찾기', desc: '이 글자가 든 낱말 고르기' },
  { kind: 'write', name: '써보기', desc: '연습지에 인쇄해서 연필로' },
];

/**
 * 오늘은 무엇을 할 차례인가.
 *
 * 한 주 내내 같은 것을 보여주면 이틀째부터는 볼 것이 없다. 날마다 같은 글자를
 * **다른 방식으로** 만나게 한다. 토·일요일은 한 주를 돌아보는 자리라 앞의 것을
 * 다시 돌린다.
 */
export function stepForDay(today = new Date()): (typeof WEEKLY_STEPS)[number] {
  // getDay(): 일요일이 0. 월요일을 0 으로 옮긴다.
  const fromMonday = (today.getDay() + 6) % 7;
  return WEEKLY_STEPS[fromMonday % WEEKLY_STEPS.length]!;
}

/**
 * 맞춤법 탐험대 문제 만들기.
 *
 * 한 항목에는 빈칸 문장이 여러 개 들어 있다. 낼 때마다 그중 하나를 골라 쓰므로
 * 같은 낱말쌍이라도 매번 다른 문장으로 만난다.
 */

import { SPELLING_ITEMS, type SpellingItem, type SpellingOption } from './content';

/** 한 판에 낼 문제 수. 초등 3학년이라 열 문제. */
export const SPELLING_PROBLEM_COUNT = 10;

/** 빈칸 자리 표시 */
export const BLANK = '___';

export interface SpellingProblem {
  /** 빈칸이 있는 문장 */
  sentence: string;
  answer: SpellingOption;
  /** 보기. 자리를 섞어 둔다. */
  options: SpellingOption[];
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function makeSpellingProblem(
  item: SpellingItem,
  rand: () => number = Math.random,
): SpellingProblem {
  const sentence = item.templates[Math.floor(rand() * item.templates.length)]!;
  const answer = item.options.find((o) => o.correct)!;
  return { sentence, answer, options: shuffle(item.options, rand) };
}

/**
 * 한 판 분량을 한꺼번에 만든다.
 *
 * 하나씩 따로 뽑으면 같은 낱말쌍이 한 판에 두 번 나온다 — 방금 고른 것을 또 고르는
 * 셈이라 열 문제가 열 문제 몫을 못 한다. 먼저 섞은 뒤 앞에서부터 가져다 쓴다.
 */
export function makeSpellingSet(
  items: SpellingItem[] = SPELLING_ITEMS,
  count = SPELLING_PROBLEM_COUNT,
  rand: () => number = Math.random,
): SpellingProblem[] {
  return shuffle(items, rand)
    .slice(0, Math.min(count, items.length))
    .map((item) => makeSpellingProblem(item, rand));
}

/** 빈칸에 고른 말을 넣어 완성한 문장. 채점 뒤에 보여준다. */
export function filledSentence(sentence: string, word: string): string {
  return sentence.replace(BLANK, word);
}

/**
 * 3차(힌트 라운드)에 띄울 안내.
 * 정답의 설명을 그대로 보여준다 — 왜 그 말이 맞는지가 배울 내용이다.
 */
export function spellingHint(p: SpellingProblem): string {
  return p.answer.note;
}

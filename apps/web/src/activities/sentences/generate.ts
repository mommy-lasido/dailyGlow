/**
 * 문장 읽기 문제 만들기.
 *
 * 아이가 **배운 데까지의 자모로만 이루어진 문장**을 고른다. 낱말 읽기와 같은 규칙이다.
 *
 * 문제는 소리로 낸다 — 앱이 읽어주는 문장을 보기에서 찾는다.
 *
 * 보기를 고를 때는 **비슷한 문장을 먼저 붙인다.** "곰이 밥을 먹어요" 옆에
 * "개가 밥을 먹어요" 가 놓여야 문장을 끝까지 읽게 된다. 전혀 다른 문장을 섞으면
 * 첫 낱말만 보고도 답이 보인다.
 */

import { minStageFor } from '@dailyglow/utils';
import { SENTENCE_ITEMS } from './content';

/** 한 판에 낼 문제 수. 문장은 낱말보다 읽는 데 오래 걸리므로 다섯 개. */
export const SENTENCE_PROBLEM_COUNT = 5;
/** 보기를 세 개 채우려면 문장이 적어도 셋은 있어야 한다. */
export const MIN_POOL = 3;

export interface SentenceProblem {
  answer: string;
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

/** 이 아이가 읽을 수 있는 문장들 */
export function poolForStage(stage: number): string[] {
  return SENTENCE_ITEMS.filter((s) => {
    const need = minStageFor(s);
    return need !== null && need <= stage;
  });
}

/** 두 문장이 몇 낱말이나 같은가. 많이 같을수록 헷갈리는 보기다. */
export function sharedWords(a: string, b: string): number {
  const bs = b.split(' ');
  return a.split(' ').filter((w) => bs.includes(w)).length;
}

/**
 * 오답 둘을 고른다.
 *
 * 같은 낱말을 많이 쓰는 문장을 먼저 고른다 — "곰이 밥을 먹어요" 의 오답으로는
 * "개가 밥을 먹어요" 가 "코가 커요" 보다 낫다. 앞의 것은 끝까지 읽어야 가려지지만
 * 뒤의 것은 길이만 봐도 다르다.
 */
export function pickDistractors(
  answer: string,
  pool: string[],
  rand: () => number = Math.random,
): string[] {
  const others = shuffle(
    pool.filter((s) => s !== answer),
    rand,
  );
  return others
    .slice()
    .sort((a, b) => sharedWords(answer, b) - sharedWords(answer, a))
    .slice(0, 2);
}

/**
 * 한 판 분량을 한꺼번에 만든다 — 하나씩 뽑으면 같은 문장이 겹쳐 나온다.
 * 읽을 수 있는 문장이 문제 수보다 적으면 있는 만큼만 낸다.
 */
export function makeSentenceSet(
  pool: string[],
  count = SENTENCE_PROBLEM_COUNT,
  rand: () => number = Math.random,
): SentenceProblem[] {
  if (pool.length < MIN_POOL) return [];

  return shuffle(pool, rand)
    .slice(0, Math.min(count, pool.length))
    .map((answer) => {
      const wrong = pickDistractors(answer, pool, rand);
      return { answer, choices: shuffle([answer, ...wrong], rand) };
    });
}

/** 물음 문장 */
export function sentenceQuestion(): string {
  return '어느 문장일까?';
}

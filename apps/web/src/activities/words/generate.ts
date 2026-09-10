/**
 * 낱말 읽기 문제 만들기.
 *
 * 아이가 **배운 데까지의 자모로만 이루어진 낱말**을 고른다. 아직 안 배운 받침이나
 * 모음이 든 낱말을 내면 읽을 방법이 없어 그림만 보고 찍게 된다.
 */

import { minStageFor } from '@dailyglow/utils';
import { WORD_ITEMS, type WordItem } from './content';

/** 한 판에 낼 문제 수. 이 활동을 하는 아이는 아직 글을 읽는 중이라 짧게. */
export const WORD_PROBLEM_COUNT = 5;
/** 보기를 세 개 채우려면 낱말이 적어도 셋은 있어야 한다. */
export const MIN_POOL = 3;

/** 그림을 보고 낱말을 고를지, 낱말을 보고 그림을 고를지 */
export type WordDirection = 'toWord' | 'toEmoji';

export interface WordProblem {
  answer: WordItem;
  direction: WordDirection;
  choices: WordItem[];
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** 이 아이가 읽을 수 있는 낱말들. 단계가 낮은 것부터. */
export function poolForStage(stage: number): WordItem[] {
  return WORD_ITEMS.filter((w) => {
    const need = minStageFor(w.word);
    return need !== null && need <= stage;
  });
}

/**
 * 한 판 분량을 한꺼번에 만든다 — 하나씩 뽑으면 같은 낱말이 겹쳐 나온다.
 * 읽을 수 있는 낱말이 문제 수보다 적으면 있는 만큼만 낸다.
 */
export function makeWordSet(
  pool: WordItem[],
  count = WORD_PROBLEM_COUNT,
  rand: () => number = Math.random,
): WordProblem[] {
  if (pool.length < MIN_POOL) return [];

  return shuffle(pool, rand)
    .slice(0, Math.min(count, pool.length))
    .map((answer) => {
      const others = shuffle(
        pool.filter((w) => w.word !== answer.word),
        rand,
      );
      const direction: WordDirection = rand() < 0.5 ? 'toWord' : 'toEmoji';
      return {
        answer,
        direction,
        choices: shuffle([answer, others[0]!, others[1]!], rand),
      };
    });
}

/** 물음 문장 */
export function wordQuestion(p: WordProblem): string {
  return p.direction === 'toWord' ? '무엇일까?' : '어느 그림일까?';
}

/**
 * 철자 맞추기 — 섞인 글자를 차례대로 눌러 낱말을 되살린다.
 *
 * 라윤이는 낱말의 뜻을 모르는 것이 아니라 **철자의 끝을 보지 않는다.**
 * `cookies` 를 `cookie` 로 쓰고, 자기가 낸 문제에서도 `Unscramble` 을
 * `Unscarmble` 로, `Mosquito` 를 `Moscito` 로 적었다.
 *
 * 그래서 고르는 놀이가 아니라 **한 글자씩 짚는 놀이**로 만든다. 마지막 글자까지
 * 누르지 않으면 끝나지 않으므로 빠뜨릴 방법이 없다.
 *
 * 뜻은 영어로만 보여준다 — 한국어로 거들면 아이가 영어를 알아서 맞힌 것인지
 * 한국어를 보고 맞힌 것인지 갈라낼 수 없다.
 */

import { dayKey } from '@/lib/activities';
import type { VocabWord } from './words';

/** 한 판에 낼 낱말 수. */
export const SPELL_PROBLEM_COUNT = 5;

export interface SpellProblem {
  /** 맞혀야 할 낱말 */
  answer: string;
  /** 영어 뜻 */
  clue: string;
  /** 섞어 놓은 글자들. 답과 같은 글자를 같은 수만큼 담는다. */
  letters: string[];
}

/**
 * 글자를 섞는다. **원래 차례와 같아지면 다시 섞는다** — 섞이지 않은 낱말이
 * 나오면 아이가 글자를 짚지 않고 그대로 눌러 버린다.
 */
export function scramble(word: string, rand: () => number = Math.random): string[] {
  const letters = [...word];
  if (letters.length < 2) return letters;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    for (let i = letters.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [letters[i], letters[j]] = [letters[j]!, letters[i]!];
    }
    if (letters.join('') !== word) return letters;
  }
  // 같은 글자만 있는 낱말이라면 섞어도 그대로다. 그냥 돌려준다.
  return letters;
}

export function makeSpellProblem(
  item: VocabWord,
  rand: () => number = Math.random,
): SpellProblem {
  return {
    answer: item.word,
    clue: item.meaning ?? '',
    letters: scramble(item.word, rand),
  };
}

/** 한 판 분량. 같은 낱말이 두 번 나오지 않는다. */
export function makeSpellSet(
  pool: VocabWord[],
  count = SPELL_PROBLEM_COUNT,
  rand: () => number = Math.random,
): SpellProblem[] {
  const picked = [...pool];
  for (let i = picked.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [picked[i], picked[j]] = [picked[j]!, picked[i]!];
  }
  return picked.slice(0, Math.min(count, picked.length)).map((w) => makeSpellProblem(w, rand));
}

/**
 * 다음에 눌러야 할 글자인가.
 *
 * 같은 글자가 여러 번 나오는 낱말(`letter`, `balloon`)이 있으므로 **자리**가
 * 아니라 **글자**로 견준다. `l` 을 눌렀을 때 그것이 몇 번째 `l` 인지는
 * 따지지 않는다 — 아이에게는 같은 글자이고, 어느 것을 눌러도 옳다.
 */
export function isNext(answer: string, typed: string, letter: string): boolean {
  return answer[typed.length] === letter;
}

/** 다 맞췄는가. */
export function isDone(answer: string, typed: string): boolean {
  return answer === typed;
}

/** 글자를 숫자 하나로 접는다. 같은 글은 늘 같은 숫자가 된다. */
function seedOf(text: string): number {
  let h = 2166136261;
  for (const ch of text) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 같은 씨앗을 주면 늘 같은 차례를 내주는 난수. */
function seededRand(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

/**
 * 오늘 낼 낱말들.
 *
 * 과 번호를 일일이 고르게 했더니 아이가 들어갈 때마다 숫자를 눌러야 했다.
 * 아이가 할 일은 **오늘 것을 하는 것**이지 오늘 할 것을 고르는 것이 아니다.
 *
 * 날짜와 아이로 씨앗을 만들어 뽑으므로 **오늘 안에는 몇 번을 열어도 같은 다섯
 * 낱말**이 나오고, 내일이면 다른 것이 나온다. 아이가 "오늘 건 다 했다" 를
 * 알 수 있다.
 */
export function todayWords(
  pool: VocabWord[],
  profileId: string | null,
  count = SPELL_PROBLEM_COUNT,
  today = new Date(),
): VocabWord[] {
  const rand = seededRand(seedOf(`${dayKey(today)}-${profileId ?? 'x'}-spell`));
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

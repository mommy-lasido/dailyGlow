/**
 * 파닉스 한 판을 만든다.
 *
 * 문제는 **소리**다. 화면에는 낱말을 적지 않는다 — 적어 두면 아이가 글자를 보고
 * 고르므로, 소리를 갈라 듣는 일을 건너뛰게 된다. 맞힌 뒤에야 낱말이 나타난다.
 */

import { gameOf, type PhonicsGame, type PhonicsStage, type PhonicsWord } from './words';

/** 한 판에 낼 문제 수. 다른 활동과 같게 다섯이다. */
export const PHONICS_PROBLEM_COUNT = 5;

/** 한 문제에 놓을 보기 수. */
export const CHOICE_COUNT = 4;

export interface PhonicsProblem {
  /** 들려줄 낱말 */
  word: string;
  /** 골라야 할 글자 */
  answer: string;
  /** 보기 — 답이 섞여 있다 */
  choices: string[];
}

function shuffle<T>(list: T[], rand: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * 보기를 만든다. 답 하나에 **답이 아닌 글자**를 채워 넷으로 만든다.
 *
 * 고를 것이 적은 단계(가운뎃소리는 모음 다섯뿐)에서는 있는 만큼만 낸다.
 */
export function makeChoices(
  game: PhonicsGame,
  answer: string,
  rand: () => number = Math.random,
): string[] {
  const others = game.letters.filter((l) => l !== answer);
  const picked = shuffle(others, rand).slice(0, Math.max(0, CHOICE_COUNT - 1));
  return shuffle([answer, ...picked], rand);
}

export function makeProblem(
  game: PhonicsGame,
  item: PhonicsWord,
  rand: () => number = Math.random,
): PhonicsProblem {
  return {
    word: item.word,
    answer: item.answer,
    choices: makeChoices(game, item.answer, rand),
  };
}

/** 한 판 분량. 같은 낱말이 두 번 나오지 않는다. */
export function makeSet(
  stage: PhonicsStage,
  count = PHONICS_PROBLEM_COUNT,
  rand: () => number = Math.random,
): PhonicsProblem[] {
  const game = gameOf(stage);
  return shuffle(game.words, rand)
    .slice(0, Math.min(count, game.words.length))
    .map((w) => makeProblem(game, w, rand));
}

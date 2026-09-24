import { describe, expect, it } from 'vitest';
import { CHOICE_COUNT, makeChoices, makeSet, PHONICS_PROBLEM_COUNT } from './generate';
import { gameOf, PHONICS_GAMES } from './words';

describe('makeChoices', () => {
  it('답이 반드시 보기 안에 있다', () => {
    for (const game of PHONICS_GAMES) {
      for (const w of game.words) {
        expect(makeChoices(game, w.answer)).toContain(w.answer);
      }
    }
  });

  it('보기는 넷이고 같은 글자가 두 번 나오지 않는다', () => {
    const game = gameOf('first');
    const choices = makeChoices(game, 'c');
    expect(choices).toHaveLength(CHOICE_COUNT);
    expect(new Set(choices).size).toBe(CHOICE_COUNT);
  });

  it('고를 것이 적은 단계에서는 있는 만큼만 낸다', () => {
    // 가운뎃소리는 모음이 다섯뿐이라 보기를 넷까지만 만들 수 있다.
    const choices = makeChoices(gameOf('middle'), 'a');
    expect(choices.length).toBeLessThanOrEqual(CHOICE_COUNT);
    expect(choices).toContain('a');
  });
});

describe('makeSet', () => {
  it('한 판은 다섯 문제이고 같은 낱말이 두 번 나오지 않는다', () => {
    const set = makeSet('first');
    expect(set).toHaveLength(PHONICS_PROBLEM_COUNT);
    expect(new Set(set.map((p) => p.word)).size).toBe(PHONICS_PROBLEM_COUNT);
  });

  it('모든 단계에서 한 판을 만들 수 있다', () => {
    for (const game of PHONICS_GAMES) {
      expect(makeSet(game.stage).length).toBe(PHONICS_PROBLEM_COUNT);
    }
  });
});

describe('낱말 목록', () => {
  it('답으로 적힌 글자가 그 단계의 보기 목록에 들어 있다', () => {
    // 보기를 만들 때 답이 아닌 글자를 여기서 뽑는다. 빠져 있으면 답만 튀어 보인다.
    for (const game of PHONICS_GAMES) {
      for (const w of game.words) {
        expect(game.letters).toContain(w.answer);
      }
    }
  });

  it('첫소리·끝소리 단계의 답이 낱말의 실제 자리와 맞다', () => {
    for (const w of gameOf('first').words) {
      expect(w.word.startsWith(w.answer)).toBe(true);
    }
    for (const w of gameOf('last').words) {
      expect(w.word.endsWith(w.answer)).toBe(true);
    }
  });

  it('이중자음·연속자음 단계의 답이 낱말 안에 들어 있다', () => {
    for (const w of gameOf('digraph').words) {
      expect(w.word).toContain(w.answer);
    }
    for (const w of gameOf('blend').words) {
      expect(w.word.startsWith(w.answer)).toBe(true);
    }
  });

  it('한 단계에 다섯 문제를 낼 만큼은 있다', () => {
    for (const game of PHONICS_GAMES) {
      expect(game.words.length).toBeGreaterThanOrEqual(PHONICS_PROBLEM_COUNT);
    }
  });
});

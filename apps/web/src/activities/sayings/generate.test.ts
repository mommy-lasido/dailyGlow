import { describe, expect, it } from 'vitest';
import { SAYINGS, sayingsOf } from './content';
import {
  choiceText,
  makeSayingProblem,
  makeSayingSet,
  pickDistractors,
  poolFor,
  sayingHint,
  sayingQuestion,
} from './generate';

describe('자료', () => {
  it('세 권 모두와 두 권에 실린 것을 담는다', () => {
    // 어느 표현을 넣을지는 교재 세 권의 목차가 정했다.
    expect(sayingsOf('proverb')).toHaveLength(47);
    expect(sayingsOf('idiom')).toHaveLength(57);
    expect(SAYINGS.every((s) => s.books === 3 || s.books === 2)).toBe(true);
  });

  it('세 권에 실린 것이 먼저 온다', () => {
    // books 숫자가 곧 난이도다. 나중에 단계를 나눌 때 쓴다.
    for (const kind of ['proverb', 'idiom'] as const) {
      const list = sayingsOf(kind);
      const firstTwo = list.findIndex((s) => s.books === 2);
      expect(list.slice(0, firstTwo).every((s) => s.books === 3)).toBe(true);
    }
  });

  it('모든 표현에 아홉 살이 알아들을 뜻과 예문이 있다', () => {
    for (const s of SAYINGS) {
      expect(s.meaning.length).toBeGreaterThan(8);
      expect(s.example.length).toBeGreaterThan(8);
      expect(s.tag).not.toBe('');
    }
  });

  it('사자성어에는 한자와 글자별 뜻이 있다', () => {
    for (const s of sayingsOf('idiom')) {
      expect(s.hanja).toHaveLength(4);
      expect(s.chars).toHaveLength(4);
    }
  });

  it('속담에는 한자를 붙이지 않는다', () => {
    for (const s of sayingsOf('proverb')) {
      expect(s.hanja).toBeUndefined();
    }
  });

  it('같은 표현이 두 번 들어가지 않는다', () => {
    expect(new Set(SAYINGS.map((s) => s.text)).size).toBe(SAYINGS.length);
  });

  it('뜻이 서로 겹치지 않는다', () => {
    // 뜻이 같으면 보기 세 개 중에 정답이 둘이 되어 버린다.
    expect(new Set(SAYINGS.map((s) => s.meaning)).size).toBe(SAYINGS.length);
  });
});

describe('pickDistractors', () => {
  it('오답 둘을 고르고 정답은 넣지 않는다', () => {
    const pool = poolFor('proverb');
    for (const answer of pool) {
      const wrong = pickDistractors(answer, pool);
      expect(wrong).toHaveLength(2);
      expect(wrong.some((w) => w.text === answer.text)).toBe(false);
      expect(wrong[0]!.text).not.toBe(wrong[1]!.text);
    }
  });

  it('같은 갈래가 있으면 하나는 같은 갈래에서 고른다', () => {
    // 아무 뜻이나 섞으면 뜻을 몰라도 답이 보인다.
    const pool = poolFor('proverb');
    const answer = pool.find((s) => s.tag === '겸손')!;
    for (let i = 0; i < 50; i += 1) {
      const wrong = pickDistractors(answer, pool);
      expect(wrong.some((w) => w.tag === answer.tag)).toBe(true);
    }
  });

  it('같은 갈래가 하나도 없어도 둘을 채운다', () => {
    const pool = poolFor('idiom');
    const lonely = pool.find((s) => pool.filter((o) => o.tag === s.tag).length === 1)!;
    expect(pickDistractors(lonely, pool)).toHaveLength(2);
  });
});

describe('makeSayingProblem', () => {
  it('보기는 서로 다른 3개이고 정답이 들어 있다', () => {
    const pool = poolFor('proverb');
    for (let i = 0; i < 200; i += 1) {
      const p = makeSayingProblem(pool);
      expect(p.choices).toHaveLength(3);
      expect(new Set(p.choices.map((c) => c.text)).size).toBe(3);
      expect(p.choices).toContain(p.answer);
    }
  });

  it('두 방향으로 낸다', () => {
    // 한 방향으로만 내면 문장의 생김새만 외워서 맞히게 된다.
    const pool = poolFor('proverb');
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) seen.add(makeSayingProblem(pool).direction);
    expect([...seen].sort()).toEqual(['toMeaning', 'toText']);
  });

  it('사자성어 판에는 속담이 섞이지 않는다', () => {
    for (let i = 0; i < 100; i += 1) {
      const p = makeSayingProblem(poolFor('idiom'));
      for (const c of p.choices) expect(c.kind).toBe('idiom');
    }
  });
});

describe('makeSayingSet', () => {
  it('한 판 안에서 같은 표현이 두 번 나오지 않는다', () => {
    // 하나씩 따로 뽑으면 16개에서 열 번을 뽑는 셈이라 오히려 겹치는 쪽이 흔했다.
    for (let i = 0; i < 200; i += 1) {
      const set = makeSayingSet(poolFor('proverb'));
      const texts = set.map((p) => p.answer.text);
      expect(new Set(texts).size).toBe(texts.length);
    }
  });

  it('속담도 사자성어도 열 문제를 낸다', () => {
    expect(makeSayingSet(poolFor('proverb'))).toHaveLength(10);
    expect(makeSayingSet(poolFor('idiom'))).toHaveLength(10);
  });

  it('표현이 모자라면 있는 만큼만 낸다', () => {
    // 억지로 채우면 같은 표현이 한 판에 두 번 나온다.
    const few = poolFor('idiom').slice(0, 4);
    expect(makeSayingSet(few)).toHaveLength(4);
  });

  it('문제마다 보기 3개가 제대로 붙는다', () => {
    for (const p of makeSayingSet(poolFor('proverb'))) {
      expect(new Set(p.choices.map((c) => c.text)).size).toBe(3);
      expect(p.choices).toContain(p.answer);
    }
  });
});

describe('sayingQuestion / choiceText', () => {
  it('표현을 주면 뜻을 고르게 한다', () => {
    const s = sayingsOf('proverb')[0]!;
    const p = { answer: s, direction: 'toMeaning' as const, choices: [s] };
    expect(sayingQuestion(p)).toContain(s.text);
    expect(choiceText(s, 'toMeaning')).toBe(s.meaning);
  });

  it('뜻을 주면 표현을 고르게 한다', () => {
    const s = sayingsOf('proverb')[0]!;
    const p = { answer: s, direction: 'toText' as const, choices: [s] };
    // 물음에 표현이 들어가면 답이 그대로 드러난다.
    expect(sayingQuestion(p)).not.toContain(s.text);
    expect(choiceText(s, 'toText')).toBe(s.text);
  });
});

describe('sayingHint', () => {
  it('사자성어는 글자마다의 뜻을 보여준다', () => {
    const s = sayingsOf('idiom').find((x) => x.text === '설상가상')!;
    const hint = sayingHint({ answer: s, direction: 'toMeaning', choices: [s] });
    expect(hint).toContain('雪上加霜');
    expect(hint).toContain('눈 설');
  });

  it('속담은 쓰이는 장면을 보여준다', () => {
    // 속담에는 글자별 뜻 같은 실마리가 없다.
    const s = sayingsOf('proverb')[0]!;
    const hint = sayingHint({ answer: s, direction: 'toMeaning', choices: [s] });
    expect(hint).toBe(s.example);
  });
});

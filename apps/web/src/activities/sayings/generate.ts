/**
 * 속담·사자성어 문제 만들기.
 *
 * 두 방향으로 낸다 — 표현을 주고 뜻을 고르거나, 뜻을 주고 표현을 고르거나.
 * 한 방향으로만 내면 아이가 문장의 생김새만 외워서 맞히게 된다.
 */

import { sayingsOf, type Saying, type SayingKind } from './content';

/** 표현을 보고 뜻을 고를지, 뜻을 보고 표현을 고를지 */
export type SayingDirection = 'toMeaning' | 'toText';

export interface SayingProblem {
  answer: Saying;
  direction: SayingDirection;
  /** 보기 3개. 정답 하나와 그럴듯한 오답 둘. */
  choices: Saying[];
}

/** 한 판에 낼 문제 수. 초등 3학년이라 더하기 놀이와 같은 열 문제. */
export const SAYING_PROBLEM_COUNT = 10;

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * 오답 둘을 고른다.
 *
 * 하나는 **같은 갈래**(tag)에서, 하나는 **다른 갈래**에서 뽑는다.
 * 아무 뜻이나 섞으면 뜻을 몰라도 답이 보이고, 반대로 전부 비슷한 것만 모으면
 * 어른도 헷갈린다. 같은 갈래 하나가 아이를 한 번 멈춰 세우는 몫을 한다.
 */
export function pickDistractors(
  answer: Saying,
  pool: Saying[],
  rand: () => number = Math.random,
): Saying[] {
  const others = pool.filter((s) => s.text !== answer.text);
  const sameTag = shuffle(
    others.filter((s) => s.tag === answer.tag),
    rand,
  );
  const otherTag = shuffle(
    others.filter((s) => s.tag !== answer.tag),
    rand,
  );

  const picked: Saying[] = [];
  if (sameTag[0]) picked.push(sameTag[0]);
  for (const s of otherTag) {
    if (picked.length >= 2) break;
    picked.push(s);
  }
  // 같은 갈래가 하나도 없어 아직 모자라면 남은 것으로 채운다.
  for (const s of shuffle(others, rand)) {
    if (picked.length >= 2) break;
    if (!picked.some((p) => p.text === s.text)) picked.push(s);
  }
  return picked.slice(0, 2);
}

export function makeSayingProblem(
  pool: Saying[],
  rand: () => number = Math.random,
): SayingProblem {
  const answer = pool[Math.floor(rand() * pool.length)]!;
  const direction: SayingDirection = rand() < 0.5 ? 'toMeaning' : 'toText';
  const wrong = pickDistractors(answer, pool, rand);
  return { answer, direction, choices: shuffle([answer, ...wrong], rand) };
}

/**
 * 한 판에 낼 문제를 한꺼번에 만든다.
 *
 * 문제를 하나씩 따로 뽑으면 **같은 속담이 한 판에 두세 번 나온다.** 표현 16개에서
 * 열 번을 따로 뽑으면 겹치지 않을 확률이 오히려 낮다. 아이 입장에서는 방금 푼 것을
 * 또 푸는 셈이라 열 문제가 열 문제 몫을 못 한다.
 *
 * 그래서 먼저 섞은 뒤 앞에서부터 하나씩 가져다 쓴다. 표현이 문제 수보다 적으면
 * (사자성어는 아직 여덟 개다) **있는 만큼만 낸다** — 억지로 채우면 다시 겹친다.
 */
export function makeSayingSet(
  pool: Saying[],
  count = SAYING_PROBLEM_COUNT,
  rand: () => number = Math.random,
): SayingProblem[] {
  return shuffle(pool, rand)
    .slice(0, Math.min(count, pool.length))
    .map((answer) => {
      const direction: SayingDirection = rand() < 0.5 ? 'toMeaning' : 'toText';
      const wrong = pickDistractors(answer, pool, rand);
      return { answer, direction, choices: shuffle([answer, ...wrong], rand) };
    });
}

/** 이 과목에서 낼 표현들. 지금은 세 권 모두에 실린 것만 담겨 있다. */
/**
 * 오늘 볼 것 수.
 *
 * 속담이 마흔일곱, 사자성어가 쉰일곱이라 **한 쪽에 다섯씩이면 열 쪽이 넘는다.**
 * 그것을 다 넘겨야 문제를 풀 수 있었으니 라윤이가 매번 끝까지 보기 어려웠다.
 *
 * 오늘 볼 것만 뽑아 한 쪽으로 줄인다. 다음에 열면 다른 것이 나오므로 자료가 많은
 * 것이 그대로 이득이 된다. 낱말 읽기에서 쓴 것과 같은 방법이다.
 */
export const SAYINGS_PER_ROUND = 10;

/** 오늘 볼 속담·사자성어를 뽑는다. */
export function pickRound(
  pool: Saying[],
  count = SAYINGS_PER_ROUND,
  rand: () => number = Math.random,
): Saying[] {
  return shuffle(pool, rand).slice(0, Math.min(count, pool.length));
}

export function poolFor(kind: SayingKind): Saying[] {
  return sayingsOf(kind);
}

/** 물음 문장 */
export function sayingQuestion(p: SayingProblem): string {
  if (p.direction === 'toMeaning') return `‘${p.answer.text}’ 은 무슨 뜻일까?`;
  return '이런 뜻을 가진 말은 무엇일까?';
}

/** 보기 한 칸에 쓸 글 */
export function choiceText(s: Saying, direction: SayingDirection): string {
  return direction === 'toMeaning' ? s.meaning : s.text;
}

/**
 * 표현 옆에 붙일 한자. 속담에는 없다.
 * 한자를 같이 보여주면 글자 뜻에서 말뜻을 짐작하는 힘이 붙는다.
 */
export function hanjaOf(s: Saying): string | null {
  return s.kind === 'idiom' && s.hanja ? s.hanja : null;
}

/**
 * 3차(힌트 라운드)에 띄울 안내.
 *
 * 사자성어는 글자마다 뜻이 있어 그것만 보여줘도 뜻이 짐작된다.
 * 속담에는 그런 실마리가 없으므로 쓰이는 장면을 예로 보여준다.
 */
export function sayingHint(p: SayingProblem): string {
  const s = p.answer;
  if (s.kind === 'idiom' && s.hanja && s.chars) {
    return `${s.hanja} — ${s.chars.join(', ')}`;
  }
  return s.example;
}

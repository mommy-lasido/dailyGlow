/**
 * 문장제 — **묻는 것을 끝까지 읽는 연습.**
 *
 * 라윤이는 미국 과정으로 수학을 배우는데, 거기서는 셈보다 **문장을 읽고
 * 생각하는 것**이 어려운 자리다. 영숙님이 그래서 문장제부터 채우자고 했다.
 *
 * 문장제를 틀리는 가장 흔한 까닭은 셈을 못해서가 아니라 **중간에 구한 숫자를
 * 답으로 적기 때문**이다. 색종이 48장의 4분의 1을 주었으면 12를 구하고 거기서
 * 멈추는데, 묻는 것은 남은 36장이다.
 *
 * 그래서 이 활동은 **두 걸음**으로 묻는다.
 *   ① 이 문제는 무엇을 묻고 있나 — 중간값과 최종값을 갈라내는 자리
 *   ② 답은 얼마인가 — 보기에서 고르지 않고 **숫자를 적는다**
 *
 * 보기에서 고르게 하면 셈해서 맞는 것을 찾을 뿐 문제를 해부하지 않는다.
 * 숫자를 적게 하면 찍을 수가 없다.
 *
 * 문장은 **틀(템플릿)로 만든다.** 문장을 미리 다 써 두면 언젠가 떨어지고,
 * 앱이 통째로 지어내면 말이 어색해진다. 문장은 내가 쓰고 숫자만 그때그때
 * 고르면, 말은 반듯하고 문제는 마르지 않는다.
 */

/** 함정의 종류. 기획안(docs/수학-연습-기획안.md)의 사다리를 따른다. */
export type TrapKind =
  /** A · 남은 것을 묻는다 — 처음 구한 숫자가 답이 아니다 */
  | 'leftover'
  /** B · 필요 없는 숫자가 있다 */
  | 'extra'
  /** C · 여러 단계를 거친다 */
  | 'twoStep'
  /** D · 단위가 바뀐다 */
  | 'unit'
  /** F · 거꾸로 묻는다 — 얼마나 더 있어야 하나 */
  | 'reverse';

export interface WordProblem {
  kind: TrapKind;
  /** 문제 전문 */
  text: string;
  /** 무엇을 묻고 있는가 — 고르기의 정답 */
  asks: string;
  /** 함께 낼 그럴듯한 오답. 대개 **중간에 구하는 값**이다. */
  decoys: string[];
  answer: number;
  /** 답에 붙는 말 — 개 · 장 · 명 · 분 */
  unit: string;
  /** ①에서 틀렸을 때 짚어 주는 말 */
  askHint: string;
  /** ②에서 틀렸을 때 짚어 주는 말 */
  answerHint: string;
}

const NAMES = ['라윤이', '시윤이', '도윤이', '민서', '지호', '하준', '서아'];

function pick<T>(list: T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length)]!;
}

/** a 이상 b 이하의 정수 */
function between(a: number, b: number, rand: () => number): number {
  return a + Math.floor(rand() * (b - a + 1));
}

// ── 틀 ─────────────────────────────────────────────────

/** A · 나눠 주고 남은 것. 분수만큼 준다 — 미국 3학년의 자리다. */
function leftoverFraction(rand: () => number): WordProblem {
  const name = pick(NAMES, rand);
  const parts = pick([2, 3, 4], rand);
  const each = between(4, 12, rand);
  const total = parts * each;
  const given = each;
  const thing = pick(
    [
      { what: '색종이', unit: '장' },
      { what: '붙임딱지', unit: '장' },
      { what: '구슬', unit: '개' },
    ],
    rand,
  );

  return {
    kind: 'leftover',
    text: `${name}는 ${thing.what} ${total}${thing.unit}을 가지고 있었어요. 그중 ${parts}분의 1을 동생에게 주었어요. 남은 ${thing.what}는 몇 ${thing.unit}일까요?`,
    asks: `남은 ${thing.what}의 수`,
    decoys: [`동생에게 준 ${thing.what}의 수`, `처음에 가지고 있던 ${thing.what}의 수`],
    answer: total - given,
    unit: thing.unit,
    askHint: `${given}${thing.unit}은 동생에게 준 것이에요. 문제는 **남은 것**을 물었어요.`,
    answerHint: `${parts}분의 1은 ${given}${thing.unit}이에요. 전체 ${total}에서 빼 보세요.`,
  };
}

/** B · 필요 없는 숫자가 끼어 있다. */
function extraNumber(rand: () => number): WordProblem {
  const name = pick(NAMES, rand);
  const rows = between(3, 6, rand);
  const each = between(12, 25, rand);
  const noise = between(9, 30, rand);

  return {
    kind: 'extra',
    text: `도서관 책꽂이 한 칸에 동화책이 ${each}권씩 ${rows}칸 꽂혀 있어요. 그 옆 상자에는 잡지가 ${noise}권 들어 있어요. ${name}가 세어야 할 동화책은 모두 몇 권일까요?`,
    asks: '책꽂이에 꽂힌 동화책의 수',
    decoys: ['동화책과 잡지를 합한 수', '상자에 든 잡지의 수'],
    answer: rows * each,
    unit: '권',
    askHint: '잡지는 묻지 않았어요. 문제가 묻는 것은 **동화책**이에요.',
    answerHint: `한 칸에 ${each}권씩 ${rows}칸이에요. 곱해 보세요.`,
  };
}

/** C · 두 걸음을 거친다. */
function twoStep(rand: () => number): WordProblem {
  const name = pick(NAMES, rand);
  const boxes = pick([4, 6, 8], rand);
  const each = between(6, 15, rand);
  const total = boxes * each;
  const gave = between(1, boxes - 2, rand);

  return {
    kind: 'twoStep',
    text: `${name}가 쿠키 ${total}개를 ${boxes}상자에 똑같이 나누어 담았어요. 그중 ${gave}상자를 이웃에게 주었어요. ${name}에게 남은 쿠키는 몇 개일까요?`,
    asks: '남은 쿠키의 수',
    decoys: ['한 상자에 담은 쿠키의 수', '이웃에게 준 쿠키의 수'],
    answer: total - gave * each,
    unit: '개',
    askHint: `한 상자에 ${each}개씩 담은 것은 중간에 구하는 수예요. 문제는 **남은 쿠키**를 물었어요.`,
    answerHint: `한 상자는 ${each}개, 준 것은 ${gave}상자예요. 전체에서 빼 보세요.`,
  };
}

/** D · 단위가 바뀐다 — 다스·시간. */
function unitChange(rand: () => number): WordProblem {
  const name = pick(NAMES, rand);
  const useMinutes = rand() < 0.5;

  if (useMinutes) {
    const hours = 1;
    const extra = pick([10, 20, 30, 40], rand);
    const comic = between(15, 45, rand);
    const total = hours * 60 + extra;
    return {
      kind: 'unit',
      text: `${name}가 ${hours}시간 ${extra}분 동안 책을 읽었어요. 그중 ${comic}분은 만화책이었어요. 만화책이 아닌 책을 읽은 시간은 몇 분일까요?`,
      asks: '만화책이 아닌 책을 읽은 시간(분)',
      decoys: ['책을 읽은 전체 시간(분)', '만화책을 읽은 시간(분)'],
      answer: total - comic,
      unit: '분',
      askHint: '문제는 **만화책이 아닌 책**을 읽은 시간을 물었어요.',
      answerHint: `${hours}시간 ${extra}분은 ${total}분이에요. 거기서 ${comic}분을 빼 보세요.`,
    };
  }

  const dozen = pick([2, 3, 4], rand);
  const used = between(3, 11, rand);
  const total = dozen * 12;
  return {
    kind: 'unit',
    text: `연필 한 다스는 12자루예요. ${name}가 연필 ${dozen}다스를 사서 ${used}자루를 썼어요. 남은 연필은 몇 자루일까요?`,
    asks: '남은 연필의 수(자루)',
    decoys: ['산 연필의 수(자루)', '쓴 연필의 수(자루)'],
    answer: total - used,
    unit: '자루',
    askHint: '문제는 **남은 연필**을 물었어요. 산 연필이 아니에요.',
    answerHint: `${dozen}다스는 ${total}자루예요. 거기서 ${used}자루를 빼 보세요.`,
  };
}

/** F · 거꾸로 묻는다 — 얼마나 더 있어야 하나. */
function reverse(rand: () => number): WordProblem {
  const bundles = between(5, 9, rand);
  const each = between(12, 25, rand);
  const have = bundles * each;
  const need = have + between(20, 80, rand);

  return {
    kind: 'reverse',
    text: `학예회에 붙임딱지 ${need}장이 필요해요. 지금은 ${each}장씩 ${bundles}묶음이 있어요. 몇 장이 더 있어야 할까요?`,
    asks: '더 있어야 하는 붙임딱지의 수',
    decoys: ['지금 있는 붙임딱지의 수', '필요한 붙임딱지 전체의 수'],
    answer: need - have,
    unit: '장',
    askHint: '문제는 "지금 몇 장인가" 가 아니라 **몇 장이 더 있어야 하는가**를 물었어요.',
    answerHint: `${each}장씩 ${bundles}묶음이면 ${have}장이에요. ${need}에서 빼 보세요.`,
  };
}

const TEMPLATES: ((rand: () => number) => WordProblem)[] = [
  leftoverFraction,
  extraNumber,
  twoStep,
  unitChange,
  reverse,
];

/** 한 판에 낼 문제 수. 문장을 읽어야 해서 다른 활동보다 적다. */
export const PROBLEM_COUNT = 4;

/**
 * 문제 안에 **답이 그대로 적혀 있으면** 다시 만든다.
 *
 * 숫자를 무작위로 고르다 보면 이따금 답과 같은 숫자가 문장에 나온다
 * ("1시간 10분 중 35분" → 답도 35분). 그러면 아이가 문장을 읽지 않고 눈에
 * 띄는 숫자를 베껴 쓴다.
 */
function leaksAnswer(p: WordProblem): boolean {
  return new RegExp(`(^|[^0-9])${p.answer}([^0-9]|$)`).test(p.text);
}

export function makeProblem(rand: () => number = Math.random): WordProblem {
  const make = pick(TEMPLATES, rand);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const p = make(rand);
    if (!leaksAnswer(p)) return p;
  }
  // 스무 번을 다시 만들어도 걸리면 다른 틀로 바꾼다.
  return makeProblem(rand);
}

/**
 * 한 판 분량. **함정의 종류가 겹치지 않게** 뽑는다 — 같은 함정이 잇따르면
 * 아이가 문장을 읽지 않고 앞 문제의 수법을 그대로 쓴다.
 */
export function makeSet(
  count = PROBLEM_COUNT,
  rand: () => number = Math.random,
): WordProblem[] {
  const order = [...TEMPLATES];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order.slice(0, Math.min(count, order.length)).map((make) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const p = make(rand);
      if (!leaksAnswer(p)) return p;
    }
    return make(rand);
  });
}

/** "무엇을 묻고 있나" 보기. 정답 하나에 중간값 설명을 섞는다. */
export function askChoices(
  problem: WordProblem,
  rand: () => number = Math.random,
): string[] {
  const all = [problem.asks, ...problem.decoys];
  for (let i = all.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all;
}

/**
 * 자음모음 배우기의 글자 만들기.
 *
 * 순서는 『기적의 한글 학습』을 그대로 따른다 — 1단계는 기본 모음 열 개,
 * 2~14단계는 그 단계의 자음을 열 개의 기본 모음과 하나씩 붙인 글자다.
 * (2단계 'ㄱ' → 가 갸 거 겨 고 교 구 규 그 기)
 *
 * 책의 1·2권이 여기까지다. 15단계부터는 받침이 붙기 시작하므로 이 활동이 아니라
 * 낱말 읽기가 맡는다.
 */

import { hangulStage } from '@dailyglow/utils';

/** 이 활동이 다루는 마지막 단계. 여기까지가 책의 1·2권(기본자 학습)이다. */
export const JAMO_MAX_STAGE = 14;

export interface JamoItem {
  /** 화면에 보여줄 글자 */
  letter: string;
  /** 읽어줄 소리. 모음 'ㅏ' 는 '아' 로 읽어야 소리가 제대로 난다. */
  sound: string;
}

/** 1단계에서 배우는 기본 모음 열 개. 책의 차례 그대로다. */
export const BASIC_VOWELS: JamoItem[] = [
  { letter: 'ㅏ', sound: '아' },
  { letter: 'ㅑ', sound: '야' },
  { letter: 'ㅓ', sound: '어' },
  { letter: 'ㅕ', sound: '여' },
  { letter: 'ㅗ', sound: '오' },
  { letter: 'ㅛ', sound: '요' },
  { letter: 'ㅜ', sound: '우' },
  { letter: 'ㅠ', sound: '유' },
  { letter: 'ㅡ', sound: '으' },
  { letter: 'ㅣ', sound: '이' },
];

/**
 * 자음 열넷. 가나다 순서다.
 *
 * 책은 1단계(모음) 다음에 바로 2단계 '가 갸 거 겨' 로 넘어가지만, 그 사이에
 * **자음의 모양과 이름**을 익히는 걸음이 하나 빠져 있다. 만 3~4세에게는
 * 'ㄱ' 이 어떻게 생겼는지가 '가' 를 읽는 것보다 먼저다.
 *
 * 책이 다루지 않는 'ㅇ' 도 넣는다. 책에서는 15단계 받침으로 처음 나오지만,
 * 아이는 '아·이·오·우' 에서 이 모양을 날마다 본다.
 */
export const BASIC_CONSONANTS: JamoItem[] = [
  { letter: 'ㄱ', sound: '기역' },
  { letter: 'ㄴ', sound: '니은' },
  { letter: 'ㄷ', sound: '디귿' },
  { letter: 'ㄹ', sound: '리을' },
  { letter: 'ㅁ', sound: '미음' },
  { letter: 'ㅂ', sound: '비읍' },
  { letter: 'ㅅ', sound: '시옷' },
  { letter: 'ㅇ', sound: '이응' },
  { letter: 'ㅈ', sound: '지읒' },
  { letter: 'ㅊ', sound: '치읓' },
  { letter: 'ㅋ', sound: '키읔' },
  { letter: 'ㅌ', sound: '티읕' },
  { letter: 'ㅍ', sound: '피읖' },
  { letter: 'ㅎ', sound: '히읗' },
];

/**
 * 이 단계의 아이에게 보여줄 자음.
 *
 * 처음에는 'ㄱ ㄴ ㄷ ㄹ' 넷만 본다. 열넷을 한꺼번에 늘어놓으면 네 살에게는
 * 너무 많다. 단계가 오를수록 하나씩 늘어 열넷을 다 채운다.
 */
export function consonantsForStage(stage: number): JamoItem[] {
  const count = Math.max(4, Math.min(stage + 3, BASIC_CONSONANTS.length));
  return BASIC_CONSONANTS.slice(0, count);
}

/** 유니코드에서 한글 첫소리(초성)가 놓인 순서 */
const LEAD = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
/** 유니코드에서 가운뎃소리(중성)가 놓인 순서 */
const VOWEL = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';

/** 첫소리와 가운뎃소리를 합쳐 한 글자로 만든다. 받침은 쓰지 않는다. */
export function composeSyllable(lead: string, vowel: string): string {
  const l = LEAD.indexOf(lead);
  const v = VOWEL.indexOf(vowel);
  if (l < 0 || v < 0) return '';
  return String.fromCharCode(0xac00 + (l * 21 + v) * 28);
}

/** "기본 자음 'ㄱ'" 같은 단계 이름에서 따옴표 안의 글자를 꺼낸다. */
export function stageLetter(stage: number): string | null {
  const found = hangulStage(stage);
  if (!found) return null;
  const match = found.label.match(/'([^']+)'/);
  return match ? match[1]! : null;
}

/**
 * 이 단계에서 배울 글자들.
 *
 * 아직 아무것도 안 배운 아이(1단계)는 모음부터, 자음 단계는 그 자음이 모음과
 * 만나 어떤 소리가 되는지를 배운다. 15단계 넘게 올라간 아이는 자음·모음을 이미
 * 뗐으므로 마지막 자음(ㅎ)으로 맞춰 복습이 되게 한다.
 */
export function lettersForStage(stage: number): JamoItem[] {
  const clamped = Math.min(Math.max(stage, 1), JAMO_MAX_STAGE);
  if (clamped === 1) return BASIC_VOWELS;

  const lead = stageLetter(clamped);
  if (!lead) return BASIC_VOWELS;

  return BASIC_VOWELS.map((v) => {
    const letter = composeSyllable(lead, v.letter);
    return { letter, sound: letter };
  });
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export interface JamoProblem {
  answer: JamoItem;
  /** 보기 3개. 정답 하나와 같은 단계의 다른 글자 둘. */
  choices: JamoItem[];
}

/**
 * 소리를 들려주고 글자를 고르게 하는 문제.
 * 오답도 같은 단계 안에서 고른다 — 전혀 다른 글자를 섞으면 소리를 안 듣고도
 * 모양만으로 답이 보인다.
 */
export function makeJamoProblem(
  items: JamoItem[],
  rand: () => number = Math.random,
): JamoProblem {
  const pool = shuffle(items, rand);
  const [answer, b, c] = pool;
  return { answer: answer!, choices: shuffle([answer!, b!, c!], rand) };
}

/** 한 판에 낼 문제 수. 이 활동을 하는 아이는 만 3~5세라 짧게 끝나야 한다. */
export const JAMO_PROBLEM_COUNT = 5;

/**
 * 한 판에 낼 문제를 한꺼번에 만든다.
 *
 * 문제를 하나씩 따로 뽑으면 **같은 글자가 한 판에 두 번 나온다.** 방금 찾은 글자를
 * 또 찾는 셈이라 다섯 문제가 다섯 문제 몫을 못 한다. 먼저 섞은 뒤 앞에서부터
 * 가져다 쓰고, 글자가 문제 수보다 적으면 있는 만큼만 낸다.
 */
export function makeJamoSet(
  items: JamoItem[],
  count = JAMO_PROBLEM_COUNT,
  rand: () => number = Math.random,
): JamoProblem[] {
  return shuffle(items, rand)
    .slice(0, Math.min(count, items.length))
    .map((answer) => {
      const others = shuffle(
        items.filter((i) => i.letter !== answer.letter),
        rand,
      );
      return {
        answer,
        choices: shuffle([answer, others[0]!, others[1]!], rand),
      };
    });
}

/** 3차(힌트 라운드)에 띄울 안내 */
export function jamoHint(p: JamoProblem): string {
  return `'${p.answer.sound}' 소리는 이렇게 생겼어요.`;
}

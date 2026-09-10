/**
 * 한글 글자를 자모로 쪼개고, 그 글자를 읽으려면 몇 단계까지 배워야 하는지 센다.
 *
 * 단계 번호는 『기적의 한글 학습』의 35단계를 그대로 쓴다(`hangul-stages.ts`).
 * 이 파일은 **낱말을 고르는 자를 만드는 것**이지 새 교육과정을 짜는 것이 아니다.
 * 어떤 낱말이 몇 단계짜리인지는 사람이 정하지 않고 여기서 계산한다 —
 * 손으로 정하면 반드시 어긋나는 것이 생긴다.
 *
 * 예) '사과' → 초성 ㅅ(8단계) ㄱ(2단계), 중성 ㅏ ㅘ… 가 아니라 ㅏ, ㅗ+ㅏ=ㅘ(25단계)
 *     이 아니고 실제로는 ㅅ+ㅏ, ㄱ+ㅗ+ㅏ 가 아니라 ㄱ+ㅘ 다. 가장 높은 단계가
 *     그 낱말을 읽을 수 있게 되는 시점이다.
 */

const BASE = 0xac00;
const LAST = 0xd7a3;

/** 유니코드가 정한 첫소리 차례 */
export const LEAD_JAMO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;

/** 유니코드가 정한 가운뎃소리 차례 */
export const VOWEL_JAMO = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
] as const;

/** 유니코드가 정한 받침 차례. 첫 칸은 받침이 없다는 뜻이다. */
export const TAIL_JAMO = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
  'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;

export interface Syllable {
  lead: string;
  vowel: string;
  /** 받침이 없으면 빈 글자 */
  tail: string;
}

/** 한글 한 글자인가 (가 ~ 힣) */
export function isHangulSyllable(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= BASE && code <= LAST;
}

/** 한 글자를 첫소리·가운뎃소리·받침으로 쪼갠다. 한글이 아니면 null. */
export function decompose(ch: string): Syllable | null {
  if (!isHangulSyllable(ch)) return null;
  const n = ch.charCodeAt(0) - BASE;
  return {
    lead: LEAD_JAMO[Math.floor(n / 588)]!,
    vowel: VOWEL_JAMO[Math.floor((n % 588) / 28)]!,
    tail: TAIL_JAMO[n % 28]!,
  };
}

/** 쪼갠 것을 다시 한 글자로 합친다. */
export function compose(s: Syllable): string {
  const l = LEAD_JAMO.indexOf(s.lead as (typeof LEAD_JAMO)[number]);
  const v = VOWEL_JAMO.indexOf(s.vowel as (typeof VOWEL_JAMO)[number]);
  const t = TAIL_JAMO.indexOf((s.tail || '') as (typeof TAIL_JAMO)[number]);
  if (l < 0 || v < 0 || t < 0) return '';
  return String.fromCharCode(BASE + (l * 21 + v) * 28 + t);
}

/**
 * 첫소리를 배우는 단계.
 *
 * 'ㅇ' 은 책이 첫소리로 따로 가르치지 않는다 — 소리가 나지 않아서 1단계의
 * 모음을 배울 때 '아, 야, 어' 로 이미 만난다. 그래서 1단계로 둔다.
 */
const LEAD_STAGE: Record<string, number> = {
  ㅇ: 1,
  ㄱ: 2, ㄴ: 3, ㄷ: 4, ㄹ: 5, ㅁ: 6, ㅂ: 7,
  ㅅ: 8, ㅈ: 9, ㅊ: 10, ㅋ: 11, ㅌ: 12, ㅍ: 13, ㅎ: 14,
  ㄲ: 29, ㄸ: 30, ㅃ: 31, ㅆ: 32, ㅉ: 33,
};

/** 가운뎃소리를 배우는 단계. 1단계의 기본 모음 열 개와 4권의 복잡한 모음. */
const VOWEL_STAGE: Record<string, number> = {
  ㅏ: 1, ㅑ: 1, ㅓ: 1, ㅕ: 1, ㅗ: 1, ㅛ: 1, ㅜ: 1, ㅠ: 1, ㅡ: 1, ㅣ: 1,
  ㅐ: 22, ㅔ: 23, ㅟ: 24, ㅘ: 25, ㅢ: 25, ㅚ: 26, ㅙ: 26,
  ㅝ: 27, ㅞ: 27, ㅒ: 28, ㅖ: 28,
};

/** 받침을 배우는 단계. 3권이 다루는 일곱 개뿐이다. */
const TAIL_STAGE: Record<string, number> = {
  '': 1,
  ㅇ: 15, ㅁ: 16, ㄹ: 17, ㄴ: 18, ㄱ: 19, ㅂ: 20, ㅅ: 21,
};

/**
 * 이 낱말을 읽으려면 몇 단계까지 배워야 하는가.
 *
 * 글자마다 첫소리·가운뎃소리·받침이 필요한 단계를 보고 그중 **가장 높은 것**을
 * 고른다. 하나라도 책이 다루지 않는 자모(겹받침 ㄳ·ㄺ 이나 쌍받침)가 있으면
 * null 을 돌려준다 — 그런 낱말은 이 활동에서 쓰지 않는다.
 *
 * 한글이 아닌 글자(사이띄개·물음표 따위)는 세지 않고 넘어간다.
 */
export function minStageFor(word: string): number | null {
  let stage = 1;
  let sawHangul = false;

  for (const ch of word) {
    const s = decompose(ch);
    if (!s) continue;
    sawHangul = true;
    const parts = [LEAD_STAGE[s.lead], VOWEL_STAGE[s.vowel], TAIL_STAGE[s.tail]];
    for (const p of parts) {
      if (p === undefined) return null;
      if (p > stage) stage = p;
    }
  }

  return sawHangul ? stage : null;
}

/** 이 아이가 지금 배운 데까지로 읽을 수 있는 낱말인가. */
export function canRead(word: string, learnedStage: number): boolean {
  const need = minStageFor(word);
  return need !== null && need <= learnedStage;
}

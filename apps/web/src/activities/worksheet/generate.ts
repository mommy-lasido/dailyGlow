/**
 * 쓰기 연습지 만들기.
 *
 * 이 활동은 **화면에서 푸는 것이 아니다.** 인쇄해서 연필로 쓴다.
 * 시윤이는 손에 힘을 키워야 할 나이라 태블릿에 스타일러스로 쓰는 것이 연필을 쥐고
 * 종이에 눌러 쓰는 것을 대신하지 못한다. 태블릿의 몫은 **아이 단계에 맞는 글자를
 * 골라 인쇄해 주는 것**까지다.
 *
 * 무엇을 쓸지는 아이가 배운 단계가 정한다 — 낱말 읽기·자음모음 배우기와 같은 자료를
 * 그대로 쓰므로, 읽을 수 있는 것만 쓰게 된다.
 */

import { BASIC_VOWELS, consonantsForStage, lettersForStage } from '@/activities/jamo/generate';
import { poolForStage as wordsForStage } from '@/activities/words/generate';

export type SheetKind = 'vowel' | 'consonant' | 'letter' | 'word';

export interface SheetOption {
  kind: SheetKind;
  label: string;
  /** 이 단계부터 고를 수 있다 */
  minStage: number;
}

export const SHEET_OPTIONS: SheetOption[] = [
  { kind: 'consonant', label: '자음 쓰기', minStage: 1 },
  { kind: 'vowel', label: '모음 쓰기', minStage: 1 },
  // 자음과 모음이 만난 글자는 책의 2단계부터다.
  { kind: 'letter', label: '글자 쓰기', minStage: 2 },
  // 낱말은 읽을 수 있는 것이 몇 개는 되어야 쓸 거리가 된다.
  { kind: 'word', label: '낱말 쓰기', minStage: 5 },
];

export function optionsForStage(stage: number): SheetOption[] {
  return SHEET_OPTIONS.filter((o) => stage >= o.minStage);
}

/** 한 장에 넣을 줄 수. 너무 많으면 아이가 질리고, 적으면 종이가 아깝다. */
export const ROWS_PER_SHEET = 8;
/** 한 줄에 몇 번 쓰는가. 첫 번째는 따라 쓰도록 흐리게 보여주는 본보기다. */
export const WRITES_PER_ROW = 5;

export interface SheetRow {
  /** 쓸 글자나 낱말 */
  text: string;
  /** 소리 내어 읽을 말. 모음 'ㅏ' 는 '아' 로 읽어야 한다. */
  sound: string;
}

/** 이 아이가 이 갈래로 쓸 수 있는 것들 */
export function sourceFor(kind: SheetKind, stage: number): SheetRow[] {
  if (kind === 'vowel') return BASIC_VOWELS.map((v) => ({ text: v.letter, sound: v.sound }));
  if (kind === 'consonant')
    return consonantsForStage(stage).map((c) => ({ text: c.letter, sound: c.sound }));
  if (kind === 'letter')
    return lettersForStage(stage).map((l) => ({ text: l.letter, sound: l.sound }));
  return wordsForStage(stage).map((w) => ({ text: w.word, sound: w.word }));
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * 연습지 한 장.
 *
 * 쓸 것이 여덟 개보다 적으면 있는 만큼만 넣는다 — 같은 글자를 두 줄에 넣어
 * 억지로 채우면 연습지가 지루해진다.
 */
export function makeSheet(
  kind: SheetKind,
  stage: number,
  rand: () => number = Math.random,
): SheetRow[] {
  const source = sourceFor(kind, stage);
  return shuffle(source, rand).slice(0, Math.min(ROWS_PER_SHEET, source.length));
}

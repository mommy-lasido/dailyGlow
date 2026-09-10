/**
 * 문장 읽기 자료.
 *
 * 낱말 읽기와 같이, **몇 단계짜리 문장인지는 사람이 정하지 않는다.**
 * `minStageFor` 가 글자를 자모로 쪼개서 계산한다.
 *
 * 문장은 모두 **그림으로 보일 수 있는 것**으로 골랐다. 그림을 보고 그에 맞는
 * 문장을 찾게 해야 진짜로 읽게 되기 때문이다.
 *
 * 그리고 **비슷한 문장을 일부러 짝으로 넣었다** — "곰이 밥을 먹어요" 옆에
 * "개가 밥을 먹어요" 와 "곰이 물을 마셔요" 가 있다. 한 낱말만 다르므로 문장을
 * 끝까지 읽어야 고를 수 있다. 첫 낱말만 보고 찍는 것을 막는 장치다.
 */

export interface SentenceItem {
  sentence: string;
  /** 그림 대신 쓰는 그림글자. 문장이 그리는 장면이다. */
  emoji: string;
}

export const SENTENCE_ITEMS: SentenceItem[] = [
  // 자는 이야기 — 누가 자는지 읽어야 한다
  { sentence: '오리가 자요', emoji: '🦆😴' },
  { sentence: '여우가 자요', emoji: '🦊😴' },
  { sentence: '소가 자요', emoji: '🐮😴' },
  { sentence: '하마가 자요', emoji: '🦛😴' },
  { sentence: '돼지가 자요', emoji: '🐷😴' },

  // 마시는 이야기 — 누가 무엇을 마시는지
  { sentence: '아이가 우유를 마셔요', emoji: '👶🥛' },
  { sentence: '누나가 우유를 마셔요', emoji: '👧🥛' },
  { sentence: '소가 물을 마셔요', emoji: '🐮💧' },
  { sentence: '곰이 물을 마셔요', emoji: '🐻💧' },

  // 먹는 이야기
  { sentence: '곰이 밥을 먹어요', emoji: '🐻🍚' },
  { sentence: '개가 밥을 먹어요', emoji: '🐶🍚' },
  { sentence: '쥐가 밥을 먹어요', emoji: '🐭🍚' },
  { sentence: '아이가 수박을 먹어요', emoji: '👶🍉' },
  { sentence: '개미가 과자를 먹어요', emoji: '🐜🍪' },

  // 큰 것 — 무엇이 큰지
  { sentence: '코가 커요', emoji: '👃⬆️' },
  { sentence: '나비가 커요', emoji: '🦋⬆️' },
  { sentence: '달이 커요', emoji: '🌙⬆️' },
  { sentence: '별이 커요', emoji: '⭐⬆️' },
  { sentence: '사과가 커요', emoji: '🍎⬆️' },
  { sentence: '시계가 커요', emoji: '⌚⬆️' },

  // 아픈 이야기
  { sentence: '다리가 아파요', emoji: '🦵😣' },
  { sentence: '머리가 아파요', emoji: '🧑😣' },

  // 가는 이야기 — 누가 어디로 가는지
  { sentence: '나비가 나무로 가요', emoji: '🦋🌳' },
  { sentence: '새가 나무로 가요', emoji: '🐦🌳' },
  { sentence: '오리가 바다로 가요', emoji: '🦆🌊' },
  { sentence: '게가 바다로 가요', emoji: '🦀🌊' },
  { sentence: '아이가 산에 가요', emoji: '👶⛰️' },
  { sentence: '곰이 산에 가요', emoji: '🐻⛰️' },

  // 입는 이야기
  { sentence: '아이가 옷을 입어요', emoji: '👶👕' },
  { sentence: '누나가 치마를 입어요', emoji: '👧👗' },
];

/**
 * 낱말 읽기 자료.
 *
 * **몇 단계짜리 낱말인지는 사람이 정하지 않는다.** `minStageFor` 가 글자를 자모로
 * 쪼개서 계산한다 — 손으로 매기면 반드시 어긋나는 것이 생긴다. 여기에는 낱말과
 * 그림만 적는다.
 *
 * 낱말은 모두 **눈에 보이는 것**으로 골랐다. 이 활동은 소리를 듣고 고르는 것이
 * 아니라 **글을 읽고 고르는 것**이라, 그림을 보고 그에 맞는 글자를 찾게 해야
 * 진짜로 읽게 된다. 그림이 없는 낱말(생각·마음 같은 것)은 쓸 수 없다.
 *
 * 책이 다루지 않는 자모가 든 낱말(겹받침 '닭', 쌍받침 '있다')은 계산이 null 을
 * 돌려주므로 저절로 빠진다.
 */

export interface WordItem {
  word: string;
  /** 그림 대신 쓰는 그림글자 */
  emoji: string;
}

export const WORD_ITEMS: WordItem[] = [
  // 1단계 · 기본 모음만으로
  { word: '오이', emoji: '🥒' },
  { word: '우유', emoji: '🥛' },
  { word: '여우', emoji: '🦊' },
  { word: '아이', emoji: '👶' },

  // 2~7단계 · 기본 자음 ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ
  { word: '고기', emoji: '🥩' },
  { word: '누나', emoji: '👧' },
  { word: '구두', emoji: '👠' },
  { word: '오리', emoji: '🦆' },
  { word: '다리', emoji: '🦵' },
  { word: '라디오', emoji: '📻' },
  { word: '머리', emoji: '🧑' },
  { word: '고구마', emoji: '🍠' },
  { word: '나비', emoji: '🦋' },
  { word: '바나나', emoji: '🍌' },
  { word: '바다', emoji: '🌊' },

  // 8~14단계 · 기본 자음 ㅅ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ
  { word: '소', emoji: '🐮' },
  { word: '사다리', emoji: '🪜' },
  { word: '사자', emoji: '🦁' },
  { word: '모자', emoji: '🧢' },
  { word: '자두', emoji: '🫐' },
  { word: '지도', emoji: '🗺️' },
  { word: '치마', emoji: '👗' },
  { word: '치즈', emoji: '🧀' },
  { word: '코', emoji: '👃' },
  { word: '커피', emoji: '☕' },
  { word: '토마토', emoji: '🍅' },
  { word: '도토리', emoji: '🌰' },
  { word: '포도', emoji: '🍇' },
  { word: '피자', emoji: '🍕' },
  { word: '하마', emoji: '🦛' },

  // 15~21단계 · 받침 ㅇ ㅁ ㄹ ㄴ ㄱ ㅂ ㅅ
  { word: '가방', emoji: '🎒' },
  { word: '사탕', emoji: '🍬' },
  { word: '콩', emoji: '🫘' },
  { word: '곰', emoji: '🐻' },
  { word: '봄', emoji: '🌸' },
  { word: '물', emoji: '💧' },
  { word: '불', emoji: '🔥' },
  { word: '달', emoji: '🌙' },
  { word: '별', emoji: '⭐' },
  { word: '눈', emoji: '👁️' },
  { word: '손', emoji: '✋' },
  { word: '산', emoji: '⛰️' },
  { word: '수박', emoji: '🍉' },
  { word: '죽', emoji: '🍲' },
  { word: '밥', emoji: '🍚' },
  { word: '입', emoji: '👄' },
  { word: '컵', emoji: '🥤' },
  { word: '옷', emoji: '👕' },
  { word: '붓', emoji: '🖌️' },

  // 22~28단계 · 복잡한 모음
  { word: '개', emoji: '🐶' },
  { word: '배', emoji: '🍐' },
  { word: '새', emoji: '🐦' },
  { word: '해', emoji: '☀️' },
  { word: '개미', emoji: '🐜' },
  { word: '게', emoji: '🦀' },
  { word: '세모', emoji: '🔺' },
  { word: '귀', emoji: '👂' },
  { word: '쥐', emoji: '🐭' },
  { word: '사과', emoji: '🍎' },
  { word: '과자', emoji: '🍪' },
  { word: '의자', emoji: '🪑' },
  { word: '돼지', emoji: '🐷' },
  { word: '참외', emoji: '🍈' },
  { word: '병원', emoji: '🏥' },
  { word: '원숭이', emoji: '🐵' },
  { word: '시계', emoji: '⌚' },
  { word: '계란', emoji: '🥚' },

  // 29~33단계 · 쌍자음
  { word: '꿈', emoji: '💭' },
  { word: '딸기', emoji: '🍓' },
  { word: '빵', emoji: '🍞' },
  { word: '쌀', emoji: '🌾' },
  { word: '짜장면', emoji: '🍜' },
];

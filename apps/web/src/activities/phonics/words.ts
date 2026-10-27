/**
 * 파닉스 낱말 — **소리로 내는 문제**다.
 *
 * 시윤이가 영어 놀이터에 들어가고 싶어 했는데, 거기 있는 Spell It 은 라윤이가
 * 쓰는 Wordly Wise 낱말이라 아직 읽지 못하는 아이에게는 낼 것이 없었다.
 * 시윤이는 파닉스를 배우는 중이라 **글자를 보고 고르는 것이 아니라 소리를 듣고
 * 고르는 것**부터 시작한다. 영숙님이 그렇게 정했다.
 *
 * 차례는 미국 파닉스의 흔한 차례를 따른다 — 첫소리 → 끝소리 → 가운뎃소리(단모음)
 * → 이중자음(sh·ch·th) → 연속자음(bl·st·gr). 한국 교재에서 따오지 않는다.
 *
 * 낱말은 모두 **아이가 아는 물건**으로 골랐다. 뜻을 모르는 낱말은 소리를 들어도
 * 머릿속에 그림이 그려지지 않아, 소리만 흉내 내는 놀이가 된다.
 */

export type PhonicsStage = 'first' | 'last' | 'middle' | 'digraph' | 'blend';

export interface PhonicsWord {
  /** 들려줄 낱말 */
  word: string;
  /** 이 낱말에서 골라야 할 글자 */
  answer: string;
  /**
   * 낱말을 그림으로 보여준다.
   *
   * 영숙님이 소리만 듣고 맞히는 판을 보고 "이건 좀 어려울 것 같다" 고 했다.
   * 맞는 말이었다 — 뜻 모르는 소리를 듣고 글자를 고르는 것은 **낱말 공부가
   * 아니라 받아쓰기**다. 그림이 있으면 아이는 `cat` 이 무엇인지 알고 들으므로,
   * 소리와 글자를 잇는 일에만 마음을 쓸 수 있다.
   */
  pic: string;
}

export interface PhonicsGame {
  stage: PhonicsStage;
  /** 아이 화면에 보이는 이름. 영어로만 적는다. */
  name: string;
  /** 무엇을 고르는 것인지 한 줄로 */
  ask: string;
  /** 메뉴에 보여줄 본보기 */
  example: string;
  words: PhonicsWord[];
  /** 보기로 함께 낼 글자들. 답과 섞어 넷을 만든다. */
  letters: string[];
}

const CONSONANTS = 'b c d f g h j k l m n p r s t v w y z'.split(' ');
const SHORT_VOWELS = ['a', 'e', 'i', 'o', 'u'];

export const PHONICS_GAMES: PhonicsGame[] = [
  {
    stage: 'first',
    name: 'First Sound',
    ask: 'Which letter does it start with?',
    example: '🐱 cat → c',
    letters: CONSONANTS,
    words: [
      { word: 'cat', answer: 'c', pic: '🐱' },
      { word: 'dog', answer: 'd', pic: '🐶' },
      { word: 'sun', answer: 's', pic: '☀️' },
      { word: 'map', answer: 'm', pic: '🗺️' },
      { word: 'pig', answer: 'p', pic: '🐷' },
      { word: 'bed', answer: 'b', pic: '🛏️' },
      { word: 'fish', answer: 'f', pic: '🐟' },
      { word: 'hat', answer: 'h', pic: '🎩' },
      { word: 'leg', answer: 'l', pic: '🦵' },
      { word: 'nut', answer: 'n', pic: '🥜' },
      { word: 'rock', answer: 'r', pic: '🪨' },
      { word: 'tent', answer: 't', pic: '⛺' },
      { word: 'van', answer: 'v', pic: '🚐' },
      { word: 'web', answer: 'w', pic: '🕸️' },
      { word: 'jet', answer: 'j', pic: '✈️' },
      { word: 'kid', answer: 'k', pic: '🧒' },
      { word: 'goat', answer: 'g', pic: '🐐' },
      { word: 'zebra', answer: 'z', pic: '🦓' },
    ],
  },
  {
    stage: 'last',
    name: 'Last Sound',
    ask: 'Which letter does it end with?',
    example: '🐱 cat → t',
    letters: CONSONANTS,
    words: [
      { word: 'cat', answer: 't', pic: '🐱' },
      { word: 'dog', answer: 'g', pic: '🐶' },
      { word: 'sun', answer: 'n', pic: '☀️' },
      { word: 'map', answer: 'p', pic: '🗺️' },
      { word: 'bed', answer: 'd', pic: '🛏️' },
      { word: 'bus', answer: 's', pic: '🚌' },
      { word: 'leg', answer: 'g', pic: '🦵' },
      { word: 'hen', answer: 'n', pic: '🐔' },
      { word: 'cup', answer: 'p', pic: '☕' },
      { word: 'bat', answer: 't', pic: '🦇' },
      { word: 'ham', answer: 'm', pic: '🍖' },
      { word: 'bell', answer: 'l', pic: '🔔' },
      { word: 'rock', answer: 'k', pic: '🪨' },
      { word: 'web', answer: 'b', pic: '🕸️' },
      { word: 'nut', answer: 't', pic: '🥜' },
      { word: 'pin', answer: 'n', pic: '📌' },
    ],
  },
  {
    stage: 'middle',
    name: 'Middle Sound',
    ask: 'Which vowel do you hear in the middle?',
    example: '🐱 cat → a',
    letters: SHORT_VOWELS,
    words: [
      { word: 'cat', answer: 'a', pic: '🐱' },
      { word: 'bed', answer: 'e', pic: '🛏️' },
      { word: 'pig', answer: 'i', pic: '🐷' },
      { word: 'dog', answer: 'o', pic: '🐶' },
      { word: 'sun', answer: 'u', pic: '☀️' },
      { word: 'map', answer: 'a', pic: '🗺️' },
      { word: 'hen', answer: 'e', pic: '🐔' },
      { word: 'fish', answer: 'i', pic: '🐟' },
      { word: 'box', answer: 'o', pic: '📦' },
      { word: 'bug', answer: 'u', pic: '🐛' },
      { word: 'bag', answer: 'a', pic: '🎒' },
      { word: 'net', answer: 'e', pic: '🥅' },
      { word: 'lip', answer: 'i', pic: '👄' },
      { word: 'pot', answer: 'o', pic: '🍲' },
      { word: 'cup', answer: 'u', pic: '☕' },
    ],
  },
  {
    stage: 'digraph',
    name: 'sh · ch · th',
    ask: 'Which two letters do you hear?',
    example: '🚢 ship → sh',
    letters: ['sh', 'ch', 'th', 'wh'],
    words: [
      { word: 'ship', answer: 'sh', pic: '🚢' },
      { word: 'shell', answer: 'sh', pic: '🐚' },
      { word: 'fish', answer: 'sh', pic: '🐟' },
      { word: 'chair', answer: 'ch', pic: '🪑' },
      { word: 'cheese', answer: 'ch', pic: '🧀' },
      { word: 'lunch', answer: 'ch', pic: '🍱' },
      { word: 'think', answer: 'th', pic: '🤔' },
      { word: 'thumb', answer: 'th', pic: '👍' },
      { word: 'bath', answer: 'th', pic: '🛁' },
      { word: 'whale', answer: 'wh', pic: '🐳' },
      { word: 'wheel', answer: 'wh', pic: '🎡' },
      { word: 'white', answer: 'wh', pic: '⬜' },
    ],
  },
  {
    stage: 'blend',
    name: 'Blends',
    ask: 'Which two letters does it start with?',
    example: '🛑 stop → st',
    letters: ['st', 'bl', 'gr', 'fr', 'cl', 'sn', 'tr', 'sw'],
    words: [
      { word: 'stop', answer: 'st', pic: '🛑' },
      { word: 'star', answer: 'st', pic: '⭐' },
      { word: 'blue', answer: 'bl', pic: '🔵' },
      { word: 'block', answer: 'bl', pic: '🧱' },
      { word: 'green', answer: 'gr', pic: '🟢' },
      { word: 'grapes', answer: 'gr', pic: '🍇' },
      { word: 'frog', answer: 'fr', pic: '🐸' },
      { word: 'fruit', answer: 'fr', pic: '🍏' },
      { word: 'clock', answer: 'cl', pic: '🕐' },
      { word: 'cloud', answer: 'cl', pic: '☁️' },
      { word: 'snake', answer: 'sn', pic: '🐍' },
      { word: 'snow', answer: 'sn', pic: '❄️' },
      { word: 'train', answer: 'tr', pic: '🚂' },
      { word: 'tree', answer: 'tr', pic: '🌳' },
      { word: 'swim', answer: 'sw', pic: '🏊' },
      { word: 'sweater', answer: 'sw', pic: '🧥' },
    ],
  },
];

export function gameOf(stage: PhonicsStage): PhonicsGame {
  return PHONICS_GAMES.find((g) => g.stage === stage) ?? PHONICS_GAMES[0]!;
}

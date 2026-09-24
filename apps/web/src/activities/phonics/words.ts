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
    example: 'cat → c',
    letters: CONSONANTS,
    words: [
      { word: 'cat', answer: 'c' },
      { word: 'dog', answer: 'd' },
      { word: 'sun', answer: 's' },
      { word: 'map', answer: 'm' },
      { word: 'pig', answer: 'p' },
      { word: 'bed', answer: 'b' },
      { word: 'fish', answer: 'f' },
      { word: 'hat', answer: 'h' },
      { word: 'leg', answer: 'l' },
      { word: 'nut', answer: 'n' },
      { word: 'rock', answer: 'r' },
      { word: 'tent', answer: 't' },
      { word: 'van', answer: 'v' },
      { word: 'web', answer: 'w' },
      { word: 'jam', answer: 'j' },
      { word: 'kid', answer: 'k' },
      { word: 'gum', answer: 'g' },
      { word: 'zip', answer: 'z' },
    ],
  },
  {
    stage: 'last',
    name: 'Last Sound',
    ask: 'Which letter does it end with?',
    example: 'cat → t',
    letters: CONSONANTS,
    words: [
      { word: 'cat', answer: 't' },
      { word: 'dog', answer: 'g' },
      { word: 'sun', answer: 'n' },
      { word: 'map', answer: 'p' },
      { word: 'bed', answer: 'd' },
      { word: 'bus', answer: 's' },
      { word: 'leg', answer: 'g' },
      { word: 'hen', answer: 'n' },
      { word: 'cup', answer: 'p' },
      { word: 'bat', answer: 't' },
      { word: 'ham', answer: 'm' },
      { word: 'bell', answer: 'l' },
      { word: 'rock', answer: 'k' },
      { word: 'web', answer: 'b' },
      { word: 'nut', answer: 't' },
      { word: 'pin', answer: 'n' },
    ],
  },
  {
    stage: 'middle',
    name: 'Middle Sound',
    ask: 'Which vowel do you hear in the middle?',
    example: 'cat → a',
    letters: SHORT_VOWELS,
    words: [
      { word: 'cat', answer: 'a' },
      { word: 'bed', answer: 'e' },
      { word: 'pig', answer: 'i' },
      { word: 'dog', answer: 'o' },
      { word: 'sun', answer: 'u' },
      { word: 'map', answer: 'a' },
      { word: 'hen', answer: 'e' },
      { word: 'fish', answer: 'i' },
      { word: 'box', answer: 'o' },
      { word: 'bug', answer: 'u' },
      { word: 'bag', answer: 'a' },
      { word: 'net', answer: 'e' },
      { word: 'lip', answer: 'i' },
      { word: 'pot', answer: 'o' },
      { word: 'cup', answer: 'u' },
    ],
  },
  {
    stage: 'digraph',
    name: 'sh · ch · th',
    ask: 'Which two letters do you hear?',
    example: 'ship → sh',
    letters: ['sh', 'ch', 'th', 'wh'],
    words: [
      { word: 'ship', answer: 'sh' },
      { word: 'shell', answer: 'sh' },
      { word: 'fish', answer: 'sh' },
      { word: 'chair', answer: 'ch' },
      { word: 'cheese', answer: 'ch' },
      { word: 'lunch', answer: 'ch' },
      { word: 'think', answer: 'th' },
      { word: 'thumb', answer: 'th' },
      { word: 'bath', answer: 'th' },
      { word: 'whale', answer: 'wh' },
      { word: 'wheel', answer: 'wh' },
      { word: 'white', answer: 'wh' },
    ],
  },
  {
    stage: 'blend',
    name: 'Blends',
    ask: 'Which two letters does it start with?',
    example: 'stop → st',
    letters: ['st', 'bl', 'gr', 'fr', 'cl', 'sn', 'tr', 'sw'],
    words: [
      { word: 'stop', answer: 'st' },
      { word: 'star', answer: 'st' },
      { word: 'blue', answer: 'bl' },
      { word: 'block', answer: 'bl' },
      { word: 'green', answer: 'gr' },
      { word: 'grapes', answer: 'gr' },
      { word: 'frog', answer: 'fr' },
      { word: 'fruit', answer: 'fr' },
      { word: 'clock', answer: 'cl' },
      { word: 'cloud', answer: 'cl' },
      { word: 'snake', answer: 'sn' },
      { word: 'snow', answer: 'sn' },
      { word: 'train', answer: 'tr' },
      { word: 'tree', answer: 'tr' },
      { word: 'swim', answer: 'sw' },
      { word: 'swing', answer: 'sw' },
    ],
  },
];

export function gameOf(stage: PhonicsStage): PhonicsGame {
  return PHONICS_GAMES.find((g) => g.stage === stage) ?? PHONICS_GAMES[0]!;
}

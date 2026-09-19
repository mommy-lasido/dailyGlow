/**
 * 놀이터 넷. 홈 화면의 활동을 이 차례로 나눠 담는다.
 *
 * 이름은 영숙님이 정했다 — **"배움" 이 아니라 "놀이터"**. 아이가 "한글 배움 하자"
 * 라고는 말하지 않지만 "놀이터 가자" 는 말이 된다. 짬나는 시간에 잠깐 들르는
 * 자리라는 뜻이기도 하다.
 *
 * 차례는 날마다 하는 것(한글·수학)이 앞, 주에 몇 번 하는 것(영어·과학)이 뒤다.
 */
export const PLAYGROUNDS: { key: string; title: string; subjects: string[] }[] = [
  { key: 'hangul', title: '한글 놀이터', subjects: ['hangul', 'korean'] },
  { key: 'math', title: '수학 놀이터', subjects: ['math'] },
  { key: 'english', title: '영어 놀이터', subjects: ['english'] },
  { key: 'science', title: '과학 놀이터', subjects: ['science'] },
];

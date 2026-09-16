/**
 * 이번 주의 과학.
 *
 * 과학은 한글·수학과 성격이 다르다. 문제를 내고 고르게 해서는 배워지지 않고,
 * **보고 만져 본 것이 쌓여서** 배워진다. 그래서 여기에는 맞히는 자리가 없다.
 * 한 주에 주제 하나를 두고, 짧은 글 → 영상 하나 → 종이로 해볼 것, 이 셋으로 끝난다.
 *
 * 글은 **앱 안에 들어 있다.** 인터넷으로 나가지 않으므로 사라지지 않고,
 * 라윤이는 스스로 읽으며 읽기 연습까지 된다.
 *
 * 영상은 **하나만** 둔다. 목록을 주면 고르다가 시간이 다 가고, 링크로 내보내면
 * 유튜브로 넘어가 옆길로 샌다. 하나를 우리 화면 안에서 보고 끝낸다.
 *
 * 종이로 해볼 것이 마지막에 오는 까닭은, 영상은 보기 편해서 **본 것이 남지
 * 않기 때문**이다. 집을 돌아다니며 자석에 붙는 것을 찾아 그려야 비로소 남는다.
 */

export interface ScienceTopic {
  slug: string;
  /** 이번 주의 주제 — 아이에게 보이는 이름 */
  title: string;
  emoji: string;
  /** 짧은 글. 한 줄에 한 문장씩, 아이가 소리 내어 읽을 수 있는 길이로. */
  lines: string[];
  video: {
    /** 유튜브 영상 번호 */
    id: string;
    /** 길이(초). 아이에게 "몇 분짜리인지" 미리 알려주려고 둔다. */
    seconds: number;
  };
  /** 종이와 몸으로 해볼 것. 영상을 본 것이 여기서 남는다. */
  doThis: string;
}

/**
 * 주제 목록.
 *
 * 지금은 한 주 치만 있다. 영숙님이 보고 이대로 갈지 정한 뒤에 늘린다.
 * 늘릴 때의 차례는 미국 과학 기준(NGSS)을 따른다 — `docs/나중에-할-것.md` 참고.
 */
export const SCIENCE_TOPICS: ScienceTopic[] = [
  {
    slug: 'magnet',
    title: '자석',
    emoji: '🧲',
    lines: [
      '자석은 쇠붙이를 끌어당겨요.',
      '못, 클립, 가위처럼 철로 만든 것이 붙어요.',
      '종이, 나무, 플라스틱은 붙지 않아요.',
      '자석에는 N극과 S극이 있어요.',
      '같은 극끼리는 서로 밀어내요.',
    ],
    video: { id: 'jenhkrBuGH0', seconds: 129 },
    doThis: '집을 돌아다니면서 자석에 붙는 것을 세 가지 찾아 그려보세요.',
  },
];

/** 한 주는 월요일에 시작한다. 그 주의 월요일 자정을 돌려준다. */
function weekStart(today: Date): Date {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // getDay() 는 일요일이 0 이다. 월요일을 0 으로 옮긴다.
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/**
 * 이번 주의 주제.
 *
 * 주가 바뀌면 다음 주제로 넘어가고, 다 돌면 처음으로 돌아온다. 같은 주 안에서는
 * 며칠에 걸쳐 열어도 늘 같은 것이 나온다 — 한 주 내내 같은 것을 만나야 남는다.
 */
export function weeklyScience(today = new Date()): ScienceTopic {
  const weeks = Math.floor(weekStart(today).getTime() / (7 * 24 * 60 * 60 * 1000));
  const index = ((weeks % SCIENCE_TOPICS.length) + SCIENCE_TOPICS.length) % SCIENCE_TOPICS.length;
  return SCIENCE_TOPICS[index]!;
}

/** "2분 9초" 처럼 읽어 준다. 아이가 얼마나 걸리는지 미리 알 수 있게. */
export function videoLength(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}초`;
  return s === 0 ? `${m}분` : `${m}분 ${s}초`;
}

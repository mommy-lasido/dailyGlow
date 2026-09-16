/**
 * 이번 주의 과학.
 *
 * 과학은 한글·수학과 성격이 다르다. 문제를 내고 고르게 해서는 배워지지 않고,
 * **보고 들은 것이 쌓여서** 배워진다. 그래서 여기에는 맞히는 자리가 없다.
 * 한 주에 주제 하나를 두고, 개념을 읽고 나서 영상을 본다.
 *
 * 글은 **개념을 제대로 설명한다.** 처음에는 "밀면 저쪽으로 가요" 같은 한 줄짜리를
 * 늘어놓았는데, 영숙님이 "이런 설명은 없느니만 못하다" 고 했다. 아이도 아는 것을
 * 문장으로 바꿔 놓은 것은 가르치는 것이 아니다. 어린아이용이라도 **개념은 깎지
 * 않고 말만 쉽게** 한다 — 철이 자석에 붙는 까닭이 철 안의 작은 자석들이 한
 * 방향으로 줄을 서기 때문이라는 데까지 들어간다.
 *
 * 글은 앱 안에 들어 있다. 인터넷으로 나가지 않으므로 사라지지 않고,
 * 라윤이는 스스로 읽으며 읽기 연습까지 된다.
 *
 * 영상은 주제마다 **정해진 것만** 둔다. 목록을 주면 고르다가 시간이 다 가고,
 * 링크로 내보내면 유튜브로 넘어가 옆길로 샌다. 우리 화면 안에서 보고 끝낸다.
 * 한국어로 하나, 그 뒤에 같은 이야기를 영어로 하나다.
 *
 * **집에서 하는 실험은 두지 않는다.** 처음에는 "집에서 자석에 붙는 것을 찾아
 * 그려보세요" 같은 것을 마지막에 두었는데, 영숙님이 걷어냈다 — 준비물은 결국
 * 부모의 일이 되고, 아이가 혼자 시작하면 집이 어지러워진다.
 */

/**
 * 자막은 **어디에도 두지 않는다.**
 *
 * 한국어 자막까지 켤 수 있게 만들어 놓았는데, 영숙님이 다 빼자고 했다 —
 * "영어는 이해하든 못하든 그냥 듣게."
 *
 * 우리말 영상에서 자막은 글자만 좇게 만들고, 영어 영상에서 자막은 귀 대신
 * 눈을 쓰게 만든다. 못 알아듣는 채로 듣는 시간이 쌓여야 귀가 열린다.
 *
 * 유튜브는 자기가 기계로 만든 자막을 제멋대로 켜서 시작하는 때가 있으므로,
 * `SafeVideo` 가 재생될 때마다 자막을 내린다.
 */

import { TOPICS } from './science-topics';

export interface ScienceVideo {
  /** 유튜브 영상 번호 */
  id: string;
  /** 길이(초). 아이에게 "몇 분짜리인지" 미리 알려주려고 둔다. */
  seconds: number;
}

/**
 * 이 주제가 몇 학년 것인가. **0 은 킨더가든**, 1~5 는 학년이다.
 *
 * 미국 과학 기준(NGSS)이 학년마다 주제를 서넛씩 정해 두었다.
 * `docs/과학-차례.md` 에 스물한 덩어리를 옮겨 적어 두었다.
 */
export type ScienceGrade = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * 한 주에 배우는 것 — **주제 하나가 아니라 그 안의 덩어리 하나**다.
 *
 * 주제 하나(자석)를 한 주에 끝내면 한 학년이 서너 주 만에 지나가 버린다.
 * 교재가 한 주제를 여러 주에 걸쳐 가르치는 데는 까닭이 있다. 그래서 개념 글의
 * 덩어리 하나하나가 곧 한 주 치가 된다 — 자석이면 붙는 물질, 끌어당기는 까닭,
 * 두 극, 자기장, 나침반으로 다섯 주다.
 *
 * 영상은 주제에 하나씩 붙어 있으므로 그 주제를 하는 동안 같은 영상을 다시 본다.
 * 어린아이에게 되풀이는 손해가 아니라 이득이다.
 */
export interface ScienceLesson {
  topic: ScienceTopic;
  section: ScienceSection;
  /** 이 주제 안에서 몇 번째 덩어리인가(0부터). */
  index: number;
}

/**
 * 개념 설명 한 덩어리.
 *
 * 제목을 달아 덩어리로 나눈다. 줄글로 길게 이어 놓으면 아이가 어디를 읽고 있는지
 * 놓치고, 무엇이 중요한지도 드러나지 않는다.
 */
export interface ScienceSection {
  heading: string;
  body: string;
}

export interface ScienceTopic {
  grade: ScienceGrade;
  slug: string;
  /**
   * 이번 주의 주제 — 아이에게 보이는 이름.
   *
   * 그림글자(이모지)는 달지 않는다. 영숙님이 낱말 읽기·문장 읽기에서 그랬듯이
   * 여기서도 지우라고 했다 — 글자 옆에 그림이 붙으면 아이가 글자 대신 그림을 본다.
   */
  title: string;
  /** 개념 설명. 제목 달린 덩어리 서넛. */
  sections: ScienceSection[];
  video: ScienceVideo;
  /**
   * 같은 주제를 영어로 한 번 더.
   *
   * 라윤이는 영어 영상을 자막 없이 알아듣는다. 그래서 받침대를 깔 까닭이 없다 —
   * 그냥 영어로 한 번 더 보면 된다.
   *
   * 그래도 **한국어 영상 뒤에** 둔다. 시윤이와 도윤이에게는 아직 모르는 말이고,
   * 한국어로 내용을 아는 채로 들어야 말이 장면에 가서 붙기 때문이다.
   */
  videoEn?: ScienceVideo;
}

/**
 * 주제 스물한 덩어리. 내용은 `science-topics.ts` 에 있다.
 *
 * 학년 차례대로 놓여 있고, 그 차례가 곧 배우는 차례다.
 */
export const SCIENCE_TOPICS: ScienceTopic[] = TOPICS;

/** 한 주는 월요일에 시작한다. 그 주의 월요일 자정을 돌려준다. */
function weekStart(today: Date): Date {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // getDay() 는 일요일이 0 이다. 월요일을 0 으로 옮긴다.
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/**
 * 이 아이는 몇 학년 것부터 보나.
 *
 * 창고에 적힌 학년은 `g3`(초등 3학년)이나 `preschool` 같은 말이다.
 * **자기 학년 것부터** 시작한다 — 라윤이는 3학년, 시윤이와 도윤이는 킨더가든이다.
 *
 * 라윤이는 국제학교에서 미국 과정으로 배우므로, 3학년 것이 곧 학교에서 지금
 * 하는 것이다. 1·2학년 것은 이미 지났으니 이번 주의 주제로 내지 않고, 아래
 * `earlierTopics` 로 **골라 볼 수 있게만** 둔다.
 */
export function startGrade(grade: string | null | undefined): ScienceGrade {
  const n = grade?.match(/^g([1-9])/)?.[1];
  if (!n) return 0;
  return Math.min(Number(n), 5) as ScienceGrade;
}

/**
 * 아이가 골라 볼 수 있는 것들을 **학년별로 묶어** 돌려준다.
 *
 * 백 개가 넘는 덩어리를 한 줄로 늘어놓으면 아무도 못 찾는다. 학년을 펴면 주제가
 * 나오고, 주제를 펴면 그 안의 덩어리가 나오는 세 겹으로 접어 둔다.
 *
 * 이미 지나온 학년만 담는다. 앞질러 가는 것은 이번 주의 차례가 데려간다.
 */
export function earlierByGrade(from: ScienceGrade): { grade: ScienceGrade; topics: ScienceTopic[] }[] {
  const grades = [...new Set(SCIENCE_TOPICS.filter((t) => t.grade < from).map((t) => t.grade))];
  return grades.map((grade) => ({
    grade,
    topics: SCIENCE_TOPICS.filter((t) => t.grade === grade),
  }));
}

/** 학년을 아이가 읽을 말로. */
export function gradeName(grade: ScienceGrade): string {
  return grade === 0 ? '유치원' : `${grade}학년`;
}

/**
 * 주를 세는 기준 날. 이 주에 시작 학년의 첫 주제가 나온다.
 *
 * 2026년 9월 14일 월요일 — 과학을 처음 만든 주다.
 */
const ANCHOR = new Date(2026, 8, 14);

/**
 * 이 아이가 앞으로 배울 것들을 한 줄로 펼친다.
 *
 * 학년 차례대로, 주제 차례대로, 그 안의 덩어리 차례대로다. 이 줄의 차례가 곧
 * 주마다 나아가는 차례가 된다.
 */
export function lessonsFrom(from: ScienceGrade): ScienceLesson[] {
  return SCIENCE_TOPICS.filter((t) => t.grade >= from).flatMap((topic) =>
    topic.sections.map((section, index) => ({ topic, section, index })),
  );
}

/**
 * 이번 주에 배울 것.
 *
 * 시작 학년부터 **차례대로** 한 주에 하나씩 나아간다. 끝까지 가면 처음으로
 * 돌아온다 — 어린아이는 되풀이가 손해가 아니라 이득이다.
 *
 * 같은 주 안에서는 며칠에 걸쳐 열어도 늘 같은 것이 나온다. 한 주 내내 같은 것을
 * 만나야 남는다.
 */
export function weeklyScience(from: ScienceGrade, today = new Date()): ScienceLesson {
  const pool = lessonsFrom(from);
  const week = 7 * 24 * 60 * 60 * 1000;
  const weeks = Math.round((weekStart(today).getTime() - ANCHOR.getTime()) / week);
  const index = ((weeks % pool.length) + pool.length) % pool.length;
  return pool[index]!;
}

/** "2분 9초" 처럼 읽어 준다. 아이가 얼마나 걸리는지 미리 알 수 있게. */
export function videoLength(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}초`;
  return s === 0 ? `${m}분` : `${m}분 ${s}초`;
}

import { describe, expect, it } from 'vitest';
import { SCIENCE_TOPICS, startGrade, videoLength, weeklyScience } from './science';

describe('weeklyScience', () => {
  it('같은 주에는 며칠에 걸쳐 열어도 같은 주제가 나온다', () => {
    // 한 주 내내 같은 것을 만나야 남는다. 날마다 바뀌면 스쳐 지나갈 뿐이다.
    const 월 = weeklyScience(0, new Date(2026, 8, 14));
    const 목 = weeklyScience(0, new Date(2026, 8, 17));
    const 일 = weeklyScience(0, new Date(2026, 8, 20));
    expect(월.slug).toBe(목.slug);
    expect(목.slug).toBe(일.slug);
  });

  it('주제마다 개념 설명과 영상이 있다', () => {
    // 둘 중 하나라도 비면 화면이 반쪽이 된다.
    for (const topic of SCIENCE_TOPICS) {
      expect(topic.sections.length).toBeGreaterThan(0);
      expect(topic.video.id).not.toBe('');
      expect(topic.video.seconds).toBeGreaterThan(0);
    }
  });

  it('설명은 겉핥기로 한 줄만 적지 않는다', () => {
    // "밀면 저쪽으로 가요" 같은 한 줄짜리는 없느니만 못하다. 아이도 아는 것을
    // 문장으로 바꿔 놓은 것은 가르치는 것이 아니다.
    for (const topic of SCIENCE_TOPICS) {
      for (const section of topic.sections) {
        expect(section.heading).not.toBe('');
        expect(section.body.length).toBeGreaterThan(50);
      }
    }
  });
});

describe('startGrade', () => {
  it('유치원생은 킨더가든부터, 초등학생은 1학년부터 시작한다', () => {
    // 라윤이가 3학년이라고 3학년 것부터 시작하지 않는다. 앞의 것을 건너뛰면
    // 얹을 자리가 없다.
    expect(startGrade('g3')).toBe(1);
    expect(startGrade('g1')).toBe(1);
    expect(startGrade('preschool')).toBe(0);
    expect(startGrade(null)).toBe(0);
  });
});

describe('주제 차례', () => {
  it('학년 순서대로 놓여 있다', () => {
    // 한 주에 하나씩 차례대로 나아가므로, 목록의 차례가 곧 배우는 차례다.
    const grades = SCIENCE_TOPICS.map((t) => t.grade);
    expect([...grades].sort((a, b) => a - b)).toEqual(grades);
  });

  it('주가 바뀌면 다음 주제로 넘어간다', () => {
    const 이번주 = weeklyScience(0, new Date(2026, 8, 14));
    const 다음주 = weeklyScience(0, new Date(2026, 8, 21));
    expect(다음주.slug).not.toBe(이번주.slug);
  });
});

describe('videoLength', () => {
  it('아이가 알아들을 수 있게 읽어 준다', () => {
    expect(videoLength(129)).toBe('2분 9초');
    expect(videoLength(120)).toBe('2분');
    expect(videoLength(45)).toBe('45초');
  });
});

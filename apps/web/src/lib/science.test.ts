import { describe, expect, it } from 'vitest';
import {
  lessonVideos,
  topicsByGrade,
  lessonsFrom,
  SCIENCE_TOPICS,
  startGrade,
  videoLength,
  weeklyScience,
} from './science';

describe('weeklyScience', () => {
  it('같은 주에는 며칠에 걸쳐 열어도 같은 주제가 나온다', () => {
    // 한 주 내내 같은 것을 만나야 남는다. 날마다 바뀌면 스쳐 지나갈 뿐이다.
    const 월 = weeklyScience(0, new Date(2026, 8, 14));
    const 목 = weeklyScience(0, new Date(2026, 8, 17));
    const 일 = weeklyScience(0, new Date(2026, 8, 20));
    expect(월.section.heading).toBe(목.section.heading);
    expect(목.section.heading).toBe(일.section.heading);
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
  it('자기 학년 것부터 시작한다', () => {
    // 라윤이는 국제학교에서 미국 과정으로 배우므로 3학년 것이 곧 학교에서
    // 지금 하는 것이다.
    expect(startGrade('g3')).toBe(3);
    expect(startGrade('g1')).toBe(1);
    expect(startGrade('preschool')).toBe(0);
    expect(startGrade(null)).toBe(0);
  });
});

describe('topicsByGrade', () => {
  it('Kindergarten 부터 G5 까지 학년별로 묶어 모두 보여준다', () => {
    // 과학은 배경지식이라 앞질러 본다고 잃을 것이 없다. 앞에 것만 보여주면
    // 금방 볼 것이 떨어진다.
    const groups = topicsByGrade();
    expect(groups.map((g) => g.grade)).toEqual([0, 1, 2, 3, 4, 5]);
    for (const group of groups) {
      for (const t of group.topics) expect(t.grade).toBe(group.grade);
    }
  });
});

describe('lessonsFrom', () => {
  it('한 주에 배우는 것은 주제가 아니라 그 안의 덩어리 하나다', () => {
    // 주제를 한 주에 통째로 끝내면 한 학년이 서너 주 만에 지나가 버린다.
    const lessons = lessonsFrom(0);
    const sections = SCIENCE_TOPICS.reduce((n, t) => n + t.sections.length, 0);
    expect(lessons).toHaveLength(sections);
    expect(lessons.length).toBeGreaterThan(SCIENCE_TOPICS.length);
  });

  it('학년 차례대로, 주제 차례대로 펼친다', () => {
    const grades = lessonsFrom(0).map((l) => l.topic.grade);
    expect([...grades].sort((a, b) => a - b)).toEqual(grades);
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
    expect(다음주.section.heading).not.toBe(이번주.section.heading);
  });
});

describe('videoLength', () => {
  it('아이가 알아들을 수 있게 읽어 준다', () => {
    expect(videoLength(129)).toBe('2분 9초');
    expect(videoLength(120)).toBe('2분');
    expect(videoLength(45)).toBe('45초');
  });
});

describe('lessonVideos', () => {
  it('덩어리에 따로 붙은 영상이 있으면 그것을 본다', () => {
    // 주제 하나가 대여섯 주짜리라 영상 하나로는 다 덮이지 않는 자리가 있다.
    const withOwn = lessonsFrom(0).find((l) => l.section.video || l.section.videoEn);
    expect(withOwn).toBeDefined();
    const v = lessonVideos(withOwn!);
    if (withOwn!.section.video) expect(v.ko.id).toBe(withOwn!.section.video.id);
    if (withOwn!.section.videoEn) expect(v.en?.id).toBe(withOwn!.section.videoEn.id);
  });

  it('따로 붙은 것이 없으면 주제의 영상을 본다', () => {
    const plain = lessonsFrom(0).find((l) => !l.section.video && !l.section.videoEn)!;
    const v = lessonVideos(plain);
    expect(v.ko.id).toBe(plain.topic.video.id);
    expect(v.en?.id).toBe(plain.topic.videoEn?.id);
  });
});

import { describe, expect, it } from 'vitest';
import {
  CAPTION_LANGS,
  SCIENCE_TOPICS,
  trackForGrade,
  videoLength,
  weeklyScience,
} from './science';

describe('weeklyScience', () => {
  it('같은 주에는 며칠에 걸쳐 열어도 같은 주제가 나온다', () => {
    // 한 주 내내 같은 것을 만나야 남는다. 날마다 바뀌면 스쳐 지나갈 뿐이다.
    const 월 = weeklyScience('kinder', new Date(2026, 8, 14));
    const 목 = weeklyScience('kinder', new Date(2026, 8, 17));
    const 일 = weeklyScience('kinder', new Date(2026, 8, 20));
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

describe('trackForGrade', () => {
  it('초등학생만 3학년 과정으로 본다', () => {
    // 시윤이와 도윤이는 preschool 이라 킨더가든 과정부터 나와야 한다.
    expect(trackForGrade('g3')).toBe('g3');
    expect(trackForGrade('preschool')).toBe('kinder');
    expect(trackForGrade(null)).toBe('kinder');
  });

  it('과정마다 주제가 하나 이상 있다', () => {
    // 한쪽이 비면 그 아이는 빈 화면을 본다.
    for (const track of ['kinder', 'g3'] as const) {
      expect(SCIENCE_TOPICS.filter((t) => t.track === track).length).toBeGreaterThan(0);
    }
  });
});

describe('videoLength', () => {
  it('아이가 알아들을 수 있게 읽어 준다', () => {
    expect(videoLength(129)).toBe('2분 9초');
    expect(videoLength(120)).toBe('2분');
    expect(videoLength(45)).toBe('45초');
  });
});

describe('자막', () => {
  it('영어 영상에서는 한국어와 영어를 고를 수 있다', () => {
    // 아이마다 따로 맞춰 두면 아이가 늘 때마다 손이 간다. 둘 다 두고,
    // 필요 없는 아이는 안 켜면 그만이다.
    expect([...CAPTION_LANGS]).toEqual(['ko', 'en']);
  });
});

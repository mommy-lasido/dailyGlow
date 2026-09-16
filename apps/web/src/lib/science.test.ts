import { describe, expect, it } from 'vitest';
import { SCIENCE_TOPICS, videoLength, weeklyScience } from './science';

describe('weeklyScience', () => {
  it('같은 주에는 며칠에 걸쳐 열어도 같은 주제가 나온다', () => {
    // 한 주 내내 같은 것을 만나야 남는다. 날마다 바뀌면 스쳐 지나갈 뿐이다.
    const 월 = weeklyScience(new Date(2026, 8, 14));
    const 목 = weeklyScience(new Date(2026, 8, 17));
    const 일 = weeklyScience(new Date(2026, 8, 20));
    expect(월.slug).toBe(목.slug);
    expect(목.slug).toBe(일.slug);
  });

  it('주제마다 글과 영상과 해볼 것이 모두 있다', () => {
    // 셋 중 하나라도 비면 화면이 반쪽이 된다.
    for (const topic of SCIENCE_TOPICS) {
      expect(topic.lines.length).toBeGreaterThan(0);
      expect(topic.video.id).not.toBe('');
      expect(topic.video.seconds).toBeGreaterThan(0);
      expect(topic.doThis).not.toBe('');
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

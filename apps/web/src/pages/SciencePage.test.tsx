import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SciencePage } from './SciencePage';
import { weeklyScience } from '@/lib/science';

// 로그인한 아이가 없는 화면은 킨더가든 과정으로 본다 — 시윤이와 도윤이 자리다.
const topic = weeklyScience('kinder');

describe('SciencePage', () => {
  it('이번 주의 주제와 글과 해볼 것을 보여준다', () => {
    render(<SciencePage />);
    expect(screen.getByTestId('science-title')).toHaveTextContent(topic.title);
    expect(screen.getAllByTestId('science-line')).toHaveLength(topic.lines.length);
    expect(screen.getByTestId('science-do')).toHaveTextContent(topic.doThis);
  });

  it('맞히는 자리가 없다', () => {
    // 과학은 사지선다로 배워지지 않는다. 문제가 생기면 형식상 기능이 된다.
    render(<SciencePage />);
    expect(screen.queryAllByTestId('choice')).toHaveLength(0);
  });

  it('영어 영상은 한국어 영상 뒤에 온다', () => {
    // 내용을 이미 아는 채로 들어야 영어가 장면에 가서 붙는다. 순서가 뒤바뀌면
    // 못 알아듣는 소리일 뿐이다.
    render(<SciencePage />);
    const videos = screen.getAllByTestId('science-video');
    expect(videos.map((v) => v.getAttribute('data-lang'))).toEqual(['ko', 'en']);
  });

  it('누르기 전에는 영상을 불러오지 않는다', () => {
    // 안 볼 수도 있는 영상 때문에 유튜브가 아이 기기를 들여다보게 둘 까닭이 없다.
    render(<SciencePage />);
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.getAllByText(/영상 보기/).length).toBeGreaterThan(0);
  });
});

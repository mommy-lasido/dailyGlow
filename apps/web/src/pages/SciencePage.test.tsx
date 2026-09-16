import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SciencePage } from './SciencePage';
import { weeklyScience } from '@/lib/science';

// 로그인한 아이가 없는 화면은 킨더가든부터 본다 — 시윤이와 도윤이 자리다.
const lesson = weeklyScience(0);

describe('SciencePage', () => {
  it('이번 주에 배울 덩어리 하나만 보여준다', () => {
    // 주제를 통째로 쏟아 놓으면 한 학년이 서너 주 만에 지나가 버린다.
    render(<SciencePage />);
    expect(screen.getByTestId('science-title')).toHaveTextContent(lesson.section.heading);
    expect(screen.getByTestId('science-topic')).toHaveTextContent(lesson.topic.title);
    expect(screen.getAllByTestId('science-section')).toHaveLength(1);
  });

  it('집에서 하는 실험을 시키지 않는다', () => {
    // 준비물은 결국 부모의 일이 되고, 아이가 혼자 시작하면 집이 어지러워진다.
    render(<SciencePage />);
    expect(screen.queryByText(/해볼 것|만들어보세요|찾아보세요/)).toBeNull();
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

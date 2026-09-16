import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SciencePage } from './SciencePage';
import { weeklyScience } from '@/lib/science';

describe('SciencePage', () => {
  it('이번 주의 주제와 글과 해볼 것을 보여준다', () => {
    render(<SciencePage />);
    const topic = weeklyScience();
    expect(screen.getByTestId('science-title')).toHaveTextContent(topic.title);
    expect(screen.getAllByTestId('science-line')).toHaveLength(topic.lines.length);
    expect(screen.getByTestId('science-do')).toHaveTextContent(topic.doThis);
  });

  it('맞히는 자리가 없다', () => {
    // 과학은 사지선다로 배워지지 않는다. 문제가 생기면 형식상 기능이 된다.
    render(<SciencePage />);
    expect(screen.queryAllByTestId('choice')).toHaveLength(0);
  });

  it('누르기 전에는 영상을 불러오지 않는다', () => {
    // 안 볼 수도 있는 영상 때문에 유튜브가 아이 기기를 들여다보게 둘 까닭이 없다.
    render(<SciencePage />);
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.getByText(/영상 보기/)).toBeInTheDocument();
  });
});

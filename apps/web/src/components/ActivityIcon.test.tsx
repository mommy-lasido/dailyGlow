import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ACTIVITY_ICONS, ActivityIcon } from './ActivityIcon';

/** 지금 앱에 있는 활동 전부. 하나라도 그림이 없으면 카드가 밋밋해진다. */
/** 영숙님이 그려 준 그림을 쓰는 활동 — 이것들은 <svg> 가 아니라 <img> 로 그려진다. */
const ART_IDS = ['choice_quiz', 'sayings:proverb', 'sayings:idiom', 'grid_drill'];

const EVERY_ACTIVITY = [
  'letter_cards',
  'word_cards',
  'reading_cards',
  'worksheet',
  'count_play',
  'add_play',
  'grid_drill',
  'choice_quiz',
  'sayings',
];

describe('ActivityIcon', () => {
  it.each(EVERY_ACTIVITY)('%s 에 그림이 있다', (id) => {
    expect(ACTIVITY_ICONS[id]).toBeTypeOf('function');
  });

  it('영숙님이 그려 준 그림이 있는 활동은 그 그림을 쓴다', () => {
    for (const id of ['choice_quiz', 'sayings:proverb', 'sayings:idiom', 'grid_drill']) {
      const { container, unmount } = render(<ActivityIcon id={id} />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img!.getAttribute('src')).toMatch(/^\/activity-art\/.+\.png$/);
      // 카드 제목이 따로 있으므로 그림에는 대체 글이 필요 없다.
      expect(img!.getAttribute('alt')).toBe('');
      unmount();
    }
  });

  it('그림을 그린다', () => {
    const { container } = render(<ActivityIcon id="letter_cards" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByTestId('activity-icon')).toHaveAttribute('data-icon', 'letter_cards');
  });

  it('모르는 활동에도 기본 그림을 그린다', () => {
    // 새 활동을 넣고 그림을 깜빡해도 카드가 빈칸으로 남지 않는다.
    const { container } = render(<ActivityIcon id="아직 없는 활동" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('직접 그린 그림은 모두 같은 64×64 격자 안에 있다', () => {
    // 격자가 다르면 카드마다 그림 크기가 들쭉날쭉해진다.
    for (const id of EVERY_ACTIVITY.filter((i) => !ART_IDS.includes(i))) {
      const { container, unmount } = render(<ActivityIcon id={id} />);
      expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 64 64');
      unmount();
    }
  });

  it('이모지를 쓰지 않는다', () => {
    // 이모지는 기기마다 생김새가 다르고, 어떤 것은 네모로 깨진다.
    for (const id of EVERY_ACTIVITY) {
      const { container, unmount } = render(<ActivityIcon id={id} />);
      expect(container.textContent).toBe('');
      unmount();
    }
  });

  it('크기는 밖에서 정한다', () => {
    render(<ActivityIcon id="add_play" className="h-16 w-16" />);
    expect(screen.getByTestId('activity-icon')).toHaveClass('h-16', 'w-16');
  });
});

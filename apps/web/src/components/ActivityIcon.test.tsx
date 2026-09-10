import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ACTIVITY_ART, ACTIVITY_ICONS, ActivityIcon } from './ActivityIcon';

/** 지금 앱에 있는 활동 전부. 하나라도 그림이 없으면 카드가 밋밋해진다. */
/** 영숙님이 그려 준 그림을 쓰는 활동 — 이것들은 <svg> 가 아니라 <img> 로 그려진다. */
const ART_IDS = [
  'letter_cards',
  'word_cards',
  'reading_cards',
  'worksheet',
  'choice_quiz',
  'sayings:proverb',
  'sayings:idiom',
  'count_play',
  'add_play',
  'grid_drill',
];

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
    for (const id of ART_IDS) {
      const { container, unmount } = render(<ActivityIcon id={id} />);
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img!.getAttribute('src')).toMatch(/^\/activity-art\/.+\.png$/);
      // 카드 제목이 따로 있으므로 그림에는 대체 글이 필요 없다.
      expect(img!.getAttribute('alt')).toBe('');
      unmount();
    }
  });

  it('어느 활동의 그림인지 표시해 둔다', () => {
    render(<ActivityIcon id="letter_cards" />);
    expect(screen.getByTestId('activity-icon')).toHaveAttribute('data-icon', 'letter_cards');
  });

  it('모르는 활동에도 기본 그림을 그린다', () => {
    // 새 활동을 넣고 그림을 깜빡해도 카드가 빈칸으로 남지 않는다.
    const { container } = render(<ActivityIcon id="아직 없는 활동" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('그림이 없는 활동을 위한 SVG 는 모두 같은 64×64 격자 안에 있다', () => {
    // 격자가 다르면 카드마다 그림 크기가 들쭉날쭉해진다.
    for (const Icon of Object.values(ACTIVITY_ICONS)) {
      const { container, unmount } = render(<Icon />);
      expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 64 64');
      unmount();
    }
  });

  it('모든 그림이 똑같은 정사각형이다', () => {
    // 원본 그림들의 가로세로 비율이 제각각이라 카드마다 크기가 달라 보였다.
    // 파일 자체를 같은 정사각형으로 맞춰 두고, 어긋나면 여기서 걸리게 한다.
    for (const id of ART_IDS) {
      const file = ACTIVITY_ART[id]!.replace(/^\//, '');
      const png = readFileSync(`public/${file}`);
      // PNG 는 IHDR 청크의 16번째 바이트부터 가로·세로를 4바이트씩 담는다.
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([256, 256]);
    }
  });

  it('활동마다 서로 다른 그림을 쓴다', () => {
    // 같은 그림이 두 카드에 붙으면 아이가 구분하지 못한다.
    const srcs = ART_IDS.map((id) => {
      const { container, unmount } = render(<ActivityIcon id={id} />);
      const src = container.querySelector('img')!.getAttribute('src')!;
      unmount();
      return src;
    });
    expect(new Set(srcs).size).toBe(ART_IDS.length);
  });

  it('이모지를 쓰지 않는다', () => {
    // 이모지는 기기마다 생김새가 다르고, 어떤 것은 네모로 깨진다.
    for (const id of [...EVERY_ACTIVITY, ...ART_IDS]) {
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

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PhonicsActivity } from './PhonicsActivity';
import { PHONICS_GAMES } from './words';
import type { ActivityLesson, ActivityResult } from '@/activities/types';

vi.mock('@/lib/confetti', () => ({ spawnConfetti: () => {} }));
const speakEnglish = vi.hoisted(() => vi.fn());
vi.mock('@/lib/speak', () => ({ speakEnglish, canSpeak: () => true }));

const lesson: ActivityLesson = {
  id: 'phonics',
  title: 'Listen and find',
  activity_kind: 'phonics',
  config: {},
  childLevel: 1,
};

function renderActivity(onFinish: (r: ActivityResult) => void = () => {}) {
  return render(
    <MemoryRouter>
      <PhonicsActivity lesson={lesson} onFinish={onFinish} />
    </MemoryRouter>,
  );
}

describe('PhonicsActivity', () => {
  it('단계를 다 펼쳐 보여준다', () => {
    // 영숙님이 정했다 — 앞 단계를 다 해야 열리는 식이 아니라, 아이가 골라서 한다.
    renderActivity();
    expect(screen.getAllByTestId('phonics-game')).toHaveLength(PHONICS_GAMES.length);
  });

  it('맞히기 전에는 낱말을 보여주지 않는다', () => {
    // 낱말이 보이면 소리를 갈라 듣지 않고 글자만 보고 고른다.
    renderActivity();
    fireEvent.click(screen.getAllByTestId('phonics-game')[0]!);
    expect(screen.queryByTestId('phonics-word')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('phonics-choice').length).toBeGreaterThan(1);
  });

  it('들어가면 문제를 소리로 읽어준다', () => {
    vi.useFakeTimers();
    speakEnglish.mockClear();
    renderActivity();
    fireEvent.click(screen.getAllByTestId('phonics-game')[0]!);
    vi.advanceTimersByTime(600);
    expect(speakEnglish).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('스피커를 누르면 다시 들려준다', () => {
    renderActivity();
    fireEvent.click(screen.getAllByTestId('phonics-game')[0]!);
    speakEnglish.mockClear();
    fireEvent.click(screen.getByTestId('phonics-say'));
    expect(speakEnglish).toHaveBeenCalledTimes(1);
  });

  it('틀린 글자를 눌러도 다음으로 넘어가지 않는다', () => {
    renderActivity();
    fireEvent.click(screen.getAllByTestId('phonics-game')[0]!);
    const before = screen.getByText(/1 \/ /).textContent;

    // 보기 넷 중 하나를 눌러 본다. 답이 아니면 자리에 그대로 머문다.
    const choices = screen.getAllByTestId('phonics-choice');
    fireEvent.click(choices[0]!);
    fireEvent.click(choices[1]!);
    fireEvent.click(choices[2]!);
    fireEvent.click(choices[3]!);

    // 넷 중 하나는 답이라 낱말이 나타났을 것이다. 그 전까지는 번호가 그대로다.
    expect(before).toMatch(/^1 \//);
    expect(screen.getByTestId('phonics-word')).toBeInTheDocument();
  });

  it('단계 고르기로 돌아갈 수 있다', () => {
    // 껍데기의 단추는 영어 놀이터로 나가 버린다. 여기서는 한 칸만 물러난다.
    renderActivity();
    fireEvent.click(screen.getAllByTestId('phonics-game')[0]!);
    fireEvent.click(screen.getByRole('button', { name: /Pick a game/ }));
    expect(screen.getAllByTestId('phonics-game')).toHaveLength(PHONICS_GAMES.length);
  });

  it('화면에 한국어를 쓰지 않는다', () => {
    // 한국어로 거들면 아이가 영어를 알아서 한 것인지 갈라낼 수 없다.
    const { container } = renderActivity();
    fireEvent.click(screen.getAllByTestId('phonics-game')[0]!);
    expect(container.textContent ?? '').not.toMatch(/[가-힣]/);
  });

  it('낱말을 그림으로 보여준다', () => {
    // 뜻 모르는 소리를 듣고 글자를 고르는 것은 낱말 공부가 아니라 받아쓰기다.
    renderActivity();
    fireEvent.click(screen.getAllByTestId('phonics-game')[0]!);
    expect(screen.getByTestId('phonics-pic').textContent).not.toBe('');
  });

  it('그림을 눌러도 다시 들린다', () => {
    // 아이는 글씨보다 그림을 먼저 누른다.
    renderActivity();
    fireEvent.click(screen.getAllByTestId('phonics-game')[0]!);
    speakEnglish.mockClear();
    fireEvent.click(screen.getByTestId('phonics-pic'));
    expect(speakEnglish).toHaveBeenCalledTimes(1);
  });

  it('맞히기 전에는 철자를 보여주지 않는다', () => {
    // 그림은 뜻을 알려줄 뿐, 답을 알려주면 안 된다.
    renderActivity();
    fireEvent.click(screen.getAllByTestId('phonics-game')[0]!);
    expect(screen.getByTestId('phonics-pic')).toBeInTheDocument();
    expect(screen.queryByTestId('phonics-word')).not.toBeInTheDocument();
  });
});

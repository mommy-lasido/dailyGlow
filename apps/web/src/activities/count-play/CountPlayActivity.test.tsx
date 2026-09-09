import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CountPlayActivity } from './CountPlayActivity';
import type { ActivityLesson, ActivityResult } from '@/activities/types';

vi.mock('@/lib/confetti', () => ({ spawnConfetti: () => {} }));
const speak = vi.hoisted(() => vi.fn());
vi.mock('@/lib/speak', () => ({ speak, canSpeak: () => true }));

const lesson: ActivityLesson = {
  id: 'l9',
  title: '수 세기 놀이',
  activity_kind: 'choice_quiz',
  config: { renderer: 'count_play' },
};

function renderActivity(onFinish: (r: ActivityResult) => void = () => {}) {
  return render(
    <MemoryRouter>
      <CountPlayActivity lesson={lesson} onFinish={onFinish} />
    </MemoryRouter>,
  );
}

function start(name: RegExp = /다섯까지 세기/) {
  fireEvent.click(screen.getByRole('button', { name }));
}

/** 화면에 그려진 그림의 개수가 곧 정답이다. */
function answerNow(): number {
  return screen.getByTestId('objects').childElementCount;
}

function clickCorrect() {
  fireEvent.click(screen.getByRole('button', { name: `${answerNow()}개` }));
}

function clickWrong() {
  const correct = `${answerNow()}개`;
  const wrong = screen
    .getAllByTestId('choice')
    .find((b) => b.getAttribute('aria-label') !== correct);
  fireEvent.click(wrong!);
}

describe('CountPlayActivity', () => {
  it('얼마까지 셀지 먼저 고르게 한다', () => {
    renderActivity();
    expect(screen.getByText('얼마까지 세어볼까?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /셋까지 세기/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /다섯까지 세기/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /열까지 세기/ })).toBeInTheDocument();
  });

  it('고른 단계에 맞는 개수만 나온다', () => {
    renderActivity();
    start(/셋까지 세기/);
    for (let i = 0; i < 5; i += 1) {
      expect(answerNow()).toBeLessThanOrEqual(3);
      clickCorrect();
    }
  });

  it('더하기 놀이와 달리 5문제만 낸다', () => {
    // 만 3~4세가 쓰는 활동이라 한 번에 집중할 수 있는 시간이 짧다.
    const onFinish = vi.fn();
    renderActivity(onFinish);
    start();
    for (let i = 0; i < 5; i += 1) clickCorrect();
    expect(screen.getByText('5개 중 5개 맞았어요!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '계속하기' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0]![0].totalCount).toBe(5);
  });

  it('1차에서는 맞았는지 틀렸는지 알려주지 않고 다음으로 넘어간다', () => {
    renderActivity();
    start();
    const first = answerNow();
    clickWrong();
    // 틀렸다는 표시가 없어야 하고, 문제는 그대로 멈춰 있으면 안 된다.
    expect(screen.queryByText(/다시 세어볼까/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('hint')).not.toBeInTheDocument();
    expect(screen.getByText('4개 남았어요')).toBeInTheDocument();
    // 다음 문제로 넘어갔으므로 남은 개수가 줄어 있다 (그림 수는 우연히 같을 수 있다).
    expect(first).toBeGreaterThan(0);
  });

  it('1차를 마치면 몇 개 맞았는지 알려준다', () => {
    renderActivity();
    start();
    clickWrong();
    clickWrong();
    for (let i = 0; i < 3; i += 1) clickCorrect();
    expect(screen.getByText('5개 중 3개 맞았어요!')).toBeInTheDocument();
    expect(screen.getByText(/틀린 2개를 다시 세어볼까요/)).toBeInTheDocument();
  });

  it('2차에는 틀린 문제만 다시 나온다', () => {
    renderActivity();
    start();
    clickWrong();
    for (let i = 0; i < 4; i += 1) clickCorrect();
    fireEvent.click(screen.getByRole('button', { name: '계속하기' }));
    expect(screen.getByText('틀린 문제를 다시 세어봐요')).toBeInTheDocument();
    // 2차에는 아직 힌트를 주지 않는다.
    expect(screen.queryByTestId('hint')).not.toBeInTheDocument();
    clickCorrect();
    expect(screen.getByText('1개 중 1개 맞았어요!')).toBeInTheDocument();
  });

  it('2차에 맞혀도 점수는 1차 것 그대로다', () => {
    const onFinish = vi.fn();
    renderActivity(onFinish);
    start();
    clickWrong();
    for (let i = 0; i < 4; i += 1) clickCorrect();
    fireEvent.click(screen.getByRole('button', { name: '계속하기' }));
    clickCorrect();
    fireEvent.click(screen.getByRole('button', { name: '계속하기' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    // 2차에 고친 것은 점수에 들어가지 않는다 — 이것이 원본 앱의 "항상 만점" 버그를 막는다.
    expect(onFinish.mock.calls[0]![0].correctCount).toBe(4);
  });

  it('3차에는 그림마다 번호가 붙고, 맞힐 때까지 같은 문제가 남는다', () => {
    renderActivity();
    start();
    clickWrong();
    for (let i = 0; i < 4; i += 1) clickCorrect();
    fireEvent.click(screen.getByRole('button', { name: '계속하기' }));
    clickWrong();
    fireEvent.click(screen.getByRole('button', { name: '계속하기' }));

    expect(screen.getByText('이번엔 번호를 보면서 세어봐요')).toBeInTheDocument();
    expect(screen.getByTestId('hint')).toHaveTextContent('짚어가며');
    // 번호는 그림 개수만큼 붙는다.
    const count = answerNow();
    expect(screen.getByText(`${count} ${['하나', '둘', '셋', '넷', '다섯'][count - 1]}`)).toBeInTheDocument();

    const before = answerNow();
    clickWrong();
    // 3차에서 틀리면 같은 문제에 머문다.
    expect(screen.getByText(/다시 세어볼까/)).toBeInTheDocument();
    expect(answerNow()).toBe(before);
    expect(screen.getByTestId('hint')).toBeInTheDocument();
  });

  it('3차까지 마치면 1차 점수로 끝난다', () => {
    const onFinish = vi.fn();
    renderActivity(onFinish);
    start();
    clickWrong();
    for (let i = 0; i < 4; i += 1) clickCorrect();
    fireEvent.click(screen.getByRole('button', { name: '계속하기' }));
    clickWrong();
    fireEvent.click(screen.getByRole('button', { name: '계속하기' }));
    clickWrong();
    clickCorrect();

    expect(onFinish).toHaveBeenCalledTimes(1);
    const result = onFinish.mock.calls[0]![0] as ActivityResult;
    expect(result.correctCount).toBe(4);
    expect(result.totalCount).toBe(5);
    expect(result.meta?.roundScores).toEqual([4, 0, 1]);
  });

  it('어느 단계에서 했는지 기록에 남긴다', () => {
    // 단계 승급 판정이 "열까지 세기에서 잘했는가" 를 봐야 하므로 range 가 필요하다.
    const onFinish = vi.fn();
    renderActivity(onFinish);
    start(/열까지 세기/);
    for (let i = 0; i < 5; i += 1) clickCorrect();
    fireEvent.click(screen.getByRole('button', { name: '계속하기' }));
    expect(onFinish.mock.calls[0]![0].meta.range).toBe(10);
  });

  it('스피커를 누르면 문제를 읽어준다', () => {
    speak.mockClear();
    renderActivity();
    start();
    fireEvent.click(screen.getByRole('button', { name: '문제 읽어주기' }));
    expect(speak).toHaveBeenCalledWith('몇 개일까?');
  });

  it('스스로 읽어주지는 않는다', () => {
    // 누르지 않았는데 소리가 나면 아이가 화면을 보지 않고 소리만 기다리게 된다.
    speak.mockClear();
    renderActivity();
    start();
    expect(speak).not.toHaveBeenCalled();
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddPlayActivity } from './AddPlayActivity';
import { useProfile, type ProfileRow } from '@/stores/profile';
import type { ActivityLesson, ActivityResult } from '@/activities/types';

vi.mock('@/lib/confetti', () => ({ spawnConfetti: () => {} }));

const lesson: ActivityLesson = {
  id: 'l1',
  title: '더하기 놀이',
  activity_kind: 'choice_quiz',
  config: { renderer: 'add_play' },
  childLevel: 1,
};

function profile(readingLevel: string): ProfileRow {
  return {
    id: 'u1',
    display_name: '정시윤',
    given_name: '시윤',
    gender: 'female',
    birth_date: '2021-03-20',
    grade: 'preschool',
    reading_level: readingLevel,
    daily_goal_minutes: 5,
    onboarded_at: '2026-09-04T00:00:00Z',
    avatar_key: null,
    total_xp: 0,
    created_at: '2026-09-04T00:00:00Z',
  } as ProfileRow;
}

function renderActivity(onFinish: (r: ActivityResult) => void = () => {}) {
  return render(
    <MemoryRouter>
      <AddPlayActivity lesson={lesson} onFinish={onFinish} />
    </MemoryRouter>,
  );
}

function start() {
  fireEvent.click(screen.getByRole('button', { name: /하나 더하기/ }));
}

/** 지금 화면의 식에서 정답을 계산한다. */
function answerNow(): number {
  const eq = screen.getByTestId('equation').textContent ?? '';
  const [, a, b] = eq.match(/(\d+)\s*\+\s*(\d+)/) ?? [];
  return Number(a) + Number(b);
}

function clickCorrect() {
  fireEvent.click(screen.getByRole('button', { name: String(answerNow()) }));
}

function clickWrong() {
  const answer = String(answerNow());
  const wrong = screen
    .getAllByTestId('choice')
    .find((el) => el.textContent !== answer) as HTMLElement;
  fireEvent.click(wrong);
}

/** 채점 화면의 "틀린 N개 다시 풀기" 버튼. 다 맞힌 판에는 이 화면이 아예 뜨지 않는다. */
function goOn() {
  fireEvent.click(screen.getByRole('button', { name: /다시 풀기/ }));
}

describe('AddPlayActivity', () => {
  beforeEach(() => {
    useProfile.setState({ profile: profile('learning'), levels: {}, status: 'ready' });
  });

  it('먼저 무엇을 연습할지 고르게 한다', () => {
    renderActivity();
    expect(screen.getByText(/뭘 연습해볼까/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /섞어서 하기/ })).toBeInTheDocument();
  });

  it('고르면 첫 문제가 나온다', () => {
    renderActivity();
    start();
    expect(screen.getByTestId('equation')).toBeInTheDocument();
    expect(screen.getAllByTestId('choice')).toHaveLength(3);
  });

  it('1차에서는 맞았는지 틀렸는지 알려주지 않고 다음으로 넘어간다', () => {
    renderActivity();
    start();
    expect(screen.getByText('10개 남았어요')).toBeInTheDocument();
    clickWrong();
    // 틀렸다는 표시가 없어야 하고, 그래도 다음 문제로 넘어가야 한다.
    expect(screen.queryByText(/다시 세어볼까/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('hint')).not.toBeInTheDocument();
    // 식이 바뀌었는지로 검사하면 안 된다 — "3 + 1" 이 연달아 두 번 나올 수 있어
    // 문제는 정상적으로 넘어갔는데도 실패하는 일이 생긴다. 남은 개수는 반드시 줄어든다.
    expect(screen.getByText('9개 남았어요')).toBeInTheDocument();
  });

  it('한 문제라도 틀리면 채점 화면이 나온다', () => {
    renderActivity();
    start();
    clickWrong();
    for (let i = 0; i < 9; i += 1) clickCorrect();
    expect(screen.getByText(/10개 중 9개 맞았어요/)).toBeInTheDocument();
  });

  it('다 맞히면 채점 화면을 거치지 않고 바로 끝난다', () => {
    // "10개 중 10개 맞았어요" 와 "10문제 중 10개 맞혔어요" 를 잇달아 보여주고
    // 버튼까지 누르게 하면, 다 맞혔는데도 문제를 더 푸는 것처럼 읽힌다.
    const onFinish = vi.fn<(r: ActivityResult) => void>();
    renderActivity(onFinish);
    start();
    for (let i = 0; i < 10; i += 1) clickCorrect();
    expect(screen.queryByRole('button', { name: /다시 풀기/ })).not.toBeInTheDocument();
    expect(onFinish).toHaveBeenCalled();
    const r = onFinish.mock.calls[0]![0];
    expect(r.totalCount).toBe(10);
    expect(r.correctCount).toBe(10);
  });

  it('틀린 문제만 2차에서 다시 낸다', () => {
    renderActivity();
    start();
    clickWrong();
    for (let i = 0; i < 9; i += 1) clickCorrect();
    expect(screen.getByText(/10개 중 9개 맞았어요/)).toBeInTheDocument();
    goOn();
    expect(screen.getByText(/틀린 문제를 다시 풀어봐요/)).toBeInTheDocument();
    expect(screen.getByTestId('equation')).toBeInTheDocument();
  });

  it('2차에 맞혀도 점수는 1차 것 그대로다', () => {
    const onFinish = vi.fn<(r: ActivityResult) => void>();
    renderActivity(onFinish);
    start();
    clickWrong();
    for (let i = 0; i < 9; i += 1) clickCorrect();
    goOn();
    clickCorrect();
    // 남은 것을 다 맞혔으므로 채점 화면 없이 끝난다.
    expect(onFinish).toHaveBeenCalled();
    expect(onFinish.mock.calls[0]![0].correctCount).toBe(9);
  });

  it('3차에는 힌트가 뜨고, 맞힐 때까지 같은 문제가 남는다', () => {
    renderActivity();
    start();
    clickWrong();
    for (let i = 0; i < 9; i += 1) clickCorrect();
    goOn();
    clickWrong();
    goOn();
    expect(screen.getByTestId('hint')).toHaveTextContent(/이렇게 .*만큼 더 세어봐요/);
    const stuck = screen.getByTestId('equation').textContent;
    clickWrong();
    expect(screen.getByText(/다시 세어볼까/)).toBeInTheDocument();
    expect(screen.getByTestId('equation').textContent).toBe(stuck);
  });

  it('3차까지 마치면 라운드별 성적을 보여주고 끝난다', () => {
    const onFinish = vi.fn<(r: ActivityResult) => void>();
    renderActivity(onFinish);
    start();
    clickWrong();
    for (let i = 0; i < 9; i += 1) clickCorrect();
    goOn();
    clickWrong();
    goOn();
    clickCorrect();
    expect(onFinish).toHaveBeenCalled();
    const r = onFinish.mock.calls[0]![0];
    expect(r.correctCount).toBe(9);
    expect(r.meta?.roundScores).toEqual([9, 0, 1]);
    expect(screen.getByText(/9개 맞혔어요/)).toBeInTheDocument();
  });

  it('아직 못 읽는 아이에게는 식을 더 크게 보여준다', () => {
    useProfile.setState({ profile: profile('pre_reader'), levels: {}, status: 'ready' });
    renderActivity();
    start();
    expect(screen.getByTestId('equation')).toHaveClass('text-6xl');
  });

  it('읽을 줄 아는 아이에게는 보통 크기로 보여준다', () => {
    renderActivity();
    start();
    expect(screen.getByTestId('equation')).toHaveClass('text-4xl');
  });
});

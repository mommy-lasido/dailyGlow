import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SpellingActivity } from './SpellingActivity';
import { SPELLING_ITEMS } from './content';
import { BLANK } from './generate';
import type { ActivityLesson, ActivityResult } from '@/activities/types';

vi.mock('@/lib/confetti', () => ({ spawnConfetti: () => {} }));

const lesson: ActivityLesson = {
  id: 'l-spell',
  title: '맞춤법 탐험대',
  activity_kind: 'choice_quiz',
  config: {},
  childLevel: 1,
};

function renderActivity(onFinish: (r: ActivityResult) => void = () => {}) {
  return render(
    <MemoryRouter>
      <SpellingActivity lesson={lesson} onFinish={onFinish} />
    </MemoryRouter>,
  );
}

function start() {
  fireEvent.click(screen.getByRole('button', { name: '시작하기' }));
}

/**
 * 지금 화면의 **문장**으로 어느 항목인지 되짚어 정답을 찾는다.
 *
 * 보기로 찾으면 안 된다 — '안/않' 처럼 같은 보기 짝이 여러 항목에 걸쳐 나오고,
 * 그중 정답이 서로 다르다. 보기로 찾으면 엉뚱한 항목의 정답을 집어 테스트가
 * 가끔씩만 실패한다.
 */
function answerText(): string {
  const shown = screen.getByTestId('sentence').textContent!;
  const item = SPELLING_ITEMS.find((i) =>
    i.templates.some((t) => t.replace(BLANK, '\u00a0') === shown),
  )!;
  return item.options.find((o) => o.correct)!.text;
}

function clickCorrect() {
  const correct = answerText();
  fireEvent.click(
    screen.getAllByTestId('choice').find((b) => b.getAttribute('data-text') === correct)!,
  );
}

function clickWrong() {
  const correct = answerText();
  fireEvent.click(
    screen.getAllByTestId('choice').find((b) => b.getAttribute('data-text') !== correct)!,
  );
}

describe('SpellingActivity', () => {
  it('무엇을 하게 되는지 알려주고 시작한다', () => {
    renderActivity();
    expect(screen.getByText('맞춤법 탐험대')).toBeInTheDocument();
    expect(screen.getByText(/빈칸에 알맞은 말을 골라요/)).toBeInTheDocument();
  });

  it('빈칸이 있는 문장과 보기를 보여준다', () => {
    renderActivity();
    start();
    expect(screen.getByTestId('sentence')).toBeInTheDocument();
    expect(screen.getAllByTestId('choice').length).toBeGreaterThanOrEqual(2);
  });

  it('문장에서 빈칸 표시를 그대로 드러내지 않는다', () => {
    // ___ 를 글자로 보여주면 밑줄 칸인지 알아보기 어렵다.
    renderActivity();
    start();
    expect(screen.getByTestId('sentence').textContent).not.toContain('___');
  });

  it('1차에서는 맞았는지 알려주지 않고 다음으로 넘어간다', () => {
    renderActivity();
    start();
    expect(screen.getByText('10개 남았어요')).toBeInTheDocument();
    clickWrong();
    expect(screen.queryByText(/힌트를 다시 볼까/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('hint')).not.toBeInTheDocument();
    expect(screen.getByText('9개 남았어요')).toBeInTheDocument();
  });

  it('한 판 안에서 같은 문장이 다시 나오지 않는다', () => {
    renderActivity();
    start();
    const seen: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      seen.push(screen.getByTestId('sentence').textContent!);
      clickCorrect();
    }
    expect(new Set(seen).size).toBe(10);
  });

  it('다 맞히면 채점 화면 없이 끝나고 점수는 1차 것이다', () => {
    const onFinish = vi.fn();
    renderActivity(onFinish);
    start();
    for (let i = 0; i < 10; i += 1) clickCorrect();
    expect(screen.queryByRole('button', { name: /다시 풀기/ })).not.toBeInTheDocument();
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0]![0].correctCount).toBe(10);
    expect(onFinish.mock.calls[0]![0].totalCount).toBe(10);
  });

  it('2차에 고쳐도 점수는 1차 것 그대로다', () => {
    const onFinish = vi.fn();
    renderActivity(onFinish);
    start();
    clickWrong();
    for (let i = 0; i < 9; i += 1) clickCorrect();
    expect(screen.getByText('10개 중 9개 맞았어요!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 풀기' }));
    clickCorrect();
    expect(onFinish.mock.calls[0]![0].correctCount).toBe(9);
  });

  it('3차에는 왜 그 말이 맞는지 설명이 뜨고, 맞힐 때까지 같은 문제가 남는다', () => {
    renderActivity();
    start();
    clickWrong();
    for (let i = 0; i < 9; i += 1) clickCorrect();
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 풀기' }));
    clickWrong();
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 풀기' }));

    // 힌트는 그 문제의 정답 설명이어야 한다.
    const shown = screen.getByTestId('sentence').textContent!;
    const item = SPELLING_ITEMS.find((i) =>
      i.templates.some((t) => t.replace(BLANK, '\u00a0') === shown),
    )!;
    expect(screen.getByTestId('hint')).toHaveTextContent(
      item.options.find((o) => o.correct)!.note,
    );

    const stuck = screen.getByTestId('sentence').textContent;
    clickWrong();
    expect(screen.getByText(/힌트를 다시 볼까/)).toBeInTheDocument();
    expect(screen.getByTestId('sentence').textContent).toBe(stuck);
  });
});

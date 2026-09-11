import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SayingsActivity } from './SayingsActivity';
import { sayingsOf } from './content';
import type { ActivityLesson, ActivityResult } from '@/activities/types';

vi.mock('@/lib/confetti', () => ({ spawnConfetti: () => {} }));

function lesson(kind: 'proverb' | 'idiom'): ActivityLesson {
  return {
    id: kind === 'proverb' ? 'l-prov' : 'l-idio',
    title: kind === 'proverb' ? '속담 배우기' : '사자성어 배우기',
    activity_kind: 'choice_quiz',
    config: { renderer: 'sayings', kind },
    childLevel: 1,
  };
}

function renderActivity(
  kind: 'proverb' | 'idiom' = 'proverb',
  onFinish: (r: ActivityResult) => void = () => {},
) {
  return render(
    <MemoryRouter>
      <SayingsActivity lesson={lesson(kind)} onFinish={onFinish} />
    </MemoryRouter>,
  );
}

function start() {
  fireEvent.click(screen.getByRole('button', { name: /퀴즈 풀기/ }));
}

/** 지금 문제의 정답. 물음이 어느 방향이든 자료에서 되짚어 찾는다. */
function answerText(kind: 'proverb' | 'idiom' = 'proverb'): string {
  const question = screen.getByTestId('question').textContent ?? '';
  const pool = sayingsOf(kind);
  const asked = pool.find((s) => question.includes(s.text));
  if (asked) return asked.text;
  // 뜻을 주고 표현을 고르는 판
  const meaning = screen.getByTestId('prompt-meaning').textContent ?? '';
  return pool.find((s) => s.meaning === meaning)!.text;
}

function clickCorrect(kind: 'proverb' | 'idiom' = 'proverb') {
  const correct = answerText(kind);
  fireEvent.click(
    screen.getAllByTestId('choice').find((b) => b.getAttribute('data-text') === correct)!,
  );
}

function clickWrong(kind: 'proverb' | 'idiom' = 'proverb') {
  const correct = answerText(kind);
  fireEvent.click(
    screen.getAllByTestId('choice').find((b) => b.getAttribute('data-text') !== correct)!,
  );
}

describe('SayingsActivity', () => {
  it('문제부터 내지 않고 먼저 모아 보여준다', () => {
    // 배경지식이 없으면 찍는 것밖에 못 한다.
    renderActivity('proverb');
    expect(screen.queryByTestId('choice')).not.toBeInTheDocument();
    for (const s of sayingsOf('proverb').slice(0, 5)) {
      expect(screen.getByText(s.text)).toBeInTheDocument();
      expect(screen.getByText(s.meaning)).toBeInTheDocument();
    }
  });

  it('모아 보기에서 퀴즈로 넘어간다', () => {
    renderActivity('proverb');
    expect(screen.getByText('속담 배우기')).toBeInTheDocument();
    expect(screen.getByText(/먼저 읽어보고 나서 10문제를 풀어요/)).toBeInTheDocument();
    start();
    expect(screen.getAllByTestId('choice')).toHaveLength(3);
  });

  it('사자성어는 모아 보기에서 한자와 글자별 뜻을 함께 보여준다', () => {
    renderActivity('idiom');
    for (const s of sayingsOf('idiom')) {
      expect(screen.getByText(s.hanja!)).toBeInTheDocument();
      expect(screen.getByText(s.chars!.join(' · '))).toBeInTheDocument();
    }
  });

  it('속담에는 한자를 붙이지 않는다', () => {
    renderActivity('proverb');
    expect(screen.queryByTestId('list-hanja')).not.toBeInTheDocument();
  });

  it('사자성어 문제에도 한자를 같이 보여준다', () => {
    renderActivity('idiom');
    start();
    // 표현을 주고 뜻을 고르는 방향일 때 물음 밑에 한자가 붙는다.
    let seen = false;
    for (let i = 0; i < 10; i += 1) {
      if (screen.queryByTestId('question-hanja')) {
        const answer = sayingsOf('idiom').find((s) => s.text === answerText('idiom'))!;
        expect(screen.getByTestId('question-hanja')).toHaveTextContent(answer.hanja!);
        seen = true;
      }
      clickCorrect('idiom');
    }
    expect(seen).toBe(true);
  });

  it('자료를 어디서 골랐는지는 아이 화면에 쓰지 않는다', () => {
    // 라윤이는 그 교재를 갖고 있지 않고, 알아도 문제를 더 잘 풀게 되지 않는다.
    const { container } = renderActivity('proverb');
    expect(container.textContent).not.toMatch(/교재|출판사|하루 한장|바빠|썬더/);
  });

  it('사자성어도 열 문제를 낸다', () => {
    renderActivity('idiom');
    expect(screen.getByText(/먼저 읽어보고 나서 10문제를 풀어요/)).toBeInTheDocument();
  });

  it('한 판 안에서 같은 표현이 다시 나오지 않는다', () => {
    renderActivity('proverb');
    start();
    const seen: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      seen.push(answerText());
      clickCorrect();
    }
    expect(new Set(seen).size).toBe(10);
  });

  it('사자성어 판은 사자성어만 낸다', () => {
    renderActivity('idiom');
    start();
    const idioms = new Set(sayingsOf('idiom').map((s) => s.text));
    for (const b of screen.getAllByTestId('choice')) {
      expect(idioms.has(b.getAttribute('data-text')!)).toBe(true);
    }
  });

  it('보기는 3개다', () => {
    renderActivity();
    start();
    expect(screen.getAllByTestId('choice')).toHaveLength(3);
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

  it('다 맞히면 채점 화면 없이 끝나고 점수는 1차 것이다', () => {
    const onFinish = vi.fn();
    renderActivity('proverb', onFinish);
    start();
    for (let i = 0; i < 10; i += 1) clickCorrect();
    expect(screen.queryByRole('button', { name: /다시 풀기/ })).not.toBeInTheDocument();
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0]![0].correctCount).toBe(10);
    expect(onFinish.mock.calls[0]![0].meta.kind).toBe('proverb');
  });

  it('2차에 고쳐도 점수는 1차 것 그대로다', () => {
    const onFinish = vi.fn();
    renderActivity('proverb', onFinish);
    start();
    clickWrong();
    for (let i = 0; i < 9; i += 1) clickCorrect();
    expect(screen.getByTestId('grading-title')).toHaveTextContent('10문제 중 9개 맞혔어요!');
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 풀기' }));
    clickCorrect();
    expect(onFinish.mock.calls[0]![0].correctCount).toBe(9);
  });

  it('3차에는 힌트가 뜨고 맞힐 때까지 같은 문제가 남는다', () => {
    renderActivity('idiom');
    start();
    clickWrong('idiom');
    for (let i = 0; i < 9; i += 1) clickCorrect('idiom');
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 풀기' }));
    clickWrong('idiom');
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 풀기' }));

    // 사자성어의 힌트는 글자마다의 뜻이다.
    expect(screen.getByTestId('hint')).toBeInTheDocument();
    const stuck = answerText('idiom');
    clickWrong('idiom');
    expect(screen.getByText(/힌트를 다시 볼까/)).toBeInTheDocument();
    expect(answerText('idiom')).toBe(stuck);
  });

  it('뜻을 주고 표현을 고르는 판에서는 물음에 답이 드러나지 않는다', () => {
    renderActivity();
    start();
    // 열 문제 중 어느 하나는 반드시 이 방향으로 나온다.
    let seen = false;
    for (let i = 0; i < 10; i += 1) {
      if (screen.queryByTestId('prompt-meaning')) {
        seen = true;
        const meaning = screen.getByTestId('prompt-meaning').textContent!;
        const answer = sayingsOf('proverb').find((s) => s.meaning === meaning)!;
        expect(screen.getByTestId('question').textContent).not.toContain(answer.text);
      }
      clickCorrect();
    }
    expect(seen).toBe(true);
  });
});

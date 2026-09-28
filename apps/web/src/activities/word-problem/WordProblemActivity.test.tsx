import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { WordProblemActivity } from './WordProblemActivity';
import type { ActivityLesson, ActivityResult } from '@/activities/types';

vi.mock('@/lib/confetti', () => ({ spawnConfetti: () => {} }));

const lesson: ActivityLesson = {
  id: 'word-problem',
  title: '문장제',
  activity_kind: 'word_problem',
  config: {},
  childLevel: 1,
};

function renderActivity(onFinish: (r: ActivityResult) => void = () => {}) {
  return render(
    <MemoryRouter>
      <WordProblemActivity lesson={lesson} onFinish={onFinish} />
    </MemoryRouter>,
  );
}

describe('WordProblemActivity', () => {
  it('먼저 무엇을 묻고 있는지부터 고르게 한다', () => {
    // 답부터 내게 하면 문장을 해부하지 않고 눈에 띄는 숫자로 셈만 한다.
    renderActivity();
    expect(screen.getByText('이 문제는 무엇을 묻고 있나요?')).toBeInTheDocument();
    expect(screen.getAllByTestId('ask-choice').length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByTestId('answer-input')).not.toBeInTheDocument();
  });

  it('묻는 것을 잘못 고르면 짚어 주고 그 자리에 머문다', () => {
    renderActivity();
    // 보기를 하나씩 눌러 본다. 틀린 것을 누르면 안내가 뜬다.
    const choices = screen.getAllByTestId('ask-choice');
    fireEvent.click(choices[0]!);
    fireEvent.click(choices[1]!);
    fireEvent.click(choices[2]!);
    // 셋 중 하나는 답이므로 결국 답 적는 자리로 넘어간다.
    expect(screen.getByTestId('answer-input')).toBeInTheDocument();
  });

  it('답은 보기에서 고르지 않고 숫자로 적는다', () => {
    renderActivity();
    for (const c of screen.getAllByTestId('ask-choice')) fireEvent.click(c);
    const input = screen.getByTestId('answer-input');
    expect(input).toHaveAttribute('inputMode', 'numeric');
    // 숫자가 아닌 것은 들어가지 않는다.
    fireEvent.change(input, { target: { value: '12ㄱ3' } });
    expect((input as HTMLInputElement).value).toBe('123');
  });

  it('답을 적기 전에는 낼 수 없다', () => {
    renderActivity();
    for (const c of screen.getAllByTestId('ask-choice')) fireEvent.click(c);
    expect(screen.getByTestId('answer-submit')).toBeDisabled();
  });

  it('틀린 답을 내면 답을 알려주지 않고 어디를 볼지만 짚어 준다', () => {
    renderActivity();
    for (const c of screen.getAllByTestId('ask-choice')) fireEvent.click(c);

    const input = screen.getByTestId('answer-input');
    // 나올 수 없는 값을 낸다.
    fireEvent.change(input, { target: { value: '999999' } });
    fireEvent.click(screen.getByTestId('answer-submit'));

    expect(screen.getByTestId('hint')).toBeInTheDocument();
    // 적은 값은 지워져 다시 적게 한다.
    expect((screen.getByTestId('answer-input') as HTMLInputElement).value).toBe('');
  });

  it('문제는 답을 적는 동안에도 화면에 남는다', () => {
    // 다시 읽을 수 없으면 외워서 풀게 되고, 그것은 읽기 연습이 아니다.
    renderActivity();
    const text = screen.getByTestId('problem-text').textContent;
    for (const c of screen.getAllByTestId('ask-choice')) fireEvent.click(c);
    expect(screen.getByTestId('problem-text').textContent).toBe(text);
  });
});

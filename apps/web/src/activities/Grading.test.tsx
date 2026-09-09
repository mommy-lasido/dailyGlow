import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Grading } from './Grading';
import { Progress } from './Progress';
import type { QuizState } from './quiz-flow';

function quiz(over: Partial<QuizState> = {}): QuizState {
  return {
    total: 10,
    round: 1,
    phase: 'grading',
    queue: [],
    cursor: 0,
    missed: [3, 7],
    firstTryCorrect: 8,
    roundScores: [8],
    ...over,
  } as QuizState;
}

describe('Grading', () => {
  it('1차에는 몇 개 맞혔는지 알려준다', () => {
    render(<Grading quiz={quiz()} retryLabel="다시 풀기" onNext={() => {}} />);
    expect(screen.getByTestId('grading-title')).toHaveTextContent('10문제 중 8개 맞혔어요!');
    expect(screen.getByRole('button', { name: '틀린 2개 다시 풀기' })).toBeInTheDocument();
  });

  it('2차부터는 남은 개수를 세지 않고 얼마 안 남았다고 말한다', () => {
    // 2차는 틀린 것만 다시 푼 회차라 "1개 중 0개 맞았어요" 같은 말이 나온다.
    // 거의 다 온 아이에게 0을 들이미는 꼴이다.
    render(
      <Grading
        quiz={quiz({ round: 2, missed: [3], roundScores: [8, 1] })}
        retryLabel="다시 풀기"
        onNext={() => {}}
      />,
    );
    const title = screen.getByTestId('grading-title');
    expect(title).toHaveTextContent('잘했어요! 1개만 더 하면 돼요');
    expect(title.textContent).not.toContain('0개');
    expect(screen.getByTestId('grading-detail')).toHaveTextContent('힌트를 보고 해봐요');
  });

  it('활동마다 버튼 말이 다르다', () => {
    render(<Grading quiz={quiz()} retryLabel="다시 세기" onNext={() => {}} />);
    expect(screen.getByRole('button', { name: '틀린 2개 다시 세기' })).toBeInTheDocument();
  });

  it('버튼을 누르면 다음 회차로 넘긴다', () => {
    const onNext = vi.fn();
    render(<Grading quiz={quiz()} retryLabel="다시 풀기" onNext={onNext} />);
    fireEvent.click(screen.getByRole('button', { name: /다시 풀기/ }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('활동이 덧붙인 것을 함께 보여준다', () => {
    render(
      <Grading quiz={quiz()} retryLabel="다시 풀기" onNext={() => {}}>
        <p>맞춤법 풀이</p>
      </Grading>,
    );
    expect(screen.getByText('맞춤법 풀이')).toBeInTheDocument();
  });
});

describe('Progress', () => {
  it('문제 번호를 1번부터 적는다', () => {
    // 발바닥과 가운뎃점만 줄지어 있으면 고장 난 것처럼 보였다.
    render(<Progress total={5} done={0} />);
    for (let i = 1; i <= 5; i += 1) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it('푼 것과 지금 풀 것과 남은 것을 구분한다', () => {
    render(<Progress total={4} done={2} />);
    const states = screen
      .getAllByTestId('progress-step')
      .map((el) => el.getAttribute('data-state'));
    expect(states).toEqual(['done', 'done', 'current', 'todo']);
  });

  it('맞았는지 틀렸는지는 담지 않는다', () => {
    // 1·2차에는 정답 여부를 알려주지 않는다.
    render(<Progress total={3} done={3} />);
    const states = screen
      .getAllByTestId('progress-step')
      .map((el) => el.getAttribute('data-state'));
    expect(new Set(states)).toEqual(new Set(['done']));
  });
});

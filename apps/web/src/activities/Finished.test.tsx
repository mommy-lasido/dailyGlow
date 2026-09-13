import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Finished } from './Finished';
import type { QuizState } from './quiz-flow';

function quiz(over: Partial<QuizState> = {}): QuizState {
  return {
    total: 10,
    round: 3,
    phase: 'done',
    queue: [],
    cursor: 0,
    missed: [],
    firstTryCorrect: 7,
    roundScores: [7, 2, 1],
    ...over,
  } as QuizState;
}

function renderFinished(state: QuizState) {
  return render(
    <MemoryRouter>
      <Finished emoji="🎉" quiz={state} />
    </MemoryRouter>,
  );
}

describe('Finished', () => {
  it('다시 풀어서 해낸 아이에게 못 맞힌 개수를 들이밀지 않는다', () => {
    // 3차까지 붙잡고 풀었으면 결국 전부 맞힌 것이다.
    // "10문제 중 7개 맞혔어요!" 를 큰 글씨로 띄우면 해낸 것을 깎아내리는 꼴이 된다.
    renderFinished(quiz());
    expect(screen.getByTestId('finish-title')).toHaveTextContent('끝까지 해내서 다 맞혔어요!');
    expect(screen.getByTestId('finish-title').textContent).not.toMatch(/\d/);
  });

  it('2차에서 끝나도 마찬가지다', () => {
    renderFinished(quiz({ round: 2, firstTryCorrect: 9, roundScores: [9, 1] }));
    expect(screen.getByTestId('finish-title')).toHaveTextContent('끝까지 해내서 다 맞혔어요!');
  });

  it('1차 점수는 자란 만큼을 말해주는 문장 안에만 둔다', () => {
    // 단계 승급 판정이 이 숫자를 보지만, 그건 어른이 볼 숫자다.
    renderFinished(quiz());
    expect(screen.getByTestId('finish-detail')).toHaveTextContent(
      '처음엔 7개였는데, 틀린 것도 포기하지 않고 끝까지 알아냈어요.',
    );
  });

  it('한 번에 다 맞힌 아이는 그 사실을 크게 칭찬받는다', () => {
    renderFinished(quiz({ round: 1, firstTryCorrect: 10, roundScores: [10] }));
    expect(screen.getByTestId('finish-title')).toHaveTextContent('한 번에 다 맞혔어요!');
    expect(screen.getByTestId('finish-detail')).toHaveTextContent('10문제를 처음부터 다 맞혔어요');
  });

  it('문제 수가 달라도 맞게 말한다', () => {
    renderFinished(quiz({ total: 5, round: 1, firstTryCorrect: 5, roundScores: [5] }));
    expect(screen.getByTestId('finish-detail')).toHaveTextContent('5문제를 처음부터 다 맞혔어요');
  });

  it('홈으로 가는 길을 여기에 또 두지 않는다', () => {
    // 껍데기(App)가 모든 활동 화면 위에 "🏠 홈으로" 를 들고 있다. 여기에 또
    // 두면 한 화면에 홈 단추가 둘이 된다.
    renderFinished(quiz());
    expect(screen.queryByRole('link', { name: /홈으로/ })).not.toBeInTheDocument();
  });

  it('활동이 덧붙인 것을 함께 보여준다', () => {
    render(
      <MemoryRouter>
        <Finished emoji="🎉" quiz={quiz()}>
          <p>맞춤법 풀이</p>
        </Finished>
      </MemoryRouter>,
    );
    expect(screen.getByText('맞춤법 풀이')).toBeInTheDocument();
  });
});

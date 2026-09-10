import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WordsActivity } from './WordsActivity';
import { poolForStage } from './generate';
import type { ActivityLesson, ActivityResult } from '@/activities/types';

vi.mock('@/lib/confetti', () => ({ spawnConfetti: () => {} }));
const speak = vi.hoisted(() => vi.fn());
const canSpeak = vi.hoisted(() => vi.fn(() => true));
vi.mock('@/lib/speak', () => ({ speak, canSpeak }));

function lesson(childLevel: number): ActivityLesson {
  return {
    id: 'l-words',
    title: '낱말 읽기',
    activity_kind: 'word_cards',
    config: {},
    childLevel,
  };
}

function renderActivity(level = 20, onFinish: (r: ActivityResult) => void = () => {}) {
  return render(
    <MemoryRouter>
      <WordsActivity lesson={lesson(level)} onFinish={onFinish} />
    </MemoryRouter>,
  );
}

/** 마지막 카드까지 가서 문제로 넘어간다. */
function goToQuiz(level = 20) {
  const pool = poolForStage(level);
  fireEvent.click(screen.getByRole('button', { name: pool.at(-1)!.word }));
  fireEvent.click(screen.getByRole('button', { name: '다 봤어요' }));
}

/** 지금 문제의 정답 낱말. 보여준 것이 그림이든 글자든 되짚어 찾는다. */
function answerWord(level = 20): string {
  const shown = screen.getByTestId('prompt').textContent!;
  const pool = poolForStage(level);
  return (pool.find((w) => w.emoji === shown) ?? pool.find((w) => w.word === shown))!.word;
}

function clickCorrect(level = 20) {
  const correct = answerWord(level);
  fireEvent.click(
    screen.getAllByTestId('choice').find((b) => b.getAttribute('data-word') === correct)!,
  );
}

function clickWrong(level = 20) {
  const correct = answerWord(level);
  fireEvent.click(
    screen.getAllByTestId('choice').find((b) => b.getAttribute('data-word') !== correct)!,
  );
}

beforeEach(() => {
  speak.mockClear();
  canSpeak.mockReturnValue(true);
});

describe('WordsActivity — 낱말 카드 보기', () => {
  it('문제부터 내지 않고 낱말을 먼저 보여준다', () => {
    renderActivity();
    expect(screen.getByTestId('card-word')).toBeInTheDocument();
    expect(screen.queryByTestId('choice')).not.toBeInTheDocument();
  });

  it('아이가 읽을 수 있는 낱말만 보여준다', () => {
    renderActivity(1);
    expect(screen.getByText('지금 읽을 수 있는 낱말 4개')).toBeInTheDocument();
    expect(screen.getByTestId('card-word')).toHaveTextContent('오이');
  });

  it('단계가 오르면 읽을 낱말이 늘어난다', () => {
    renderActivity(20);
    expect(screen.getByText(`지금 읽을 수 있는 낱말 ${poolForStage(20).length}개`)).toBeInTheDocument();
  });

  it('낱말을 누르면 읽어준다', () => {
    renderActivity(1);
    fireEvent.click(screen.getByRole('button', { name: '오이 읽어주기' }));
    expect(speak).toHaveBeenCalledWith('오이');
  });

  it('스스로 읽어주지는 않는다', () => {
    // 문제마다 읽어주면 글자를 보지 않고 소리만 기다리게 된다.
    renderActivity(1);
    expect(speak).not.toHaveBeenCalled();
  });

  it('읽을 낱말이 셋도 안 되면 그렇다고 말해준다', () => {
    // 1단계 미만은 없지만, 자료가 줄면 생길 수 있는 상황이다.
    renderActivity(0);
    expect(screen.getByText(/아직 읽을 낱말이 적어요/)).toBeInTheDocument();
  });
});

describe('WordsActivity — 읽고 고르기', () => {
  it('보기는 3개다', () => {
    renderActivity();
    goToQuiz();
    expect(screen.getAllByTestId('choice')).toHaveLength(3);
  });

  it('1차에서는 맞았는지 알려주지 않는다', () => {
    renderActivity();
    goToQuiz();
    expect(screen.getByText('5개 남았어요')).toBeInTheDocument();
    clickWrong();
    expect(screen.queryByText(/천천히 읽어볼까/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('hint')).not.toBeInTheDocument();
    expect(screen.getByText('4개 남았어요')).toBeInTheDocument();
  });

  it('1·2차에는 읽어주지 않는다', () => {
    // 여기서 읽어주면 글자를 안 보고 소리로 맞히게 된다.
    renderActivity();
    goToQuiz();
    speak.mockClear();
    clickWrong();
    expect(speak).not.toHaveBeenCalled();
  });

  it('다 맞히면 채점 화면 없이 끝나고 점수는 1차 것이다', () => {
    const onFinish = vi.fn();
    renderActivity(20, onFinish);
    goToQuiz();
    for (let i = 0; i < 5; i += 1) clickCorrect();
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0]![0].correctCount).toBe(5);
    expect(onFinish.mock.calls[0]![0].meta.stage).toBe(20);
  });

  it('2차에 고쳐도 점수는 1차 것 그대로다', () => {
    const onFinish = vi.fn();
    renderActivity(20, onFinish);
    goToQuiz();
    clickWrong();
    for (let i = 0; i < 4; i += 1) clickCorrect();
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 읽기' }));
    clickCorrect();
    expect(onFinish.mock.calls[0]![0].correctCount).toBe(4);
  });

  it('3차에만 눌러서 들어볼 수 있다', () => {
    renderActivity();
    goToQuiz();
    clickWrong();
    for (let i = 0; i < 4; i += 1) clickCorrect();
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 읽기' }));
    clickWrong();
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 읽기' }));

    const word = answerWord();
    speak.mockClear();
    fireEvent.click(screen.getByTestId('hint'));
    expect(speak).toHaveBeenCalledWith(word);

    clickWrong();
    expect(screen.getByText(/천천히 읽어볼까/)).toBeInTheDocument();
    expect(answerWord()).toBe(word);
  });
});

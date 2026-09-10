import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SentencesActivity } from './SentencesActivity';
import { poolForStage } from './generate';
import type { ActivityLesson, ActivityResult } from '@/activities/types';

vi.mock('@/lib/confetti', () => ({ spawnConfetti: () => {} }));
const speak = vi.hoisted(() => vi.fn());
const canSpeak = vi.hoisted(() => vi.fn(() => true));
vi.mock('@/lib/speak', () => ({ speak, canSpeak }));

function lesson(childLevel: number): ActivityLesson {
  return {
    id: 'l-sent',
    title: '문장 읽기',
    activity_kind: 'reading_cards',
    config: {},
    childLevel,
  };
}

const LEVEL = 25;

function renderActivity(level = LEVEL, onFinish: (r: ActivityResult) => void = () => {}) {
  return render(
    <MemoryRouter>
      <SentencesActivity lesson={lesson(level)} onFinish={onFinish} />
    </MemoryRouter>,
  );
}

function goToQuiz(level = LEVEL) {
  const pool = poolForStage(level);
  fireEvent.click(screen.getByRole('button', { name: pool.at(-1)!.sentence }));
  fireEvent.click(screen.getByRole('button', { name: '다 봤어요' }));
}

/** 지금 문제의 정답 문장. 보여준 것이 그림이든 글이든 되짚어 찾는다. */
function answerSentence(level = LEVEL): string {
  const shown = screen.getByTestId('prompt').textContent!;
  const pool = poolForStage(level);
  return (pool.find((s) => s.emoji === shown) ?? pool.find((s) => s.sentence === shown))!
    .sentence;
}

function clickCorrect(level = LEVEL) {
  const correct = answerSentence(level);
  fireEvent.click(
    screen.getAllByTestId('choice').find((b) => b.getAttribute('data-sentence') === correct)!,
  );
}

function clickWrong(level = LEVEL) {
  const correct = answerSentence(level);
  fireEvent.click(
    screen.getAllByTestId('choice').find((b) => b.getAttribute('data-sentence') !== correct)!,
  );
}

beforeEach(() => {
  speak.mockClear();
  canSpeak.mockReturnValue(true);
});

describe('SentencesActivity — 문장 카드 보기', () => {
  it('문제부터 내지 않고 문장을 먼저 보여준다', () => {
    renderActivity();
    expect(screen.getByTestId('card-sentence')).toBeInTheDocument();
    expect(screen.queryByTestId('choice')).not.toBeInTheDocument();
  });

  it('아이가 읽을 수 있는 문장만 보여준다', () => {
    renderActivity(9);
    expect(screen.getByText(`지금 읽을 수 있는 문장 ${poolForStage(9).length}개`)).toBeInTheDocument();
  });

  it('단계가 오르면 읽을 문장이 늘어난다', () => {
    const low = poolForStage(9).length;
    renderActivity(25);
    expect(screen.getByText(`지금 읽을 수 있는 문장 ${poolForStage(25).length}개`)).toBeInTheDocument();
    expect(poolForStage(25).length).toBeGreaterThan(low);
  });

  it('문장을 누르면 읽어준다', () => {
    renderActivity(9);
    const first = poolForStage(9)[0]!;
    fireEvent.click(screen.getByRole('button', { name: `${first.sentence} 읽어주기` }));
    expect(speak).toHaveBeenCalledWith(first.sentence);
  });

  it('스스로 읽어주지는 않는다', () => {
    renderActivity();
    expect(speak).not.toHaveBeenCalled();
  });

  it('읽을 문장이 셋도 안 되면 그렇다고 말해준다', () => {
    renderActivity(1);
    expect(screen.getByText(/아직 읽을 문장이 적어요/)).toBeInTheDocument();
  });
});

describe('SentencesActivity — 읽고 고르기', () => {
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
    renderActivity();
    goToQuiz();
    speak.mockClear();
    clickWrong();
    expect(speak).not.toHaveBeenCalled();
  });

  it('다 맞히면 채점 화면 없이 끝나고 점수는 1차 것이다', () => {
    const onFinish = vi.fn();
    renderActivity(LEVEL, onFinish);
    goToQuiz();
    for (let i = 0; i < 5; i += 1) clickCorrect();
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0]![0].correctCount).toBe(5);
    expect(onFinish.mock.calls[0]![0].meta.stage).toBe(LEVEL);
  });

  it('2차에 고쳐도 점수는 1차 것 그대로다', () => {
    const onFinish = vi.fn();
    renderActivity(LEVEL, onFinish);
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

    const sentence = answerSentence();
    speak.mockClear();
    fireEvent.click(screen.getByTestId('hint'));
    expect(speak).toHaveBeenCalledWith(sentence);

    clickWrong();
    expect(screen.getByText(/천천히 읽어볼까/)).toBeInTheDocument();
    expect(answerSentence()).toBe(sentence);
  });
});

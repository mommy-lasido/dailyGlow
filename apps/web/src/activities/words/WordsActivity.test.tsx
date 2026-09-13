import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WordsActivity } from './WordsActivity';
import { poolForStage, WORDS_PER_ROUND } from './generate';
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

/** 한 판에 보여주는 낱말 수 — 읽을 수 있는 것이 열보다 적으면 그만큼. */
function roundSize(level: number): number {
  return Math.min(WORDS_PER_ROUND, poolForStage(level).length);
}

/** 카드를 끝까지 넘겨 문제로 들어간다. */
function goToQuiz(level = 20) {
  for (let i = 1; i < roundSize(level); i += 1) {
    fireEvent.click(screen.getByRole('button', { name: '다음 →' }));
  }
  fireEvent.click(screen.getByRole('button', { name: '다 봤어요' }));
}

/**
 * 지금 문제의 정답 낱말.
 *
 * 화면에는 스피커 그림만 있고 답은 소리로만 나가므로, **읽어준 것**을 정답으로
 * 본다. 이것이 이 활동의 뼈대다 — 화면을 보고 알 수 있으면 듣기 문제가 아니다.
 */
function answerWord(): string {
  return speak.mock.calls.at(-1)![0] as string;
}

function clickCorrect() {
  const correct = answerWord();
  fireEvent.click(
    screen.getAllByTestId('choice').find((b) => b.getAttribute('data-word') === correct)!,
  );
}

function clickWrong() {
  const correct = answerWord();
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
    expect(screen.getByText('오늘 읽어볼 낱말 5개')).toBeInTheDocument();
    expect(poolForStage(1)).toContain(screen.getByTestId('card-word').textContent);
  });

  it('낱말이 많아도 한 판에 열 개만 보여준다', () => {
    // 백사십 개를 다 넘겨 본 뒤에 풀게 하면 아이가 못 견딘다.
    expect(poolForStage(20).length).toBeGreaterThan(WORDS_PER_ROUND);
    renderActivity(20);
    expect(screen.getByText(`오늘 읽어볼 낱말 ${WORDS_PER_ROUND}개`)).toBeInTheDocument();
  });

  it('낱말을 누르면 읽어준다', () => {
    renderActivity(1);
    const word = screen.getByTestId('card-word').textContent!;
    fireEvent.click(screen.getByRole('button', { name: `${word} 읽어주기` }));
    expect(speak).toHaveBeenCalledWith(word);
  });

  it('카드를 넘겨 볼 때는 스스로 읽어주지 않는다', () => {
    // 여기서 읽어주면 글자를 보지 않고 소리만 기다리게 된다.
    renderActivity(1);
    expect(speak).not.toHaveBeenCalled();
  });

  it('읽을 낱말이 셋도 안 되면 그렇다고 말해준다', () => {
    // 1단계 미만은 없지만, 자료가 줄면 생길 수 있는 상황이다.
    renderActivity(0);
    expect(screen.getByText(/아직 읽을 낱말이 적어요/)).toBeInTheDocument();
  });
});

describe('WordsActivity — 듣고 고르기', () => {
  it('보기는 3개다', () => {
    renderActivity();
    goToQuiz();
    expect(screen.getAllByTestId('choice')).toHaveLength(3);
  });

  it('문제를 내면서 낱말을 읽어준다', () => {
    // 소리가 곧 문제다. 아이가 누르기를 기다리면 무엇을 고를지 알 수 없다.
    renderActivity();
    speak.mockClear();
    goToQuiz();
    expect(speak).toHaveBeenCalledTimes(1);
    const asked = answerWord();
    expect(
      screen.getAllByTestId('choice').some((b) => b.getAttribute('data-word') === asked),
    ).toBe(true);
  });

  it('못 들었으면 다시 들을 수 있다', () => {
    renderActivity();
    goToQuiz();
    const asked = answerWord();
    fireEvent.click(screen.getByTestId('prompt'));
    expect(speak).toHaveBeenLastCalledWith(asked);
  });

  it('1차에서는 맞았는지 알려주지 않는다', () => {
    renderActivity();
    goToQuiz();
    expect(screen.getByText('5개 남았어요')).toBeInTheDocument();
    clickWrong();
    expect(screen.queryByText(/다시 들어볼까/)).not.toBeInTheDocument();
    expect(screen.getByText('4개 남았어요')).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 듣기' }));
    clickCorrect();
    expect(onFinish.mock.calls[0]![0].correctCount).toBe(4);
  });

  it('3차에 틀리면 다독여준다', () => {
    renderActivity();
    goToQuiz();
    clickWrong();
    for (let i = 0; i < 4; i += 1) clickCorrect();
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 듣기' }));
    clickWrong();
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 듣기' }));

    clickWrong();
    expect(screen.getByText(/다시 들어볼까/)).toBeInTheDocument();
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JamoActivity } from './JamoActivity';
import { lettersForStage } from './generate';
import type { ActivityLesson, ActivityResult } from '@/activities/types';

vi.mock('@/lib/confetti', () => ({ spawnConfetti: () => {} }));
const speak = vi.hoisted(() => vi.fn());
const canSpeak = vi.hoisted(() => vi.fn(() => true));
vi.mock('@/lib/speak', () => ({ speak, canSpeak }));

function lesson(childLevel: number): ActivityLesson {
  return {
    id: 'l-jamo',
    title: '자음모음 배우기',
    activity_kind: 'letter_cards',
    config: {},
    childLevel,
  };
}

function renderActivity(
  childLevel = 1,
  onFinish: (r: ActivityResult) => void = () => {},
) {
  return render(
    <MemoryRouter>
      <JamoActivity lesson={lesson(childLevel)} onFinish={onFinish} />
    </MemoryRouter>,
  );
}

/** 배우기 화면을 지나 문제 화면으로 넘어간다. */
function goToQuiz() {
  fireEvent.click(screen.getByRole('button', { name: '다 봤어요' }));
}

/** 지금 문제의 정답 글자. 마지막으로 읽어준 소리로 알아낸다. */
function answerLetter(stage = 1): string {
  const sound = speak.mock.calls[speak.mock.calls.length - 1]![0] as string;
  return lettersForStage(stage).find((i) => i.sound === sound)!.letter;
}

function clickCorrect(stage = 1) {
  fireEvent.click(screen.getByRole('button', { name: answerLetter(stage) }));
}

function clickWrong(stage = 1) {
  const correct = answerLetter(stage);
  const wrong = screen
    .getAllByTestId('choice')
    .find((b) => b.getAttribute('data-letter') !== correct);
  fireEvent.click(wrong!);
}

beforeEach(() => {
  speak.mockClear();
  canSpeak.mockReturnValue(true);
});

describe('JamoActivity — 배우기', () => {
  it('문제부터 내지 않고 글자를 먼저 보여준다', () => {
    // 한 번도 본 적 없는 글자를 바로 문제로 내면 아이는 찍을 수밖에 없다.
    renderActivity(1);
    expect(screen.getByTestId('letter')).toHaveTextContent('ㅏ');
    expect(screen.queryByTestId('choice')).not.toBeInTheDocument();
  });

  it('1단계 아이에게는 기본 모음을 보여준다', () => {
    renderActivity(1);
    expect(screen.getByText('1 / 10')).toBeInTheDocument();
    expect(screen.getByText(/기본 모음/)).toBeInTheDocument();
  });

  it('2단계 아이에게는 ㄱ 이 모음과 만난 글자를 보여준다', () => {
    renderActivity(2);
    expect(screen.getByTestId('letter')).toHaveTextContent('가');
    expect(screen.getByText(/기본 자음/)).toBeInTheDocument();
  });

  it('글자를 누르면 소리를 들려준다', () => {
    renderActivity(1);
    fireEvent.click(screen.getByRole('button', { name: '아 소리 듣기' }));
    expect(speak).toHaveBeenCalledWith('아');
  });

  it('배우기 화면에서는 스스로 소리를 내지 않는다', () => {
    // 아이가 누를 때만 난다. 자동으로 떠들면 화면을 안 보게 된다.
    renderActivity(1);
    expect(speak).not.toHaveBeenCalled();
  });

  it('다음 글자로 넘어갈 수 있다', () => {
    renderActivity(1);
    fireEvent.click(screen.getByRole('button', { name: '다음 →' }));
    expect(screen.getByTestId('letter')).toHaveTextContent('ㅑ');
    expect(screen.getByText('2 / 10')).toBeInTheDocument();
  });

  it('아래 목록에서 글자를 바로 골라 볼 수 있다', () => {
    renderActivity(1);
    fireEvent.click(screen.getByRole('button', { name: 'ㅜ' }));
    expect(screen.getByTestId('letter')).toHaveTextContent('ㅜ');
  });

  it('마지막 글자에서만 문제로 넘어가는 버튼이 나온다', () => {
    renderActivity(1);
    expect(screen.queryByRole('button', { name: '다 봤어요' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ㅣ' }));
    expect(screen.getByRole('button', { name: '다 봤어요' })).toBeInTheDocument();
  });

  it('소리가 안 나는 기기에서는 옆에서 읽어달라고 알려준다', () => {
    canSpeak.mockReturnValue(false);
    renderActivity(1);
    expect(screen.getByText(/옆에서 읽어주세요/)).toBeInTheDocument();
  });
});

describe('JamoActivity — 찾기', () => {
  it('문제가 나오면 소리를 한 번 들려준다', () => {
    // 여기서 소리는 거들어 주는 것이 아니라 문제 그 자체다.
    renderActivity(1);
    fireEvent.click(screen.getByRole('button', { name: 'ㅣ' }));
    speak.mockClear();
    goToQuiz();
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it('보기는 3개이고 그중에 정답이 있다', () => {
    renderActivity(1);
    fireEvent.click(screen.getByRole('button', { name: 'ㅣ' }));
    goToQuiz();
    expect(screen.getAllByTestId('choice')).toHaveLength(3);
    const letters = screen.getAllByTestId('choice').map((b) => b.getAttribute('data-letter'));
    expect(letters).toContain(answerLetter());
  });

  it('1차에서는 맞았는지 알려주지 않고 다음으로 넘어간다', () => {
    renderActivity(1);
    fireEvent.click(screen.getByRole('button', { name: 'ㅣ' }));
    goToQuiz();
    expect(screen.getByText('5개 남았어요')).toBeInTheDocument();
    clickWrong();
    expect(screen.queryByText(/다시 들어볼까/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('hint')).not.toBeInTheDocument();
    expect(screen.getByText('4개 남았어요')).toBeInTheDocument();
  });

  it('다 맞히면 채점 화면 없이 끝나고, 점수는 1차 것이다', () => {
    const onFinish = vi.fn();
    renderActivity(1, onFinish);
    fireEvent.click(screen.getByRole('button', { name: 'ㅣ' }));
    goToQuiz();
    for (let i = 0; i < 5; i += 1) clickCorrect();
    expect(screen.queryByRole('button', { name: /다시 찾기/ })).not.toBeInTheDocument();
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0]![0].correctCount).toBe(5);
    expect(onFinish.mock.calls[0]![0].meta.stage).toBe(1);
  });

  it('2차에 고쳐도 점수는 1차 것 그대로다', () => {
    const onFinish = vi.fn();
    renderActivity(1, onFinish);
    fireEvent.click(screen.getByRole('button', { name: 'ㅣ' }));
    goToQuiz();
    clickWrong();
    for (let i = 0; i < 4; i += 1) clickCorrect();
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 찾기' }));
    clickCorrect();
    expect(onFinish.mock.calls[0]![0].correctCount).toBe(4);
  });

  it('3차에는 글자를 보여주고, 맞힐 때까지 같은 문제가 남는다', () => {
    renderActivity(1);
    fireEvent.click(screen.getByRole('button', { name: 'ㅣ' }));
    goToQuiz();
    clickWrong();
    for (let i = 0; i < 4; i += 1) clickCorrect();
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 찾기' }));
    clickWrong();
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 찾기' }));

    const stuck = answerLetter();
    expect(screen.getByTestId('hint')).toHaveTextContent(stuck);
    clickWrong();
    expect(screen.getByText(/다시 들어볼까/)).toBeInTheDocument();
    expect(screen.getByTestId('hint')).toHaveTextContent(stuck);
  });

  it('같은 문제에 머무는 동안 소리가 거듭 나지 않는다', () => {
    renderActivity(1);
    fireEvent.click(screen.getByRole('button', { name: 'ㅣ' }));
    goToQuiz();
    clickWrong();
    for (let i = 0; i < 4; i += 1) clickCorrect();
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 찾기' }));
    clickWrong();
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 찾기' }));

    // 정답을 미리 알아둔다 — 소리 기록을 지우고 나면 알아낼 수가 없다.
    const correct = answerLetter();
    speak.mockClear();
    const wrong = screen
      .getAllByTestId('choice')
      .find((b) => b.getAttribute('data-letter') !== correct);
    fireEvent.click(wrong!);

    // 3차에서 틀려 같은 글자에 머물렀다. 소리가 또 나면 아이가 놀란다.
    expect(speak).not.toHaveBeenCalled();
  });

  it('다시 듣기 버튼을 누르면 소리가 난다', () => {
    renderActivity(1);
    fireEvent.click(screen.getByRole('button', { name: 'ㅣ' }));
    goToQuiz();
    speak.mockClear();
    fireEvent.click(screen.getByRole('button', { name: '다시 듣기' }));
    expect(speak).toHaveBeenCalledTimes(1);
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { GridDrillActivity } from './GridDrillActivity';
import { DRILL_CELLS } from './generate';
import type { ActivityLesson, ActivityResult } from '@/activities/types';

vi.mock('@/lib/confetti', () => ({ spawnConfetti: () => {} }));

const lesson: ActivityLesson = {
  id: 'l-grid',
  title: '100칸 계산',
  activity_kind: 'grid_drill',
  config: {},
  childLevel: 1,
};

function renderActivity(onFinish: (r: ActivityResult) => void = () => {}) {
  return render(
    <MemoryRouter>
      <GridDrillActivity lesson={lesson} onFinish={onFinish} />
    </MemoryRouter>,
  );
}

function start(name: RegExp = /더하기 100칸/) {
  fireEvent.click(screen.getByRole('button', { name }));
}

/** 지금 화면의 셈에서 답을 계산한다. */
function answerNow(): number {
  const text = screen.getByTestId('problem').textContent ?? '';
  const [, a, sign, b] = text.match(/(\d+)\s*(＋|－|×)\s*(\d+)/) ?? [];
  const x = Number(a);
  const y = Number(b);
  if (sign === '＋') return x + y;
  if (sign === '－') return x - y;
  return x * y;
}

function key(digit: string) {
  fireEvent.click(
    screen.getAllByTestId('key').find((b) => b.getAttribute('data-digit') === digit)!,
  );
}

/** 숫자를 눌러 넣는다. 확인이 필요한 경우 확인까지 누른다. */
function typeNumber(n: number) {
  for (const d of String(n)) key(d);
  const confirm = screen.queryByRole('button', { name: '확인' });
  if (confirm && !(confirm as HTMLButtonElement).disabled) fireEvent.click(confirm);
}

function answerCorrectly() {
  typeNumber(answerNow());
}

function answerWrong() {
  const wrong = answerNow() === 0 ? 5 : 0;
  typeNumber(wrong);
}

describe('GridDrillActivity', () => {
  it('어떤 셈을 할지 먼저 고르게 한다', () => {
    renderActivity();
    expect(screen.getByRole('button', { name: /더하기 100칸/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /빼기 100칸/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /곱하기 100칸/ })).toBeInTheDocument();
    expect(screen.queryByTestId('drill-table')).not.toBeInTheDocument();
  });

  it('표에 백 칸이 있다', () => {
    renderActivity();
    start();
    expect(screen.getAllByTestId('cell')).toHaveLength(DRILL_CELLS);
  });

  it('지금 채울 칸을 표에서 짚어준다', () => {
    renderActivity();
    start();
    const highlighted = screen
      .getAllByTestId('cell')
      .filter((c) => c.className.includes('bg-glow-300'));
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]).toHaveAttribute('data-index', '0');
  });

  it('숫자를 누르면 칸이 채워지고 다음 칸으로 넘어간다', () => {
    renderActivity();
    start();
    expect(screen.getByText('0 / 100칸')).toBeInTheDocument();
    answerCorrectly();
    expect(screen.getByText('1 / 100칸')).toBeInTheDocument();
  });

  it('더 눌러야 할 수도 있는 숫자는 확인을 기다린다', () => {
    // 더하기에서 1 은 1 일 수도 12 일 수도 있다.
    renderActivity();
    start();
    key('1');
    expect(screen.getByTestId('problem')).toHaveTextContent('1');
    expect(screen.getByText('0 / 100칸')).toBeInTheDocument();
  });

  it('지우기를 누르면 눌렀던 숫자가 사라진다', () => {
    renderActivity();
    start();
    key('1');
    fireEvent.click(screen.getByRole('button', { name: '지우기' }));
    expect(screen.getByTestId('problem')).toHaveTextContent('?');
  });

  it('1차에서는 맞았는지 알려주지 않는다', () => {
    renderActivity();
    start();
    answerWrong();
    expect(screen.queryByText(/다시 볼까/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('hint')).not.toBeInTheDocument();
    expect(screen.getByText('1 / 100칸')).toBeInTheDocument();
  });

  it('백 칸을 다 맞히면 걸린 시간을 알려주고 끝난다', () => {
    const onFinish = vi.fn();
    renderActivity(onFinish);
    start();
    for (let i = 0; i < DRILL_CELLS; i += 1) answerCorrectly();
    expect(screen.getByTestId('elapsed')).toHaveTextContent(/처음 백 칸을 .+ 만에 채웠어요/);
    expect(onFinish).toHaveBeenCalledTimes(1);
    const r = onFinish.mock.calls[0]![0] as ActivityResult;
    expect(r.totalCount).toBe(100);
    expect(r.correctCount).toBe(100);
    expect(r.meta?.op).toBe('add');
    expect(r.meta?.firstRoundSec).toBeGreaterThan(0);
  });

  it('틀린 칸이 있으면 채점 화면에서 바른 답을 보여준다', () => {
    renderActivity();
    start();
    answerWrong();
    for (let i = 1; i < DRILL_CELLS; i += 1) answerCorrectly();

    expect(screen.getByTestId('grading-title')).toHaveTextContent('100문제 중 99개 맞혔어요!');
    // 틀린 칸은 빨갛게, 그 자리에 바른 답이 적힌다.
    const wrong = screen.getAllByTestId('cell').filter((c) => c.className.includes('bg-red-50'));
    expect(wrong).toHaveLength(1);
    expect(wrong[0]).toHaveAttribute('data-index', '0');
  });

  it('2차에 고쳐도 점수는 1차 것 그대로다', () => {
    const onFinish = vi.fn();
    renderActivity(onFinish);
    start();
    answerWrong();
    for (let i = 1; i < DRILL_CELLS; i += 1) answerCorrectly();
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 채우기' }));
    answerCorrectly();
    expect(onFinish.mock.calls[0]![0].correctCount).toBe(99);
  });

  it('3차에는 답을 보여주고, 맞힐 때까지 같은 칸에 머문다', () => {
    renderActivity();
    start();
    answerWrong();
    for (let i = 1; i < DRILL_CELLS; i += 1) answerCorrectly();
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 채우기' }));
    answerWrong();
    fireEvent.click(screen.getByRole('button', { name: '틀린 1개 다시 채우기' }));

    expect(screen.getByTestId('hint')).toHaveTextContent(`답은 ${answerNow()} 이에요`);
    const stuck = screen.getByTestId('problem').textContent;
    answerWrong();
    expect(screen.getByText(/답을 다시 볼까/)).toBeInTheDocument();
    expect(screen.getByTestId('problem').textContent).toBe(stuck);
  });

  it('빼기는 답이 음수로 내려가지 않는다', () => {
    renderActivity();
    start(/빼기 100칸/);
    for (let i = 0; i < 20; i += 1) {
      expect(answerNow()).toBeGreaterThan(0);
      answerCorrectly();
    }
  });

  it('곱하기도 백 칸을 낸다', () => {
    renderActivity();
    start(/곱하기 100칸/);
    expect(screen.getAllByTestId('cell')).toHaveLength(DRILL_CELLS);
    expect(screen.getByTestId('problem')).toHaveTextContent('×');
  });
});

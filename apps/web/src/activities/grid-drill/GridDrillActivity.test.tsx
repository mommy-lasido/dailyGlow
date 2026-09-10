import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { GridDrillActivity } from './GridDrillActivity';
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

function choose(testid: string, attr: string, value: string) {
  fireEvent.click(
    screen.getAllByTestId(testid).find((b) => b.getAttribute(attr) === value)!,
  );
}

function begin(opts: { op?: string; cells?: string; mode?: string } = {}) {
  if (opts.op) choose('op', 'data-op', opts.op);
  if (opts.cells) choose('size', 'data-cells', opts.cells);
  if (opts.mode) choose('mode', 'data-mode', opts.mode);
  fireEvent.click(screen.getByRole('button', { name: '시작하기' }));
}

/** 화면의 표에서 머리줄 숫자를 읽어 답을 직접 셈한다. */
function readTable() {
  const rows = Array.from(screen.getByTestId('drill-table').querySelectorAll('tr'));
  const head = Array.from(rows[0]!.querySelectorAll('td'));
  const op = head[0]!.textContent!;
  const cols = head.slice(1).map((td) => Number(td.textContent));
  const rowHeaders = rows.slice(1).map((tr) => Number(tr.querySelector('td')!.textContent));
  return { op, cols, rowHeaders };
}

function fillAll(correct = true) {
  const { op, cols, rowHeaders } = readTable();
  const side = cols.length;
  for (let ri = 0; ri < side; ri += 1) {
    for (let ci = 0; ci < side; ci += 1) {
      const index = ri * side + ci;
      const r = rowHeaders[ri]!;
      const c = cols[ci]!;
      const value =
        op === '+' ? r + c : op === '-' ? r - c : op === '×' ? r * c : Math.floor(r / c);
      const box = screen
        .getAllByTestId('input')
        .find(
          (el) =>
            el.getAttribute('data-index') === String(index) &&
            el.getAttribute('data-field') === 'value',
        )!;
      fireEvent.change(box, { target: { value: String(correct ? value : value + 1) } });
      if (op === '÷') {
        const rem = screen
          .getAllByTestId('input')
          .find(
            (el) =>
              el.getAttribute('data-index') === String(index) &&
              el.getAttribute('data-field') === 'remainder',
          )!;
        fireEvent.change(rem, { target: { value: String(r % c) } });
      }
    }
  }
}

describe('GridDrillActivity — 고르기', () => {
  it('예전 앱처럼 셈·단계·칸 수·푸는 곳을 고르게 한다', () => {
    renderActivity();
    expect(screen.getAllByTestId('op')).toHaveLength(4);
    expect(screen.getAllByTestId('size')).toHaveLength(3);
    expect(screen.getAllByTestId('mode')).toHaveLength(2);
    expect(screen.getAllByTestId('level').length).toBeGreaterThan(0);
  });

  it('셈을 바꾸면 단계도 그 셈의 것으로 바뀐다', () => {
    renderActivity();
    expect(screen.getAllByTestId('level')).toHaveLength(4); // 덧셈
    choose('op', 'data-op', '×');
    expect(screen.getAllByTestId('level')).toHaveLength(2); // 곱셈
  });

  it('25칸을 고르면 25칸이 나온다', () => {
    renderActivity();
    begin({ cells: '25' });
    expect(screen.getAllByTestId('cell')).toHaveLength(25);
  });

  it('64칸도 있다', () => {
    renderActivity();
    begin({ cells: '64' });
    expect(screen.getAllByTestId('cell')).toHaveLength(64);
  });

  it('100칸이 기본이다', () => {
    renderActivity();
    begin();
    expect(screen.getAllByTestId('cell')).toHaveLength(100);
  });
});

describe('GridDrillActivity — 화면에서 풀기', () => {
  it('식을 따로 보여주지 않는다 — 표에서 두 수를 스스로 찾아야 한다', () => {
    // 아래에 식을 적어 주면 그냥 연산 문제 100개를 푸는 것과 다를 바 없다.
    renderActivity();
    begin({ cells: '25' });
    expect(screen.queryByTestId('problem')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('input')).toHaveLength(25);
  });

  it('시계는 첫 글자를 적을 때 시작한다', () => {
    // 표를 들여다보는 시간까지 세면 기록이 부정확해진다.
    renderActivity();
    begin({ cells: '25' });
    expect(screen.getByTestId('timer')).toHaveTextContent('0:00');
    fireEvent.change(screen.getAllByTestId('input')[0]!, { target: { value: '3' } });
    // 시작했다는 것은 이후 기록이 남는 것으로 확인한다.
    expect(screen.getByTestId('timer')).toBeInTheDocument();
  });

  it('숫자가 아닌 것은 받지 않는다', () => {
    renderActivity();
    begin({ cells: '25' });
    const box = screen.getAllByTestId('input')[0]! as HTMLInputElement;
    fireEvent.change(box, { target: { value: 'ㄱ3ㄴ' } });
    expect(box.value).toBe('3');
  });

  it('채점하면 틀린 칸이 빨갛게 표시된다', () => {
    renderActivity();
    begin({ cells: '25' });
    fillAll(false);
    fireEvent.click(screen.getByRole('button', { name: '채점하기' }));
    expect(screen.getByTestId('score')).toHaveTextContent('25칸 중 0칸 맞았어요');
    expect(
      screen.getAllByTestId('cell').filter((c) => c.className.includes('bg-red-50')),
    ).toHaveLength(25);
  });

  it('다 맞히면 걸린 시간을 알려주고 기록한다', () => {
    const onFinish = vi.fn();
    renderActivity(onFinish);
    begin({ cells: '25' });
    fillAll();
    fireEvent.click(screen.getByRole('button', { name: '채점하기' }));
    expect(screen.getByTestId('result')).toHaveTextContent('25칸을 다 채웠어요');
    expect(onFinish).toHaveBeenCalledTimes(1);
    const r = onFinish.mock.calls[0]![0] as ActivityResult;
    expect(r.totalCount).toBe(25);
    expect(r.correctCount).toBe(25);
    expect(r.meta?.cells).toBe(25);
  });

  it('고쳐서 맞혀도 실력은 처음 채점 점수로 잰다', () => {
    const onFinish = vi.fn();
    renderActivity(onFinish);
    begin({ cells: '25' });
    fillAll(false);
    fireEvent.click(screen.getByRole('button', { name: '채점하기' }));
    fillAll(true);
    fireEvent.click(screen.getByRole('button', { name: '채점하기' }));
    expect(onFinish.mock.calls[0]![0].correctCount).toBe(0);
  });

  it('나눗셈은 몫과 나머지를 따로 적는다', () => {
    renderActivity();
    begin({ op: '÷', cells: '25' });
    const first = screen
      .getAllByTestId('input')
      .filter((el) => el.getAttribute('data-index') === '0');
    expect(first.map((el) => el.getAttribute('data-field'))).toEqual(['value', 'remainder']);
  });

  it('나눗셈은 몫과 나머지가 둘 다 맞아야 맞다', () => {
    const onFinish = vi.fn();
    renderActivity(onFinish);
    begin({ op: '÷', cells: '25' });
    fillAll();
    fireEvent.click(screen.getByRole('button', { name: '채점하기' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0]![0].correctCount).toBe(25);
  });
});

describe('GridDrillActivity — 인쇄해서 풀기', () => {
  it('인쇄 화면에는 입력칸이 없다', () => {
    // 종이에 연필로 푸는 것이라 화면에서 채우지 않는다.
    renderActivity();
    begin({ cells: '25', mode: 'paper' });
    expect(screen.queryAllByTestId('input')).toHaveLength(0);
    expect(screen.getAllByTestId('cell')).toHaveLength(25);
  });

  it('인쇄 단추가 있다', () => {
    renderActivity();
    begin({ cells: '25', mode: 'paper' });
    expect(screen.getByRole('button', { name: /인쇄하기/ })).toBeInTheDocument();
  });

  it('답 보기로 맞춰볼 수 있다', () => {
    renderActivity();
    begin({ op: '+', cells: '25', mode: 'paper' });
    // 처음에는 칸이 비어 있다.
    expect(screen.getAllByTestId('cell')[0]!.textContent).toBe('');
    fireEvent.click(screen.getByRole('button', { name: '답 보기' }));
    expect(screen.getAllByTestId('cell')[0]!.textContent).not.toBe('');
    fireEvent.click(screen.getByRole('button', { name: '답 숨기기' }));
    expect(screen.getAllByTestId('cell')[0]!.textContent).toBe('');
  });

  it('인쇄할 때 앱 껍데기는 감춘다', () => {
    renderActivity();
    begin({ cells: '25', mode: 'paper' });
    const bar = screen.getByRole('button', { name: /인쇄하기/ }).closest('div')!.parentElement!;
    expect(bar.className).toContain('print:hidden');
  });
});

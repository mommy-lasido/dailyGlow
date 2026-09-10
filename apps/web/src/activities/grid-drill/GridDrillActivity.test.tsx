import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
  // 지난 기록을 읽어오므로 질의 상자가 필요하다. 기록이 없는 아이로 그린다.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <GridDrillActivity lesson={lesson} onFinish={onFinish} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function choose(testid: string, attr: string, value: string) {
  fireEvent.click(
    screen.getAllByTestId(testid).find((b) => b.getAttribute(attr) === value)!,
  );
}

/** 설정을 고르고 문제 화면까지 간다. */
function showProblem(opts: { op?: string; cells?: string } = {}) {
  if (opts.op) choose('op', 'data-op', opts.op);
  if (opts.cells) choose('size', 'data-cells', opts.cells);
  fireEvent.click(screen.getByRole('button', { name: '문제 보기' }));
}

/** 문제 화면을 지나 화면에서 풀기까지 간다. */
function begin(opts: { op?: string; cells?: string } = {}) {
  showProblem(opts);
  fireEvent.click(screen.getByRole('button', { name: /화면에서 풀기/ }));
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
  it('예전 앱처럼 셈·단계·칸 수를 고르게 한다', () => {
    renderActivity();
    expect(screen.getAllByTestId('op')).toHaveLength(4);
    expect(screen.getAllByTestId('size')).toHaveLength(3);
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

describe('GridDrillActivity — 지난 기록', () => {
  it('목표 시간을 적어 두지 않는다', () => {
    // 4분 걸리는 아이에게 2분을 들이밀면 닿지 않는 목표라 포기하게 된다.
    renderActivity();
    expect(screen.queryByTestId('targets')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('목표 시간');
  });

  it('푸는 화면에도 목표 시간이 없다', () => {
    renderActivity();
    begin({ cells: '25' });
    expect(screen.queryByTestId('target')).not.toBeInTheDocument();
    expect(screen.getByTestId('timer')).toBeInTheDocument();
  });

  it('첫 판을 마치면 첫 기록이라고 알려준다', () => {
    renderActivity();
    begin({ cells: '25' });
    fillAll();
    fireEvent.click(screen.getByRole('button', { name: '채점하기' }));
    expect(screen.getByTestId('record-result')).toHaveTextContent('첫 기록이에요');
  });
});

describe('GridDrillActivity — 문제 화면', () => {
  it('고르는 화면에는 표를 얹지 않는다', () => {
    // 고르는 화면에 표까지 두었더니 너무 번잡했다.
    renderActivity();
    expect(screen.queryByTestId('drill-table')).not.toBeInTheDocument();
  });

  it('칸 수까지 정하면 문제 화면으로 넘어간다', () => {
    renderActivity();
    showProblem({ cells: '25' });
    expect(screen.getAllByTestId('cell')).toHaveLength(25);
    expect(screen.queryAllByTestId('op')).toHaveLength(0);
  });

  it('문제를 보면서 무엇을 할지 정한다', () => {
    renderActivity();
    showProblem({ cells: '25' });
    expect(screen.getByRole('button', { name: /화면에서 풀기/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /인쇄하기/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /새 문제 만들기/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '답 보기' })).toBeInTheDocument();
  });

  it('할 일 단추는 표보다 위에 있다', () => {
    // 표가 100칸이면 아래로 길어서, 단추가 표 밑에 있으면 한참 내려가야 보인다.
    renderActivity();
    showProblem({ cells: '100' });
    const body = document.body.textContent!;
    expect(body.indexOf('화면에서 풀기')).toBeLessThan(body.indexOf('종이로 풀었다면'));
    const buttons = screen.getByRole('button', { name: /화면에서 풀기/ });
    const table = screen.getByTestId('drill-table');
    expect(buttons.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('문제 화면에는 입력칸이 없다', () => {
    renderActivity();
    showProblem({ cells: '25' });
    expect(screen.queryAllByTestId('input')).toHaveLength(0);
  });

  it('새 문제를 만들 수 있다', () => {
    renderActivity();
    showProblem({ cells: '25' });
    const before = readTable().cols.join(',');
    let changed = false;
    for (let i = 0; i < 20 && !changed; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /새 문제 만들기/ }));
      changed = readTable().cols.join(',') !== before;
    }
    expect(changed).toBe(true);
  });

  it('보고 있던 그 표를 그대로 푼다', () => {
    renderActivity();
    showProblem({ cells: '25' });
    const shown = readTable();
    fireEvent.click(screen.getByRole('button', { name: /화면에서 풀기/ }));
    expect(readTable().cols).toEqual(shown.cols);
    expect(readTable().rowHeaders).toEqual(shown.rowHeaders);
  });

  it('다시 고르기로 돌아갈 수 있다', () => {
    renderActivity();
    showProblem({ cells: '25' });
    fireEvent.click(screen.getByRole('button', { name: /다시 고르기/ }));
    expect(screen.getAllByTestId('op')).toHaveLength(4);
  });
});

describe('GridDrillActivity — 종이로 푼 기록', () => {
  it('스톱워치와 맞은 개수를 적는 자리가 있다', () => {
    // 인쇄한 종이는 앱이 손을 댈 수 없으니 옆에서 재고 적어 넣는다.
    renderActivity();
    showProblem({ cells: '25' });
    expect(screen.getByTestId('paper-timer')).toHaveTextContent('0:00');
    expect(screen.getByTestId('paper-correct')).toBeInTheDocument();
  });

  it('시간을 재지 않으면 저장할 수 없다', () => {
    renderActivity();
    showProblem({ cells: '25' });
    fireEvent.change(screen.getByTestId('paper-correct'), { target: { value: '20' } });
    expect(screen.getByRole('button', { name: '기록 저장' })).toBeDisabled();
  });

  it('칸 수보다 많은 개수는 저장할 수 없다', () => {
    renderActivity();
    showProblem({ cells: '25' });
    fireEvent.click(screen.getByRole('button', { name: '시작' }));
    fireEvent.change(screen.getByTestId('paper-correct'), { target: { value: '99' } });
    expect(screen.getByRole('button', { name: '기록 저장' })).toBeDisabled();
  });

  it('종이 기록은 화면 기록과 따로 남는다', async () => {
    const onFinish = vi.fn();
    renderActivity(onFinish);
    showProblem({ cells: '25' });
    fireEvent.click(screen.getByRole('button', { name: '시작' }));
    // 스톱워치가 1초 이상 흐른 것처럼 만든다.
    await new Promise((r) => setTimeout(r, 1100));
    fireEvent.click(screen.getByRole('button', { name: '멈춤' }));
    fireEvent.change(screen.getByTestId('paper-correct'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: '기록 저장' }));

    expect(onFinish).toHaveBeenCalledTimes(1);
    const r = onFinish.mock.calls[0]![0] as ActivityResult;
    expect(r.mode).toBe('paper');
    expect(r.correctCount).toBe(20);
    expect(r.totalCount).toBe(25);
    expect(r.durationSec).toBeGreaterThan(0);
    expect(screen.getByTestId('paper-saved')).toBeInTheDocument();
  });
});

describe('GridDrillActivity — 인쇄해서 풀기', () => {
  it('답 보기로 맞춰볼 수 있다', () => {
    renderActivity();
    showProblem({ op: '+', cells: '25' });
    // 처음에는 칸이 비어 있다.
    expect(screen.getAllByTestId('cell')[0]!.textContent).toBe('');
    fireEvent.click(screen.getByRole('button', { name: '답 보기' }));
    expect(screen.getAllByTestId('cell')[0]!.textContent).not.toBe('');
    fireEvent.click(screen.getByRole('button', { name: '답 숨기기' }));
    expect(screen.getAllByTestId('cell')[0]!.textContent).toBe('');
  });

  it('인쇄할 때 표만 남기고 나머지는 감춘다', () => {
    renderActivity();
    showProblem({ cells: '25' });
    const bar = screen.getByRole('button', { name: /인쇄하기/ }).closest('div')!.parentElement!;
    expect(bar.className).toContain('print:hidden');
  });
});

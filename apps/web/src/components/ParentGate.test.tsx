import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { ParentGate } from './ParentGate';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: memoryStorage(),
    configurable: true,
  });
});

function renderGate() {
  return render(
    <MemoryRouter>
      <ParentGate>
        <p>설정 내용</p>
      </ParentGate>
    </MemoryRouter>,
  );
}

describe('ParentGate', () => {
  it('비밀번호가 없으면 정하는 화면이 뜬다', () => {
    renderGate();
    expect(screen.getByText('부모님 비밀번호를 정해주세요')).toBeInTheDocument();
    expect(screen.queryByText('설정 내용')).not.toBeInTheDocument();
  });

  it('네 자리를 네 칸으로 보여준다', () => {
    // 한 칸에 몰아 넣었더니 마지막 점이 칸 밖으로 밀려 셋만 보였다.
    renderGate();
    expect(screen.getAllByTestId('pin-first-cell')).toHaveLength(4);
  });

  it('친 만큼 점이 찍힌다', () => {
    renderGate();
    fireEvent.change(screen.getByTestId('pin-first'), { target: { value: '246' } });
    const cells = screen.getAllByTestId('pin-first-cell');
    expect(cells.filter((c) => c.getAttribute('data-filled') === 'yes')).toHaveLength(3);

    fireEvent.change(screen.getByTestId('pin-first'), { target: { value: '2468' } });
    expect(
      screen.getAllByTestId('pin-first-cell').filter((c) => c.getAttribute('data-filled')),
    ).toHaveLength(4);
  });

  it('숫자만 받고 네 자리를 넘기지 않는다', () => {
    renderGate();
    fireEvent.change(screen.getByTestId('pin-first'), { target: { value: '12a3456' } });
    expect(
      screen.getAllByTestId('pin-first-cell').filter((c) => c.getAttribute('data-filled')),
    ).toHaveLength(4);
  });

  it('두 번 적은 것이 다르면 알려준다', () => {
    renderGate();
    fireEvent.change(screen.getByTestId('pin-first'), { target: { value: '2468' } });
    fireEvent.change(screen.getByTestId('pin-again'), { target: { value: '1357' } });
    fireEvent.click(screen.getByRole('button', { name: '정하기' }));
    expect(screen.getByTestId('pin-error')).toHaveTextContent('서로 달라요');
    expect(screen.queryByText('설정 내용')).not.toBeInTheDocument();
  });

  it('두 번 같게 적으면 설정이 열린다', () => {
    renderGate();
    fireEvent.change(screen.getByTestId('pin-first'), { target: { value: '2468' } });
    fireEvent.change(screen.getByTestId('pin-again'), { target: { value: '2468' } });
    fireEvent.click(screen.getByRole('button', { name: '정하기' }));
    expect(screen.getByText('설정 내용')).toBeInTheDocument();
  });

  it('비밀번호가 있으면 묻는 화면이 뜨고, 맞아야 열린다', () => {
    window.localStorage.setItem('dailyglow.parentPin', '2468');
    renderGate();
    expect(screen.getByText('부모님만 들어갈 수 있어요')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('pin-input'), { target: { value: '1357' } });
    fireEvent.click(screen.getByRole('button', { name: '들어가기' }));
    expect(screen.getByTestId('pin-error')).toHaveTextContent('달라요');

    fireEvent.change(screen.getByTestId('pin-input'), { target: { value: '2468' } });
    fireEvent.click(screen.getByRole('button', { name: '들어가기' }));
    expect(screen.getByText('설정 내용')).toBeInTheDocument();
  });

  it('설정을 나갔다 들어오면 다시 묻는다', () => {
    // 한 번 풀면 창을 닫을 때까지 묻지 않게 했더니, 태블릿은 앱을 며칠씩 닫지
    // 않아 아이가 그냥 들어갈 수 있었다.
    const first = renderGate();
    fireEvent.change(screen.getByTestId('pin-first'), { target: { value: '2468' } });
    fireEvent.change(screen.getByTestId('pin-again'), { target: { value: '2468' } });
    fireEvent.click(screen.getByText('정하기'));
    expect(screen.getByText('설정 내용')).toBeInTheDocument();

    first.unmount();
    renderGate();
    expect(screen.getByText('부모님만 들어갈 수 있어요')).toBeInTheDocument();
    expect(screen.queryByText('설정 내용')).not.toBeInTheDocument();
  });
});

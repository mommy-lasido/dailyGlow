import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorksheetActivity } from './WorksheetActivity';
import { WRITES_PER_ROW } from './generate';
import type { ActivityLesson, ActivityResult } from '@/activities/types';

vi.mock('@/lib/confetti', () => ({ spawnConfetti: () => {} }));
const speak = vi.hoisted(() => vi.fn());
vi.mock('@/lib/speak', () => ({ speak, canSpeak: () => true }));

function lesson(childLevel: number): ActivityLesson {
  return {
    id: 'l-sheet',
    title: '쓰기 연습지',
    activity_kind: 'worksheet',
    config: {},
    childLevel,
  };
}

function renderActivity(level = 5, onFinish: (r: ActivityResult) => void = () => {}) {
  return render(
    <MemoryRouter>
      <WorksheetActivity lesson={lesson(level)} onFinish={onFinish} />
    </MemoryRouter>,
  );
}

function choose(kind: string) {
  fireEvent.click(screen.getAllByTestId('kind').find((b) => b.getAttribute('data-kind') === kind)!);
}

beforeEach(() => speak.mockClear());

describe('WorksheetActivity — 고르기', () => {
  it('무엇을 쓸지 먼저 고르게 한다', () => {
    renderActivity(5);
    expect(screen.getByText('쓰기 연습지')).toBeInTheDocument();
    expect(screen.getAllByTestId('kind').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
  });

  it('아이 단계에 없는 갈래는 보여주지 않는다', () => {
    renderActivity(1);
    const kinds = screen.getAllByTestId('kind').map((b) => b.getAttribute('data-kind'));
    expect(kinds).toEqual(['consonant', 'vowel']);
  });

  it('인쇄해서 쓰는 것이라고 알려준다', () => {
    renderActivity(5);
    expect(screen.getByText(/인쇄해서 연필로 써요/)).toBeInTheDocument();
  });
});

describe('WorksheetActivity — 연습지', () => {
  it('화면에 쓰는 칸이 없다', () => {
    // 여섯 살은 손에 힘을 키워야 할 나이라 태블릿이 아니라 종이에 쓴다.
    renderActivity(5);
    choose('vowel');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('sheet')).toBeInTheDocument();
  });

  it('한 줄에 다섯 번 쓸 자리가 있다', () => {
    renderActivity(5);
    choose('vowel');
    const firstRow = screen.getAllByTestId('sheet-row')[0]!;
    // 모음은 한 글자라 칸 하나 × 다섯 번.
    expect(firstRow.querySelectorAll('[data-testid="box"]')).toHaveLength(WRITES_PER_ROW);
  });

  it('낱말은 글자 수만큼 칸이 붙는다', () => {
    renderActivity(20);
    choose('word');
    const row = screen.getAllByTestId('sheet-row')[0]!;
    const boxes = row.querySelectorAll('[data-testid="box"]').length;
    expect(boxes % WRITES_PER_ROW).toBe(0);
    expect(boxes / WRITES_PER_ROW).toBeGreaterThanOrEqual(1);
  });

  it('14단계까지는 두 칸을 따라 쓰고 나머지 셋은 스스로 쓴다', () => {
    // 글자 모양을 익히는 중에는 한 번 덧그려서는 손에 남지 않는다.
    renderActivity(5);
    choose('vowel');
    const row = screen.getAllByTestId('sheet-row')[0]!;
    const boxes = [...row.querySelectorAll('[data-testid="box"]')];
    expect(boxes.filter((b) => b.getAttribute('data-trace') === 'yes')).toHaveLength(2);
    const marks = [...row.querySelectorAll('[data-testid="box"] > span')];
    expect(marks[0]!.className).toContain('text-trace');
    expect(marks[1]!.className).toContain('text-trace');
    for (const b of marks.slice(2)) expect(b.className).toContain('text-transparent');
  });

  it('자음·모음을 다 뗀 뒤에는 한 칸만 본보기로 둔다', () => {
    renderActivity(20);
    choose('vowel');
    const row = screen.getAllByTestId('sheet-row')[0]!;
    const boxes = [...row.querySelectorAll('[data-testid="box"]')];
    expect(boxes.filter((b) => b.getAttribute('data-trace') === 'yes')).toHaveLength(1);
  });

  it('한 글자짜리는 다섯 칸이 늘 한 줄에 들어간다', () => {
    // 화면이 좁을 때 넷+하나로 갈라지면 "네 칸" 처럼 보인다.
    renderActivity(5);
    choose('consonant');
    const row = screen.getAllByTestId('sheet-row')[0]!;
    expect(row.querySelector('.grid')?.className).toContain('grid-cols-5');
  });

  it('문장은 칸이 아니라 줄에 쓴다', () => {
    // 칸에 가두면 띄어쓰기가 사라지고, 학교에서 쓰는 줄공책과 모양이 달라진다.
    renderActivity(35);
    choose('sentence');
    const row = screen.getAllByTestId('sheet-row')[0]!;
    expect(row.querySelectorAll('[data-testid="box"]')).toHaveLength(0);
    expect(row.querySelectorAll('[data-testid="sample-line"]')).toHaveLength(1);
  });

  it('문장 아래에 따라 쓸 빈 줄 셋이 있다', () => {
    renderActivity(35);
    choose('sentence');
    const row = screen.getAllByTestId('sheet-row')[0]!;
    expect(row.querySelectorAll('[data-testid="blank-line"]')).toHaveLength(3);
  });

  it('띄어쓰는 자리에 ∨ 를 찍어준다', () => {
    // 여섯 살에게 띄어쓰기는 규칙이 아니라 눈에 보이는 표시로 먼저 익히는 것이다.
    renderActivity(35);
    choose('sentence');
    const row = screen.getAllByTestId('sheet-row')[0]!;
    const marks = row.querySelectorAll('[data-testid="space-mark"]');
    // 본보기 문장의 띄어쓰기 수만큼.
    const spaces = row.querySelector('[data-testid="sample-line"]')!.textContent!.match(/∨/g);
    expect(marks.length).toBeGreaterThan(0);
    expect(spaces).toHaveLength(marks.length);
  });

  it('1단계 아이는 ㄱ ㄴ ㄷ ㄹ 을 쓴다', () => {
    renderActivity(1);
    choose('consonant');
    const shown = screen.getAllByTestId('sheet-row').map((r) => r.textContent);
    expect(shown.join('')).toMatch(/[ㄱㄴㄷㄹ]/);
  });

  it('인쇄 단추가 있다', () => {
    renderActivity(5);
    choose('vowel');
    expect(screen.getByRole('button', { name: /인쇄하기/ })).toBeInTheDocument();
  });

  it('다른 글자로 바꿔 볼 수 있다', () => {
    renderActivity(20);
    choose('word');
    const before = screen.getAllByTestId('sheet-row').map((r) => r.textContent).join('');
    let changed = false;
    for (let i = 0; i < 20 && !changed; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /다른 글자로/ }));
      changed = screen.getAllByTestId('sheet-row').map((r) => r.textContent).join('') !== before;
    }
    expect(changed).toBe(true);
  });

  it('눌러서 읽어볼 수 있다', () => {
    renderActivity(5);
    choose('vowel');
    fireEvent.click(screen.getAllByRole('button', { name: /읽어주기/ })[0]!);
    expect(speak).toHaveBeenCalled();
  });

  it('다 쓰면 기록을 남기되 점수로 재지 않는다', () => {
    // 종이에 쓴 글씨는 앱이 채점하지 않는다. 이것을 점수로 세면 쓰기만 해도
    // 한글 단계가 올라가 버린다.
    const onFinish = vi.fn();
    renderActivity(5, onFinish);
    choose('vowel');
    fireEvent.click(screen.getByRole('button', { name: '다 썼어요' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    const r = onFinish.mock.calls[0]![0] as ActivityResult;
    expect(r.mode).toBe('paper');
    expect(r.meta?.scored).toBe(false);
    expect(screen.getByTestId('saved')).toBeInTheDocument();
  });
});

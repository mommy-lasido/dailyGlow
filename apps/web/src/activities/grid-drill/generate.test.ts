import { describe, expect, it } from 'vitest';
import {
  answerAt,
  answerOf,
  cellAt,
  DRILL_CELLS,
  DRILL_OPS,
  DRILL_SIZE,
  formatDuration,
  makeTable,
  needsConfirm,
  opSign,
  possibleAnswers,
  type DrillOp,
} from './generate';

const OPS: DrillOp[] = ['add', 'sub', 'mul'];

describe('makeTable', () => {
  it.each(OPS)('%s — 가로·세로 머리줄이 열 개씩이고 겹치지 않는다', (op) => {
    const t = makeTable(op);
    expect(t.cols).toHaveLength(DRILL_SIZE);
    expect(t.rows).toHaveLength(DRILL_SIZE);
    expect(new Set(t.cols).size).toBe(DRILL_SIZE);
    expect(new Set(t.rows).size).toBe(DRILL_SIZE);
  });

  it('더하기와 곱하기는 0~9 를 쓴다', () => {
    for (const op of ['add', 'mul'] as DrillOp[]) {
      const t = makeTable(op);
      expect([...t.rows].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect([...t.cols].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }
  });

  it('빼기는 세로 머리줄이 10~19 라 답이 음수로 내려가지 않는다', () => {
    const t = makeTable('sub');
    expect([...t.rows].sort((a, b) => a - b)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    for (let i = 0; i < DRILL_CELLS; i += 1) {
      expect(answerAt(t, i)).toBeGreaterThan(0);
    }
  });

  it('순서가 섞여 나온다', () => {
    // 늘 같은 순서면 답을 외워 버려서 셈을 하지 않는다.
    const seen = new Set<string>();
    for (let i = 0; i < 50; i += 1) seen.add(makeTable('add').cols.join(','));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('answerOf', () => {
  it('셈을 바르게 한다', () => {
    expect(answerOf('add', 7, 5)).toBe(12);
    expect(answerOf('sub', 13, 5)).toBe(8);
    expect(answerOf('mul', 7, 6)).toBe(42);
  });
});

describe('cellAt / answerAt', () => {
  it('왼쪽 위에서 오른쪽 아래로 백 칸을 훑는다', () => {
    const t = makeTable('add');
    expect(cellAt(t, 0)).toEqual({ row: t.rows[0], col: t.cols[0] });
    expect(cellAt(t, 9)).toEqual({ row: t.rows[0], col: t.cols[9] });
    expect(cellAt(t, 10)).toEqual({ row: t.rows[1], col: t.cols[0] });
    expect(cellAt(t, 99)).toEqual({ row: t.rows[9], col: t.cols[9] });
  });

  it('백 칸이 모두 서로 다른 셈이다', () => {
    const t = makeTable('add');
    const pairs = new Set<string>();
    for (let i = 0; i < DRILL_CELLS; i += 1) {
      const { row, col } = cellAt(t, i);
      pairs.add(`${row}+${col}`);
      expect(answerAt(t, i)).toBe(row + col);
    }
    expect(pairs.size).toBe(DRILL_CELLS);
  });
});

describe('possibleAnswers', () => {
  it('더하기는 0~18', () => {
    expect(possibleAnswers('add')).toEqual([...Array(19).keys()]);
  });

  it('빼기는 1~19', () => {
    expect(possibleAnswers('sub')[0]).toBe(1);
    expect(possibleAnswers('sub').at(-1)).toBe(19);
  });

  it('곱하기는 0 부터 81 까지', () => {
    const a = possibleAnswers('mul');
    expect(a[0]).toBe(0);
    expect(a.at(-1)).toBe(81);
  });
});

describe('needsConfirm', () => {
  it('더 눌러야 할 수도 있으면 확인을 기다린다', () => {
    // 더하기에서 1 은 1 일 수도 12 일 수도 있다.
    expect(needsConfirm('add', '1')).toBe(true);
  });

  it('더 이어질 수 없으면 바로 넘어간다', () => {
    // 빠르기를 재는 활동이라 확인 단추를 누르는 손짓 하나가 아깝다.
    for (const d of ['2', '3', '4', '5', '6', '7', '8', '9', '0']) {
      expect(needsConfirm('add', d)).toBe(false);
    }
    expect(needsConfirm('add', '12')).toBe(false);
  });

  it('빈칸은 확인할 것이 없다', () => {
    expect(needsConfirm('add', '')).toBe(true);
  });

  it('곱하기는 한 자리 숫자 대부분이 이어질 수 있다', () => {
    // 8 은 8 일 수도 80·81 일 수도 있다.
    expect(needsConfirm('mul', '8')).toBe(true);
    expect(needsConfirm('mul', '81')).toBe(false);
    // 9 로 시작하는 답은 없다.
    expect(needsConfirm('mul', '9')).toBe(false);
  });
});

describe('opSign / DRILL_OPS', () => {
  it('세 가지 셈을 고를 수 있다', () => {
    expect(DRILL_OPS.map((o) => o.op)).toEqual(['add', 'sub', 'mul']);
    expect(opSign('add')).toBe('＋');
    expect(opSign('mul')).toBe('×');
  });
});

describe('formatDuration', () => {
  it('1분이 안 되면 초만 말한다', () => {
    expect(formatDuration(45)).toBe('45초');
  });

  it('1분이 넘으면 분과 초를 함께 말한다', () => {
    expect(formatDuration(83)).toBe('1분 23초');
    expect(formatDuration(120)).toBe('2분 0초');
  });
});

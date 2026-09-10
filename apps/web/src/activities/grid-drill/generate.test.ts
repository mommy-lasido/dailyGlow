import { describe, expect, it } from 'vitest';
import {
  answerAt,
  cellAnswer,
  cellAt,
  DRILL_OPS,
  DRILL_SIZES,
  formatTime,
  isCellCorrect,
  isCellFilled,
  levelsOf,
  makePuzzle,
  pickHeaders,
  sideOf,
  targetSeconds,
  type DrillOp,
} from './generate';

const OPS: DrillOp[] = ['+', '-', '×', '÷'];

describe('설정', () => {
  it('예전 앱과 같은 네 가지 셈을 낸다', () => {
    expect(DRILL_OPS.map((o) => o.op)).toEqual(['+', '-', '×', '÷']);
  });

  it('예전 앱과 같은 세 가지 칸 수를 낸다', () => {
    expect(DRILL_SIZES.map((s) => s.cells)).toEqual([25, 64, 100]);
    expect(sideOf(25)).toBe(5);
    expect(sideOf(64)).toBe(8);
    expect(sideOf(100)).toBe(10);
  });

  it('셈마다 단계가 있다', () => {
    for (const op of OPS) expect(levelsOf(op).length).toBeGreaterThan(0);
    expect(levelsOf('+')).toHaveLength(4);
    expect(levelsOf('×')).toHaveLength(2);
  });
});

describe('pickHeaders', () => {
  it('바라는 개수만큼 뽑는다', () => {
    expect(pickHeaders(0, 9, 5)).toHaveLength(5);
    expect(pickHeaders(0, 9, 10)).toHaveLength(10);
    expect(pickHeaders(20, 49, 8)).toHaveLength(8);
  });

  it('범위 안의 수만 쓴다', () => {
    for (const n of pickHeaders(10, 19, 8)) {
      expect(n).toBeGreaterThanOrEqual(10);
      expect(n).toBeLessThanOrEqual(19);
    }
  });

  it('범위가 넉넉하면 겹치지 않는다', () => {
    expect(new Set(pickHeaders(0, 9, 10)).size).toBe(10);
  });

  it('범위가 칸 수보다 좁으면 다시 쓴다', () => {
    // 1~9 는 아홉 개뿐인데 열 칸을 채워야 한다.
    expect(pickHeaders(1, 9, 10)).toHaveLength(10);
  });

  it('순서가 섞여 나온다', () => {
    // 늘 같은 순서면 답을 외워 버려 셈을 하지 않는다.
    const seen = new Set<string>();
    for (let i = 0; i < 50; i += 1) seen.add(pickHeaders(0, 9, 10).join(','));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('cellAnswer', () => {
  it('네 가지 셈을 바르게 한다', () => {
    expect(cellAnswer('+', 7, 5).value).toBe(12);
    expect(cellAnswer('-', 13, 5).value).toBe(8);
    expect(cellAnswer('×', 7, 6).value).toBe(42);
  });

  it('나눗셈은 몫과 나머지를 함께 낸다', () => {
    const a = cellAnswer('÷', 17, 5);
    expect(a.quotient).toBe(3);
    expect(a.remainder).toBe(2);
  });

  it('나머지가 없으면 0 이다', () => {
    expect(cellAnswer('÷', 20, 5).remainder).toBe(0);
  });
});

describe('makePuzzle', () => {
  it.each(OPS)('%s — 칸 수에 맞는 표를 만든다', (op) => {
    for (const cells of [25, 64, 100] as const) {
      const p = makePuzzle(op, cells, 1);
      expect(p.rowHeaders).toHaveLength(sideOf(cells));
      expect(p.colHeaders).toHaveLength(sideOf(cells));
      expect(p.cells).toBe(cells);
    }
  });

  it('뺄셈은 답이 음수로 내려가지 않는다', () => {
    for (const level of levelsOf('-')) {
      const p = makePuzzle('-', 100, level.id);
      for (let i = 0; i < p.cells; i += 1) {
        expect(answerAt(p, i).value).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('나눗셈은 0 으로 나누지 않는다', () => {
    for (const level of levelsOf('÷')) {
      const p = makePuzzle('÷', 100, level.id);
      for (const c of p.colHeaders) expect(c).toBeGreaterThan(0);
    }
  });

  it('없는 단계를 부르면 첫 단계로 만든다', () => {
    const p = makePuzzle('+', 25, 99);
    for (const r of p.rowHeaders) expect(r).toBeLessThanOrEqual(9);
  });
});

describe('cellAt', () => {
  it('왼쪽 위에서 오른쪽 아래로 훑는다', () => {
    const p = makePuzzle('+', 25, 1);
    expect(cellAt(p, 0)).toEqual({ row: p.rowHeaders[0], col: p.colHeaders[0] });
    expect(cellAt(p, 4)).toEqual({ row: p.rowHeaders[0], col: p.colHeaders[4] });
    expect(cellAt(p, 5)).toEqual({ row: p.rowHeaders[1], col: p.colHeaders[0] });
    expect(cellAt(p, 24)).toEqual({ row: p.rowHeaders[4], col: p.colHeaders[4] });
  });
});

describe('isCellCorrect / isCellFilled', () => {
  it('적은 값이 답과 같아야 맞다', () => {
    const p = makePuzzle('+', 25, 1);
    const a = answerAt(p, 0);
    expect(isCellCorrect(p, 0, { value: String(a.value) })).toBe(true);
    expect(isCellCorrect(p, 0, { value: String(a.value + 1) })).toBe(false);
  });

  it('빈칸은 틀린 것으로 본다', () => {
    const p = makePuzzle('+', 25, 1);
    expect(isCellCorrect(p, 0, { value: '' })).toBe(false);
  });

  it('나눗셈은 몫과 나머지가 둘 다 맞아야 한다', () => {
    const p = makePuzzle('÷', 25, 1);
    const a = answerAt(p, 0);
    expect(
      isCellCorrect(p, 0, { value: String(a.quotient), remainder: String(a.remainder) }),
    ).toBe(true);
    expect(isCellCorrect(p, 0, { value: String(a.quotient), remainder: '9' })).toBe(false);
  });

  it('나눗셈은 두 칸을 다 채워야 채운 것이다', () => {
    expect(isCellFilled('÷', { value: '3' })).toBe(false);
    expect(isCellFilled('÷', { value: '3', remainder: '0' })).toBe(true);
    expect(isCellFilled('+', { value: '3' })).toBe(true);
    expect(isCellFilled('+', undefined)).toBe(false);
  });
});

describe('targetSeconds', () => {
  it('가게야마 기준을 그대로 쓴다 — 덧셈·뺄셈·곱셈 2분, 나눗셈 5분', () => {
    // 가게야마 히데오 본인 인터뷰에서 확인된 숫자다.
    expect(targetSeconds('+', 1, 100)).toBe(120);
    expect(targetSeconds('-', 1, 100)).toBe(120);
    expect(targetSeconds('×', 1, 100)).toBe(120);
    expect(targetSeconds('÷', 1, 100)).toBe(300);
  });

  it('칸이 적으면 목표도 그만큼 짧다', () => {
    expect(targetSeconds('+', 1, 25)).toBe(30);
    expect(targetSeconds('+', 1, 64)).toBe(77);
  });

  it('단계가 높을수록 목표가 길어진다', () => {
    const t = [1, 2, 3, 4].map((lv) => targetSeconds('+', lv, 100));
    for (let i = 1; i < t.length; i += 1) expect(t[i]!).toBeGreaterThan(t[i - 1]!);
  });

  it('나눗셈이 가장 넉넉하다 — 몫과 나머지를 둘 다 적어야 한다', () => {
    expect(targetSeconds('÷', 1, 100)).toBeGreaterThan(targetSeconds('+', 1, 100));
    expect(targetSeconds('÷', 1, 100)).toBeGreaterThan(targetSeconds('×', 1, 100));
  });

  it('단계가 높을수록 어느 셈이든 목표가 길어진다', () => {
    for (const op of OPS) {
      const t = levelsOf(op).map((l) => targetSeconds(op, l.id, 100));
      for (let i = 1; i < t.length; i += 1) expect(t[i]!).toBeGreaterThan(t[i - 1]!);
    }
  });

  it('없는 단계를 물으면 첫 단계 기준으로 답한다', () => {
    expect(targetSeconds('+', 99, 100)).toBe(targetSeconds('+', 1, 100));
  });
});

describe('formatTime', () => {
  it('예전 앱과 같은 0:00 모양으로 적는다', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(45)).toBe('0:45');
    expect(formatTime(83)).toBe('1:23');
    expect(formatTime(600)).toBe('10:00');
  });
});

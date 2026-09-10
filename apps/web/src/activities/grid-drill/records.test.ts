import { describe, expect, it } from 'vitest';
import { compareToHistory, matching, summarize, type DrillRecord } from './records';

function rec(durationSec: number, over: Partial<DrillRecord> = {}): DrillRecord {
  return { durationSec, op: '+', cells: 100, levelId: 1, ...over };
}

describe('matching', () => {
  it('셈·단계·칸 수가 모두 같은 기록만 고른다', () => {
    // 덧셈 25칸과 나눗셈 100칸을 같은 줄에 놓고 견줄 수는 없다.
    const all = [
      rec(200),
      rec(150, { op: '×' }),
      rec(150, { cells: 25 }),
      rec(150, { levelId: 2 }),
      rec(180),
    ];
    expect(matching(all, '+', 1, 100).map((r) => r.durationSec)).toEqual([200, 180]);
  });

  it('맞는 기록이 없으면 빈 목록', () => {
    expect(matching([rec(200)], '÷', 1, 100)).toEqual([]);
  });
});

describe('summarize', () => {
  it('기록이 없으면 아무것도 없다고 한다', () => {
    expect(summarize([])).toEqual({ count: 0, firstSec: null, bestSec: null });
  });

  it('맨 처음 잰 시간과 가장 빨랐던 시간을 낸다', () => {
    const h = summarize([rec(240), rec(180), rec(200)]);
    expect(h.count).toBe(3);
    expect(h.firstSec).toBe(240);
    expect(h.bestSec).toBe(180);
  });

  it('가장 빠른 것은 순서와 상관없이 찾는다', () => {
    expect(summarize([rec(100), rec(300)]).bestSec).toBe(100);
  });
});

describe('compareToHistory', () => {
  it('처음이면 처음이라고 한다', () => {
    expect(compareToHistory(200, summarize([]))).toEqual({ kind: 'first', deltaSec: 0 });
  });

  it('가장 빠른 기록을 줄이면 얼마나 줄였는지 알려준다', () => {
    const h = summarize([rec(240), rec(200)]);
    expect(compareToHistory(180, h)).toEqual({ kind: 'best', deltaSec: 20 });
  });

  it('못 미치면 가장 빠른 기록이 얼마인지만 알려준다', () => {
    // 나무라지 않는다 — 다음에 줄이면 되는 일이다.
    const h = summarize([rec(200)]);
    expect(compareToHistory(230, h)).toEqual({ kind: 'slower', deltaSec: 30 });
  });

  it('기록과 똑같으면 줄인 것으로 보지 않는다', () => {
    const h = summarize([rec(200)]);
    expect(compareToHistory(200, h).kind).toBe('slower');
  });
});

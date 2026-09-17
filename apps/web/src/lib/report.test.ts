import { describe, expect, it } from 'vitest';
import { buildReport, reportAsText, type SessionRow } from './report';

function row(over: Partial<SessionRow> = {}): SessionRow {
  return {
    activity_kind: 'choice_quiz',
    duration_sec: 60,
    total_count: 10,
    correct_count: 7,
    meta: { roundScores: [7, 3] },
    created_at: '2026-09-14T12:00:00Z',
    lesson_title: '맞춤법 탐험대',
    ...over,
  };
}

const from = new Date(2026, 8, 14);
const to = new Date(2026, 8, 20);

describe('buildReport', () => {
  it('활동별로 묶고 첫 시도 정답률을 센다', () => {
    const r = buildReport([row(), row({ correct_count: 5 })], from, to);
    const a = r.activities[0]!;
    expect(a.title).toBe('맞춤법 탐험대');
    expect(a.rounds).toBe(2);
    expect(a.rate).toBe(60); // (7+5) / 20
  });

  it('약한 것을 위에 올린다', () => {
    // 눈이 먼저 가야 할 자리다.
    const r = buildReport(
      [row({ lesson_title: '속담 배우기', correct_count: 10 }), row({ correct_count: 4 })],
      from,
      to,
    );
    expect(r.activities[0]!.title).toBe('맞춤법 탐험대');
  });

  it('1차에 틀린 것을 모아 많이 틀린 차례로 준다', () => {
    const r = buildReport(
      [
        row({ meta: { roundScores: [8, 2], wrong: ['넓다', '앉다'] } }),
        row({ meta: { roundScores: [8, 2], wrong: ['넓다'] } }),
      ],
      from,
      to,
    );
    expect(r.wrongTop[0]).toEqual({ label: '넓다', count: 2 });
  });

  it('끝내 다 맞힌 판인지 가려낸다', () => {
    // 첫 시도는 낮아도 다시 풀어 다 맞혔으면 "모르는 것" 이 아니다.
    const yes = buildReport([row({ meta: { roundScores: [7, 3] } })], from, to);
    expect(yes.activities[0]!.alwaysRecovered).toBe(true);

    const no = buildReport([row({ meta: { roundScores: [7, 2] } })], from, to);
    expect(no.activities[0]!.alwaysRecovered).toBe(false);
  });

  it('공부한 날 수와 판 수를 센다', () => {
    const r = buildReport(
      [row(), row({ created_at: '2026-09-16T12:00:00Z' })],
      from,
      to,
    );
    expect(r.days).toBe(2);
    expect(r.rounds).toBe(2);
  });
});

describe('reportAsText', () => {
  it('붙여넣을 수 있는 글로 바꾼다', () => {
    const text = reportAsText('라윤', buildReport([row({ meta: { wrong: ['넓다'] } })], from, to));
    expect(text).toContain('라윤');
    expect(text).toContain('맞춤법 탐험대');
    expect(text).toContain('넓다');
    // 못 하는 것을 숨기지 않는다.
    expect(text).toContain('중간에 그만둔 것은 남지 않습니다');
  });
});

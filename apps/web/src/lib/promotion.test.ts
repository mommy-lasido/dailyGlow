import { describe, expect, it } from 'vitest';
import {
  buildSuggestion,
  countsForPromotion,
  judgeLevel,
  type SessionSummary,
} from './promotion';
import type { LessonGateRow } from './activities';
import type { SubjectLevel } from '@/stores/profile';

function session(
  correct: number,
  total = 5,
  extra: Partial<SessionSummary> = {},
): SessionSummary {
  return {
    lessonId: 'count',
    totalCount: total,
    correctCount: correct,
    meta: { range: 10 },
    ...extra,
  };
}

describe('judgeLevel', () => {
  it('세 판이 모이기 전에는 판단하지 않는다', () => {
    // 한두 번 잘한 것은 찍었을 수 있다.
    expect(judgeLevel([session(5), session(5)])).toBe('stay');
    expect(judgeLevel([])).toBe('stay');
  });

  it('세 판 연속 80% 이상이면 올릴 때가 됐다고 본다', () => {
    expect(judgeLevel([session(5), session(4), session(5)])).toBe('promote');
  });

  it('한 판이라도 처지면 올리자고 하지 않는다', () => {
    expect(judgeLevel([session(5), session(3), session(5)])).toBe('stay');
  });

  it('네 판째부터는 최근 세 판만 본다', () => {
    // 예전에 못했더라도 지금 잘하고 있으면 올린다.
    expect(judgeLevel([session(5), session(5), session(4), session(0)])).toBe('promote');
    // 반대로 예전에 잘했어도 최근 세 판이 처지면 못 올린다.
    expect(judgeLevel([session(5), session(5), session(2), session(5)])).toBe('stay');
  });

  it('세 판 연속 절반에 못 미치면 버거워한다고 본다', () => {
    expect(judgeLevel([session(2), session(1), session(2)])).toBe('demote');
  });

  it('정확히 절반이면 내리자고 하지 않는다', () => {
    expect(judgeLevel([session(5, 10), session(5, 10), session(5, 10)])).toBe('stay');
  });

  it('문제가 0개인 기록은 0점으로 본다 — 나누기에서 터지지 않는다', () => {
    expect(judgeLevel([session(0, 0), session(0, 0), session(0, 0)])).toBe('demote');
  });
});

describe('점수로 재지 않는 활동', () => {
  it('쓰기 연습지처럼 채점하지 않는 기록은 단계 판단에서 뺀다', () => {
    // 종이에 쓴 글씨는 앱이 채점하지 않아 늘 만점처럼 보인다. 이것을 넣으면
    // 쓰기만 몇 번 해도 한글 단계가 올라가 버린다.
    const unscored = [
      session(5, 5, { meta: { scored: false } }),
      session(5, 5, { meta: { scored: false } }),
      session(5, 5, { meta: { scored: false } }),
    ];
    expect(buildSuggestion(MATH, LEVEL1, unscored, 'preschool')).toBeNull();
  });

  it('점수로 재는 기록은 그대로 센다', () => {
    const scored = [session(5), session(5), session(5)];
    expect(buildSuggestion(MATH, LEVEL1, scored, 'preschool')?.kind).toBe('promote');
  });
});

describe('countsForPromotion', () => {
  it('수 세기는 가장 어려운 단계에서 한 것만 센다', () => {
    // 셋까지 세기만 반복하면서 덧셈으로 넘어가면 안 된다.
    expect(countsForPromotion(session(5, 5, { meta: { range: 3 } }))).toBe(false);
    expect(countsForPromotion(session(5, 5, { meta: { range: 5 } }))).toBe(false);
    expect(countsForPromotion(session(5, 5, { meta: { range: 10 } }))).toBe(true);
  });

  it('단계 구분이 없는 활동은 전부 센다', () => {
    expect(countsForPromotion(session(5, 5, { meta: {} }))).toBe(true);
  });
});

// ── buildSuggestion ──────────────────────────────────────

function lesson(over: Partial<LessonGateRow>): LessonGateRow {
  return {
    id: 'count',
    title: '수 세기 놀이',
    activity_kind: 'choice_quiz',
    subject_id: 'math',
    subject_slug: 'math',
    subject_title: '수학',
    subject_level: 1,
    min_grade: 0,
    max_grade: 1,
    sort_order: 1,
    subject_sort_order: 4,
    config: {},
    ...over,
  } as LessonGateRow;
}

const MATH: LessonGateRow[] = [
  lesson({}),
  lesson({ id: 'add', title: '더하기 놀이', subject_level: 2, sort_order: 2 }),
];

const LEVEL1: Record<string, SubjectLevel> = { math: { level: 1, locked: false } };

describe('buildSuggestion', () => {
  it('세 판 연속 잘하면 다음 단계를 올리자고 한다', () => {
    const s = buildSuggestion(MATH, LEVEL1, [session(5), session(5), session(4)], 'preschool');
    expect(s).toEqual({
      kind: 'promote',
      subjectId: 'math',
      subjectTitle: '수학',
      lessonTitle: '수 세기 놀이',
      toLevel: 2,
      unlocksTitle: '더하기 놀이',
    });
  });

  it('쉬운 단계만 반복하면 올리자고 하지 않는다', () => {
    const easy = [
      session(5, 5, { meta: { range: 3 } }),
      session(5, 5, { meta: { range: 3 } }),
      session(5, 5, { meta: { range: 3 } }),
    ];
    expect(buildSuggestion(MATH, LEVEL1, easy, 'preschool')).toBeNull();
  });

  it('해 본 적이 없으면 아무 말도 하지 않는다', () => {
    expect(buildSuggestion(MATH, LEVEL1, [], 'preschool')).toBeNull();
  });

  it('올라갈 단계가 더 없으면 올리자고 하지 않는다', () => {
    const only = [lesson({})];
    expect(
      buildSuggestion(only, LEVEL1, [session(5), session(5), session(5)], 'preschool'),
    ).toBeNull();
  });

  it('부모가 단계를 고정해 둔 과목은 건드리지 않는다', () => {
    const locked: Record<string, SubjectLevel> = { math: { level: 1, locked: true } };
    expect(
      buildSuggestion(MATH, locked, [session(5), session(5), session(5)], 'preschool'),
    ).toBeNull();
  });

  it('학년이 맞지 않는 활동은 올릴 대상으로 세지 않는다', () => {
    // 초3 에게는 미취학용 더하기 놀이가 열릴 자리가 아니다.
    expect(
      buildSuggestion(MATH, LEVEL1, [session(5), session(5), session(5)], 'g3'),
    ).toBeNull();
  });

  it('버거워하면 한 단계 내리자고 한다', () => {
    const level2: Record<string, SubjectLevel> = { math: { level: 2, locked: false } };
    const poor = [
      session(1, 5, { lessonId: 'add', meta: {} }),
      session(0, 5, { lessonId: 'add', meta: {} }),
      session(2, 5, { lessonId: 'add', meta: {} }),
    ];
    const s = buildSuggestion(MATH, level2, poor, 'preschool');
    expect(s?.kind).toBe('demote');
    expect(s?.toLevel).toBe(1);
    expect(s?.lessonTitle).toBe('더하기 놀이');
  });

  it('1단계에서는 내려갈 곳이 없으므로 말을 꺼내지 않는다', () => {
    const poor = [session(0), session(1), session(0)];
    expect(buildSuggestion(MATH, LEVEL1, poor, 'preschool')).toBeNull();
  });

  it('조건을 채운 과목이 여럿이어도 하나만 제안한다', () => {
    // 카드를 여러 장 띄우면 무엇부터 볼지 알 수 없어 대충 눌러 넘기게 된다.
    const hangul: LessonGateRow[] = [
      lesson({
        id: 'letters',
        title: '자음모음 배우기',
        subject_id: 'hangul',
        subject_title: '한글',
        subject_sort_order: 1,
      }),
      lesson({
        id: 'words',
        title: '낱말 읽기',
        subject_id: 'hangul',
        subject_title: '한글',
        subject_level: 4,
        subject_sort_order: 1,
      }),
    ];
    const levels: Record<string, SubjectLevel> = {
      math: { level: 1, locked: false },
      hangul: { level: 1, locked: false },
    };
    const sessions = [
      session(5, 5, { lessonId: 'letters', meta: {} }),
      session(5, 5, { lessonId: 'letters', meta: {} }),
      session(5, 5, { lessonId: 'letters', meta: {} }),
      session(5),
      session(5),
      session(5),
    ];
    const s = buildSuggestion([...hangul, ...MATH], levels, sessions, 'preschool');
    // 한글의 과목 순서가 앞서므로 한글이 먼저 나온다.
    expect(s?.subjectTitle).toBe('한글');
  });

  // ── 한글: 단계가 곧 배우는 글자 ─────────────────────────

  /** 22단계(ㅐ)에 있는 시윤이. 한글 활동은 14단계에서 다 열려 더 열릴 것이 없다. */
  const HANGUL: LessonGateRow[] = [
    lesson({
      id: 'words',
      title: '낱말 읽기',
      subject_id: 'hangul',
      subject_slug: 'hangul',
      subject_title: '한글',
      subject_level: 4,
      max_grade: 6,
      subject_sort_order: 1,
    }),
  ];
  const hangulSessions = [
    session(5, 5, { lessonId: 'words', meta: {} }),
    session(5, 5, { lessonId: 'words', meta: {} }),
    session(5, 5, { lessonId: 'words', meta: {} }),
  ];

  it('한글은 새로 열릴 활동이 없어도 다음 단계를 제안한다', () => {
    // 한글은 단계가 곧 그 주에 배우는 글자다. 활동이 다 열린 뒤에 단계가 멈추면
    // 아이는 몇 주째 같은 글자만 본다 — 시윤이가 실제로 ㅐ 에 몇 주 머물렀다.
    const levels: Record<string, SubjectLevel> = { hangul: { level: 22, locked: false } };
    const s = buildSuggestion(HANGUL, levels, hangulSessions, 'preschool');
    expect(s?.kind).toBe('promote');
    expect(s?.toLevel).toBe(23);
    // 새로 열리는 활동은 없다. 올라가는 것은 배우는 글자뿐이다.
    expect(s?.unlocksTitle).toBeNull();
    // 무엇이 달라지는지 부모가 알 수 있게 다음 글자를 들려 보낸다.
    expect(s?.nextLetters).toEqual(['ㅔ']);
  });

  it('단계를 바꾼 지 한 주가 안 됐으면 올리자고 하지 않는다', () => {
    // 한 주에 글자 하나를 붙잡는 것이 원칙이다.
    const now = new Date('2026-09-21T09:00:00Z');
    const levels: Record<string, SubjectLevel> = {
      hangul: { level: 22, locked: false, updatedAt: '2026-09-18T09:00:00Z' },
    };
    expect(buildSuggestion(HANGUL, levels, hangulSessions, 'preschool', now)).toBeNull();
  });

  it('한 주가 지나면 다시 올리자고 한다', () => {
    const now = new Date('2026-09-21T09:00:00Z');
    const levels: Record<string, SubjectLevel> = {
      hangul: { level: 22, locked: false, updatedAt: '2026-09-13T09:00:00Z' },
    };
    expect(buildSuggestion(HANGUL, levels, hangulSessions, 'preschool', now)?.toLevel).toBe(23);
  });

  it('마지막 단계에서는 더 올리자고 하지 않는다', () => {
    const levels: Record<string, SubjectLevel> = { hangul: { level: 35, locked: false } };
    expect(buildSuggestion(HANGUL, levels, hangulSessions, 'preschool')).toBeNull();
  });

  it('내릴 때는 한 주를 기다리지 않는다', () => {
    // 지금 버거운 아이를 한 주 더 버겁게 둘 이유가 없다.
    const now = new Date('2026-09-21T09:00:00Z');
    const levels: Record<string, SubjectLevel> = {
      hangul: { level: 22, locked: false, updatedAt: '2026-09-20T09:00:00Z' },
    };
    const poor = [
      session(1, 5, { lessonId: 'words', meta: {} }),
      session(0, 5, { lessonId: 'words', meta: {} }),
      session(2, 5, { lessonId: 'words', meta: {} }),
    ];
    expect(buildSuggestion(HANGUL, levels, poor, 'preschool', now)?.kind).toBe('demote');
  });
});

import { describe, expect, it } from 'vitest';
import { selectActivities, activityEmoji, type LessonGateRow } from './activities';

const HANGUL = 'subj-hangul';
const MATH = 'subj-math';

function row(over: Partial<LessonGateRow>): LessonGateRow {
  return {
    id: 'l1',
    title: '글자 읽기',
    activity_kind: 'letter_cards',
    subject_id: HANGUL,
    subject_slug: 'hangul',
    subject_title: '한글',
    subject_level: 1,
    min_grade: 0,
    max_grade: 1,
    ...over,
  };
}

describe('selectActivities', () => {
  it('학년 범위를 벗어난 활동은 빼놓는다', () => {
    const rows = [row({ id: 'letters', min_grade: 0, max_grade: 1 })];
    // 초3 은 min_grade 0~1 범위 밖
    expect(selectActivities(rows, 'g3', { [HANGUL]: { level: 35, locked: false } })).toHaveLength(0);
  });

  it('아이 레벨보다 높은 단계의 활동은 빼놓는다', () => {
    const rows = [
      row({ id: 'letters', subject_level: 1 }),
      row({ id: 'sentences', title: '문장 읽기', activity_kind: 'reading_cards', subject_level: 14 }),
    ];
    const picked = selectActivities(rows, 'preschool', { [HANGUL]: { level: 4, locked: false } });
    expect(picked.map((a) => a.id)).toEqual(['letters']);
  });

  it('레벨 기록이 없으면 1단계로 본다', () => {
    const rows = [row({ id: 'letters', subject_level: 1 })];
    expect(selectActivities(rows, 'preschool', {}).map((a) => a.id)).toEqual(['letters']);
  });

  it('학년이 정해지지 않았으면 학년 조건은 통과시킨다', () => {
    const rows = [row({ id: 'grid', subject_id: MATH, subject_slug: 'math', min_grade: 1, max_grade: 6 })];
    expect(selectActivities(rows, null, { [MATH]: { level: 1, locked: false } })).toHaveLength(1);
  });
});

describe('activityEmoji', () => {
  it('활동 종류마다 다른 그림을 준다', () => {
    expect(activityEmoji('letter_cards')).toBe('🔤');
    expect(activityEmoji('grid_drill')).toBe('🔢');
    expect(activityEmoji('알 수 없는 종류')).toBe('📘');
  });
});

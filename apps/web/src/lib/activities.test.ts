import { describe, expect, it } from 'vitest';
import { selectActivities, activityEmoji, activityHint, type LessonGateRow } from './activities';

const HANGUL = 'subj-hangul';
const MATH = 'subj-math';

function row(over: Partial<LessonGateRow>): LessonGateRow {
  return {
    id: 'l1',
    title: '자음모음 배우기',
    activity_kind: 'letter_cards',
    subject_id: HANGUL,
    subject_slug: 'hangul',
    subject_title: '한글',
    subject_level: 1,
    min_grade: 0,
    max_grade: 1,
    sort_order: 1,
    subject_sort_order: 1,
    config: {},
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

  it('과목 순서 다음에 레슨 순서로 정렬한다', () => {
    // 시윤·도윤은 한글 letter-cards(1)와 수학 add-play(1)가 둘 다 sort_order 1 이다.
    // 레슨 순서만 보면 들어올 때마다 카드 차례가 뒤바뀐다.
    const rows = [
      row({ id: 'add-play', subject_id: MATH, subject_slug: 'math', sort_order: 1, subject_sort_order: 4 }),
      row({ id: 'word-cards', sort_order: 2, subject_sort_order: 1 }),
      row({ id: 'letter-cards', sort_order: 1, subject_sort_order: 1 }),
    ];
    const levels = {
      [HANGUL]: { level: 4, locked: false },
      [MATH]: { level: 1, locked: false },
    };
    expect(selectActivities(rows, 'preschool', levels).map((a) => a.id)).toEqual([
      'letter-cards',
      'word-cards',
      'add-play',
    ]);
  });

  it('학년이 정해지지 않았으면 학년 조건은 통과시킨다', () => {
    const rows = [row({ id: 'grid', subject_id: MATH, subject_slug: 'math', min_grade: 1, max_grade: 6 })];
    expect(selectActivities(rows, null, { [MATH]: { level: 1, locked: false } })).toHaveLength(1);
  });
});

describe('activityHint', () => {
  it('config.hint 를 꺼내온다', () => {
    expect(activityHint({ hint: '고기, 나비' })).toBe('고기, 나비');
  });

  it('hint 가 없거나 문자열이 아니면 null', () => {
    expect(activityHint({})).toBeNull();
    expect(activityHint(null)).toBeNull();
    expect(activityHint({ hint: '' })).toBeNull();
    expect(activityHint({ hint: 7 })).toBeNull();
  });
});

describe('selectActivities · hint', () => {
  it('활동 카드에 예시 문구를 실어 보낸다', () => {
    const rows = [row({ id: 'words', config: { hint: '고기, 나비' } })];
    expect(selectActivities(rows, 'preschool', {})[0]!.hint).toBe('고기, 나비');
  });

  it('예시가 없는 활동은 hint 가 null 이다', () => {
    expect(selectActivities([row({ id: 'letters' })], 'preschool', {})[0]!.hint).toBeNull();
  });
});

describe('activityEmoji', () => {
  it('활동 종류마다 다른 그림을 준다', () => {
    expect(activityEmoji('letter_cards')).toBe('🔤');
    expect(activityEmoji('grid_drill')).toBe('🔢');
    expect(activityEmoji('알 수 없는 종류')).toBe('📘');
  });
});

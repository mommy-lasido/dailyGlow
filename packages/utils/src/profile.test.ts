import { describe, expect, it } from 'vitest';
import {
  toISODate,
  gradeOrdinal,
  recommendGrade,
  recommendReadingLevel,
  recommendDailyGoalMinutes,
  recommendHangulStage,
  GRADE_LABEL,
  READING_LEVEL_LABEL,
} from './profile';

const TODAY = new Date('2026-09-04');

describe('toISODate', () => {
  it('지역 시간 기준으로 YYYY-MM-DD 를 만든다', () => {
    // 밤 11시 — UTC 로 바꾸면 다음 날이 되는 시각이라도 그날 그대로여야 한다.
    expect(toISODate(new Date(2026, 8, 4, 23, 30))).toBe('2026-09-04');
  });

  it('한 자리 월·일을 0 으로 채운다', () => {
    expect(toISODate(new Date(2026, 0, 7))).toBe('2026-01-07');
  });
});

describe('gradeOrdinal', () => {
  it('미취학은 0, 초1은 1, 초6은 6', () => {
    expect(gradeOrdinal('preschool')).toBe(0);
    expect(gradeOrdinal('g1')).toBe(1);
    expect(gradeOrdinal('g6')).toBe(6);
  });
});

describe('recommendGrade', () => {
  // 한국 학제: 만 6세가 되는 해의 다음 해 3월 입학 → 입학연도 = 출생연도 + 7
  it('2018년생은 2026년 9월 기준 초2를 추천한다', () => {
    expect(recommendGrade(new Date('2018-05-10'), TODAY)).toBe('g2');
  });

  it('2021년생은 아직 미취학', () => {
    expect(recommendGrade(new Date('2021-03-20'), TODAY)).toBe('preschool');
  });

  it('2023년생도 미취학', () => {
    expect(recommendGrade(new Date('2023-08-02'), TODAY)).toBe('preschool');
  });

  it('3월 이전이면 아직 이전 학년도로 센다', () => {
    // 2018년생 입학은 2025년 3월. 2025년 2월에는 아직 미취학이어야 한다.
    expect(recommendGrade(new Date('2018-05-10'), new Date('2025-02-15'))).toBe('preschool');
    expect(recommendGrade(new Date('2018-05-10'), new Date('2025-03-15'))).toBe('g1');
  });

  it('초6을 넘어가면 g6 으로 고정한다', () => {
    expect(recommendGrade(new Date('2005-01-01'), TODAY)).toBe('g6');
  });
});

describe('recommendReadingLevel', () => {
  it('미취학이면서 만 5세 미만이면 아직 못 읽음', () => {
    expect(recommendReadingLevel('preschool', new Date('2023-08-02'), TODAY)).toBe('pre_reader');
  });

  it('미취학이어도 만 5세 이상이면 배우는 중', () => {
    expect(recommendReadingLevel('preschool', new Date('2021-03-20'), TODAY)).toBe('learning');
  });

  it('초1~초2는 배우는 중', () => {
    expect(recommendReadingLevel('g1', new Date('2019-01-01'), TODAY)).toBe('learning');
    expect(recommendReadingLevel('g2', new Date('2018-01-01'), TODAY)).toBe('learning');
  });

  it('초3 이상은 유창', () => {
    expect(recommendReadingLevel('g3', new Date('2017-01-01'), TODAY)).toBe('fluent');
  });
});

describe('recommendDailyGoalMinutes', () => {
  it('학년이 올라가면 목표 시간도 길어진다', () => {
    expect(recommendDailyGoalMinutes('preschool')).toBe(5);
    expect(recommendDailyGoalMinutes('g1')).toBe(10);
    expect(recommendDailyGoalMinutes('g3')).toBe(15);
    expect(recommendDailyGoalMinutes('g5')).toBe(20);
  });
});

describe('recommendHangulStage', () => {
  it('아직 못 읽으면 1단계부터', () => {
    expect(recommendHangulStage('pre_reader')).toBe(1);
  });

  it('배우는 중이면 낱말 읽기가 열리는 4단계', () => {
    expect(recommendHangulStage('learning')).toBe(4);
  });

  it('혼자 잘 읽으면 마지막 35단계', () => {
    expect(recommendHangulStage('fluent')).toBe(35);
  });

  it('읽기 수준을 고르지 않았으면 1단계로 본다', () => {
    expect(recommendHangulStage(null)).toBe(1);
  });
});

describe('라벨', () => {
  it('모든 학년과 읽기 수준에 한국어 라벨이 있다', () => {
    expect(GRADE_LABEL.preschool).toBe('미취학');
    expect(GRADE_LABEL.g3).toBe('초등 3학년');
    expect(READING_LEVEL_LABEL.pre_reader).toBe('아직 못 읽어요');
    expect(READING_LEVEL_LABEL.fluent).toBe('혼자 잘 읽어요');
  });
});

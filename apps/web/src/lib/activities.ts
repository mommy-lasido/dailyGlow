import { gradeOrdinal, type Grade } from '@dailyglow/utils';
import { supabase } from '@/lib/supabase';
import type { SubjectLevel } from '@/stores/profile';

/** 홈에서 활동 카드를 고르는 데 필요한 레슨 정보 */
export interface LessonGateRow {
  id: string;
  title: string;
  activity_kind: string;
  subject_id: string;
  subject_slug: string;
  subject_title: string;
  subject_level: number;
  min_grade: number;
  max_grade: number;
  /** 레슨끼리의 순서 (lessons.sort_order) */
  sort_order: number;
  /** 과목끼리의 순서 (subjects.sort_order) */
  subject_sort_order: number;
  /** lessons.config. 지금은 hint 만 읽는다. */
  config: unknown;
}

export interface ActivityCard {
  id: string;
  title: string;
  activityKind: string;
  subjectSlug: string;
  subjectTitle: string;
  /** 카드에 그릴 그림의 이름. ActivityIcon 이 이 이름으로 그림을 고른다. */
  iconId: string;
  /**
   * 카드 제목 밑에 붙일 한 줄 예시. config.hint 가 없으면 null.
   * 지금은 "낱말 읽기" 에만 붙는다 — 제목만으로는 "자음모음 배우기" 와
   * 하는 일이 잘 구분되지 않아서. 나머지 카드는 제목만으로 충분하다.
   */
  hint: string | null;
}

/** config 는 jsonb 라 무슨 모양이든 올 수 있다. hint 가 문자열일 때만 쓴다. */
export function activityHint(config: unknown): string | null {
  if (!config || typeof config !== 'object') return null;
  const hint = (config as { hint?: unknown }).hint;
  return typeof hint === 'string' && hint.length > 0 ? hint : null;
}

/**
 * 어떤 그림을 그릴지 정하는 이름.
 *
 * 화면을 고를 때(`resolveRendererId`)와 같은 규칙을 쓴다 — `config.renderer` 가
 * 있으면 그것을, 없으면 `activity_kind` 를. 더하기 놀이와 수 세기 놀이와
 * 맞춤법 탐험대는 셋 다 `choice_quiz` 라, 종류만 보면 세 카드에 같은 그림이 붙는다.
 */
export function activityIconId(row: {
  activity_kind: string;
  config: unknown;
}): string {
  const config = row.config;
  if (config && typeof config === 'object') {
    const renderer = (config as { renderer?: unknown }).renderer;
    if (typeof renderer === 'string' && renderer.length > 0) {
      // 속담과 사자성어는 화면은 같지만 그림이 다르다. config.kind 로 더 좁힌다.
      const kind = (config as { kind?: unknown }).kind;
      if (typeof kind === 'string' && kind.length > 0) return `${renderer}:${kind}`;
      return renderer;
    }
  }
  return row.activity_kind;
}

/**
 * 이 아이에게 보여줄 활동을 고른다.
 * 조건 두 가지 — 학년이 활동의 대상 범위 안에 있고, 과목 레벨이 활동의 시작 단계 이상일 것.
 * 레벨 기록이 아직 없으면 1단계로 본다.
 *
 * 결과는 과목 순서, 그 안에서 레슨 순서로 정렬한다. 레슨 순서만으로 정렬하면
 * 시윤·도윤처럼 sort_order 가 1인 카드가 둘인 아이의 홈 화면이 들어올 때마다 뒤바뀐다.
 */
export function selectActivities(
  rows: LessonGateRow[],
  grade: Grade | null,
  levels: Record<string, SubjectLevel>,
): ActivityCard[] {
  const ord = grade ? gradeOrdinal(grade) : null;

  return rows
    .filter((r) => {
      const gradeOk = ord === null || (ord >= r.min_grade && ord <= r.max_grade);
      const level = levels[r.subject_id]?.level ?? 1;
      return gradeOk && level >= r.subject_level;
    })
    .sort(
      (a, b) =>
        a.subject_sort_order - b.subject_sort_order || a.sort_order - b.sort_order,
    )
    .map((r) => ({
      id: r.id,
      title: r.title,
      activityKind: r.activity_kind,
      subjectSlug: r.subject_slug,
      subjectTitle: r.subject_title,
      iconId: activityIconId(r),
      hint: activityHint(r.config),
    }));
}

/** 오늘 공부한 시간(분). 세션 요약을 합산한다. */
export async function fetchTodayMinutes(profileId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('sessions')
    .select('duration_sec')
    .eq('profile_id', profileId)
    .gte('created_at', start.toISOString());

  if (error || !data) return 0;
  const totalSec = data.reduce((sum, r) => sum + (r.duration_sec ?? 0), 0);
  return Math.floor(totalSec / 60);
}

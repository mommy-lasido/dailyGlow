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
}

export interface ActivityCard {
  id: string;
  title: string;
  activityKind: string;
  subjectSlug: string;
  subjectTitle: string;
  emoji: string;
}

const EMOJI: Record<string, string> = {
  letter_cards: '🔤',
  word_cards: '📗',
  reading_cards: '📖',
  worksheet: '✏️',
  choice_quiz: '📝',
  grid_drill: '🔢',
};

export function activityEmoji(kind: string): string {
  return EMOJI[kind] ?? '📘';
}

/**
 * 이 아이에게 보여줄 활동을 고른다.
 * 조건 두 가지 — 학년이 활동의 대상 범위 안에 있고, 과목 레벨이 활동의 시작 단계 이상일 것.
 * 레벨 기록이 아직 없으면 1단계로 본다.
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
    .map((r) => ({
      id: r.id,
      title: r.title,
      activityKind: r.activity_kind,
      subjectSlug: r.subject_slug,
      subjectTitle: r.subject_title,
      emoji: activityEmoji(r.activity_kind),
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

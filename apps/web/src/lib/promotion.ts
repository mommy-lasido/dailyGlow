/**
 * 단계를 올릴 때가 됐는지 판단한다.
 *
 * 앱이 혼자 단계를 바꾸지는 않는다. 여기서는 "올릴 때가 된 것 같다" 는 판단만 하고,
 * 실제로 바꾸는 것은 부모가 홈 화면에서 눌러 승인했을 때다. 앱이 몰래 바꿔버리면
 * 아이가 갑자기 어려워할 때 왜 그런지 알 수가 없다.
 *
 * 판단의 근거는 **1차 점수** 다. 문제 풀이가 3단계(1차 전체 → 채점 → 2차 틀린 것만 →
 * 3차 힌트 보고 맞힐 때까지)로 흐르는 덕분에 2·3차에서 고친 것은 점수에 안 들어간다.
 * 그래서 1차 점수가 아이의 실제 실력을 정직하게 나타낸다.
 */

import type { LessonGateRow } from '@/lib/activities';
import { supabase } from '@/lib/supabase';
import type { SubjectLevel } from '@/stores/profile';
import { gradeOrdinal, hangulStage, type Grade } from '@dailyglow/utils';
import { weeklyLetters } from '@/lib/weekly';

/** 판정에 쓰는 한 판의 기록 */
export interface SessionSummary {
  lessonId: string | null;
  totalCount: number;
  correctCount: number;
  meta: Record<string, unknown>;
}

export type LevelVerdict = 'promote' | 'demote' | 'stay';

/**
 * 최근 기록을 가져온다. 최근 것이 앞에 온다.
 *
 * 과목마다 따로 물어보면 질의가 여러 번 나가므로 한 번에 넉넉히 받아 와서
 * 활동별로 나눈다. 판정에는 활동당 세 판이면 충분하다.
 */
export async function fetchRecentSessions(
  profileId: string,
  limit = 40,
): Promise<SessionSummary[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('lesson_id, total_count, correct_count, meta')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // 제안은 없으면 없는 대로 괜찮은 기능이다. 실패해도 홈 화면을 막지 않는다.
  if (error || !data) return [];

  return data.map((r) => ({
    lessonId: r.lesson_id,
    totalCount: r.total_count ?? 0,
    correctCount: r.correct_count ?? 0,
    meta: (r.meta ?? {}) as Record<string, unknown>,
  }));
}

/**
 * 몇 판을 보고 판단할지. 한 판만 보면 찍어서 맞힌 것을 실력으로 착각한다.
 * 세 판 연속이면 운으로 보기 어렵다.
 */
export const JUDGE_WINDOW = 3;
/** 이 비율 이상으로 세 판 연속 맞히면 올릴 때가 됐다고 본다. */
export const PROMOTE_RATIO = 0.8;
/** 이 비율에 세 판 연속 못 미치면 지금 단계가 버겁다고 본다. */
export const DEMOTE_RATIO = 0.5;

/** `recent` 는 최근 것이 앞에 오도록 정렬돼 있어야 한다. */
export function judgeLevel(recent: SessionSummary[]): LevelVerdict {
  if (recent.length < JUDGE_WINDOW) return 'stay';

  const ratios = recent
    .slice(0, JUDGE_WINDOW)
    .map((s) => (s.totalCount > 0 ? s.correctCount / s.totalCount : 0));

  if (ratios.every((r) => r >= PROMOTE_RATIO)) return 'promote';
  if (ratios.every((r) => r < DEMOTE_RATIO)) return 'demote';
  return 'stay';
}

/**
 * 승급 판정에 넣을 기록만 고른다.
 *
 * 수 세기 놀이는 셋까지 / 다섯까지 / 열까지 중에 아이가 고른다. 쉬운 단계만
 * 반복하면서 덧셈으로 넘어가면 안 되므로, 가장 어려운 단계에서 한 것만 센다.
 * range 를 기록하지 않는 활동은 그런 구분이 없으므로 전부 센다.
 */
export const TOP_COUNT_RANGE = 10;

export function countsForPromotion(s: SessionSummary): boolean {
  const range = s.meta?.range;
  return typeof range !== 'number' || range >= TOP_COUNT_RANGE;
}

export interface LevelSuggestion {
  kind: 'promote' | 'demote';
  subjectId: string;
  subjectTitle: string;
  /** 판단의 근거가 된 활동 이름 */
  lessonTitle: string;
  /** 올리거나 내릴 목표 단계 */
  toLevel: number;
  /** 올라가면 새로 열리는 활동 이름 (promote 일 때만) */
  unlocksTitle: string | null;
  /**
   * 올라가면 그 주에 배우게 될 글자 (한글만).
   *
   * 한글은 새로 열리는 활동이 없어도 올라간다. 그때 "무엇이 달라지는지" 를
   * 말해 줄 것이 이것뿐이다 — 이번 주 글자가 ㅐ 에서 ㅔ 로 바뀐다.
   */
  nextLetters?: string[];
}

/**
 * 점수로 재지 않는 활동인가.
 *
 * 쓰기 연습지는 종이에 쓴 글씨를 앱이 채점하지 않는다. "했다" 만 남기므로 늘
 * 만점처럼 보이는데, 이것을 단계 판단에 넣으면 쓰기만 몇 번 해도 한글 단계가
 * 올라가 버린다.
 */
/**
 * 단계를 올리자고 또 말하기까지 기다리는 날수.
 *
 * 한글은 **단계가 곧 그 주에 배우는 글자**다. 잘한다고 며칠 만에 또 올리면
 * 같은 글자를 한 주 붙잡는다는 원칙이 무너진다 — 교재가 한 주에 글자 하나를
 * 잡는 데는 까닭이 있고, 영숙님도 그 쪽을 골랐다.
 *
 * 내릴 때는 기다리지 않는다. 지금 버거운 아이를 한 주 더 버겁게 둘 이유가 없다.
 */
export const PROMOTE_COOLDOWN_DAYS = 7;

/** 마지막으로 단계를 바꾼 지 아직 한 주가 안 지났는가. */
export function tooSoonToPromote(
  updatedAt: string | null | undefined,
  now = new Date(),
): boolean {
  if (!updatedAt) return false;
  const changed = new Date(updatedAt).getTime();
  if (Number.isNaN(changed)) return false;
  return now.getTime() - changed < PROMOTE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
}

export function isScored(s: SessionSummary): boolean {
  return s.meta?.scored !== false;
}

function byLesson(sessions: SessionSummary[]): Map<string, SessionSummary[]> {
  const map = new Map<string, SessionSummary[]>();
  for (const s of sessions) {
    if (!s.lessonId || !isScored(s)) continue;
    const list = map.get(s.lessonId);
    if (list) list.push(s);
    else map.set(s.lessonId, [s]);
  }
  return map;
}

/**
 * 홈에 띄울 제안을 하나 고른다.
 *
 * 여러 과목이 동시에 조건을 채워도 **하나만** 돌려준다. 카드를 여러 장 띄우면
 * 무엇부터 봐야 할지 알 수 없고, 대충 눌러 넘기게 된다.
 *
 * `sessions` 는 최근 것이 앞에 오도록 정렬돼 있어야 한다.
 */
export function buildSuggestion(
  rows: LessonGateRow[],
  levels: Record<string, SubjectLevel>,
  sessions: SessionSummary[],
  grade: Grade | null,
  now = new Date(),
): LevelSuggestion | null {
  const ord = grade ? gradeOrdinal(grade) : null;
  const gradeOk = (r: LessonGateRow) =>
    ord === null || (ord >= r.min_grade && ord <= r.max_grade);

  const played = byLesson(sessions);

  // 과목 순서대로 훑어 처음 걸리는 것 하나만 쓴다.
  const subjects = [...rows]
    .sort((a, b) => a.subject_sort_order - b.subject_sort_order)
    .map((r) => r.subject_id);

  for (const subjectId of [...new Set(subjects)]) {
    const current = levels[subjectId];
    // 부모가 단계를 고정해 둔 과목은 건드리자고 하지 않는다.
    if (current?.locked) continue;
    const level = current?.level ?? 1;

    const inSubject = rows.filter((r) => r.subject_id === subjectId && gradeOk(r));

    // 지금 열려 있는 활동 중 이 아이가 실제로 해 본 것 — 가장 높은 단계의 것을 본다.
    const open = inSubject
      .filter((r) => r.subject_level <= level && played.has(r.id))
      .sort((a, b) => b.subject_level - a.subject_level);
    const basis = open[0];
    if (!basis) continue;

    const history = played.get(basis.id)!;

    // ── 올리기 ──
    //
    // 위 단계에 새로 열리는 활동이 있으면 그 단계로 올린다.
    const locked = inSubject
      .filter((r) => r.subject_level > level)
      .sort((a, b) => a.subject_level - b.subject_level);
    const nextUp = locked[0];

    // 새로 열릴 활동이 없어도 한글은 올라가야 한다. 한글은 **단계가 곧 배우는
    // 글자**라서(22단계 = ㅐ, 23단계 = ㅔ), 활동이 다 열린 뒤에도 단계가 멈추면
    // 아이는 몇 주째 같은 글자만 보게 된다. 시윤이가 실제로 그랬다.
    const stageOnly =
      !nextUp && basis.subject_slug === 'hangul' && hangulStage(level + 1) ? level + 1 : null;

    const toLevel = nextUp?.subject_level ?? stageOnly;
    if (toLevel !== null && toLevel !== undefined && !tooSoonToPromote(current?.updatedAt, now)) {
      const qualifying = history.filter(countsForPromotion);
      if (judgeLevel(qualifying) === 'promote') {
        return {
          kind: 'promote',
          subjectId,
          subjectTitle: basis.subject_title,
          lessonTitle: basis.title,
          toLevel,
          unlocksTitle: nextUp?.title ?? null,
          nextLetters:
            basis.subject_slug === 'hangul' ? weeklyLetters(toLevel) : undefined,
        };
      }
    }

    // ── 내리기 ──
    // 1단계보다 아래는 없다. 내려갈 곳이 있을 때만 말을 꺼낸다.
    if (level > 1 && judgeLevel(history) === 'demote') {
      return {
        kind: 'demote',
        subjectId,
        subjectTitle: basis.subject_title,
        lessonTitle: basis.title,
        toLevel: level - 1,
        unlocksTitle: null,
      };
    }
  }

  return null;
}

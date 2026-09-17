/**
 * 학습 리포트 — 아이가 앱에서 한 것을 부모가 읽을 수 있는 말로 바꾼다.
 *
 * 앱은 아이가 활동 하나를 **끝낼 때마다** 기록을 하나 남긴다(`sessions`).
 * 거기에는 언제·무슨 활동을·몇 분 동안·몇 문제 중 첫 시도 몇 개를 맞혔는지,
 * 1·2·3차 점수가 얼마였는지, 그리고 **1차에 틀린 것이 무엇이었는지**가 들어 있다.
 *
 * 이 파일은 그 기록을 모아 **판단의 재료**를 만든다. 판단 자체(무엇을 더 해야
 * 하는가)는 사람이 하거나 리포트 화면의 글이 맡는다.
 *
 * **못 하는 것을 분명히 해 둔다.**
 * - 중간에 그만둔 것은 기록이 남지 않는다. 판을 끝내야 저장되기 때문이다.
 * - 화면을 보고 있었는지는 알 수 없다. 오래 걸린 판이 깊이 생각한 것인지
 *   자리를 비운 것인지 구분하지 못한다.
 * - 그래서 "집중력" 이라고 부르지 않고 **걸린 시간**이라고만 적는다.
 */

import { supabase } from '@/lib/supabase';
import { dayKey, toMinutes, weekStart } from '@/lib/activities';

export interface SessionRow {
  activity_kind: string;
  duration_sec: number | null;
  total_count: number | null;
  correct_count: number | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  lesson_title: string | null;
}

/** 활동 한 가지를 모은 것. 리포트의 한 칸이 된다. */
export interface ActivityStat {
  /** 아이에게 보이는 이름. 레슨 제목이 있으면 그것을, 없으면 활동 종류를. */
  title: string;
  rounds: number;
  total: number;
  correct: number;
  seconds: number;
  /** 첫 시도 정답률(0~100). 문제가 없으면 null. */
  rate: number | null;
  /** 문제 하나에 걸린 시간(초). */
  perProblem: number | null;
  /** 1차에 틀린 것들. 같은 것이 여러 번 나오면 그만큼 쌓인다. */
  wrong: string[];
  /** 모든 판에서 2·3차까지 가면 다 맞혔는가. */
  alwaysRecovered: boolean;
}

export interface DayStat {
  key: string;
  minutes: number;
  rounds: number;
}

export interface Report {
  from: Date;
  to: Date;
  rounds: number;
  minutes: number;
  /** 공부한 날 수 */
  days: number;
  activities: ActivityStat[];
  byDay: DayStat[];
  /** 자주 틀린 것 — 많이 틀린 차례로. */
  wrongTop: { label: string; count: number }[];
  /** 시각별 판 수(0~23시). 언제 하는 아이인지 보는 데 쓴다. */
  byHour: number[];
}

const KIND_NAMES: Record<string, string> = {
  letter_cards: '자음모음 배우기',
  word_cards: '낱말 읽기',
  reading_cards: '문장 읽기',
  choice_quiz: '문제 풀기',
  count_play: '수 세기 놀이',
  add_play: '더하기 놀이',
  grid_drill: '100칸 계산',
  worksheet: '연습지',
  spot_letter: '틀린 글자 찾기',
  science: '과학 놀이터',
};

function titleOf(row: SessionRow): string {
  return row.lesson_title ?? KIND_NAMES[row.activity_kind] ?? row.activity_kind;
}

/** meta.wrong 은 jsonb 라 무슨 모양이든 올 수 있다. 글자 목록일 때만 쓴다. */
function wrongOf(meta: Record<string, unknown> | null): string[] {
  const raw = meta?.wrong;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.length > 0);
}

/** roundScores 가 있고 마지막 라운드에서 다 맞혔는가. */
function recovered(meta: Record<string, unknown> | null, total: number): boolean {
  const raw = meta?.roundScores;
  if (!Array.isArray(raw)) return false;
  const sum = raw.reduce<number>((n, x) => n + (typeof x === 'number' ? x : 0), 0);
  return sum >= total;
}

/** 기록을 리포트로 빚는다. */
export function buildReport(rows: SessionRow[], from: Date, to: Date): Report {
  const byTitle = new Map<string, ActivityStat>();
  const byDay = new Map<string, DayStat>();
  const wrongCount = new Map<string, number>();
  const byHour = Array.from({ length: 24 }, () => 0);

  let seconds = 0;

  for (const row of rows) {
    const when = new Date(row.created_at);
    const total = row.total_count ?? 0;
    const correct = row.correct_count ?? 0;
    const sec = row.duration_sec ?? 0;
    seconds += sec;
    byHour[when.getHours()]! += 1;

    const title = titleOf(row);
    const stat = byTitle.get(title) ?? {
      title,
      rounds: 0,
      total: 0,
      correct: 0,
      seconds: 0,
      rate: null,
      perProblem: null,
      wrong: [],
      alwaysRecovered: true,
    };
    stat.rounds += 1;
    stat.total += total;
    stat.correct += correct;
    stat.seconds += sec;
    stat.wrong.push(...wrongOf(row.meta));
    if (total > correct && !recovered(row.meta, total)) stat.alwaysRecovered = false;
    byTitle.set(title, stat);

    for (const w of wrongOf(row.meta)) wrongCount.set(w, (wrongCount.get(w) ?? 0) + 1);

    const key = dayKey(when);
    const day = byDay.get(key) ?? { key, minutes: 0, rounds: 0 };
    day.rounds += 1;
    day.minutes += sec / 60;
    byDay.set(key, day);
  }

  const activities = [...byTitle.values()].map((a) => ({
    ...a,
    rate: a.total > 0 ? Math.round((a.correct / a.total) * 100) : null,
    perProblem: a.total > 0 ? Math.round((a.seconds / a.total) * 10) / 10 : null,
  }));
  // 약한 것부터 본다 — 눈이 먼저 가야 할 자리다. 정답률이 없는 것은 뒤로.
  activities.sort((a, b) => (a.rate ?? 999) - (b.rate ?? 999));

  return {
    from,
    to,
    rounds: rows.length,
    minutes: toMinutes(seconds),
    days: byDay.size,
    activities,
    byDay: [...byDay.values()].sort((a, b) => a.key.localeCompare(b.key)),
    wrongTop: [...wrongCount.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    byHour,
  };
}

/** 지난 N주의 기록을 가져온다. 이번 주를 포함해 센다. */
export async function fetchReport(profileId: string, weeks = 1, today = new Date()) {
  const from = weekStart(today);
  from.setDate(from.getDate() - 7 * (weeks - 1));

  const { data, error } = await supabase
    .from('sessions')
    .select('activity_kind, duration_sec, total_count, correct_count, meta, created_at, lessons(title)')
    .eq('profile_id', profileId)
    .gte('created_at', from.toISOString())
    .order('created_at', { ascending: true });

  if (error || !data) return buildReport([], from, today);

  const rows: SessionRow[] = data.map((r) => {
    const lesson = (r as { lessons?: { title?: string } | null }).lessons;
    return {
      activity_kind: r.activity_kind,
      duration_sec: r.duration_sec,
      total_count: r.total_count,
      correct_count: r.correct_count,
      meta: (r.meta ?? {}) as Record<string, unknown>,
      created_at: r.created_at,
      lesson_title: lesson?.title ?? null,
    };
  });

  return buildReport(rows, from, today);
}

/**
 * 리포트를 글로 옮긴다. 부모가 그대로 읽거나, 다른 자료와 함께 클로드에게
 * 건네 더 깊은 분석을 받을 수 있게.
 */
export function reportAsText(name: string, r: Report): string {
  const lines: string[] = [];
  const d = (x: Date) => `${x.getMonth() + 1}/${x.getDate()}`;

  lines.push(`${name} · 하루배움 기록 (${d(r.from)}~${d(r.to)})`);
  lines.push(`${r.days}일 · ${r.rounds}판 · ${r.minutes}분`);
  lines.push('');

  for (const a of r.activities) {
    const rate = a.rate === null ? '—' : `${a.correct}/${a.total} (${a.rate}%)`;
    const per = a.perProblem === null ? '' : ` · 문제당 ${a.perProblem}초`;
    lines.push(`- ${a.title}: ${a.rounds}판 · 첫 시도 ${rate}${per}`);
    if (a.wrong.length > 0) lines.push(`  틀린 것: ${a.wrong.join(', ')}`);
  }

  if (r.wrongTop.length > 0) {
    lines.push('');
    lines.push(`자주 틀린 것: ${r.wrongTop.map((w) => `${w.label}(${w.count})`).join(', ')}`);
  }

  lines.push('');
  lines.push('* 끝낸 판만 기록됩니다. 중간에 그만둔 것은 남지 않습니다.');
  return lines.join('\n');
}

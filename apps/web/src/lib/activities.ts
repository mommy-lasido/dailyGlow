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
      iconId: activityIconId(r),
      hint: activityHint(r.config),
    }));
}

/**
 * 초를 분으로. **한 일이 있으면 0분이 되지 않는다.**
 *
 * 그냥 버림하면 20초 걸린 활동이 "0분" 이 된다. 아이는 분명히 앉아서 풀었는데
 * 화면에는 아무 일도 없었던 것처럼 나오고, 출석 도장도 안 찍힌다. 실제로 시윤이가
 * 문장 읽기를 마쳤는데 그렇게 됐다.
 *
 * 그래서 한 일이 있으면 적어도 1분으로 센다. 조금 넉넉하게 세는 셈이지만,
 * 한 것을 안 한 것으로 만드는 쪽보다 낫다.
 */
export function toMinutes(seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.max(1, Math.round(seconds / 60));
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
  return toMinutes(data.reduce((sum, r) => sum + (r.duration_sec ?? 0), 0));
}

/** 한 주는 월요일에 시작한다 — 아이들이 학교·어린이집에서 쓰는 주와 같다. */
export function weekStart(today = new Date()): Date {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  // getDay(): 일요일이 0. 월요일을 0 으로 옮겨 계산한다.
  const fromMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - fromMonday);
  return d;
}

/** 날짜를 그날의 열쇠로. 시간대 차이로 날이 밀리지 않게 지역 시간으로 만든다. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface WeekDay {
  key: string;
  /** 월·화·수… */
  label: string;
  /**
   * 출석 칸에 흐리게 적을 날짜. "9/7" 처럼 **달까지 적는다.**
   * 한 주가 달을 넘어갈 때가 있어, 날짜만 적으면 아이가 헷갈린다.
   */
  date: string;
  minutes: number;
  isToday: boolean;
  /** 오늘보다 뒤라 아직 오지 않은 날 */
  isFuture: boolean;
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

/** 세션 기록을 한 주의 일곱 칸으로 펼친다. */
export function toWeek(
  rows: { created_at: string | null; duration_sec: number | null }[],
  today = new Date(),
): WeekDay[] {
  const minutes = new Map<string, number>();
  for (const r of rows) {
    if (!r.created_at) continue;
    const k = dayKey(new Date(r.created_at));
    minutes.set(k, (minutes.get(k) ?? 0) + (r.duration_sec ?? 0));
  }

  const start = weekStart(today);
  const todayKey = dayKey(today);
  return DAY_LABELS.map((label, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dayKey(d);
    return {
      key,
      label,
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      minutes: toMinutes(minutes.get(key) ?? 0),
      isToday: key === todayKey,
      isFuture: key > todayKey,
    };
  });
}

/** 이번 주의 공부 기록. 출석 도장을 찍는 데 쓴다. */
export async function fetchWeek(profileId: string, today = new Date()): Promise<WeekDay[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('created_at, duration_sec')
    .eq('profile_id', profileId)
    .gte('created_at', weekStart(today).toISOString());

  if (error || !data) return toWeek([], today);
  return toWeek(data, today);
}

/**
 * 이번 주의 과학을 이미 봤는가.
 *
 * 과학은 한 주에 하나라, 다 본 뒤에도 홈 화면이 "이번 주에 배울 것이 하나
 * 있어요" 라고 말하면 거짓말이 된다. 아이가 다 보고 나면 문구가 바뀌어야 한다.
 */
export async function scienceDoneThisWeek(
  profileId: string,
  today = new Date(),
): Promise<boolean> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id')
    .eq('profile_id', profileId)
    .eq('activity_kind', 'science')
    .gte('created_at', weekStart(today).toISOString())
    .limit(1);

  return !error && (data?.length ?? 0) > 0;
}

/**
 * 지금까지 공부한 시간(분), 처음부터 모두 더한 것.
 *
 * 오늘 얼마나 했는지는 매일 0 으로 돌아가지만, 이 숫자는 줄지 않는다.
 * 쌓여 가는 것이 눈에 보여야 아이가 어제의 자기와 이어져 있다고 느낀다.
 */
export async function fetchTotalMinutes(profileId: string): Promise<number> {
  const { data, error } = await supabase
    .from('sessions')
    .select('duration_sec')
    .eq('profile_id', profileId);

  if (error || !data) return 0;
  return toMinutes(data.reduce((sum, r) => sum + (r.duration_sec ?? 0), 0));
}

/**
 * 오늘까지 며칠을 이어서 했는가.
 *
 * **오늘 아직 안 했어도 어제까지의 줄은 살아 있다.** 아침에 앱을 열었을 때
 * "3일째" 가 갑자기 0 이 되어 있으면, 아이는 어제까지 쌓은 것을 잃은 것처럼
 * 느낀다. 오늘 하면 이어지고, 오늘을 넘겨야 끊어진다.
 *
 * 이번 주 안에서만 센다 — 한 주 칸에 붙는 숫자이기 때문이다.
 */
export function streakOf(week: WeekDay[]): number {
  const todayIndex = week.findIndex((d) => d.isToday);
  if (todayIndex < 0) return 0;

  // 오늘 했으면 오늘부터, 아직이면 어제부터 거슬러 센다.
  let i = week[todayIndex]!.minutes > 0 ? todayIndex : todayIndex - 1;
  let count = 0;
  for (; i >= 0; i -= 1) {
    if (week[i]!.minutes === 0) break;
    count += 1;
  }
  return count;
}

/** 이번 주를 하루도 빠짐없이 채웠는가. 아직 오지 않은 날은 따지지 않는다. */
export function weekComplete(week: WeekDay[]): boolean {
  const past = week.filter((d) => !d.isFuture);
  return past.length === 7 && past.every((d) => d.minutes > 0);
}

/** 오늘 이미 마친 활동들. 오늘의 학습에 체크를 찍는 데 쓴다. */
export async function fetchTodayLessons(profileId: string): Promise<string[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('sessions')
    .select('lesson_id')
    .eq('profile_id', profileId)
    .gte('created_at', start.toISOString());

  if (error || !data) return [];
  return data.map((r) => r.lesson_id).filter((id): id is string => Boolean(id));
}

export interface PlanItem {
  activity: ActivityCard;
  done: boolean;
}

/** 같은 날 같은 아이에게는 늘 같은 것이 나오도록 하는 수. */
function seedOf(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 100000;
  return h;
}

/**
 * 오늘 할 것을 고른다.
 *
 * 아이가 목록에서 고르게만 두면 **매일 같은 것만 하거나, 무엇을 할지 몰라
 * 헤맨다.** 시윤이가 쓰던 학습기는 켜면 오늘 할 것이 딱 나왔다. 그 자리를
 * 우리도 만들어야 아이가 혼자 앉아도 시작할 수 있다.
 *
 * **과목마다 하나씩** 고른다. 한글만 세 개 나오면 그날 수학은 통째로 빠진다.
 * 어느 것을 고를지는 날짜와 아이로 정해, 같은 날에는 새로고침해도 바뀌지 않고
 * 날이 바뀌면 다른 것이 돌아온다.
 *
 * 이미 마친 것도 목록에 남겨 두고 체크만 찍는다. 사라지면 무엇을 했는지 알 수
 * 없고, 아이가 "다 했다" 를 눈으로 확인할 자리도 없어진다.
 */
export function buildDailyPlan(
  activities: ActivityCard[],
  doneLessonIds: string[],
  profileId: string,
  today = new Date(),
): PlanItem[] {
  const done = new Set(doneLessonIds);
  const bySubject = new Map<string, ActivityCard[]>();
  for (const a of activities) {
    const list = bySubject.get(a.subjectSlug) ?? [];
    list.push(a);
    bySubject.set(a.subjectSlug, list);
  }

  const seed = seedOf(`${dayKey(today)}-${profileId}`);
  return [...bySubject.values()].map((list, i) => {
    // 오늘 이미 한 것이 있으면 그것을 그대로 보여준다 — 체크가 찍힌 채로 남는다.
    const already = list.find((a) => done.has(a.id));
    const picked = already ?? list[(seed + i) % list.length]!;
    return { activity: picked, done: done.has(picked.id) };
  });
}

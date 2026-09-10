/**
 * 100칸 계산의 지난 기록.
 *
 * **목표 시간을 적어 두지 않는다.** 처음에는 가게야마 기준(덧셈 100칸 2분 따위)을
 * 보여주려 했으나, 4분 걸리는 아이에게 2분을 들이밀면 닿지 않는 목표라 포기하게
 * 되고, 이미 2분에 드는 아이에게는 더 나아갈 곳이 없다.
 *
 * 대신 **자기 기록이 줄어드는지**만 본다. 가게야마 학습법도 처음 하는 아이에게는
 * 절대 시간이 아니라 "첫날 잰 시간의 절반" 을 1차 목표로 삼으라고 한다 — 결국
 * 견줄 상대는 남이 아니라 어제의 자기다.
 * (조사 원본: `docs/research/2026-09-10-가게야마-100칸계산-시간기준.md`)
 */

import { supabase } from '@/lib/supabase';

export interface DrillRecord {
  durationSec: number;
  op: string;
  cells: number;
  levelId: number;
}

/** 이 아이가 이 활동에서 남긴 기록. 오래된 것이 앞에 온다. */
export async function fetchDrillRecords(
  profileId: string,
  lessonId: string,
): Promise<DrillRecord[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('duration_sec, meta')
    .eq('profile_id', profileId)
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: true })
    .limit(200);

  // 기록을 못 읽어도 문제는 풀 수 있어야 하므로 화면을 막지 않는다.
  if (error || !data) return [];

  return data
    .map((r) => {
      const meta = (r.meta ?? {}) as Record<string, unknown>;
      return {
        durationSec: r.duration_sec ?? 0,
        op: typeof meta.op === 'string' ? meta.op : '',
        cells: typeof meta.cells === 'number' ? meta.cells : 0,
        levelId: typeof meta.levelId === 'number' ? meta.levelId : 0,
      };
    })
    .filter((r) => r.durationSec > 0);
}

/**
 * 같은 조건의 기록만 고른다.
 *
 * 덧셈 25칸과 나눗셈 100칸을 같은 줄에 놓고 견줄 수는 없다. 셈·단계·칸 수가
 * 모두 같아야 견줄 만한 기록이다.
 */
export function matching(
  records: DrillRecord[],
  op: string,
  levelId: number,
  cells: number,
): DrillRecord[] {
  return records.filter((r) => r.op === op && r.levelId === levelId && r.cells === cells);
}

export interface DrillHistory {
  count: number;
  /** 맨 처음 잰 시간 */
  firstSec: number | null;
  /** 가장 빨랐던 시간 */
  bestSec: number | null;
}

export function summarize(records: DrillRecord[]): DrillHistory {
  if (records.length === 0) return { count: 0, firstSec: null, bestSec: null };
  return {
    count: records.length,
    firstSec: records[0]!.durationSec,
    bestSec: Math.min(...records.map((r) => r.durationSec)),
  };
}

/**
 * 이번에 잰 시간이 지난 기록과 견주어 어떤가.
 *
 * 처음이면 그 사실을, 줄었으면 얼마나 줄었는지, 못 미쳤으면 최고 기록이 얼마인지
 * 알려준다. **못 미쳤다고 나무라지 않는다** — 다음에 줄이면 되는 일이다.
 */
export function compareToHistory(
  sec: number,
  history: DrillHistory,
): { kind: 'first' | 'best' | 'slower'; deltaSec: number } {
  if (history.bestSec === null) return { kind: 'first', deltaSec: 0 };
  if (sec < history.bestSec) {
    return { kind: 'best', deltaSec: history.bestSec - sec };
  }
  return { kind: 'slower', deltaSec: sec - history.bestSec };
}

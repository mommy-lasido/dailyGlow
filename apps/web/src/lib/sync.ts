import { db, type QueuedSession } from './db';
import { supabase } from './supabase';
import { setMeta } from './db';

/**
 * 오프라인 큐 flush: attemptQueue 에 쌓인 미동기화 풀이를 서버로 올린다.
 * 온라인 복귀 이벤트나 앱 시작 시 호출.
 */
export async function flushAttemptQueue(): Promise<number> {
  if (!navigator.onLine) return 0;

  const pending = await db.attemptQueue.where('synced').equals(0).toArray();
  if (pending.length === 0) return 0;

  const payload = pending.map((a) => ({
    profile_id: a.profileId,
    problem_id: a.problemId,
    type_id: a.typeId,
    is_correct: a.isCorrect,
    response: a.response as never,
    duration_ms: a.durationMs,
    created_at: a.createdAt,
  }));

  const { error } = await supabase.from('attempts').insert(payload);
  if (error) {
    console.warn('[sync] attempt flush 실패:', error.message);
    return 0;
  }

  await db.attemptQueue.bulkDelete(pending.map((a) => a.localId!).filter(Boolean));
  await setMeta('lastAttemptSyncAt', new Date().toISOString());
  return pending.length;
}

/** 큐 항목을 sessions 테이블의 컬럼 이름으로 바꾼다. */
export function toSessionRow(s: QueuedSession) {
  return {
    profile_id: s.profileId,
    lesson_id: s.lessonId,
    activity_kind: s.activityKind,
    mode: s.mode,
    duration_sec: s.durationSec,
    total_count: s.totalCount,
    correct_count: s.correctCount,
    meta: s.meta as never,
    created_at: s.createdAt,
  };
}

/**
 * 세션 큐 flush. attemptQueue 와 같은 규칙 —
 * 서버가 거부하면 큐에 그대로 두고 다음 기회에 다시 보낸다.
 */
export async function flushSessionQueue(): Promise<number> {
  if (!navigator.onLine) return 0;

  const pending = await db.sessionQueue.where('synced').equals(0).toArray();
  if (pending.length === 0) return 0;

  const { error } = await supabase.from('sessions').insert(pending.map(toSessionRow));
  if (error) {
    console.warn('[sync] session flush 실패:', error.message);
    return 0;
  }

  await db.sessionQueue.bulkDelete(pending.map((s) => s.localId!).filter(Boolean));
  await setMeta('lastSessionSyncAt', new Date().toISOString());
  return pending.length;
}

/**
 * 한 판의 결과를 기록한다. 항상 큐에 먼저 넣고 나서 보내기를 시도하므로,
 * 오프라인이거나 서버가 거부해도 기록이 사라지지 않는다.
 */
export async function queueSession(
  input: Omit<QueuedSession, 'localId' | 'synced'>,
): Promise<void> {
  await db.sessionQueue.add({ ...input, synced: 0 });
  await flushSessionQueue();
}

let listenerBound = false;

export function bindSyncListeners(): void {
  if (listenerBound) return;
  listenerBound = true;
  window.addEventListener('online', () => {
    void flushAttemptQueue();
    void flushSessionQueue();
  });
}

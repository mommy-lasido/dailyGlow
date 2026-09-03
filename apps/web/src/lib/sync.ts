import { db } from './db';
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

let listenerBound = false;

export function bindSyncListeners(): void {
  if (listenerBound) return;
  listenerBound = true;
  window.addEventListener('online', () => {
    void flushAttemptQueue();
  });
}

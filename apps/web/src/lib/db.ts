import Dexie, { type EntityTable } from 'dexie';
import type { Tables } from '@dailyglow/supabase';

/** 서버에서 내려받아 오프라인에서 쓰는 캐시 + 아직 동기화 못 한 풀이 큐 */

export interface CachedLesson {
  id: string;
  subjectSlug: string;
  slug: string;
  title: string;
  level: number;
  sortOrder: number;
}

export interface CachedProblem {
  id: string;
  lessonId: string;
  typeId: string;
  prompt: unknown;
  answer: unknown;
  difficulty: number;
}

/** 오프라인에서 발생한 풀이. 온라인 복귀 시 attempts 테이블로 flush 된다. */
export interface QueuedAttempt {
  localId?: number;
  profileId: string;
  problemId: string;
  typeId: string;
  isCorrect: boolean;
  response: unknown;
  durationMs: number;
  createdAt: string;
  synced: 0 | 1;
}

export type LocalTypeStat = Tables<'wrong_type_stats'>;

export interface MetaRow {
  key: string;
  value: unknown;
}

export class DailyGlowDB extends Dexie {
  lessons!: EntityTable<CachedLesson, 'id'>;
  problems!: EntityTable<CachedProblem, 'id'>;
  attemptQueue!: EntityTable<QueuedAttempt, 'localId'>;
  typeStats!: EntityTable<LocalTypeStat, 'type_id'>;
  meta!: EntityTable<MetaRow, 'key'>;

  constructor() {
    super('dailyglow');
    this.version(1).stores({
      lessons: 'id, subjectSlug, level',
      problems: 'id, lessonId, typeId',
      attemptQueue: '++localId, synced, profileId',
      typeStats: 'type_id, profile_id',
      meta: 'key',
    });
  }
}

export const db = new DailyGlowDB();

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

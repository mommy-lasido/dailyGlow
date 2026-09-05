import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  pending: [] as unknown[],
  inserted: [] as unknown[],
  insertError: null as { message: string } | null,
  added: [] as unknown[],
  deleted: [] as unknown[],
  online: true,
}));

// sync.ts 가 './db' / './supabase' 로 가져오므로 같은 상대 경로로 대체한다.
vi.mock('./db', () => ({
  db: {
    sessionQueue: {
      add: (row: unknown) => {
        h.added.push(row);
        return Promise.resolve(1);
      },
      where: () => ({ equals: () => ({ toArray: () => Promise.resolve(h.pending) }) }),
      bulkDelete: (ids: unknown[]) => {
        h.deleted.push(...ids);
        return Promise.resolve();
      },
    },
  },
  setMeta: () => Promise.resolve(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    from: () => ({
      insert: (rows: unknown) => {
        h.inserted.push(rows);
        return Promise.resolve({ error: h.insertError });
      },
    }),
  },
}));

import { flushSessionQueue, queueSession, toSessionRow } from './sync';

function queued() {
  return {
    localId: 1,
    profileId: 'p1',
    lessonId: 'l1',
    activityKind: 'choice_quiz',
    mode: 'screen' as const,
    durationSec: 90,
    totalCount: 10,
    correctCount: 8,
    meta: { renderer: 'add_play' },
    createdAt: '2026-09-05T00:00:00.000Z',
    synced: 0 as const,
  };
}

describe('toSessionRow', () => {
  it('큐 항목을 sessions 컬럼 이름으로 바꾼다', () => {
    expect(toSessionRow(queued())).toEqual({
      profile_id: 'p1',
      lesson_id: 'l1',
      activity_kind: 'choice_quiz',
      mode: 'screen',
      duration_sec: 90,
      total_count: 10,
      correct_count: 8,
      meta: { renderer: 'add_play' },
      created_at: '2026-09-05T00:00:00.000Z',
    });
  });
});

describe('flushSessionQueue', () => {
  beforeEach(() => {
    h.pending = [];
    h.inserted = [];
    h.insertError = null;
    h.added = [];
    h.deleted = [];
    h.online = true;
    vi.stubGlobal('navigator', { onLine: true });
  });

  it('쌓인 게 없으면 아무것도 보내지 않는다', async () => {
    expect(await flushSessionQueue()).toBe(0);
    expect(h.inserted).toHaveLength(0);
  });

  it('쌓인 항목을 올리고 큐에서 지운다', async () => {
    h.pending = [queued()];
    expect(await flushSessionQueue()).toBe(1);
    expect(h.inserted).toHaveLength(1);
    expect(h.deleted).toEqual([1]);
  });

  it('오프라인이면 보내지 않고 큐에 남긴다', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    h.pending = [queued()];
    expect(await flushSessionQueue()).toBe(0);
    expect(h.inserted).toHaveLength(0);
    expect(h.deleted).toHaveLength(0);
  });

  it('서버가 거부하면 큐에서 지우지 않는다', async () => {
    h.pending = [queued()];
    h.insertError = { message: 'boom' };
    expect(await flushSessionQueue()).toBe(0);
    expect(h.deleted).toHaveLength(0);
  });
});

describe('queueSession', () => {
  beforeEach(() => {
    h.added = [];
    h.pending = [];
    h.inserted = [];
    vi.stubGlobal('navigator', { onLine: true });
  });

  it('synced=0 으로 큐에 넣는다', async () => {
    await queueSession({
      profileId: 'p1',
      lessonId: 'l1',
      activityKind: 'choice_quiz',
      mode: 'screen',
      durationSec: 30,
      totalCount: 10,
      correctCount: 10,
      meta: {},
      createdAt: '2026-09-05T00:00:00.000Z',
    });
    expect(h.added).toHaveLength(1);
    expect((h.added[0] as { synced: number }).synced).toBe(0);
  });
});

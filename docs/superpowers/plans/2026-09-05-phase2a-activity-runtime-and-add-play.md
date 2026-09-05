# Phase 2a — 활동 실행 구조와 더하기 놀이 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아이가 홈에서 활동 카드를 눌러 실제로 문제를 풀고, 한 판이 끝나면 기록이 남아 홈의 "오늘의 목표"가 채워지는 첫 경로를 뚫는다. 그 경로를 가장 단순한 활동인 **더하기 놀이**로 검증한다.

**Architecture:** `lessons.activity_kind`(또는 `config.renderer`)로 React 컴포넌트를 고르는 **활동 레지스트리**를 두고, `ActivityPage`가 레슨을 불러와 해당 렌더러를 띄운다. 활동은 자기 UI만 책임지고, 끝날 때 `onFinish(result)`로 결과만 넘긴다. 기록은 `ActivityPage`가 받아 Dexie 큐에 넣고 온라인이면 곧바로 `sessions` 테이블로 올린다 — 오프라인에서도 기록이 사라지지 않게 기존 `attemptQueue` 패턴을 그대로 따른다.

**Tech Stack:** React 18 · TypeScript · Vite 6 · Tailwind · React Router v6 · Zustand · TanStack Query · Dexie · Supabase · Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-09-04-auth-profile-and-app-migration-design.md` — §5(활동 모델), §7의 "➕ 더하기 놀이", §9(기록과 오프라인). §6의 한글 단계 시스템과 나머지 활동은 이 계획의 범위가 **아니다**.

## Global Constraints

- 모든 사용자 대면 문자열은 **한국어**다. 코드 주석도 기존 코드베이스를 따라 한국어로 쓴다.
- 터치 타깃은 `min-h-touch`(3.5rem) 이상. 태블릿에서 4~9세 아이가 쓴다.
- 읽기 수준이 `pre_reader`인 아이에게는 글자를 크게 보여준다 (`HomePage`가 인사말에 `text-5xl` vs `text-3xl`을 쓰는 것과 같은 원칙).
- 파일 경로 별칭은 `@/` → `apps/web/src/`.
- 테스트는 `pnpm test`(vitest run), 타입 검사는 `pnpm typecheck`, 린트는 `pnpm lint`. 모두 저장소 루트에서 실행.
- **`pnpm db:reset` / `supabase db reset` 을 절대 실행하지 않는다.** 사용자의 실제 프로필 데이터가 로컬 DB에 들어 있고, 지우지 않겠다고 약속했다. DB 변경이 필요하면 `docker exec supabase_db_dailyGlow psql -U postgres -d postgres -c "…"` 로 대상만 바꾼다 (이 머신에 `psql` 클라이언트가 없다).
- 마이그레이션 파일은 이 계획에서 만들지 않는다. `sessions` 테이블은 Phase 1의 `20260904120000_personalization_schema.sql`에 이미 있다.
- 세션 기록의 `mode`는 이 계획에서 항상 `'screen'`이다. `'paper'`는 Phase 3의 인쇄·사진 채점에서 쓴다.

---

### Task 1: 세션 기록 — 오프라인 큐와 저장 함수

한 판이 끝났을 때의 결과를 Dexie 큐에 넣고, 온라인이면 곧바로 `sessions` 테이블로 올린다. 기존 `attemptQueue`/`flushAttemptQueue`와 같은 모양으로 만들어 두 큐가 나란히 놓이게 한다.

**Files:**
- Modify: `apps/web/src/lib/db.ts`
- Modify: `apps/web/src/lib/sync.ts`
- Create: `apps/web/src/lib/sync.test.ts`
- Modify: `apps/web/src/app/App.tsx`

**Interfaces:**
- Consumes: `db` / `setMeta` (`@/lib/db`), `supabase` (`@/lib/supabase`)
- Produces:
  - `interface QueuedSession { localId?: number; profileId: string; lessonId: string | null; activityKind: string; mode: 'screen' | 'paper'; durationSec: number; totalCount: number; correctCount: number; meta: Record<string, unknown>; createdAt: string; synced: 0 | 1 }`
  - `db.sessionQueue` (Dexie 테이블)
  - `toSessionRow(q: QueuedSession)` — 큐 항목을 `sessions` insert 모양으로 바꾸는 순수 함수
  - `flushSessionQueue(): Promise<number>`
  - `queueSession(input: Omit<QueuedSession, 'localId' | 'synced'>): Promise<void>` — 큐에 넣고 곧바로 flush 를 시도한다

- [ ] **Step 1: 큐 테이블과 타입 추가**

`apps/web/src/lib/db.ts` 의 `QueuedAttempt` 인터페이스 **바로 아래**에 추가:

```typescript
/**
 * 한 판(활동 한 번)의 요약. 온라인 복귀 시 sessions 테이블로 flush 된다.
 * 문항 단위 기록(attemptQueue)과 달리, 런타임으로 문제를 만드는 활동은
 * problems 행이 없어 attempts 에 남길 수 없으므로 이 요약이 유일한 기록이다.
 */
export interface QueuedSession {
  localId?: number;
  profileId: string;
  lessonId: string | null;
  activityKind: string;
  mode: 'screen' | 'paper';
  durationSec: number;
  totalCount: number;
  correctCount: number;
  meta: Record<string, unknown>;
  createdAt: string;
  synced: 0 | 1;
}
```

같은 파일의 `DailyGlowDB` 클래스에서 필드 선언에 한 줄 추가하고, 생성자에 버전 2를 덧붙인다. **버전 1 블록은 지우지 않는다** — 이미 브라우저에 버전 1 DB 가 만들어져 있어서, 지우면 기존 사용자의 DB 가 열리지 않는다.

```typescript
export class DailyGlowDB extends Dexie {
  lessons!: EntityTable<CachedLesson, 'id'>;
  problems!: EntityTable<CachedProblem, 'id'>;
  attemptQueue!: EntityTable<QueuedAttempt, 'localId'>;
  sessionQueue!: EntityTable<QueuedSession, 'localId'>;
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
    // 버전 2: 세션 요약 큐 추가. 기존 테이블은 그대로 둔다.
    this.version(2).stores({
      sessionQueue: '++localId, synced, profileId',
    });
  }
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`apps/web/src/lib/sync.test.ts`:

```typescript
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
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `pnpm --filter @dailyglow/web test -- sync`
Expected: FAIL — `flushSessionQueue`, `queueSession`, `toSessionRow` 가 없다.

- [ ] **Step 4: 구현**

`apps/web/src/lib/sync.ts` 의 `flushAttemptQueue` **아래**, `bindSyncListeners` **위**에 추가:

```typescript
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
```

같은 파일 맨 위의 import 에 `QueuedSession` 타입을 더한다:

```typescript
import { db, type QueuedSession } from './db';
```

그리고 `bindSyncListeners` 의 online 핸들러에서 세션 큐도 함께 비운다:

```typescript
  window.addEventListener('online', () => {
    void flushAttemptQueue();
    void flushSessionQueue();
  });
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm --filter @dailyglow/web test -- sync`
Expected: PASS — 7개 테스트 통과.

- [ ] **Step 6: 로그인 시 세션 큐도 비우도록 App 연결**

`apps/web/src/app/App.tsx` 에서 `flushAttemptQueue` import 를 다음으로 바꾸고:

```typescript
import { flushAttemptQueue, flushSessionQueue } from '@/lib/sync';
```

`status === 'signed-in'` 인 `useEffect` 본문을 다음으로 바꾼다:

```typescript
  useEffect(() => {
    if (status !== 'signed-in') return;
    void flushAttemptQueue();
    void flushSessionQueue();
  }, [status]);
```

- [ ] **Step 7: 전체 검사와 커밋**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: 전부 PASS.

```bash
git add apps/web/src/lib/db.ts apps/web/src/lib/sync.ts apps/web/src/lib/sync.test.ts apps/web/src/app/App.tsx
git commit -m "feat(web): 한 판의 기록을 오프라인 큐로 남긴다"
```

---

### Task 2: 활동 레지스트리와 활동 화면

`activity_kind`(또는 `config.renderer`)로 컴포넌트를 고르는 레지스트리를 만들고, 지금의 자리표시자 페이지를 진짜 활동 화면으로 바꾼다. 이 작업이 끝난 시점에는 **등록된 렌더러가 아직 하나도 없어서** 모든 카드가 여전히 "준비 중"을 보여준다 — 구조만 갈아끼우는 단계다.

**Files:**
- Create: `apps/web/src/activities/types.ts`
- Create: `apps/web/src/activities/registry.ts`
- Create: `apps/web/src/activities/registry.test.ts`
- Create: `apps/web/src/pages/ActivityPage.tsx`
- Create: `apps/web/src/pages/ActivityPage.test.tsx`
- Modify: `apps/web/src/app/router.tsx`
- Delete: `apps/web/src/pages/ActivityPlaceholderPage.tsx`

**Interfaces:**
- Consumes: `queueSession` (Task 1), `useProfile` (`@/stores/profile`), `supabase` (`@/lib/supabase`)
- Produces:
  - `interface ActivityLesson { id: string; title: string; activity_kind: string; config: unknown }`
  - `interface ActivityResult { totalCount: number; correctCount: number; durationSec: number; meta?: Record<string, unknown> }`
  - `interface ActivityProps { lesson: ActivityLesson; onFinish: (result: ActivityResult) => void }`
  - `resolveRendererId(lesson: ActivityLesson): string`
  - `ACTIVITY_RENDERERS: Record<string, ComponentType<ActivityProps>>`

- [ ] **Step 1: 타입 파일 작성**

`apps/web/src/activities/types.ts`:

```typescript
import type { ComponentType } from 'react';

/** 활동 렌더러가 알아야 하는 최소한의 레슨 정보 */
export interface ActivityLesson {
  id: string;
  title: string;
  activity_kind: string;
  /** lessons.config (jsonb). 활동마다 필요한 설정이 다르다. */
  config: unknown;
}

/** 한 판을 끝냈을 때 활동이 돌려주는 결과 */
export interface ActivityResult {
  totalCount: number;
  correctCount: number;
  durationSec: number;
  /** 활동마다 다른 부가 정보. sessions.meta 로 그대로 들어간다. */
  meta?: Record<string, unknown>;
}

/**
 * 모든 활동 렌더러가 받는 props.
 * 활동은 자기 화면만 책임지고, 기록은 onFinish 를 받은 쪽(ActivityPage)이 남긴다.
 */
export interface ActivityProps {
  lesson: ActivityLesson;
  onFinish: (result: ActivityResult) => void;
}

export type ActivityRenderer = ComponentType<ActivityProps>;
```

- [ ] **Step 2: 레지스트리의 실패하는 테스트 작성**

`apps/web/src/activities/registry.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { resolveRendererId } from './registry';
import type { ActivityLesson } from './types';

function lesson(over: Partial<ActivityLesson> = {}): ActivityLesson {
  return { id: 'l1', title: '더하기 놀이', activity_kind: 'choice_quiz', config: {}, ...over };
}

describe('resolveRendererId', () => {
  it('config.renderer 가 있으면 그것을 쓴다', () => {
    expect(resolveRendererId(lesson({ config: { renderer: 'add_play' } }))).toBe('add_play');
  });

  it('config.renderer 가 없으면 activity_kind 를 쓴다', () => {
    expect(resolveRendererId(lesson())).toBe('choice_quiz');
  });

  it('config 가 객체가 아니면 activity_kind 를 쓴다', () => {
    expect(resolveRendererId(lesson({ config: null }))).toBe('choice_quiz');
    expect(resolveRendererId(lesson({ config: 7 }))).toBe('choice_quiz');
  });

  it('renderer 가 빈 문자열이면 activity_kind 를 쓴다', () => {
    expect(resolveRendererId(lesson({ config: { renderer: '' } }))).toBe('choice_quiz');
  });
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `pnpm --filter @dailyglow/web test -- registry`
Expected: FAIL — `Failed to resolve import "./registry"`

- [ ] **Step 4: 레지스트리 구현**

`apps/web/src/activities/registry.ts`:

```typescript
import type { ActivityLesson, ActivityRenderer } from './types';

/**
 * 어떤 컴포넌트로 그릴지 정하는 열쇠.
 *
 * 기본은 activity_kind 지만, 같은 종류 안에서 화면이 전혀 다른 활동이 있다 —
 * 맞춤법 탐험대와 더하기 놀이는 둘 다 choice_quiz 이지만 하나는 문장과 보기,
 * 다른 하나는 그림을 세는 화면이다. 그래서 lessons.config.renderer 로
 * 더 좁게 지정할 수 있게 해 둔다.
 */
export function resolveRendererId(lesson: ActivityLesson): string {
  const config = lesson.config;
  if (config && typeof config === 'object') {
    const renderer = (config as { renderer?: unknown }).renderer;
    if (typeof renderer === 'string' && renderer.length > 0) return renderer;
  }
  return lesson.activity_kind;
}

/**
 * 열쇠 → 컴포넌트. 새 활동을 추가할 때 여기에 한 줄만 더하면 된다.
 * 아직 등록되지 않은 활동은 ActivityPage 가 "준비 중" 화면으로 받아낸다.
 */
export const ACTIVITY_RENDERERS: Record<string, ActivityRenderer> = {};
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm --filter @dailyglow/web test -- registry`
Expected: PASS — 4개 테스트 통과.

- [ ] **Step 6: 활동 화면의 실패하는 테스트 작성**

`apps/web/src/pages/ActivityPage.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityPage } from './ActivityPage';
import { ACTIVITY_RENDERERS } from '@/activities/registry';
import { useProfile, type ProfileRow } from '@/stores/profile';

const h = vi.hoisted(() => ({
  lessonResponse: { data: null as unknown, error: null as unknown },
  queued: [] as unknown[],
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(h.lessonResponse) }) }),
    }),
  },
}));

vi.mock('@/lib/sync', () => ({
  queueSession: (input: unknown) => {
    h.queued.push(input);
    return Promise.resolve();
  },
}));

function profile(): ProfileRow {
  return {
    id: 'u1',
    display_name: '정시윤',
    given_name: '시윤',
    gender: 'female',
    birth_date: '2021-03-20',
    grade: 'preschool',
    reading_level: 'learning',
    daily_goal_minutes: 5,
    onboarded_at: '2026-09-04T00:00:00Z',
    avatar_key: null,
    total_xp: 0,
    created_at: '2026-09-04T00:00:00Z',
  } as ProfileRow;
}

function renderAt(lessonId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/activity/${lessonId}`]}>
        <Routes>
          <Route path="/activity/:lessonId" element={<ActivityPage />} />
          <Route path="/" element={<p>홈 화면</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ActivityPage', () => {
  beforeEach(() => {
    h.lessonResponse = { data: null, error: null };
    h.queued = [];
    for (const key of Object.keys(ACTIVITY_RENDERERS)) delete ACTIVITY_RENDERERS[key];
    useProfile.setState({ profile: profile(), levels: {}, status: 'ready' });
  });

  it('등록된 렌더러가 없으면 준비 중 화면을 보여준다', async () => {
    h.lessonResponse = {
      data: { id: 'l1', title: '문장 읽기', activity_kind: 'reading_cards', config: {} },
      error: null,
    };
    renderAt('l1');
    expect(await screen.findByText(/곧 만들어질 공부예요/)).toBeInTheDocument();
  });

  it('등록된 렌더러가 있으면 그 활동을 그린다', async () => {
    ACTIVITY_RENDERERS.add_play = () => <p>더하기 화면</p>;
    h.lessonResponse = {
      data: {
        id: 'l2',
        title: '더하기 놀이',
        activity_kind: 'choice_quiz',
        config: { renderer: 'add_play' },
      },
      error: null,
    };
    renderAt('l2');
    expect(await screen.findByText('더하기 화면')).toBeInTheDocument();
  });

  it('활동이 끝나면 결과를 기록한다', async () => {
    ACTIVITY_RENDERERS.add_play = ({ onFinish }) => (
      <button onClick={() => onFinish({ totalCount: 10, correctCount: 8, durationSec: 42 })}>
        끝내기
      </button>
    );
    h.lessonResponse = {
      data: {
        id: 'l2',
        title: '더하기 놀이',
        activity_kind: 'choice_quiz',
        config: { renderer: 'add_play' },
      },
      error: null,
    };
    renderAt('l2');
    fireEvent.click(await screen.findByRole('button', { name: '끝내기' }));
    await waitFor(() => expect(h.queued).toHaveLength(1));
    const rec = h.queued[0] as Record<string, unknown>;
    expect(rec.profileId).toBe('u1');
    expect(rec.lessonId).toBe('l2');
    expect(rec.activityKind).toBe('choice_quiz');
    expect(rec.mode).toBe('screen');
    expect(rec.totalCount).toBe(10);
    expect(rec.correctCount).toBe(8);
    expect(rec.durationSec).toBe(42);
  });

  it('없는 레슨이면 안내를 보여준다', async () => {
    h.lessonResponse = { data: null, error: null };
    renderAt('nope');
    expect(await screen.findByText(/찾을 수 없어요/)).toBeInTheDocument();
  });

  it('불러오다 실패하면 연결 문제라고 알려준다', async () => {
    h.lessonResponse = { data: null, error: { message: '네트워크 오류' } };
    renderAt('l1');
    expect(await screen.findByText(/연결이 잘 안 돼요/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: 테스트가 실패하는지 확인**

Run: `pnpm --filter @dailyglow/web test -- ActivityPage`
Expected: FAIL — `Failed to resolve import "./ActivityPage"`

- [ ] **Step 8: 활동 화면 구현**

`apps/web/src/pages/ActivityPage.tsx`:

```tsx
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card } from '@dailyglow/ui';
import { ACTIVITY_RENDERERS, resolveRendererId } from '@/activities/registry';
import type { ActivityLesson, ActivityResult } from '@/activities/types';
import { useProfile } from '@/stores/profile';
import { queueSession } from '@/lib/sync';
import { supabase } from '@/lib/supabase';

/** 가운데 정렬된 안내 카드 — 로딩·오류·준비 중이 같은 모양을 쓴다. */
function Notice({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <Card className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="text-6xl">{emoji}</span>
        <h1 className="text-2xl font-bold text-glow-600">{title}</h1>
        <p className="text-slate-500">{body}</p>
        <Link to="/">
          <Button size="lg">홈으로</Button>
        </Link>
      </Card>
    </div>
  );
}

export function ActivityPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const profile = useProfile((s) => s.profile);

  const {
    data: lesson,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['activity-lesson', lessonId],
    enabled: Boolean(lessonId),
    queryFn: async (): Promise<ActivityLesson | null> => {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, activity_kind, config')
        .eq('id', lessonId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  function onFinish(result: ActivityResult) {
    if (!profile || !lesson) return;
    void queueSession({
      profileId: profile.id,
      lessonId: lesson.id,
      activityKind: lesson.activity_kind,
      mode: 'screen',
      durationSec: result.durationSec,
      totalCount: result.totalCount,
      correctCount: result.correctCount,
      meta: result.meta ?? {},
      createdAt: new Date().toISOString(),
    });
  }

  if (isPending) return <Notice emoji="⏳" title="잠깐만요" body="공부를 불러오는 중이에요." />;
  if (isError)
    return (
      <Notice
        emoji="📡"
        title="지금 연결이 잘 안 돼요"
        body="잠시 뒤에 다시 열어봐 주세요."
      />
    );
  if (!lesson)
    return <Notice emoji="🔍" title="찾을 수 없어요" body="이 공부는 지금 없는 것 같아요." />;

  const Renderer = ACTIVITY_RENDERERS[resolveRendererId(lesson)];
  if (!Renderer)
    return (
      <Notice
        emoji="🚧"
        title="곧 만들어질 공부예요"
        body="이 활동은 다음 단계에서 만들어져요. 조금만 기다려 주세요!"
      />
    );

  return <Renderer lesson={lesson} onFinish={onFinish} />;
}
```

- [ ] **Step 9: 라우터 연결과 자리표시자 삭제**

`apps/web/src/app/router.tsx` 에서 import 를 바꾼다:

```tsx
import { ActivityPage } from '@/pages/ActivityPage';
```

(`ActivityPlaceholderPage` import 줄은 지운다.) 그리고 라우트를 바꾼다:

```tsx
              { path: 'activity/:lessonId', element: <ActivityPage /> },
```

그다음 더 이상 쓰이지 않는 파일을 지운다:

```bash
git rm apps/web/src/pages/ActivityPlaceholderPage.tsx
```

- [ ] **Step 10: 테스트 통과 확인과 커밋**

Run: `pnpm --filter @dailyglow/web test -- ActivityPage`
Expected: PASS — 5개 테스트 통과.

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: 전부 PASS.

```bash
git add apps/web/src/activities apps/web/src/pages/ActivityPage.tsx apps/web/src/pages/ActivityPage.test.tsx apps/web/src/app/router.tsx
git commit -m "feat(web): 활동 레지스트리와 활동 화면을 놓는다"
```

---

### Task 3: 더하기 문제 생성기와 힌트

문제를 만드는 규칙과 3차에 보여줄 힌트 문구를 순수 함수로 분리한다. 화면 없이 규칙을 굳혀두면 다음 작업들이 UI 에만 집중할 수 있다.

**Files:**
- Create: `apps/web/src/activities/add-play/generate.ts`
- Create: `apps/web/src/activities/add-play/generate.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 함수)
- Produces:
  - `type AddSetting = 0 | 1 | 2 | 3` (0 = 섞어서)
  - `interface AddProblem { a: number; b: number; answer: number; icon: string; choices: number[] }`
  - `const ADD_SETTINGS: readonly { setting: AddSetting; name: string; icon: string; desc: string }[]`
  - `makeAddProblem(setting: AddSetting, rand?: () => number): AddProblem`
  - `addHint(p: AddProblem): string` — 3차에 띄울 이어세기 안내 문구

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/activities/add-play/generate.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { ADD_SETTINGS, addHint, makeAddProblem, type AddSetting } from './generate';

/** 정해둔 값을 차례로 돌려주는 가짜 난수. 결과가 결정적이 된다. */
function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

describe('makeAddProblem', () => {
  it('더하는 수는 고른 설정 그대로다', () => {
    for (const setting of [1, 2, 3] as AddSetting[]) {
      expect(makeAddProblem(setting, seq([0])).b).toBe(setting);
    }
  });

  it('섞어서(0)를 고르면 1~3 중 하나가 나온다', () => {
    for (let i = 0; i < 20; i += 1) {
      expect([1, 2, 3]).toContain(makeAddProblem(0).b);
    }
  });

  it('앞의 수는 1~5 사이다', () => {
    for (let i = 0; i < 50; i += 1) {
      const p = makeAddProblem(0);
      expect(p.a).toBeGreaterThanOrEqual(1);
      expect(p.a).toBeLessThanOrEqual(5);
    }
  });

  it('정답은 두 수의 합이다', () => {
    for (let i = 0; i < 50; i += 1) {
      const p = makeAddProblem(0);
      expect(p.answer).toBe(p.a + p.b);
    }
  });

  it('보기는 항상 서로 다른 3개이고 정답을 포함한다', () => {
    for (let i = 0; i < 100; i += 1) {
      const p = makeAddProblem(0);
      expect(p.choices).toHaveLength(3);
      expect(new Set(p.choices).size).toBe(3);
      expect(p.choices).toContain(p.answer);
    }
  });

  it('보기는 모두 1~10 사이다', () => {
    for (let i = 0; i < 100; i += 1) {
      for (const c of makeAddProblem(0).choices) {
        expect(c).toBeGreaterThanOrEqual(1);
        expect(c).toBeLessThanOrEqual(10);
      }
    }
  });

  it('같은 난수를 주면 같은 문제가 나온다', () => {
    const a = makeAddProblem(2, seq([0.1, 0.4, 0.7, 0.2, 0.9]));
    const b = makeAddProblem(2, seq([0.1, 0.4, 0.7, 0.2, 0.9]));
    expect(a).toEqual(b);
  });

  it('그림은 고른 설정에 딸린 것을 쓴다', () => {
    expect(makeAddProblem(1, seq([0])).icon).toBe('⭐');
    expect(makeAddProblem(2, seq([0])).icon).toBe('🍎');
    expect(makeAddProblem(3, seq([0])).icon).toBe('🎈');
    expect(makeAddProblem(0, seq([0])).icon).toBe('🧸');
  });
});

describe('addHint', () => {
  it('앞의 수에서 이어서 세는 법을 알려준다', () => {
    expect(addHint({ a: 3, b: 2, answer: 5, icon: '🍎', choices: [] })).toBe(
      '3에서 시작해서 4, 5 — 이렇게 2만큼 더 세어봐요.',
    );
  });

  it('1을 더할 때는 다음 수 하나만 말한다', () => {
    expect(addHint({ a: 4, b: 1, answer: 5, icon: '⭐', choices: [] })).toBe(
      '4에서 시작해서 5 — 이렇게 1만큼 더 세어봐요.',
    );
  });

  it('3을 더할 때는 세 수를 이어서 말한다', () => {
    expect(addHint({ a: 2, b: 3, answer: 5, icon: '🎈', choices: [] })).toBe(
      '2에서 시작해서 3, 4, 5 — 이렇게 3만큼 더 세어봐요.',
    );
  });
});

describe('ADD_SETTINGS', () => {
  it('네 가지를 한국어 이름과 함께 내놓는다', () => {
    expect(ADD_SETTINGS).toHaveLength(4);
    expect(ADD_SETTINGS.map((s) => s.setting)).toEqual([1, 2, 3, 0]);
    expect(ADD_SETTINGS[0]!.name).toBe('하나 더하기');
    expect(ADD_SETTINGS[3]!.name).toBe('섞어서 하기');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm --filter @dailyglow/web test -- generate`
Expected: FAIL — `Failed to resolve import "./generate"`

- [ ] **Step 3: 구현**

`apps/web/src/activities/add-play/generate.ts`:

```typescript
/**
 * 더하기 놀이의 문제 만들기.
 *
 * 기존 시윤이 앱(단일 HTML)의 규칙을 그대로 옮기되, 보기를 고르는 부분만 바꿨다.
 * 원본은 서로 다른 보기 3개가 모일 때까지 난수를 계속 뽑는 while 문이라
 * 난수를 주입해 검사하기 어려웠다. 여기서는 후보를 모두 만든 뒤 섞어서 고른다.
 */

/** 0 은 "섞어서", 1~3 은 그 수만 더한다. */
export type AddSetting = 0 | 1 | 2 | 3;

export interface AddProblem {
  /** 앞의 수 */
  a: number;
  /** 더하는 수 */
  b: number;
  answer: number;
  /** 개수를 세는 데 쓰는 그림 */
  icon: string;
  /** 보기 3개. 정답 하나와 가까운 오답 둘. */
  choices: number[];
}

const ICONS: Record<AddSetting, string> = { 1: '⭐', 2: '🍎', 3: '🎈', 0: '🧸' };

export const ADD_SETTINGS = [
  { setting: 1 as AddSetting, name: '하나 더하기', icon: '⭐', desc: '1을 더해요' },
  { setting: 2 as AddSetting, name: '둘 더하기', icon: '🍎', desc: '2를 더해요' },
  { setting: 3 as AddSetting, name: '셋 더하기', icon: '🎈', desc: '3을 더해요' },
  { setting: 0 as AddSetting, name: '섞어서 하기', icon: '🧸', desc: '1, 2, 3을 섞어서' },
] as const;

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function makeAddProblem(
  setting: AddSetting,
  rand: () => number = Math.random,
): AddProblem {
  const b = setting === 0 ? ([1, 2, 3][Math.floor(rand() * 3)] as number) : setting;
  const a = 1 + Math.floor(rand() * 5);
  const answer = a + b;

  // 정답 바로 옆 수들만 오답으로 쓴다. 1~10 을 벗어나는 것은 버린다.
  // answer 는 2~8 이라 후보가 최소 3개는 남으므로 항상 2개를 고를 수 있다.
  const pool = [-2, -1, 1, 2].map((d) => answer + d).filter((c) => c >= 1 && c <= 10);
  const wrong = shuffle(pool, rand).slice(0, 2);

  return { a, b, answer, icon: ICONS[setting], choices: shuffle([answer, ...wrong], rand) };
}

/**
 * 3차(힌트 라운드)에 띄울 안내. 이어세기를 그대로 읽어준다 —
 * 5세에게는 "3 더하기 2" 보다 "3 다음에 4, 5" 가 훨씬 잡힌다.
 */
export function addHint(p: AddProblem): string {
  const steps = Array.from({ length: p.b }, (_, i) => p.a + i + 1).join(', ');
  return `${p.a}에서 시작해서 ${steps} — 이렇게 ${p.b}만큼 더 세어봐요.`;
}
```

- [ ] **Step 4: 테스트 통과 확인과 커밋**

Run: `pnpm --filter @dailyglow/web test -- generate`
Expected: PASS — 12개 테스트 통과.

```bash
git add apps/web/src/activities/add-play
git commit -m "feat(web): 더하기 문제 생성기와 이어세기 힌트"
```

---

### Task 4: 3단계 풀이 흐름

**한 판을 어떻게 굴릴지**를 화면과 분리된 순수 상태 기계로 만든다. spec §14 의 규칙이다 — 1차에 쭉 풀고 채점, 2차에 오답만, 3차엔 힌트를 띄우고 맞힐 때까지. 맞춤법 탐험대도 나중에 이 모듈을 그대로 쓴다.

**Files:**
- Create: `apps/web/src/activities/quiz-flow.ts`
- Create: `apps/web/src/activities/quiz-flow.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 함수)
- Produces:
  - `interface QuizState { total: number; round: 1 | 2 | 3; phase: 'solving' | 'grading' | 'done'; queue: number[]; cursor: number; missed: number[]; firstTryCorrect: number; roundScores: number[] }`
  - `createQuiz(total: number): QuizState`
  - `currentIndex(s: QuizState): number | null`
  - `submit(s: QuizState, isCorrect: boolean): QuizState`
  - `nextRound(s: QuizState): QuizState`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/activities/quiz-flow.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { createQuiz, currentIndex, nextRound, submit, type QuizState } from './quiz-flow';

/** 정답/오답 배열대로 한 라운드를 쭉 푼다. */
function solveRound(start: QuizState, results: boolean[]): QuizState {
  return results.reduce((s, ok) => submit(s, ok), start);
}

describe('createQuiz', () => {
  it('1차에 전체 문제를 순서대로 낸다', () => {
    const s = createQuiz(3);
    expect(s.round).toBe(1);
    expect(s.phase).toBe('solving');
    expect(s.queue).toEqual([0, 1, 2]);
    expect(currentIndex(s)).toBe(0);
  });
});

describe('1차', () => {
  it('틀려도 다음 문제로 넘어간다', () => {
    let s = createQuiz(3);
    s = submit(s, false);
    expect(currentIndex(s)).toBe(1);
    expect(s.phase).toBe('solving');
  });

  it('다 풀면 채점 화면으로 간다', () => {
    const s = solveRound(createQuiz(3), [true, false, true]);
    expect(s.phase).toBe('grading');
    expect(s.missed).toEqual([1]);
    expect(s.roundScores).toEqual([2]);
  });

  it('점수는 1차에 맞힌 개수다', () => {
    const s = solveRound(createQuiz(3), [true, false, true]);
    expect(s.firstTryCorrect).toBe(2);
  });

  it('다 맞히면 채점 뒤 바로 끝난다', () => {
    let s = solveRound(createQuiz(3), [true, true, true]);
    expect(s.phase).toBe('grading');
    expect(s.missed).toEqual([]);
    s = nextRound(s);
    expect(s.phase).toBe('done');
    expect(s.firstTryCorrect).toBe(3);
  });
});

describe('2차', () => {
  it('1차에 틀린 문제만 낸다', () => {
    let s = solveRound(createQuiz(4), [true, false, false, true]);
    s = nextRound(s);
    expect(s.round).toBe(2);
    expect(s.phase).toBe('solving');
    expect(s.queue).toEqual([1, 2]);
    expect(currentIndex(s)).toBe(1);
  });

  it('여기서 맞혀도 점수는 안 오른다', () => {
    let s = solveRound(createQuiz(3), [true, false, false]);
    s = nextRound(s);
    s = solveRound(s, [true, true]);
    expect(s.firstTryCorrect).toBe(1);
    expect(s.roundScores).toEqual([1, 2]);
  });

  it('여기서도 틀리면 3차로 넘어간다', () => {
    let s = solveRound(createQuiz(3), [true, false, false]);
    s = nextRound(s);
    s = solveRound(s, [true, false]);
    expect(s.phase).toBe('grading');
    expect(s.missed).toEqual([2]);
    s = nextRound(s);
    expect(s.round).toBe(3);
    expect(s.queue).toEqual([2]);
  });

  it('2차를 다 맞히면 끝난다', () => {
    let s = solveRound(createQuiz(3), [true, false, false]);
    s = nextRound(s);
    s = solveRound(s, [true, true]);
    s = nextRound(s);
    expect(s.phase).toBe('done');
  });
});

describe('3차', () => {
  function reach3(): QuizState {
    let s = solveRound(createQuiz(2), [false, true]);
    s = nextRound(s);
    s = submit(s, false);
    return nextRound(s);
  }

  it('틀리면 같은 문제에 머문다', () => {
    let s = reach3();
    expect(currentIndex(s)).toBe(0);
    s = submit(s, false);
    expect(currentIndex(s)).toBe(0);
    expect(s.phase).toBe('solving');
  });

  it('맞히면 다음으로 넘어가고, 다 맞히면 끝난다', () => {
    let s = reach3();
    s = submit(s, true);
    expect(s.phase).toBe('done');
  });

  it('3차에 맞혀도 점수는 1차 것 그대로다', () => {
    let s = reach3();
    s = submit(s, true);
    expect(s.firstTryCorrect).toBe(1);
  });
});

describe('currentIndex', () => {
  it('풀 게 없으면 null 이다', () => {
    const s = solveRound(createQuiz(1), [true]);
    expect(currentIndex(s)).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm --filter @dailyglow/web test -- quiz-flow`
Expected: FAIL — `Failed to resolve import "./quiz-flow"`

- [ ] **Step 3: 구현**

`apps/web/src/activities/quiz-flow.ts`:

```typescript
/**
 * 정답이 있는 활동(choice_quiz)의 한 판을 굴리는 상태 기계. spec §14.
 *
 *   1차  전체를 쭉 푼다 — 맞았는지 그때그때 알려주지 않는다
 *   2차  1차에 틀린 것만 다시
 *   3차  2차에도 틀린 것에 힌트를 띄우고, 맞힐 때까지
 *
 * 점수(firstTryCorrect)는 1차 것만 센다. 2·3차에 맞힌 건 "결국 이해했다"는
 * 뜻이지 실력 수치가 아니다.
 *
 * 화면과 문제 내용을 전혀 모른다 — 맞았는지 여부만 받는다. 그래서 더하기 놀이와
 * 맞춤법 탐험대가 같은 모듈을 쓴다.
 */

export interface QuizState {
  /** 1차에 낸 문제 수 */
  total: number;
  round: 1 | 2 | 3;
  phase: 'solving' | 'grading' | 'done';
  /** 이번 라운드에 풀 문제의 index 목록 */
  queue: number[];
  /** queue 안에서의 위치 */
  cursor: number;
  /** 이번 라운드에서 틀린 문제 index */
  missed: number[];
  /** 1차 정답 개수 = 기록에 남는 점수 */
  firstTryCorrect: number;
  /** 라운드별 정답 개수. "7개 → 9개 → 10개" 를 보여주는 데 쓴다. */
  roundScores: number[];
}

export function createQuiz(total: number): QuizState {
  return {
    total,
    round: 1,
    phase: 'solving',
    queue: Array.from({ length: total }, (_, i) => i),
    cursor: 0,
    missed: [],
    firstTryCorrect: 0,
    roundScores: [],
  };
}

/** 지금 풀 문제의 index. 이번 라운드를 다 풀었으면 null. */
export function currentIndex(s: QuizState): number | null {
  if (s.phase !== 'solving') return null;
  return s.queue[s.cursor] ?? null;
}

export function submit(s: QuizState, isCorrect: boolean): QuizState {
  if (s.phase !== 'solving') return s;
  const index = s.queue[s.cursor];
  if (index === undefined) return s;

  // 3차는 맞힐 때까지 같은 문제에 머문다.
  if (s.round === 3 && !isCorrect) return s;

  const missed = isCorrect ? s.missed : [...s.missed, index];
  const cursor = s.cursor + 1;
  const firstTryCorrect =
    s.round === 1 && isCorrect ? s.firstTryCorrect + 1 : s.firstTryCorrect;

  // 아직 남았으면 다음 문제로.
  if (cursor < s.queue.length) {
    return { ...s, cursor, missed, firstTryCorrect };
  }

  const scored = s.queue.length - missed.length;
  const roundScores = [...s.roundScores, scored];

  // 3차는 전부 맞혀야만 여기 도달하므로 곧바로 끝난다.
  if (s.round === 3) {
    return { ...s, cursor, missed, firstTryCorrect, roundScores, phase: 'done' };
  }

  return { ...s, cursor, missed, firstTryCorrect, roundScores, phase: 'grading' };
}

/** 채점 화면에서 "계속" 을 눌렀을 때. 틀린 게 없으면 끝난다. */
export function nextRound(s: QuizState): QuizState {
  if (s.phase !== 'grading') return s;
  if (s.missed.length === 0) return { ...s, phase: 'done' };

  return {
    ...s,
    round: (s.round + 1) as 2 | 3,
    phase: 'solving',
    queue: s.missed,
    cursor: 0,
    missed: [],
  };
}
```

- [ ] **Step 4: 테스트 통과 확인과 커밋**

Run: `pnpm --filter @dailyglow/web test -- quiz-flow`
Expected: PASS — 13개 테스트 통과.

```bash
git add apps/web/src/activities/quiz-flow.ts apps/web/src/activities/quiz-flow.test.ts
git commit -m "feat(web): 문제 풀이 활동의 3단계 흐름"
```

---

### Task 5: 더하기 놀이 화면

Task 3 의 문제와 Task 4 의 흐름을 화면에 붙인다.

**Files:**
- Create: `apps/web/src/lib/confetti.ts`
- Modify: `apps/web/src/styles/index.css`
- Create: `apps/web/src/activities/add-play/AddPlayActivity.tsx`
- Create: `apps/web/src/activities/add-play/AddPlayActivity.test.tsx`
- Modify: `apps/web/src/activities/registry.ts`
- Modify: `supabase/seed.sql`

**Interfaces:**
- Consumes: `ActivityProps` / `ActivityResult` (Task 2), `makeAddProblem` / `addHint` / `ADD_SETTINGS` / `AddSetting` / `AddProblem` (Task 3), `createQuiz` / `currentIndex` / `submit` / `nextRound` / `QuizState` (Task 4), `useProfile` (`@/stores/profile`)
- Produces: `AddPlayActivity`, `ACTIVITY_RENDERERS.add_play`, `spawnConfetti(count?: number): void`

- [ ] **Step 1: 컨페티 유틸과 애니메이션 추가**

`apps/web/src/lib/confetti.ts`:

```typescript
/**
 * 화면 위에서 이모지가 떨어지는 짧은 축하 효과.
 * 기존 시윤이 앱에 있던 것을 그대로 옮겼다. 3초 뒤 스스로 사라진다.
 */
const EMOJIS = ['🎉', '✨', '❤️', '🎈', '🌈', '💛'];

export function spawnConfetti(count = 14): void {
  if (typeof document === 'undefined') return;
  for (let i = 0; i < count; i += 1) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]!;
    el.style.left = `${Math.random() * 100}vw`;
    el.style.animationDuration = `${1.6 + Math.random() * 1.2}s`;
    el.style.fontSize = `${16 + Math.random() * 14}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}
```

`apps/web/src/styles/index.css` 맨 아래에 추가:

```css
/* 축하 이모지가 위에서 떨어지는 효과 (lib/confetti.ts 가 쓴다) */
.confetti {
  position: fixed;
  top: -20px;
  z-index: 50;
  pointer-events: none;
  animation-name: confetti-fall;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

@keyframes confetti-fall {
  to {
    transform: translateY(110vh) rotate(360deg);
    opacity: 0.9;
  }
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`apps/web/src/activities/add-play/AddPlayActivity.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddPlayActivity } from './AddPlayActivity';
import { useProfile, type ProfileRow } from '@/stores/profile';
import type { ActivityLesson, ActivityResult } from '@/activities/types';

vi.mock('@/lib/confetti', () => ({ spawnConfetti: () => {} }));

const lesson: ActivityLesson = {
  id: 'l1',
  title: '더하기 놀이',
  activity_kind: 'choice_quiz',
  config: { renderer: 'add_play' },
};

function profile(readingLevel: string): ProfileRow {
  return {
    id: 'u1',
    display_name: '정시윤',
    given_name: '시윤',
    gender: 'female',
    birth_date: '2021-03-20',
    grade: 'preschool',
    reading_level: readingLevel,
    daily_goal_minutes: 5,
    onboarded_at: '2026-09-04T00:00:00Z',
    avatar_key: null,
    total_xp: 0,
    created_at: '2026-09-04T00:00:00Z',
  } as ProfileRow;
}

function renderActivity(onFinish: (r: ActivityResult) => void = () => {}) {
  return render(
    <MemoryRouter>
      <AddPlayActivity lesson={lesson} onFinish={onFinish} />
    </MemoryRouter>,
  );
}

function start() {
  fireEvent.click(screen.getByRole('button', { name: /하나 더하기/ }));
}

/** 지금 화면의 식에서 정답을 계산한다. */
function answerNow(): number {
  const eq = screen.getByTestId('equation').textContent ?? '';
  const [, a, b] = eq.match(/(\d+)\s*\+\s*(\d+)/) ?? [];
  return Number(a) + Number(b);
}

function clickCorrect() {
  fireEvent.click(screen.getByRole('button', { name: String(answerNow()) }));
}

function clickWrong() {
  const answer = String(answerNow());
  const wrong = screen
    .getAllByTestId('choice')
    .find((el) => el.textContent !== answer) as HTMLElement;
  fireEvent.click(wrong);
}

/** 채점 화면의 "계속" 버튼 */
function goOn() {
  fireEvent.click(screen.getByRole('button', { name: /계속/ }));
}

describe('AddPlayActivity', () => {
  beforeEach(() => {
    useProfile.setState({ profile: profile('learning'), levels: {}, status: 'ready' });
  });

  it('먼저 무엇을 연습할지 고르게 한다', () => {
    renderActivity();
    expect(screen.getByText(/뭘 연습해볼까/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /섞어서 하기/ })).toBeInTheDocument();
  });

  it('고르면 첫 문제가 나온다', () => {
    renderActivity();
    start();
    expect(screen.getByTestId('equation')).toBeInTheDocument();
    expect(screen.getAllByTestId('choice')).toHaveLength(3);
  });

  it('1차에서는 맞았는지 틀렸는지 알려주지 않고 다음으로 넘어간다', () => {
    renderActivity();
    start();
    const first = screen.getByTestId('equation').textContent;
    clickWrong();
    expect(screen.queryByText(/다시 세어볼까/)).not.toBeInTheDocument();
    expect(screen.getByTestId('equation').textContent).not.toBe(first);
  });

  it('열 문제를 다 풀면 채점 화면이 나온다', () => {
    renderActivity();
    start();
    for (let i = 0; i < 10; i += 1) clickCorrect();
    expect(screen.getByText(/10개 중 10개 맞았어요/)).toBeInTheDocument();
  });

  it('다 맞히면 채점 뒤 바로 끝난다', () => {
    const onFinish = vi.fn<[ActivityResult], void>();
    renderActivity(onFinish);
    start();
    for (let i = 0; i < 10; i += 1) clickCorrect();
    goOn();
    expect(onFinish).toHaveBeenCalled();
    const r = onFinish.mock.calls[0]![0];
    expect(r.totalCount).toBe(10);
    expect(r.correctCount).toBe(10);
  });

  it('틀린 문제만 2차에서 다시 낸다', () => {
    renderActivity();
    start();
    clickWrong();
    for (let i = 0; i < 9; i += 1) clickCorrect();
    expect(screen.getByText(/10개 중 9개 맞았어요/)).toBeInTheDocument();
    goOn();
    expect(screen.getByText(/틀린 문제를 다시 풀어봐요/)).toBeInTheDocument();
    expect(screen.getByTestId('equation')).toBeInTheDocument();
  });

  it('2차에 맞혀도 점수는 1차 것 그대로다', () => {
    const onFinish = vi.fn<[ActivityResult], void>();
    renderActivity(onFinish);
    start();
    clickWrong();
    for (let i = 0; i < 9; i += 1) clickCorrect();
    goOn();
    clickCorrect();
    goOn();
    expect(onFinish).toHaveBeenCalled();
    expect(onFinish.mock.calls[0]![0].correctCount).toBe(9);
  });

  it('3차에는 힌트가 뜨고, 맞힐 때까지 같은 문제가 남는다', () => {
    renderActivity();
    start();
    clickWrong();
    for (let i = 0; i < 9; i += 1) clickCorrect();
    goOn();
    clickWrong();
    goOn();
    expect(screen.getByTestId('hint')).toHaveTextContent(/이렇게 .*만큼 더 세어봐요/);
    const stuck = screen.getByTestId('equation').textContent;
    clickWrong();
    expect(screen.getByText(/다시 세어볼까/)).toBeInTheDocument();
    expect(screen.getByTestId('equation').textContent).toBe(stuck);
  });

  it('3차까지 마치면 라운드별 성적을 보여주고 끝난다', () => {
    const onFinish = vi.fn<[ActivityResult], void>();
    renderActivity(onFinish);
    start();
    clickWrong();
    for (let i = 0; i < 9; i += 1) clickCorrect();
    goOn();
    clickWrong();
    goOn();
    clickCorrect();
    expect(onFinish).toHaveBeenCalled();
    const r = onFinish.mock.calls[0]![0];
    expect(r.correctCount).toBe(9);
    expect(r.meta?.roundScores).toEqual([9, 0, 1]);
    expect(screen.getByText(/9개 맞혔어요/)).toBeInTheDocument();
  });

  it('아직 못 읽는 아이에게는 식을 더 크게 보여준다', () => {
    useProfile.setState({ profile: profile('pre_reader'), levels: {}, status: 'ready' });
    renderActivity();
    start();
    expect(screen.getByTestId('equation')).toHaveClass('text-6xl');
  });

  it('읽을 줄 아는 아이에게는 보통 크기로 보여준다', () => {
    renderActivity();
    start();
    expect(screen.getByTestId('equation')).toHaveClass('text-4xl');
  });
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `pnpm --filter @dailyglow/web test -- AddPlayActivity`
Expected: FAIL — `Failed to resolve import "./AddPlayActivity"`

- [ ] **Step 4: 구현**

`apps/web/src/activities/add-play/AddPlayActivity.tsx`:

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@dailyglow/ui';
import { useProfile } from '@/stores/profile';
import { spawnConfetti } from '@/lib/confetti';
import type { ActivityProps } from '@/activities/types';
import {
  createQuiz,
  currentIndex,
  nextRound,
  submit,
  type QuizState,
} from '@/activities/quiz-flow';
import {
  ADD_SETTINGS,
  addHint,
  makeAddProblem,
  type AddProblem,
  type AddSetting,
} from './generate';

const ROUNDS = 10;
const ROUND_TITLE: Record<number, string> = {
  2: '틀린 문제를 다시 풀어봐요',
  3: '이번엔 힌트를 보고 풀어봐요',
};

export function AddPlayActivity({ onFinish }: ActivityProps) {
  const isPreReader = useProfile((s) => s.profile?.reading_level) === 'pre_reader';

  const [setting, setSetting] = useState<AddSetting | null>(null);
  const [problems, setProblems] = useState<AddProblem[]>([]);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  /** 3차에서 방금 틀렸을 때만 쓰는 안내 */
  const [retryMessage, setRetryMessage] = useState('');

  function begin(chosen: AddSetting) {
    setSetting(chosen);
    setProblems(Array.from({ length: ROUNDS }, () => makeAddProblem(chosen)));
    setQuiz(createQuiz(ROUNDS));
    setStartedAt(Date.now());
    setRetryMessage('');
  }

  function finish(state: QuizState) {
    spawnConfetti();
    onFinish({
      totalCount: state.total,
      correctCount: state.firstTryCorrect,
      durationSec: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      meta: { setting, roundScores: state.roundScores },
    });
  }

  function pick(value: number) {
    if (!quiz) return;
    const index = currentIndex(quiz);
    if (index === null) return;

    const isCorrect = value === problems[index]!.answer;
    // 3차에서 틀리면 같은 문제에 머문다 — 흐름은 submit 이 알아서 처리한다.
    setRetryMessage(quiz.round === 3 && !isCorrect ? '괜찮아요, 다시 세어볼까? 🤔' : '');
    if (isCorrect) spawnConfetti(6);

    const next = submit(quiz, isCorrect);
    setQuiz(next);
    if (next.phase === 'done') finish(next);
  }

  function goOn() {
    if (!quiz) return;
    const next = nextRound(quiz);
    setQuiz(next);
    setRetryMessage('');
    if (next.phase === 'done') finish(next);
  }

  // ── 무엇을 연습할지 고르기 ─────────────────────────────
  if (!quiz || setting === null) {
    return (
      <div className="flex flex-col gap-4">
        <h1
          className={`text-center font-bold text-glow-600 ${isPreReader ? 'text-4xl' : 'text-3xl'}`}
        >
          뭘 연습해볼까?
        </h1>
        <p className="text-center text-slate-500">그림을 보면서 세어봐도 좋아요</p>
        {ADD_SETTINGS.map((s) => (
          <button
            key={s.setting}
            onClick={() => begin(s.setting)}
            className="min-h-touch rounded-3xl bg-white p-5 text-left shadow-lg ring-1 ring-black/5 transition-transform active:scale-95"
          >
            <span className="flex items-center gap-5">
              <span className="text-5xl">{s.icon}</span>
              <span>
                <span
                  className={`block font-bold text-slate-700 ${isPreReader ? 'text-2xl' : 'text-xl'}`}
                >
                  {s.name}
                </span>
                <span className="block text-sm text-slate-400">{s.desc}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    );
  }

  // ── 끝 ────────────────────────────────────────────────
  if (quiz.phase === 'done') {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <span className="text-6xl">🎉➕✨</span>
        <h2 className="text-2xl font-bold text-glow-600">
          10문제 중 {quiz.firstTryCorrect}개 맞혔어요!
        </h2>
        {quiz.roundScores.length > 1 ? (
          <p className="text-slate-500">
            처음엔 {quiz.roundScores[0]}개였는데 끝까지 다 이해했어요. 잘했어요!
          </p>
        ) : (
          <p className="text-slate-500">한 번에 다 맞혔어요. 정말 대단해요!</p>
        )}
        <Link to="/">
          <Button size="lg">홈으로</Button>
        </Link>
      </Card>
    );
  }

  // ── 채점 ──────────────────────────────────────────────
  if (quiz.phase === 'grading') {
    const scored = quiz.roundScores[quiz.roundScores.length - 1] ?? 0;
    const asked = scored + quiz.missed.length;
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <span className="text-6xl">{quiz.missed.length === 0 ? '🎉' : '📋'}</span>
        <h2 className="text-2xl font-bold text-glow-600">
          {asked}개 중 {scored}개 맞았어요!
        </h2>
        <p className="text-slate-500">
          {quiz.missed.length === 0
            ? '다 맞았어요!'
            : `틀린 ${quiz.missed.length}개를 다시 풀어볼까요?`}
        </p>
        <Button size="lg" onClick={goOn}>
          계속하기
        </Button>
      </Card>
    );
  }

  // ── 문제 풀기 ─────────────────────────────────────────
  const index = currentIndex(quiz);
  if (index === null) return null;
  const problem = problems[index]!;
  const done = quiz.cursor;
  const left = quiz.queue.length - quiz.cursor;

  return (
    <div className="flex flex-col gap-5">
      {quiz.round > 1 ? (
        <p className="text-center font-bold text-glow-600">{ROUND_TITLE[quiz.round]}</p>
      ) : null}

      {/* 1·2차에는 정답 여부를 알려주지 않으므로 진행 정도만 보여준다. */}
      <div className="flex flex-wrap justify-center gap-1 text-xl" aria-label="진행">
        {quiz.queue.map((_, i) => (
          <span key={i}>{i < done ? '🐾' : '·'}</span>
        ))}
      </div>

      <Card className="flex flex-col items-center gap-5 text-center">
        <div className="flex min-h-[3.5rem] flex-wrap items-center justify-center gap-3 text-3xl">
          <span className="flex flex-wrap justify-center gap-1 rounded-2xl bg-glow-50 px-3 py-2">
            {Array.from({ length: problem.a }).map((_, i) => (
              <span key={i}>{problem.icon}</span>
            ))}
          </span>
          <span className="text-slate-400">＋</span>
          <span className="flex flex-wrap justify-center gap-1 rounded-2xl bg-glow-50 px-3 py-2">
            {Array.from({ length: problem.b }).map((_, i) => (
              <span key={i}>{problem.icon}</span>
            ))}
          </span>
        </div>

        <div
          data-testid="equation"
          className={`font-bold text-slate-700 ${isPreReader ? 'text-6xl' : 'text-4xl'}`}
        >
          {problem.a} + {problem.b} = ?
        </div>

        {quiz.round === 3 ? (
          <p
            data-testid="hint"
            className="rounded-2xl bg-glow-50 px-4 py-3 text-lg text-glow-700"
          >
            💡 {addHint(problem)}
          </p>
        ) : null}

        <div className="flex justify-center gap-4">
          {problem.choices.map((c) => (
            <button
              key={c}
              data-testid="choice"
              onClick={() => pick(c)}
              className="min-h-touch min-w-touch rounded-3xl bg-glow-100 px-6 text-3xl font-bold text-slate-700 shadow-md transition-transform active:scale-95"
            >
              {c}
            </button>
          ))}
        </div>

        <p className="min-h-[1.75rem] font-bold text-glow-600">
          {retryMessage || (quiz.round === 1 ? `${left}개 남았어요` : '')}
        </p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: 레지스트리에 등록**

`apps/web/src/activities/registry.ts` 의 import 에 한 줄 더하고:

```typescript
import { AddPlayActivity } from './add-play/AddPlayActivity';
```

`ACTIVITY_RENDERERS` 를 다음으로 바꾼다:

```typescript
export const ACTIVITY_RENDERERS: Record<string, ActivityRenderer> = {
  add_play: AddPlayActivity,
};
```

- [ ] **Step 6: seed 와 실제 DB 에 renderer 열쇠 넣기**

`supabase/seed.sql` 의 더하기 놀이 행에서 `config` 를 바꾼다:

```sql
  ('math',   'add-play',      '더하기 놀이',    1, 1, 'choice_quiz',   1,  0, 1, '{"generator":"add_small","renderer":"add_play"}'::jsonb),
```

**돌아가는 DB 는 초기화하지 말고 그 행만 고친다** (사용자의 실제 프로필이 들어 있다):

```bash
docker exec supabase_db_dailyGlow psql -U postgres -d postgres \
  -c "update public.lessons set config = config || jsonb_build_object('renderer','add_play') where slug = 'add-play';"
```

확인:

```bash
docker exec supabase_db_dailyGlow psql -U postgres -d postgres -c "select title, config from public.lessons where slug='add-play';"
```
Expected: `{"renderer": "add_play", "generator": "add_small"}`

- [ ] **Step 7: 테스트 통과 확인과 커밋**

Run: `pnpm --filter @dailyglow/web test -- AddPlayActivity`
Expected: PASS — 11개 테스트 통과.

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: 전부 PASS.

```bash
git add apps/web/src/lib/confetti.ts apps/web/src/styles/index.css apps/web/src/activities supabase/seed.sql
git commit -m "feat(web): 더하기 놀이 화면 — 1차·2차·힌트 3단계"
```

---

### Task 6: 손으로 확인하기

자동 테스트가 못 잡는 것을 브라우저에서 확인한다 — 기록이 실제로 `sessions` 테이블에 들어가는지, 홈의 "오늘의 목표"가 실제로 채워지는지.

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 1~5 전부
- Produces: 없음 (검증과 문서)

- [ ] **Step 1: 기록 전 상태 확인**

Run:
```bash
docker exec supabase_db_dailyGlow psql -U postgres -d postgres -c "select count(*) from public.sessions;"
```
지금까지의 개수를 적어둔다.

- [ ] **Step 2: 개발 서버에서 한 판 해보기**

개발 서버가 이미 떠 있으면 그대로 쓴다 (`http://localhost:3000`). 없으면 `pnpm dev`.

`siyoon@dailyglow.dev` / `glow1234` 로 로그인해 **더하기 놀이** 카드를 누른다.

Expected:
1. "뭘 연습해볼까?" 에 ⭐하나 / 🍎둘 / 🎈셋 / 🧸섞어서 네 개가 보인다.
2. 하나를 고르면 그림·식·보기 3개가 나온다.
3. **일부러 두 개를 틀린다.** 틀려도 ⭕❌ 없이 곧바로 다음 문제로 넘어간다.
4. 열 문제를 다 풀면 **"10개 중 8개 맞았어요!"** 채점 화면이 나온다.
5. 계속하기 → **틀린 2개만** 다시 나온다. "틀린 문제를 다시 풀어봐요" 문구 확인.
6. 그 중 하나를 또 틀린다 → 채점 후 계속하기 → **3차에 💡힌트가 뜬다** ("3에서 시작해서 4, 5 — 이렇게 2만큼 더 세어봐요").
7. 3차에서 일부러 또 틀려본다 → **같은 문제가 그대로 남고** "괜찮아요, 다시 세어볼까? 🤔" 가 뜬다.
8. 맞히면 완료 화면에 **8개**가 나온다 (1차 점수). 2·3차에 맞힌 건 점수에 안 들어간다.

- [ ] **Step 3: 기록이 남았는지 확인**

Run:
```bash
docker exec supabase_db_dailyGlow psql -U postgres -d postgres -c "select p.given_name, s.activity_kind, s.mode, s.duration_sec, s.total_count, s.correct_count, s.meta from public.sessions s join public.profiles p on p.id = s.profile_id order by s.created_at desc limit 3;"
```
Expected: 방금 한 판이 한 행 늘어 있고, `given_name` 이 시윤, `mode` 가 `screen`, `total_count` 가 10, `correct_count` 가 완료 화면의 숫자(8)와 같고, `meta` 에 `roundScores` 가 들어 있다.

- [ ] **Step 4: 홈의 오늘의 목표가 채워졌는지 확인**

홈으로 돌아간다.

Expected: "오늘의 목표" 진행바가 더 이상 `0분 / 5분` 이 아니다. 한 판이 1분 안에 끝났으면 그대로일 수 있으니, 그럴 때는 위 SQL 의 `duration_sec` 합이 60초를 넘는지로 확인한다.

- [ ] **Step 5: 오프라인에서도 기록이 남는지 확인**

브라우저 개발자 도구의 네트워크 탭에서 **오프라인**으로 바꾼 뒤 한 판을 더 한다.

Expected: 완료 화면은 정상적으로 나온다. 다시 **온라인**으로 바꾸면 잠시 뒤 `sessions` 행이 하나 더 늘어 있다.

- [ ] **Step 6: README 갱신**

`README.md` 의 "남은 작업" 목록에서 다음 줄을 찾아 지운다:

```markdown
- [ ] Phase 2: 활동 렌더러 (맞춤법 · 글자/낱말/문장 읽기 · 더하기) + 한글 35단계 시스템
```

그 자리에 다음을 넣는다:

```markdown
- [x] Phase 2a: 활동 실행 구조(레지스트리·세션 기록) + 3단계 풀이 흐름 + 더하기 놀이
- [ ] Phase 2b: 한글 35단계 시스템(자모 분해·최소 단계 자동 계산) + 자음모음 배우기 · 낱말 읽기 · 문장 읽기
- [ ] Phase 2c: 맞춤법 탐험대 (낱말 95쌍 이관, 3단계 흐름 재사용)
```

- [ ] **Step 7: 커밋**

```bash
git add README.md
git commit -m "docs: Phase 2a 완료 — 남은 단계 갱신"
```

---

## 완료 기준

- 홈에서 더하기 놀이 카드를 누르면 실제로 문제를 풀 수 있다.
- 1차에는 정답 여부를 알려주지 않고 열 문제를 쭉 푼 뒤 한꺼번에 채점한다.
- 2차에는 틀린 것만, 3차에는 힌트를 띄우고 맞힐 때까지 — spec §14 의 3단계 흐름대로 동작한다.
- 한 번 틀린 문제는 나중에 맞혀도 점수에 들어가지 않는다 — 완료 화면의 숫자가 실제 실력을 나타낸다.
- 한 판이 끝나면 `sessions` 에 행이 남고, 오프라인이었다면 온라인 복귀 시 올라간다.
- 홈의 "오늘의 목표" 진행바가 실제 기록으로 채워진다.
- 아직 만들지 않은 활동(맞춤법·읽기·쓰기·100칸)은 여전히 "곧 만들어질 공부예요" 화면을 보여준다.
- `pnpm typecheck && pnpm lint && pnpm test` 가 모두 통과한다.

## 다음 단계

Phase 2b 계획서를 따로 쓴다 — 한글 35단계 시스템(자모 분해와 최소 단계 자동 계산)이 먼저이고, 그 위에 자음모음 배우기 · 낱말 읽기 · 문장 읽기가 올라간다. 콘텐츠(낱말·문장) seed 도 그 계획에 포함된다.

Phase 2c 의 맞춤법 탐험대는 Task 4 의 `quiz-flow` 를 그대로 재사용한다. 다른 점은 3차 힌트가
런타임 생성이 아니라 원본 데이터의 보기별 해설이라는 것, 그리고 낱말마다 예문이 2개씩 있어
**2차 복습에서는 1차와 다른 예문으로 묻는다**는 것뿐이다(원본 앱의 `pickTemplateIndex` 동작).

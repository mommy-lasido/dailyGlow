# Phase 1 — 로그인 · 프로필 · 홈 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 세 아이(라윤·시윤·도윤)가 각자 이메일 계정으로 로그인해, 처음이면 프로필을 한 번 입력하고, 자기 학년·읽기 수준·과목별 레벨에 맞는 홈 화면을 본다.

**Architecture:** 기존 `profiles` 테이블을 확장하고 `profile_subject_levels`(과목별 레벨), `sessions`(한 판 요약) 테이블을 추가한다. `lessons`에 `activity_kind`·`subject_level`·학년 범위를 붙여, 홈이 "이 아이에게 보여줄 활동"을 DB 질의 하나로 뽑는다. 프로필 로딩은 zustand 스토어 하나가 담당하고, `RequireProfile` 가드가 온보딩 미완료 사용자를 온보딩 화면으로 보낸다. 활동 렌더러 자체는 Phase 2에서 만들며, 이 단계에서는 활동 카드가 "준비 중" 화면으로 연결된다.

**Tech Stack:** React 18 · TypeScript · Vite 6 · Tailwind · React Router v6 · Zustand · TanStack Query · Supabase (PostgreSQL + Auth + RLS) · Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-09-04-auth-profile-and-app-migration-design.md`

## Global Constraints

- 모든 사용자 대면 문자열은 **한국어**다. 코드 주석도 기존 코드베이스를 따라 한국어로 쓴다.
- 학년은 **생일에서 자동 확정하지 않는다.** 생일은 추천값 제안에만 쓰고 최종 값은 사용자가 고른다. (라윤 2018년생은 계산상 초2가 나오지만 실제로는 초3이다.)
- 새 테이블에는 기존과 동일한 RLS 패턴을 적용한다 — `profile_id = (select auth.uid())` 로 본인 행만 전체 접근.
- 터치 타깃은 `min-h-touch`(3.5rem) 이상. 태블릿 대상이다.
- 파일 경로 별칭은 `@/` → `apps/web/src/`.
- 테스트는 `pnpm test`(vitest run), 타입 검사는 `pnpm typecheck`, 린트는 `pnpm lint`.
- 로컬 DB 명령은 `pnpm db:reset`(마이그레이션+seed 재적용), `pnpm db:types`(DB 타입 재생성). Docker Desktop이 떠 있어야 한다.
- 학년 서수(ordinal): `preschool=0`, `g1=1` … `g6=6`. 이 매핑은 DB와 프론트에서 동일하게 쓴다.

---

### Task 1: 개인화 스키마 마이그레이션

`profiles` 확장, `profile_subject_levels` / `sessions` 신설, `lessons` 확장을 하나의 마이그레이션으로 적용한다.

**Files:**
- Create: `supabase/migrations/20260904120000_personalization_schema.sql`
- Modify: `packages/supabase/src/database.types.ts` (`pnpm db:types` 로 재생성)

**Interfaces:**
- Consumes: 기존 `public.profiles`, `public.subjects`, `public.lessons` (마이그레이션 `20260903121050_init_schema.sql`)
- Produces: 컬럼 `profiles.gender|birth_date|grade|reading_level|daily_goal_minutes|onboarded_at`, 테이블 `public.profile_subject_levels`, `public.sessions`, 컬럼 `lessons.activity_kind|config|subject_level|min_grade|max_grade`, 타입 `Tables<'profile_subject_levels'>`, `Tables<'sessions'>`

- [ ] **Step 1: 마이그레이션 파일 작성**

`supabase/migrations/20260904120000_personalization_schema.sql`:

```sql
-- 개인화 스키마: 프로필 확장 + 과목별 레벨 + 세션 요약 + 활동 종류

-- ─────────────────────────────────────────────
-- 1. profiles 확장
-- ─────────────────────────────────────────────
alter table public.profiles
  add column gender             text check (gender in ('female', 'male')),
  add column birth_date         date,
  add column grade              text check (grade in ('preschool', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6')),
  add column reading_level      text check (reading_level in ('pre_reader', 'learning', 'fluent')),
  add column daily_goal_minutes int not null default 10,
  add column onboarded_at       timestamptz;

-- birth_year(int) 는 birth_date(date) 로 대체한다. 기존 값이 있으면 1월 1일로 옮긴다.
update public.profiles
   set birth_date = make_date(birth_year, 1, 1)
 where birth_year is not null;

alter table public.profiles drop column birth_year;

-- ─────────────────────────────────────────────
-- 2. 과목별 레벨
--    한글 과목에서는 level 이 곧 "기적의 한글 학습" 단계(1~35)다.
--    locked 가 true 면 자동 진급이 일어나지 않는다.
-- ─────────────────────────────────────────────
create table public.profile_subject_levels (
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  subject_id  uuid not null references public.subjects (id) on delete cascade,
  level       int  not null default 1 check (level >= 1),
  locked      boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (profile_id, subject_id)
);

-- ─────────────────────────────────────────────
-- 3. 한 판 요약
--    mode: screen = 화면에서 풀기, paper = 인쇄해서 종이로 풀기.
--    두 기록은 손의 속도가 달라 같은 기준으로 비교하지 않는다.
-- ─────────────────────────────────────────────
create table public.sessions (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  lesson_id     uuid references public.lessons (id) on delete set null,
  activity_kind text not null,
  mode          text not null default 'screen' check (mode in ('screen', 'paper')),
  duration_sec  int,
  total_count   int,
  correct_count int,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index sessions_profile_idx on public.sessions (profile_id, created_at desc);

-- ─────────────────────────────────────────────
-- 4. lessons 에 활동 종류와 노출 조건
--    학년 서수: preschool=0, g1=1 … g6=6
-- ─────────────────────────────────────────────
alter table public.lessons
  add column activity_kind text not null default 'choice_quiz'
    check (activity_kind in ('choice_quiz', 'grid_drill', 'letter_cards', 'word_cards', 'reading_cards', 'worksheet')),
  add column config        jsonb not null default '{}'::jsonb,
  add column subject_level int not null default 1,
  add column min_grade     int  not null default 0 check (min_grade between 0 and 6),
  add column max_grade     int  not null default 6 check (max_grade between 0 and 6);

create index lessons_gate_idx on public.lessons (subject_id, subject_level, min_grade, max_grade);

-- 읽기 활동은 정답이 없다.
alter table public.problems alter column answer drop not null;

-- ─────────────────────────────────────────────
-- 5. RLS — 본인 행만
-- ─────────────────────────────────────────────
alter table public.profile_subject_levels enable row level security;
alter table public.sessions               enable row level security;

create policy "own subject levels" on public.profile_subject_levels
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "own sessions" on public.sessions
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
```

- [ ] **Step 2: 마이그레이션 적용 후 스키마 확인**

Run:
```bash
pnpm db:reset
```
Expected: 에러 없이 완료.

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
select column_name from information_schema.columns
 where table_name='profiles' and column_name in
 ('gender','birth_date','grade','reading_level','daily_goal_minutes','onboarded_at','birth_year')
 order by column_name;"
```
Expected: `birth_date`, `daily_goal_minutes`, `gender`, `grade`, `onboarded_at`, `reading_level` 6행. `birth_year` 는 **없어야** 한다.

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
select tablename, rowsecurity from pg_tables
 where tablename in ('profile_subject_levels','sessions');"
```
Expected: 두 테이블 모두 `rowsecurity = t`.

- [ ] **Step 3: DB 타입 재생성**

Run:
```bash
pnpm db:types
git diff --stat packages/supabase/src/database.types.ts
```
Expected: `database.types.ts` 에 `profile_subject_levels`, `sessions` 가 추가되고 `profiles` 에 새 컬럼이 반영된다.

- [ ] **Step 4: 타입 검사**

Run: `pnpm typecheck`
Expected: PASS. (`birth_year` 를 참조하는 코드가 있으면 여기서 잡힌다. 현재 `HomePage.tsx` 는 `profiles` 를 `select('*')` 로만 읽으므로 영향 없다.)

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/20260904120000_personalization_schema.sql packages/supabase/src/database.types.ts
git commit -m "feat(db): 프로필 확장 · 과목별 레벨 · 세션 요약 · 활동 종류 스키마"
```

---

### Task 2: 프로필 도메인 로직 (packages/utils)

학년·읽기 수준·성별의 타입과 한국어 라벨, 그리고 생일로부터 **추천값**을 계산하는 순수 함수를 만든다. UI가 아니라 로직이므로 여기서 TDD로 확실히 굳힌다.

**Files:**
- Create: `packages/utils/src/profile.ts`
- Create: `packages/utils/src/profile.test.ts`
- Modify: `packages/utils/src/index.ts`

**Interfaces:**
- Consumes: 없음 (순수 함수)
- Produces:
  - `type Grade = 'preschool' | 'g1' | 'g2' | 'g3' | 'g4' | 'g5' | 'g6'`
  - `type ReadingLevel = 'pre_reader' | 'learning' | 'fluent'`
  - `type Gender = 'female' | 'male'`
  - `const GRADES: readonly Grade[]`, `GRADE_LABEL: Record<Grade, string>`
  - `const READING_LEVELS: readonly ReadingLevel[]`, `READING_LEVEL_LABEL: Record<ReadingLevel, string>`
  - `GENDER_LABEL: Record<Gender, string>`
  - `gradeOrdinal(grade: Grade): number`, `gradeFromOrdinal(ord: number): Grade`
  - `recommendGrade(birthDate: Date, today: Date): Grade`
  - `recommendReadingLevel(grade: Grade, birthDate: Date, today: Date): ReadingLevel`
  - `recommendDailyGoalMinutes(grade: Grade): number`
  - `DAILY_GOAL_OPTIONS: readonly number[]`

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/utils/src/profile.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  gradeOrdinal,
  recommendGrade,
  recommendReadingLevel,
  recommendDailyGoalMinutes,
  GRADE_LABEL,
  READING_LEVEL_LABEL,
} from './profile';

const TODAY = new Date('2026-09-04');

describe('gradeOrdinal', () => {
  it('미취학은 0, 초1은 1, 초6은 6', () => {
    expect(gradeOrdinal('preschool')).toBe(0);
    expect(gradeOrdinal('g1')).toBe(1);
    expect(gradeOrdinal('g6')).toBe(6);
  });
});

describe('recommendGrade', () => {
  // 한국 학제: 만 6세가 되는 해의 다음 해 3월 입학 → 입학연도 = 출생연도 + 7
  it('2018년생은 2026년 9월 기준 초2를 추천한다', () => {
    expect(recommendGrade(new Date('2018-05-10'), TODAY)).toBe('g2');
  });

  it('2021년생은 아직 미취학', () => {
    expect(recommendGrade(new Date('2021-03-20'), TODAY)).toBe('preschool');
  });

  it('2023년생도 미취학', () => {
    expect(recommendGrade(new Date('2023-08-02'), TODAY)).toBe('preschool');
  });

  it('3월 이전이면 아직 이전 학년도로 센다', () => {
    // 2018년생 입학은 2025년 3월. 2025년 2월에는 아직 미취학이어야 한다.
    expect(recommendGrade(new Date('2018-05-10'), new Date('2025-02-15'))).toBe('preschool');
    expect(recommendGrade(new Date('2018-05-10'), new Date('2025-03-15'))).toBe('g1');
  });

  it('초6을 넘어가면 g6 으로 고정한다', () => {
    expect(recommendGrade(new Date('2005-01-01'), TODAY)).toBe('g6');
  });
});

describe('recommendReadingLevel', () => {
  it('미취학이면서 만 5세 미만이면 아직 못 읽음', () => {
    expect(recommendReadingLevel('preschool', new Date('2023-08-02'), TODAY)).toBe('pre_reader');
  });

  it('미취학이어도 만 5세 이상이면 배우는 중', () => {
    expect(recommendReadingLevel('preschool', new Date('2021-03-20'), TODAY)).toBe('learning');
  });

  it('초1~초2는 배우는 중', () => {
    expect(recommendReadingLevel('g1', new Date('2019-01-01'), TODAY)).toBe('learning');
    expect(recommendReadingLevel('g2', new Date('2018-01-01'), TODAY)).toBe('learning');
  });

  it('초3 이상은 유창', () => {
    expect(recommendReadingLevel('g3', new Date('2017-01-01'), TODAY)).toBe('fluent');
  });
});

describe('recommendDailyGoalMinutes', () => {
  it('학년이 올라가면 목표 시간도 길어진다', () => {
    expect(recommendDailyGoalMinutes('preschool')).toBe(5);
    expect(recommendDailyGoalMinutes('g1')).toBe(10);
    expect(recommendDailyGoalMinutes('g3')).toBe(15);
    expect(recommendDailyGoalMinutes('g5')).toBe(20);
  });
});

describe('라벨', () => {
  it('모든 학년과 읽기 수준에 한국어 라벨이 있다', () => {
    expect(GRADE_LABEL.preschool).toBe('미취학');
    expect(GRADE_LABEL.g3).toBe('초등 3학년');
    expect(READING_LEVEL_LABEL.pre_reader).toBe('아직 못 읽어요');
    expect(READING_LEVEL_LABEL.fluent).toBe('혼자 잘 읽어요');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm --filter @dailyglow/utils test`
Expected: FAIL — `Failed to resolve import "./profile"`

- [ ] **Step 3: 구현**

`packages/utils/src/profile.ts`:

```typescript
/**
 * 프로필 도메인: 학년 · 읽기 수준 · 성별 타입과 추천값 계산.
 *
 * 추천값은 온보딩에서 "이 정도일 것 같아요" 하고 미리 채워주는 용도다.
 * 최종 결정은 항상 사람이 한다 — 조기입학이나 학제 차이 때문에
 * 생일만으로 학년을 확정하면 틀린다.
 */

export const GRADES = ['preschool', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6'] as const;
export type Grade = (typeof GRADES)[number];

export const GRADE_LABEL: Record<Grade, string> = {
  preschool: '미취학',
  g1: '초등 1학년',
  g2: '초등 2학년',
  g3: '초등 3학년',
  g4: '초등 4학년',
  g5: '초등 5학년',
  g6: '초등 6학년',
};

export const READING_LEVELS = ['pre_reader', 'learning', 'fluent'] as const;
export type ReadingLevel = (typeof READING_LEVELS)[number];

export const READING_LEVEL_LABEL: Record<ReadingLevel, string> = {
  pre_reader: '아직 못 읽어요',
  learning: '배우는 중이에요',
  fluent: '혼자 잘 읽어요',
};

export type Gender = 'female' | 'male';

export const GENDER_LABEL: Record<Gender, string> = {
  female: '여자',
  male: '남자',
};

export const DAILY_GOAL_OPTIONS = [5, 10, 15, 20] as const;

/** 학년 서수. DB 의 lessons.min_grade / max_grade 와 같은 매핑이다. */
export function gradeOrdinal(grade: Grade): number {
  return GRADES.indexOf(grade);
}

/** 서수를 학년으로 되돌린다. 범위를 벗어나면 양 끝으로 자른다. */
export function gradeFromOrdinal(ord: number): Grade {
  const clamped = Math.min(Math.max(Math.round(ord), 0), GRADES.length - 1);
  return GRADES[clamped]!;
}

/** 만 나이 */
function ageAt(birthDate: Date, today: Date): number {
  let age = today.getFullYear() - birthDate.getFullYear();
  const beforeBirthday =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * 한국 학제 기준 추천 학년.
 * 초등학교는 만 6세가 된 해의 다음 해 3월에 입학하므로 입학연도 = 출생연도 + 7.
 * 학년도는 3월에 바뀐다.
 */
export function recommendGrade(birthDate: Date, today: Date): Grade {
  const entryYear = birthDate.getFullYear() + 7;
  // 3월 이전이면 아직 지난 학년도
  const schoolYear = today.getMonth() >= 2 ? today.getFullYear() : today.getFullYear() - 1;
  const gradeNumber = schoolYear - entryYear + 1;
  if (gradeNumber < 1) return 'preschool';
  return gradeFromOrdinal(Math.min(gradeNumber, 6));
}

/** 추천 읽기 수준. 미취학이라도 만 5세부터는 한글을 배우기 시작한다고 본다. */
export function recommendReadingLevel(
  grade: Grade,
  birthDate: Date,
  today: Date,
): ReadingLevel {
  if (grade === 'preschool') {
    return ageAt(birthDate, today) >= 5 ? 'learning' : 'pre_reader';
  }
  return gradeOrdinal(grade) <= 2 ? 'learning' : 'fluent';
}

/** 추천 하루 목표 시간(분). 어릴수록 짧게. */
export function recommendDailyGoalMinutes(grade: Grade): number {
  const ord = gradeOrdinal(grade);
  if (ord === 0) return 5;
  if (ord <= 2) return 10;
  if (ord <= 4) return 15;
  return 20;
}
```

- [ ] **Step 4: `index.ts` 에서 내보내기**

`packages/utils/src/index.ts` 를 다음으로 교체:

```typescript
export * from './level';
export * from './srs';
export * from './format';
export * from './profile';
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm --filter @dailyglow/utils test`
Expected: PASS — profile 관련 테스트 전부 통과, 기존 srs/level 테스트도 그대로 통과.

- [ ] **Step 6: 커밋**

```bash
git add packages/utils/src/profile.ts packages/utils/src/profile.test.ts packages/utils/src/index.ts
git commit -m "feat(utils): 학년·읽기수준 타입과 생일 기반 추천값 계산"
```

---

### Task 3: 세 아이 계정과 활동 카탈로그 seed

라윤·시윤·도윤 계정을 만들고, 홈에 뜰 활동(레슨) 행을 넣는다. 문제 데이터는 Phase 2에서 채우므로 여기서는 레슨 행만 만든다.

**Files:**
- Modify: `supabase/seed.sql`

**Interfaces:**
- Consumes: Task 1 의 `lessons.activity_kind|subject_level|min_grade|max_grade`
- Produces: 계정 `rayoon@dailyglow.dev` / `siyoon@dailyglow.dev` / `doyoon@dailyglow.dev` (비밀번호 모두 `glow1234`), 레슨 7개

- [ ] **Step 1: seed.sql 을 다음 내용으로 교체**

```sql
-- 로컬 개발용 시드 데이터. `supabase db reset` 시 자동 적용.

-- ─────────────────────────────────────────────
-- 아이 계정 3개 (비밀번호는 모두 glow1234)
-- auth.users + auth.identities 를 직접 넣는다.
-- handle_new_user 트리거가 profiles 를 만들고, onboarded_at 은 비어 있으므로
-- 첫 로그인 시 온보딩 화면으로 간다.
-- ─────────────────────────────────────────────
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
-- UUID 는 16진수만 쓸 수 있으므로 …00a1 / …00a2 / …00a3 로 구분한다.
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1',
   'authenticated', 'authenticated', 'rayoon@dailyglow.dev', crypt('glow1234', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"라윤"}', false, '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a2',
   'authenticated', 'authenticated', 'siyoon@dailyglow.dev', crypt('glow1234', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"시윤"}', false, '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a3',
   'authenticated', 'authenticated', 'doyoon@dailyglow.dev', crypt('glow1234', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"도윤"}', false, '', '', '', '');

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1',
   '{"sub":"00000000-0000-0000-0000-0000000000a1","email":"rayoon@dailyglow.dev"}',
   'email', now(), now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a2',
   '{"sub":"00000000-0000-0000-0000-0000000000a2","email":"siyoon@dailyglow.dev"}',
   'email', now(), now(), now()),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a3',
   '{"sub":"00000000-0000-0000-0000-0000000000a3","email":"doyoon@dailyglow.dev"}',
   'email', now(), now(), now());

-- ─────────────────────────────────────────────
-- 과목
-- ─────────────────────────────────────────────
insert into public.subjects (slug, title, sort_order) values
  ('hangul',  '한글', 1),
  ('korean',  '국어', 2),
  ('english', '영어', 3),
  ('math',    '수학', 4);

-- ─────────────────────────────────────────────
-- 활동 카탈로그
--   subject_level: 한글은 "기적의 한글 학습" 단계(1~35), 그 외는 활동 난이도 단계
--   min_grade/max_grade: 0=미취학, 1~6=초1~초6
--   문제 데이터는 Phase 2 에서 채운다.
-- ─────────────────────────────────────────────
with s as (select slug, id from public.subjects)
insert into public.lessons
  (subject_id, slug, title, level, sort_order, activity_kind, subject_level, min_grade, max_grade, config)
select s.id, v.slug, v.title, v.level, v.sort_order, v.activity_kind, v.subject_level, v.min_grade, v.max_grade, v.config
from (values
  ('hangul', 'letter-cards',  '글자 읽기',      1, 1, 'letter_cards',  1,  0, 1, '{}'::jsonb),
  ('hangul', 'word-cards',    '낱말 읽기',      1, 2, 'word_cards',    4,  0, 1, '{}'::jsonb),
  ('hangul', 'reading-cards', '문장 읽기',      1, 3, 'reading_cards', 14, 0, 1, '{}'::jsonb),
  ('hangul', 'worksheet',     '쓰기 연습지',    1, 4, 'worksheet',     14, 0, 1, '{}'::jsonb),
  ('korean', 'spelling',      '맞춤법 탐험대',  1, 1, 'choice_quiz',   1,  1, 6, '{}'::jsonb),
  ('math',   'add-play',      '더하기 놀이',    1, 1, 'choice_quiz',   1,  0, 1, '{"generator":"add_small"}'::jsonb),
  ('math',   'grid-drill',    '100칸 계산',     1, 2, 'grid_drill',    1,  1, 6, '{}'::jsonb)
) as v(subject_slug, slug, title, level, sort_order, activity_kind, subject_level, min_grade, max_grade, config)
join s on s.slug = v.subject_slug;
```

- [ ] **Step 2: seed 적용 및 확인**

Run:
```bash
pnpm db:reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
select p.display_name, u.email, p.onboarded_at
  from public.profiles p join auth.users u on u.id = p.id order by u.email;"
```
Expected: 3행 — 도윤/라윤/시윤, `onboarded_at` 은 모두 NULL.

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
select s.slug, l.title, l.activity_kind, l.subject_level, l.min_grade, l.max_grade
  from public.lessons l join public.subjects s on s.id = l.subject_id
 order by s.sort_order, l.sort_order;"
```
Expected: 7행. 한글 4개(글자/낱말/문장/쓰기), 국어 1개(맞춤법), 수학 2개(더하기/100칸).

- [ ] **Step 3: 커밋**

```bash
git add supabase/seed.sql
git commit -m "feat(db): 세 아이 계정과 활동 카탈로그 seed"
```

---

### Task 4: 프로필 스토어와 온보딩 가드

로그인한 사용자의 프로필과 과목별 레벨을 불러오는 zustand 스토어, 그리고 온보딩 미완료 사용자를 온보딩으로 보내는 라우트 가드를 만든다.

**Files:**
- Create: `apps/web/src/stores/profile.ts`
- Create: `apps/web/src/components/RequireProfile.tsx`
- Create: `apps/web/src/components/RequireProfile.test.tsx`
- Modify: `apps/web/src/app/App.tsx`

**Interfaces:**
- Consumes: `useAuth` (`@/stores/auth`), `supabase` (`@/lib/supabase`), Task 1 의 `profiles` 새 컬럼과 `profile_subject_levels`
- Produces:
  - `useProfile` 스토어 — 상태 `{ profile: ProfileRow | null; levels: Record<string, SubjectLevel>; status: 'idle'|'loading'|'ready'|'error' }`
  - 액션 `load(userId: string): Promise<void>`, `save(patch: Partial<ProfileRow>): Promise<{ error?: string }>`, `setSubjectLevel(subjectId: string, level: number, locked?: boolean): Promise<void>`, `clear(): void`
  - `type SubjectLevel = { level: number; locked: boolean }`
  - `<RequireProfile />` — 온보딩 완료자만 `<Outlet />` 렌더

- [ ] **Step 1: 스토어 작성**

`apps/web/src/stores/profile.ts`:

```typescript
import { create } from 'zustand';
import type { Tables } from '@dailyglow/supabase';
import { supabase } from '@/lib/supabase';

export type ProfileRow = Tables<'profiles'>;
export interface SubjectLevel {
  level: number;
  locked: boolean;
}

interface ProfileState {
  profile: ProfileRow | null;
  /** subject_id → 레벨 */
  levels: Record<string, SubjectLevel>;
  status: 'idle' | 'loading' | 'ready' | 'error';

  load: (userId: string) => Promise<void>;
  save: (patch: Partial<ProfileRow>) => Promise<{ error?: string }>;
  setSubjectLevel: (subjectId: string, level: number, locked?: boolean) => Promise<void>;
  clear: () => void;
}

export const useProfile = create<ProfileState>((set, get) => ({
  profile: null,
  levels: {},
  status: 'idle',

  load: async (userId) => {
    set({ status: 'loading' });
    const [profileRes, levelRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('profile_subject_levels').select('*').eq('profile_id', userId),
    ]);

    if (profileRes.error) {
      set({ status: 'error' });
      return;
    }

    const levels: Record<string, SubjectLevel> = {};
    for (const row of levelRes.data ?? []) {
      levels[row.subject_id] = { level: row.level, locked: row.locked };
    }

    set({ profile: profileRes.data, levels, status: 'ready' });
  },

  save: async (patch) => {
    const current = get().profile;
    if (!current) return { error: '프로필이 없습니다.' };

    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', current.id)
      .select()
      .single();

    if (error) return { error: error.message };
    set({ profile: data });
    return {};
  },

  setSubjectLevel: async (subjectId, level, locked) => {
    const current = get().profile;
    if (!current) return;

    const next: SubjectLevel = {
      level,
      locked: locked ?? get().levels[subjectId]?.locked ?? false,
    };

    await supabase.from('profile_subject_levels').upsert({
      profile_id: current.id,
      subject_id: subjectId,
      level: next.level,
      locked: next.locked,
      updated_at: new Date().toISOString(),
    });

    set({ levels: { ...get().levels, [subjectId]: next } });
  },

  clear: () => set({ profile: null, levels: {}, status: 'idle' }),
}));
```

- [ ] **Step 2: 가드의 실패하는 테스트 작성**

`apps/web/src/components/RequireProfile.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { RequireProfile } from './RequireProfile';
import { useProfile, type ProfileRow } from '@/stores/profile';

function baseProfile(over: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'u1',
    display_name: '라윤',
    gender: 'female',
    birth_date: '2018-05-10',
    grade: 'g3',
    reading_level: 'fluent',
    daily_goal_minutes: 15,
    onboarded_at: '2026-09-04T00:00:00Z',
    avatar_key: null,
    total_xp: 0,
    created_at: '2026-09-04T00:00:00Z',
    ...over,
  } as ProfileRow;
}

function renderAt(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route element={<RequireProfile />}>
          <Route path="/" element={<p>홈 화면</p>} />
        </Route>
        <Route path="/onboarding" element={<p>온보딩 화면</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireProfile', () => {
  beforeEach(() => {
    useProfile.setState({ profile: null, levels: {}, status: 'idle' });
  });

  it('불러오는 중에는 아무것도 렌더하지 않는다', () => {
    useProfile.setState({ status: 'loading' });
    const { container } = renderAt('/');
    expect(container).toBeEmptyDOMElement();
  });

  it('온보딩을 마치지 않았으면 온보딩으로 보낸다', () => {
    useProfile.setState({ status: 'ready', profile: baseProfile({ onboarded_at: null }) });
    renderAt('/');
    expect(screen.getByText('온보딩 화면')).toBeInTheDocument();
  });

  it('온보딩을 마쳤으면 자식 화면을 보여준다', () => {
    useProfile.setState({ status: 'ready', profile: baseProfile() });
    renderAt('/');
    expect(screen.getByText('홈 화면')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `pnpm --filter @dailyglow/web test -- RequireProfile`
Expected: FAIL — `Failed to resolve import "./RequireProfile"`

- [ ] **Step 4: 가드 구현**

`apps/web/src/components/RequireProfile.tsx`:

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useProfile } from '@/stores/profile';

/**
 * 온보딩을 마친 사용자만 통과시킨다.
 * 프로필은 있는데 onboarded_at 이 비어 있으면 온보딩 화면으로 보낸다.
 */
export function RequireProfile() {
  const status = useProfile((s) => s.status);
  const profile = useProfile((s) => s.profile);

  if (status === 'idle' || status === 'loading') return null;
  if (!profile?.onboarded_at) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm --filter @dailyglow/web test -- RequireProfile`
Expected: PASS — 3개 테스트 통과.

- [ ] **Step 6: 로그인 시 프로필을 불러오도록 App 연결**

`apps/web/src/app/App.tsx` 의 import 에 추가:

```tsx
import { useProfile } from '@/stores/profile';
```

`export function App()` 본문에서 기존 두 `useEffect` 사이에 다음을 넣고, `user` 를 구독한다:

```tsx
  const user = useAuth((s) => s.user);
  const loadProfile = useProfile((s) => s.load);
  const clearProfile = useProfile((s) => s.clear);

  useEffect(() => {
    if (user) void loadProfile(user.id);
    else clearProfile();
  }, [user, loadProfile, clearProfile]);
```

- [ ] **Step 7: 타입 검사와 전체 테스트**

Run: `pnpm typecheck && pnpm test`
Expected: 둘 다 PASS.

- [ ] **Step 8: 커밋**

```bash
git add apps/web/src/stores/profile.ts apps/web/src/components/RequireProfile.tsx apps/web/src/components/RequireProfile.test.tsx apps/web/src/app/App.tsx
git commit -m "feat(web): 프로필 스토어와 온보딩 가드"
```

---

### Task 5: 온보딩 화면

첫 로그인 시 이름·성별·생일·학년·읽기 수준·하루 목표를 한 번 입력받는다. 생일을 넣으면 학년·읽기 수준·목표 시간의 **추천값이 자동으로 채워지되**, 사용자가 언제든 바꿀 수 있다.

**Files:**
- Create: `apps/web/src/pages/OnboardingPage.tsx`
- Create: `apps/web/src/pages/OnboardingPage.test.tsx`
- Modify: `apps/web/src/app/router.tsx`

**Interfaces:**
- Consumes: `useProfile` (Task 4), `recommendGrade` / `recommendReadingLevel` / `recommendDailyGoalMinutes` / `GRADES` / `GRADE_LABEL` / `READING_LEVELS` / `READING_LEVEL_LABEL` / `GENDER_LABEL` / `DAILY_GOAL_OPTIONS` (Task 2), `Button`·`Card` (`@dailyglow/ui`)
- Produces: `<OnboardingPage />`, 라우트 `/onboarding`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/pages/OnboardingPage.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingPage } from './OnboardingPage';
import { useProfile, type ProfileRow } from '@/stores/profile';

function profile(over: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'u1',
    display_name: '친구',
    gender: null,
    birth_date: null,
    grade: null,
    reading_level: null,
    daily_goal_minutes: 10,
    onboarded_at: null,
    avatar_key: null,
    total_xp: 0,
    created_at: '2026-09-04T00:00:00Z',
    ...over,
  } as ProfileRow;
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    // 추천 학년은 "오늘"에 따라 달라지므로 Date 만 고정한다.
    // 타이머는 진짜로 두어야 waitFor 가 동작한다.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-04T09:00:00'));
    useProfile.setState({ profile: profile(), levels: {}, status: 'ready' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    );
  }

  it('생일을 넣으면 학년 추천값이 자동으로 채워진다', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('생일'), { target: { value: '2018-05-10' } });
    await waitFor(() => {
      expect((screen.getByLabelText('학년') as HTMLSelectElement).value).toBe('g2');
    });
  });

  it('추천값을 사용자가 덮어쓸 수 있다', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('생일'), { target: { value: '2018-05-10' } });
    await waitFor(() =>
      expect((screen.getByLabelText('학년') as HTMLSelectElement).value).toBe('g2'),
    );
    fireEvent.change(screen.getByLabelText('학년'), { target: { value: 'g3' } });
    expect((screen.getByLabelText('학년') as HTMLSelectElement).value).toBe('g3');
  });

  it('이름이 비어 있으면 저장 버튼이 비활성화된다', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: /시작하기/ })).toBeDisabled();
  });

  it('저장하면 입력한 값과 onboarded_at 이 함께 전달된다', async () => {
    const save = vi.fn().mockResolvedValue({});
    useProfile.setState({ save });
    renderPage();

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '라윤' } });
    fireEvent.change(screen.getByLabelText('생일'), { target: { value: '2018-05-10' } });
    fireEvent.change(screen.getByLabelText('학년'), { target: { value: 'g3' } });
    fireEvent.click(screen.getByRole('button', { name: /시작하기/ }));

    await waitFor(() => expect(save).toHaveBeenCalled());
    const patch = save.mock.calls[0]![0];
    expect(patch.display_name).toBe('라윤');
    expect(patch.grade).toBe('g3');
    expect(patch.birth_date).toBe('2018-05-10');
    expect(patch.onboarded_at).toBeTruthy();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm --filter @dailyglow/web test -- OnboardingPage`
Expected: FAIL — `Failed to resolve import "./OnboardingPage"`

- [ ] **Step 3: 구현**

`apps/web/src/pages/OnboardingPage.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@dailyglow/ui';
import {
  DAILY_GOAL_OPTIONS,
  GENDER_LABEL,
  GRADES,
  GRADE_LABEL,
  READING_LEVELS,
  READING_LEVEL_LABEL,
  recommendDailyGoalMinutes,
  recommendGrade,
  recommendReadingLevel,
  type Gender,
  type Grade,
  type ReadingLevel,
} from '@dailyglow/utils';
import { useProfile } from '@/stores/profile';

const fieldClass =
  'min-h-touch rounded-2xl border-2 border-glow-100 px-4 text-lg focus:border-glow-500 focus:outline-none';

export function OnboardingPage() {
  const profile = useProfile((s) => s.profile);
  const save = useProfile((s) => s.save);
  const navigate = useNavigate();

  const [name, setName] = useState(profile?.display_name ?? '');
  const [gender, setGender] = useState<Gender | ''>('');
  const [birthDate, setBirthDate] = useState('');
  const [grade, setGrade] = useState<Grade | ''>('');
  const [readingLevel, setReadingLevel] = useState<ReadingLevel | ''>('');
  const [goal, setGoal] = useState<number>(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 생일이 바뀌면 학년·읽기 수준·목표 시간에 추천값을 채운다.
   * 어디까지나 제안이라, 이후 사용자가 고르면 그 값이 유지된다.
   */
  function onBirthDateChange(value: string) {
    setBirthDate(value);
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return;

    const today = new Date();
    const g = recommendGrade(parsed, today);
    setGrade(g);
    setReadingLevel(recommendReadingLevel(g, parsed, today));
    setGoal(recommendDailyGoalMinutes(g));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await save({
      display_name: name.trim(),
      gender: gender || null,
      birth_date: birthDate || null,
      grade: grade || null,
      reading_level: readingLevel || null,
      daily_goal_minutes: goal,
      onboarded_at: new Date().toISOString(),
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-lg">
        <h1 className="mb-2 text-center text-3xl font-bold text-glow-600">반가워요!</h1>
        <p className="mb-6 text-center text-slate-500">
          몇 가지만 알려주면 딱 맞는 공부를 준비할게요.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
            이름
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
            성별
            <select
              className={fieldClass}
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender | '')}
            >
              <option value="">고르지 않음</option>
              <option value="female">{GENDER_LABEL.female}</option>
              <option value="male">{GENDER_LABEL.male}</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
            생일
            <input
              type="date"
              className={fieldClass}
              value={birthDate}
              onChange={(e) => onBirthDateChange(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
            학년
            <select
              className={fieldClass}
              value={grade}
              onChange={(e) => setGrade(e.target.value as Grade | '')}
            >
              <option value="">고르지 않음</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {GRADE_LABEL[g]}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-slate-400">
              생일을 넣으면 추천값이 채워져요. 실제 학년과 다르면 바꿔주세요.
            </span>
          </label>

          <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
            한글 읽기
            <select
              className={fieldClass}
              value={readingLevel}
              onChange={(e) => setReadingLevel(e.target.value as ReadingLevel | '')}
            >
              <option value="">고르지 않음</option>
              {READING_LEVELS.map((r) => (
                <option key={r} value={r}>
                  {READING_LEVEL_LABEL[r]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
            하루 목표
            <select
              className={fieldClass}
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
            >
              {DAILY_GOAL_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}분
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="text-sm font-bold text-red-500">{error}</p> : null}

          <Button type="submit" size="lg" disabled={busy || name.trim().length === 0}>
            {busy ? '저장하는 중…' : '시작하기'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: 라우터에 연결**

`apps/web/src/app/router.tsx` 를 다음으로 교체:

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { App } from './App';
import { RequireAuth } from '@/components/RequireAuth';
import { RequireProfile } from '@/components/RequireProfile';
import { LoginPage } from '@/pages/LoginPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { HomePage } from '@/pages/HomePage';

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'onboarding', element: <OnboardingPage /> },
          {
            element: <RequireProfile />,
            children: [{ index: true, element: <HomePage /> }],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
```

> 기존 `SubjectPage` / `LessonPage` / `ReviewPage` 라우트는 여기서 빠진다. 파일은 Phase 2에서 활동 렌더러로 대체될 때까지 남겨둔다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm --filter @dailyglow/web test -- OnboardingPage`
Expected: PASS — 4개 테스트 통과.

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/pages/OnboardingPage.tsx apps/web/src/pages/OnboardingPage.test.tsx apps/web/src/app/router.tsx
git commit -m "feat(web): 첫 로그인 온보딩 화면"
```

---

### Task 6: 홈 화면

아이 이름으로 인사하고, 오늘의 목표 진행바와 자기 학년·레벨에 맞는 활동 카드를 보여준다. 읽기 수준에 따라 글자 크기와 설명의 양이 달라진다.

**Files:**
- Create: `apps/web/src/lib/activities.ts`
- Create: `apps/web/src/lib/activities.test.ts`
- Modify: `apps/web/src/pages/HomePage.tsx`
- Create: `apps/web/src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `useProfile` (Task 4), `gradeOrdinal` (Task 2), Task 3 의 레슨 행
- Produces:
  - `type ActivityCard = { id: string; title: string; activityKind: string; subjectSlug: string; subjectTitle: string; emoji: string }`
  - `activityEmoji(kind: string): string`
  - `selectActivities(rows: LessonGateRow[], grade: Grade | null, levels: Record<string, SubjectLevel>): ActivityCard[]`
  - `fetchTodayMinutes(profileId: string): Promise<number>`

- [ ] **Step 1: 활동 선별 로직의 실패하는 테스트 작성**

`apps/web/src/lib/activities.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { selectActivities, activityEmoji, type LessonGateRow } from './activities';

const HANGUL = 'subj-hangul';
const MATH = 'subj-math';

function row(over: Partial<LessonGateRow>): LessonGateRow {
  return {
    id: 'l1',
    title: '글자 읽기',
    activity_kind: 'letter_cards',
    subject_id: HANGUL,
    subject_slug: 'hangul',
    subject_title: '한글',
    subject_level: 1,
    min_grade: 0,
    max_grade: 1,
    ...over,
  };
}

describe('selectActivities', () => {
  it('학년 범위를 벗어난 활동은 빼놓는다', () => {
    const rows = [row({ id: 'letters', min_grade: 0, max_grade: 1 })];
    // 초3 은 min_grade 0~1 범위 밖
    expect(selectActivities(rows, 'g3', { [HANGUL]: { level: 35, locked: false } })).toHaveLength(0);
  });

  it('아이 레벨보다 높은 단계의 활동은 빼놓는다', () => {
    const rows = [
      row({ id: 'letters', subject_level: 1 }),
      row({ id: 'sentences', title: '문장 읽기', activity_kind: 'reading_cards', subject_level: 14 }),
    ];
    const picked = selectActivities(rows, 'preschool', { [HANGUL]: { level: 4, locked: false } });
    expect(picked.map((a) => a.id)).toEqual(['letters']);
  });

  it('레벨 기록이 없으면 1단계로 본다', () => {
    const rows = [row({ id: 'letters', subject_level: 1 })];
    expect(selectActivities(rows, 'preschool', {}).map((a) => a.id)).toEqual(['letters']);
  });

  it('학년이 정해지지 않았으면 학년 조건은 통과시킨다', () => {
    const rows = [row({ id: 'grid', subject_id: MATH, subject_slug: 'math', min_grade: 1, max_grade: 6 })];
    expect(selectActivities(rows, null, { [MATH]: { level: 1, locked: false } })).toHaveLength(1);
  });
});

describe('activityEmoji', () => {
  it('활동 종류마다 다른 그림을 준다', () => {
    expect(activityEmoji('letter_cards')).toBe('🔤');
    expect(activityEmoji('grid_drill')).toBe('🔢');
    expect(activityEmoji('알 수 없는 종류')).toBe('📘');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm --filter @dailyglow/web test -- activities`
Expected: FAIL — `Failed to resolve import "./activities"`

- [ ] **Step 3: 구현**

`apps/web/src/lib/activities.ts`:

```typescript
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter @dailyglow/web test -- activities`
Expected: PASS — 5개 테스트 통과.

- [ ] **Step 5: 홈 화면의 실패하는 테스트 작성**

`apps/web/src/pages/HomePage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';
import { useProfile, type ProfileRow } from '@/stores/profile';

vi.mock('@/lib/activities', async () => {
  const actual = await vi.importActual<typeof import('@/lib/activities')>('@/lib/activities');
  return { ...actual, fetchTodayMinutes: vi.fn().mockResolvedValue(9) };
});

// 활동 카탈로그 질의는 빈 목록으로 응답시킨다 (활동 선별 자체는 activities.test 에서 검증).
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
    }),
  },
}));

function profile(over: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'u1',
    display_name: '라윤',
    gender: 'female',
    birth_date: '2018-05-10',
    grade: 'g3',
    reading_level: 'fluent',
    daily_goal_minutes: 15,
    onboarded_at: '2026-09-04T00:00:00Z',
    avatar_key: null,
    total_xp: 0,
    created_at: '2026-09-04T00:00:00Z',
    ...over,
  } as ProfileRow;
}

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    useProfile.setState({ profile: profile(), levels: {}, status: 'ready' });
  });

  it('아이 이름으로 인사한다', () => {
    renderHome();
    expect(screen.getByText(/라윤/)).toBeInTheDocument();
  });

  it('하루 목표를 보여준다', () => {
    renderHome();
    expect(screen.getByText(/15분/)).toBeInTheDocument();
  });

  it('아직 못 읽는 아이에게는 큰 글씨 클래스를 쓴다', () => {
    useProfile.setState({ profile: profile({ display_name: '도윤', reading_level: 'pre_reader' }) });
    renderHome();
    expect(screen.getByTestId('greeting')).toHaveClass('text-5xl');
  });

  it('혼자 읽는 아이에게는 보통 글씨 크기를 쓴다', () => {
    renderHome();
    expect(screen.getByTestId('greeting')).toHaveClass('text-3xl');
  });
});
```

- [ ] **Step 6: 테스트가 실패하는지 확인**

Run: `pnpm --filter @dailyglow/web test -- HomePage`
Expected: FAIL — `greeting` 테스트 아이디를 찾지 못한다.

- [ ] **Step 7: 홈 화면 구현**

`apps/web/src/pages/HomePage.tsx` 를 다음으로 교체:

```tsx
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, ProgressBar } from '@dailyglow/ui';
import { GRADE_LABEL, type Grade } from '@dailyglow/utils';
import { useAuth } from '@/stores/auth';
import { useProfile } from '@/stores/profile';
import { supabase } from '@/lib/supabase';
import {
  fetchTodayMinutes,
  selectActivities,
  type LessonGateRow,
} from '@/lib/activities';

/** 아직 못 읽는 아이에게는 글자를 크게 보여준다. */
function greetingClass(readingLevel: string | null): string {
  return readingLevel === 'pre_reader' ? 'text-5xl' : 'text-3xl';
}

export function HomePage() {
  const signOut = useAuth((s) => s.signOut);
  const profile = useProfile((s) => s.profile);
  const levels = useProfile((s) => s.levels);

  const { data: lessons } = useQuery({
    queryKey: ['activity-catalog'],
    queryFn: async (): Promise<LessonGateRow[]> => {
      const { data, error } = await supabase
        .from('lessons')
        .select(
          'id, title, activity_kind, subject_id, subject_level, min_grade, max_grade, subjects!inner(slug, title, sort_order)',
        )
        .order('sort_order');
      if (error) throw error;
      return (data ?? []).map((r) => {
        const subject = r.subjects as unknown as { slug: string; title: string };
        return {
          id: r.id,
          title: r.title,
          activity_kind: r.activity_kind,
          subject_id: r.subject_id,
          subject_slug: subject.slug,
          subject_title: subject.title,
          subject_level: r.subject_level,
          min_grade: r.min_grade,
          max_grade: r.max_grade,
        };
      });
    },
  });

  const { data: todayMinutes = 0 } = useQuery({
    queryKey: ['today-minutes', profile?.id],
    enabled: Boolean(profile),
    queryFn: () => fetchTodayMinutes(profile!.id),
  });

  const goal = profile?.daily_goal_minutes ?? 10;
  // DB 타입은 grade 를 string 으로 주므로 도메인 타입으로 좁힌다.
  const grade = (profile?.grade as Grade | null) ?? null;
  const activities = selectActivities(lessons ?? [], grade, levels);
  const isPreReader = profile?.reading_level === 'pre_reader';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg text-slate-500">안녕,</p>
          <h1
            data-testid="greeting"
            className={`font-bold text-glow-600 ${greetingClass(profile?.reading_level ?? null)}`}
          >
            {profile?.display_name ?? '친구'}
            {isPreReader ? '! 🌈' : '아 👋'}
          </h1>
          {grade ? <p className="mt-1 text-sm text-slate-400">{GRADE_LABEL[grade]}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link to="/settings">
            <Button variant="ghost">설정</Button>
          </Link>
          <Button variant="ghost" onClick={() => void signOut()}>
            로그아웃
          </Button>
        </div>
      </header>

      <Card className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold text-glow-600">오늘의 목표</span>
          <span className="text-lg text-slate-500">
            {todayMinutes}분 / {goal}분
          </span>
        </div>
        <ProgressBar ratio={goal === 0 ? 0 : todayMinutes / goal} />
      </Card>

      <section className="flex flex-col gap-4">
        {activities.length === 0 ? (
          <Card className="text-center text-lg text-slate-500">
            아직 준비된 공부가 없어요. 설정에서 학년과 단계를 확인해 주세요.
          </Card>
        ) : (
          activities.map((a) => (
            <Link key={a.id} to={`/activity/${a.id}`}>
              <Card className="flex items-center gap-5 transition-transform hover:scale-[1.02]">
                <span className={isPreReader ? 'text-6xl' : 'text-5xl'}>{a.emoji}</span>
                <div>
                  <h2 className={`font-bold text-slate-700 ${isPreReader ? 'text-3xl' : 'text-2xl'}`}>
                    {a.title}
                  </h2>
                  <p className="text-sm text-slate-400">{a.subjectTitle}</p>
                </div>
              </Card>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `pnpm --filter @dailyglow/web test -- HomePage`
Expected: PASS — 4개 테스트 통과.

- [ ] **Step 9: 커밋**

```bash
git add apps/web/src/lib/activities.ts apps/web/src/lib/activities.test.ts apps/web/src/pages/HomePage.tsx apps/web/src/pages/HomePage.test.tsx
git commit -m "feat(web): 프로필에 맞춘 홈 화면과 활동 선별"
```

---

### Task 7: 설정 화면과 활동 준비중 화면

부모가 프로필을 고치고 과목별 레벨을 조정하고 "여기서 멈춰"를 걸 수 있게 한다. 홈의 활동 카드가 눌렸을 때 갈 곳도 만들어, Phase 1에서 앱이 끊기지 않게 한다.

**Files:**
- Create: `apps/web/src/pages/SettingsPage.tsx`
- Create: `apps/web/src/pages/SettingsPage.test.tsx`
- Create: `apps/web/src/pages/ActivityPlaceholderPage.tsx`
- Modify: `apps/web/src/app/router.tsx`

**Interfaces:**
- Consumes: `useProfile` (Task 4) — `save`, `setSubjectLevel`, `levels`; `GRADES` / `GRADE_LABEL` / `READING_LEVELS` / `READING_LEVEL_LABEL` / `DAILY_GOAL_OPTIONS` (Task 2)
- Produces: 라우트 `/settings`, 라우트 `/activity/:lessonId`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/pages/SettingsPage.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPage } from './SettingsPage';
import { useProfile, type ProfileRow } from '@/stores/profile';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () =>
          Promise.resolve({
            data: [{ id: 'subj-hangul', slug: 'hangul', title: '한글', sort_order: 1 }],
            error: null,
          }),
      }),
    }),
  },
}));

function profile(over: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 'u1',
    display_name: '시윤',
    gender: 'female',
    birth_date: '2021-03-20',
    grade: 'preschool',
    reading_level: 'learning',
    daily_goal_minutes: 5,
    onboarded_at: '2026-09-04T00:00:00Z',
    avatar_key: null,
    total_xp: 0,
    created_at: '2026-09-04T00:00:00Z',
    ...over,
  } as ProfileRow;
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    useProfile.setState({
      profile: profile(),
      levels: { 'subj-hangul': { level: 4, locked: false } },
      status: 'ready',
    });
  });

  it('현재 프로필 값을 채워서 보여준다', () => {
    renderPage();
    expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe('시윤');
    expect((screen.getByLabelText('학년') as HTMLSelectElement).value).toBe('preschool');
  });

  it('프로필을 저장하면 save 가 호출된다', async () => {
    const save = vi.fn().mockResolvedValue({});
    useProfile.setState({ save });
    renderPage();
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '시윤이' } });
    fireEvent.click(screen.getByRole('button', { name: /프로필 저장/ }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0]![0].display_name).toBe('시윤이');
  });

  it('과목 레벨을 바꾸면 setSubjectLevel 이 호출된다', async () => {
    const setSubjectLevel = vi.fn().mockResolvedValue(undefined);
    useProfile.setState({ setSubjectLevel });
    renderPage();
    await screen.findByText('한글');
    fireEvent.change(screen.getByLabelText('한글 단계'), { target: { value: '7' } });
    await waitFor(() => expect(setSubjectLevel).toHaveBeenCalledWith('subj-hangul', 7, false));
  });

  it('멈춤을 켜면 locked 가 true 로 전달된다', async () => {
    const setSubjectLevel = vi.fn().mockResolvedValue(undefined);
    useProfile.setState({ setSubjectLevel });
    renderPage();
    await screen.findByText('한글');
    fireEvent.click(screen.getByLabelText('한글 여기서 멈춰'));
    await waitFor(() => expect(setSubjectLevel).toHaveBeenCalledWith('subj-hangul', 4, true));
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm --filter @dailyglow/web test -- SettingsPage`
Expected: FAIL — `Failed to resolve import "./SettingsPage"`

- [ ] **Step 3: 설정 화면 구현**

`apps/web/src/pages/SettingsPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card } from '@dailyglow/ui';
import {
  DAILY_GOAL_OPTIONS,
  GENDER_LABEL,
  GRADES,
  GRADE_LABEL,
  READING_LEVELS,
  READING_LEVEL_LABEL,
  type Gender,
  type Grade,
  type ReadingLevel,
} from '@dailyglow/utils';
import { useProfile } from '@/stores/profile';
import { supabase } from '@/lib/supabase';

interface SubjectRow {
  id: string;
  slug: string;
  title: string;
}

const fieldClass =
  'min-h-touch rounded-2xl border-2 border-glow-100 px-4 text-lg focus:border-glow-500 focus:outline-none';

export function SettingsPage() {
  const profile = useProfile((s) => s.profile);
  const levels = useProfile((s) => s.levels);
  const save = useProfile((s) => s.save);
  const setSubjectLevel = useProfile((s) => s.setSubjectLevel);

  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [birthDate, setBirthDate] = useState('');
  const [grade, setGrade] = useState<Grade | ''>('');
  const [readingLevel, setReadingLevel] = useState<ReadingLevel | ''>('');
  const [goal, setGoal] = useState(10);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? '');
    setGender((profile.gender as Gender | null) ?? '');
    setBirthDate(profile.birth_date ?? '');
    setGrade((profile.grade as Grade | null) ?? '');
    setReadingLevel((profile.reading_level as ReadingLevel | null) ?? '');
    setGoal(profile.daily_goal_minutes ?? 10);
  }, [profile]);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async (): Promise<SubjectRow[]> => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, slug, title')
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });

  async function onSaveProfile() {
    await save({
      display_name: name.trim(),
      gender: gender || null,
      birth_date: birthDate || null,
      grade: grade || null,
      reading_level: readingLevel || null,
      daily_goal_minutes: goal,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost">← 홈</Button>
        </Link>
        <h1 className="text-3xl font-bold text-glow-600">설정</h1>
      </header>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-slate-700">프로필</h2>

        <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
          이름
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
          성별
          <select
            className={fieldClass}
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender | '')}
          >
            <option value="">고르지 않음</option>
            <option value="female">{GENDER_LABEL.female}</option>
            <option value="male">{GENDER_LABEL.male}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
          생일
          <input
            type="date"
            className={fieldClass}
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
          학년
          <select
            className={fieldClass}
            value={grade}
            onChange={(e) => setGrade(e.target.value as Grade | '')}
          >
            <option value="">고르지 않음</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {GRADE_LABEL[g]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
          한글 읽기
          <select
            className={fieldClass}
            value={readingLevel}
            onChange={(e) => setReadingLevel(e.target.value as ReadingLevel | '')}
          >
            <option value="">고르지 않음</option>
            {READING_LEVELS.map((r) => (
              <option key={r} value={r}>
                {READING_LEVEL_LABEL[r]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-bold text-slate-600">
          하루 목표
          <select
            className={fieldClass}
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
          >
            {DAILY_GOAL_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}분
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-3">
          <Button onClick={() => void onSaveProfile()}>프로필 저장</Button>
          {saved ? <span className="text-sm font-bold text-green-600">저장했어요</span> : null}
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-slate-700">과목별 단계</h2>
        <p className="text-sm text-slate-400">
          한글은 &lsquo;기적의 한글 학습&rsquo; 단계(1~35)예요. &lsquo;여기서 멈춰&rsquo;를 켜면
          아이가 잘해도 다음 단계로 넘어가지 않아요.
        </p>

        {subjects.map((s) => {
          const current = levels[s.id] ?? { level: 1, locked: false };
          const max = s.slug === 'hangul' ? 35 : 10;
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-4 border-t border-glow-100 pt-4">
              <span className="w-16 font-bold text-slate-700">{s.title}</span>

              <select
                aria-label={`${s.title} 단계`}
                className="min-h-touch rounded-xl border-2 border-glow-100 px-3 text-lg"
                value={current.level}
                onChange={(e) => void setSubjectLevel(s.id, Number(e.target.value), current.locked)}
              >
                {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}단계
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  aria-label={`${s.title} 여기서 멈춰`}
                  className="h-6 w-6"
                  checked={current.locked}
                  onChange={(e) => void setSubjectLevel(s.id, current.level, e.target.checked)}
                />
                여기서 멈춰
              </label>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: 활동 준비중 화면 작성**

`apps/web/src/pages/ActivityPlaceholderPage.tsx`:

```tsx
import { Link, useParams } from 'react-router-dom';
import { Button, Card } from '@dailyglow/ui';

/**
 * Phase 1 에서는 활동 렌더러가 아직 없다.
 * Phase 2 에서 activity_kind 별 렌더러로 대체된다.
 */
export function ActivityPlaceholderPage() {
  const { lessonId } = useParams<{ lessonId: string }>();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <Card className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="text-6xl">🚧</span>
        <h1 className="text-2xl font-bold text-glow-600">곧 만들어질 공부예요</h1>
        <p className="text-slate-500">
          이 활동은 다음 단계에서 만들어져요. 조금만 기다려 주세요!
        </p>
        <p className="text-xs text-slate-300">lesson: {lessonId}</p>
        <Link to="/">
          <Button size="lg">홈으로</Button>
        </Link>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: 라우터에 두 화면 연결**

`apps/web/src/app/router.tsx` 에서 import 두 줄을 추가하고:

```tsx
import { SettingsPage } from '@/pages/SettingsPage';
import { ActivityPlaceholderPage } from '@/pages/ActivityPlaceholderPage';
```

`RequireProfile` 의 `children` 배열을 다음으로 교체:

```tsx
            children: [
              { index: true, element: <HomePage /> },
              { path: 'settings', element: <SettingsPage /> },
              { path: 'activity/:lessonId', element: <ActivityPlaceholderPage /> },
            ],
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `pnpm --filter @dailyglow/web test -- SettingsPage`
Expected: PASS — 4개 테스트 통과.

- [ ] **Step 7: 전체 검증**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: 셋 다 PASS.

- [ ] **Step 8: 커밋**

```bash
git add apps/web/src/pages/SettingsPage.tsx apps/web/src/pages/SettingsPage.test.tsx apps/web/src/pages/ActivityPlaceholderPage.tsx apps/web/src/app/router.tsx
git commit -m "feat(web): 부모 설정 화면과 활동 준비중 화면"
```

---

### Task 8: 손으로 확인하기

세 계정으로 실제 로그인해 온보딩부터 홈까지 흐름이 이어지는지 확인한다. 자동 테스트가 못 잡는 것(RLS 거부, 실제 라우팅, 시각적 크기 차이)을 여기서 잡는다.

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 1~7 전부
- Produces: 없음 (검증과 문서)

- [ ] **Step 1: 개발 서버 기동**

Run:
```bash
pnpm db:reset
pnpm dev
```
Expected: `http://localhost:3000` 접속 가능.

- [ ] **Step 2: 라윤 계정 흐름 확인**

`rayoon@dailyglow.dev` / `glow1234` 로 로그인한다.

Expected:
1. 온보딩 화면으로 이동한다.
2. 생일에 `2018-05-10` 을 넣으면 학년이 **초등 2학년**으로, 읽기가 **혼자 잘 읽어요**로, 목표가 **10분**으로 자동 변경된다.
3. 학년을 **초등 3학년**으로 바꾸고 이름을 `라윤` 으로 두고 저장하면 홈으로 간다.
4. 홈에 "안녕, 라윤아 👋" 와 "초등 3학년", "0분 / 10분" 이 보인다.
5. 활동 카드로 **맞춤법 탐험대**와 **100칸 계산**이 보이고, 한글 활동(글자/낱말/문장/쓰기)은 보이지 않는다. (`min_grade 0~1` 범위 밖)
6. 새로고침해도 온보딩으로 돌아가지 않고 홈이 유지된다.

- [ ] **Step 3: 도윤 계정 흐름 확인**

로그아웃 후 `doyoon@dailyglow.dev` / `glow1234` 로 로그인한다.

Expected:
1. 생일에 `2023-08-02` 를 넣으면 학년 **미취학**, 읽기 **아직 못 읽어요**, 목표 **5분** 이 채워진다.
2. 성별을 **남자**로 고르고 이름을 `도윤` 으로 저장한다.
3. 홈의 인사말이 **라윤이 화면보다 눈에 띄게 크다** (`text-5xl` vs `text-3xl`).
4. 활동 카드로 **글자 읽기**와 **더하기 놀이**만 보인다. 낱말 읽기(4단계)·문장 읽기(14단계)는 레벨이 모자라 안 보이고, 맞춤법·100칸은 학년 범위 밖이라 안 보인다.

- [ ] **Step 4: 설정 화면 확인**

도윤 계정에서 설정으로 간다.

Expected:
1. 프로필 값이 채워져 있다.
2. **한글 단계**를 4로 올리면 홈에 **낱말 읽기**가 새로 나타난다.
3. **한글 여기서 멈춰**를 켜고 새로고침하면 체크가 유지된다.

- [ ] **Step 5: 다른 아이 데이터가 안 보이는지 확인 (RLS)**

로그인하지 않은 상태(anon 역할)로 REST API를 직접 찔러 본다. anon 에게는 정책이 없으므로
데이터가 새어 나오면 안 된다.

Run:
```bash
ANON_KEY=$(supabase status --output json | python3 -c 'import json,sys; print(json.load(sys.stdin)["ANON_KEY"])')
curl -s "http://127.0.0.1:54321/rest/v1/profiles?select=id,display_name" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
```
Expected: `[]` — 빈 배열. 세 아이 이름이 하나라도 나오면 RLS 가 잘못된 것이다.

Run:
```bash
curl -s "http://127.0.0.1:54321/rest/v1/sessions?select=id" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
curl -s "http://127.0.0.1:54321/rest/v1/profile_subject_levels?select=profile_id" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
```
Expected: 둘 다 `[]`.

- [ ] **Step 6: README 갱신**

`README.md` 의 "로컬 환경 정보" 표에서 테스트 계정 행을 다음으로 교체:

```markdown
| 테스트 계정 | `rayoon@dailyglow.dev` · `siyoon@dailyglow.dev` · `doyoon@dailyglow.dev` (비밀번호 모두 `glow1234`) |
```

"남은 작업" 목록에서 다음 두 줄을 삭제한다:

```markdown
- [ ] 회원가입 / 프로필(닉네임·아바타) 화면
- [ ] 실제 과목별 정답률 → `HomePage` 차트 연결
```

그리고 다음을 추가한다:

```markdown
- [ ] Phase 2: 활동 렌더러 (맞춤법 · 글자/낱말/문장 읽기 · 더하기) + 한글 35단계 시스템
- [ ] Phase 3: 100칸 계산 + 인쇄
- [ ] Phase 4: 사진 채점 (Edge Function, `ANTHROPIC_API_KEY` 필요)
```

- [ ] **Step 7: 커밋**

```bash
git add README.md
git commit -m "docs: Phase 1 완료 — 계정 정보와 남은 단계 갱신"
```

---

## 완료 기준

- 세 아이가 각자 계정으로 로그인해 온보딩을 마치고 홈에 도달한다.
- 홈의 인사말 크기, 활동 카드 목록이 아이마다 다르다.
- 설정에서 프로필과 과목별 단계를 바꾸면 홈에 즉시 반영된다.
- `pnpm typecheck && pnpm lint && pnpm test` 가 모두 통과한다.

## 다음 단계

Phase 2 계획서(`docs/superpowers/plans/`)를 별도로 작성한다 — 활동 레지스트리, 한글 35단계 시스템(자모 분해와 최소 단계 자동 계산), 맞춤법 탐험대, 글자·낱말·문장 읽기, 더하기 놀이, 그리고 각 활동의 콘텐츠 seed.

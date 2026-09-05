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

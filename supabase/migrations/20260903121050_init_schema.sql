-- DailyGlow 초기 스키마
-- 학습 콘텐츠(subjects/lessons/problems)는 공개 읽기,
-- 개인 데이터(profiles/attempts/progress/wrong_type_stats)는 RLS 로 본인만 접근.

-- ─────────────────────────────────────────────
-- 콘텐츠
-- ─────────────────────────────────────────────
create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  sort_order  int  not null default 0
);

create table public.lessons (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references public.subjects (id) on delete cascade,
  slug        text not null,
  title       text not null,
  level       int  not null default 1,
  sort_order  int  not null default 0,
  unique (subject_id, slug)
);
create index lessons_subject_idx on public.lessons (subject_id, sort_order);

create table public.problems (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.lessons (id) on delete cascade,
  type_id     text not null,
  prompt      jsonb not null,
  answer      jsonb not null,
  difficulty  int  not null default 1
);
create index problems_lesson_idx on public.problems (lesson_id, difficulty);
create index problems_type_idx on public.problems (type_id);

-- ─────────────────────────────────────────────
-- 개인 데이터
-- ─────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null,
  birth_year    int,
  avatar_key    text,
  total_xp      int  not null default 0,
  created_at    timestamptz not null default now()
);

create type public.progress_status as enum ('locked', 'in_progress', 'completed');

create table public.progress (
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  lesson_id      uuid not null references public.lessons (id) on delete cascade,
  status         public.progress_status not null default 'in_progress',
  best_accuracy  numeric(4, 3) not null default 0,
  completed_at   timestamptz,
  updated_at     timestamptz not null default now(),
  primary key (profile_id, lesson_id)
);

create table public.attempts (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  problem_id  uuid not null references public.problems (id) on delete cascade,
  type_id     text not null,
  is_correct  boolean not null,
  response    jsonb,
  duration_ms int,
  created_at  timestamptz not null default now()
);
create index attempts_profile_idx on public.attempts (profile_id, created_at desc);
create index attempts_type_idx on public.attempts (profile_id, type_id);

create table public.wrong_type_stats (
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  type_id       text not null,
  attempts      int  not null default 0,
  correct       int  not null default 0,
  streak        int  not null default 0,
  last_seen_at  timestamptz not null default now(),
  primary key (profile_id, type_id)
);

-- ─────────────────────────────────────────────
-- 신규 가입 시 프로필 자동 생성
-- ─────────────────────────────────────────────
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', '친구'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- 풀이 기록 시 유형별 통계 갱신 (SRS 입력)
-- ─────────────────────────────────────────────
create function public.bump_type_stat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.wrong_type_stats (profile_id, type_id, attempts, correct, streak, last_seen_at)
  values (
    new.profile_id,
    new.type_id,
    1,
    case when new.is_correct then 1 else 0 end,
    case when new.is_correct then 1 else 0 end,
    now()
  )
  on conflict (profile_id, type_id) do update set
    attempts     = public.wrong_type_stats.attempts + 1,
    correct      = public.wrong_type_stats.correct + case when new.is_correct then 1 else 0 end,
    streak       = case when new.is_correct then public.wrong_type_stats.streak + 1 else 0 end,
    last_seen_at = now();
  return new;
end;
$$;

create trigger on_attempt_inserted
  after insert on public.attempts
  for each row execute function public.bump_type_stat();

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table public.subjects enable row level security;
alter table public.lessons  enable row level security;
alter table public.problems enable row level security;
alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.attempts enable row level security;
alter table public.wrong_type_stats enable row level security;

-- 콘텐츠: 로그인 사용자는 읽기만
create policy "content readable by authenticated"
  on public.subjects for select to authenticated using (true);
create policy "content readable by authenticated"
  on public.lessons for select to authenticated using (true);
create policy "content readable by authenticated"
  on public.problems for select to authenticated using (true);

-- 프로필: 본인 것만 읽기/수정
create policy "own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "own profile update" on public.profiles
  for update to authenticated using (id = (select auth.uid()));

-- 진도 / 풀이 / 유형통계: 본인 것만 전체 접근
create policy "own progress" on public.progress
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "own attempts" on public.attempts
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "own type stats" on public.wrong_type_stats
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

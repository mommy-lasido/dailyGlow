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
   'authenticated', 'authenticated', 'layoon@dailyglow.dev', crypt('glow1234', gen_salt('bf')),
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
   '{"sub":"00000000-0000-0000-0000-0000000000a1","email":"layoon@dailyglow.dev"}',
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

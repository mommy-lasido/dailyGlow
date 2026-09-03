-- 로컬 개발용 시드 데이터. `supabase db reset` 시 자동 적용.

-- ── 개발용 테스트 계정 (test@dailyglow.dev / test1234) ──────────
-- auth.users + auth.identities 를 직접 넣는다. handle_new_user 트리거가 profiles 를 생성.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000a11',
  'authenticated', 'authenticated',
  'test@dailyglow.dev', crypt('test1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{"display_name":"테스트"}', false,
  '', '', '', ''
);

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000a11',
  '00000000-0000-0000-0000-000000000a11',
  '{"sub":"00000000-0000-0000-0000-000000000a11","email":"test@dailyglow.dev"}',
  'email', now(), now(), now()
);


insert into public.subjects (slug, title, sort_order) values
  ('hangul',  '한글', 1),
  ('korean',  '국어', 2),
  ('english', '영어', 3),
  ('math',    '수학', 4);

-- 수학 Lv.1 예시 학습 + 문제
with m as (select id from public.subjects where slug = 'math')
insert into public.lessons (subject_id, slug, title, level, sort_order)
select m.id, 'add-1-10', '10까지 더하기', 1, 1 from m;

with l as (select id from public.lessons where slug = 'add-1-10')
insert into public.problems (lesson_id, type_id, prompt, answer, difficulty)
select l.id, 'math.add.basic',
       jsonb_build_object('a', a, 'b', b, 'text', a || ' + ' || b || ' = ?'),
       jsonb_build_object('value', a + b),
       1
from l, (values (1, 2), (3, 4), (5, 5), (2, 6), (7, 1)) as t(a, b);

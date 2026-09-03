-- 로컬 개발용 시드 데이터. `supabase db reset` 시 자동 적용.

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

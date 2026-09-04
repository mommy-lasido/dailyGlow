-- 이름을 성과 이름으로 나눈다.
--
-- 프로필에는 성을 포함한 온전한 이름을 적지만, 홈 화면에서 아이를 부를 때는
-- 이름만 불러야 자연스럽다 — "안녕, 정라윤아" 가 아니라 "안녕, 라윤아".
--
-- display_name 에서 성을 자동으로 떼어낼 수는 없다. 남궁·선우·제갈처럼 두 글자
-- 성이 있고, '정라윤' 과 '라윤' 을 글자 수만으로 구분할 방법도 없다. 그래서
-- 이름만 따로 받아 둔다.
--
-- display_name 은 그대로 온전한 이름(성+이름)으로 남기고 not null 도 유지한다.
-- given_name 은 nullable 이다 — 기존 행과 트리거가 만든 행에는 값이 없고,
-- 화면은 그럴 때 display_name 으로 되돌아간다.
alter table public.profiles
  add column given_name text;

comment on column public.profiles.given_name is
  '성을 뺀 이름. 화면에서 아이를 부를 때 쓴다. 비어 있으면 display_name 으로 대신한다.';

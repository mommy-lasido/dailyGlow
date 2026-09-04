# DailyGlow — 로그인·프로필 기반 맞춤 학습과 기존 앱 이관

작성일: 2026-09-04

---

## 0. 쉬운 말 요약

DailyGlow는 세 자매가 각자 자기 계정으로 들어와, 자기 수준에 맞는 학습만 하는 앱이다.

지금까지는 아이마다 HTML 파일을 하나씩 따로 만들어 썼다. 그 파일들은 기록이 그 태블릿
안에만 남아서, 브라우저 기록을 지우면 그동안 쌓은 게 전부 사라진다. 아이가 늘어날수록
파일도 늘어난다.

이 작업은 그 파일들의 내용을 DailyGlow로 옮기고, 그 위에 **로그인**과 **아이별 맞춤**을
얹는다. 옮기고 나면 기록이 서버에 안전하게 쌓이고, 세 아이의 진도를 한 곳에서 볼 수 있으며,
새 학습을 추가할 때 파일을 새로 만들 필요가 없다.

**핵심 원칙: 태블릿은 문제를 내주고 인쇄하고 기록하는 도구이고, 쓰기와 계산은 종이에서
연필로 한다.** 종이로 푼 결과는 사진을 찍어 앱에 넣는다. 화면에 손글씨를 쓰는 기능은
넣지 않는다 — 소근육 발달에는 연필과 종이가 필요하기 때문이다.

---

## 1. 배경

### 옮겨올 것

현재 데스크톱에 두 개의 단일 HTML 파일이 있다.

| 파일 | 대상 | 담긴 활동 |
|---|---|---|
| `files_라윤/index.html` (1,928줄) | 라윤 | 맞춤법 탐험대(낱말 95쌍), 100칸 계산 |
| `시윤 학습놀이터/files/index.html` (651줄) | 시윤 | 문장 읽기(3레벨 ~300문장), 쓰기 학습지 인쇄, 더하기 놀이 |

두 파일 모두 의존성 없는 순수 바닐라 JS이고, 교육 설계 자체는 탄탄하다. 기록은
`localStorage`에만 남는다.

### 이미 만들어져 있는 것

DailyGlow 저장소에는 스캐폴드가 끝나 있다.

- 이메일·비밀번호 로그인이 이미 동작한다 (`LoginPage.tsx`, `stores/auth.ts`, `RequireAuth.tsx`)
- `subjects / lessons / problems / profiles / progress / attempts / wrong_type_stats` 스키마와
  RLS가 적용되어 있다
- `handle_new_user` 트리거가 가입 시 프로필을 자동 생성한다
- Dexie 오프라인 큐(`lib/db.ts`, `lib/sync.ts`)와 SRS 복습 로직(`packages/utils/src/srs.ts`)이 있다
- `LessonPage`는 `JSON.stringify(prompt)`를 출력하는 자리표시자다 — 문제 렌더러가 없다

따라서 이 작업은 "로그인을 새로 만드는 것"이 아니라, **기존 로그인 위에 프로필·맞춤
레이어를 얹고, 활동 렌더러를 채우고, 두 앱의 콘텐츠를 이관하는 것**이다.

---

## 2. 사용자

| 이름 | 생일 | 학년·단계 | 주된 활동 |
|---|---|---|---|
| 라윤 | 2018년생 | 초등 3학년 | 맞춤법 탐험대, 100칸 계산 |
| 시윤 | 2021년생 | 유치원 (한글 4단계) | 글자·낱말 읽기, 쓰기 학습지, 더하기 |
| 정도윤 (남) | 2023-08-02 | 미취학 (한글 1단계부터) | 글자 읽기 |

세 아이 모두 **자기 이메일 계정**을 갖는다. 부모(`mommy@lasido.family`)가 대신 로그인해준다.
회원가입 화면은 이번 범위에 없으므로 계정은 seed로 생성한다.

라윤과 시윤은 여아, 도윤은 남아다.

---

## 3. 인증과 프로필

### 계정 구조

아이 한 명 = 계정 하나. `profiles.id`가 `auth.users.id`를 그대로 참조하는 현재 구조를
유지한다. 부모 계정 아래 여러 자녀 프로필을 두는 구조는 검토했으나, DB 변경이 크고
아이가 셋뿐이라 이득이 없어 채택하지 않았다.

### 프로필 필드

`profiles` 테이블을 확장한다.

| 필드 | 값 | 앱에서 바꾸는 것 |
|---|---|---|
| `display_name` | 이름 | 호칭, 칭찬 문구 |
| `gender` | `female` / `male` | 말투·캐릭터, 예시 문장에서 `언니/오빠` 같은 화자 표현 선택 |
| `birth_date` | 날짜 | **초기 추천값 계산에만** 사용 |
| `grade` | `preschool` / `g1`…`g6` | 어떤 활동을 노출할지 |
| `reading_level` | `pre_reader` / `learning` / `fluent` | 글자 크기, 설명의 양, 🔊 읽어주기 버튼 노출 |
| `daily_goal_minutes` | 5 / 10 / 15 / 20 | 홈의 "오늘의 목표" 진행바 기준 |
| `onboarded_at` | timestamptz | 온보딩 완료 여부 판정 |

기존 `birth_year`(int)는 `birth_date`(date)로 대체한다. `avatar_key`, `total_xp`는 그대로 둔다.

**학년은 생일에서 자동 계산하지 않는다.** 라윤(2018년생)을 한국 학제로 계산하면 2026년
9월 기준 초2가 나오는데 실제로는 초3이다. 조기입학·학제 차이 때문에 자동 계산은 신뢰할 수
없다. 생일은 온보딩에서 **추천값을 제안**하는 데만 쓰고, 최종 결정은 사람이 한다.

보류한 필드: 관심사 태그, 손잡이, 알림 시간대, 학교·반. 지금 소비처가 없다.

### 온보딩

로그인 후 `profiles.onboarded_at`이 비어 있으면 온보딩 화면으로 보낸다. 이름·성별·생일·
학년·읽기 수준·하루 목표를 한 번 입력받고, 저장 시 생일과 학년으로부터 **과목별 초기 레벨을
제안**한다. 완료 후에는 홈으로 직행하며, 설정 화면에서 언제든 수정할 수 있다.

이 화면은 나중에 회원가입 기능을 붙일 때 그대로 재사용한다.

---

## 4. 맞춤 방식 — 과목별 레벨

아이의 수준은 **과목마다 따로** 관리한다. 시윤이가 더하기를 잘하면 수학만 위 단계로
올라가고 한글은 그대로다. 생일·학년은 초기값 제안에만 쓰이고, 이후에는 실제 진도가
레벨을 움직인다.

```sql
create table public.profile_subject_levels (
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  subject_id  uuid not null references public.subjects (id) on delete cascade,
  level       int  not null default 1,
  locked      boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (profile_id, subject_id)
);
```

`locked`는 부모가 "여기서 멈춰"를 걸어둔 상태다. 켜져 있으면 자동 진급이 일어나지 않는다.

`level`의 의미는 과목마다 다르다. **한글 과목에서는 `level`이 곧 기적의 한글 학습 단계
번호(1~35)다**(§6). 수학·국어에서는 활동별 난이도 단계이며, `lessons.subject_level`이
그 값 이하인 학습만 노출한다.

---

## 5. 활동 모델

### 문제

옮겨올 활동들의 성격이 서로 다르다. 현재 스키마는 "정답이 있는 문제 카드" 하나만
상정하는데, 네 활동 중 셋이 거기에 맞지 않는다.

| 활동 | 문제 출처 | 정답 | 한 판의 단위 |
|---|---|---|---|
| 맞춤법 탐험대 | 고정 데이터 95쌍 | 있음 | 10문제 + 오답 복습 |
| 100칸 계산 | 런타임 생성 | 있음 | 100칸 = 한 판, 시간이 핵심 |
| 글자·낱말·문장 읽기 | 고정 데이터 | **없음** | 10개 |
| 더하기 놀이 | 런타임 생성 | 있음 | 10문제 |

### 해법 — 활동 종류와 두 갈래 문제 출처

`lessons`에 **활동 종류**를 붙이고, 프론트엔드는 그 값으로 렌더러를 고른다. 문제는
DB에서 오거나 클라이언트 생성기가 만든다.

```sql
alter table public.lessons
  add column activity_kind text not null default 'choice_quiz',
  add column config jsonb not null default '{}'::jsonb,
  add column subject_level int not null default 1;

alter table public.problems
  alter column answer drop not null,
  add column min_hangul_stage int;
```

`activity_kind` 값과 매핑:

| `activity_kind` | 활동 | 문제 출처 |
|---|---|---|
| `choice_quiz` | 맞춤법 탐험대, 더하기 놀이 | DB / 런타임 |
| `grid_drill` | 100칸 계산 | 런타임 (`config`의 범위·연산) |
| `letter_cards` | 글자 읽기 | 런타임 (단계별 자모 조합) |
| `word_cards` | 낱말 읽기 | DB |
| `reading_cards` | 문장 읽기 | DB |
| `worksheet` | 쓰기 학습지 | 직전 읽기 세션의 문장 |

프론트엔드는 `activity_kind → React 컴포넌트` 레지스트리 하나를 둔다. 새 활동을 추가할 때
컴포넌트 하나와 레지스트리 한 줄이면 된다. 각 활동은 **화면 렌더러와 인쇄 렌더러를 한 쌍**으로
가질 수 있다.

### 한 판의 기록

문항 단위 기록(`attempts`)만으로는 100칸 계산처럼 "한 판에 걸린 시간"이 핵심인 활동을
다룰 수 없다. 세션 요약 테이블을 추가한다.

```sql
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
```

`mode`가 화면 풀이와 종이 풀이를 구분한다. **두 기록은 같은 목록에 섞이지만 서로 다른
배지로 표시하고, 최고 기록도 따로 집계한다.** 화면 입력과 연필 쓰기는 손의 속도가 달라
같은 기준으로 비교할 수 없기 때문이다.

---

## 6. 한글 단계 시스템

가장 큰 설계 변경이다. 기존 시윤이 앱은 한글을 "받침 없음 / 쉬운 받침 / 어려운 받침"
세 덩어리로만 나눴다. 그래서 받침 ㅇ만 배운 아이에게 받침 ㅅ이 든 문장이 나올 수 있었다.

이를 **기적의 한글 학습**(길벗스쿨, 5권 35단계) 순서로 재구성한다.

| 권 | 단계 | 내용 |
|---|---|---|
| 1권 | 1~7 | 기본 모음 10개, 기본 자음 ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ |
| 2권 | 8~14 | 기본 자음 ㅅ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ |
| 3권 | 15~21 | 받침 ㅇ ㅁ ㄹ ㄴ ㄱ ㅂ ㅅ |
| 4권 | 22~28 | 복잡한 모음 11개 (ㅐ ㅔ ㅟ ㅘ ㅢ 등) |
| 5권 | 29~35 | 쌍자음 ㄲ ㄸ ㅃ ㅆ ㅉ, 필기 순서 2단계 |

4권 26~28단계의 세부 모음 배정은 확인하지 못했다. 구현 시 책의 목차를 보고 채운다.

### 단계별 자모 집합과 자동 난이도 판정

35단계 각각에 **그 단계까지 배운 초성·중성·종성 집합**을 정의한다
(`packages/utils/src/hangul-stages.ts`). 이 정의는 변하지 않는 커리큘럼이므로 DB가 아니라
코드에 둔다.

그런 다음 낱말·문장을 유니코드로 분해해 **읽을 수 있는 최소 단계**를 자동 계산한다.
한글 음절은 `(코드포인트 - 0xAC00)`에서 초성·중성·종성을 산술로 뽑아낼 수 있다.

```
문장의 최소 단계 = 문장에 쓰인 모든 자모가 처음으로 전부 포함되는 단계
```

계산 결과를 `problems.min_hangul_stage`에 저장한다. **사람이 문장을 분류할 필요가 없다.**
기존 시윤이 앱 데이터에 이미 "받침 유무를 유니코드로 검증했다"는 메모가 있어, 같은 방식의
확장이다.

이 규칙 하나로 글자·낱말·문장 세 활동이 모두 돌아간다.

### 아이에게는 단계를 보여주지 않는다

35라는 숫자는 아이에게 부담이고 의미도 없다.

- **아이 화면**: "오늘은 ㄷ" 큰 글자 카드 하나와 시작 버튼. 단계 번호는 나오지 않는다.
- **진행 표시**: 35칸을 한 줄로 늘어놓지 않고 **5개 구역(권) × 발도장 7개**로 묶어 보여준다.
  "이번 구역만 하면 돼"가 되어 체감 부담이 줄어든다.
- **부모 설정 화면**: 여기에만 단계 번호와 권별 진행률이 나온다.

### 진급

그 단계의 내용을 마치면 앱이 자동으로 다음 단계로 넘긴다. 35번을 손으로 올리는 것은
현실적이지 않다. 다만 `profile_subject_levels.locked`를 켜면 그 단계에 머문다 — 책 진도가
느릴 때 부모가 멈춰둘 수 있다.

### 읽기 활동 세 가지

1단계(모음)에는 읽을 문장이 없다. 읽기를 세 활동으로 나눈다.

| 활동 | 시작 단계 | 내용 |
|---|---|---|
| 🔤 글자 읽기 (`letter_cards`) | 1단계 | "가 갸 거 겨" 음절 카드. 톡 누르면 🔊. **도윤이가 여기서 시작** |
| 📗 낱말 읽기 (`word_cards`) | 4단계쯤 | "고기" "나비" — 배운 글자로만 된 낱말. **시윤이가 곧 여기** |
| 📖 문장 읽기 (`reading_cards`) | 14단계쯤 | 기존 시윤이 앱의 활동 |

---

## 7. 활동별 이관 내용

### 📝 맞춤법 탐험대 (라윤)

`choice_quiz`. 낱말 95쌍과 해설을 seed로 `problems`에 넣는다. 각 항목은 문장 템플릿 2개와
보기 2~3개, 보기별 해설을 갖는다 (`type_id = 'korean.spelling.pair'`).

기존 동작을 유지한다 — 한 세트 10문제 무작위 출제, 오답은 **다른 문장 템플릿으로** 다시
복습, 마스코트 표정과 도장, 결과 화면과 지난 기록.

**개선점 하나**: 기존 풀에는 "갔다/갰다"가 3개, "가르쳐↔가리켜"가 양방향으로 2개 있는 등
사실상 같은 주제 항목이 여럿이라 한 세트에 중복 출제될 수 있었다. 각 항목에 `group` 키를
두어 한 세트 안에서 같은 그룹이 두 번 나오지 않게 한다.

### 🔢 100칸 계산 (라윤)

`grid_drill`. 연산 4종, 칸 수 3종(25/64/100), 연산별 레벨과 도전 모드, 타이머, 받아올림·
받아내림 분석을 모두 이관한다. **두 가지 풀이 방식을 모두 지원한다.**

**① 화면 풀이** — 지금처럼 칸에 키보드로 입력. Enter로 다음 칸 이동, 전부 맞으면 자동 저장.
프린터가 없거나 밖에 있을 때 쓴다. `mode = 'screen'`으로 기록한다.

**② 종이 풀이** — 인쇄해서 연필로 푼다. 이쪽이 기본이다. `mode = 'paper'`로 기록하고
채점은 사진으로 한다(§8).

문제판은 반복 연습이 핵심이므로 서버에 보존한다.

```sql
create table public.grid_puzzles (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  op            text not null check (op in ('+', '-', '×', '÷')),
  size          int  not null check (size in (25, 64, 100)),
  level_tag     text not null,
  row_headers   int[] not null,
  col_headers   int[] not null,
  final_goal_sec int not null,
  created_at    timestamptz not null default now()
);

alter table public.sessions
  add column puzzle_id uuid references public.grid_puzzles (id) on delete set null;
```

**고쳐야 할 기존 버그 두 가지**

- 목표 시간이 칸 수와 무관하게 2분 고정이라, 25칸을 2분에 풀어도 100칸과 똑같이 레벨업했다.
  목표를 칸 수에 비례시킨다 (25칸 45초 / 64칸 80초 / 100칸 120초).
- `showAnswers`가 켜진 채 "새 문제 만들기"나 연산 변경을 하면 새 문제판이 정답이 채워진
  상태로 렌더링됐다. 문제판이 바뀔 때 초기화한다.

### 📖 읽기 세 활동 (시윤·도윤)

§6에 서술한 대로 `letter_cards` / `word_cards` / `reading_cards`로 나뉜다. 공통 동작:

- 모르는 낱말(또는 글자)을 톡 누르면 그것만 🔊 읽어준다. 문장 전체를 들려주면 따라만 하게
  되므로, 막힌 부분만 도와 스스로 읽게 한다.
- "전체 듣기" 버튼과 "다음" 버튼.
- 🔊는 브라우저 내장 음성 합성(`SpeechSynthesis`)을 쓴다. **비용 0원, 오프라인 동작.**
  6살이 따라 읽을 수 있도록 속도를 늦춘다.

**넣지 않는 것**: 자기평가 버튼("혼자 읽었어요 / 어려웠어요")과 그에 따른 반복 출제,
음성 인식으로 읽기를 확인하는 기능. 자기평가는 아이 행동을 실제로 바꾸지 못하는 형식상
기능이고, 음성 인식은 6살 발음 인식률이 낮아 맞게 읽고도 틀렸다는 판정을 받으면 읽기
자체를 싫어하게 될 위험이 크다.

기록은 읽은 개수만 남긴다.

### ✏️ 쓰기 학습지 (시윤)

`worksheet`. 직전 읽기 세션의 문장으로 인쇄용 학습지를 만든다. 한 쪽에 5문장, 첫 쪽에만
제목과 이름 칸, 각 문장 아래 쓰기 줄. 기존 `@media print` 레이아웃을 그대로 옮긴다.

**종이에 연필로 쓴다.** 화면 필기 기능은 넣지 않는다. 인쇄했다는 사실만 기록하고, 쓴 결과를
사진으로 모으는 앨범 기능은 만들지 않는다.

### ➕ 더하기 놀이 (시윤)

`choice_quiz`, 런타임 생성. +1 / +2 / +3 / 섞어서, 그림 오브젝트로 개수를 세게 하는 방식,
10문제, 컨페티를 유지한다.

**고쳐야 할 기존 버그**: 오답이어도 `round`와 `correctCount`가 움직이지 않고 정답을 맞혀야만
다음으로 넘어가서, 완료 화면의 점수가 **항상 10/10**이었다. `c >= 6` 분기는 죽은 코드였다.
**첫 시도 정답 수**를 따로 세어 점수와 격려 문구가 실제 의미를 갖게 한다.

---

## 8. 사진 채점

종이가 학습의 중심이 되었으므로, 종이 결과를 앱에 넣는 통로인 사진 채점은 부가기능이 아니라
**핵심 경로**다. 이번 범위에 포함한다.

### 흐름

1. 종이로 100칸을 다 풀고 사진을 찍는다.
2. Supabase Storage에 올린다.
3. Edge Function이 이미지를 Claude에 보내 100칸을 읽는다.
4. **앱은 정답을 이미 알고 있으므로, AI가 읽은 값과 정답이 다른 칸만** 골라 사용자에게
   확인받는다. 98개를 맞혔다면 확인할 칸은 두세 개뿐이다. AI가 잘못 읽었더라도 이 단계에서
   걸러진다.
5. 확정된 결과를 세션에 저장한다. 어느 칸을 틀렸는지까지 남으므로 받아올림 분석이 종이
   풀이에서도 동작한다.

이 "다른 칸만 확인" 방식이 이 기능을 실용적으로 만드는 핵심이다. 100칸 전부를 정확히 읽을
필요가 없다.

```sql
create table public.photo_gradings (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions (id) on delete cascade,
  storage_path  text not null,
  status        text not null default 'pending'
                check (status in ('pending', 'read', 'confirmed', 'failed')),
  ai_read       jsonb,
  disagreements jsonb,
  confirmed     jsonb,
  created_at    timestamptz not null default now()
);
```

### 구현

- **Storage**: 비공개 버킷 `submissions`. RLS로 본인 것만 읽고 쓴다.
- **Edge Function** `grade-grid-photo`: 사진 경로와 정답 배열을 받아 Claude 비전 API를
  호출하고, 읽은 값과 불일치 목록을 돌려준다. 모델은 `claude-opus-5`.
- **API 키**: Supabase 시크릿 `ANTHROPIC_API_KEY`로 주입한다. 브라우저에 키를 두면 도난
  위험이 있으므로 반드시 Edge Function을 거친다.

### 키 없이도 나머지는 동작한다

`ANTHROPIC_API_KEY`는 사용자가 직접 발급받아야 한다. **키 자리만 비워두고 나머지를 전부
완성한다.** 키가 없으면 사진 채점 버튼만 "키를 넣어주세요" 안내를 띄우고, 로그인·프로필·
맞춤법·읽기·더하기·100칸 화면 풀이·인쇄는 전부 정상 동작한다.

### 비용과 제약

사진 한 장에 대략 30~50원. 인터넷이 필요하고, 흐리거나 크게 기울어진 사진은 실패하므로
다시 찍도록 안내한다. 사진은 외부 API로 전송되므로 아이 얼굴이나 이름이 찍히지 않도록
안내 문구를 둔다.

---

## 9. 기록과 오프라인

- 문항 단위 기록은 기존 `attempts`와 Dexie 큐(`attemptQueue`)를 그대로 쓴다. 오프라인에서
  쌓였다가 온라인 복귀 시 flush된다.
- 세션 요약(`sessions`)도 같은 큐 방식으로 오프라인을 지원한다.
- 콘텐츠(맞춤법 95쌍, 낱말·문장)는 첫 접속 시 Dexie로 프리페치해 오프라인에서 쓴다.
- 사진 채점만은 온라인이 필요하다. 오프라인이면 사진을 큐에 넣어두었다가 복귀 시 처리한다.

새 테이블(`profile_subject_levels`, `sessions`, `grid_puzzles`, `photo_gradings`)에는 기존과
동일한 패턴의 RLS를 적용한다 — 본인 행만 전체 접근.

---

## 10. 화면 목록

| 경로 | 화면 | 비고 |
|---|---|---|
| `/login` | 로그인 | 기존 |
| `/onboarding` | 프로필 입력 | 신규, `onboarded_at`이 비면 강제 이동 |
| `/` | 홈 | 인사, 오늘의 목표, 활동 카드 — 프로필에 따라 다르게 |
| `/settings` | 부모 설정 | 프로필 수정, 과목별 레벨·단계 조정, 멈춤 |
| `/activity/:lessonId` | 활동 | `activity_kind`로 렌더러 분기 |
| `/activity/:lessonId/print` | 인쇄 | 100칸 종이용, 쓰기 학습지 |
| `/grade-photo/:sessionId` | 사진 채점 | 촬영 → 읽기 → 불일치 확인 |
| `/records` | 기록 | 세션 목록, 화면·종이 구분 표시 |

기존 `/subject/:subjectId`, `/lesson/:lessonId`, `/review`는 위 구조로 대체한다.

---

## 11. 이번 범위에서 제외하는 것

- 화면 손글씨 입력 (쓰기는 종이와 연필로)
- 시윤이 쓰기 결과 사진 앨범
- 음성 인식으로 읽기 확인
- 읽기 활동의 자기평가 버튼과 그에 따른 반복 출제
- 회원가입 화면 (계정은 seed로 생성)
- 손글씨 숫자 자동 인식 (사진 채점으로 대체)

---

## 12. 작업 순서

네 묶음 모두 이번 범위다. 순서는 아이들이 최대한 빨리 쓸 수 있게 잡았다.

**① 로그인 · 프로필 · 홈**
`profiles` 확장 마이그레이션, `profile_subject_levels`, 온보딩 화면, 설정 화면,
프로필에 따라 달라지는 홈. 세 계정 seed. 이 단계가 끝나면 세 아이가 각자 들어와 자기
화면을 본다.

**② 화면에서 하는 활동들**
활동 레지스트리, `sessions` 테이블, 한글 단계 시스템(`hangul-stages.ts`, 자모 분해,
최소 단계 자동 계산), 맞춤법 탐험대, 글자·낱말·문장 읽기, 더하기 놀이. 콘텐츠 seed.
**여기서부터 아이들이 실제로 쓸 수 있다.**

**③ 100칸 계산과 인쇄**
`grid_puzzles`, 그리드 렌더러, 타이머, 레벨·도전 모드, 받아올림 분석, 인쇄 레이아웃,
쓰기 학습지 인쇄. 기존 버그 수정 포함.

**④ 사진 채점**
Storage 버킷, `photo_gradings`, Edge Function, 촬영·확인 화면. ③이 있어야 채점할 대상이
생기므로 마지막이다. API 키 자리는 비워둔다.

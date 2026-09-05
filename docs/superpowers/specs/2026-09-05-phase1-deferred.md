# Phase 1 이후 미뤄둔 것들

작성일: 2026-09-05
관련: `2026-09-04-auth-profile-and-app-migration-design.md`

Phase 1(로그인·프로필·홈·설정) 작업 중 검토에서 발견됐으나 **의도적으로 미룬** 항목들이다.
각각 "지금보다 나빠지지 않는다"를 확인하고 미뤘다. Phase 2에서 해당 파일을 만질 때 함께 처리한다.

## 고쳐야 하는 것 (Phase 2에서 그 파일을 만질 때)

**온보딩 절반 실패의 재시도 경로가 없다.**
프로필 저장은 성공했는데 `initializeSubjectLevels`가 실패한 상태에서 새로고침하면,
`onboarded_at`이 이미 찍혀 있어 홈으로 들어가고 온보딩은 다시 못 간다. 결과는 "모든 과목
1단계" — Phase 1 이전과 같은 상태라 회귀는 아니다. 홈 진입 시 멱등하게 다시 확인하는
경로를 넣으면 닫힌다.

**`load` 안의 `signOut`이 보호되지 않는다.**
만료된 세션과 동시에 오프라인이면 `await supabase.auth.signOut()`의 거부가
`App.tsx`의 `void loadProfile(...)`을 통해 unhandled rejection으로 새어 나간다.
supabase-js가 `/logout`의 4xx를 삼키고 로컬 저장소는 비우므로 정상 경로는 문제없다.

**RLS 거부(42501)도 로그아웃으로 처리된다.**
의도한 동작이지만, 앞으로 RLS 설정을 잘못 건드리면 진단 가능한 오류 화면 대신
로그인 화면으로 튕기는 형태로 나타난다. Phase 2에서 RLS를 손볼 때 유념할 것.

**설정 화면의 레벨 변경에 in-flight 가드가 없다.**
드롭다운을 빠르게 두 번 바꾸면 오래된 응답이 나중 오류 메시지를 덮을 수 있다.
부모 전용 화면이고 결과가 메시지 한 줄이라 미뤘다.

## 테스트 보강

- `ignoreDuplicates` / `onConflict`를 지워도 실패하는 단위 테스트가 없다. 목이 upsert
  인자를 기록하도록 바꾸면 닫힌다. 현재는 라이브 REST 검증으로만 증명돼 있다.
- `selectActivities`의 상한 경계(`ord == max_grade`)와 하한 미달 케이스가 단위 테스트에 없다.
  seed 데이터로는 실증됐다.
- `save`가 `Partial<ProfileRow>`라 `id`/`created_at`도 타입상 허용된다. `Omit<>` 한 줄이면 된다.

## 다듬을 것

- 홈 인사말의 UTC 파싱: `OnboardingPage`가 날짜 입력을 UTC 자정으로 읽고 `recommendGrade`가
  로컬 게터로 꺼내므로, UTC 서쪽에서는 1월 1일생 학년 추천이 한 살 위로 나온다. KST에서는
  항상 안전하다.
- `SettingsPage`의 `setTimeout(2000)`이 언마운트 시 정리되지 않는다.
- `packages/utils/src/format.ts`의 `SUBJECTS`/`SUBJECT_LABEL`이 과목의 두 번째 진실 원천이
  됐다(실제 과목은 `public.subjects`). 표시용 레거시로만 남아 있으니 Phase 2에서 정리한다.
- 한글 레벨이 1~35 밖이면 `<select>`가 조용히 1단계를 표시한다.
- 온보딩 학년 안내문이 `aria-describedby`로 연결되지 않았다.

## 그대로 둔 파일들

`SubjectPage.tsx`, `LessonPage.tsx`, `ReviewPage.tsx`, `ProgressChart.tsx`, `stores/session.ts`는
라우터에서 빠졌지만 삭제하지 않았다. Phase 2의 활동 렌더러가 이들 중 일부를 대체하거나
참고하게 된다. `apps/web/package.json`의 `recharts`도 `ProgressChart`와 함께 남아 있다.

## 활동 카드의 한 줄 설명

`config.hint`를 읽어 카드 제목 밑에 예시를 붙이는 기능은 **코드가 살아 있고 데이터만 비어
있다.** 활동이 늘어나 제목만으로 구분이 어려워지면 `lessons.config`에 `hint`를 넣기만 하면
된다.

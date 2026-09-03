# DailyGlow (하루배움)

만 5~12세 대상 태블릿 학습 앱. 맞춤형 개인과외 컨셉으로 한글·국어·영어·수학을 학습한다.

## 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React 18 · TypeScript · Vite 6 · Tailwind CSS · React Router v6 · Zustand |
| 데이터 | TanStack Query · Supabase (`@supabase/supabase-js`) |
| 오프라인 | vite-plugin-pwa (Workbox) · Dexie (IndexedDB) |
| 시각화 | Recharts |
| 백엔드 | Supabase (PostgreSQL / Auth / Realtime / Storage) |
| 모노레포 | pnpm workspace · Turborepo |

## 구조

```
dailyGlow/
├── apps/
│   └── web/              React 프론트엔드 (PWA)
├── packages/
│   ├── supabase/         Supabase 클라이언트 팩토리 + DB 타입
│   ├── ui/               공유 컴포넌트 + Tailwind 프리셋
│   └── utils/            레벨/XP · SRS(반복학습) · 포맷 유틸
├── supabase/             로컬 DB (migrations, seed, config)
├── pnpm-workspace.yaml
└── turbo.json
```

## 시작하기

```bash
# 1. 의존성 설치
pnpm install

# 2. 로컬 Supabase 기동 (Docker Desktop 필요)
pnpm db:start          # 출력되는 API URL / anon key 확인
cp apps/web/.env.example apps/web/.env.local   # 값 채우기

# 3. 스키마 + 시드 적용
pnpm db:reset

# 4. DB 타입 재생성 (스키마 변경 시마다)
pnpm db:types

# 5. 개발 서버
pnpm dev              # http://localhost:5173
```

### 로컬 환경 정보

| 항목 | 값 |
|------|-----|
| API URL | `http://127.0.0.1:54321` |
| Studio (DB GUI) | `http://127.0.0.1:54323` |
| Mailpit (메일 확인) | `http://127.0.0.1:54324` |
| 테스트 계정 | `test@dailyglow.dev` / `test1234` (seed.sql, `db:reset` 시 재생성) |

`.env.local` 의 `VITE_SUPABASE_ANON_KEY` 는 `pnpm db:start` 또는 `supabase status` 출력의 `ANON_KEY` 값을 사용한다.

## 스크립트

| 명령 | 설명 |
|------|------|
| `pnpm dev` | 전체 개발 서버 (turbo) |
| `pnpm build` | 전체 빌드 |
| `pnpm typecheck` | 타입 검사 |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest |
| `pnpm db:start` / `db:stop` | 로컬 Supabase |
| `pnpm db:reset` | 마이그레이션 + seed 재적용 |
| `pnpm db:types` | DB 타입 생성 → `packages/supabase/src/database.types.ts` |

## 남은 작업 (스캐폴드 이후)

- [ ] PWA 아이콘: 현재 임시 `apps/web/public/icon.svg`. 스토어 배포 전 192/512 PNG + maskable 로 교체
- [ ] 문제 유형별 렌더러 / 채점기 (`LessonPage` 의 자리표시자 대체)
- [ ] 오프라인 콘텐츠 프리페치 (lessons/problems → Dexie)
- [ ] `wrong_type_stats` ↔ Dexie `typeStats` 동기화
- [ ] 실제 과목별 정답률 → `HomePage` 차트 연결
- [ ] 회원가입 / 프로필(닉네임·아바타) 화면
```

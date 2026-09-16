import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card } from '@dailyglow/ui';
import { GRADE_LABEL, vocativeParticle, type Grade } from '@dailyglow/utils';
import { useAuth } from '@/stores/auth';
import { useProfile } from '@/stores/profile';
import { supabase } from '@/lib/supabase';
import {
  fetchTodayMinutes,
  fetchWeek,
  selectActivities,
  streakOf,
  weekComplete,
  type LessonGateRow,
  type WeekDay,
} from '@/lib/activities';
import { buildSuggestion, fetchRecentSessions } from '@/lib/promotion';
import { stepForDay, weeklyFocus, type WeeklyFocus } from '@/lib/weekly';
import { LevelSuggestionCard } from '@/components/LevelSuggestionCard';
import { ActivityIcon } from '@/components/ActivityIcon';

/** 아직 못 읽는 아이에게는 글자를 크게 보여준다. */
function greetingClass(readingLevel: string | null): string {
  return readingLevel === 'pre_reader' ? 'text-5xl' : 'text-3xl';
}

export function HomePage() {
  const signOut = useAuth((s) => s.signOut);
  const profile = useProfile((s) => s.profile);
  const levels = useProfile((s) => s.levels);

  const {
    data: lessons,
    isPending: lessonsPending,
    isError: lessonsError,
  } = useQuery({
    queryKey: ['activity-catalog'],
    queryFn: async (): Promise<LessonGateRow[]> => {
      const { data, error } = await supabase
        .from('lessons')
        .select(
          'id, title, activity_kind, subject_id, subject_level, sort_order, min_grade, max_grade, config, subjects!inner(slug, title, sort_order)',
        )
        .order('sort_order');
      if (error) throw error;
      return (data ?? []).map((r) => {
        const subject = r.subjects as unknown as {
          slug: string;
          title: string;
          sort_order: number;
        };
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
          sort_order: r.sort_order,
          subject_sort_order: subject.sort_order,
          config: r.config,
        };
      });
    },
  });

  const { data: todayMinutes = 0 } = useQuery({
    queryKey: ['today-minutes', profile?.id],
    enabled: Boolean(profile),
    queryFn: () => fetchTodayMinutes(profile!.id),
  });

  /** 이번 주 출석. 공부한 날에 도장이 찍힌다. */
  const { data: week = [] } = useQuery({
    queryKey: ['week', profile?.id],
    enabled: Boolean(profile),
    queryFn: () => fetchWeek(profile!.id),
  });

  // 단계를 올릴 때가 됐는지 판단할 재료. 없으면 제안이 안 뜰 뿐이라 홈은 그대로 열린다.
  const { data: recentSessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['recent-sessions', profile?.id],
    enabled: Boolean(profile),
    queryFn: () => fetchRecentSessions(profile!.id),
  });

  // DB 타입은 grade 를 string 으로 주므로 도메인 타입으로 좁힌다.
  const grade = (profile?.grade as Grade | null) ?? null;
  const activities = selectActivities(lessons ?? [], grade, levels);
  // 한글 단계가 가리키는 이번 주의 글자. 한글 과목의 레벨을 그대로 쓴다.
  const hangulLevel = lessons?.find((l) => l.subject_slug === 'hangul')?.subject_id;
  const weekly = hangulLevel ? weeklyFocus(levels[hangulLevel]?.level ?? 1) : null;
  const suggestion = buildSuggestion(lessons ?? [], levels, recentSessions, grade);
  const isPreReader = profile?.reading_level === 'pre_reader';
  // 부를 때는 성을 뺀 이름으로. given_name 이 비었거나(빈 문자열 포함) 없는 예전 행은 온전한 이름으로 대신한다.
  const callName = profile?.given_name || profile?.display_name || '친구';

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg text-slate-500">안녕,</p>
          <h1
            data-testid="greeting"
            className={`font-bold text-glow-600 ${greetingClass(profile?.reading_level ?? null)}`}
          >
            {callName}
            {isPreReader ? '! 🌈' : `${vocativeParticle(callName)} 👋`}
          </h1>
          {grade ? <p className="mt-1 text-sm text-slate-400">{GRADE_LABEL[grade]}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* 톱니바퀴 하나로 둔다 — 어디서나 쓰는 표시라 글자가 없어도 알아본다.
              다만 화면을 읽어주는 기기에는 "설정" 이라고 들리도록 이름을 붙인다. */}
          <Link to="/settings" aria-label="설정">
            <Button variant="ghost" className="px-3">
              <GearIcon />
            </Button>
          </Link>
          <Button variant="ghost" onClick={() => void signOut()}>
            로그아웃
          </Button>
        </div>
      </header>

      {/*
        아이 화면에는 **오늘 한 것과 이번 주 도장**만 둔다.
        목표 시간("20분 / 15분")은 다 채우고 나면 무슨 뜻인지 알기 어려웠고, 못 채운
        날에는 모자란다는 말로만 남았다. 처음부터 쌓인 시간은 아이가 쓸 일이 없어
        설정(부모 화면)으로 옮겼다.
      */}
      <Card className="flex flex-col gap-4">
        {/* 숫자만 굵게. 아이가 여기서 보는 것은 "몇 분" 이고, 나머지 말은
            그것을 담는 그릇일 뿐이다. */}
        <span data-testid="today-minutes" className="text-lg text-glow-600">
          ⏰ 오늘 <strong className="text-2xl font-bold">{todayMinutes}분</strong> 공부했어요
        </span>

        <WeekStamps week={week} />
      </Card>

      {weekly ? <WeeklyCard week={weekly} isPreReader={isPreReader} /> : null}

      {/* 단계 제안은 활동 목록 위에 둔다. 아래에 두면 카드를 다 지나쳐야 보인다. */}
      {suggestion ? (
        <LevelSuggestionCard
          key={`${suggestion.subjectId}-${suggestion.kind}-${suggestion.toLevel}`}
          suggestion={suggestion}
          onDone={() => void refetchSessions()}
        />
      ) : null}

      <section className="flex flex-col gap-3">
        <ScienceCard isPreReader={isPreReader} />

        {lessonsPending ? (
          <Card className="text-center text-lg text-slate-400">공부 목록을 불러오는 중이에요…</Card>
        ) : lessonsError ? (
          <Card className="text-center text-lg text-slate-500">
            지금 연결이 잘 안 돼요. 잠시 뒤에 다시 열어봐 주세요.
          </Card>
        ) : activities.length === 0 ? (
          <Card className="text-center text-lg text-slate-500">
            아직 준비된 공부가 없어요. 설정에서 학년과 단계를 확인해 주세요.
          </Card>
        ) : (
          activities.map((a) => (
            <Link key={a.id} to={`/activity/${a.id}`}>
              <Card className="flex items-center gap-4 transition-transform hover:scale-[1.02]">
                <ActivityIcon
                  id={a.iconId}
                  className={`shrink-0 ${isPreReader ? 'h-24 w-24' : 'h-20 w-20'}`}
                />
                {/* min-w-0 — 예시 줄이 길어도 카드 밖으로 밀려나지 않게. */}
                <div className="min-w-0">
                  <h2 className={`font-bold text-glow-700 ${isPreReader ? 'text-3xl' : 'text-2xl'}`}>
                    {a.title}
                  </h2>
                  {/* config.hint 가 있는 카드(지금은 "낱말 읽기")만 제목 바로 밑에
                      예를 보여준다. 제목보다 눈에 띄지 않게 흐리게. 없으면 아무것도 그리지 않는다. */}
                  {a.hint ? (
                    <p className={`text-slate-500 ${isPreReader ? 'text-lg' : 'text-sm'}`}>
                      {a.hint}
                    </p>
                  ) : null}
                </div>
              </Card>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}

/**
 * 과학 놀이터 카드.
 *
 * 다른 활동 카드는 창고에 적힌 목록에서 나오지만, 과학은 내용이 앱 안에 들어
 * 있어 창고를 거치지 않는다. 그래서 이 카드만 따로 그린다.
 *
 * 활동 목록 맨 위에 둔다 — 한글과 수학은 날마다 하는 것이고 과학은 한 주에
 * 하나라, 아래에 묻히면 한 주가 그냥 지나간다.
 */
function ScienceCard({ isPreReader }: { isPreReader: boolean }) {
  return (
    <Link to="/science" data-testid="science-card">
      <Card className="flex items-center gap-4 transition-transform hover:scale-[1.02]">
        <ActivityIcon
          id="science"
          className={`shrink-0 ${isPreReader ? 'h-24 w-24' : 'h-20 w-20'}`}
        />
        <div className="min-w-0">
          <h2 className={`font-bold text-glow-700 ${isPreReader ? 'text-3xl' : 'text-2xl'}`}>
            과학 놀이터
          </h2>
          <p className={`text-slate-500 ${isPreReader ? 'text-lg' : 'text-sm'}`}>
            이번 주에 배울 것이 하나 있어요
          </p>
        </div>
      </Card>
    </Link>
  );
}

/**
 * 설정 톱니바퀴.
 *
 * 그림글자(⚙️)를 쓰지 않는다. 기기가 저마다 다른 색으로 그리는 데다 화면의
 * 다른 것들과 결이 달라 혼자 떠 보인다. 선으로 그린 그림을 글자와 같은 색으로
 * 두면 단추의 일부처럼 보인다.
 */
function GearIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6 1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/**
 * 이번 주 출석 도장.
 *
 * 학교 출석부처럼 월요일부터 일요일까지 일곱 칸을 두고, 공부한 날에 도장을 찍는다.
 * 몇 분을 했는지는 여기서 따지지 않는다 — **한 날이라도 앉았으면 찍힌다.** 목표
 * 시간을 못 채웠다고 빈칸으로 두면, 한 날이 안 한 날과 같아져 버린다.
 *
 * 도장은 찍힌 자리가 눈에 띄어야 한다. 찍힌 칸은 연둣빛으로 채우고 하트가
 * 톡 하고 나타나며, 오늘 칸은 굵은 테두리로 짚어 준다. 아직 오지 않은 날은
 * 아주 흐리게 두어 "아직 남은 자리" 로 보이게 한다.
 */
function WeekStamps({ week }: { week: WeekDay[] }) {
  if (week.length === 0) return null;

  const streak = streakOf(week);
  const complete = weekComplete(week);

  return (
    <div className="flex flex-col gap-3">
      {/* "이번 주 출석" 이라는 이름표는 두지 않는다 — 칸 모양과 요일만 보아도
          무엇인지 알 수 있고, 아이 화면에서 한 줄이라도 덜어내는 편이 낫다. */}
      {streak >= 2 ? (
        <p data-testid="streak" className="text-right text-sm font-bold text-glow-600">
          {streak}일째 이어서 하고 있어요 🔥
        </p>
      ) : null}

      <div className="flex justify-between gap-1">
        {week.map((d) => (
          <div key={d.key} className="flex flex-1 flex-col items-center gap-2.5">
            {/* 달력 한 칸처럼 생겼다 — 날짜를 위에 흐리게 적고 그 아래 도장을
                찍는다. 요일만 있으면 며칠인지 알 수 없어 되짚어 보기 어렵다.
                날짜와 도장을 흐름에 그대로 두고 가운데로 모아, 칸 위아래 여백이
                저절로 같아지게 한다. */}
            <span
              data-testid="stamp"
              data-day={d.label}
              data-done={d.minutes > 0 ? 'yes' : undefined}
              className={`flex aspect-square w-full max-w-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-2xl text-2xl transition-colors ${
                d.minutes > 0
                  ? 'bg-glow-100 ring-2 ring-glow-300'
                  : d.isFuture
                    ? 'bg-glow-50/60'
                    : 'bg-white ring-2 ring-slate-100'
              } ${d.isToday ? 'ring-1 ring-glow-500' : ''}`}
            >
              <span
                data-testid="stamp-date"
                className={`text-[0.6rem] leading-none ${
                  d.isFuture ? 'text-glow-300/70' : 'text-slate-400/80'
                }`}
              >
                {d.date}
              </span>
              {/* 도장 자리는 비어 있어도 높이를 지킨다 — 안 그러면 찍힌 칸과
                  안 찍힌 칸의 날짜 높이가 서로 어긋난다. */}
              <span className={`flex h-7 items-center leading-none ${d.minutes > 0 ? 'animate-pop' : ''}`}>
                {d.minutes > 0 ? '❤️' : ''}
              </span>
            </span>
            <span
              className={`text-xs ${
                d.isToday ? 'font-bold text-glow-600' : 'text-slate-400'
              }`}
            >
              {d.label}
            </span>
          </div>
        ))}
      </div>

      {complete ? (
        <p data-testid="week-done" className="text-center font-bold text-glow-600">
          이번 주 하루도 안 빠졌어요! 정말 잘했어요 🎉
        </p>
      ) : null}
    </div>
  );
}

/**
 * 이번 주의 글자.
 *
 * 한 주 내내 같은 글자를 파고든다. 아이가 목록에서 아무거나 골라 풀면 그날그날
 * 다른 것을 조금씩 건드리고 끝나는데, 교재가 한 주에 글자 하나를 붙잡는 데는
 * 까닭이 있다 — 같은 글자를 여러 날에 걸쳐 여러 방식으로 만나야 남는다.
 *
 * 획순(어떻게 긋는지)은 아직 없다. 영숙님이 옆에서 알려주기로 했다.
 */
function WeeklyCard({ week, isPreReader }: { week: WeeklyFocus; isPreReader: boolean }) {
  const step = stepForDay();

  return (
    <Card className="flex flex-col gap-3">
      {/* 단계 번호는 적지 않는다. 아이가 자기가 몇 단계인지 알 까닭이 없고,
          알면 남과 견주는 숫자가 될 뿐이다. 단계는 설정에서 부모가 본다. */}
      <span className="text-xl font-bold text-glow-600">이번 주에 배울 글자</span>

      <Link to="/weekly" className="flex items-center gap-5">
        <span
          data-testid="weekly-letter"
          className="flex shrink-0 items-center justify-center rounded-3xl bg-glow-50 px-6 py-3 text-6xl font-bold text-glow-700"
        >
          {week.letters.join(' ')}
        </span>
        {/* 낱말은 여기 적지 않는다 — 들어가면 눌러서 들을 수 있고, 여기서는
            오늘 무엇을 하는지만 크게 보이면 된다. */}
        <div className="min-w-0">
          <p className="text-sm text-slate-400">오늘은</p>
          <p
            data-testid="weekly-step"
            className={`font-bold text-glow-700 ${isPreReader ? 'text-3xl' : 'text-2xl'}`}
          >
            {step.name}
          </p>
        </div>
      </Link>

      <Link to="/weekly">
        <Button size="lg" className="w-full">
          오늘의 공부 하러 가기 →
        </Button>
      </Link>
    </Card>
  );
}

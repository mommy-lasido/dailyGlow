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
  type LessonGateRow,
  type WeekDay,
} from '@/lib/activities';
import { buildSuggestion, fetchRecentSessions } from '@/lib/promotion';
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
          <Link to="/settings">
            <Button variant="ghost">설정</Button>
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
        <span data-testid="today-minutes" className="text-xl font-bold text-glow-600">
          ⏱ 오늘 {todayMinutes}분 공부했어요
        </span>

        <WeekStamps week={week} />
      </Card>

      {/* 단계 제안은 활동 목록 위에 둔다. 아래에 두면 카드를 다 지나쳐야 보인다. */}
      {suggestion ? (
        <LevelSuggestionCard
          key={`${suggestion.subjectId}-${suggestion.kind}-${suggestion.toLevel}`}
          suggestion={suggestion}
          onDone={() => void refetchSessions()}
        />
      ) : null}

      <section className="flex flex-col gap-3">
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
 * 이번 주 출석 도장.
 *
 * 학교 출석부처럼 월요일부터 일요일까지 일곱 칸을 두고, 공부한 날에 도장을 찍는다.
 * 몇 분을 했는지는 여기서 따지지 않는다 — **한 날이라도 앉았으면 찍힌다.** 목표
 * 시간을 못 채웠다고 빈칸으로 두면, 한 날이 안 한 날과 같아져 버린다.
 *
 * 아직 오지 않은 날은 흐리게 둔다. 오늘은 테두리로 짚어 준다.
 */
function WeekStamps({ week }: { week: WeekDay[] }) {
  if (week.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold text-slate-500">이번 주 출석</p>
      <div className="flex justify-between gap-1">
        {week.map((d) => (
          <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs text-slate-400">{d.label}</span>
            <span
              data-testid="stamp"
              data-day={d.label}
              data-done={d.minutes > 0 ? 'yes' : undefined}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl ${
                d.minutes > 0
                  ? 'bg-glow-100'
                  : d.isFuture
                    ? 'bg-slate-50'
                    : 'bg-white ring-1 ring-slate-200'
              } ${d.isToday ? 'ring-4 ring-glow-500' : ''}`}
            >
              {d.minutes > 0 ? '⭐' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

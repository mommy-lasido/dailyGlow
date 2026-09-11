import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, ProgressBar } from '@dailyglow/ui';
import { GRADE_LABEL, vocativeParticle, type Grade } from '@dailyglow/utils';
import { useAuth } from '@/stores/auth';
import { useProfile } from '@/stores/profile';
import { supabase } from '@/lib/supabase';
import {
  fetchTodayMinutes,
  selectActivities,
  type LessonGateRow,
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

  // 단계를 올릴 때가 됐는지 판단할 재료. 없으면 제안이 안 뜰 뿐이라 홈은 그대로 열린다.
  const { data: recentSessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['recent-sessions', profile?.id],
    enabled: Boolean(profile),
    queryFn: () => fetchRecentSessions(profile!.id),
  });

  const goal = profile?.daily_goal_minutes ?? 10;
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

      <Card className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold text-glow-600">오늘의 목표</span>
          <span className="text-lg text-slate-500">
            {todayMinutes}분 / {goal}분
          </span>
        </div>
        <ProgressBar ratio={goal === 0 ? 0 : todayMinutes / goal} />
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
                  <h2 className={`font-bold text-slate-700 ${isPreReader ? 'text-4xl' : 'text-3xl'}`}>
                    {a.title}
                  </h2>
                  {/* config.hint 가 있는 카드(지금은 "낱말 읽기")만 제목 바로 밑에
                      예를 보여준다. 제목보다 눈에 띄지 않게 흐리게. 없으면 아무것도 그리지 않는다. */}
                  {a.hint ? (
                    <p className={`text-slate-500 ${isPreReader ? 'text-xl' : 'text-base'}`}>
                      {a.hint}
                    </p>
                  ) : null}
                  <p className="text-sm text-slate-400">{a.subjectTitle}</p>
                </div>
              </Card>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}

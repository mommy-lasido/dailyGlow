import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, ProgressBar } from '@dailyglow/ui';
import { GRADE_LABEL, type Grade } from '@dailyglow/utils';
import { useAuth } from '@/stores/auth';
import { useProfile } from '@/stores/profile';
import { supabase } from '@/lib/supabase';
import {
  fetchTodayMinutes,
  selectActivities,
  type LessonGateRow,
} from '@/lib/activities';

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
          'id, title, activity_kind, subject_id, subject_level, min_grade, max_grade, subjects!inner(slug, title, sort_order)',
        )
        .order('sort_order');
      if (error) throw error;
      return (data ?? []).map((r) => {
        const subject = r.subjects as unknown as { slug: string; title: string };
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
        };
      });
    },
  });

  const { data: todayMinutes = 0 } = useQuery({
    queryKey: ['today-minutes', profile?.id],
    enabled: Boolean(profile),
    queryFn: () => fetchTodayMinutes(profile!.id),
  });

  const goal = profile?.daily_goal_minutes ?? 10;
  // DB 타입은 grade 를 string 으로 주므로 도메인 타입으로 좁힌다.
  const grade = (profile?.grade as Grade | null) ?? null;
  const activities = selectActivities(lessons ?? [], grade, levels);
  const isPreReader = profile?.reading_level === 'pre_reader';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg text-slate-500">안녕,</p>
          <h1
            data-testid="greeting"
            className={`font-bold text-glow-600 ${greetingClass(profile?.reading_level ?? null)}`}
          >
            {profile?.display_name ?? '친구'}
            {isPreReader ? '! 🌈' : '아 👋'}
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

      <section className="flex flex-col gap-4">
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
              <Card className="flex items-center gap-5 transition-transform hover:scale-[1.02]">
                <span className={isPreReader ? 'text-6xl' : 'text-5xl'}>{a.emoji}</span>
                <div>
                  <h2 className={`font-bold text-slate-700 ${isPreReader ? 'text-3xl' : 'text-2xl'}`}>
                    {a.title}
                  </h2>
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

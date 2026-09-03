import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, ProgressBar } from '@dailyglow/ui';
import { SUBJECTS, SUBJECT_LABEL, levelFromXp } from '@dailyglow/utils';
import { useAuth } from '@/stores/auth';
import { supabase } from '@/lib/supabase';
import { ProgressChart, type ProgressDatum } from '@/components/ProgressChart';

export function HomePage() {
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const level = levelFromXp(profile?.total_xp ?? 0);

  // TODO: 실제 과목별 정답률로 교체. 지금은 자리표시자.
  const chartData: ProgressDatum[] = SUBJECTS.map((s) => ({
    label: SUBJECT_LABEL[s],
    accuracy: 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-lg text-slate-500">안녕,</p>
          <h1 className="text-3xl font-bold text-glow-600">
            {profile?.display_name ?? '친구'}
          </h1>
        </div>
        <Button variant="ghost" onClick={() => void signOut()}>
          로그아웃
        </Button>
      </header>

      <Card className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-glow-600">레벨 {level.level}</span>
          <span className="text-sm text-slate-500">
            다음 레벨까지 {level.xpForNextLevel - level.xpIntoLevel} XP
          </span>
        </div>
        <ProgressBar ratio={level.ratio} />
      </Card>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {SUBJECTS.map((s) => (
          <Link key={s} to={`/subject/${s}`}>
            <Card className="flex min-h-[8rem] items-center justify-center text-2xl font-bold text-glow-600 transition-transform hover:scale-105">
              {SUBJECT_LABEL[s]}
            </Card>
          </Link>
        ))}
      </section>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-slate-700">과목별 정답률</h2>
        <ProgressChart data={chartData} />
        <Link to="/review">
          <Button variant="secondary" size="lg" className="w-full">
            틀린 문제 다시 풀기
          </Button>
        </Link>
      </Card>
    </div>
  );
}

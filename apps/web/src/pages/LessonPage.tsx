import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, ProgressBar } from '@dailyglow/ui';
import { formatAccuracy } from '@dailyglow/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { useLearnSession } from '@/stores/session';
import { db } from '@/lib/db';

export function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const user = useAuth((s) => s.user);
  const session = useLearnSession();

  const { data: problems, isLoading } = useQuery({
    queryKey: ['problems', lessonId],
    enabled: Boolean(lessonId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .eq('lesson_id', lessonId!)
        .order('difficulty');
      if (error) throw error;
      return data;
    },
  });

  const current = problems?.[session.index];
  const done = Boolean(problems && session.index >= problems.length);
  const ratio = useMemo(
    () => (problems && problems.length > 0 ? session.index / problems.length : 0),
    [problems, session.index],
  );

  async function answer(isCorrect: boolean) {
    if (!current || !user) return;
    await db.attemptQueue.add({
      profileId: user.id,
      problemId: current.id,
      typeId: current.type_id,
      isCorrect,
      response: null,
      durationMs: 0,
      createdAt: new Date().toISOString(),
      synced: 0,
    });
    session.recordAnswer(isCorrect);
  }

  if (isLoading) return <p className="text-xl text-slate-500">불러오는 중…</p>;

  return (
    <div className="flex flex-col gap-6">
      <ProgressBar ratio={ratio} label="진행도" />

      {done ? (
        <Card className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-bold text-glow-600">다 풀었어요! 🎉</h2>
          <p className="text-xl text-slate-600">
            정답률 {formatAccuracy(session.correct, session.answered)}
          </p>
          <Link to="/">
            <Button
              size="lg"
              onClick={() => session.reset()}
            >
              홈으로
            </Button>
          </Link>
        </Card>
      ) : current ? (
        <Card className="flex flex-col gap-6">
          <p className="text-sm text-slate-400">유형: {current.type_id}</p>
          <div className="min-h-[8rem] rounded-2xl bg-glow-50 p-6 text-center text-2xl font-bold text-slate-700">
            {/* prompt 렌더러는 유형별로 분기 예정 */}
            {JSON.stringify(current.prompt)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button size="lg" variant="secondary" onClick={() => void answer(true)}>
              맞았어요
            </Button>
            <Button size="lg" variant="ghost" onClick={() => void answer(false)}>
              틀렸어요
            </Button>
          </div>
        </Card>
      ) : (
        <p className="text-lg text-slate-500">이 학습에는 아직 문제가 없어요.</p>
      )}
    </div>
  );
}

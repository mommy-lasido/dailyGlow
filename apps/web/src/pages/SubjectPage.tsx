import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card } from '@dailyglow/ui';
import { SUBJECT_LABEL, type SubjectId } from '@dailyglow/utils';
import { supabase } from '@/lib/supabase';

export function SubjectPage() {
  const { subjectId } = useParams<{ subjectId: SubjectId }>();

  const { data: lessons, isLoading } = useQuery({
    queryKey: ['lessons', subjectId],
    enabled: Boolean(subjectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, level, sort_order, subjects!inner(slug)')
        .eq('subjects.slug', subjectId!)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost">← 홈</Button>
        </Link>
        <h1 className="text-3xl font-bold text-glow-600">
          {subjectId ? SUBJECT_LABEL[subjectId] : '과목'}
        </h1>
      </header>

      {isLoading ? (
        <p className="text-xl text-slate-500">불러오는 중…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(lessons ?? []).map((lesson) => (
            <Link key={lesson.id} to={`/lesson/${lesson.id}`}>
              <Card className="flex items-center justify-between text-xl font-bold text-slate-700 hover:scale-[1.02]">
                <span>{lesson.title}</span>
                <span className="text-sm text-slate-400">Lv.{lesson.level}</span>
              </Card>
            </Link>
          ))}
          {(lessons ?? []).length === 0 ? (
            <p className="text-lg text-slate-500">
              아직 등록된 학습이 없어요. 시드 데이터를 추가하세요.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

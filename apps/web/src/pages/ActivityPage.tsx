import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card } from '@dailyglow/ui';
import { ACTIVITY_RENDERERS, resolveRendererId } from '@/activities/registry';
import type { ActivityLesson, ActivityResult } from '@/activities/types';
import { useProfile } from '@/stores/profile';
import { queueSession } from '@/lib/sync';
import { supabase } from '@/lib/supabase';

/** 가운데 정렬된 안내 카드 — 로딩·오류·준비 중이 같은 모양을 쓴다. */
function Notice({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <Card className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="text-6xl">{emoji}</span>
        <h1 className="text-2xl font-bold text-glow-600">{title}</h1>
        <p className="text-slate-500">{body}</p>
        <Link to="/">
          <Button size="lg">홈으로</Button>
        </Link>
      </Card>
    </div>
  );
}

export function ActivityPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const profile = useProfile((s) => s.profile);

  const {
    data: lesson,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['activity-lesson', lessonId],
    enabled: Boolean(lessonId),
    queryFn: async (): Promise<ActivityLesson | null> => {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, activity_kind, config')
        .eq('id', lessonId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  function onFinish(result: ActivityResult) {
    if (!profile || !lesson) return;
    void queueSession({
      profileId: profile.id,
      lessonId: lesson.id,
      activityKind: lesson.activity_kind,
      mode: 'screen',
      durationSec: result.durationSec,
      totalCount: result.totalCount,
      correctCount: result.correctCount,
      meta: result.meta ?? {},
      createdAt: new Date().toISOString(),
    });
  }

  if (isPending) return <Notice emoji="⏳" title="잠깐만요" body="공부를 불러오는 중이에요." />;
  if (isError)
    return (
      <Notice
        emoji="📡"
        title="지금 연결이 잘 안 돼요"
        body="잠시 뒤에 다시 열어봐 주세요."
      />
    );
  if (!lesson)
    return <Notice emoji="🔍" title="찾을 수 없어요" body="이 공부는 지금 없는 것 같아요." />;

  const Renderer = ACTIVITY_RENDERERS[resolveRendererId(lesson)];
  if (!Renderer)
    return (
      <Notice
        emoji="🚧"
        title="곧 만들어질 공부예요"
        body="이 활동은 다음 단계에서 만들어져요. 조금만 기다려 주세요!"
      />
    );

  return <Renderer lesson={lesson} onFinish={onFinish} />;
}

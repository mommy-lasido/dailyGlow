import { Link, useParams } from 'react-router-dom';
import { Button, Card } from '@dailyglow/ui';

/**
 * Phase 1 에서는 활동 렌더러가 아직 없다.
 * Phase 2 에서 activity_kind 별 렌더러로 대체된다.
 */
export function ActivityPlaceholderPage() {
  const { lessonId } = useParams<{ lessonId: string }>();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <Card className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="text-6xl">🚧</span>
        <h1 className="text-2xl font-bold text-glow-600">곧 만들어질 공부예요</h1>
        <p className="text-slate-500">
          이 활동은 다음 단계에서 만들어져요. 조금만 기다려 주세요!
        </p>
        <p className="text-xs text-slate-300">lesson: {lessonId}</p>
        <Link to="/">
          <Button size="lg">홈으로</Button>
        </Link>
      </Card>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, Card } from '@dailyglow/ui';
import { buildReviewQueue, formatAccuracy, type TypeStat } from '@dailyglow/utils';
import { db } from '@/lib/db';

export function ReviewPage() {
  const stats = useLiveQuery(() => db.typeStats.toArray(), [], []);

  const queue = buildReviewQueue(
    (stats ?? []).map<TypeStat>((s) => ({
      typeId: s.type_id,
      attempts: s.attempts,
      correct: s.correct,
      streak: s.streak,
      lastSeenAt: new Date(s.last_seen_at).getTime(),
    })),
    Date.now(),
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost">← 홈</Button>
        </Link>
        <h1 className="text-3xl font-bold text-glow-600">다시 풀기</h1>
      </header>

      {queue.length === 0 ? (
        <Card className="text-center text-xl text-slate-500">
          아직 복습할 유형이 없어요. 문제를 더 풀어보세요!
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {queue.map((item) => {
            const stat = stats?.find((s) => s.type_id === item.typeId);
            return (
              <Card key={item.typeId} className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-slate-700">{item.typeId}</p>
                  <p className="text-sm text-slate-400">
                    정답률 {formatAccuracy(stat?.correct ?? 0, stat?.attempts ?? 0)}
                    {item.overdue ? ' · 복습 시점 지남' : ''}
                  </p>
                </div>
                <span className="rounded-full bg-glow-100 px-3 py-1 text-sm font-bold text-glow-700">
                  {item.score}
                </span>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

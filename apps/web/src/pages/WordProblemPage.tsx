import { useProfile } from '@/stores/profile';
import { queueSession } from '@/lib/sync';
import { WordProblemActivity } from '@/activities/word-problem/WordProblemActivity';

/**
 * 문장제 — 문제를 앱이 만들어 내므로 창고를 거치지 않는다.
 * 과학 놀이터·Spell It 과 같은 짜임이다.
 */
export function WordProblemPage() {
  const profile = useProfile((s) => s.profile);

  return (
    <WordProblemActivity
      lesson={{
        id: 'word-problem',
        title: '문장제',
        activity_kind: 'word_problem',
        config: {},
        childLevel: 1,
      }}
      onFinish={(result) => {
        if (!profile) return;
        void queueSession({
          profileId: profile.id,
          lessonId: null,
          activityKind: 'word_problem',
          mode: 'screen',
          durationSec: result.durationSec,
          totalCount: result.totalCount,
          correctCount: result.correctCount,
          meta: result.meta ?? {},
          createdAt: new Date().toISOString(),
        });
      }}
    />
  );
}

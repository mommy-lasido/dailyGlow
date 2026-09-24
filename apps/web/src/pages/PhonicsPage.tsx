import { useProfile } from '@/stores/profile';
import { queueSession } from '@/lib/sync';
import { PhonicsActivity } from '@/activities/phonics/PhonicsActivity';

/**
 * Listen & Find — 영어 파닉스.
 *
 * Spell It 과 마찬가지로 낱말이 앱 안에 들어 있어 창고를 거치지 않는다.
 */
export function PhonicsPage() {
  const profile = useProfile((s) => s.profile);

  return (
    <PhonicsActivity
      lesson={{
        id: 'phonics',
        title: 'Listen and find',
        activity_kind: 'phonics',
        config: {},
        childLevel: 1,
      }}
      onFinish={(result) => {
        if (!profile) return;
        void queueSession({
          profileId: profile.id,
          lessonId: null,
          activityKind: 'phonics',
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

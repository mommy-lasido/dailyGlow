import { useProfile } from '@/stores/profile';
import { queueSession } from '@/lib/sync';
import { SpellActivity } from '@/activities/spell/SpellActivity';

/**
 * Spell It — 영어 철자 맞추기.
 *
 * 다른 활동은 창고의 레슨 목록에서 나오지만, 이것은 낱말이 앱 안에 들어 있어
 * 창고를 거치지 않는다. 과학 놀이터와 같은 짜임이다.
 *
 * 어느 권을 낼지는 아이의 학년이 아니라 **지금 들고 있는 책**이 정한다. 라윤이는
 * 학교에서 Book 4 를 하고 있지만 낱말 목록을 아직 못 받았으므로, 이미 끝낸
 * 2·3권으로 철자만 다진다. 뜻은 이미 아는 낱말이라 오히려 철자에만 마음이 간다.
 */
export function SpellPage() {
  const profile = useProfile((s) => s.profile);

  return (
    <SpellActivity
      lesson={{
        id: 'spell',
        title: 'Spell It',
        activity_kind: 'spell',
        config: { book: 2 },
        childLevel: 1,
      }}
      onFinish={(result) => {
        if (!profile) return;
        void queueSession({
          profileId: profile.id,
          // 창고의 레슨 목록에 없는 활동이라 레슨을 가리키지 않는다.
          lessonId: null,
          activityKind: 'spell',
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

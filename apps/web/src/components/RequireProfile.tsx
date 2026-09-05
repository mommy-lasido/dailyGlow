import { Navigate, Outlet } from 'react-router-dom';
import { Button, Card } from '@dailyglow/ui';
import { useAuth } from '@/stores/auth';
import { useProfile } from '@/stores/profile';

/**
 * 온보딩을 마친 사용자만 통과시킨다.
 * 프로필은 있는데 onboarded_at 이 비어 있으면 온보딩 화면으로 보낸다.
 */
export function RequireProfile() {
  const status = useProfile((s) => s.status);
  const profile = useProfile((s) => s.profile);
  const load = useProfile((s) => s.load);
  const userId = useAuth((s) => s.user?.id ?? null);

  if (status === 'idle' || status === 'loading') return null;

  // 조회에 실패했을 때 온보딩으로 보내면 안 된다. 실패하면 profile 이 비어 있어서
  // 이미 온보딩을 마친 아이도 빈 폼을 보게 되고, 거기서 저장하면 성별·생일·학년이
  // 통째로 지워진다. 태블릿이 잠깐 오프라인인 것뿐이므로 다시 해볼 길만 준다.
  if (status === 'error') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="flex max-w-md flex-col items-center gap-4 text-center">
          <span className="text-6xl">🌧️</span>
          <h1 className="text-2xl font-bold text-glow-600">잠깐만요</h1>
          <p className="text-slate-500">지금 연결이 잘 안 돼요. 다시 해볼까요?</p>
          <Button
            size="lg"
            disabled={!userId}
            onClick={() => {
              if (userId) void load(userId);
            }}
          >
            다시 해보기
          </Button>
        </Card>
      </div>
    );
  }

  if (!profile?.onboarded_at) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

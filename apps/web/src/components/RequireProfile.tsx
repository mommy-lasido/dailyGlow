import { Navigate, Outlet } from 'react-router-dom';
import { useProfile } from '@/stores/profile';

/**
 * 온보딩을 마친 사용자만 통과시킨다.
 * 프로필은 있는데 onboarded_at 이 비어 있으면 온보딩 화면으로 보낸다.
 */
export function RequireProfile() {
  const status = useProfile((s) => s.status);
  const profile = useProfile((s) => s.profile);

  if (status === 'idle' || status === 'loading') return null;
  if (!profile?.onboarded_at) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

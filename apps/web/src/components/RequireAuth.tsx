import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/stores/auth';

export function RequireAuth() {
  const status = useAuth((s) => s.status);

  if (status === 'loading') return null;
  if (status === 'signed-out') return <Navigate to="/login" replace />;
  return <Outlet />;
}

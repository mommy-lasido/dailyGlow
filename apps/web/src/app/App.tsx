import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/stores/auth';
import { useProfile } from '@/stores/profile';
import { OfflineBadge } from '@/components/OfflineBadge';
import { flushAttemptQueue } from '@/lib/sync';

export function App() {
  const init = useAuth((s) => s.init);
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const loadProfile = useProfile((s) => s.load);
  const clearProfile = useProfile((s) => s.clear);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (user) void loadProfile(user.id);
    else clearProfile();
  }, [user, loadProfile, clearProfile]);

  useEffect(() => {
    if (status === 'signed-in') void flushAttemptQueue();
  }, [status]);

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col px-4 py-4 sm:px-8 sm:py-8">
      <OfflineBadge />
      {status === 'loading' ? (
        <div className="flex flex-1 items-center justify-center text-2xl text-glow-600">
          불러오는 중…
        </div>
      ) : (
        <Outlet />
      )}
    </div>
  );
}

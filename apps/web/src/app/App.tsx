import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/stores/auth';
import { useProfile } from '@/stores/profile';
import { OfflineBadge } from '@/components/OfflineBadge';
import { flushAttemptQueue, flushSessionQueue } from '@/lib/sync';

export function App() {
  const init = useAuth((s) => s.init);
  const status = useAuth((s) => s.status);
  const userId = useAuth((s) => s.user?.id ?? null);
  const loadProfile = useProfile((s) => s.load);
  const clearProfile = useProfile((s) => s.clear);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    // user.id 만 구독한다 — 토큰 갱신으로 user 객체가 새로 만들어져도 재조회하지 않도록.
    if (userId) void loadProfile(userId);
    else clearProfile();
  }, [userId, loadProfile, clearProfile]);

  useEffect(() => {
    if (status !== 'signed-in') return;
    void flushAttemptQueue();
    void flushSessionQueue();
  }, [status]);

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col px-4 py-4 sm:px-8 sm:py-8">
      {/* 인쇄할 때는 앱 껍데기를 감춘다 — 종이에는 표만 나와야 한다. */}
      <div className="print:hidden">
        <OfflineBadge />
      </div>
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

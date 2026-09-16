import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@dailyglow/ui';
import { useAuth } from '@/stores/auth';
import { useProfile } from '@/stores/profile';
import { OfflineBadge } from '@/components/OfflineBadge';
import { flushAttemptQueue, flushSessionQueue } from '@/lib/sync';

/**
 * 홈이 아닌 화면에서는 어디서든 홈으로 돌아갈 수 있어야 한다.
 *
 * 활동마다 "홈으로" 를 따로 달아 두었더니, 활동 중간 화면(자음모음 배우기의 카드
 * 넘기기 같은 곳)에는 빠져 있어 아이가 갇혔다. 활동이 늘 때마다 빠뜨릴 자리라,
 * 활동이 아니라 **앱 껍데기**가 들고 있게 한다.
 */
/**
 * 한 걸음 뒤로.
 *
 * 홈 단추만 있으면 활동 안에서 길을 잘못 들었을 때 **처음부터 다시** 해야 한다.
 * 한 걸음만 물러서고 싶은 자리가 훨씬 많다 — 과학 목록에서 주제를 잘못 눌렀을
 * 때처럼.
 *
 * 앱에 들어와 처음 연 화면에서는 보이지 않는다. 그 자리에서 뒤로 가면 앱 밖으로
 * 나가 버리기 때문이다. 리액트 라우터가 남기는 번호(idx)로 알 수 있다.
 */
function BackLink() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const hidden = ['/', '/login', '/onboarding'];
  if (hidden.includes(pathname)) return null;

  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  if (idx <= 0) return null;

  return (
    <Button variant="ghost" onClick={() => navigate(-1)}>
      ← 이전
    </Button>
  );
}

function HomeLink() {
  const { pathname } = useLocation();
  // 홈·로그인·처음 설정에는 돌아갈 곳이 없거나 돌아가면 안 된다.
  // 설정에는 (비밀번호를 묻는 화면에도, 들어간 뒤에도) 이 단추 하나만 나온다.
  const hidden = ['/', '/login', '/onboarding'];
  if (hidden.includes(pathname)) return null;

  return (
    <Link to="/">
      <Button variant="ghost">🏠 홈으로</Button>
    </Link>
  );
}

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
    <div className="mx-auto flex min-h-full max-w-6xl flex-col px-3 py-3 sm:px-5 sm:py-5">
      {/* 인쇄할 때는 앱 껍데기를 감춘다 — 종이에는 표만 나와야 한다. */}
      <div className="flex flex-col print:hidden">
        <OfflineBadge />
        {/* 한 걸음 뒤로와 홈으로. 활동마다 따로 달면 새 활동에서 빠뜨리게 되므로
            앱 껍데기가 들고 있는다. */}
        <div className="mb-3 flex gap-2 self-start">
          <BackLink />
          <HomeLink />
        </div>
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

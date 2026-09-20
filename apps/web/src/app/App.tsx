import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@dailyglow/ui';
import { upFrom } from '@/lib/playgrounds';
import type { LessonGateRow } from '@/lib/activities';
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
 *
 * 홈·놀이터·활동으로 세 겹이 되면서, 이 단추는 늘 홈이 아니라 **한 칸 위**로
 * 간다. 활동에서는 그 활동이 사는 놀이터로, 놀이터에서는 홈으로. 늘 홈으로
 * 보내면 수 세기를 마치고 더하기를 하려는 아이가 홈까지 나갔다가 수학 놀이터를
 * 다시 찾아 들어와야 한다.
 *
 * 한 걸음 뒤로 가는 단추를 여기에 하나 더 달았다가 걷어냈다. 화면마다 이미
 * 자기 자리로 돌아가는 단추가 있고(활동의 "다시 고르기", 과학의 "돌아가기",
 * 낱말·문장의 "앞으로"), 그것들은 **활동 안에서** 한 칸 물러선다. 껍데기에서
 * 뒤로 가면 활동을 통째로 빠져나가 결국 이 홈 단추와 같은 일이 된다.
 * 같은 일을 하는 단추가 둘이면 아이만 헷갈린다.
 */
function HomeLink() {
  const { pathname } = useLocation();
  const client = useQueryClient();

  // 홈·로그인·처음 설정에는 돌아갈 곳이 없거나 돌아가면 안 된다.
  // 설정에는 (비밀번호를 묻는 화면에도, 들어간 뒤에도) 이 단추 하나만 나온다.
  const hidden = ['/', '/login', '/onboarding'];
  if (hidden.includes(pathname)) return null;

  // 활동 화면이라면 어느 과목인지 알아야 제 놀이터로 돌아갈 수 있다. 홈이나
  // 놀이터가 이미 받아 둔 목록에서 찾는다 — 이 단추 때문에 따로 묻지 않는다.
  const lessonId = pathname.startsWith('/activity/') ? pathname.slice('/activity/'.length) : null;
  const lessons = client.getQueryData<LessonGateRow[]>(['activity-catalog']);
  const subjectSlug = lessonId
    ? (lessons?.find((l) => l.id === lessonId)?.subject_slug ?? null)
    : null;

  const up = upFrom(pathname, subjectSlug);

  return (
    <Link to={up.to} className="mb-3 self-start print:hidden">
      <Button variant="ghost">{up.label}</Button>
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
        <HomeLink />
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

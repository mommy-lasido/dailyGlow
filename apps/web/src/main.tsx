import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { router } from '@/app/router';
import { queryClient } from '@/lib/queryClient';
import { bindSyncListeners } from '@/lib/sync';
import { applyUpdateIfSafe, watchForUpdates } from '@/lib/appUpdate';
import './styles/index.css';

bindSyncListeners();
watchForUpdates();
// 화면이 바뀔 때마다 살핀다 — 활동에서 홈으로 돌아오는 순간이 새것을 들여놓기
// 가장 좋은 때다.
router.subscribe(() => applyUpdateIfSafe());

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root 를 찾을 수 없습니다');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  </StrictMode>,
);

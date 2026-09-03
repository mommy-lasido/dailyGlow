import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { router } from '@/app/router';
import { queryClient } from '@/lib/queryClient';
import { bindSyncListeners } from '@/lib/sync';
import './styles/index.css';

bindSyncListeners();

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

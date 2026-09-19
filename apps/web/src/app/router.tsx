import { createBrowserRouter, Navigate } from 'react-router-dom';
import { App } from './App';
import { RequireAuth } from '@/components/RequireAuth';
import { RequireProfile } from '@/components/RequireProfile';
import { LoginPage } from '@/pages/LoginPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { HomePage } from '@/pages/HomePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ParentGate } from '@/components/ParentGate';
import { ActivityPage } from '@/pages/ActivityPage';
import { WeeklyPage } from '@/pages/WeeklyPage';
import { SciencePage } from '@/pages/SciencePage';
import { SpellPage } from '@/pages/SpellPage';

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'onboarding', element: <OnboardingPage /> },
          {
            element: <RequireProfile />,
            children: [
              { index: true, element: <HomePage /> },
              // 설정에는 아이의 단계와 학년이 들어 있다. 아이가 바꾸면 그날 나오는
              // 문제가 통째로 달라지므로 부모만 들어가게 막는다.
              {
                path: 'settings',
                element: (
                  <ParentGate>
                    <SettingsPage />
                  </ParentGate>
                ),
              },
              { path: 'activity/:lessonId', element: <ActivityPage /> },
              { path: 'weekly', element: <WeeklyPage /> },
              // 이번 주의 과학. 아직 홈 화면에 내걸지 않았다 — 영숙님이 보고
              // 이대로 갈지 정한 뒤에 내건다.
              { path: 'science', element: <SciencePage /> },
              // 영어 철자 맞추기. 낱말이 앱 안에 들어 있어 창고를 거치지 않는다.
              { path: 'spell', element: <SpellPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

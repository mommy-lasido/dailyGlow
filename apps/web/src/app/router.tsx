import { createBrowserRouter, Navigate } from 'react-router-dom';
import { App } from './App';
import { RequireAuth } from '@/components/RequireAuth';
import { RequireProfile } from '@/components/RequireProfile';
import { LoginPage } from '@/pages/LoginPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { HomePage } from '@/pages/HomePage';

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
            children: [{ index: true, element: <HomePage /> }],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

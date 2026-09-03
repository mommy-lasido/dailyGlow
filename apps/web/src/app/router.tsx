import { createBrowserRouter, Navigate } from 'react-router-dom';
import { App } from './App';
import { RequireAuth } from '@/components/RequireAuth';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { SubjectPage } from '@/pages/SubjectPage';
import { LessonPage } from '@/pages/LessonPage';
import { ReviewPage } from '@/pages/ReviewPage';

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'subject/:subjectId', element: <SubjectPage /> },
          { path: 'lesson/:lessonId', element: <LessonPage /> },
          { path: 'review', element: <ReviewPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

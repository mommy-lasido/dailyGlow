import { create } from 'zustand';
import type { SubjectId } from '@dailyglow/utils';

/** 지금 진행 중인 학습 세션(문제 풀이)의 로컬 상태 */
interface LearnSessionState {
  subject: SubjectId | null;
  lessonId: string | null;
  index: number;
  correct: number;
  answered: number;
  startedAt: number | null;

  start: (subject: SubjectId, lessonId: string) => void;
  recordAnswer: (isCorrect: boolean) => void;
  reset: () => void;
}

export const useLearnSession = create<LearnSessionState>((set) => ({
  subject: null,
  lessonId: null,
  index: 0,
  correct: 0,
  answered: 0,
  startedAt: null,

  start: (subject, lessonId) =>
    set({ subject, lessonId, index: 0, correct: 0, answered: 0, startedAt: Date.now() }),

  recordAnswer: (isCorrect) =>
    set((s) => ({
      answered: s.answered + 1,
      correct: s.correct + (isCorrect ? 1 : 0),
      index: s.index + 1,
    })),

  reset: () =>
    set({ subject: null, lessonId: null, index: 0, correct: 0, answered: 0, startedAt: null }),
}));

/** 표시용 포매팅 헬퍼 (한국어 UI 기준) */

export function formatAccuracy(correct: number, attempts: number): string {
  if (attempts === 0) return '-';
  return `${Math.round((correct / attempts) * 100)}%`;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}초`;
  return `${min}분 ${sec}초`;
}

export const SUBJECTS = ['hangul', 'korean', 'english', 'math'] as const;
export type SubjectId = (typeof SUBJECTS)[number];

export const SUBJECT_LABEL: Record<SubjectId, string> = {
  hangul: '한글',
  korean: '국어',
  english: '영어',
  math: '수학',
};

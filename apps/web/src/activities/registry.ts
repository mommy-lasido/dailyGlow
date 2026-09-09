import type { ActivityLesson, ActivityRenderer } from './types';
import { AddPlayActivity } from './add-play/AddPlayActivity';
import { CountPlayActivity } from './count-play/CountPlayActivity';
import { JamoActivity } from './jamo/JamoActivity';
import { SayingsActivity } from './sayings/SayingsActivity';
import { SpellingActivity } from './spelling/SpellingActivity';

/**
 * 어떤 컴포넌트로 그릴지 정하는 열쇠.
 *
 * 기본은 activity_kind 지만, 같은 종류 안에서 화면이 전혀 다른 활동이 있다 —
 * 맞춤법 탐험대와 더하기 놀이는 둘 다 choice_quiz 이지만 하나는 문장과 보기,
 * 다른 하나는 그림을 세는 화면이다. 그래서 lessons.config.renderer 로
 * 더 좁게 지정할 수 있게 해 둔다.
 */
export function resolveRendererId(lesson: ActivityLesson): string {
  const config = lesson.config;
  if (config && typeof config === 'object') {
    const renderer = (config as { renderer?: unknown }).renderer;
    if (typeof renderer === 'string' && renderer.length > 0) return renderer;
  }
  return lesson.activity_kind;
}

/**
 * 열쇠 → 컴포넌트. 새 활동을 추가할 때 여기에 한 줄만 더하면 된다.
 * 아직 등록되지 않은 활동은 ActivityPage 가 "준비 중" 화면으로 받아낸다.
 */
export const ACTIVITY_RENDERERS: Record<string, ActivityRenderer> = {
  add_play: AddPlayActivity,
  count_play: CountPlayActivity,
  letter_cards: JamoActivity,
  sayings: SayingsActivity,
  choice_quiz: SpellingActivity,
};

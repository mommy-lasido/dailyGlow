import { describe, expect, it } from 'vitest';
import { resolveRendererId } from './registry';
import type { ActivityLesson } from './types';

function lesson(over: Partial<ActivityLesson> = {}): ActivityLesson {
  return {
    id: 'l1',
    title: '더하기 놀이',
    activity_kind: 'choice_quiz',
    config: {},
    childLevel: 1,
    ...over,
  };
}

describe('resolveRendererId', () => {
  it('config.renderer 가 있으면 그것을 쓴다', () => {
    expect(resolveRendererId(lesson({ config: { renderer: 'add_play' } }))).toBe('add_play');
  });

  it('config.renderer 가 없으면 activity_kind 를 쓴다', () => {
    expect(resolveRendererId(lesson())).toBe('choice_quiz');
  });

  it('config 가 객체가 아니면 activity_kind 를 쓴다', () => {
    expect(resolveRendererId(lesson({ config: null }))).toBe('choice_quiz');
    expect(resolveRendererId(lesson({ config: 7 }))).toBe('choice_quiz');
  });

  it('renderer 가 빈 문자열이면 activity_kind 를 쓴다', () => {
    expect(resolveRendererId(lesson({ config: { renderer: '' } }))).toBe('choice_quiz');
  });
});

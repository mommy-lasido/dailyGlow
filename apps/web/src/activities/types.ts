import type { ComponentType } from 'react';

/** 활동 렌더러가 알아야 하는 최소한의 레슨 정보 */
export interface ActivityLesson {
  id: string;
  title: string;
  activity_kind: string;
  /** lessons.config (jsonb). 활동마다 필요한 설정이 다르다. */
  config: unknown;
}

/** 한 판을 끝냈을 때 활동이 돌려주는 결과 */
export interface ActivityResult {
  totalCount: number;
  correctCount: number;
  durationSec: number;
  /** 활동마다 다른 부가 정보. sessions.meta 로 그대로 들어간다. */
  meta?: Record<string, unknown>;
}

/**
 * 모든 활동 렌더러가 받는 props.
 * 활동은 자기 화면만 책임지고, 기록은 onFinish 를 받은 쪽(ActivityPage)이 남긴다.
 */
export interface ActivityProps {
  lesson: ActivityLesson;
  onFinish: (result: ActivityResult) => void;
}

export type ActivityRenderer = ComponentType<ActivityProps>;

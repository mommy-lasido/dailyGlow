import type { ReactNode } from 'react';
import { Button, Card } from '@dailyglow/ui';
import type { QuizState } from '@/activities/quiz-flow';

/**
 * 한 회차를 끝냈을 때의 채점 화면. 모든 활동이 같은 것을 쓴다.
 *
 * 다 맞힌 회차는 활동 쪽에서 곧장 끝으로 보내므로, 이 화면은 **틀린 것이 남았을
 * 때만** 뜬다.
 *
 * 1차와 2차의 말이 달라야 한다. 1차는 몇 개를 맞혔는지가 아이에게 쓸모 있는
 * 소식이지만, 2차는 이미 틀린 것만 다시 푼 회차라 "1개 중 0개 맞았어요" 같은
 * 말이 나온다. 거의 다 온 아이에게 0을 들이미는 꼴이다. 그래서 2차부터는
 * 얼마나 남았는지와, 이번엔 힌트가 있다는 것을 말해준다.
 */
export function Grading({
  quiz,
  retryLabel,
  onNext,
  children,
}: {
  quiz: QuizState;
  /** 버튼에 쓸 말 — 활동마다 다르다. '다시 풀기' / '다시 세기' / '다시 찾기' */
  retryLabel: string;
  onNext: () => void;
  /** 활동마다 덧붙일 것 — 맞춤법의 풀이 같은 것 */
  children?: ReactNode;
}) {
  const scored = quiz.roundScores[quiz.roundScores.length - 1] ?? 0;
  const asked = scored + quiz.missed.length;
  const left = quiz.missed.length;
  const firstRound = quiz.round === 1;

  return (
    <Card className="flex flex-col items-center gap-4 text-center">
      <span className="text-6xl">{firstRound ? '📋' : '💪'}</span>
      <h2 data-testid="grading-title" className="text-2xl font-bold text-glow-600">
        {firstRound
          ? `${asked}문제 중 ${scored}개 맞혔어요!`
          : `잘했어요! ${left}개만 더 하면 돼요`}
      </h2>
      <p data-testid="grading-detail" className="text-slate-500">
        {firstRound
          ? `틀린 ${left}개를 다시 해볼까요?`
          : '아쉽게 남은 문제예요. 이번엔 힌트를 보고 해봐요!'}
      </p>
      {children}
      <Button size="lg" onClick={onNext}>
        틀린 {left}개 {retryLabel}
      </Button>
    </Card>
  );
}

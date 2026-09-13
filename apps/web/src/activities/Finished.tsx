import type { ReactNode } from 'react';
import { Card } from '@dailyglow/ui';
import type { QuizState } from '@/activities/quiz-flow';

/**
 * 한 판을 끝냈을 때의 화면. 모든 활동이 같은 것을 쓴다.
 *
 * **여기까지 온 아이는 반드시 전부 맞힌 것이다.** 3단계 흐름에서 3차는 맞힐 때까지
 * 같은 문제에 머물기 때문이다. 그래서 큰 글씨는 언제나 해냈다는 말이어야 한다.
 *
 * 전에는 "10문제 중 7개 맞혔어요!" 를 큰 글씨로 띄웠는데, 끝까지 붙잡고 풀어서
 * 결국 다 맞힌 아이에게 못 맞힌 개수를 들이미는 꼴이었다. 1차 점수는 아이의
 * 실력을 재는 데 필요하지만(단계 승급 판정이 이 숫자를 본다) 그건 어른이 볼
 * 숫자다. 아이에게는 작은 글씨로, 자란 만큼을 말해주는 문장 안에 넣는다.
 */
export function Finished({
  emoji,
  quiz,
  children,
}: {
  emoji: string;
  quiz: QuizState;
  /** 활동마다 덧붙일 것 — 맞춤법의 풀이 같은 것 */
  children?: ReactNode;
}) {
  /** 1차에 다 맞혀서 다시 푼 적이 없다 */
  const firstTry = quiz.roundScores.length === 1;

  return (
    <Card className="flex flex-col items-center gap-4 text-center">
      <span className="text-6xl">{emoji}</span>
      <h2 data-testid="finish-title" className="text-2xl font-bold text-glow-600">
        {firstTry ? '한 번에 다 맞혔어요!' : '끝까지 해내서 다 맞혔어요!'}
      </h2>
      <p data-testid="finish-detail" className="text-slate-500">
        {firstTry
          ? `${quiz.total}문제를 처음부터 다 맞혔어요. 정말 대단해요!`
          : `처음엔 ${quiz.firstTryCorrect}개였는데, 틀린 것도 포기하지 않고 끝까지 알아냈어요.`}
      </p>
      {children}
    </Card>
  );
}

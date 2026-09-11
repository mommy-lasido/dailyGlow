import type { HTMLAttributes } from 'react';
import { cn } from './cn';

/**
 * 여백을 조금 줄였다(p-6 → p-4/sm:p-5). 태블릿 화면에 한 번에 더 많이 담기고,
 * 같은 자리에서 글씨를 더 크게 쓸 수 있다.
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-3xl bg-white p-4 shadow-lg ring-1 ring-black/5 sm:p-5',
        className,
      )}
      {...props}
    />
  );
}

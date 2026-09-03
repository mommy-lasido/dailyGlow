import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-3xl bg-white p-6 shadow-lg ring-1 ring-black/5', className)}
      {...props}
    />
  );
}

import { cn } from './cn';

export interface ProgressBarProps {
  /** 0..1 */
  ratio: number;
  className?: string;
  label?: string;
}

export function ProgressBar({ ratio, className, label }: ProgressBarProps) {
  const pct = Math.round(Math.min(Math.max(ratio, 0), 1) * 100);
  return (
    <div className={cn('w-full', className)}>
      {label ? <div className="mb-1 font-text text-sm text-glow-700">{label}</div> : null}
      <div
        className="h-5 w-full overflow-hidden rounded-full bg-glow-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-glow-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

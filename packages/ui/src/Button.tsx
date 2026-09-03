import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: 'bg-glow-500 text-white hover:bg-glow-600 active:bg-glow-700 shadow-md',
  secondary: 'bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-600 shadow-md',
  ghost: 'bg-transparent text-glow-700 hover:bg-glow-100',
};

const sizes: Record<Size, string> = {
  md: 'min-h-touch px-6 text-lg',
  lg: 'min-h-[4.5rem] px-10 text-2xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-2xl font-rounded font-bold',
        'transition-transform duration-100 active:scale-95',
        'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-400',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

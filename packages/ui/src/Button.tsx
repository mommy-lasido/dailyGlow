import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/**
 * 아래쪽에 두께를 둬서 **누르면 쑥 들어가는** 느낌을 준다. 아이들이 좋아하는
 * 장치이고, 눌렸다는 것이 눈에 확실히 보인다.
 * 두께만큼 아래로 내려가므로 `active:translate-y` 와 그림자 제거가 짝이다.
 */
const variants: Record<Variant, string> = {
  primary: 'bg-glow-500 text-white shadow-[0_5px_0_theme(colors.glow.700)] hover:bg-glow-600',
  secondary: 'bg-sky-500 text-white shadow-[0_5px_0_theme(colors.sky.600)] hover:bg-sky-600',
  ghost: 'bg-white text-glow-700 shadow-[0_5px_0_theme(colors.glow.100)] hover:bg-glow-50',
};

/**
 * 큰 단추를 조금 줄였다(4.5rem → 3.75rem, text-2xl → text-xl).
 * 화면을 너무 차지해서 정작 아이가 봐야 할 문제와 글자가 밀려났다.
 * 손가락으로 누르기에는 min-h-touch(3.5rem) 이면 넉넉하다.
 */
const sizes: Record<Size, string> = {
  md: 'min-h-touch px-5 text-lg',
  lg: 'min-h-[3.75rem] px-8 text-xl',
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
        // 글자는 언제나 한가운데. 글자 수가 달라도 버튼마다 자리가 흔들리지 않는다.
        'inline-flex items-center justify-center text-center rounded-full font-rounded font-bold',
        // 누르면 두께만큼 내려앉고 그림자가 사라진다 — 진짜 단추를 누르는 느낌.
        'transition-all duration-75 active:translate-y-[5px] active:shadow-none',
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

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
 * 단추는 **글씨보다 조금만 더 여유로운 정도**로 둔다.
 *
 * 처음에는 손가락으로 누르기 좋게 min-h-touch(3.5rem) 을 바닥으로 깔았는데,
 * "홈으로" 같은 짧은 단추까지 커다란 덩어리가 되어 화면을 차지했다. 정작 아이가
 * 봐야 할 문제와 글자가 밀려난다.
 *
 * 이제 높이를 따로 잡지 않고 글씨 둘레의 여백(py)으로만 크기를 정한다.
 * 그래도 큰 단추는 3rem 쯤 되어 태블릿에서 누르기에 모자라지 않다.
 */
const sizes: Record<Size, string> = {
  // md 는 글씨 16px + 위아래 10px = 약 44px. 손가락으로 누르기에 모자라지 않은 최소선이다.
  md: 'px-4 py-2.5 text-base',
  lg: 'px-6 py-3 text-lg',
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
        'inline-flex items-center justify-center text-center rounded-full font-text font-bold',
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

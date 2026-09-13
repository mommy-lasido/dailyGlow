import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/**
 * 그림자를 쓰지 않는다. 색과 테두리만으로 단추라는 것이 드러나게 한다 —
 * 화면이 한결 정갈해지고, 카드 위에 단추가 여럿 놓여도 지저분해지지 않는다.
 *
 * ghost 는 흰 바탕이라 카드 위에 놓으면 배경과 붙어 버린다. 그림자 대신
 * 연둣빛 테두리를 둘러 경계를 살린다.
 */
const variants: Record<Variant, string> = {
  primary: 'bg-glow-500 text-white hover:bg-glow-600',
  secondary: 'bg-sky-500 text-white hover:bg-sky-600',
  ghost: 'bg-white text-glow-700 ring-2 ring-glow-300 hover:bg-glow-50',
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
  // 글씨는 한 단계 작게. 여백(py)은 그대로 두어 누를 자리는 줄지 않는다.
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
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
        // 누르면 살짝 작아진다 — 눌렸다는 것이 보여야 아이가 다시 누르지 않는다.
        'transition-transform duration-75 active:scale-95',
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

import type { Config } from 'tailwindcss';

/**
 * 앱 전역에서 공유하는 Tailwind 프리셋.
 * 태블릿 + 유아/초등 대상이라 큰 터치 타깃, 둥근 모서리, 선명한 색을 기본값으로 둔다.
 */
const preset = {
  content: [],
  theme: {
    extend: {
      colors: {
        glow: {
          50: '#fff7ed',
          100: '#ffedd5',
          300: '#fdba74',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        sky: {
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      fontFamily: {
        rounded: ['"Baloo 2"', '"Gaegu"', 'system-ui', 'sans-serif'],
      },
      minHeight: {
        touch: '3.5rem',
      },
      minWidth: {
        touch: '3.5rem',
      },
    },
  },
  plugins: [],
} satisfies Partial<Config>;

export default preset;

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
        /**
         * 잎사귀 연두.
         *
         * 눈이 편한 색으로 골랐고, 글자가 잘 보이는지(명암 대비)까지 재서 정했다.
         * 흰 글자 / 500 바탕 = 3.4 : 1, 700 글자 / 50 바탕 = 6.4 : 1 로
         * 큰 글자 기준(3.0)과 작은 글자 기준(4.5)을 모두 넘는다.
         * 앞서 쓰던 주황은 흰 글자 / 500 이 2.8 이라 기준에 못 미쳤다.
         */
        glow: {
          50: '#f4faef',
          100: '#e3f1d8',
          300: '#a8d18c',
          500: '#5e9a44',
          600: '#55853e',
          700: '#3f642d',
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
        // 동글동글한 한글 글씨체. 획이 굵어 아이가 읽기 좋다.
        rounded: ['Jua', 'Gaegu', 'system-ui', 'sans-serif'],
        // 영문 이름(DailyGlow)에만 쓰는 장식 글씨
        display: ['Pacifico', 'Jua', 'cursive'],
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

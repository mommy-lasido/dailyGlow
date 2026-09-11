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
        /**
         * 본문 글씨체 — 나눔고딕.
         *
         * 동글동글한 글꼴(Jua·Dongle·Hi Melody)을 먼저 보다가 방향을 바꿨다.
         * 한글을 배우는 앱이라 **자모가 또렷이 갈라져 보이는 것**이 귀여움보다
         * 먼저다. 둥글린 글꼴은 ㄹ·ㅁ·ㅂ 이 서로 비슷해져, 맥락으로 읽어 낼 수 없는
         * 아이에게는 글자 모양을 배우는 일 자체가 흐려진다.
         * 나눔고딕은 교과서에서 익숙한 모양이고 획이 또렷하며 Jua 보다 얇다.
         *
         * 귀여움은 글꼴이 아니라 색·버튼·그림으로 낸다.
         */
        text: ['"Nanum Gothic"', 'system-ui', 'sans-serif'],
        /** 로그인 화면의 영문 이름에만 쓰는 장식 글씨. 읽기를 가르치는 글자가 아니다. */
        display: ['Pacifico', 'cursive'],
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

import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 3000,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 3000,
    strictPort: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 등록은 우리가 직접 한다(`lib/appUpdate.ts`). 새것을 받은 뒤 언제 화면을
      // 다시 부를지 우리가 정해야 하기 때문이다 — 아이가 문제를 푸는 중에
      // 다시 부르면 풀던 것이 날아간다.
      injectRegister: null,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Supabase REST / Auth: 네트워크 우선, 실패 시 캐시로 폴백
            urlPattern: ({ url }) => url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      manifest: {
        name: 'DailyGlow 하루배움',
        short_name: '하루배움',
        description: '만 5~12세를 위한 맞춤형 학습 앱',
        lang: 'ko',
        theme_color: '#f97316',
        background_color: '#fff7ed',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        // 임시 SVG 아이콘. 스토어 배포 전 192/512 PNG + maskable 로 교체 권장.
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});

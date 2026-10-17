/**
 * Vite 설정. 게임 소스는 web/ 아래 그대로 두고, 빌드 결과는 dist/ 에 만든다.
 * - root: web (index.html 위치)
 * - publicDir: web/public — 발음 파일 · 스프라이트 · CSS 처럼 가공 없이 그대로 내보낼 파일
 * - base: './' — 어떤 경로(Vercel 미리 보기 주소 등)에 올려도 상대 경로로 동작
 * @see doc/decisions/ADR-0008-vite-content-pipeline.md
 */
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  base: './',
  publicDir: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600, // Phaser 하나가 약 1.2MB (게임 엔진이라 정상)
    rollupOptions: {
      output: {
        // 엔진은 따로 묶는다 → 게임 코드만 바뀐 배포에서는 엔진 파일을 브라우저 캐시에서 그대로 쓴다
        manualChunks: { phaser: ['phaser'], three: ['three'] },
      },
    },
  },
  server: { port: 5173, open: false },
});

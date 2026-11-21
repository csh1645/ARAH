/**
 * @file 운영 빌드 마지막 단계 (npm run build 가 vite build 다음에 실행, Vercel 에서도 같다).
 *       Godot 판(godot/export/web/, 커밋된 웹 내보내기 결과)을 사이트 첫 화면(web/dist/index.html)으로 놓고,
 *       예전 Phaser 판 첫 화면은 web/dist/classic.html 로 남긴다 (상대 경로라 그대로 동작).
 *       그림 · 발음 파일(web/dist/assets/)은 두 판이 함께 쓴다.
 *       Vercel 빌드 서버에는 Godot 가 없으므로 여기서는 복사만 한다 — Godot 판을 고치면 npm run godot:build 후 godot/export/web 을 커밋.
 * @see doc/planning/godot-migration-plan.md (5. 빌드 · 배포), doc/decisions/ADR-0011-godot-engine.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'godot/export/web');
const DIST = path.join(ROOT, 'web/dist');
const REQUIRED = ['index.html', 'index.js', 'index.wasm', 'index.pck', 'arah-bridge.js', 'boot.js'];

const missing = REQUIRED.filter((f) => !fs.existsSync(path.join(SRC, f)));
if (missing.length) {
  console.error(`Godot 웹 내보내기 결과가 없어요: ${missing.join(', ')} (npm run godot:build 후 godot/export/web 을 커밋)`);
  process.exit(1);
}
if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('web/dist/index.html 이 없어요 (vite build 를 먼저)');
  process.exit(1);
}
// 로컬 확인용 복사본(web/public/play, git 제외)이 섞여 들어오면 지운다
fs.rmSync(path.join(DIST, 'play'), { recursive: true, force: true });
fs.renameSync(path.join(DIST, 'index.html'), path.join(DIST, 'classic.html'));
let bytes = 0;
for (const f of fs.readdirSync(SRC)) {
  const dst = path.join(DIST, f);
  if (fs.existsSync(dst)) {
    console.error(`이름이 겹쳐요: ${f} (Phaser 판 결과와 충돌)`);
    process.exit(1);
  }
  fs.copyFileSync(path.join(SRC, f), dst);
  bytes += fs.statSync(dst).size;
}
console.log(`Godot 판을 첫 화면으로: ${fs.readdirSync(SRC).length}개 파일 ${(bytes / 1048576).toFixed(1)} MB → web/dist (예전 판: classic.html)`);

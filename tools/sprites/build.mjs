/**
 * @file 히어로 스프라이트 아틀라스 만들기 (Node). 지금은 코드 그림(game/hero-art.js)을 그대로 이미지로 구워
 *       "그림 파일 자리"를 채운다 → 나중에 디자이너 그림(같은 프레임 이름 · 크기)으로 파일만 바꾸면 게임이 그 그림을 쓴다.
 *
 * 출력 (히어로마다):
 *   web/public/assets/sprites/heroes/<id>.png   앞모습 자세 8칸(윗줄) + 뒷모습 8칸(아랫줄, 3D 시점용)
 *   web/public/assets/sprites/heroes/<id>.json  Phaser 아틀라스(JSON hash). 프레임 이름 = 자세 이름 / "back-자세"
 *   web/src/data/sprite-manifest.json           게임이 읽는 목록
 *
 * 진짜 그림 보호: <id>.json 의 meta.source 가 "art" 이면 그 히어로는 다시 굽지 않는다 (디자이너 그림을 덮어쓰지 않게).
 * 실행: npm run sprites   (옵션 --only red,snow 일부 히어로만)
 * @see web/public/assets/sprites/README.md, doc/decisions/ADR-0008-vite-content-pipeline.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'web', 'src');
const OUT_DIR = path.join(ROOT, 'web', 'public', 'assets', 'sprites', 'heroes');
const MANIFEST = path.join(SRC, 'data', 'sprite-manifest.json');
const FRAME = { w: 96, h: 108 }; // 게임의 히어로 크기 (round-scene.js GAME.HERO_SIZE)

/** 게임 코드(IIFE · 전역 ARAH)를 Node 에서 그대로 실행한다. document.createElement('canvas') 만 흉내 내면 된다 */
function loadGame() {
  const fakeWindow = {};
  const fakeDocument = { createElement: (tag) => (tag === 'canvas' ? createCanvas(1, 1) : {}) };
  for (const f of ['core/util.js', 'data/heroes.js', 'game/hero-art.js']) {
    const src = fs.readFileSync(path.join(SRC, f), 'utf8');
    new Function('window', 'document', src)(fakeWindow, fakeDocument); // 우리 저장소 파일 (외부 입력 아님)
  }
  return fakeWindow.ARAH;
}

const A = loadGame();
const onlyAt = process.argv.indexOf('--only');
const only = onlyAt >= 0 ? new Set(process.argv[onlyAt + 1].split(',')) : null;
const poses = A.HERO_POSES;
const views = [{ prefix: '', back: false }, { prefix: 'back-', back: true }];
fs.mkdirSync(OUT_DIR, { recursive: true });

const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { heroes: {} };
manifest.frame = FRAME;
let made = 0;
let kept = 0;
for (const hero of A.HEROES) {
  if (only && !only.has(hero.id)) continue;
  const jsonPath = path.join(OUT_DIR, `${hero.id}.json`);
  if (fs.existsSync(jsonPath) && JSON.parse(fs.readFileSync(jsonPath, 'utf8')).meta?.source === 'art') {
    manifest.heroes[hero.id] = `assets/sprites/heroes/${hero.id}`;
    kept++;
    continue; // 디자이너 그림은 그대로 둔다
  }
  const sheet = createCanvas(FRAME.w * poses.length, FRAME.h * views.length);
  const ctx = sheet.getContext('2d');
  const frames = {};
  views.forEach((view, row) => poses.forEach((pose, col) => {
    const cell = createCanvas(FRAME.w, FRAME.h);
    A.drawHero(cell.getContext('2d'), hero, FRAME.w, FRAME.h, { pose, back: view.back });
    const x = col * FRAME.w;
    const y = row * FRAME.h;
    ctx.drawImage(cell, x, y);
    frames[view.prefix + pose] = {
      frame: { x, y, w: FRAME.w, h: FRAME.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: FRAME.w, h: FRAME.h },
      sourceSize: { w: FRAME.w, h: FRAME.h },
    };
  }));
  fs.writeFileSync(path.join(OUT_DIR, `${hero.id}.png`), sheet.toBuffer('image/png'));
  fs.writeFileSync(jsonPath, `${JSON.stringify({
    frames,
    meta: { image: `${hero.id}.png`, size: { w: sheet.width, h: sheet.height }, scale: '1', source: 'generated' },
  }, null, 1)}\n`);
  manifest.heroes[hero.id] = `assets/sprites/heroes/${hero.id}`;
  made++;
}
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 1)}\n`);
console.log(`스프라이트: 새로 구움 ${made} · 디자이너 그림 유지 ${kept} → ${path.relative(process.cwd(), OUT_DIR)}`);

/**
 * @file Godot 판 웹 빌드: 데이터 내보내기 → Godot 가져오기(import) → 웹 내보내기(스레드 없음) → 브라우저 다리 복사.
 *       결과: web/public/play/ (Vite 가 그대로 배포. 그림 · 발음 파일은 같은 사이트의 /assets 를 쓴다)
 * 실행: npm run godot:build   (Godot 실행 파일: 환경 변수 GODOT, 없으면 winget 설치 위치)
 * @see doc/planning/godot-migration-plan.md (5. 빌드 · 배포)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PROJECT = path.join(ROOT, 'godot');
const OUT = path.join(ROOT, 'web/public/play');
const VERSION = '4.7.2-stable'; // ADR-0011 엔진 버전 고정

function findGodot() {
  if (process.env.GODOT) return process.env.GODOT;
  const winget = path.join(os.homedir(), 'AppData/Local/Microsoft/WinGet/Packages');
  if (fs.existsSync(winget)) {
    for (const d of fs.readdirSync(winget).filter((x) => x.startsWith('GodotEngine.GodotEngine'))) {
      const exe = path.join(winget, d, `Godot_v${VERSION}_win64_console.exe`);
      if (fs.existsSync(exe)) return exe;
    }
  }
  return 'godot';
}

const godot = findGodot();
const run = (args) => execFileSync(godot, args, { cwd: PROJECT, stdio: 'inherit' });

execFileSync(process.execPath, [path.join(ROOT, 'tools/godot/export-data.mjs')], { stdio: 'inherit' });
fs.mkdirSync(OUT, { recursive: true });
console.log(`Godot: ${godot}`);
run(['--headless', '--path', '.', '--import']);
// 문법 검사: 모든 놀이 스크립트를 불러 본다 (웹 내보내기는 스크립트 오류가 있어도 성공하므로 여기서 막는다)
const check = spawnSync(godot, ['--headless', '--path', '.'], { cwd: PROJECT, env: { ...process.env, ARAH_CHECK: '1' }, encoding: 'utf8' });
const lines = `${check.stdout}\n${check.stderr}`.split('\n');
const bad = lines.filter((l) => /SCRIPT ERROR|Parse Error|Compile Error|실패/.test(l));
if (bad.length) {
  console.error(`스크립트 오류 ${bad.length}건:\n${lines.filter((l) => /ERROR|Error|at: |실패/.test(l)).join('\n')}`);
  process.exit(1);
}
console.log(lines.filter((l) => l.includes('[검사]')).join(' · '));
run(['--headless', '--path', '.', '--export-release', 'Web', path.join(OUT, 'index.html')]);
for (const f of ['arah-bridge.js', 'boot.js']) fs.copyFileSync(path.join(PROJECT, 'web', f), path.join(OUT, f));
const size = fs.readdirSync(OUT).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`웹 빌드 완료 → ${path.relative(ROOT, OUT)} (${(size / 1048576).toFixed(1)} MB)`);

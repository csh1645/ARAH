/**
 * @file 한 번만 쓰는 이전 도구: 예전 데이터 파일(words.js · sentences.js 의 RAW 표, git main 판)을 SQLite DB 로 옮긴다.
 *       인자로 예전 파일 경로를 받는다 (기본: git show 로 main 의 파일을 읽음).
 * 실행: npm run content:import  (DB 가 이미 있으면 같은 키는 덮어쓴다)
 */
import { execSync } from 'node:child_process';
import { openDb, saveDb } from './lib/content-db.mjs';

/** 예전 IIFE 데이터 파일을 가짜 window 에서 실행해 A.WORDS · A.PHRASES · A.SENTENCES 를 얻는다 (우리 저장소 파일) */
function loadLegacy() {
  const fake = { ARAH: {} };
  for (const f of ['web/src/data/words.js', 'web/src/data/sentences.js']) {
    const src = execSync(`git show main:${f}`, { encoding: 'utf8' });
    new Function('window', src)(fake);
  }
  return fake.ARAH;
}

const A = loadLegacy();
const db = await openDb();
const run = (sql, rows) => {
  const st = db.prepare(sql);
  rows.forEach((r) => st.run(r));
  st.free();
};
run('INSERT OR REPLACE INTO words (en, ko, emoji, cat, lv, sort) VALUES (?, ?, ?, ?, ?, ?)',
  A.WORDS.map((w, i) => [w.en, w.ko, w.emoji, w.cat, w.lv, i]));
run('INSERT OR REPLACE INTO phrases (en, ko, emoji, sort) VALUES (?, ?, ?, ?)',
  A.PHRASES.map((p, i) => [p.en, p.ko, p.emoji, i]));
run('INSERT OR REPLACE INTO sentences (en, ko, lv, blank, wrong1, wrong2, wrong3, tag, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  A.SENTENCES.map((s, i) => [s.en, s.ko, s.lv, s.blank, ...s.wrong, s.tag, i]));
saveDb(db);
console.log(`가져오기 완료: 단어 ${A.WORDS.length} · 어구 ${A.PHRASES.length} · 문장 ${A.SENTENCES.length} → content/arah-content.db`);

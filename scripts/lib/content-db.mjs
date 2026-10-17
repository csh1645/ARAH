/**
 * @file 콘텐츠 DB 공통 도구 (Node 스크립트 전용, 게임에는 들어가지 않는다).
 *       sql.js(SQLite 의 WebAssembly 판)를 써서 설치할 때 컴파일이 필요 없다 (Windows · Vercel · GitHub Actions 공통).
 * @see content/schema.sql, doc/decisions/ADR-0008-vite-content-pipeline.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DB_PATH = path.join(ROOT, 'content', 'arah-content.db');
export const SCHEMA_PATH = path.join(ROOT, 'content', 'schema.sql');
export const GENERATED_DIR = path.join(ROOT, 'web', 'src', 'data', 'generated');

/** DB 를 연다. 파일이 없으면 schema.sql 로 빈 DB 를 만든다. */
export async function openDb() {
  const SQL = await initSqlJs();
  const db = fs.existsSync(DB_PATH) ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database();
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return db;
}

/** DB 를 파일로 저장한다. */
export function saveDb(db) {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

/** SELECT 결과를 객체 배열로 */
export function all(db, sql) {
  const res = db.exec(sql);
  if (!res.length) return [];
  const { columns, values } = res[0];
  return values.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
}

/** 글을 파일 이름으로 (발음 파일): "I am happy." → "i-am-happy" */
export const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * DB 의 콘텐츠를 게임 형식으로 읽고 규칙을 검사한다. 규칙을 어기면 오류 목록을 함께 돌려준다.
 * @returns {{words: object[], phrases: object[], sentences: object[], errors: string[]}}
 */
export function readContent(db) {
  const words = all(db, 'SELECT en, ko, emoji, cat, lv FROM words ORDER BY sort, rowid');
  const phrases = all(db, 'SELECT en, ko, emoji FROM phrases ORDER BY sort, rowid');
  const sentences = all(db, 'SELECT en, ko, lv, blank, wrong1, wrong2, wrong3, tag FROM sentences ORDER BY lv, sort, rowid')
    .map(({ wrong1, wrong2, wrong3, ...s }) => ({ ...s, wrong: [wrong1, wrong2, wrong3] }));

  const errors = [];
  for (const w of words) if (!/^[a-z]+$/.test(w.en)) errors.push(`words: "${w.en}" 은 영문 소문자만 쓸 수 있어요`);
  for (const s of sentences) {
    const hits = s.en.split(' ').filter((t) => t.replace(/[.,?!]$/, '') === s.blank).length;
    if (hits !== 1) errors.push(`sentences: "${s.en}" 에 빈칸 단어 "${s.blank}" 가 정확히 한 번 있어야 해요 (지금 ${hits}번)`);
    if (new Set([s.blank, ...s.wrong]).size !== 4) errors.push(`sentences: "${s.en}" 의 오답이 정답과 같거나 서로 겹쳐요`);
  }
  return { words, phrases, sentences, errors };
}

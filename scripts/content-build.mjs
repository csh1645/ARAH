/**
 * @file 콘텐츠 빌드: content/arah-content.db (SQLite) → web/src/data/generated/content.json
 *       게임은 이 JSON 만 읽는다 (DB 를 그대로 배포하지 않으므로 브라우저에 SQLite 가 필요 없고 가볍다).
 *       규칙(빈칸 단어가 한 번, 오답 겹침 등)을 어기면 빌드를 멈춘다 → 잘못된 문제가 배포되지 않는다.
 * 실행: npm run content (npm run dev · build 가 자동으로 먼저 실행)
 * @see scripts/lib/content-db.mjs, content/schema.sql
 */
import fs from 'node:fs';
import path from 'node:path';
import { openDb, readContent, GENERATED_DIR, DB_PATH } from './lib/content-db.mjs';

if (!fs.existsSync(DB_PATH)) {
  console.error('content/arah-content.db 가 없어요. 처음 한 번 npm run content:import 로 만들어 주세요.');
  process.exit(1);
}
const db = await openDb();
const { words, phrases, sentences, errors } = readContent(db);
if (errors.length) {
  console.error(`콘텐츠 규칙 오류 ${errors.length}건:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
fs.mkdirSync(GENERATED_DIR, { recursive: true });
const out = path.join(GENERATED_DIR, 'content.json');
fs.writeFileSync(out, JSON.stringify({ words, phrases, sentences }, null, 1));
console.log(`콘텐츠 빌드: 단어 ${words.length} · 어구 ${phrases.length} · 문장 ${sentences.length} → ${path.relative(process.cwd(), out)}`);

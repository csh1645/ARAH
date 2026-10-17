/**
 * @file DB 를 사람이 읽을 수 있는 SQL 문서로 내보낸다: content/arah-content.sql
 *       .db 파일은 바이너리라 git 에서 무엇이 바뀌었는지 보이지 않는다 → 이 파일을 같이 커밋하면 변경 내용이 diff 로 보인다.
 *       (DB 를 잃어버려도 이 파일로 다시 만들 수 있다: sqlite3 arah-content.db < arah-content.sql)
 * 실행: npm run content:export  (GitHub Actions 콘텐츠 작업도 자동으로 실행)
 */
import fs from 'node:fs';
import path from 'node:path';
import { openDb, all, ROOT } from './lib/content-db.mjs';

const db = await openDb();
const q = (v) => (typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const lines = ['-- 자동 생성: npm run content:export (직접 고치지 말고 DB 를 고친 뒤 다시 내보내세요)', ''];
for (const table of ['words', 'phrases', 'sentences']) {
  const rows = all(db, `SELECT * FROM ${table} ORDER BY sort, rowid`);
  lines.push(`-- ${table} (${rows.length})`);
  for (const r of rows) lines.push(`INSERT INTO ${table} (${Object.keys(r).join(', ')}) VALUES (${Object.values(r).map(q).join(', ')});`);
  lines.push('');
}
const out = path.join(ROOT, 'content', 'arah-content.sql');
fs.writeFileSync(out, lines.join('\n'));
console.log(`내보내기: ${path.relative(process.cwd(), out)}`);

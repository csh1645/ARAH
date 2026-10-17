/**
 * @file 발음 파일 자동 생성 (Node). 콘텐츠 DB 의 단어 · 어구 · 문장 중 **파일이 없는 것만** kokoro-js 로 만든다.
 *       로컬: npm run audio / GitHub Actions: 콘텐츠 DB 가 바뀌어 push 되면 자동 실행 (.github/workflows/content-audio.yml)
 *       모델(Kokoro-82M q8, 약 86MB)은 처음 한 번 Hugging Face 에서 내려받아 캐시한다.
 * 옵션: --all  이미 있는 파일도 다시 만든다 / --limit N  최대 N 개만 (시험용)
 * 출력: web/public/assets/audio/words/*.wav, web/src/data/audio-manifest.json (게임이 읽는 목록)
 * @see tools/audio/wav.mjs (다듬기 규칙), doc/decisions/ADR-0004-pronunciation.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { KokoroTTS } from 'kokoro-js';
import { openDb, readContent, ROOT } from '../../scripts/lib/content-db.mjs';
import { tidy, toWavBytes, sayText, fileOf } from './wav.mjs';

const VOICE = 'af_heart'; // 미국 여성, 등급 A
const SPEED = 0.9; // 저학년도 따라 듣기 쉽게
const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const OUT_DIR = path.join(ROOT, 'web', 'public', 'assets', 'audio', 'words');
const MANIFEST = path.join(ROOT, 'web', 'src', 'data', 'audio-manifest.json');

const args = process.argv.slice(2);
const redoAll = args.includes('--all');
const limitAt = args.indexOf('--limit');
const limit = limitAt >= 0 ? Number(args[limitAt + 1]) : Infinity;

const db = await openDb();
const { words, phrases, sentences, errors } = readContent(db);
if (errors.length) {
  console.error(`콘텐츠 규칙 오류가 있어 발음을 만들지 않아요:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
const texts = [...new Set([...words, ...phrases, ...sentences].map((x) => x.en))];
const files = {};
const todo = [];
for (const t of texts) {
  const f = fileOf(t);
  if (!redoAll && fs.existsSync(path.join(OUT_DIR, f))) files[t.toLowerCase()] = f;
  else todo.push(t);
}
const batch = todo.slice(0, limit);
console.log(`읽을 글 ${texts.length}개 · 기존 파일 ${Object.keys(files).length}개 · 새로 만들 것 ${batch.length}개`);

if (batch.length) {
  console.log('모델 준비 중 (처음 한 번 약 86MB 내려받기)…');
  const tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype: 'q8', device: 'cpu' });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const t of batch) {
    const audio = await tts.generate(sayText(t), { voice: VOICE, speed: SPEED });
    const samples = tidy(audio.audio, audio.sampling_rate);
    const f = fileOf(t);
    fs.writeFileSync(path.join(OUT_DIR, f), toWavBytes(samples, audio.sampling_rate));
    files[t.toLowerCase()] = f;
    console.log(`  ${f}  ${(samples.length / audio.sampling_rate).toFixed(2)}초`);
  }
}

// 목록은 항상 콘텐츠 순서대로 다시 쓴다 (DB 에서 지운 글은 목록에서도 빠진다)
const ordered = Object.fromEntries(texts.map((t) => t.toLowerCase()).filter((k) => files[k]).map((k) => [k, files[k]]));
fs.writeFileSync(MANIFEST, `${JSON.stringify({
  source: `Kokoro-82M (kokoro-js 1.2.0, voice ${VOICE}, speed ${SPEED}), Apache-2.0`,
  files: ordered,
}, null, 1)}\n`);
console.log(`발음 목록 ${Object.keys(ordered).length}개 → ${path.relative(process.cwd(), MANIFEST)}`);

/**
 * @file 발음 파일 자동 생성 (Node) — 목소리 팩 단위. 콘텐츠 DB 의 단어 · 어구 · 문장 중 **그 목소리에 파일이 없는 것만** 만든다.
 *       로컬: npm run audio [-- --voice am_michael] / GitHub Actions: 콘텐츠 DB 가 바뀌어 push 되면 모든 팩 자동 실행
 *       모델(Kokoro-82M q8, 약 86MB)은 처음 한 번 Hugging Face 에서 내려받아 캐시한다.
 * 옵션: --voice <id>  목소리 팩 (VOICES 표, 기본 af_heart) / --all-voices 표의 모든 팩
 *       --all  이미 있는 파일도 다시 만든다 / --limit N  최대 N 개만 (시험용)
 * 출력: web/public/assets/audio/voices/<목소리>/*.wav, web/src/data/audio-manifest.json (게임이 읽는 팩 목록)
 * @see tools/audio/wav.mjs (다듬기 규칙), doc/decisions/ADR-0004-pronunciation.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { KokoroTTS } from 'kokoro-js';
import { openDb, readContent, ROOT } from '../../scripts/lib/content-db.mjs';
import { tidy, toWavBytes, sayText, fileOf } from './wav.mjs';

/**
 * 목소리 팩 표. Kokoro 음성 중 미국 영어 품질 등급이 높은 것만 쓴다.
 * label: 메뉴에 보이는 이름 / speed: 저학년도 따라 듣기 쉽게 조금 느리게
 */
export const VOICES = {
  af_heart: { label: '여자 목소리 1', speed: 0.9 }, // 미국 여성, 등급 A (기본)
  af_bella: { label: '여자 목소리 2', speed: 0.9 }, // 미국 여성, 등급 A-
  am_michael: { label: '남자 목소리', speed: 0.92 }, // 미국 남성, 남성 중 자연스러운 편
};
const DEFAULT_VOICE = 'af_heart';
const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const VOICES_DIR = path.join(ROOT, 'web', 'public', 'assets', 'audio', 'voices');
const MANIFEST = path.join(ROOT, 'web', 'src', 'data', 'audio-manifest.json');

const args = process.argv.slice(2);
const opt = (name) => (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : null);
const redoAll = args.includes('--all');
const limit = opt('--limit') ? Number(opt('--limit')) : Infinity;
const voiceIds = args.includes('--all-voices') ? Object.keys(VOICES) : [opt('--voice') || DEFAULT_VOICE];
for (const v of voiceIds) if (!VOICES[v]) { console.error(`모르는 목소리: ${v} (VOICES 표에 추가하세요)`); process.exit(1); }

const db = await openDb();
const { words, phrases, sentences, errors } = readContent(db);
if (errors.length) {
  console.error(`콘텐츠 규칙 오류가 있어 발음을 만들지 않아요:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
const texts = [...new Set([...words, ...phrases, ...sentences].map((x) => x.en))];
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
manifest.default = manifest.default || DEFAULT_VOICE;
manifest.voices = manifest.voices || {};

let tts = null;
for (const voice of voiceIds) {
  const outDir = path.join(VOICES_DIR, voice);
  const files = {};
  const todo = [];
  for (const t of texts) {
    const f = fileOf(t);
    if (!redoAll && fs.existsSync(path.join(outDir, f))) files[t.toLowerCase()] = f;
    else todo.push(t);
  }
  const batch = todo.slice(0, limit);
  console.log(`[${voice}] 읽을 글 ${texts.length}개 · 기존 ${Object.keys(files).length}개 · 새로 만들 것 ${batch.length}개`);
  if (batch.length && !tts) {
    console.log('모델 준비 중 (처음 한 번 약 86MB 내려받기)…');
    tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype: 'q8', device: 'cpu' });
  }
  fs.mkdirSync(outDir, { recursive: true });
  for (const t of batch) {
    const audio = await tts.generate(sayText(t), { voice, speed: VOICES[voice].speed });
    const samples = tidy(audio.audio, audio.sampling_rate);
    const f = fileOf(t);
    fs.writeFileSync(path.join(outDir, f), toWavBytes(samples, audio.sampling_rate));
    files[t.toLowerCase()] = f;
    console.log(`  ${voice}/${f}  ${(samples.length / audio.sampling_rate).toFixed(2)}초`);
  }
  // 목록은 콘텐츠 순서대로 다시 쓴다 (DB 에서 지운 글은 목록에서도 빠진다)
  manifest.voices[voice] = {
    label: VOICES[voice].label,
    source: `Kokoro-82M (kokoro-js 1.2.0, voice ${voice}, speed ${VOICES[voice].speed}), Apache-2.0`,
    files: Object.fromEntries(texts.map((t) => t.toLowerCase()).filter((k) => files[k]).map((k) => [k, files[k]])),
  };
  // 팩이 생길 때마다 저장 (긴 작업 중간에 멈춰도 만든 만큼은 쓸 수 있게)
  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 1)}\n`);
  console.log(`[${voice}] 목록 ${Object.keys(manifest.voices[voice].files).length}개`);
}

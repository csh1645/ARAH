/**
 * @file Godot 판 데이터 내보내기: 웹 판의 원본 데이터 · 문제 생성기를 그대로 실행해 godot/data/generated/*.json 을 만든다.
 *       "원본은 하나" 원칙 (ADR-0011) — 캐릭터 · 대사 · 규칙 · 단계 · 과목 · 놀이 목록은 web/src/data/*.js,
 *       단어 · 문장은 content DB(→ generated/content.json), 문제는 검증된 생성기(web/src/questions/*.js)가 원본이다.
 *       Godot 쪽은 이 JSON 을 읽기만 한다 (GDScript 로 데이터를 다시 적지 않는다).
 * 실행: npm run godot:data (npm run content 다음에)
 * @see doc/decisions/ADR-0011-godot-engine.md, doc/planning/godot-migration-plan.md (3. 데이터)
 *
 * 문제 풀: 과목 × 단계 × 문제 형식마다 서로 다른 문제(key 기준)를 최대 POOL_SIZE 개 미리 만든다.
 *   검사 (하나라도 어기면 실패 · 종료): 정답이 보기 중 정확히 하나 · 보기 중복 없음 · 빈 문제 없음 ·
 *   자연수 단계(1~6, 정수 · 음수를 배우기 전)에는 음수 없음.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'web/src');
const OUT = path.join(ROOT, 'godot/data/generated');
const FONT_OUT = path.join(ROOT, 'godot/fonts/generated');
const POOL_SIZE = 240; // 과목 · 단계마다 미리 만들 서로 다른 문제 수 (한 판 10문제 × 24판)
const POOL_TRIES = 6000;
const NATURAL_LEVELS = 6; // 1~6단계(초1~초6)는 음수가 나오면 안 된다
const SUBJECTS = ['add', 'sub', 'mul', 'div', 'eq', 'mix', 'eng'];

// ---------- 웹 판 코드 실행 (IIFE + window.ARAH 방식 그대로) ----------

const json = (rel) => JSON.parse(fs.readFileSync(path.join(SRC, rel), 'utf8'));
const JSON_IMPORTS = {
  './generated/content.json': json('data/generated/content.json'),
  './audio-manifest.json': json('data/audio-manifest.json'),
  './sprite-manifest.json': json('data/sprite-manifest.json'),
};
const memory = {};
const sandbox = {
  console,
  Math,
  JSON,
  localStorage: { getItem: (k) => (k in memory ? memory[k] : null), setItem: (k, v) => { memory[k] = String(v); } },
};
sandbox.window = sandbox;
vm.createContext(sandbox);

/** 웹 판 파일 하나를 실행한다. JSON import 한 줄은 미리 읽은 값으로 바꾼다 (Vite 없이 실행하기 위해) */
function run(rel) {
  let code = fs.readFileSync(path.join(SRC, rel), 'utf8');
  code = code.replace(/^import\s+(\w+)\s+from\s+'([^']+\.json)';?$/gm, (_, name, spec) => {
    if (!JSON_IMPORTS[spec]) throw new Error(`${rel}: 모르는 JSON import ${spec}`);
    return `var ${name} = __json[${JSON.stringify(spec)}];`;
  });
  sandbox.__json = JSON_IMPORTS;
  vm.runInContext(code, sandbox, { filename: rel });
}

[
  'core/util.js', 'core/storage.js',
  'data/curriculum.js', 'data/heroes.js', 'data/hero-lines.js', 'data/words.js', 'data/sentences.js',
  'data/audio-manifest.js', 'data/sprite-manifest.js',
  'questions/math-values.js', 'questions/math.js', 'questions/english.js', 'questions/index.js',
].forEach(run);
const A = sandbox.ARAH;

// ---------- 히어로 손 위치 (그림 원본 hero-art.js 의 자세 표에서 계산) ----------
// hero-art.js 는 캔버스 그리기 코드라 실행에 Phaser 가 필요 없다. 실패하면 기본값(오른손 앞)으로 둔다.
let hands = null;
let anims = null;
try {
  run('game/hero-art.js');
  hands = Object.fromEntries(A.HERO_POSES.map((p) => [p, A.heroHand(p)]));
  // 관절 동작: 동작 묶음 표 + 프레임마다 손 위치 (그림은 npm run sprites 가 <id>.anim.webp 로 굽는다)
  anims = { clips: A.HERO_ANIMS, hands: A.HERO_ANIM_FRAMES.map((p) => A.heroHand(p)), cols: 8, scale: 2 };
} catch (e) {
  console.warn(`hero-art.js 를 실행하지 못해 손 위치 기본값을 씁니다: ${e.message}`);
}

// ---------- 문제 풀 ----------

const errors = [];
/** 문제 하나 검사 — 웹 판 생성기 검증 규칙과 같다 (CLAUDE.md 5절) */
function check(q, tag, level) {
  if (!q || !q.key || !q.prompt || q.answer === undefined || q.answer === '') return `${tag}: 빈 문제`;
  if (q.spelling) {
    if (q.tokens && q.tokens.join(' ') !== q.answer && q.tokens.join('') !== q.answer) {
      // 문장 만들기: 고를 단어를 이으면 정답 문장이어야 한다 (구두점 차이는 허용)
      const strip = (s) => s.replace(/[^a-z' ]/gi, '').trim().toLowerCase();
      if (strip(q.tokens.join(' ')) !== strip(q.answer)) return `${tag}: 문장 단어(${q.tokens.join(' ')}) ≠ 정답(${q.answer})`;
    }
    return null;
  }
  const hits = q.choices.filter((c) => c === q.answer).length;
  if (hits !== 1) return `${tag}: 정답이 보기 중 ${hits}개 (${q.prompt})`;
  if (new Set(q.choices).size !== q.choices.length) return `${tag}: 보기 중복 (${q.choices.join(', ')})`;
  if (level <= NATURAL_LEVELS && q.subject !== 'eng' && /(^|[^\w])[-−]\d/.test([q.prompt, ...q.choices].join(' '))) {
    return `${tag}: 자연수 단계에 음수 (${q.prompt} / ${q.choices.join(', ')})`;
  }
  return null;
}

/** 저장할 필드만 (화면 상태 필드 제외) — questions/review.js KEEP 과 같다 */
const KEEP = ['key', 'subject', 'prompt', 'hint', 'answer', 'choices', 'review', 'speak', 'speakOnStart', 'pictureChoices', 'spelling', 'decoys', 'tokens'];
const slim = (q) => Object.fromEntries(KEEP.filter((k) => q[k] !== undefined).map((k) => [k, q[k]]));

function makePool(subject, level, options, tag) {
  const pool = new Map();
  for (let i = 0; i < POOL_TRIES && pool.size < POOL_SIZE; i++) {
    const q = A.makeQuestion(subject, level, options);
    const err = check(q, tag, level);
    if (err) { errors.push(err); if (errors.length > 20) break; continue; }
    if (!pool.has(q.key)) pool.set(q.key, slim(q));
  }
  return [...pool.values()];
}

fs.mkdirSync(path.join(OUT, 'questions'), { recursive: true });
const poolStats = {};
for (let level = 1; level <= 12; level++) {
  const variants = SUBJECTS.map((s) => [s, s, {}]);
  variants.push(['eng-pic', 'eng', { pictureChoices: true }], ['spell', 'eng', { spelling: true }]);
  for (const [name, subject, options] of variants) {
    const tag = `${name}-${level}`;
    const pool = makePool(subject, level, options, tag);
    poolStats[tag] = pool.length;
    fs.writeFileSync(path.join(OUT, 'questions', `${tag}.json`), JSON.stringify(pool));
  }
}
if (errors.length) {
  console.error(`문제 검사 실패 ${errors.length}건:\n- ${errors.slice(0, 20).join('\n- ')}`);
  process.exit(1);
}

// ---------- 게임 데이터 ----------

const heroes = A.HEROES.map((h) => ({ ...h, franchise: franchiseOf(h) }));
/** 작품별 연출 묶음 (game/signatures.js A.franchiseOf 와 같은 규칙) */
function franchiseOf(hero) {
  const L = hero.look || {};
  if (L.original) return 'original';
  if (L.op || L.anime || L.skull || L.mascot === 'chopper') return 'onepiece';
  if (['chiikawa', 'hachiware', 'usagi'].includes(L.mascot)) return 'chiikawa';
  if (L.mascot) return 'sanrio';
  return 'comic';
}
const atlas = json('../public/assets/sprites/heroes/spider-man.json');
const game = {
  version: 1,
  subjects: A.SUBJECTS,
  modes: A.MODES,
  modeAliases: A.MODE_ALIASES,
  levels: A.LEVELS,
  legacyLevelMap: A.LEGACY_LEVEL_MAP,
  rules: A.RULES,
  families: A.HERO_FAMILIES,
  heroes,
  origins: A.HERO_ORIGINS,
  heroIdMap: A.HERO_ID_MAP,
  teamLines: A.TEAM_LINES,
  catchphrases: A.HERO_CATCHPHRASES,
  sprites: {
    heroes: A.SPRITES.heroes,
    frame: A.SPRITES.frame,
    frames: Object.fromEntries(Object.entries(atlas.frames).map(([k, v]) => [k, [v.frame.x, v.frame.y, v.frame.w, v.frame.h]])),
  },
  hands,
  anims,
  voices: { default: A.VOICE_DEFAULT, packs: A.VOICE_PACKS },
  pools: poolStats,
};
fs.writeFileSync(path.join(OUT, 'game.json'), JSON.stringify(game));

// ---------- 글꼴 (사이트 안에 함께 배포 — 외부 글꼴 서버 금지, 아동 대상 보안 규칙) ----------
// @fontsource 의 Jua · Black Han Sans 는 글자 범위별 조각(woff2)으로 나뉘어 있다. Godot 는 조각을 "대체 글꼴" 목록으로 이어 쓴다.
const fontList = {};
for (const [id, pkg] of [['jua', 'jua'], ['blackhan', 'black-han-sans']]) {
  const dir = path.join(ROOT, 'node_modules/@fontsource', pkg, 'files');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('-400-normal.woff2'));
  const target = path.join(FONT_OUT, id);
  fs.mkdirSync(target, { recursive: true });
  for (const f of files) {
    const dst = path.join(target, f);
    if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(path.join(dir, f)).size) fs.copyFileSync(path.join(dir, f), dst);
  }
  // 라틴 글자 조각을 맨 앞에 (숫자 · 영어가 가장 많다)
  fontList[id] = files.sort((a, b) => (a.includes('latin') ? -1 : 0) - (b.includes('latin') ? -1 : 0) || a.localeCompare(b));
}
fs.writeFileSync(path.join(OUT, 'fonts.json'), JSON.stringify(fontList));

// ---------- 그림 문자(이모지) 목록 — 웹에서는 브라우저가 그려 준다 (godot/scripts/autoload/emoji.gd) ----------
const allText = JSON.stringify(game) + fs.readdirSync(path.join(OUT, 'questions')).map((f) => fs.readFileSync(path.join(OUT, 'questions', f), 'utf8')).join('');
const emoji = [...new Set(allText.match(/\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic}️?)*/gu) || [])];
fs.writeFileSync(path.join(OUT, 'emoji.json'), JSON.stringify(emoji));

const total = Object.values(poolStats).reduce((a, b) => a + b, 0);
console.log(`Godot 데이터: 히어로 ${heroes.length} · 문제 풀 ${Object.keys(poolStats).length}개 (문제 ${total}) · 그림 문자 ${emoji.length} · 손 위치 ${hands ? 'O' : '기본값'} → ${path.relative(ROOT, OUT)}`);

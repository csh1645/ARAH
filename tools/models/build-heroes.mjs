/**
 * @file 사람형 3D 히어로 모델 만들기: Quaternius "Universal Base Characters" + "Universal Animation Library" (둘 다 CC0)
 *       원본(약 130MB)을 웹용으로 줄여 content/models/heroes/ 에 쓴다 (지금은 2D 히어로라 배포하지 않음, assets3d.js USE_HERO_3D).
 *         - 몸(남 · 여): 몸 · 눈 · 눈썹, 기본색 텍스처만 남기고 1024 JPEG 로 (법선 · 거칠기 맵은 만화 음영이라 필요 없음)
 *         - 머리 모양 5종: Head 뼈에 묶인 메시, 텍스처 512
 *         - 동작: 게임에서 쓰는 동작만, 메시 없이 뼈 회전만 (몸 비율이 달라도 맞도록 위치 트랙은 골반만 남김)
 * @layer tools
 * @depends @gltf-transform/core · functions · extensions, meshoptimizer (루트 devDependencies), @napi-rs/canvas (tools/sprites)
 * @see web/src/game/three/hero3d.js, web/public/assets/models/README.md
 *
 * 실행 (원본 압축을 푼 폴더 두 개를 인자로):
 *   node tools/models/build-heroes.mjs "<Universal Base Characters[Standard] 폴더>" "<Universal Animation Library[Standard] 폴더>"
 */
import { NodeIO } from '@gltf-transform/core';
import { prune, dedup, resample, meshopt } from '@gltf-transform/functions';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { createRequire } from 'node:module';
import { mkdirSync, copyFileSync, statSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { createCanvas, loadImage } = createRequire(join(root, 'tools/sprites/package.json'))('@napi-rs/canvas');

const [ubc, ual] = process.argv.slice(2);
if (!ubc || !ual) {
  console.error('사용법: node tools/models/build-heroes.mjs <UniversalBaseCharacters 폴더> <UniversalAnimationLibrary 폴더>');
  process.exit(1);
}
const OUT = join(root, 'content/models/heroes'); // 배포하지 않는 곳 (USE_HERO_3D 를 켤 때 web/public/assets/models/heroes 로 복사)
mkdirSync(OUT, { recursive: true });
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

/** 게임에서 쓰는 동작 (hero3d.js 의 CLIPS 와 맞춘다) */
const KEEP_CLIPS = ['Idle_Loop', 'Sprint_Loop', 'Jog_Fwd_Loop', 'Jump_Start', 'Jump_Loop', 'Jump_Land', 'Hit_Chest',
  'Dance_Loop', 'Spell_Simple_Shoot', 'Punch_Cross', 'Punch_Jab', 'Sword_Attack', 'Pistol_Shoot', 'Death01', 'Roll'];
/** 머리 모양: 원본 파일 이름 → 출력 이름 */
const HAIRS = { Hair_SimpleParted: 'hair-parted', Hair_Long: 'hair-long', Hair_Buns: 'hair-buns', Hair_Buzzed: 'hair-buzzed', Hair_Beard: 'hair-beard' };
const ATTRS = ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'];

/** 텍스처를 size 로 줄여 다시 넣는다 (jpeg: 불투명 몸, png: 머리카락처럼 투명 필요) */
async function shrink(tex, size, type) {
  const img = await loadImage(Buffer.from(tex.getImage()));
  const cv = createCanvas(size, size);
  cv.getContext('2d').drawImage(img, 0, 0, size, size);
  tex.setImage(type === 'jpeg' ? cv.toBuffer('image/jpeg', 88) : cv.toBuffer('image/png'));
  tex.setMimeType(`image/${type}`);
  tex.setURI('');
}

/** 메시 정리: 쓰지 않는 UV · 색 속성 제거, 법선 · 거칠기 맵 제거, 기본색만 줄여서 */
async function slim(doc, texSize) {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      for (const sem of prim.listSemantics()) if (!ATTRS.includes(sem)) prim.setAttribute(sem, null);
    }
  }
  const done = new Set();
  for (const m of doc.getRoot().listMaterials()) {
    m.setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null);
    const t = m.getBaseColorTexture();
    if (t && !done.has(t)) {
      done.add(t);
      const isHair = /hair/i.test(m.getName());
      await shrink(t, /eye/i.test(m.getName()) ? 256 : texSize, isHair ? 'png' : 'jpeg');
    }
  }
  await doc.transform(prune(), dedup());
}

const BLANK_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/** .gltf 읽기 — 원본에 없는 그림 파일(예: 남자 몸의 T_Hair_1_Normal_png.png)은 1x1 빈 그림으로 바꿔 읽는다 */
async function readGltf(path) {
  const json = JSON.parse(readFileSync(path, 'utf8'));
  for (const img of json.images || []) {
    if (img.uri && !img.uri.startsWith('data:') && !existsSync(join(dirname(path), decodeURIComponent(img.uri)))) img.uri = BLANK_PNG;
  }
  const tmp = `${path}.tmp.gltf`;
  writeFileSync(tmp, JSON.stringify(json));
  try {
    return await io.read(tmp);
  } finally {
    rmSync(tmp);
  }
}

/**
 * glb 로 쓴다. compress 면 meshopt 압축 (동작 파일만 — 화면에서는 MeshoptDecoder 로 푼다).
 * 몸 · 머리는 압축하지 않는다: 위치 값을 양자화하면 hero-suit 셰이더가 쓰는 "기본 자세 좌표(미터)" 가 바뀐다.
 */
async function write(doc, name, compress = false) {
  if (compress) await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const p = join(OUT, `${name}.glb`);
  await io.write(p, doc);
  console.log(`${name}.glb  ${(statSync(p).size / 1024).toFixed(0)} KB`);
}

// 1) 몸
const G = join(ubc, 'Base Characters', 'Godot - UE');
for (const [src, name] of [['Superhero_Male_FullBody', 'hero-body-male'], ['Superhero_Female_FullBody', 'hero-body-female']]) {
  const doc = await readGltf(join(G, `${src}.gltf`));
  await slim(doc, 1024);
  await write(doc, name);
}

// 2) 머리 모양
const H = join(ubc, 'Hairstyles', 'Rigged to Head Bone', 'glTF (Godot -Unreal)');
for (const [src, name] of Object.entries(HAIRS)) {
  const doc = await readGltf(join(H, `${src}.gltf`));
  await slim(doc, 512);
  await write(doc, name);
}

// 3) 동작 (메시 · 스킨 제거, 고른 동작만, 위치 트랙은 골반만)
{
  const doc = await io.read(join(ual, 'Unreal-Godot', 'UAL1_Standard.glb'));
  const r = doc.getRoot();
  for (const a of r.listAnimations()) {
    if (!KEEP_CLIPS.includes(a.getName())) { a.dispose(); continue; }
    for (const ch of a.listChannels()) {
      const path = ch.getTargetPath();
      const node = ch.getTargetNode();
      if (path === 'scale' || (path === 'translation' && node && node.getName() !== 'pelvis')) {
        ch.getSampler().dispose();
        ch.dispose();
      }
    }
  }
  for (const n of r.listNodes()) { n.setMesh(null); n.setSkin(null); }
  for (const s of r.listSkins()) s.dispose();
  for (const m of r.listMeshes()) m.dispose();
  await doc.transform(resample({ tolerance: 1e-3 }), prune({ keepLeaves: true }), dedup());
  await write(doc, 'hero-anims', true);
  console.log('동작:', r.listAnimations().map((a) => a.getName()).join(', '));
}

// 4) 라이선스 (CC0) 를 결과 옆에 둔다
copyFileSync(join(ubc, 'License_Standard.txt'), join(OUT, 'LICENSE-quaternius-universal-base-characters.txt'));
writeFileSync(join(OUT, 'LICENSE-quaternius-universal-animation-library.txt'),
  'Universal Animation Library [Standard] by Quaternius (https://quaternius.com)\nLicense: CC0 1.0 Universal (Public Domain Dedication)\nhttps://creativecommons.org/publicdomain/zero/1.0/\n');
console.log('끝:', OUT);

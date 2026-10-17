import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * @file 3D 모델(glTF) 불러오기 · 캐시. 메뉴가 뜨는 동안 미리 불러 두고(preloadAll), 게임은 불러온 것을 복제해 쓴다.
 *       모델은 모두 CC0: 도시 · 소품 = Kenney (web/public/assets/models/kenney/), 사람형 히어로 · 동작 = Quaternius
 *       (web/public/assets/models/heroes/, tools/models/build-heroes.mjs 로 만듦). 라이선스 파일 동봉.
 * @layer game
 * @depends THREE (전역), three/examples GLTFLoader · MeshoptDecoder · SkeletonUtils, A.Toon
 * @see web/public/assets/models/README.md, doc/decisions/ADR-0009-full-3d.md
 */
(function (A) {
  'use strict';

  const BASE = 'assets/models/kenney/';
  const HEROES = 'assets/models/heroes/';

  /** 쓰는 모델 목록 (파일 이름 = 키). 건물은 높이 · 모양이 다른 것을 골고루 */
  const MODELS = {
    /** 사람형 히어로: 몸 2종 · 동작 · 머리 모양 5종 (hero3d.js) */
    heroes: {
      male: `${HEROES}hero-body-male.glb`,
      female: `${HEROES}hero-body-female.glb`,
      anims: `${HEROES}hero-anims.glb`,
      hair: Object.fromEntries(['parted', 'long', 'buns', 'buzzed', 'beard'].map((n) => [n, `${HEROES}hair-${n}.glb`])),
    },
    city: ['building-skyscraper-a', 'building-skyscraper-b', 'building-skyscraper-c', 'building-skyscraper-d', 'building-skyscraper-e',
      'building-a', 'building-b', 'building-c', 'building-d', 'building-e', 'building-f', 'building-g', 'building-h']
      .map((n) => `${BASE}city/${n}.glb`),
    far: ['low-detail-building-a', 'low-detail-building-b', 'low-detail-building-c', 'low-detail-building-d', 'low-detail-building-wide-a']
      .map((n) => `${BASE}city/${n}.glb`),
    props: {
      barrier: `${BASE}roads/construction-barrier.glb`,
      cone: `${BASE}roads/construction-cone.glb`,
      light: `${BASE}roads/light-square.glb`,
      dumpster: `${BASE}roads/dumpster.glb`,
    },
  };

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder); // 동작 파일은 meshopt 로 압축되어 있다
  const heroUrls = () => [MODELS.heroes.male, MODELS.heroes.female, MODELS.heroes.anims, ...Object.values(MODELS.heroes.hair)];
  /** @type {Map<string, Promise<object>>} url → 불러오기 약속 */
  const pending = new Map();
  /** @type {Map<string, object>} url → 불러온 gltf */
  const done = new Map();

  /**
   * 불러온 모델을 만화풍(toon 재질 + 잉크 외곽선)으로 바꿔 둔다 — 복제본은 모두 이 재질을 공유한다.
   * 히어로는 히어로마다 슈트를 따로 입히므로(hero3d.js) 그대로 두고, 먼 건물은 외곽선 없이(가벼움 · 원근감).
   */
  function stylize(url, g) {
    if (heroUrls().includes(url)) return;
    A.Toon.toonify(g.scene, { outline: MODELS.far.includes(url) ? 0 : 0.02 });
  }

  function load(url) {
    if (!pending.has(url)) {
      pending.set(url, new Promise((resolve, reject) => loader.load(url, (g) => {
        stylize(url, g);
        done.set(url, g);
        resolve(g);
      }, undefined, reject)));
    }
    return pending.get(url);
  }

  /**
   * 3D 사람형 히어로를 쓸지. false = 히어로는 2D 그림(hero-art.js, 2등신)으로 그린다 — 사용자 결정 2026-10-17
   * ("이 느낌 유지": 예전 2D 그림체). 3D 도시 · 소품 배경은 그대로 쓴다. true 로 바꾸면 hero3d.js 가 다시 쓰인다.
   */
  const USE_HERO_3D = false;

  const allUrls = () => [...(USE_HERO_3D ? heroUrls() : []), ...MODELS.city, ...MODELS.far, ...Object.values(MODELS.props)];

  A.Assets3D = {
    MODELS,
    USE_HERO_3D,

    /** WebGL 을 쓸 수 있는지 (안 되면 게임은 예전 2D 화면으로 그린다) */
    supported() {
      if (A.Assets3D._supported !== undefined) return A.Assets3D._supported;
      try {
        const cv = document.createElement('canvas');
        A.Assets3D._supported = !!(window.WebGLRenderingContext && (cv.getContext('webgl2') || cv.getContext('webgl')));
      } catch (e) {
        A.Assets3D._supported = false;
      }
      return A.Assets3D._supported;
    },

    /** 모든 모델을 미리 불러온다 (메뉴에서 한 번). 실패한 모델은 건너뛴다. @returns {Promise<void>} */
    preloadAll() {
      if (!A.Assets3D._all) A.Assets3D._all = Promise.allSettled(allUrls().map(load)).then(() => undefined);
      return A.Assets3D._all;
    },

    /** 모두 불러왔는지 */
    isReady() {
      return allUrls().every((u) => done.has(u)) || (A.Assets3D._all && A.Assets3D.heroReady());
    },

    /** 사람형 히어로(몸 · 동작)를 다 불러왔는지 — 3D 히어로를 세울 수 있는지 */
    heroReady() {
      if (!USE_HERO_3D) return false; // 2D 그림 히어로
      const H = MODELS.heroes;
      return done.has(H.male) && done.has(H.female) && done.has(H.anims);
    },

    /**
     * 뼈대가 있는 모델의 복제본 (뼈 · 스킨까지 새로). 형상 · 텍스처는 원본과 공유한다.
     * @param {string} url
     * @returns {THREE.Object3D|null}
     */
    cloneSkinned(url) {
      const g = done.get(url);
      return g ? cloneSkeleton(g.scene) : null;
    },

    /**
     * 불러온 모델의 복제본 (없으면 null). 재질 · 형상은 원본과 공유하므로 dispose 하지 않는다.
     * @param {string} url
     * @returns {THREE.Object3D|null}
     */
    clone(url) {
      const g = done.get(url);
      return g ? g.scene.clone(true) : null;
    },

    /** @param {string} url @returns {object|null} 불러온 gltf (애니메이션 포함) */
    get(url) {
      return done.get(url) || null;
    },
  };
})(window.ARAH);

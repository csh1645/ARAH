import manifest from './sprite-manifest.json';

/**
 * @file 그림 리소스(스프라이트 아틀라스) 목록. 원본은 sprite-manifest.json 이고 npm run sprites 가 다시 쓴다.
 *       목록에 있는 히어로는 web/public/<경로>.png · .json 아틀라스를 쓰고, 없으면 코드 그림(game/hero-art.js)으로 그린다.
 * @layer data
 * @depends sprite-manifest.json
 * @see tools/sprites/build.mjs, web/public/assets/sprites/README.md
 */

/**
 * @typedef {Object} SpriteManifest
 * @property {Object<string, string>} heroes 히어로 id → 아틀라스 경로 (확장자 없이, 예: "assets/sprites/heroes/red")
 * @property {{w: number, h: number}} frame 프레임 크기 px (게임의 히어로 크기와 같다)
 */
(function (A) {
  'use strict';

  /** @type {SpriteManifest} */
  A.SPRITES = manifest;
})(window.ARAH);

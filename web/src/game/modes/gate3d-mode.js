/**
 * @file 🌆 3D 문 통과 모드. 규칙은 문 통과(GateScene)와 같고, 화면만 Three.js 3D 뷰를 쓴다.
 * @layer game
 * @depends A.GateScene, A.GateView3D (Three.js 를 불러오지 못하면 이 모드는 등록되지 않는다)
 * @see doc/decisions/ADR-0005-threejs-3d.md
 */
(function (A) {
  'use strict';

  if (!A.GateScene || !A.GateView3D) return;

  class Gate3DScene extends A.GateScene {
    introText() {
      return `${this.hero.name} 출동!\n하늘 다리를 달려 정답 문으로!`;
    }

    createView(laneCount) {
      return new A.GateView3D(this, laneCount);
    }
  }

  /** Phaser 캔버스를 투명하게 만들어 뒤쪽 3D 화면 위에 HUD 만 겹친다 (launcher.js 가 읽는다). */
  Gate3DScene.transparent = true;

  A.GAME_MODES.gate3d = Gate3DScene;
})(window.ARAH);

/**
 * @file 메뉴 로비의 3D: 고른 히어로가 노란 원판 위에서 도는 "히어로 무대"와, 도감 카드의 3D 초상화 (사람형 히어로, hero3d.js).
 *       게임 판(Stage3D)과 같은 3D 히어로 · 만화풍 표현을 써서 메뉴와 게임이 한 세계처럼 보이게 한다.
 * @layer game
 * @depends THREE (전역), A.Hero3D, A.Toon, A.THEME, A.Assets3D
 * @see ui/app.js (renderMenu), doc/standards/design-system.md (3. 부품 — 히어로 카드)
 */
(function (A) {
  'use strict';

  const lights = (scene) => {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a9a, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(3, 6, 6);
    scene.add(sun);
  };

  class HeroShowcase {
    /** @param {HTMLElement} el 무대를 넣을 상자 (크기는 CSS 가 정한다) */
    constructor(el) {
      this.el = el;
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      el.appendChild(this.renderer.domElement);
      this.scene = new THREE.Scene();
      this.scene.background = A.Toon.halftoneSky();
      lights(this.scene);
      this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      this.camera.position.set(0, 1.7, 6.2);
      this.camera.lookAt(0, 1.38, 0);
      // 노란 원판 (잉크 테두리) — 히어로가 서는 무대
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.35, 40), A.Toon.material({ color: A.THEME.hex.sun }));
      disc.position.y = -0.18;
      A.Toon.outline(disc, 0.05);
      this.scene.add(disc);
      this.clock = new THREE.Clock();
      this.tick = () => this.render();
      requestAnimationFrame(this.tick);
    }

    /** @param {Hero} hero 무대에 세울 히어로 (바꾸면 만세로 인사) */
    setHero(hero) {
      if (!A.Assets3D.heroReady()) return; // 모델을 불러오면 app 이 다시 부른다
      if (this.hero && this.hero.hero.id === hero.id) return;
      if (this.hero) this.hero.dispose();
      this.hero = new A.Hero3D(hero);
      this.hero.root.scale.setScalar(0.85);
      this.scene.add(this.hero.root);
      this.hero.setPose('win');
      this.cheerUntil = this.clock.elapsedTime + 1.4;
    }

    render() {
      requestAnimationFrame(this.tick);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      const w = this.el.clientWidth;
      const h = this.el.clientHeight;
      if (!w || !h || !this.el.offsetParent) return; // 메뉴가 안 보이면(게임 중) 그리지 않는다
      if (w !== this.w || h !== this.h) {
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.w = w;
        this.h = h;
      }
      if (this.hero) {
        if (this.clock.elapsedTime > this.cheerUntil) this.hero.setPose('idle');
        this.hero.root.rotation.y = Math.sin(this.clock.elapsedTime * 0.6) * 0.55; // 좌우로 천천히 돌아보기
        this.hero.update(dt);
      }
      this.renderer.render(this.scene, this.camera);
    }
  }

  // ---------- 도감 카드 초상화 (한 번 그려 이미지로 저장) ----------

  const PORTRAIT = { w: 160, h: 180 };
  const cache = new Map();
  let shot = null;

  /** 초상화 촬영용 무대 (보이지 않는 캔버스 하나를 모든 카드가 함께 쓴다) */
  function studio() {
    if (shot) return shot;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(PORTRAIT.w, PORTRAIT.h);
    r.outputEncoding = THREE.sRGBEncoding;
    const scene = new THREE.Scene();
    lights(scene);
    const cam = new THREE.PerspectiveCamera(28, PORTRAIT.w / PORTRAIT.h, 0.1, 50);
    cam.position.set(0.6, 1.6, 5.4); // 3등신 전신 3/4 앞모습 — 큰 머리 · 의상이 한눈에
    cam.lookAt(0, 1.38, 0);
    shot = { r, scene, cam };
    return shot;
  }

  /**
   * 히어로 초상화 (3D, 전신 3/4 앞모습, 투명 배경) 이미지 주소. 모델을 아직 못 불러왔으면 null.
   * @param {Hero} hero
   * @returns {string|null} data URL
   */
  A.heroPortrait = function (hero) {
    if (cache.has(hero.id)) return cache.get(hero.id);
    if (!A.Assets3D.heroReady()) return null;
    const { r, scene, cam } = studio();
    const h = new A.Hero3D(hero);
    h.root.rotation.y = 0.25;
    h.update(0.4);
    scene.add(h.root);
    r.render(scene, cam);
    const url = r.domElement.toDataURL('image/png');
    h.dispose();
    cache.set(hero.id, url);
    return url;
  };

  A.HeroShowcase = HeroShowcase;
})(window.ARAH);

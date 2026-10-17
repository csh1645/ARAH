/**
 * @file 3D 무대: 모든 놀이의 뒤에 깔리는 Three.js 세상 (노을 하늘 · 3D 도시 · 옥상 · 3D 히어로 · 3D 소품).
 *       규칙과 글자 UI(문제 · 보기 · 버튼 · 점수)는 그대로 Phaser 가 앞에서(투명 캔버스) 그리고,
 *       Phaser 의 게임 오브젝트 위치를 3D 물체가 매 프레임 따라간다 (follow). 그래서 놀이 규칙 코드를 거의 바꾸지 않는다.
 * @layer game
 * @depends THREE (전역), A.GAME, A.THEME, A.util, A.Assets3D, A.Hero3D, A.Toon
 * @see game/round-scene.js (stage3d · drawBackdrop), game/three/props3d.js, doc/decisions/ADR-0009-full-3d.md
 *
 * 좌표: 게임 화면(960 x 640 px)의 점은 z = 0 평면 위 점에 정확히 겹친다 (PX px = 1 단위, 카메라 고정).
 *       z < 0 은 화면 안쪽(도시), z > 0 은 앞쪽. 카메라를 움직이지 않으므로 2D 글자와 3D 물체가 어긋나지 않는다.
 */
(function (A) {
  'use strict';

  const { W, H } = A.GAME;
  const PX = 60; // 게임 좌표 px 를 3D 1 단위로
  const FOV = 40;
  const CAM_Z = H / 2 / PX / Math.tan((FOV / 2) * (Math.PI / 180)); // z=0 평면이 화면을 꼭 채우는 거리
  const HERO_MODEL_H = 2.7; // 블록 캐릭터 키 (모델 단위)
  const HERO_PX_H = 108; // 2D 히어로 그림 높이 (GAME.HERO_SIZE.h) — 3D 히어로도 같은 크기로
  const HERO_TURN = 0.7; // 옆(가는 방향)을 보되 얼굴 · 가슴 무늬가 보이게 (라디안, π/2 = 완전 옆)

  /** 게임 화면 좌표 → z=0 평면 3D 좌표 */
  const toWorld = (x, y) => new THREE.Vector3((x - W / 2) / PX, (H / 2 - y) / PX, 0);

  /** 객체와 하위의 형상 · 재질 · 텍스처를 해제한다 (복제 모델의 공유 재질은 shared=true 로 남긴다) */
  function disposeTree(obj) {
    obj.traverse((o) => {
      if (o.userData.shared) return;
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          if (m.userData && m.userData.shared) return;
          if (m.map && !m.map.userData.shared) m.map.dispose();
          m.dispose();
        });
      }
    });
  }

  /** 모델 복제본 표시 (공유 재질 · 형상이라 해제하지 않게) */
  function markShared(obj) {
    obj.traverse((o) => {
      o.userData.shared = true;
    });
    return obj;
  }

  /**
   * Phaser 캔버스 뒤에 깔리는 Three.js 렌더러 (문 통과 3D 화면과 함께 쓴다).
   * @param {Phaser.Scene} scene
   * @returns {{renderer: THREE.WebGLRenderer, sync: () => void, dispose: () => void}}
   */
  A.createUnderlay = function (scene) {
    const parent = document.getElementById('game');
    const pc = scene.game.canvas;
    const r = new THREE.WebGLRenderer({ antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputEncoding = THREE.sRGBEncoding;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.className = 'three-layer';
    parent.insertBefore(r.domElement, parent.firstChild);
    let w = 0;
    let h = 0;
    return {
      renderer: r,
      /** Phaser 캔버스와 같은 위치 · 크기로 맞춘다 (창 크기 변경 대응) */
      sync() {
        const cw = pc.offsetWidth;
        const ch = pc.offsetHeight;
        if (!cw || !ch) return;
        if (cw !== w || ch !== h) {
          r.setSize(cw, ch, true);
          w = cw;
          h = ch;
        }
        r.domElement.style.left = `${pc.offsetLeft}px`;
        r.domElement.style.top = `${pc.offsetTop}px`;
      },
      dispose() {
        r.dispose();
        r.forceContextLoss();
        r.domElement.remove();
      },
    };
  };
  A.disposeTree3D = disposeTree;

  class Stage3D {
    /**
     * @param {Phaser.Scene} scene 이 무대를 쓰는 판 (RoundScene)
     */
    constructor(scene) {
      this.s = scene;
      this.followers = [];
      this.scrollX = 0;
      this.destroyed = false;
      this.underlay = A.createUnderlay(scene);

      const s3 = new THREE.Scene();
      s3.background = A.Toon.halftoneSky(); // 하늘색 + 망점 (디자인 표준 4절)
      s3.fog = new THREE.Fog(0xcfeaff, 40, 120); // 먼 도시가 하늘색으로 옅어진다 (공기 원근) // 먼 도시가 노을빛으로 흐려진다
      this.scene3 = s3;
      this.camera = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 200);
      this.camera.position.set(0, 0, CAM_Z);
      this.camera.lookAt(0, 0, 0);
      s3.add(new THREE.HemisphereLight(0xd8ecff, 0x6b5d50, 0.55)); // 하늘빛 + 땅 반사광
      const sun = new THREE.DirectionalLight(0xfff1d6, 0.85);
      sun.position.set(-7, 12, 9);
      sun.castShadow = true; // 히어로 · 소품 그림자가 옥상에 진다
      sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 8, bottom: -8, near: 1, far: 40 });
      sun.shadow.bias = -0.0015;
      s3.add(sun);
      this.buildSun();

      this.cityNear = new THREE.Group();
      this.cityFar = new THREE.Group();
      this.roof = new THREE.Group();
      s3.add(this.cityNear, this.cityFar, this.roof);

      // 모델은 메뉴에서 미리 불러 두지만, 아직이면 끝난 뒤 채운다 (그동안 2D 히어로가 보인다)
      A.Assets3D.preloadAll().then(() => {
        if (this.destroyed) return;
        this.buildCity();
        if (this.pendingHero) this.attachHero(this.pendingHero);
        if (this.groundY !== undefined) this.setGround(this.groundY);
      });

      this.onUpdate = (time, delta) => this.update(delta);
      scene.events.on('postupdate', this.onUpdate);
      scene.events.once('shutdown', () => this.destroy());
      scene.events.once('destroy', () => this.destroy());
    }

    // ---------- 배경 ----------

    /** 하늘의 뭉게구름 (흰 공 + 잉크 외곽선) */
    buildSun() {
      // 뭉게구름 (흰 공 여러 개를 뭉친 덩어리) — 천천히 흐른다
      this.clouds = new THREE.Group();
      const white = A.Toon.material({ color: 0xffffff, fog: false });
      for (let i = 0; i < 7; i++) {
        const cl = new THREE.Group();
        for (let k = 0; k < 5; k++) {
          const b = new THREE.Mesh(new THREE.SphereGeometry(A.util.rand(12, 22) / 10, 14, 10), white);
          b.position.set(k * 1.3 - 2.6, Math.sin(k) * 0.4, A.util.rand(-5, 5) / 10);
          A.Toon.outline(b, 0.08);
          cl.add(b);
        }
        cl.position.set(A.util.rand(-40, 40), A.util.rand(6, 14), A.util.rand(-60, -40));
        this.clouds.add(cl);
      }
      this.scene3.add(this.clouds);
    }

    /** 3D 도시 두 줄 (가까운 고층 빌딩 · 먼 낮은 빌딩). 러너는 scroll() 로 흘린다 */
    buildCity() {
      const { rand, pick } = A.util;
      const M = A.Assets3D.MODELS;
      const lay = (group, urls, count, span, z, scale, baseY) => {
        for (let i = 0; i < count; i++) {
          const m = A.Assets3D.clone(pick(urls));
          if (!m) continue;
          markShared(m);
          const k = rand(scale[0] * 100, scale[1] * 100) / 100;
          m.scale.set(k, k * rand(90, 140) / 100, k);
          m.position.set(-span / 2 + (i + 0.5) * (span / count) + rand(-60, 60) / 100, baseY, z + rand(-200, 200) / 100);
          m.rotation.y = pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
          group.add(m);
        }
        group.userData.span = span;
      };
      lay(this.cityNear, M.city, 24, 90, -17, [2.8, 3.9], -14.5); // 가까운 줄: 옥상 뒤로 빽빽한 빌딩숲
      lay(this.cityFar, M.far, 20, 160, -42, [5.5, 8], -19); // 먼 줄: 노을빛으로 흐린 실루엣
    }

    /**
     * 히어로가 서는 옥상 바닥. y 는 게임 화면 좌표(바닥 윗면), null 이면 바닥 없음 (빌딩 스윙처럼 건물 위를 건너다닐 때)
     * @param {number|null} y
     */
    setGround(y) {
      this.groundY = y;
      if (this.roofMesh) {
        this.roof.remove(this.roofMesh);
        disposeTree(this.roofMesh);
        this.roofMesh = null;
      }
      if (y === null || y === undefined) return;
      const top = toWorld(0, y).y;
      const g = new THREE.Group();
      const slab = new THREE.Mesh(new THREE.BoxGeometry(70, 6, 7), A.Toon.material({ color: 0x7d86a8 }));
      slab.position.set(0, top - 3, -2);
      slab.receiveShadow = true;
      const edge = new THREE.Mesh(new THREE.BoxGeometry(70, 0.3, 0.35), A.Toon.material({ color: A.THEME.hex.sun }));
      A.Toon.outline(edge, 0.04);
      edge.position.set(0, top + 0.12, 1.4); // 옥상 앞 난간
      g.add(slab, edge);
      // 옥상 소품 (가로등 · 고깔 · 쓰레기통) — 히어로 뒤쪽에 놓아 가리지 않게
      const P = A.Assets3D.MODELS.props;
      const props = [[P.light, -6.5, 6], [P.cone, -3, 3], [P.dumpster, 4.5, 3.2], [P.light, 7, 6], [P.cone, 1.5, 3]];
      for (const [url, x, k] of props) {
        const m = A.Assets3D.clone(url);
        if (!m) continue;
        markShared(m);
        m.scale.setScalar(k);
        m.position.set(x, top, -3.2);
        m.userData.prop = true;
        g.add(m);
      }
      this.roofMesh = g;
      this.roof.add(g);
    }

    /**
     * 러너처럼 앞으로 달리는 놀이: 화면이 왼쪽으로 흐른다. 먼 것일수록 느리게 (시차)
     * @param {number} dxPx 이번 프레임에 흐른 거리 (게임 px)
     */
    scroll(dxPx) {
      const d = dxPx / PX;
      for (const [group, rate] of [[this.cityNear, 0.45], [this.cityFar, 0.18]]) {
        const span = group.userData.span || 70;
        for (const m of group.children) {
          m.position.x -= d * rate;
          if (m.position.x < -span / 2) m.position.x += span;
        }
      }
      // 옥상 바닥은 길게 이어져 있으니 그대로 두고, 소품만 같은 속도로 흘렸다가 오른쪽에서 다시 나오게 한다
      if (this.roofMesh) {
        for (const m of this.roofMesh.children) {
          if (!m.userData.prop) continue;
          m.position.x -= d;
          if (m.position.x < -12) m.position.x += 24;
        }
      }
    }

    // ---------- 히어로 · 따라가는 물체 ----------

    /**
     * 2D 히어로 대신 3D 히어로를 세운다. 2D 그림은 숨기고(위치 · 크기 · 각도는 그대로 규칙이 쓴다) 3D 가 따라간다.
     * @param {Phaser.GameObjects.Image} player
     */
    attachHero(player) {
      if (!A.Assets3D.heroReady()) {
        this.pendingHero = player; // 모델을 다 불러오면 붙인다
        return;
      }
      this.pendingHero = null;
      this.hero3d = new A.Hero3D(this.s.hero);
      this.scene3.add(this.hero3d.root);
      this.player = player;
      player.setVisible(false);
    }

    /**
     * 2D 게임 오브젝트를 3D 물체가 따라가게 한다. 2D 쪽이 사라지면(destroy) 3D 도 지운다.
     * @param {Phaser.GameObjects.GameObject} obj 위치 · 크기 · 각도 · 투명도의 기준
     * @param {THREE.Object3D} mesh
     * @param {{dx?: number, dy?: number, z?: number, scale?: number, spin?: number, fade?: boolean, onUpdate?: Function}} [opts]
     *        fade: 2D 투명도를 3D 재질에 적용 (소품 전용 재질일 때만 — 공유 모델에 쓰면 다른 물체까지 흐려진다)
     * @returns {THREE.Object3D} mesh
     */
    follow(obj, mesh, opts = {}) {
      this.scene3.add(mesh);
      this.followers.push({ obj, mesh, opts, base: mesh.scale.clone() });
      this.syncFollower(this.followers[this.followers.length - 1], 0);
      return mesh;
    }

    syncFollower(f, dt) {
      const { obj, mesh, opts } = f;
      const p = toWorld(obj.x + (opts.dx || 0), obj.y + (opts.dy || 0));
      mesh.position.set(p.x, p.y, opts.z || 0);
      const k = (opts.scale || 1) * Math.abs(obj.scaleX === undefined ? 1 : obj.scaleX);
      mesh.scale.set(f.base.x * k, f.base.y * k, f.base.z * k);
      mesh.rotation.z = -(obj.rotation || 0);
      mesh.visible = obj.visible !== false && (obj.alpha === undefined || obj.alpha > 0.03);
      if (opts.fade && mesh.userData.alpha !== obj.alpha) { // 2D 투명도를 3D 재질에도 (자기 재질을 가진 소품만)
        mesh.userData.alpha = obj.alpha;
        mesh.traverse((o) => {
          if (!o.material) return;
          o.material.transparent = obj.alpha < 0.99;
          o.material.opacity = obj.alpha;
        });
      }
      if (opts.spin) mesh.rotation.y += opts.spin * dt;
      if (mesh.userData.spin) mesh.userData.spin(dt); // 소품 자체 움직임 (프로펠러 · 포털)
      if (opts.onUpdate) opts.onUpdate(mesh, obj, dt);
    }

    syncHero(dt) {
      const p = this.player;
      const h = this.hero3d;
      if (!p || !h) return;
      const k = Math.abs(p.scaleY) || 1;
      const feet = toWorld(p.x, p.y + (HERO_PX_H / 2) * k);
      h.root.position.set(feet.x, feet.y, 0.3);
      h.root.scale.setScalar(((HERO_PX_H * k) / PX / HERO_MODEL_H) * (p.scaleX / (p.scaleY || 1)));
      h.root.rotation.set(0, p.flipX ? -HERO_TURN : HERO_TURN, -(p.rotation || 0));
      h.root.visible = p.alpha > 0.03;
      // 2D 애니메이션 상태(round-scene heroAnim)를 3D 동작으로
      const a = this.s.heroAnim;
      if (a) {
        let pose = a.current;
        if (!a.pose && a.base === 'win') pose = 'win';
        if (!a.pose && a.base === 'hurt') pose = 'lose';
        h.setPose(pose);
      }
      h.update(dt);
    }

    /** 매 프레임 (Phaser postupdate): 따라가기 → 그리기 */
    update(deltaMs) {
      if (this.destroyed) return;
      const dt = Math.min(deltaMs, 50) / 1000;
      this.underlay.sync();
      this.followers = this.followers.filter((f) => {
        if (!f.obj.active) {
          this.scene3.remove(f.mesh);
          disposeTree(f.mesh);
          return false;
        }
        this.syncFollower(f, dt);
        return true;
      });
      this.syncHero(dt);
      if (this.clouds) {
        for (const cl of this.clouds.children) {
          cl.position.x += dt * 0.6;
          if (cl.position.x > 45) cl.position.x = -45;
        }
      }
      this.underlay.renderer.render(this.scene3, this.camera);
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this.s.events.off('postupdate', this.onUpdate);
      if (this.hero3d) this.hero3d.dispose();
      disposeTree(this.scene3);
      this.underlay.dispose();
    }
  }

  /** 이 기기에서 3D 무대를 쓸 수 있는지 (WebGL). 안 되면 예전 2D 화면 */
  Stage3D.supported = () => A.Assets3D.supported();
  Stage3D.toWorld = toWorld;
  Stage3D.PX = PX;

  A.Stage3D = Stage3D;
})(window.ARAH);

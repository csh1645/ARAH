/**
 * @file 놀이별 3D 소품 만들기: 드론 · 나무 상자 · 코인 · 보스 로봇 · 빌딩 스윙 건물 · 포털.
 *       크기 인자는 게임 화면 px (Stage3D.PX 로 나눠 3D 단위로). 모두 원점이 물체 가운데 (건물만 옥상 가운데).
 *       외부 모델이 필요 없는 것은 기본 도형으로 만들어 가볍게, 건물은 Kenney 도시 모델을 쓴다.
 * @layer game
 * @depends THREE (전역), A.Stage3D, A.Assets3D, A.Toon, A.util
 * @see game/three/stage3d.js (follow), game/modes/*
 */
(function (A) {
  'use strict';

  const px = (v) => v / A.Stage3D.PX;
  /** 만화 음영 재질 + (원하면) 잉크 외곽선 — 디자인 표준 4절 */
  const lambert = (color, extra = {}) => A.Toon.material({ color, ...extra });
  const inked = (mesh, w = 0.03) => {
    A.Toon.outline(mesh, w);
    return mesh;
  };
  const glow = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity });

  A.Props3D = {
    /**
     * 보기 드론 (드론 잡기): 둥근 몸통 · 프로펠러 4개 · 빨간 눈 · 보라 테두리. 글자는 2D 가 위에 그린다.
     * @param {number} w 2D 드론 너비 px
     * @param {number} h 2D 드론 높이 px
     */
    drone(w, h) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(px(w), px(h), px(46)), lambert(0x2b2d42));
      const rim = new THREE.Mesh(new THREE.BoxGeometry(px(w) + 0.08, px(h) * 0.25, px(48)), lambert(0x9d4edd));
      rim.position.y = -px(h) * 0.38;
      g.add(inked(body), rim);
      const rotors = [];
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6), lambert(0x8d99ae));
          arm.position.set(sx * (px(w) / 2 - 0.35), px(h) / 2 + 0.15, sz * 0.3);
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.12), lambert(0xc0c8d8));
          blade.position.set(arm.position.x, px(h) / 2 + 0.33, arm.position.z);
          g.add(arm, blade);
          rotors.push(blade);
        }
      }
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), glow(0xff3355));
      eye.position.set(0, -px(h) / 2 - 0.05, px(24));
      g.add(eye);
      g.userData.spin = (dt) => rotors.forEach((r, i) => { r.rotation.y += dt * (i % 2 ? 30 : -30); });
      return g;
    },

    /** 나무 상자 (히어로 러너 장애물) @param {number} size px */
    crate(size) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const c = cv.getContext('2d');
      c.fillStyle = '#b5651d';
      c.fillRect(0, 0, 64, 64);
      c.strokeStyle = '#7a3e0f';
      c.lineWidth = 6;
      c.strokeRect(3, 3, 58, 58);
      c.beginPath(); c.moveTo(6, 6); c.lineTo(58, 58); c.moveTo(58, 6); c.lineTo(6, 58); c.stroke();
      const tex = new THREE.CanvasTexture(cv);
      tex.encoding = THREE.sRGBEncoding;
      return inked(new THREE.Mesh(new THREE.BoxGeometry(px(size), px(size), px(size)), lambert(0xffffff, { map: tex })));
    },

    /** 금화 (히어로 러너) — 빙글빙글 도는 원판 */
    coin() {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(px(14), px(14), 0.07, 20), lambert(0xffd166, { emissive: 0x6b4a00 }));
      m.rotation.x = Math.PI / 2;
      const g = new THREE.Group();
      g.add(m);
      return g;
    },

    /** 차원 포털 (드론 잡기 위쪽): 겹친 빛나는 고리 */
    portal() {
      const g = new THREE.Group();
      [[0x7b2ff7, 1.9], [0x00d4ff, 1.4], [0xff4fd8, 0.9]].forEach(([c, r]) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07, 8, 48), glow(c, 0.85));
        ring.scale.y = 0.25;
        g.add(ring);
      });
      g.userData.spin = (dt) => { g.rotation.y += dt * 0.8; };
      return g;
    },

    /**
     * 보스 로봇 (보스 배틀): 2D 보스와 같은 색 · 같은 모양(뿔 · 집게 팔 · 눈 · 입 그릴)
     * @param {{body: number, plate: number, eye: number, horn: number}} b
     */
    boss(b) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(px(230), px(190), px(150)), lambert(b.body));
      body.position.y = -px(5);
      const face = new THREE.Mesh(new THREE.BoxGeometry(px(170), px(70), 0.1), lambert(b.plate));
      face.position.set(0, px(25), px(76));
      g.add(inked(body, 0.05), face);
      for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(px(16), 16, 12), glow(b.eye));
        eye.position.set(sx * px(40), px(25), px(80));
        const horn = new THREE.Mesh(new THREE.ConeGeometry(px(26), px(80), 6), lambert(b.horn));
        horn.position.set(sx * px(72), px(125), 0);
        horn.rotation.z = -sx * 0.35;
        const arm = new THREE.Mesh(new THREE.BoxGeometry(px(70), px(32), px(40)), lambert(b.body));
        arm.position.set(sx * px(145), -px(5), 0);
        const claw = new THREE.Mesh(new THREE.SphereGeometry(px(24), 12, 10), lambert(b.plate));
        claw.position.set(sx * px(185), -px(5), 0);
        g.add(eye, horn, arm, claw);
      }
      const grill = new THREE.Mesh(new THREE.BoxGeometry(px(110), px(30), 0.1), lambert(0x0b0b14, { emissive: b.eye, emissiveIntensity: 0.25 }));
      grill.position.set(0, -px(45), px(76));
      g.add(grill);
      g.userData.eyes = g.children.filter((o) => o.material && o.material.color && o.material.color.getHex() === new THREE.Color(b.eye).getHex());
      return g;
    },

    /**
     * 빌딩 스윙의 건물: 옥상이 (0, 0) 에 오도록 Kenney 고층 빌딩을 늘려 세운다 (아래로 화면 밖까지)
     * @param {number} wPx 건물 너비 px
     * @param {number} hPx 옥상부터 화면 아래까지 높이 px
     */
    building(wPx, hPx) {
      const { pick } = A.util;
      const g = new THREE.Group();
      const m = A.Assets3D.clone(pick(A.Assets3D.MODELS.city.slice(0, 5)));
      if (m) {
        m.traverse((o) => { o.userData.shared = true; });
        const box = new THREE.Box3().setFromObject(m);
        const size = box.getSize(new THREE.Vector3());
        const sx = px(wPx) / size.x;
        const sy = (px(hPx) + 3) / size.y;
        m.scale.set(sx, sy, sx);
        m.position.set(-box.min.x * sx - px(wPx) / 2, -size.y * sy, -size.z * sx / 2 - 0.4);
        g.add(m);
      } else {
        const b = new THREE.Mesh(new THREE.BoxGeometry(px(wPx), px(hPx) + 3, px(wPx)), lambert(0x2c3263));
        b.position.y = -(px(hPx) + 3) / 2;
        g.add(b);
      }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(px(wPx) + 0.15, 0.12, px(wPx) * 0.9), lambert(0x6b74c9));
      rail.position.y = 0.06;
      g.add(rail);
      return g;
    },
  };
})(window.ARAH);

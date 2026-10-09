/**
 * @file 🌆 문 통과 모드의 3D 화면 (Three.js). 도시 위 하늘 다리를 달리는 3인칭 시점.
 *       규칙 · 판정은 modes/gate-mode.js 가 그대로 담당하고, 이 파일은 그리기만 한다.
 * @layer game
 * @depends THREE (Three.js r149, 전역), A.GAME, A.util, A.drawHero
 * @see web/src/game/modes/gate-mode.js (GateView typedef), doc/decisions/ADR-0005-threejs-3d.md
 *
 * 화면 구성: Three.js 캔버스(뒤) + Phaser 캔버스(앞, 투명). 문제 · 하트 · 점수 HUD 와 파티클 등
 * 2D 연출은 Phaser 가 그 위에 겹쳐 그린다. 두 캔버스는 syncSize() 로 위치 · 크기를 맞춘다.
 *
 * 좌표 (Three.js 단위, 약 1m): x 오른쪽, y 위, z 카메라 쪽(+). 히어로는 z=0 에 있고,
 * 문은 FAR_Z(멀리) → ARRIVE_Z(히어로 바로 앞)로 다가온다. 도시 건물은 계속 뒤로 흘려 달리는 느낌을 준다.
 */
(function (A) {
  'use strict';

  if (!A.RoundScene || typeof THREE === 'undefined') return;

  const { W, H } = A.GAME;

  // ----- 배치 -----
  const LANE_GAP = 2.6; // 줄 간격
  const DOOR_W = 2.0;
  const DOOR_H = 2.6;
  const FAR_Z = -28; // 문이 처음 나타나는 거리 (더 멀면 보기 글자가 작아 읽기 어렵다)
  const ARRIVE_Z = -0.9; // 문이 도착하는 위치 (히어로 바로 앞)
  const HERO_Y = 0.9; // 히어로 스프라이트 중심 높이
  const GROUND_Y = -35; // 다리 아래 땅 높이 (떨어지는 느낌을 위해 아주 낮게)
  const ROAD_LEN = 170;
  const ROAD_NEAR_Z = 20; // 도로 앞끝 (카메라 뒤까지 이어져야 화면 아래가 끊기지 않는다)
  const CITY_COUNT = 46;
  const CITY_SPAN = 170; // 건물을 재활용하는 구간 길이
  const RUN_SPEED = 14; // 배경이 흐르는 속도 (단위/초). 대시 때는 배수

  // ----- 카메라 -----
  const CAM_POS = { x: 0, y: 3.3, z: 6.8 };
  const CAM_LOOK = { x: 0, y: 1.1, z: -12 };
  const FOV = 60;
  const FOV_DASH = 76; // 대시 때 시야를 넓혀 속도감을 준다

  // ----- 연출 -----
  const FALL_MS = 450;
  const RESCUE_MS = 600;
  const FONT_EMOJI = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  const FONT_TEXT = '"Jua", "Malgun Gothic", sans-serif';

  /** 2D 캔버스에 그린 그림을 Three.js 텍스처로 만든다. */
  function canvasTexture(w, h, draw) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    draw(cv.getContext('2d'), w, h);
    return new THREE.CanvasTexture(cv);
  }

  /** 객체와 그 하위의 형상 · 재질 · 텍스처를 GPU 메모리에서 해제한다. */
  function disposeTree(obj) {
    obj.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          if (m.map) m.map.dispose();
          if (m.emissiveMap && m.emissiveMap !== m.map) m.emissiveMap.dispose();
          m.dispose();
        });
      }
    });
  }

  /** @implements {GateView} */
  class GateView3D {
    /**
     * @param {Phaser.Scene} scene 문 통과 장면
     * @param {number} laneCount 줄 수
     */
    constructor(scene, laneCount) {
      this.s = scene;
      this.n = laneCount;
      this.shards = []; // 깨진 유리 조각 { mesh, vel, life }
      this.city = [];
      this.heroTargetX = 0;
      this.laneMs = 140;
      this.shake = 0;
      this.destroyed = false;
      this.camBase = { ...CAM_POS };
    }

    laneX(i) {
      return (i - (this.n - 1) / 2) * LANE_GAP;
    }

    // ---------- 만들기 ----------

    build(startLane) {
      const parent = document.getElementById('game');
      this.phaserCanvas = this.s.game.canvas;
      const r = new THREE.WebGLRenderer({ antialias: true });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      r.domElement.className = 'three-layer';
      parent.insertBefore(r.domElement, parent.firstChild);
      this.renderer = r;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x150d36);
      scene.fog = new THREE.Fog(0x2a1650, 30, 95); // 먼 곳이 보랏빛으로 흐려져 깊이감이 생긴다
      this.scene3 = scene;

      this.camera = new THREE.PerspectiveCamera(FOV, W / H, 0.1, 300);
      this.camera.position.set(CAM_POS.x, CAM_POS.y, CAM_POS.z);
      this.camera.lookAt(CAM_LOOK.x, CAM_LOOK.y, CAM_LOOK.z);

      scene.add(new THREE.HemisphereLight(0xa8c0ff, 0x1a0f33, 0.95));
      const sun = new THREE.DirectionalLight(0xffffff, 0.55);
      sun.position.set(4, 10, 6);
      scene.add(sun);

      this.buildSky();
      this.buildBridge();
      this.buildCity();
      this.buildHero(startLane);
      this.syncSize();
    }

    buildSky() {
      const { rand } = A.util;
      const pos = [];
      for (let i = 0; i < 500; i++) {
        const a = Math.random() * Math.PI * 2;
        pos.push(Math.cos(a) * rand(120, 180), rand(8, 110), -Math.abs(Math.sin(a)) * rand(120, 180));
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      this.stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, fog: false }));
      this.scene3.add(this.stars);

      const moon = new THREE.Mesh(
        new THREE.SphereGeometry(7, 24, 16),
        new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false }),
      );
      moon.position.set(45, 48, -160);
      this.scene3.add(moon);
    }

    /** 하늘 다리: 도로 상판, 줄 사이 점선(흐르는 텍스처), 양옆 네온 난간. */
    buildBridge() {
      const width = this.n * LANE_GAP + 1.2;
      const zMid = ROAD_NEAR_Z - ROAD_LEN / 2;
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.5, ROAD_LEN),
        new THREE.MeshStandardMaterial({ color: 0x1c2048, roughness: 0.85 }),
      );
      deck.position.set(0, -0.25, zMid);
      this.scene3.add(deck);

      this.stripeTex = canvasTexture(16, 256, (ctx) => {
        ctx.fillStyle = 'rgba(200, 210, 230, 0.8)';
        ctx.fillRect(0, 0, 16, 128);
      });
      this.stripeTex.wrapS = THREE.RepeatWrapping;
      this.stripeTex.wrapT = THREE.RepeatWrapping;
      this.stripeTex.repeat.set(1, ROAD_LEN / 6);
      const stripeMat = new THREE.MeshBasicMaterial({ map: this.stripeTex, transparent: true });
      for (let i = 0; i < this.n - 1; i++) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.14, ROAD_LEN), stripeMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(this.laneX(i) + LANE_GAP / 2, 0.01, zMid);
        this.scene3.add(stripe);
      }

      const railMat = new THREE.MeshStandardMaterial({ color: 0x2a7ab0, emissive: 0x4cc9f0, emissiveIntensity: 0.45 });
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, ROAD_LEN), railMat);
        rail.position.set((side * width) / 2, 0.11, zMid);
        this.scene3.add(rail);
      }
    }

    /** 다리 양옆 아래로 펼쳐진 도시. 창문 텍스처가 스스로 빛나(emissive) 밤 도시처럼 보인다. */
    buildCity() {
      const { rand, pick } = A.util;
      const winTex = canvasTexture(64, 128, (ctx, w, h) => {
        ctx.fillStyle = '#1a1f45';
        ctx.fillRect(0, 0, w, h);
        for (let y = 6; y < h - 6; y += 12) {
          for (let x = 5; x < w - 5; x += 11) {
            if (Math.random() < 0.4) {
              ctx.fillStyle = Math.random() < 0.8 ? '#ffd166' : '#9be7ff';
              ctx.fillRect(x, y, 6, 7);
            }
          }
        }
      });
      winTex.wrapS = THREE.RepeatWrapping;
      winTex.wrapT = THREE.RepeatWrapping;
      winTex.repeat.set(1, 3);
      const colors = [0x2a2f63, 0x23284f, 0x2d2350, 0x1f3350];
      const half = (this.n * LANE_GAP) / 2;

      for (let i = 0; i < CITY_COUNT; i++) {
        const w = rand(4, 9);
        const h = rand(14, 42);
        const mat = new THREE.MeshStandardMaterial({
          color: pick(colors), map: winTex, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.4,
        });
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, rand(4, 9)), mat);
        const side = i % 2 === 0 ? -1 : 1;
        b.position.set(side * (half + 3 + rand(0, 14) + w / 2), GROUND_Y + h / 2, rand(-CITY_SPAN + 20, 20));
        this.scene3.add(b);
        this.city.push(b);
      }

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(500, 500),
        new THREE.MeshStandardMaterial({ color: 0x0a0820 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = GROUND_Y;
      this.scene3.add(ground);
    }

    /** 히어로는 뒷모습 그림을 스프라이트(항상 카메라를 보는 판)로 세운다. */
    buildHero(startLane) {
      const tex = canvasTexture(192, 216, (ctx, w, h) => A.drawHero(ctx, this.s.hero, w, h, { back: true }));
      this.hero = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      this.hero.scale.set(1.45, 1.63, 1);
      this.heroTargetX = this.laneX(startLane);
      this.hero.position.set(this.heroTargetX, HERO_Y, 0);
      this.scene3.add(this.hero);

      this.shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.45, 24),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }),
      );
      this.shadow.rotation.x = -Math.PI / 2;
      this.shadow.position.set(this.heroTargetX, 0.02, 0);
      this.scene3.add(this.shadow);

      // 복귀할 때 위로 쏘는 거미줄
      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      this.webLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff }));
      this.webLine.visible = false;
      this.scene3.add(this.webLine);
    }

    // ---------- 문 ----------

    createDoors(doors, picture) {
      for (const d of doors) d.v = this.makeDoor(d, picture);
    }

    makeDoor(d, picture) {
      const g = new THREE.Group();
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x3b4170, emissive: 0x1a1d44 });
      const postGeo = new THREE.BoxGeometry(0.16, DOOR_H + 0.1, 0.22);
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(postGeo, frameMat);
        post.position.set(side * (DOOR_W / 2 + 0.08), DOOR_H / 2, 0);
        g.add(post);
      }
      const top = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + 0.32, 0.16, 0.22), frameMat);
      top.position.set(0, DOOR_H + 0.08, 0);
      g.add(top);

      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x4cc9f0, emissive: 0x0c4a6e, transparent: true, opacity: 0.38, side: THREE.DoubleSide,
      });
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, DOOR_H), glassMat);
      glass.position.set(0, DOOR_H / 2, 0);
      g.add(glass);

      const label = d.label;
      const labelTex = canvasTexture(256, 256, (ctx, w, h) => {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (picture) {
          ctx.font = `170px ${FONT_EMOJI}`;
          ctx.fillText(label, w / 2, h / 2 + 10);
        } else {
          const size = label.length <= 2 ? 150 : label.length === 3 ? 112 : 78;
          ctx.font = `${size}px ${FONT_TEXT}`;
          ctx.lineWidth = 14;
          ctx.strokeStyle = '#000000';
          ctx.strokeText(label, w / 2, h / 2 + 6);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(label, w / 2, h / 2 + 6);
        }
      });
      const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
      const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.55), labelMat);
      labelMesh.position.set(0, DOOR_H / 2, 0.03);
      g.add(labelMesh);

      // 지금 달려가는 줄 표시 (금색 테두리)
      const hl = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(DOOR_W + 0.55, DOOR_H + 0.4, 0.3)),
        new THREE.LineBasicMaterial({ color: 0xffd166 }),
      );
      hl.position.set(0, DOOR_H / 2 + 0.1, 0);
      g.add(hl);

      // 막힌 문 (판자 X)
      const board = new THREE.Group();
      const plankMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
      for (const rot of [0.85, -0.85]) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W * 1.3, 0.26, 0.1), plankMat);
        plank.rotation.z = rot;
        board.add(plank);
      }
      board.position.set(0, DOOR_H / 2, 0.1);
      board.visible = false;
      g.add(board);

      g.position.set(this.laneX(d.lane), 0, FAR_Z);
      this.scene3.add(g);
      return { group: g, glassMat, labelMat, hl, board };
    }

    clearDoors(doors) {
      // 통과한 문들은 카메라 뒤로 지나가며 사라진다
      for (const d of doors) {
        const g = d.v.group;
        this.s.tweens.add({
          targets: g.position, z: g.position.z + 7, duration: 300,
          onComplete: () => {
            if (this.destroyed) return;
            this.scene3.remove(g);
            disposeTree(g);
          },
        });
      }
    }

    blockDoor(d) {
      d.v.board.visible = true;
      d.v.glassMat.opacity = 0.12;
      d.v.labelMat.opacity = 0.35;
      d.v.hl.visible = false;
    }

    /** 다가온 정도(p)에 맞춰 문을 앞으로 옮긴다. 진짜 원근이라 가까워질수록 저절로 빨라 보인다. */
    layout(doors, p, lane) {
      const z = FAR_Z + (ARRIVE_Z - FAR_Z) * p;
      for (const d of doors) {
        d.v.group.position.z = z;
        d.v.hl.visible = d.lane === lane && !d.used;
      }
    }

    moveHeroToLane(lane, ms) {
      this.heroTargetX = this.laneX(lane);
      this.laneMs = ms;
    }

    // ---------- 화면 좌표 변환 (터치 판정 · 2D 연출 위치) ----------

    /** 3D 좌표를 게임 화면 좌표(960 x 640)로 바꾼다. */
    project(x, y, z) {
      const v = new THREE.Vector3(x, y, z).project(this.camera);
      return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
    }

    doorAt(doors, x, y) {
      return doors.find((d) => {
        const p = d.v.group.position;
        const bl = this.project(p.x - DOOR_W / 2, 0, p.z);
        const tr = this.project(p.x + DOOR_W / 2, DOOR_H, p.z);
        return x >= bl.x - 12 && x <= tr.x + 12 && y >= tr.y - 12 && y <= bl.y + 12;
      }) || null;
    }

    heroScreenX() {
      return this.project(this.hero.position.x, this.hero.position.y, 0).x;
    }

    doorScreenPos(d) {
      const p = d.v.group.position;
      return this.project(p.x, DOOR_H / 2, p.z);
    }

    // ---------- 판정 연출 ----------

    markPass(d) {
      d.v.glassMat.color.set(0x06d6a0);
      d.v.glassMat.emissive.set(0x06d6a0);
    }

    markWrong(d) {
      d.v.labelMat.color.set(0xff6b6b);
    }

    /** 유리 조각이 3D 공간으로 튀고, 히어로는 다리 아래로 떨어졌다가 거미줄로 올라온다. */
    crash(d, onFallen, onDone) {
      const { rand } = A.util;
      const p = d.v.group.position;
      const geo = new THREE.TetrahedronGeometry(0.14);
      for (let i = 0; i < 18; i++) {
        const mat = new THREE.MeshStandardMaterial({ color: 0x9be7ff, emissive: 0x2a7ab0, transparent: true, opacity: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(p.x + rand(-80, 80) / 100, rand(30, 230) / 100, p.z + 0.1);
        this.scene3.add(mesh);
        this.shards.push({
          mesh,
          vel: new THREE.Vector3(rand(-30, 30) / 10, rand(10, 45) / 10, rand(10, 50) / 10),
          life: 1,
        });
      }
      d.v.glassMat.opacity = 0.05;
      this.shake = 0.35;

      const s = this.s;
      s.tweens.add({
        targets: this.hero.position, y: -7, duration: FALL_MS, ease: 'Quad.In',
        onComplete: () => {
          onFallen();
          s.tweens.add({ targets: this.hero.position, y: HERO_Y, duration: RESCUE_MS, ease: 'Back.Out', onComplete: onDone });
        },
      });
      s.tweens.add({ targets: this.hero.material, rotation: 1.4, duration: FALL_MS, yoyo: true, hold: 0 });
    }

    // ---------- 매 프레임 ----------

    /** Phaser 캔버스와 같은 위치 · 크기로 3D 캔버스를 맞춘다 (창 크기 변경 대응). */
    syncSize() {
      const pc = this.phaserCanvas;
      const w = pc.offsetWidth;
      const h = pc.offsetHeight;
      if (!w || !h) return;
      if (w !== this.w || h !== this.h) {
        this.renderer.setSize(w, h, true);
        this.w = w;
        this.h = h;
      }
      const st = this.renderer.domElement.style;
      st.left = `${pc.offsetLeft}px`;
      st.top = `${pc.offsetTop}px`;
    }

    update(time, delta, st) {
      if (this.destroyed) return;
      this.syncSize();
      const dt = Math.min(delta, 50) / 1000;

      // 히어로 줄 이동 (부드럽게 따라감)
      const k = 1 - Math.exp(-delta / (this.laneMs / 2.5));
      this.hero.position.x += (this.heroTargetX - this.hero.position.x) * k;
      this.shadow.position.x = this.hero.position.x;
      this.shadow.visible = this.hero.position.y > 0;

      if (!st.busy) {
        this.hero.position.y = HERO_Y + Math.abs(Math.sin(time / 90)) * 0.12; // 달리는 들썩임
        const move = RUN_SPEED * st.speed * dt;
        this.stripeTex.offset.y += move / 6;
        for (const b of this.city) {
          b.position.z += move;
          if (b.position.z > 25) b.position.z -= CITY_SPAN;
        }
      }

      // 카메라: 히어로를 살짝 따라가고, 대시 때 시야가 넓어지며, 떨어지면 내려다본다
      const cam = this.camera;
      this.camBase.x += (this.hero.position.x * 0.55 - this.camBase.x) * 0.08;
      const fall = Math.min(0, this.hero.position.y - HERO_Y);
      const targetFov = st.dash && !st.busy ? FOV_DASH : FOV;
      cam.fov += (targetFov - cam.fov) * 0.12;
      cam.updateProjectionMatrix();
      let sx = 0;
      let sy = 0;
      if (this.shake > 0) {
        sx = (Math.random() - 0.5) * this.shake;
        sy = (Math.random() - 0.5) * this.shake;
        this.shake = Math.max(0, this.shake - dt * 1.2);
      }
      cam.position.set(this.camBase.x + sx, CAM_POS.y + fall * 0.35 + sy, CAM_POS.z);
      cam.lookAt(this.camBase.x * 0.5, CAM_LOOK.y + fall * 0.6, CAM_LOOK.z);

      // 유리 조각: 중력 + 회전 + 서서히 사라짐
      for (const sh of this.shards) {
        sh.vel.y -= 9.8 * dt;
        sh.mesh.position.addScaledVector(sh.vel, dt);
        sh.mesh.rotation.x += 6 * dt;
        sh.mesh.rotation.y += 4 * dt;
        sh.life -= dt * 0.8;
        sh.mesh.material.opacity = Math.max(0, sh.life);
      }
      this.shards = this.shards.filter((sh) => {
        if (sh.life > 0) return true;
        this.scene3.remove(sh.mesh);
        sh.mesh.material.dispose();
        return false;
      });

      // 복귀 거미줄
      this.webLine.visible = !!st.rescuing;
      if (st.rescuing) {
        const h = this.hero.position;
        const attr = this.webLine.geometry.attributes.position;
        attr.setXYZ(0, h.x + 0.3, h.y + 0.5, h.z);
        attr.setXYZ(1, h.x + 0.3, 14, h.z - 4);
        attr.needsUpdate = true;
      }

      this.stars.rotation.y += dt * 0.004; // 하늘이 아주 천천히 돈다
      this.renderer.render(this.scene3, cam);
    }

    /** 장면이 끝나면 GPU 자원을 해제하고 3D 캔버스를 지운다. 여러 번 불려도 한 번만 처리한다. */
    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      disposeTree(this.scene3);
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
    }
  }

  A.GateView3D = GateView3D;
})(window.ARAH);

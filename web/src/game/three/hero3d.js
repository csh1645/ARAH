/**
 * @file 3D 히어로: 사람형 몸(Quaternius, CC0) + 히어로별 슈트(hero-suit.js) + 머리 모양 + 팀 장비 + 게임용 동작.
 *       게임 규칙은 그대로 2D 자세 이름(idle · run1 · attack · jump · hurt · win …)을 쓰고, 이 파일이 3D 동작으로 바꾼다.
 * @layer game
 * @depends THREE (전역), A.Assets3D, A.HeroSuit, A.Toon
 * @see game/round-scene.js (heroAnim), game/three/stage3d.js, tools/models/build-heroes.mjs, doc/decisions/ADR-0009-full-3d.md
 *
 * 크기 기준: 바깥에서 보는 키 = 2.7 (발 = 원점, 앞 = +z) — 예전 블록 캐릭터와 같아서 무대 · 문 통과 화면은 그대로 쓴다.
 * 몸 안쪽은 미터 단위(키 약 1.8m)라 장비도 미터로 만든다.
 */
(function (A) {
  'use strict';

  const FADE = 0.18; // 동작 바꿀 때 섞는 시간 (초)
  const HEIGHT = 2.7; // 바깥 기준 키
  const BODY_M = 1.81; // 남자 몸 키 (m) — 여자 몸도 같은 배율이라 조금 작다

  /** 2D 자세 · 바탕 동작 → 동작 이름 (tools/models/build-heroes.mjs 의 KEEP_CLIPS) */
  const CLIPS = {
    idle: 'Idle_Loop', breath: 'Idle_Loop', run1: 'Sprint_Loop', run2: 'Sprint_Loop', run: 'Sprint_Loop',
    attack: 'Spell_Simple_Shoot', jump: 'Jump_Loop', hurt: 'Hit_Chest', win: 'Dance_Loop', lose: 'Hit_Chest',
  };
  /** 팀별 공격 동작 (근접 팀은 주먹) */
  const ATTACK_BY_FAMILY = { thunder: 'Sword_Attack', archer: 'Pistol_Shoot', giant: 'Punch_Cross', panther: 'Punch_Jab' };
  /** 한 번만 하고 멈추는 동작 → 재생 속도 (게임의 짧은 자세에 맞춰 빠르게) */
  const ONCE = { Spell_Simple_Shoot: 1.7, Punch_Cross: 1.6, Punch_Jab: 1.5, Sword_Attack: 1.6, Pistol_Shoot: 1.5, Hit_Chest: 1.3 };
  const OUTLINE_M = 0.011; // 잉크 외곽선 두께 (m)

  /**
   * 2등신 귀여운 히어로 비율 (머리 : 몸 = 1 : 1, 사용자 결정 2026-10-17): 뼈 크기만 바꾼다 (동작 파일은 회전만 있어 유지된다).
   * 부모 뼈 크기는 자식에게 곱해진다 — 몸통 0.6 이 팔 · 머리에도 들어가므로 머리 4.4 = 실제 약 2.6배.
   * 균일 배율만 쓴다 (한 축만 줄이면 회전된 자식 뼈가 비틀려 보인다). 통통한 느낌은 bodyWide 로 몸 전체 폭을 넓힌다.
   * 얼굴은 셰이더가 만화 얼굴로 그린다 (hero-suit.js cartoonFace).
   */
  const HERO_BUILD = {
    spine_01: 0.6,                    // 짧은 몸통 (위쪽 전부에 곱해짐)
    Head: 4.4,                        // 큰 머리 (실제 약 2.6배)
    upperarm_l: 1.15, upperarm_r: 1.15,
    hand_l: 1.6, hand_r: 1.6,         // 동글동글 큰 손
    thigh_l: 0.38, thigh_r: 0.38,     // 짧은 다리
    foot_l: 2.7, foot_r: 2.7,         // 큼직한 부츠 (실제 약 1.0배)
  };
  /** 2등신 몸 전체 폭 배율 (작아진 몸통을 통통하게) */
  const BODY_WIDE = 1.18;

  /** 장비 재질: 만화 음영 (디자인 표준 4절) */
  const mat = (color, extra = {}) => A.Toon.material({ color, ...extra });
  const V = () => new THREE.Vector3();

  /** 줄무늬 원판 텍스처 (방패) */
  function shieldTexture(L) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const c = cv.getContext('2d');
    [[64, L.accent], [50, L.line], [36, L.accent], [24, L.suit]].forEach(([r, col]) => {
      c.fillStyle = col;
      c.beginPath();
      c.arc(64, 64, r, 0, Math.PI * 2);
      c.fill();
    });
    c.fillStyle = L.emblem;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? 9 : 20;
      c.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr);
    }
    c.fill();
    const t = new THREE.CanvasTexture(cv);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  /** 몸 치수 (기본 T 자세, 미터) — 몸 모델마다 한 번만 잰다 */
  const dimsCache = new Map();
  function measure(model, key) {
    if (dimsCache.has(key)) return dimsCache.get(key);
    model.updateMatrixWorld(true);
    const at = (n) => model.getObjectByName(n).getWorldPosition(V());
    const eyes = model.getObjectByName('Eyes');
    eyes.geometry.computeBoundingBox();
    const eb = eyes.geometry.boundingBox;
    let top = 0;
    model.traverse((o) => {
      if (!o.isSkinnedMesh || o.name === 'Eyes' || o.name === 'Eyebrows') return;
      o.geometry.computeBoundingBox();
      top = Math.max(top, o.geometry.boundingBox.max.y);
    });
    const d = {
      neckY: at('neck_01').y + 0.03,
      eyeY: (eb.min.y + eb.max.y) / 2,
      eyeX: eb.max.x * 0.62,
      faceZ: eb.max.z,
      wristX: Math.abs(at('hand_l').x),
      bootY: at('calf_l').y * 0.66,
      pelvisY: at('pelvis').y,
      chestY: at('spine_03').y + 0.07,
      shoulderY: at('upperarm_l').y,
      topY: top,
      sideL: Math.sign(at('hand_l').x) || 1, // 왼손이 +x 인지 -x 인지
    };
    dimsCache.set(key, d);
    return d;
  }

  /** 뼈에 장비를 붙인다: 장비는 몸 좌표(미터, T 자세)로 놓고, 뼈로 옮겨도 그 자리를 지킨다 */
  function attachTo(model, boneName, obj) {
    model.add(obj);
    model.updateMatrixWorld(true);
    model.getObjectByName(boneName).attach(obj);
    return obj;
  }

  /** 히어로 장비 (look.gear · cape · ears · catEars · fins · bulk) */
  function addGear(h, hero, d) {
    const L = hero.look;
    const m = h.model;
    const sL = d.sideL;
    const at = (n) => m.getObjectByName(n).getWorldPosition(V());
    const cape = (color) => {
      // 위는 좁고(어깨 사이) 아래로 넓게 퍼지는 망토, 아래쪽이 조금 뒤로 날린다
      const g = new THREE.PlaneGeometry(1, 1.05, 1, 6);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const t = 0.5 - p.getY(i) / 1.05; // 0 = 위, 1 = 아래
        p.setXYZ(i, p.getX(i) * (0.3 + 0.3 * t), -t * 1.05, -0.12 * t * t);
      }
      g.computeVertexNormals();
      const c = new THREE.Mesh(g, mat(color, { side: THREE.DoubleSide }));
      c.position.set(0, d.shoulderY - 0.03, -0.13);
      attachTo(m, 'spine_03', c);
    };
    const gear = new Set(L.gear || []);
    if (L.cape) cape(L.cape);
    if (gear.has('shield')) { // 왼팔의 둥근 방패 (앞을 본다)
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 36), [mat(L.accent), mat(0xffffff, { map: shieldTexture(L) }), mat(L.accent)]);
      sh.rotation.x = Math.PI / 2;
      sh.position.copy(at('lowerarm_l').lerp(at('hand_l'), 0.45)).add(new THREE.Vector3(0, 0, 0.08));
      A.Toon.outline(sh, 0.008);
      attachTo(m, 'lowerarm_l', sh);
    }
    if (gear.has('hammer')) { // 손잡이 + 머리
      const hammer = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 8), mat('#8d6e63'));
      handle.position.y = -0.1;
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.12), mat('#9aa5b1'));
      top.position.y = -0.27;
      A.Toon.outline(top, 0.008);
      hammer.add(handle, top);
      hammer.position.copy(at('hand_r')).add(new THREE.Vector3(0, 0, 0.03));
      attachTo(m, 'hand_r', hammer);
    }
    const staff = (len, tip) => { // 오른손의 긴 막대 (삼지창 · 창)
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, len, 8), mat(tip === 'trident' ? '#f2c14e' : '#5d4037')));
      const head = tip === 'trident' ? new THREE.Group() : new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 6), mat('#cfd8dc'));
      if (tip === 'trident') {
        for (const x of [-0.05, 0, 0.05]) {
          const prong = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.14, 6), mat('#f2c14e'));
          prong.position.x = x;
          head.add(prong);
        }
      }
      head.position.y = len / 2 + 0.06;
      g.add(head);
      g.position.copy(at('hand_r')).add(new THREE.Vector3(0, 0.35, 0.04));
      attachTo(m, 'hand_r', g);
    };
    if (gear.has('trident')) staff(1.3, 'trident');
    if (gear.has('spear')) staff(1.5, 'spear');
    if (gear.has('sword')) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.6, 0.008), mat('#cfd8dc'));
      blade.position.copy(at('hand_r')).add(new THREE.Vector3(0, -0.32, 0.04));
      attachTo(m, 'hand_r', blade);
    }
    if (gear.has('ring')) { // 손의 빛나는 마법진
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.01, 8, 40), new THREE.MeshBasicMaterial({ color: L.emblem }));
      ring.position.copy(at('hand_r')).add(new THREE.Vector3(-sL * 0.1, 0, 0.12));
      attachTo(m, 'hand_r', ring);
      h.gear.spin = ring;
    }
    if (gear.has('bow')) {
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.012, 6, 28, Math.PI), mat('#3e2723'));
      bow.rotation.set(0, 0, -sL * Math.PI / 2);
      bow.scale.set(1, 0.35, 1);
      bow.position.copy(at('hand_l')).add(new THREE.Vector3(0, 0, 0.04));
      attachTo(m, 'hand_l', bow);
    }
    if (gear.has('quiver')) {
      const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.5, 10), mat('#5d4037'));
      quiver.position.set(-sL * 0.06, d.chestY, -0.17);
      quiver.rotation.z = sL * 0.45;
      A.Toon.outline(quiver, 0.008);
      attachTo(m, 'spine_03', quiver);
    }
    if (gear.has('wings')) { // 등의 날개 두 장
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.16), mat(L.accent, { side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
        w.position.set(s * 0.32, d.shoulderY - 0.08, -0.16);
        w.rotation.set(0, s * 0.3, s * 0.35);
        attachTo(m, 'spine_03', w);
      }
    }
    if (gear.has('cannon')) { // 어깨 대포
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 10), mat('#2b2f36'));
      c.rotation.x = Math.PI / 2;
      c.position.set(-sL * 0.16, d.shoulderY + 0.06, 0.02);
      attachTo(m, 'spine_03', c);
    }
    if (gear.has('claws')) { // 손등의 발톱 세 개
      for (const hand of ['hand_l', 'hand_r']) {
        for (const z of [-0.02, 0, 0.02]) {
          const cl = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.2, 4), mat('#e0e0e0'));
          const p = at(hand);
          cl.position.set(p.x + Math.sign(p.x) * 0.16, p.y, p.z + z);
          cl.rotation.z = -Math.sign(p.x) * Math.PI / 2;
          attachTo(m, hand, cl);
        }
      }
    }
    if (gear.has('tiara')) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 30), mat(L.line));
      t.rotation.x = Math.PI / 2;
      t.position.set(0, d.eyeY + 0.05, 0);
      attachTo(m, 'Head', t);
    }
    if (gear.has('horns')) { // 뒤로 휜 금색 뿔
      for (const s of [-1, 1]) {
        const hn = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.16, 6), mat('#c9a227'));
        hn.position.set(s * 0.05, d.topY + 0.02, 0.03);
        hn.rotation.set(-0.6, 0, -s * 0.2);
        attachTo(m, 'Head', hn);
      }
    }
    if (L.ears || L.catEars || L.fins) { // 배트맨 · 표범 귀 / 울버린 지느러미
      for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(L.fins ? 0.02 : 0.03, L.ears ? 0.1 : 0.07, 4), mat(L.fins ? L.accent : L.suit));
        ear.position.set(s * (L.fins ? 0.085 : 0.065), d.topY - (L.fins ? 0.06 : 0.02), L.fins ? -0.02 : -0.01);
        ear.rotation.z = -s * (L.fins ? 0.9 : 0.25);
        attachTo(m, 'Head', ear);
      }
    }
    if (L.bulk) h.bulk.set(L.bulk, 1 + (L.bulk - 1) * 0.5, L.bulk * 1.04);
  }

  /** 머리 모양 메시를 몸의 뼈대에 묶는다 (머리 파일도 같은 65개 뼈 순서라 그대로 묶인다) */
  function addHair(h, hero, body) {
    const L = hero.look;
    const style = L.hairStyle || (L.body === 'f' ? 'long' : 'parted');
    const names = L.beard ? [style, 'beard'] : [style];
    for (const n of names) {
      const src = A.Assets3D.get(A.Assets3D.MODELS.heroes.hair[n]);
      if (!src) continue;
      src.scene.traverse((o) => {
        if (!o.isSkinnedMesh) return;
        const hm = new THREE.SkinnedMesh(o.geometry, A.HeroSuit.hairMaterial(L.hair || '#3e2723', o.material));
        hm.name = `hair-${n}`;
        hm.castShadow = true;
        hm.frustumCulled = false;
        body.parent.add(hm);
        hm.bind(body.skeleton, body.bindMatrix);
        h.materials.push(hm.material);
      });
    }
  }

  class Hero3D {
    /** @param {Hero} hero */
    constructor(hero) {
      const M = A.Assets3D.MODELS.heroes;
      const L = hero.look;
      const url = L.body === 'f' ? M.female : M.male;
      this.hero = hero;
      this.root = new THREE.Group();
      this.model = A.Assets3D.cloneSkinned(url);
      this.gear = {};
      this.materials = [];
      this.bulk = new THREE.Vector3(1, 1, 1);
      const d = measure(this.model, url); // 슈트 부위는 기본 자세 좌표 기준이라 비율을 바꾸기 전에 잰다

      const meshes = [];
      this.model.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
      let body = null;
      for (const o of meshes) {
        o.castShadow = true;
        o.frustumCulled = false; // 동작으로 몸이 기본 상자 밖으로 나가도 사라지지 않게
        if (o.name === 'Eyes' || o.name === 'Eyebrows') {
          o.visible = false; // 눈 · 눈썹은 셰이더가 만화 얼굴로 그린다 (사실적인 눈알은 3등신에서 어색함)
          o.material = o.name === 'Eyes' ? A.Toon.material({ map: o.material.map }) : A.HeroSuit.hairMaterial(L.hair || '#3e2723', o.material);
          this.materials.push(o.material);
          continue;
        }
        body = o;
        o.material = A.HeroSuit.material(L, o.material.map, d);
        this.suit = o.material;
        this.materials.push(o.material);
        A.Toon.outline(o, OUTLINE_M);
      }
      if (A.HeroSuit.showHair(L)) addHair(this, hero, body);
      addGear(this, hero, d); // 장비도 기본 자세에서 뼈에 붙여야 몸 비율을 따라간다
      const feet = this.build();

      this.wrap = new THREE.Group(); // 미터 → 바깥 키 2.7
      this.wrap.add(this.model);
      this.model.position.y = -feet.y; // 다리 길이가 바뀐 만큼 옮겨 발을 땅에
      this.wrap.scale.copy(this.bulk).multiplyScalar(HEIGHT / (feet.height || BODY_M));
      this.wrap.scale.x *= BODY_WIDE;
      this.wrap.scale.z *= BODY_WIDE;
      this.root.add(this.wrap);

      this.attackClip = ATTACK_BY_FAMILY[hero.family] || CLIPS.attack;
      this.mixer = new THREE.AnimationMixer(this.model);
      this.actions = {};
      for (const clip of A.Assets3D.get(M.anims).animations) this.actions[clip.name] = this.mixer.clipAction(clip);
      this.current = null;
      this.pose = null;
      this.flash = 0;
      this.setPose('idle');
    }

    /**
     * 히어로 비율로 뼈 크기를 바꾸고, 바뀐 뒤의 발 높이 · 키를 잰다 (서 있는 기본 자세 기준)
     * @returns {{y: number, height: number}} y: 발바닥 높이 (m), height: 발 ~ 머리 꼭대기 (m)
     */
    build() {
      const m = this.model;
      for (const [name, k] of Object.entries(HERO_BUILD)) {
        const b = m.getObjectByName(name);
        if (b) b.scale.multiplyScalar(k);
      }
      m.updateMatrixWorld(true);
      const foot = Math.min(m.getObjectByName('ball_l').getWorldPosition(V()).y, m.getObjectByName('foot_l').getWorldPosition(V()).y);
      const sole = foot - 0.05; // 발 뼈 → 발바닥
      const head = m.getObjectByName('Head');
      const top = head.getWorldPosition(V()).y + 0.2 * head.getWorldScale(V()).y; // 머리 뼈 → 정수리 (원래 약 0.2m)
      return { y: sole, height: top - sole };
    }

    /**
     * 2D 자세 이름으로 동작을 바꾼다 (같으면 그대로).
     * @param {string} pose idle · breath · run1 · run2 · attack · jump · hurt · win · lose
     */
    setPose(pose) {
      if (this.pose === pose) return;
      this.pose = pose;
      const name = pose === 'attack' ? this.attackClip : CLIPS[pose] || CLIPS.idle;
      const next = this.actions[name];
      if (!next) return;
      const once = ONCE[name];
      if (next === this.current && !once) return;
      next.reset();
      next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      next.clampWhenFinished = !!once;
      next.timeScale = once || 1;
      next.play();
      if (this.current && this.current !== next) this.current.crossFadeTo(next, FADE, false);
      this.current = next;
      if (pose === 'hurt') this.flash = 0.35; // 아야: 잠깐 빨갛게
    }

    /** @param {number} dt 초 */
    update(dt) {
      this.mixer.update(dt);
      if (this.gear.spin) this.gear.spin.rotation.z += dt * 3;
      if (this.flash > 0) {
        this.flash -= dt;
        const red = this.flash > 0 && Math.floor(this.flash * 20) % 2 === 0;
        this.suit.emissive.setHex(red ? 0x661111 : 0x000000);
      }
    }

    dispose() {
      this.mixer.stopAllAction();
      for (const m of this.materials) m.dispose(); // 형상 · 텍스처는 불러온 원본과 공유하므로 두고 재질만
      this.root.removeFromParent();
    }
  }

  A.Hero3D = Hero3D;
})(window.ARAH);

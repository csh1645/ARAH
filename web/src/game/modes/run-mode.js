/**
 * @file 🏃 히어로 러너 모드. "게임이 먼저, 문제는 파워업" 구조의 시험 놀이 (2026-10-17 사용자 피드백: "단순해서 흥미가 없다").
 *       히어로는 도시 옥상을 계속 달리고, 아이는 점프 하나로 상자를 넘고 · 밟고 코인을 모은다.
 *       문제가 나오면 정답 구슬들이 하늘에 줄지어 다가오고, 정답 구슬만 점프해서 잡으면
 *       다음 달리기 구간 동안 파워업(거대화 · 무적 별 · 자석 · 코인 비)이 켜진다.
 * @layer game
 * @depends A.RoundScene, A.GAME, A.util, A.RULES, A.speak
 * @see doc/planning/game-design.md (3.7 히어로 러너)
 *
 * 판정: 정답 구슬을 잡음 → 정답 + 파워업 / 오답 구슬을 잡음 → 하트 -1 (같은 문제의 다른 구슬은 계속 다가옴)
 *       정답 구슬이 그냥 지나감 → 하트 -1, 정답을 보여 주고 다음 구간
 *       단, 한 문제에서 잃는 하트는 최대 1개 (구슬이 연달아 와서 한 문제에 판이 끝나는 일이 없게)
 *       상자에 부딪힘 → 잠깐 느려질 뿐 (하트 · 점수는 그대로 — 학습과 무관한 실수로 벌주지 않는다)
 * 구간: [문제 구간] 구슬만 나오고 조금 느리게 달린다 → [달리기 구간 runSegmentSec] 상자 · 코인 · 파워업
 * 조작: 화면 아무 곳 터치 · 클릭, 또는 스페이스 · ↑ 로 점프 (공중에서 한 번 더 = 2단 점프)
 */
(function (A) {
  'use strict';

  if (!A.RoundScene) return;

  const { W, FONT, DEPTH } = A.GAME;

  // ----- 화면 배치 (게임 좌표) -----
  const GROUND_Y = 560; // 옥상 바닥 윗면
  const HERO_X = 220;
  const HERO_HALF_H = 52; // 히어로 그림 중심 ~ 발 (크기 1 기준)
  const ORB_RISE = 150; // 구슬 높이: 서 있는 히어로 중심보다 이만큼 위 → 점프해야 닿는다
  const ORB_H = 74;
  const ORB_FIRST_X = W + 260; // 첫 구슬 출발 위치 (화면 밖) → 문제를 읽을 시간
  const ORB_GAP = 380; // 구슬 사이 간격 px
  const CRATE = 56;

  // ----- 점프 물리 -----
  const GRAVITY = 2600; // px/초²
  const JUMP_V = -980; // 첫 점프 → 약 185px 높이 (구슬에 닿는다)
  const JUMP2_V = -820; // 2단 점프
  const STOMP_V = -700; // 상자를 밟으면 튀어 오름

  // ----- 판정 여유 -----
  const GRAB_DY = 62; // 구슬 잡기 세로 여유: 서 있을 때는 구슬과 150px 차이라 점프해야만 닿는다 (가로는 구슬 폭 + 히어로 폭)
  const COIN_R = 40; // 코인 줍기 거리
  const MAGNET_R = 320; // 자석 파워업이 코인을 끌어오는 거리

  // ----- 연출 -----
  const STUMBLE_MS = 900; // 상자에 부딪혔을 때 느려지는 시간
  const STUMBLE_RATE = 0.5;
  const STAR_SPEED_RATE = 1.35; // 무적 별 파워업일 때 더 빨리 달린다
  const GIANT_SCALE = 1.6;
  const SPAWN_STOP_MS = 1500; // 달리기 구간이 끝나기 이만큼 전부터는 상자를 만들지 않는다 (구슬과 겹치지 않게)
  const RUN_SEGMENT_TEXT = '🏃 달려요!';
  const RUN_SEGMENT_HINT = '상자는 점프로 넘거나 밟고, 코인을 모아요 · 곧 다음 문제!';
  const COIN_POINTS = 10;
  const SMASH_POINTS = 30;

  /**
   * 정답 보상 파워업. 다음 달리기 구간(runSegmentSec) 동안만 켜진다 → 문제 구간은 항상 같은 조건.
   * @type {{id: string, label: string}[]}
   */
  const POWER_UPS = [
    { id: 'giant', label: '💪 거대화! 상자를 부숴요' },
    { id: 'star', label: '🌟 무적 별! 신나게 달려요' },
    { id: 'magnet', label: '🧲 코인 자석!' },
    { id: 'coinRain', label: '💰 코인 비!' },
  ];

  class RunScene extends A.RoundScene {
    constructor() {
      super({ key: 'play' });
    }

    introText() {
      return `${this.hero.name} 출동!\n점프! 정답 구슬을 잡으면 파워업`;
    }

    questionCount() {
      return A.RULES.runQuestionsPerRound;
    }

    createWorld() {
      this.orbs = [];
      this.crates = [];
      this.coins = [];
      this.vy = 0;
      this.onGround = true;
      this.jumps = 0;
      this.segment = 'run'; // 'quiz' 문제 구간 / 'run' 달리기 구간
      this.segmentEnd = 0; // 달리기 구간이 끝나는 장면 시간
      this.nextSpawn = 0;
      this.stumbleUntil = 0;
      this.power = null; // { id, until }
      this.baseSpeed = A.RULES.runSpeedByLevel[this.opts.level] * (this.ab.slow || 1);

      this.drawSky();
      this.makeScrollLayers();

      this.createHero(HERO_X, this.groundHeroY());
      this.setHeroBase('run');
      this.fxGfx = this.add.graphics().setDepth(DEPTH.hero - 1); // 자석 범위 등

      this.input.on('pointerdown', () => this.jump());
      this.input.keyboard.on('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') this.jump();
      });
    }

    /** 멀리 · 가까운 도시와 옥상 바닥을 텍스처로 만들어 서로 다른 속도로 흘린다 (시차 = 속도감). */
    makeScrollLayers() {
      const tex = (key, w, h, draw) => {
        if (this.textures.exists(key)) this.textures.remove(key);
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        draw(g);
        g.generateTexture(key, w, h);
        g.destroy();
      };
      tex('run-city-far', W, 320, (g) => this.drawCity(g, 320, 0x141838, [120, 280]));
      tex('run-city-near', W, 260, (g) => this.drawCity(g, 260, 0x1f2552, [70, 200]));
      tex('run-ground', 160, 80, (g) => {
        g.fillStyle(0x2a2e5c, 1);
        g.fillRect(0, 0, 160, 80);
        g.fillStyle(0x4a4f8c, 1);
        g.fillRect(0, 0, 160, 6);
        g.fillStyle(0x363b74, 1); // 바닥 이음매 (흐르는 게 보이도록)
        g.fillRect(0, 6, 6, 74);
        g.fillRect(80, 30, 40, 6);
      });
      this.farLayer = this.add.tileSprite(W / 2, GROUND_Y - 160, W, 320, 'run-city-far').setDepth(DEPTH.bg);
      this.nearLayer = this.add.tileSprite(W / 2, GROUND_Y - 130, W, 260, 'run-city-near').setDepth(DEPTH.bg);
      this.groundLayer = this.add.tileSprite(W / 2, GROUND_Y + 40, W, 80, 'run-ground').setDepth(DEPTH.world);
    }

    /** 지금 크기(거대화 포함)에서 바닥에 서 있을 때 히어로 중심 y */
    groundHeroY() {
      return GROUND_Y - HERO_HALF_H * (this.heroScale || 1);
    }

    // ---------- 점프 ----------

    jump() {
      if (this.ended) return;
      if (this.onGround) {
        this.vy = JUMP_V;
        this.onGround = false;
        this.jumps = 1;
      } else if (this.jumps < 2) { // 2단 점프: 한 바퀴 돈다
        this.vy = JUMP2_V;
        this.jumps = 2;
        const dir = this.player.flipX ? -1 : 1;
        this.tweens.add({ targets: this.player, angle: dir * 360, duration: 380, onComplete: () => this.player.setAngle(0) });
      } else {
        return;
      }
      this.setHeroBase('jump');
      this.sfx('jump');
    }

    land() {
      const k = this.heroScale;
      this.onGround = true;
      this.jumps = 0;
      this.vy = 0;
      this.player.y = this.groundHeroY();
      this.setHeroBase('run');
      this.tweens.add({ targets: this.player, scaleY: k * 0.88, scaleX: k * 1.06, duration: 70, yoyo: true, onComplete: () => this.player.setScale(k) });
    }

    // ---------- 문제 구간: 정답 구슬 ----------

    startWave(q) {
      this.segment = 'quiz';
      const decoyIdx = this.decoyIndex(q);
      const y = this.groundHeroY() - ORB_RISE;
      // q.choices 는 이미 섞여 있으므로 그 순서대로 하나씩 다가오게 한다
      this.orbs = q.choices.map((label, i) => this.makeOrb(label, label === q.answer, ORB_FIRST_X + i * ORB_GAP, y, i === decoyIdx));
    }

    makeOrb(label, isCorrect, x, y, decoy) {
      const size = label.length > 7 ? 22 : this.opts.subject === 'eng' ? 28 : 32;
      const t = this.add.text(0, 2, label, { fontFamily: FONT, fontSize: `${size}px`, color: '#ffffff' }).setOrigin(0.5);
      const w = Math.max(92, t.width + 34);
      const g = this.add.graphics();
      g.fillStyle(0x4cc9f0, 0.25); // 빛무리
      g.fillRoundedRect(-w / 2 - 8, -ORB_H / 2 - 8, w + 16, ORB_H + 16, 30);
      g.fillStyle(0x3a0ca3, 1);
      g.fillRoundedRect(-w / 2, -ORB_H / 2, w, ORB_H, 26);
      g.lineStyle(4, 0x4cc9f0, 1);
      g.strokeRoundedRect(-w / 2, -ORB_H / 2, w, ORB_H, 26);
      g.fillStyle(0xffffff, 0.25); // 반짝임
      g.fillRoundedRect(-w / 2 + 10, -ORB_H / 2 + 8, w * 0.4, 10, 5);
      if (decoy) { // 힌트 능력: 가짜 구슬은 흐리게 X 표시
        g.lineStyle(5, 0x9a9a9a, 1);
        g.lineBetween(-w / 2 + 14, -ORB_H / 2 + 12, w / 2 - 14, ORB_H / 2 - 12);
      }
      const c = this.add.container(x, y, [g, t]).setDepth(DEPTH.world + 1).setAlpha(decoy ? 0.35 : 1);
      this.tweens.add({ targets: c, scale: 1.06, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' }); // 두근두근
      return { c, t, w, isCorrect, decoy, done: false, baseY: y, phase: Math.random() * 6 };
    }

    /** 구슬을 잡음 */
    grabOrb(o) {
      o.done = true;
      this.attackHit(o.c.x, o.c.y); // 팀별 명중 연출
      if (o.isCorrect) {
        const pts = this.awardCorrect(o.c.x, o.c.y);
        this.popup(o.c.x, o.c.y - 60, `정답! +${pts}`, '#06d6a0');
        if (this.q.speak) A.speak(this.q.speak);
        this.popOrb(o, 0x06d6a0);
        this.endWave(A.RULES.runSegmentSec * 1000, true);
      } else {
        this.penalize(!this.q.missed); // 이 문제에서 처음 틀릴 때만 하트 -1
        o.t.setColor('#ff5c5c');
        this.popup(o.c.x, o.c.y - 60, '앗! 다른 구슬이에요', '#ff5c5c');
        this.popOrb(o, 0xff3355);
        if (this.hearts <= 0) this.endWave(1200);
      }
    }

    popOrb(o, color) {
      this.burster.explode(16, o.c.x, o.c.y);
      const ring = this.add.circle(o.c.x, o.c.y, 30, color, 0).setStrokeStyle(5, color, 1).setDepth(DEPTH.popup);
      this.tweens.add({ targets: ring, scale: 2.5, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
      this.tweens.killTweensOf(o.c);
      this.tweens.add({ targets: o.c, scale: 1.4, alpha: 0, duration: 250, onComplete: () => o.c.destroy() });
    }

    /** 정답 구슬이 그냥 지나감: 하트 -1, 정답을 보여 주고 달리기 구간으로 */
    missOrb(o) {
      o.done = true;
      this.penalize(!this.q.missed); // 이미 오답 구슬로 하트를 잃었으면 또 깎지 않는다
      o.t.setColor('#ffd166');
      this.popup(HERO_X + 160, o.c.y - 60, `정답은 ${this.q.answer}`, '#ffd166');
      this.endWave(A.RULES.runSegmentSec * 1000, false);
    }

    /**
     * 문제를 끝내고 달리기 구간으로 바꾼다. 기반 endWave 를 감싸 구간 정보와 파워업을 정한다.
     * @param {number} delay 달리기 구간 길이 ms
     * @param {boolean} [earned] 정답이면 파워업
     */
    endWave(delay, earned = false) {
      if (!this.waveActive) return;
      this.segment = 'run';
      this.segmentEnd = this.time.now + delay;
      this.nextSpawn = this.time.now + 500;
      if (earned) this.startPower(A.util.pick(POWER_UPS));
      super.endWave(delay);
      // 끝난 문제가 계속 떠 있으면 헷갈린다 → 달리기 구간 안내로 바꾼다 (다음 문제가 나오면 기반이 다시 채운다)
      if (this.hearts > 0) {
        this.qText.setText(RUN_SEGMENT_TEXT);
        this.hintText.setText(RUN_SEGMENT_HINT);
      }
    }

    clearWave() {
      for (const o of this.orbs) {
        if (o.done) continue;
        o.done = true;
        this.tweens.killTweensOf(o.c);
        this.tweens.add({ targets: o.c, alpha: 0, y: o.c.y - 40, duration: 400, onComplete: () => o.c.destroy() });
      }
      this.orbs = [];
    }

    // ---------- 파워업 ----------

    startPower(p) {
      this.power = { id: p.id, until: this.segmentEnd - 300 };
      this.sfx('powerUp');
      this.showBanner(p.label);
      if (p.id === 'giant') this.setGiant(true);
      if (p.id === 'coinRain') {
        for (let i = 0; i < 4; i++) this.spawnCoinArc(W + 60 + i * 220);
      }
    }

    endPower() {
      if (!this.power) return;
      if (this.power.id === 'giant') this.setGiant(false);
      this.player.clearTint();
      this.power = null;
    }

    hasPower(id) {
      return this.power && this.power.id === id;
    }

    /** 거대화 켜기 · 끄기. 크기가 바뀌어도 발이 바닥에 붙어 있게 한다 */
    setGiant(on) {
      this.heroScale = on ? GIANT_SCALE : 1;
      this.tweens.add({ targets: this.player, scale: this.heroScale, duration: 250, ease: 'Back.Out' });
      if (this.onGround) this.tweens.add({ targets: this.player, y: this.groundHeroY(), duration: 250 });
    }

    showBanner(msg) {
      const t = this.add
        .text(W / 2, 230, msg, { fontFamily: FONT, fontSize: '40px', color: '#ffd166', stroke: '#000000', strokeThickness: 8 })
        .setOrigin(0.5)
        .setDepth(DEPTH.popup)
        .setScale(0.3);
      this.tweens.chain({
        targets: t,
        tweens: [
          { scale: 1, duration: 300, ease: 'Back.Out' },
          { alpha: 0, y: 200, duration: 400, delay: 900 },
        ],
        onComplete: () => t.destroy(),
      });
    }

    // ---------- 달리기 구간: 상자 · 코인 ----------

    /** 달리기 구간의 장애물 · 코인 묶음을 하나 만든다 (번갈아 다른 모양) */
    spawnPattern() {
      const x = W + 60;
      const kind = A.util.pick(['crate', 'crateCoins', 'coinLine', 'crate']);
      if (kind === 'crate') this.spawnCrate(x);
      if (kind === 'crateCoins') { // 상자 위로 코인 아치 → 점프하면 같이 줍는다
        this.spawnCrate(x);
        this.spawnCoinArc(x - 90);
      }
      if (kind === 'coinLine') {
        for (let i = 0; i < 5; i++) this.spawnCoin(x + i * 46, GROUND_Y - 40);
      }
    }

    spawnCrate(x) {
      const g = this.add.graphics();
      g.fillStyle(0xb5651d, 1);
      g.fillRoundedRect(-CRATE / 2, -CRATE, CRATE, CRATE, 6);
      g.lineStyle(4, 0x7a3e0f, 1);
      g.strokeRoundedRect(-CRATE / 2, -CRATE, CRATE, CRATE, 6);
      g.lineBetween(-CRATE / 2 + 4, -CRATE + 4, CRATE / 2 - 4, -4);
      g.lineBetween(CRATE / 2 - 4, -CRATE + 4, -CRATE / 2 + 4, -4);
      const c = this.add.container(x, GROUND_Y, [g]).setDepth(DEPTH.world + 1);
      this.crates.push({ c, done: false });
    }

    spawnCoin(x, y) {
      const c = this.add.container(x, y).setDepth(DEPTH.world + 1);
      const g = this.add.graphics();
      g.fillStyle(0xffd166, 1);
      g.fillCircle(0, 0, 13);
      g.fillStyle(0xffe9a8, 1);
      g.fillCircle(-3, -3, 5);
      g.lineStyle(3, 0xe09f00, 1);
      g.strokeCircle(0, 0, 13);
      c.add(g);
      this.tweens.add({ targets: c, scaleX: 0.25, duration: 300, yoyo: true, repeat: -1 }); // 빙글빙글
      this.coins.push({ c, done: false });
    }

    /** 점프 높이의 코인 아치 */
    spawnCoinArc(x) {
      const top = this.groundHeroY() - 150;
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        this.spawnCoin(x + i * 45, top + Math.pow(t * 2 - 1, 2) * 90);
      }
    }

    /** 상자에 닿음: 위에서 밟으면 부수고 튀어 오르기, 파워업 중이면 부수기, 아니면 휘청 (느려지기만) */
    hitCrate(cr, fromAbove) {
      cr.done = true;
      if (fromAbove || this.hasPower('giant') || this.hasPower('star')) {
        this.smashCrate(cr);
        if (fromAbove) {
          this.vy = STOMP_V;
          this.jumps = 1; // 밟고 튀어 오른 뒤에도 한 번 더 점프 가능
        }
        return;
      }
      this.stumbleUntil = this.time.now + STUMBLE_MS;
      this.setHeroPose('hurt', STUMBLE_MS * 0.6);
      this.sfx('wrong');
      this.cameras.main.shake(120, 0.004);
      this.tweens.add({ targets: cr.c, angle: 70, y: GROUND_Y + 20, alpha: 0, duration: 450, onComplete: () => cr.c.destroy() });
    }

    smashCrate(cr) {
      this.sfx('smash');
      this.burster.explode(14, cr.c.x, GROUND_Y - CRATE / 2);
      this.cameras.main.shake(100, 0.005);
      this.score += SMASH_POINTS;
      this.updateHud();
      cr.c.destroy();
    }

    collectCoin(co) {
      co.done = true;
      this.score += COIN_POINTS;
      this.updateHud();
      this.sfx('coin');
      this.tweens.killTweensOf(co.c);
      this.tweens.add({ targets: co.c, y: co.c.y - 40, alpha: 0, scale: 1.5, duration: 220, onComplete: () => co.c.destroy() });
    }

    // ---------- 매 프레임 ----------

    update(time, delta) {
      if (this.ended) return;
      const s = Math.min(delta, 50) / 1000;
      const p = this.player;
      if (this.power && time >= this.power.until) this.endPower();

      // 달리는 속도: 문제 구간은 느리게(읽을 시간), 휘청이면 느리게, 무적 별이면 빠르게
      let v = this.baseSpeed;
      if (this.segment === 'quiz') v *= A.RULES.runQuizSpeedRate;
      if (time < this.stumbleUntil) v *= STUMBLE_RATE;
      if (this.hasPower('star')) v *= STAR_SPEED_RATE;
      const dx = v * s;
      this.farLayer.tilePositionX += dx * 0.2;
      this.nearLayer.tilePositionX += dx * 0.45;
      this.groundLayer.tilePositionX += dx;

      // 점프 물리
      const prevBottom = p.y + HERO_HALF_H * this.heroScale;
      if (!this.onGround) {
        this.vy += GRAVITY * s;
        p.y += this.vy * s;
        if (p.y >= this.groundHeroY()) this.land();
      }
      const bottom = p.y + HERO_HALF_H * this.heroScale;
      const halfW = 24 * this.heroScale;

      // 무적 별: 무지개빛
      if (this.hasPower('star')) p.setTint(Phaser.Display.Color.HSVToRGB((time / 600) % 1, 0.5, 1).color);

      // 달리기 구간: 상자 · 코인 만들기
      if (this.segment === 'run' && this.waveActive === false && time >= this.nextSpawn && time < this.segmentEnd - SPAWN_STOP_MS) {
        this.spawnPattern();
        this.nextSpawn = time + A.util.rand(900, 1500);
      }

      // 상자
      for (const cr of this.crates) {
        if (cr.done) continue;
        cr.c.x -= dx;
        if (cr.c.x < -60) { cr.done = true; cr.c.destroy(); continue; }
        const top = GROUND_Y - CRATE;
        if (Math.abs(cr.c.x - p.x) < CRATE / 2 + halfW && bottom > top + 6) {
          this.hitCrate(cr, !this.onGround && this.vy > 0 && prevBottom <= top + 14);
        }
      }
      this.crates = this.crates.filter((cr) => !cr.done);

      // 코인 (자석 파워업이면 끌려온다)
      const magnet = this.hasPower('magnet');
      for (const co of this.coins) {
        if (co.done) continue;
        co.c.x -= dx;
        if (magnet) {
          const mx = p.x - co.c.x;
          const my = p.y - co.c.y;
          const d = Math.hypot(mx, my);
          if (d < MAGNET_R) {
            co.c.x += (mx / d) * 700 * s;
            co.c.y += (my / d) * 700 * s;
          }
        }
        if (co.c.x < -30) { co.done = true; co.c.destroy(); continue; }
        if (Math.hypot(co.c.x - p.x, co.c.y - p.y) < COIN_R * this.heroScale) this.collectCoin(co);
      }
      this.coins = this.coins.filter((co) => !co.done);

      // 정답 구슬: 히어로와 겹치면 잡기, 히어로 뒤로 지나가면 놓침(정답) · 사라짐(오답)
      for (const o of this.orbs) {
        if (o.done) continue;
        o.c.x -= dx;
        o.c.y = o.baseY + Math.sin(time / 300 + o.phase) * 8; // 둥실둥실
        if (!o.decoy && this.waveActive && Math.abs(o.c.x - p.x) < o.w / 2 + halfW && Math.abs(o.c.y - p.y) < GRAB_DY) {
          this.grabOrb(o);
          continue;
        }
        if (o.c.x < HERO_X - o.w / 2 - halfW) {
          if (o.isCorrect && this.waveActive) {
            this.missOrb(o);
            continue;
          }
          o.done = true;
          this.tweens.killTweensOf(o.c);
          this.tweens.add({ targets: o.c, alpha: 0, duration: 300, onComplete: () => o.c.destroy() });
        }
      }

      // 자석 범위 표시
      const fg = this.fxGfx;
      fg.clear();
      if (magnet) {
        fg.lineStyle(3, 0xffd166, 0.35 + Math.sin(time / 120) * 0.15);
        fg.strokeCircle(p.x, p.y, MAGNET_R * 0.5);
      }
    }
  }

  A.GAME_MODES.run = RunScene;
})(window.ARAH);

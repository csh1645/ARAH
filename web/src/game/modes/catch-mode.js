/**
 * @file 🎯 드론 잡기 모드. 차원 포털에서 내려오는 드론 중 정답 드론을 거미줄로 맞힌다.
 * @layer game
 * @depends A.RoundScene, A.GAME, A.util, A.RULES, A.speak
 * @see doc/planning/game-design.md (3.1 드론 잡기)
 *
 * 판정: 정답 명중 → 다음 문제 / 오답 명중 → 하트 -1, 같은 문제 계속 / 정답 드론 놓침 → 하트 -1, 다음 문제
 */
(function (A) {
  'use strict';

  if (!A.RoundScene) return;

  const { W, H, FONT, DEPTH } = A.GAME;

  // ----- 화면 배치 (게임 좌표) -----
  const PORTAL_Y = 135; // 드론이 나오는 차원 포털 높이
  const MISS_Y = 468; // 정답 드론 중심이 이 선을 넘으면 놓친 것
  const HERO_Y = 548;
  const DRONE_MARGIN_X = 130; // 맨 왼쪽 · 오른쪽 드론의 가장자리 여백
  const DRONE_H = 64;

  // ----- 조작감 기본값 (히어로 능력이 있으면 덮어쓴다) -----
  const WEB_SPEED = 950; // 거미줄 속도 px/초
  const MOVE_SPEED = 460; // 키보드 이동 속도 px/초
  const DEFAULT_COOLDOWN = 300; // 연사 간격 ms. 너무 짧으면 아무 데나 난사하게 된다
  const DEFAULT_HIT_RADIUS = 10; // 판정 여유 px
  // 드론을 직접 누르면 거미줄이 그 드론을 따라간다(유도).
  // 거미줄이 날아가는 동안 드론이 내려가서 빗나가는 답답함을 없애기 위한 값으로, 누른 곳이 드론에서 이만큼 벗어나도 인정한다.
  const LOCK_ON_PADDING = 24;

  // ----- 다음 문제까지 대기 시간 ms -----
  const NEXT_DELAY_CORRECT = 900;
  const NEXT_DELAY_MISSED = 1600; // 놓쳤을 때는 정답을 읽을 시간을 더 준다

  class CatchScene extends A.RoundScene {
    constructor() {
      super({ key: 'play' });
    }

    introText() {
      return `${this.hero.name} 출동!\n정답 드론에 ${this.shotName}을 쏘세요`;
    }

    createWorld() {
      this.webs = [];
      this.drones = [];
      this.lastFire = -9999;
      this.fallSpeed = A.RULES.fallSpeedByLevel[this.opts.level] * (this.ab.slow || 1);

      this.drawSky();
      const g = this.add.graphics().setDepth(DEPTH.bg);
      this.drawCity(g, 600, 0x1a1f45, [130, 300]);
      // 옥상 바닥과 위험선
      g.fillStyle(0x2a2e5c, 1);
      g.fillRect(0, 600, W, 40);
      g.lineStyle(3, 0x4a4f8c, 1);
      g.lineBetween(0, 600, W, 600);
      g.lineStyle(2, 0xff4d6d, 0.45);
      for (let dx = 0; dx < W; dx += 24) g.lineBetween(dx, MISS_Y + DRONE_H / 2 + 2, dx + 12, MISS_Y + DRONE_H / 2 + 2);

      // 드론이 나오는 차원 포털
      const portal = this.add.graphics({ x: W / 2, y: PORTAL_Y }).setDepth(DEPTH.bg);
      [[0x7b2ff7, 220, 50], [0x00d4ff, 160, 36], [0xff4fd8, 100, 22]].forEach(([c, pw, ph]) => {
        portal.lineStyle(5, c, 0.7);
        portal.strokeEllipse(0, 0, pw, ph);
      });
      this.tweens.add({ targets: portal, scaleX: 1.12, scaleY: 0.9, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

      this.createHero(W / 2, HERO_Y);
      this.tweens.add({ targets: this.player, y: HERO_Y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.webGfx = this.add.graphics().setDepth(DEPTH.web);

      this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,A,D,SPACE');
      this.input.on('pointerdown', (p) => this.fireAt(p.worldX, p.worldY));
    }

    // ---------- 드론 ----------

    startWave(q) {
      // 드론을 화면 너비에 고르게 배치하되, 정답 위치를 외우지 못하게 순서를 섞는다
      const n = q.choices.length;
      const gap = (W - DRONE_MARGIN_X * 2) / (n - 1);
      const xs = A.util.shuffle(q.choices.map((_, i) => DRONE_MARGIN_X + i * gap));
      const wrongIdx = q.choices.map((_, i) => i).filter((i) => q.choices[i] !== q.answer);
      const decoyIdx = this.ab.hint ? A.util.pick(wrongIdx) : -1;

      this.drones = q.choices.map((label, i) =>
        this.makeDrone(label, label === q.answer, xs[i], i === decoyIdx, i * 120));
    }

    clearWave() {
      this.webs = [];
      for (const d of this.drones) {
        if (d.done) continue;
        d.done = true;
        this.fadeOut(d, -20);
      }
    }

    makeDrone(label, isCorrect, targetX, decoy, delay) {
      const size = label.length > 7 ? 24 : this.opts.subject === 'eng' ? 30 : 34;
      const text = this.add
        .text(0, 2, label, { fontFamily: FONT, fontSize: `${size}px`, color: '#ffffff' })
        .setOrigin(0.5);
      const w = Math.max(96, text.width + 36);
      const h = DRONE_H;

      // 프로펠러는 따로 만들어 좌우로 빠르게 늘었다 줄었다 하며 도는 것처럼 보이게 한다
      const rotors = [-w / 2 + 25, w / 2 - 25].map((rx) => {
        const r = this.add.rectangle(rx, -h / 2 - 10, 34, 5, 0xc0c8d8);
        this.tweens.add({ targets: r, scaleX: 0.15, duration: 70, yoyo: true, repeat: -1 });
        return r;
      });
      const g = this.add.graphics();
      g.fillStyle(0x8d99ae, 1);
      g.fillRect(-w / 2 + 23, -h / 2 - 8, 4, 8);
      g.fillRect(w / 2 - 27, -h / 2 - 8, 4, 8);
      g.fillStyle(0x2b2d42, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
      g.lineStyle(3, 0x9d4edd, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
      g.fillStyle(0xff3355, 1);
      g.fillCircle(0, h / 2 + 6, 4);
      if (decoy) {
        g.lineStyle(4, 0x9a9a9a, 1);
        g.lineBetween(-w / 2 + 12, -h / 2 + 10, w / 2 - 12, h / 2 - 10);
      }

      const c = this.add.container(W / 2, PORTAL_Y, [...rotors, g, text]).setDepth(DEPTH.world).setScale(0.2).setAlpha(0);
      const d = { c, text, w, h, isCorrect, decoy, done: false, y: PORTAL_Y, baseX: W / 2, phase: Math.random() * 6 };
      // 포털에서 튀어나와 자기 자리로 퍼진다
      this.tweens.add({ targets: c, scale: 1, alpha: decoy ? 0.3 : 1, duration: 500, delay, ease: 'Back.Out' });
      this.tweens.add({ targets: d, baseX: targetX, duration: 700, delay, ease: 'Sine.Out' });
      return d;
    }

    fadeOut(d, dy) {
      this.tweens.add({ targets: d.c, alpha: 0, y: d.c.y + dy, duration: 450, onComplete: () => d.c.destroy() });
    }

    /** (x, y) 근처에 있는, 맞힐 수 있는 드론 중 가장 가까운 것. 없으면 null. */
    droneNear(x, y) {
      let best = null;
      let bestDist = Infinity;
      for (const d of this.drones) {
        if (d.done || d.decoy) continue;
        const inX = Math.abs(x - d.c.x) <= d.w / 2 + LOCK_ON_PADDING;
        const inY = Math.abs(y - d.c.y) <= d.h / 2 + LOCK_ON_PADDING;
        const dist = Math.hypot(x - d.c.x, y - d.c.y);
        if (inX && inY && dist < bestDist) {
          best = d;
          bestDist = dist;
        }
      }
      return best;
    }

    // ---------- 발사와 판정 ----------

    /**
     * (tx, ty) 방향으로 거미줄을 쏜다. 그 위치에 드론이 있으면 그 드론을 따라가게(유도) 한다.
     * 연사 간격 안이거나 문제 사이 대기 중이면 무시한다.
     */
    fireAt(tx, ty) {
      if (!this.waveActive) return;
      const now = this.time.now;
      if (now - this.lastFire < (this.ab.cooldown || DEFAULT_COOLDOWN)) return;
      this.lastFire = now;

      this.player.setFlipX(tx < this.player.x - 10);
      const o = this.hand();
      const dx = tx - o.x;
      const dy = Math.min(ty - o.y, -20); // 항상 위쪽으로
      const len = Math.hypot(dx, dy);
      const speed = WEB_SPEED * (this.ab.webSpeed || 1);
      this.webs.push({
        x: o.x, y: o.y, vx: (dx / len) * speed, vy: (dy / len) * speed, speed,
        target: this.droneNear(tx, ty), dead: false,
      });
      // 발사 반동: 살짝 눌렸다 펴진다
      this.tweens.add({ targets: this.player, scaleY: 0.9, scaleX: 1.08, duration: 60, yoyo: true });
    }

    /** 정답 드론 명중: 점수 · 콤보 적립, 거미줄에 감기는 연출, 영어는 발음 읽기. */
    onCorrect(d) {
      d.done = true;
      const pts = this.awardCorrect(d.c.x, d.c.y);

      const wg = this.add.graphics();
      wg.lineStyle(2, this.shotColor, 0.95);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        wg.lineBetween(0, 0, Math.cos(a) * (d.w / 2 + 6), Math.sin(a) * (d.h / 2 + 6));
      }
      wg.strokeCircle(0, 0, 14);
      wg.strokeCircle(0, 0, 28);
      d.c.add(wg);

      this.popup(d.c.x, d.c.y - 50, `정답! +${pts}`, '#06d6a0');
      if (this.q.speak) A.speak(this.q.speak);
      this.tweens.add({
        targets: d.c, y: d.c.y - 40, scale: 0.6, alpha: 0, delay: 350, duration: 600,
        onComplete: () => d.c.destroy(),
      });
      this.endWave(NEXT_DELAY_CORRECT);
    }

    /**
     * 오답 드론 명중: 하트 -1. 문제는 넘어가지 않고 정답 드론이 남아 있어 다시 도전할 수 있다.
     * (틀렸을 때 바로 정답을 찾아보게 하는 것이 학습 효과가 크다)
     */
    onWrong(d) {
      d.done = true;
      this.penalize();
      d.text.setColor('#ff5c5c');
      this.popup(d.c.x, d.c.y - 50, '앗! 다시 해 봐요', '#ff5c5c');
      this.tweens.add({
        targets: d.c, angle: { from: -10, to: 10 }, duration: 60, yoyo: true, repeat: 3,
        onComplete: () => this.fadeOut(d, 40),
      });
      if (this.hearts <= 0) this.endWave(NEXT_DELAY_CORRECT);
    }

    /** 정답 드론이 위험선을 넘음: 하트 -1, 정답을 보여 주고 다음 문제로. */
    onMissed(d) {
      d.done = true;
      this.penalize();
      d.text.setColor('#ffd166');
      this.popup(d.c.x, d.c.y - 50, `정답은 ${this.q.answer}`, '#ffd166');
      this.time.delayedCall(700, () => this.fadeOut(d, 20));
      this.endWave(NEXT_DELAY_MISSED);
    }

    // ---------- 매 프레임 ----------

    update(time, delta) {
      if (this.ended) return;
      // 탭 전환 등으로 프레임이 크게 밀려도 드론이 순간이동하지 않도록 최대 50ms 로 자른다
      const s = Math.min(delta, 50) / 1000;
      const k = this.keys;

      let dir = 0;
      if (k.LEFT.isDown || k.A.isDown) dir -= 1;
      if (k.RIGHT.isDown || k.D.isDown) dir += 1;
      if (dir !== 0) {
        this.player.x = Phaser.Math.Clamp(this.player.x + dir * MOVE_SPEED * s, 50, W - 50);
        this.player.setFlipX(dir < 0);
      }
      if (Phaser.Input.Keyboard.JustDown(k.SPACE)) this.fireAt(this.hand().x, 0);

      for (const d of this.drones) {
        if (d.done) continue;
        d.y += this.fallSpeed * s;
        d.c.y = d.y;
        d.c.x = d.baseX + Math.sin(time / 500 + d.phase) * 8;
        d.c.angle = Math.cos(time / 500 + d.phase) * 6; // 흔들리는 방향으로 기울어 떠 있는 느낌
        if (d.y > MISS_Y) {
          if (d.isCorrect) this.onMissed(d);
          else { d.done = true; this.fadeOut(d, 20); }
        }
      }

      // 거미줄 이동과 명중 판정 (드론 사각형을 판정 여유 r 만큼 넓혀서 검사)
      const r = this.ab.hitRadius || DEFAULT_HIT_RADIUS;
      for (const w of this.webs) {
        if (w.target && !w.target.done) {
          // 유도: 매 프레임 목표 드론의 현재 위치를 향하도록 방향을 다시 잡는다
          const tdx = w.target.c.x - w.x;
          const tdy = w.target.c.y - w.y;
          const tl = Math.hypot(tdx, tdy) || 1;
          w.vx = (tdx / tl) * w.speed;
          w.vy = (tdy / tl) * w.speed;
        }
        w.x += w.vx * s;
        w.y += w.vy * s;
        if (w.x < -20 || w.x > W + 20 || w.y < -20 || w.y > H) w.dead = true;
        if (w.dead) continue;
        for (const d of this.drones) {
          if (d.done || d.decoy) continue;
          if (Math.abs(w.x - d.c.x) <= d.w / 2 + r && Math.abs(w.y - d.c.y) <= d.h / 2 + r) {
            w.dead = true;
            if (d.isCorrect) this.onCorrect(d);
            else this.onWrong(d);
            break;
          }
        }
      }
      this.webs = this.webs.filter((w) => !w.dead);

      const g = this.webGfx;
      g.clear();
      const o = this.hand();
      for (const w of this.webs) {
        g.lineStyle(2, this.shotColor, 0.85);
        g.lineBetween(o.x, o.y, w.x, w.y);
        g.fillStyle(this.shotColor, 1);
        g.fillCircle(w.x, w.y, r > 14 ? 9 : 5);
      }
    }
  }

  A.GAME_MODES.catch = CatchScene;
})(window.ARAH);

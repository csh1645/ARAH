/**
 * @file 🏙️ 빌딩 스윙 모드. 옥상 간판에 보기가 적힌 빌딩들 중 정답 빌딩을 골라 건너간다.
 *       건너가는 방법은 히어로 팀마다 다르다 (거미줄 스윙 · 제트 비행 · 거인 점프 · 순간이동 …, game/travels.js).
 * @layer game
 * @depends A.RoundScene, A.GAME, A.util, A.RULES, A.speak, A.TRAVELS, A.findFamily
 * @see doc/planning/game-design.md (3.2 빌딩 스윙)
 *
 * 판정: 정답 빌딩 선택 → 스윙해서 착지, 다음 문제
 *       오답 빌딩 선택 → 건너가다 실패해 제자리로 떨어짐(문구는 팀마다 다름), 하트 -1, 같은 문제 계속
 *       제한 시간 초과 → 하트 -1, 정답을 알려 주고 그 빌딩으로 자동 스윙
 *
 * 드론 잡기보다 조준 부담이 없고(빌딩을 누르기만 하면 됨) 대신 시간 제한이 있다.
 * 손 조작이 서툰 아이도 "생각해서 고르는" 데 집중할 수 있다.
 */
(function (A) {
  'use strict';

  if (!A.RoundScene) return;

  const { W, H, FONT, DEPTH, HUD_H } = A.GAME;

  // ----- 화면 배치 (게임 좌표) -----
  const START_X = 115; // 히어로가 서 있는 현재 빌딩의 중심 x
  const START_W = 150;
  const START_ROOF = 430;
  const TARGET_LEFT = 260; // 보기 빌딩들이 놓이는 가로 구간
  const TARGET_RIGHT = 945;
  const ROOF_RANGE = [330, 440]; // 보기 빌딩 지붕 높이 범위 (높낮이가 달라야 도시 느낌이 난다)
  const SIGN_H = 56; // 옥상 간판 높이
  const SIGN_GAP = 10; // 지붕과 간판 사이
  const ANCHOR_RISE = 135; // 지붕에서 거미줄 고정점(안테나 끝)까지 높이
  const HERO_FOOT = 51; // 히어로 이미지 중심에서 발끝까지 거리
  const TIMER_Y = HUD_H + 4;
  const TIMER_H = 8;
  const BUILDING_COLORS = [0x23284f, 0x2d2350, 0x1f3350, 0x332a4f];

  // ----- 연출 시간 ms -----
  // 건너가는 이동 연출(시간 · 경로)은 팀마다 다르며 game/travels.js 에 있다
  const ZIGZAG_STEPS = 9; // 번개 자국을 그릴 마디 수
  const SCROLL_MS = 600; // 착지 후 화면이 다음 구간으로 넘어가는 시간
  const NEXT_DELAY = 1000;

  class SwingScene extends A.RoundScene {
    constructor() {
      super({ key: 'play' });
    }

    introText() {
      return `${this.hero.name} 출동!\n정답 빌딩으로 ${A.findFamily(this.hero).travelName}!`;
    }

    createWorld() {
      this.targets = [];
      this.selected = 0;
      this.keyboardUsed = false; // 키보드를 쓰기 전에는 선택 테두리를 숨긴다 (정답 힌트로 오해하지 않게)
      this.swinging = false;
      /** @type {TravelLine|null} 값이 있는 동안 매 프레임 그리는 줄 (거미줄 · 화살 줄 · 번개 자국 등) */
      this.line = null;
      this.landed = null;

      this.drawSky();
      const g = this.add.graphics().setDepth(DEPTH.bg);
      // 멀리 있는 도시는 어둡게 그려 앞쪽 빌딩과 거리감을 준다
      this.drawCity(g, H, 0x141838, [220, 360]);

      this.current = this.makeBuilding(START_X, START_ROOF, START_W, null);
      this.createHero(START_X, START_ROOF - HERO_FOOT);
      this.webGfx = this.add.graphics().setDepth(DEPTH.web);
      this.timerGfx = this.add.graphics().setDepth(DEPTH.hud);

      this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,SPACE,ENTER,ONE,TWO,THREE,FOUR');
      this.input.on('pointerdown', (p) => {
        const b = this.buildingAt(p.worldX, p.worldY);
        if (b) this.choose(b);
      });
    }

    // ---------- 빌딩 ----------

    /**
     * 빌딩 하나를 만든다. label 이 있으면 옥상 간판과 거미줄 고정용 안테나를 단다.
     * @param {number} cx 중심 x
     * @param {number} roofY 지붕 y
     * @param {number} w 너비
     * @param {string|null} label 간판 문구 (null 이면 간판 없음)
     */
    makeBuilding(cx, roofY, w, label) {
      const c = this.add.container(cx, 0).setDepth(DEPTH.world);
      const g = this.add.graphics();
      g.fillStyle(A.util.pick(BUILDING_COLORS), 1);
      g.fillRect(-w / 2, roofY, w, H - roofY);
      g.fillStyle(0x3b4170, 1);
      g.fillRect(-w / 2 - 4, roofY - 6, w + 8, 8); // 옥상 난간
      g.fillStyle(0xffd166, 0.55);
      for (let y = roofY + 18; y < H - 10; y += 24) {
        for (let x = -w / 2 + 12; x < w / 2 - 12; x += 20) {
          if (Math.random() < 0.4) g.fillRect(x, y, 9, 11);
        }
      }
      c.add(g);
      const b = { c, roofY, w, label, isCorrect: false, used: false, signParts: [] };
      if (label === null) return b;

      const size = label.length > 7 ? 20 : label.length > 4 ? 26 : 32;
      const signBottom = roofY - SIGN_GAP;
      const signTop = signBottom - SIGN_H;
      const text = this.add
        .text(0, (signTop + signBottom) / 2 + 2, label, { fontFamily: FONT, fontSize: `${size}px`, color: '#ffffff' })
        .setOrigin(0.5);
      const sw = Math.max(84, text.width + 28);
      b.anchorY = Math.max(HUD_H + 40, roofY - ANCHOR_RISE);

      const s = this.add.graphics();
      s.lineStyle(4, 0x8d99ae, 1);
      s.lineBetween(0, signTop, 0, b.anchorY); // 안테나
      s.lineBetween(-sw / 2 + 14, signBottom, -sw / 2 + 14, roofY); // 간판 다리
      s.lineBetween(sw / 2 - 14, signBottom, sw / 2 - 14, roofY);
      s.fillStyle(0xff4d6d, 1);
      s.fillCircle(0, b.anchorY, 6);
      s.fillStyle(0x111633, 1);
      s.fillRoundedRect(-sw / 2, signTop, sw, SIGN_H, 12);
      s.lineStyle(3, 0x4cc9f0, 1);
      s.strokeRoundedRect(-sw / 2, signTop, sw, SIGN_H, 12);

      // 키보드 선택 표시
      const hl = this.add.graphics();
      hl.lineStyle(5, 0xffd166, 1);
      hl.strokeRoundedRect(-sw / 2 - 6, signTop - 6, sw + 12, SIGN_H + 12, 16);
      hl.setVisible(false);

      c.add([s, text, hl]);
      Object.assign(b, { text, hl, signW: sw, signParts: [s, text, hl] });
      return b;
    }

    startWave(q) {
      const n = q.choices.length;
      const slot = (TARGET_RIGHT - TARGET_LEFT) / n;
      const w = Math.min(140, slot - 24);
      const decoyIdx = this.decoyIndex(q);

      // q.choices 는 이미 섞여 있으므로 그 순서대로 왼쪽부터 놓는다
      this.targets = q.choices.map((label, i) => {
        const cx = TARGET_LEFT + slot * (i + 0.5);
        const b = this.makeBuilding(cx, A.util.rand(ROOF_RANGE[0], ROOF_RANGE[1]), w, label);
        b.isCorrect = label === q.answer;
        if (i === decoyIdx) {
          b.used = true;
          b.c.setAlpha(0.3);
        }
        // 오른쪽 화면 밖에서 밀려 들어온다
        b.c.x = cx + W;
        this.tweens.add({ targets: b.c, x: cx, duration: 500, delay: i * 80, ease: 'Cubic.Out' });
        return b;
      });

      this.selected = this.targets.findIndex((b) => !b.used);
      this.updateHighlight();
      const base = A.RULES.swingTimeByLevel[this.opts.level];
      this.timeLimit = this.timeLimitMs(base);
      this.timeLeft = this.timeLimit;
      this.swinging = false;
    }

    /** 착지한 빌딩을 왼쪽 시작 위치로 옮기고 나머지는 화면 밖으로 흘려보낸다. */
    clearWave() {
      this.timerGfx.clear();
      this.line = null;
      const landed = this.landed;
      this.landed = null;
      const dx = landed ? START_X - landed.c.x : 0;

      for (const b of [this.current, ...this.targets]) {
        if (!b || b === landed) continue;
        this.tweens.add({
          targets: b.c, x: b.c.x + dx, alpha: 0, duration: SCROLL_MS,
          onComplete: () => b.c.destroy(),
        });
      }
      if (landed) {
        landed.signParts.forEach((o) => o.setVisible(false));
        this.tweens.add({ targets: landed.c, x: START_X, duration: SCROLL_MS, ease: 'Sine.InOut' });
        this.tweens.add({ targets: this.player, x: this.player.x + dx, duration: SCROLL_MS, ease: 'Sine.InOut' });
        this.current = landed;
      }
      this.targets = [];
    }

    /** 누른 위치가 속한 보기 빌딩 (안테나 끝부터 바닥까지의 세로 띠). 없으면 null. */
    buildingAt(x, y) {
      for (const b of this.targets) {
        if (b.used) continue;
        const half = Math.max(b.w, b.signW) / 2 + 8;
        if (Math.abs(x - b.c.x) <= half && y >= b.anchorY - 30) return b;
      }
      return null;
    }

    updateHighlight() {
      this.targets.forEach((b, i) => b.hl.setVisible(this.keyboardUsed && i === this.selected && !b.used));
    }

    /** 키보드 ← → 로 선택을 옮긴다. 이미 고른(틀린) 빌딩은 건너뛴다. */
    moveSelection(step) {
      const n = this.targets.length;
      for (let k = 1; k <= n; k++) {
        const i = (this.selected + step * k + n * k) % n;
        if (!this.targets[i].used) {
          this.selected = i;
          break;
        }
      }
      this.updateHighlight();
    }

    // ---------- 선택과 스윙 ----------

    choose(b) {
      if (!this.waveActive || this.swinging || !b || b.used) return;
      if (b.isCorrect) this.swingTo(b, true);
      else this.failSwing(b);
    }

    /**
     * 빌딩 b 로 건너간다. 방법은 히어로 팀에 따라 다르다 (거미줄 스윙 · 제트 비행 · 순간이동 …, game/travels.js).
     * @param {boolean} earned 점수를 줄지 여부 (시간 초과로 자동 이동할 때는 false)
     */
    swingTo(b, earned) {
      this.swinging = true;
      this.player.setFlipX(false);
      const family = A.findFamily(this.hero);
      const travel = A.TRAVELS[family.travel] || A.TRAVELS.swing;
      travel({
        scene: this,
        from: { x: this.player.x, y: this.player.y },
        to: { x: b.c.x, y: b.roofY - HERO_FOOT },
        anchor: { x: b.c.x, y: b.anchorY },
        color: this.shotColor,
        setLine: (line) => { this.line = line; },
        done: () => {
          // 이동 연출이 바꾼 모양을 원래대로 되돌린다
          this.line = null;
          this.player.setAngle(0).setScale(1).setAlpha(1);
          this.land(b, earned);
        },
      });
    }

    land(b, earned) {
      this.tweens.add({ targets: this.player, scaleY: 0.85, duration: 90, yoyo: true }); // 착지 반동
      if (earned) {
        const pts = this.awardCorrect(b.c.x, b.roofY - 40);
        b.text.setColor('#06d6a0');
        this.popup(b.c.x, b.roofY - 120, `정답! +${pts}`, '#06d6a0');
        if (this.q.speak) A.speak(this.q.speak);
      }
      this.landed = b;
      this.endWave(NEXT_DELAY);
    }

    /** 오답: 건너가려다 실패해서 제자리로 떨어진다 (문구는 팀마다 다름). 같은 문제는 계속된다. */
    failSwing(b) {
      this.swinging = true;
      b.used = true;
      b.text.setColor('#ff5c5c');
      b.c.setAlpha(0.4);
      this.penalize();
      this.line = { to: { x: b.c.x, y: b.anchorY }, color: this.shotColor };

      const y0 = this.player.y;
      this.tweens.add({
        targets: this.player, y: y0 - 50, duration: 220, yoyo: true, ease: 'Quad.Out',
        onYoyo: () => {
          this.line = null; // 줄이 끊어짐
          this.popup(b.c.x, b.roofY - 120, A.findFamily(this.hero).fail, '#ff5c5c');
        },
        onComplete: () => {
          this.swinging = false;
          if (this.hearts <= 0) this.endWave(NEXT_DELAY);
          else this.moveSelection(1);
        },
      });
    }

    /** 시간 초과: 정답을 알려 주고 그 빌딩으로 자동 스윙 (점수 없음). */
    onTimeout() {
      const answer = this.targets.find((b) => b.isCorrect);
      this.penalize();
      answer.text.setColor('#ffd166');
      this.popup(answer.c.x, answer.roofY - 120, `시간 초과! 정답은 ${this.q.answer}`, '#ffd166');
      this.time.delayedCall(700, () => this.swingTo(answer, false));
      this.swinging = true; // 자동 스윙 전까지 입력을 막는다
    }

    // ---------- 매 프레임 ----------

    update(time, delta) {
      if (this.ended) return;
      const k = this.keys;
      const JustDown = Phaser.Input.Keyboard.JustDown;

      if (this.waveActive && !this.swinging) {
        if (JustDown(k.LEFT)) { this.keyboardUsed = true; this.moveSelection(-1); }
        if (JustDown(k.RIGHT)) { this.keyboardUsed = true; this.moveSelection(1); }
        if (JustDown(k.SPACE) || JustDown(k.ENTER)) this.choose(this.targets[this.selected]);
        ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((name, i) => {
          if (JustDown(k[name])) this.choose(this.targets[i]);
        });

        this.timeLeft -= delta;
        if (this.timeLeft <= 0) this.onTimeout();
      }

      // 남은 시간 막대 (30% 아래로 떨어지면 빨간색)
      const tg = this.timerGfx;
      tg.clear();
      if (this.waveActive && this.timeLimit) {
        const frac = Phaser.Math.Clamp(this.timeLeft / this.timeLimit, 0, 1);
        tg.fillStyle(0x000000, 0.4);
        tg.fillRect(0, TIMER_Y, W, TIMER_H);
        tg.fillStyle(frac > 0.3 ? 0x4cc9f0 : 0xff4d6d, 1);
        tg.fillRect(0, TIMER_Y, W * frac, TIMER_H);
      }

      this.drawLine();
    }

    /** 이동 연출이 지정한 줄(this.line)을 그린다. 번개는 매 프레임 모양이 바뀌는 지그재그로. */
    drawLine() {
      const g = this.webGfx;
      g.clear();
      const line = this.line;
      if (!line) return;
      const o = line.from || this.hand();
      const to = line.to;
      g.lineStyle(line.zigzag ? 4 : 3, line.color, 0.95);
      if (line.zigzag) {
        const steps = ZIGZAG_STEPS;
        g.beginPath();
        g.moveTo(o.x, o.y);
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          g.lineTo(o.x + (to.x - o.x) * t + A.util.rand(-10, 10), o.y + (to.y - o.y) * t + A.util.rand(-10, 10));
        }
        g.lineTo(to.x, to.y);
        g.strokePath();
        return;
      }
      g.lineBetween(o.x, o.y, to.x, to.y);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(to.x, to.y, 5);
    }
  }

  A.GAME_MODES.swing = SwingScene;
})(window.ARAH);

/**
 * @file 👾 보스 배틀 모드 (연속 정답). 체력바가 있는 거대 악당 로봇과 싸운다.
 * @layer game
 * @depends A.RoundScene, A.GAME, A.util, A.speak
 * @see doc/planning/game-design.md (3.6 보스 배틀)
 *
 * 판정: 정답 버튼 → 줄 공격으로 보스 체력 -1 (3콤보 이상이면 크리티컬 -2)
 *       오답 버튼 → 보스가 막고 공격 충전이 빨라진다 (하트는 그대로, 그 버튼은 다시 못 고름)
 *       공격 충전이 가득 차면 → 보스 공격: 하트 -1, 정답을 알려 주고 다음 문제
 * 끝: 보스 체력 0 → 승리(그 자리에서 판 종료) / 하트 0 → 패배 / 문제를 다 쓰면 → 보스가 도망감
 * 조작: 답 버튼 터치 · 클릭, 또는 숫자 1~4 키.
 */
(function (A) {
  'use strict';

  if (!A.RoundScene) return;

  const { W, FONT, DEPTH } = A.GAME;

  // ----- 배치 -----
  const BOSS_X = 600;
  const BOSS_Y = 270;
  const HERO_X = 150;
  const HERO_Y = 440;
  const BTN_Y = 568;
  const BTN_H = 74;
  const HP_Y = 128; // 보스 체력바
  const CHARGE_Y = 400; // 보스 공격 충전바

  // ----- 규칙 · 연출 -----
  const BOSS_HP = 8;
  const CRIT_COMBO = 3; // 이 콤보부터 크리티컬 (데미지 2)
  const CHARGE_SEC_BY_LEVEL = { 1: 13, 2: 12, 3: 11, 4: 10, 5: 10, 6: 9 }; // 보스 공격까지 시간
  const WRONG_CHARGE = 0.3; // 오답이면 충전이 이만큼 늘어난다
  const SHOT_MS = 200;
  const BOSSES = [
    { name: '메가 드론 킹', body: 0x4a4e69, plate: 0x22223b, eye: 0xff3355, horn: 0x9d4edd },
    { name: '어둠 로봇', body: 0x2b2d42, plate: 0x111827, eye: 0x00f5d4, horn: 0xff9f1c },
    { name: '번개 골렘', body: 0x5c677d, plate: 0x33415c, eye: 0xffd166, horn: 0x4cc9f0 },
  ];

  class BossScene extends A.RoundScene {
    constructor() {
      super({ key: 'play' });
    }

    introText() {
      return `${this.hero.name} 출동!\n정답으로 ${this.boss.name}을 물리쳐요`;
    }

    createWorld() {
      this.boss = A.util.pick(BOSSES);
      this.bossHp = BOSS_HP;
      this.victory = false;
      this.buttons = [];
      this.busy = false;
      this.charge = 0;
      this.shot = null; // { from, to, color, t } 줄 공격 그리기

      this.drawSky();
      const g = this.add.graphics().setDepth(DEPTH.bg);
      this.drawCity(g, 640, 0x1a1f45, [120, 260]);
      g.fillStyle(0x2a2e5c, 1);
      g.fillRect(0, 500, W, 140); // 아래쪽 버튼 영역 바닥

      this.createHero(HERO_X, HERO_Y);
      this.player.setScale(1.3);
      this.tweens.add({ targets: this.player, y: HERO_Y - 5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.makeBoss();
      this.hpGfx = this.add.graphics().setDepth(DEPTH.world + 2);
      this.chargeGfx = this.add.graphics().setDepth(DEPTH.world + 2);
      this.add.text(BOSS_X, HP_Y - 22, this.boss.name, {
        fontFamily: FONT, fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(DEPTH.world + 2);
      this.webGfx = this.add.graphics().setDepth(DEPTH.web);
      this.drawHp();

      this.input.keyboard.on('keydown', (e) => {
        const n = Number(e.key);
        if (n >= 1 && n <= this.buttons.length) this.choose(this.buttons[n - 1]);
      });
    }

    /** 보스 로봇 (코드로 그린 오리지널 악당) */
    makeBoss() {
      const b = this.boss;
      const g = this.add.graphics();
      g.fillStyle(b.horn, 1); // 뿔
      g.fillTriangle(-90, -70, -60, -150, -40, -80);
      g.fillTriangle(90, -70, 60, -150, 40, -80);
      g.fillStyle(b.body, 1); // 집게 팔
      g.fillRoundedRect(-170, -20, 60, 30, 12);
      g.fillRoundedRect(110, -20, 60, 30, 12);
      g.fillStyle(b.plate, 1);
      g.fillCircle(-175, -5, 22);
      g.fillCircle(175, -5, 22);
      g.fillStyle(b.body, 1); // 몸통
      g.fillRoundedRect(-115, -100, 230, 190, 40);
      g.fillStyle(b.plate, 1);
      g.fillRoundedRect(-85, -60, 170, 70, 20); // 얼굴판
      g.fillStyle(0xffffff, 0.12);
      g.fillRoundedRect(-100, -92, 90, 30, 14); // 하이라이트
      g.fillStyle(b.eye, 1); // 눈
      g.fillCircle(-40, -25, 16);
      g.fillCircle(40, -25, 16);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(-35, -30, 5);
      g.fillCircle(45, -30, 5);
      g.fillStyle(0x0b0b14, 1); // 입 그릴
      g.fillRoundedRect(-55, 30, 110, 30, 8);
      g.lineStyle(3, b.eye, 0.8);
      for (let x = -40; x <= 40; x += 20) g.lineBetween(x, 32, x, 58);
      const flash = this.add.rectangle(0, -5, 240, 200, 0xffffff, 0).setOrigin(0.5); // 맞았을 때 번쩍임
      this.bossC = this.add.container(BOSS_X, BOSS_Y, [g, flash]).setDepth(DEPTH.world);
      this.bossFlash = flash;
      this.tweens.add({ targets: this.bossC, y: BOSS_Y - 10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }

    drawHp() {
      const g = this.hpGfx;
      g.clear();
      const w = 320;
      g.fillStyle(0x000000, 0.6);
      g.fillRoundedRect(BOSS_X - w / 2 - 3, HP_Y - 3, w + 6, 22, 8);
      const frac = Math.max(0, this.bossHp / BOSS_HP);
      g.fillStyle(frac > 0.5 ? 0x06d6a0 : frac > 0.25 ? 0xffd166 : 0xff3355, 1);
      g.fillRoundedRect(BOSS_X - w / 2, HP_Y, w * frac, 16, 6);
    }

    drawCharge() {
      const g = this.chargeGfx;
      g.clear();
      if (!this.waveActive) return;
      const w = 240;
      g.fillStyle(0x000000, 0.55);
      g.fillRoundedRect(BOSS_X - w / 2 - 2, CHARGE_Y - 2, w + 4, 14, 6);
      g.fillStyle(0xff3355, 0.4 + 0.6 * this.charge);
      g.fillRoundedRect(BOSS_X - w / 2, CHARGE_Y, w * Math.min(1, this.charge), 10, 5);
    }

    // ---------- 답 버튼 ----------

    startWave(q) {
      const n = q.choices.length;
      const bw = Math.min(200, (W - 60 - (n - 1) * 16) / n);
      const x0 = W / 2 - ((n - 1) * (bw + 16)) / 2;
      this.buttons = q.choices.map((label, i) => this.makeButton(label, label === q.answer, x0 + i * (bw + 16), bw, i, !!q.pictureChoices));
      const decoy = this.decoyIndex(q); // buttons[i] 는 q.choices[i] 와 같은 순서
      if (decoy >= 0) this.disableButton(this.buttons[decoy]);
      this.chargeMs = this.timeLimitMs(CHARGE_SEC_BY_LEVEL[this.opts.level]);
      this.charge = 0;
      this.busy = false;
    }

    makeButton(label, isCorrect, x, w, i, picture) {
      const g = this.add.graphics();
      g.fillStyle(0x1d2d5c, 1);
      g.fillRoundedRect(-w / 2, -BTN_H / 2, w, BTN_H, 16);
      g.lineStyle(3, this.shotColor, 0.9);
      g.strokeRoundedRect(-w / 2, -BTN_H / 2, w, BTN_H, 16);
      const size = picture ? 40 : label.length > 8 ? 22 : label.length > 5 ? 28 : 34;
      const t = this.add.text(0, 2, label, { fontFamily: FONT, fontSize: `${size}px`, color: '#ffffff' }).setOrigin(0.5);
      const num = this.add.text(-w / 2 + 10, -BTN_H / 2 + 5, String(i + 1), { fontFamily: FONT, fontSize: '14px', color: '#8d99ae' });
      const c = this.add.container(x, BTN_Y, [g, t, num]).setDepth(DEPTH.world + 3).setScale(0.6).setAlpha(0);
      c.setSize(w, BTN_H).setInteractive({ useHandCursor: true });
      const btn = { c, g, t, w, isCorrect, used: false };
      c.on('pointerdown', () => this.choose(btn));
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, delay: i * 50, ease: 'Back.Out' });
      return btn;
    }

    disableButton(btn) {
      btn.used = true;
      btn.c.setAlpha(0.35);
      btn.c.disableInteractive();
    }

    clearWave() {
      for (const b of this.buttons) {
        this.tweens.killTweensOf(b.c);
        this.tweens.add({ targets: b.c, alpha: 0, scale: 0.7, duration: 200, delay: 300, onComplete: () => b.c.destroy() });
      }
      this.buttons = [];
      this.drawCharge();
    }

    // ---------- 전투 ----------

    choose(btn) {
      if (!this.waveActive || this.busy || !btn || btn.used) return;
      if (btn.isCorrect) this.attack(btn);
      else this.blocked(btn);
    }

    /** 정답: 히어로가 줄 공격 → 보스 체력 감소 (콤보가 높으면 크리티컬) */
    attack(btn) {
      this.busy = true;
      btn.t.setColor('#06d6a0');
      const pts = this.awardCorrect(BOSS_X, BOSS_Y);
      const crit = this.combo >= CRIT_COMBO;
      const dmg = crit ? 2 : 1;
      if (this.q.speak) A.speak(this.q.speak);
      const tip = { ...this.hand() };
      this.shot = { to: tip, color: this.shotColor };
      this.shotSfx();
      this.tweens.add({ targets: this.player, scaleX: 1.4, scaleY: 1.2, duration: 70, yoyo: true });
      this.tweens.add({
        targets: tip, x: BOSS_X, y: BOSS_Y, duration: SHOT_MS / (this.ab.webSpeed || 1),
        onComplete: () => {
          this.shot = null;
          this.sfx('hit');
          this.bossHp = Math.max(0, this.bossHp - dmg);
          this.drawHp();
          this.bossFlash.setFillStyle(0xffffff, 0.7);
          this.tweens.add({ targets: this.bossFlash, fillAlpha: 0, duration: 250 });
          this.tweens.add({ targets: this.bossC, x: BOSS_X + 12, duration: 50, yoyo: true, repeat: 3, onComplete: () => this.bossC.setX(BOSS_X) });
          this.popup(BOSS_X, BOSS_Y - 120, crit ? `크리티컬! -${dmg}  (+${pts})` : `-${dmg}  (+${pts})`, crit ? '#ff9f1c' : '#06d6a0');
          if (this.bossHp <= 0) this.defeatBoss();
          else this.endWave(650);
        },
      });
    }

    /** 오답: 보스가 막고, 보스 공격 충전이 빨라진다 (하트는 그대로) */
    blocked(btn) {
      this.disableButton(btn);
      btn.t.setColor('#ff5c5c');
      this.penalize(false);
      this.charge = Math.min(0.99, this.charge + WRONG_CHARGE);
      this.popup(BOSS_X, BOSS_Y - 120, '막았다! 다른 답을 골라요', '#ff5c5c');
    }

    /** 충전이 가득 참: 보스 레이저 공격 → 하트 -1, 정답 알려 주고 다음 문제 */
    bossAttack() {
      this.busy = true;
      this.sfx('bossAttack');
      this.penalize(true);
      const right = this.buttons.find((b) => b.isCorrect);
      if (right) right.t.setColor('#ffd166');
      this.shot = { to: { x: this.player.x, y: this.player.y }, from: { x: BOSS_X, y: BOSS_Y }, color: 0xff3355 };
      this.time.delayedCall(350, () => { this.shot = null; });
      this.tweens.add({ targets: this.player, x: HERO_X - 20, duration: 80, yoyo: true, repeat: 2 });
      this.popup(this.player.x + 40, HERO_Y - 110, `보스의 공격! 정답은 ${this.q.answer}`, '#ffd166');
      this.endWave(1500);
    }

    defeatBoss() {
      this.victory = true;
      for (let i = 0; i < 4; i++) {
        this.time.delayedCall(i * 160, () => this.burster.explode(30, BOSS_X + A.util.rand(-90, 90), BOSS_Y + A.util.rand(-70, 70)));
      }
      this.tweens.killTweensOf(this.bossC);
      this.tweens.add({ targets: this.bossC, angle: 25, alpha: 0, y: BOSS_Y + 60, scale: 0.7, duration: 900, delay: 300 });
      this.flashScreen(0xffffff, 0.6);
      this.totalQuestions = this.qIndex; // 이긴 즉시 판을 끝낸다
      this.updateHud();
      this.endWave(900);
    }

    /** 보스 배틀은 긴장감 있는 배경음 */
    musicName() {
      return 'boss';
    }

    finishMessage(perfect) {
      if (this.victory) return perfect ? '퍼펙트 보스 격파!' : '보스 격파!';
      if (this.hearts <= 0) return '조금만 더 힘내요!';
      return '보스가 도망갔어요! 다음엔 꼭!';
    }

    // ---------- 매 프레임 ----------

    update(time, delta) {
      if (this.ended) return;
      if (this.waveActive && !this.busy) {
        this.charge += delta / this.chargeMs;
        if (this.charge >= 1) this.bossAttack();
      }
      this.drawCharge();
      const g = this.webGfx;
      g.clear();
      if (this.shot) {
        const from = this.shot.from || this.hand();
        g.lineStyle(this.shot.from ? 6 : 3, this.shot.color, 0.95);
        g.lineBetween(from.x, from.y, this.shot.to.x, this.shot.to.y);
        g.fillStyle(this.shot.color, 1);
        g.fillCircle(this.shot.to.x, this.shot.to.y, 6);
      }
    }
  }

  A.GAME_MODES.boss = BossScene;
})(window.ARAH);

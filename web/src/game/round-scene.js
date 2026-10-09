/**
 * @file 모든 게임 모드가 공유하는 "한 판" 규칙의 기반 장면 클래스.
 *       하트 · 점수 · 콤보 · 문제 진행 · HUD · 결과 전달을 담당하고,
 *       모드별 화면과 조작은 하위 클래스(game/modes/*)가 구현한다.
 * @layer game
 * @depends Phaser 3, A.util, A.RULES, A.makeQuestion, A.drawHero
 * @see doc/planning/game-design.md (3. 핵심 루프, 6. 점수와 보상)
 *
 * 하위 클래스가 구현할 훅(hook):
 *   introText()     시작 안내 문구
 *   questionOptions() 원하는 문제 형식 (선택, 기본 {})
 *   createWorld()   배경 · 히어로 · 입력 준비
 *   startWave(q)    문제 q 의 보기들을 화면에 배치
 *   clearWave()     현재 문제의 보기들을 정리 (endWave 가 호출)
 *
 * 하위 클래스가 쓰는 공통 기능:
 *   awardCorrect()  정답 처리 (점수 · 콤보) → 얻은 점수 반환
 *   penalize()      오답 · 놓침 처리 (하트 -1, 복습 목록 추가, 콤보 초기화)
 *   endWave(delay)  현재 문제를 끝내고 delay ms 뒤 다음 문제
 *
 * 게임 좌표는 960 x 640 고정이며, Phaser Scale.FIT 이 실제 화면 크기에 맞춰 늘리고 줄인다.
 */

/**
 * 한 판이 끝났을 때 ui 계층에 돌려주는 결과.
 * @typedef {Object} RoundResult
 * @property {number} score      총점
 * @property {number} total      실제로 낸 문제 수 (하트가 먼저 떨어지면 10보다 작다)
 * @property {number} firstTry   한 번에 맞힌 문제 수 (별 계산 기준)
 * @property {number} bestCombo  최고 연속 정답
 * @property {number} heartsLeft 남은 하트
 * @property {boolean} perfect   10문제를 모두 한 번에 맞혔는지
 * @property {Question[]} mistakes 틀리거나 놓친 문제 (복습용)
 */
(function (A) {
  'use strict';

  /** 모드 등록부. 각 모드 파일이 A.GAME_MODES[모드 id] = 장면 클래스 로 등록한다. */
  A.GAME_MODES = {};

  // Phaser 를 불러오지 못하면(오프라인 등) 장면 클래스를 만들 수 없다.
  // 이때도 메뉴는 떠야 하므로 여기서 조용히 멈추고, ui 가 안내 메시지를 띄운다.
  if (typeof Phaser === 'undefined') return;

  /** 모드들이 함께 쓰는 화면 상수 */
  const GAME = {
    W: 960,
    H: 640,
    HUD_H: 96, // 상단 HUD 높이. 게임 요소는 이 아래에 배치한다
    FONT: '"Jua", "Malgun Gothic", sans-serif',
    DEPTH: { bg: 0, world: 10, web: 20, hero: 30, popup: 40, hud: 50 },
    HERO_SIZE: { w: 96, h: 108 },
    HAND_OFFSET: { x: 31, y: -14 }, // 히어로 중심 기준 오른손 위치 (hero-art.js 의 팔 끝)
  };
  A.GAME = GAME;
  const { W, H, FONT, DEPTH } = GAME;

  const BASE_POINTS = 100;
  const COMBO_STEP = 20; // 콤보 1 늘 때마다 추가 점수
  const INTRO_MS = 1500;
  const RECENT_LIMIT = 8; // 최근 문제 몇 개와 겹치지 않게 할지

  // ----- 동적 연출 -----
  // 화면이 계속 살아 움직이면 아이의 시선이 게임에 머문다. 단, 문제 글자를 가리거나 너무 번쩍이지 않게 약하게 쓴다.
  const BURST_COLORS = [0xffd166, 0x06d6a0, 0x4cc9f0, 0xff4fa3, 0xffffff];
  const COMBO_MILESTONES = [3, 5, 7, 10]; // 이 콤보에 도달하면 큰 배너를 띄운다
  const SKY_DEPTH = -2; // 하늘 (가장 뒤)
  const AMBIENT_DEPTH = -1; // 별 반짝임 · 구름 · 서치라이트 (하늘 앞, 도시 뒤)

  class RoundScene extends Phaser.Scene {
    /**
     * A.startGame 이 넘겨준 데이터를 받는다.
     * @param {{opts: {hero: Hero, subject: string, level: 1|2|3, mode: string}, onEnd: (r: RoundResult) => void}} data
     */
    init(data) {
      this.opts = data.opts;
      this.onEnd = data.onEnd;
      this.hero = data.opts.hero;
      this.ab = this.hero.ability || {};
    }

    create() {
      this.maxHearts = this.ab.hearts || A.RULES.baseHearts;
      this.hearts = this.maxHearts;
      this.score = 0;
      this.combo = 0;
      this.bestCombo = 0;
      this.qIndex = 0;
      this.firstTry = 0;
      this.mistakes = [];
      this.recent = [];
      this.q = null;
      this.waveActive = false;
      this.ended = false;

      this.createFxTextures();
      this.burster = this.add.particles(0, 0, 'fx-spark', {
        speed: { min: 160, max: 420 },
        angle: { min: 0, max: 360 },
        lifespan: 750,
        gravityY: 300,
        scale: { start: 1.2, end: 0 },
        tint: BURST_COLORS,
        emitting: false,
      }).setDepth(DEPTH.popup);

      this.createWorld();
      this.createHud();
      this.showIntro(this.introText());
      this.time.delayedCall(INTRO_MS, () => this.nextQuestion());
    }

    // ---------- 하위 클래스 훅 (기본 구현) ----------

    introText() { return `${this.hero.name} 출동!`; }
    /** 이 모드가 원하는 문제 형식 (예: 그림 보기). @returns {QuestionOptions} */
    questionOptions() { return {}; }
    createWorld() {}
    startWave() {}
    clearWave() {}

    // ---------- 문제 진행 ----------

    /** 다음 문제를 고르고 하위 클래스에 배치를 맡긴다. 끝날 조건이면 finish 로 간다. */
    nextQuestion() {
      if (this.ended) return;
      if (this.hearts <= 0 || this.qIndex >= A.RULES.questionsPerRound) {
        this.finish();
        return;
      }

      // 최근에 나온 문제는 피해서 다시 뽑는다 (범위가 좁은 1단계에서 같은 문제 반복 방지)
      let q;
      for (let i = 0; i < 8; i++) {
        q = A.makeQuestion(this.opts.subject, this.opts.level, this.questionOptions());
        if (!this.recent.includes(q.key)) break;
      }
      this.recent.push(q.key);
      if (this.recent.length > RECENT_LIMIT) this.recent.shift();
      q.missed = false;
      this.q = q;
      this.qIndex++;

      this.qText.setText(q.prompt);
      this.hintText.setText(q.hint);
      this.qText.setScale(0.6);
      this.tweens.add({ targets: this.qText, scale: 1, duration: 300, ease: 'Back.Out' });
      this.updateHud();

      this.waveActive = true;
      this.startWave(q);
    }

    /**
     * 정답 처리. 한 번도 틀리지 않은 문제만 별(firstTry) 대상이다.
     * (x, y) 를 주면 그 자리에서 축하 연출(파티클 · 줌 펄스 · 콤보 배너)을 한다.
     * @param {number} [x]
     * @param {number} [y]
     * @returns {number} 이번에 얻은 점수
     */
    awardCorrect(x, y) {
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      if (!this.q.missed) this.firstTry++;
      const pts = BASE_POINTS + Math.round((this.combo - 1) * COMBO_STEP * (this.ab.comboBonus || 1));
      this.score += pts;
      this.updateHud();
      if (x !== undefined) this.celebrate(x, y);
      return pts;
    }

    /** 오답 · 놓침 처리: 하트 -1, 콤보 초기화, 복습 목록에 추가, 화면 흔들림 · 빨간 번쩍임. */
    penalize() {
      this.combo = 0;
      this.hearts = Math.max(0, this.hearts - 1);
      if (!this.q.missed) {
        this.q.missed = true;
        this.mistakes.push(this.q);
      }
      this.cameras.main.shake(160, 0.006);
      this.updateHud();
      this.flashScreen(0xff3355, 0.22);
      this.tweens.add({ targets: this.heartText, x: { from: 12, to: 24 }, duration: 50, yoyo: true, repeat: 3, onComplete: () => this.heartText.setX(18) });
    }

    // ---------- 동적 연출 (모든 모드 공통) ----------

    /** 파티클용 작은 텍스처를 코드로 만든다 (외부 이미지 없음). */
    createFxTextures() {
      if (this.textures.exists('fx-spark')) return;
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(6, 6, 6);
      g.generateTexture('fx-spark', 12, 12);
      g.destroy();
    }

    /**
     * 정답 축하: 불꽃 파티클, 화면 줌 펄스, 콤보 단계 배너.
     * @param {number} x
     * @param {number} y
     */
    celebrate(x, y) {
      const big = COMBO_MILESTONES.includes(this.combo);
      this.burster.explode(big ? 60 : 28, x, y);
      const cam = this.cameras.main;
      this.tweens.add({ targets: cam, zoom: big ? 1.06 : 1.03, duration: 110, yoyo: true, ease: 'Quad.Out' });
      this.tweens.add({ targets: this.comboText, scale: { from: 1.6, to: 1 }, duration: 250, ease: 'Back.Out' });
      if (big) this.comboBanner(this.combo);
    }

    /** 화면을 가로지르는 콤보 배너 (예: "🔥 5 콤보! 대단해요!") */
    comboBanner(combo) {
      const words = { 3: '좋아요!', 5: '대단해요!', 7: '최고예요!', 10: '전설의 히어로!' };
      const t = this.add
        .text(-300, 260, `🔥 ${combo} 콤보! ${words[combo] || ''}`, {
          fontFamily: FONT, fontSize: '48px', color: '#ff9f1c', stroke: '#000000', strokeThickness: 8,
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.popup);
      this.tweens.chain({
        targets: t,
        tweens: [
          { x: W / 2, duration: 350, ease: 'Back.Out' },
          { scale: 1.15, duration: 200, yoyo: true },
          { x: W + 300, alpha: 0, duration: 350, ease: 'Quad.In', delay: 250 },
        ],
        onComplete: () => t.destroy(),
      });
    }

    /** 화면 전체를 잠깐 색으로 번쩍인다 (오답: 빨강, 통과: 흰색 등). */
    flashScreen(color, alpha) {
      const r = this.add.rectangle(W / 2, H / 2, W, H, color, alpha).setDepth(DEPTH.popup);
      this.tweens.add({ targets: r, alpha: 0, duration: 320, onComplete: () => r.destroy() });
    }

    /** 히어로 잔상 하나를 남긴다. 스윙 · 대시처럼 빠르게 움직일 때 몇 프레임마다 부른다. */
    ghostTrail() {
      const p = this.player;
      const ghost = this.add
        .image(p.x, p.y, 'hero')
        .setAngle(p.angle)
        .setFlipX(p.flipX)
        .setScale(p.scaleX, p.scaleY)
        .setAlpha(0.35)
        .setTint(0x9be7ff)
        .setDepth(DEPTH.hero - 1);
      this.tweens.add({ targets: ghost, alpha: 0, duration: 260, onComplete: () => ghost.destroy() });
    }

    /**
     * 현재 문제를 끝내고 delay 뒤 다음 문제를 낸다.
     * 여러 판정이 한 프레임에 겹쳐도 한 번만 처리되도록 waveActive 로 막는다.
     * @param {number} delay ms
     */
    endWave(delay) {
      if (!this.waveActive) return;
      this.waveActive = false;
      this.clearWave();
      this.time.delayedCall(delay, () => this.nextQuestion());
    }

    finish() {
      if (this.ended) return;
      this.ended = true;
      const total = this.qIndex;
      const perfect = total === A.RULES.questionsPerRound && this.firstTry === total;
      const msg = this.hearts <= 0 ? '조금만 더 힘내요!' : perfect ? '퍼펙트 미션!' : '미션 완료!';
      this.qText.setText('');
      this.hintText.setText('');
      const t = this.add
        .text(W / 2, 300, msg, { fontFamily: FONT, fontSize: '60px', color: '#ffd166', stroke: '#000000', strokeThickness: 8 })
        .setOrigin(0.5)
        .setDepth(DEPTH.popup)
        .setScale(0.3);
      this.tweens.add({ targets: t, scale: 1, duration: 500, ease: 'Back.Out' });
      this.time.delayedCall(1700, () =>
        this.onEnd({
          score: this.score,
          total,
          firstTry: this.firstTry,
          bestCombo: this.bestCombo,
          heartsLeft: this.hearts,
          perfect,
          mistakes: this.mistakes,
        }));
    }

    // ---------- 공통 화면 요소 ----------

    /**
     * 살아 움직이는 밤하늘: 그라데이션, 별(일부 반짝임), 달, 구름, 서치라이트, 별똥별.
     * 자체 깊이(SKY_DEPTH, AMBIENT_DEPTH)를 써서 모드가 그리는 도시 · 건물보다 항상 뒤에 놓인다.
     */
    drawSky() {
      const { rand } = A.util;
      const g = this.add.graphics().setDepth(SKY_DEPTH);
      g.fillGradientStyle(0x0b1026, 0x0b1026, 0x41206b, 0x41206b, 1);
      g.fillRect(0, 0, W, H);
      g.fillStyle(0xffffff, 0.8);
      for (let i = 0; i < 70; i++) g.fillCircle(rand(0, W), rand(100, 380), Math.random() * 1.4 + 0.3);

      // 반짝이는 별
      for (let i = 0; i < 18; i++) {
        const star = this.add.circle(rand(0, W), rand(100, 360), Math.random() * 1.5 + 1, 0xffffff).setDepth(AMBIENT_DEPTH);
        this.tweens.add({
          targets: star, alpha: { from: 1, to: 0.15 }, duration: rand(600, 1600), yoyo: true, repeat: -1, delay: rand(0, 1500),
        });
      }

      // 달 (은은하게 숨쉬는 빛무리)
      const glow = this.add.circle(850, 175, 56, 0xfff3c4, 0.15).setDepth(AMBIENT_DEPTH);
      this.tweens.add({ targets: glow, scale: 1.25, alpha: 0.05, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.add.circle(850, 175, 34, 0xfff3c4).setDepth(AMBIENT_DEPTH);

      // 서치라이트 두 줄기 (도시 뒤에서 좌우로 흔들림)
      [[200, -22], [700, 18]].forEach(([x, start]) => {
        const beam = this.add.triangle(x, 640, 0, 0, -45, -560, 45, -560, 0x9be7ff, 0.07)
          .setOrigin(0.5, 1)
          .setDepth(AMBIENT_DEPTH)
          .setAngle(start);
        this.tweens.add({ targets: beam, angle: -start, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      });

      // 천천히 흘러가는 구름
      for (let i = 0; i < 3; i++) {
        const cloud = this.add.ellipse(rand(0, W), rand(120, 260), rand(160, 260), rand(28, 44), 0x2d2f63, 0.55)
          .setDepth(AMBIENT_DEPTH);
        this.tweens.add({
          targets: cloud, x: { from: -150, to: W + 150 }, duration: rand(28000, 45000), repeat: -1,
          delay: -rand(0, 30000), // 음수 지연: 처음부터 화면 곳곳에 퍼져 있게
        });
      }

      // 가끔 지나가는 별똥별
      this.time.addEvent({
        delay: 4500, loop: true,
        callback: () => {
          const sx = rand(300, W);
          const sy = rand(105, 200);
          const meteor = this.add.rectangle(sx, sy, 70, 2, 0xffffff, 0.9).setAngle(-160).setDepth(AMBIENT_DEPTH);
          this.tweens.add({ targets: meteor, x: sx - 260, y: sy + 95, alpha: 0, duration: 700, onComplete: () => meteor.destroy() });
        },
      });
    }

    /**
     * 창문이 켜진 도시 실루엣
     * @param {Phaser.GameObjects.Graphics} g
     * @param {number} baseY 건물 바닥 y
     * @param {number} color 건물 색
     * @param {[number, number]} heightRange 건물 높이 범위
     */
    drawCity(g, baseY, color, heightRange) {
      const { rand } = A.util;
      let x = 0;
      while (x < W) {
        const bw = rand(50, 110);
        const bh = rand(heightRange[0], heightRange[1]);
        g.fillStyle(color, 1);
        g.fillRect(x, baseY - bh, bw - 4, bh);
        g.fillStyle(0xffd166, 0.5);
        for (let wy = baseY - bh + 12; wy < baseY - 10; wy += 20) {
          for (let wx = x + 8; wx < x + bw - 14; wx += 16) {
            if (Math.random() < 0.35) g.fillRect(wx, wy, 7, 9);
          }
        }
        x += bw;
      }
    }

    /** 선택한 히어로를 캔버스 텍스처로 그려 이미지로 만든다. */
    createHero(x, y) {
      const { w, h } = GAME.HERO_SIZE;
      const tex = this.textures.createCanvas('hero', w, h);
      A.drawHero(tex.getContext(), this.hero, w, h);
      tex.refresh();
      this.player = this.add.image(x, y, 'hero').setDepth(DEPTH.hero);
      return this.player;
    }

    /** 거미줄이 나가는 손 위치. 히어로가 왼쪽을 보면 좌우가 바뀐다. */
    hand() {
      const dir = this.player.flipX ? -1 : 1;
      return { x: this.player.x + dir * GAME.HAND_OFFSET.x, y: this.player.y + GAME.HAND_OFFSET.y };
    }

    createHud() {
      const style = (size, color) => ({
        fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#000000', strokeThickness: 5,
      });
      this.add.rectangle(W / 2, GAME.HUD_H / 2, W, GAME.HUD_H, 0x000000, 0.45).setDepth(DEPTH.hud);
      this.qText = this.add.text(W / 2, 40, '', style(46, '#ffffff')).setOrigin(0.5).setDepth(DEPTH.hud);
      this.hintText = this.add.text(W / 2, 80, '', style(18, '#ffd166')).setOrigin(0.5).setDepth(DEPTH.hud);
      this.heartText = this.add.text(18, 12, '', style(26, '#ffffff')).setDepth(DEPTH.hud);
      this.progressText = this.add.text(18, 56, '', style(20, '#cccccc')).setDepth(DEPTH.hud);
      this.scoreText = this.add.text(W - 18, 12, '', style(26, '#ffffff')).setOrigin(1, 0).setDepth(DEPTH.hud);
      this.comboText = this.add.text(W - 18, 56, '', style(20, '#ff9f1c')).setOrigin(1, 0).setDepth(DEPTH.hud);
      this.updateHud();
    }

    updateHud() {
      this.heartText.setText('❤️'.repeat(this.hearts) + '🖤'.repeat(this.maxHearts - this.hearts));
      this.progressText.setText(`문제 ${this.qIndex} / ${A.RULES.questionsPerRound}`);
      this.scoreText.setText(`점수 ${this.score}`);
      this.comboText.setText(this.combo >= 2 ? `🔥 ${this.combo} 콤보` : '');
    }

    showIntro(msg) {
      const t = this.add
        .text(W / 2, 300, msg, {
          fontFamily: FONT, fontSize: '40px', color: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 7,
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.popup);
      this.tweens.add({ targets: t, alpha: 0, delay: INTRO_MS - 200, duration: 500, onComplete: () => t.destroy() });
    }

    /** 떠올랐다 사라지는 안내 문구 (정답!, 앗! 등) */
    popup(x, y, msg, color) {
      const t = this.add
        .text(x, y, msg, { fontFamily: FONT, fontSize: '30px', color, stroke: '#000000', strokeThickness: 6 })
        .setOrigin(0.5)
        .setDepth(DEPTH.popup);
      this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
    }
  }

  A.RoundScene = RoundScene;
})(window.ARAH);

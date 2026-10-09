/**
 * @file 모든 게임 모드가 공유하는 "한 판" 규칙의 기반 장면 클래스.
 *       하트 · 점수 · 콤보 · 문제 진행 · HUD · 결과 전달을 담당하고,
 *       모드별 화면과 조작은 하위 클래스(game/modes/*)가 구현한다.
 * @layer game
 * @depends Phaser 3, A.util, A.RULES, A.makeQuestion, A.Review, A.speak, A.Sfx, A.drawHero, A.heroHand, A.HERO_POSES, A.findFamily
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
 *   heroShoot()     투사체 발사 동작 (공격 자세 · 반동 · 발사음)
 *   meleeTo()       근접 팀(거인 · 표범)이 목표까지 뛰어올라 때리고 돌아오는 동작
 *   setHeroBase() / setHeroPose()  히어로 애니메이션 (서기 · 달리기 · 점프 · 공격 · 아야 · 만세)
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
 * @property {number} reviewAdded    이번 판에 복습 노트에 새로 들어간 문제 수
 * @property {number} reviewMastered 이번 판에 복습 노트에서 졸업한 문제 수
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

  // ----- 히어로 애니메이션 -----
  // 바탕 동작(base)은 계속 반복되는 프레임 순서, 잠깐 자세(pose)는 정해진 시간 동안 바탕 위에 덮어쓴다.
  // 프레임 그림은 hero-art.js 의 POSES 표 (A.HERO_POSES) 로 판마다 미리 만든다.
  /** @type {Object<string, (t: number) => string>} 바탕 동작 → 시간 t(ms) 에 보여 줄 프레임 */
  const HERO_BASES = {
    idle: (t) => (Math.floor(t / 520) % 2 ? 'breath' : 'idle'), // 숨쉬기
    run: (t) => (Math.floor(t / 110) % 2 ? 'run1' : 'run2'), // 팔다리 번갈아
    jump: () => 'jump',
    win: (t) => (Math.floor(t / 260) % 2 ? 'win' : 'jump'), // 승리 춤: 만세 ↔ 웅크리기
    hurt: () => 'hurt',
  };
  const POSE_MS = { attack: 260, win: 650, hurt: 520 };
  const MELEE_GO_MS = 340; // 근접 공격: 목표까지 뛰어가는 시간 (히어로 속도 능력으로 나눈다)
  const MELEE_BACK_MS = 300; // 근접 공격: 돌아오는 시간
  const MELEE_DEFAULT_ARC = 120;
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
      // 팀마다 쏘는 줄의 이름 · 색이 다르다 (거미줄, 레이저 줄 …). 안내 문구와 줄 그리기에 쓴다
      const family = A.findFamily(this.hero);
      this.shotName = family.shot;
      this.shotColor = family.color;
      /** @type {AttackStyle} 팀별 공격 모양 (거미줄 · 빔 · 방패 · 번개 · 바위 · 화살 · 구슬 · 발톱, game/attacks.js) */
      this.attackStyle = A.attackOf(this.hero);
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
      this.reviewStats = { added: 0, mastered: 0 };
      // 오답 복습은 복습 노트에 있는 문제 수만큼만 낸다 (최대 한 판 문제 수)
      this.reviewKind = this.questionOptions().spelling ? 'spell' : 'choice';
      this.totalQuestions = this.opts.subject === 'review'
        ? Math.max(1, Math.min(A.RULES.questionsPerRound, A.Review.count(this.reviewKind)))
        : A.RULES.questionsPerRound;

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
      // 배경음: 판이 시작될 때 켜고, 장면이 끝나면(그만하기 · 결과) 끈다
      A.Sfx.music.start(this.musicName());
      this.events.once('shutdown', () => A.Sfx.music.stop());
      this.events.once('destroy', () => A.Sfx.music.stop());
      this.createHud();
      this.showIntro(this.introText());
      this.time.delayedCall(INTRO_MS, () => this.nextQuestion());
    }

    // ---------- 하위 클래스 훅 (기본 구현) ----------

    introText() { return `${this.hero.name} 출동!`; }
    /** 판이 끝났을 때 크게 보여 줄 문구 (보스 배틀처럼 승패가 다른 모드가 바꾼다) */
    /** 배경음 곡 이름 (core/sfx.js 의 SONGS). 보스 배틀은 'boss' */
    musicName() { return 'hero'; }
    finishMessage(perfect) {
      if (this.hearts <= 0) return '조금만 더 힘내요!';
      return perfect ? '퍼펙트 미션!' : '미션 완료!';
    }
    /** 이 모드가 원하는 문제 형식 (예: 그림 보기). @returns {QuestionOptions} */
    questionOptions() { return {}; }
    createWorld() {}
    startWave() {}
    clearWave() {}

    // ---------- 문제 진행 ----------

    /** 다음 문제를 고르고 하위 클래스에 배치를 맡긴다. 끝날 조건이면 finish 로 간다. */
    nextQuestion() {
      if (this.ended) return;
      if (this.hearts <= 0 || this.qIndex >= this.totalQuestions) {
        this.finish();
        return;
      }

      const q = this.pickQuestion();
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
      if (q.speakOnStart && q.speak) A.speak(q.speak); // 듣기 문제
    }

    /**
     * 이번 문제를 고른다.
     * - 과목이 '오답 복습'이면 복습 노트에서 꺼낸다 (비었으면 섞어서 문제로 대신)
     * - 일반 과목이면 RULES.reviewMixRate 확률로 같은 과목의 복습 문제를 섞는다
     * - 최근에 나온 문제는 피해서 다시 뽑는다 (범위가 좁은 1단계에서 같은 문제 반복 방지)
     * @returns {Question}
     */
    pickQuestion() {
      const opts = this.questionOptions();
      const subject = this.opts.subject;
      // 철자 잇기처럼 영어 전용 형식이면 과목과 상관없이 영어 복습 문제를 쓴다
      const reviewSubject = opts.spelling ? 'review' : subject;
      if (subject === 'review' || Math.random() < A.RULES.reviewMixRate) {
        const rq = A.Review.pick(this.reviewKind, reviewSubject, this.recent);
        if (rq) return rq;
      }
      const real = subject === 'review' ? 'mix' : subject;
      let q;
      for (let i = 0; i < 8; i++) {
        q = A.makeQuestion(real, this.opts.level, opts);
        if (!this.recent.includes(q.key)) break;
      }
      return q;
    }

    /**
     * 정답 처리. 한 번도 틀리지 않은 문제만 별(firstTry) 대상이다.
     * (x, y) 를 주면 그 자리에서 축하 연출(파티클 · 줌 펄스 · 콤보 배너)을 한다.
     * @param {number} [x]
     * @param {number} [y]
     * @param {Question} [q] 맞힌 문제 (기본: 현재 문제. 한 화면에 여러 문제를 내는 모드가 지정)
     * @returns {number} 이번에 얻은 점수
     */
    awardCorrect(x, y, q = this.q) {
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      if (!q.missed) this.firstTry++;
      const pts = BASE_POINTS + Math.round((this.combo - 1) * COMBO_STEP * (this.ab.comboBonus || 1));
      this.score += pts;
      this.updateHud();
      this.sfx('correct');
      if (x !== undefined) this.celebrate(x, y);
      if (!this.inMelee) this.setHeroPose('win'); // 만세! (근접 공격 중에는 때리는 자세를 유지)
      return pts;
    }

    /**
     * 오답 · 놓침 처리: 하트 -1, 콤보 초기화, 복습 목록에 추가, 화면 흔들림 · 빨간 번쩍임.
     * @param {boolean} [loseHeart=true] false 이면 하트는 그대로 두고 나머지만 처리 (철자 잇기처럼 실수가 잦은 모드)
     * @param {Question} [q] 틀린 문제 (기본: 현재 문제)
     */
    penalize(loseHeart = true, q = this.q) {
      this.combo = 0;
      if (loseHeart) this.hearts = Math.max(0, this.hearts - 1);
      if (!q.missed) {
        q.missed = true;
        this.mistakes.push(q);
      }
      this.cameras.main.shake(160, 0.006);
      this.updateHud();
      this.flashScreen(0xff3355, loseHeart ? 0.22 : 0.12);
      this.sfx(loseHeart ? 'hurt' : 'wrong');
      this.setHeroPose('hurt'); // 아야! 움찔 (땀방울 · 어지러운 별)
      if (!loseHeart) return;
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
      if (big) {
        this.comboBanner(this.combo);
        this.sfx('combo');
      }
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
        .image(p.x, p.y, p.texture.key) // 지금 자세 그대로
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
      // 문제 결과를 복습 노트에 반영 (틀린 문제 추가 / 복습 문제를 맞히면 상자 올림 · 졸업)
      this.recordReview(this.q);
      this.clearWave();
      this.time.delayedCall(delay, () => this.nextQuestion());
    }

    // ---------- 소리 (모드는 이 두 함수만 부른다 — 소리 모양은 core/sfx.js 에서 관리) ----------

    /** 상황 효과음 (correct · wrong · glass · hit · flip …) @param {string} name */
    sfx(name) {
      A.Sfx.play(name);
    }

    /** 지금 히어로 팀의 발사음 (거미줄 슉 · 레이저 지잉 · 번개 콰직 …) */
    shotSfx() {
      A.Sfx.shot(this.hero.family);
    }

    // ---------- 공격 모양 (모드는 투사체 위치만 계산하고 모양은 여기에 맡긴다) ----------

    /**
     * 팀 공격 스타일로 투사체를 그린다 (거미줄 · 빔 · 날아가는 방패 · 번개 · 바위 · 화살 · 마법 구슬 · 발톱).
     * @param {Phaser.GameObjects.Graphics} g 이번 프레임에 그릴 그래픽 (호출 전에 clear)
     * @param {{x: number, y: number}} from 쏜 곳
     * @param {{x: number, y: number}} to 투사체 머리
     */
    drawAttack(g, from, to) {
      this.attackStyle.draw({ g, from, to, color: this.shotColor, time: this.time.now, look: this.hero.look });
    }

    /** 공격이 맞은 자리의 팀별 연출 (빔 섬광 · 바위 흔들림 · 발톱 자국 …) */
    attackHit(x, y) {
      this.attackStyle.hit(this, x, y);
    }

    /**
     * 끌어오기 줄 (철자 잇기). 줄이 있는 스타일(거미줄 · 빔 · 번개)은 그 모양으로,
     * 줄이 없는 스타일(방패 · 바위 · 화살 · 구슬 · 발톱)은 팀 색의 가는 "힘의 줄"로 그린다.
     */
    drawTether(g, from, to) {
      if (this.attackStyle.rope) {
        this.drawAttack(g, from, to);
        return;
      }
      g.lineStyle(2, this.shotColor, 0.5);
      g.lineBetween(from.x, from.y, to.x, to.y);
    }

    // ---------- 히어로 능력 공통 계산 (모드마다 같은 공식을 쓰도록 한곳에 둔다) ----------

    /**
     * 히어로 능력(slow: 느리게, timeBonus: 추가 시간)을 반영한 제한 시간.
     * 빌딩 스윙 제한 시간 · 문 도착 시간 · 보스 공격 충전 시간에 쓴다.
     * @param {number} baseSec 단계별 기본 시간 (초)
     * @returns {number} ms
     */
    timeLimitMs(baseSec) {
      return (baseSec / (this.ab.slow || 1) + (this.ab.timeBonus || 0)) * 1000;
    }

    /**
     * 힌트 능력(탐정 · 아머 스캐너 등)이 있으면 미리 막아 둘 오답 보기 번호. 능력이 없으면 -1.
     * 반환값은 q.choices 의 번호이며, 모드는 같은 순서로 보기(드론 · 빌딩 · 문 · 버튼)를 만든다.
     * @param {Question} q
     * @returns {number}
     */
    decoyIndex(q) {
      if (!this.ab.hint) return -1;
      const wrong = q.choices.map((_, i) => i).filter((i) => q.choices[i] !== q.answer);
      return wrong.length ? A.util.pick(wrong) : -1;
    }

    /**
     * 끝난 문제 하나를 복습 노트에 반영하고 결과 화면 집계를 올린다.
     * endWave 가 this.q 에 대해 부르며, 한 화면에 여러 문제를 내는 모드(짝꿍 찾기)는 나머지 문제에 직접 부른다.
     * @param {Question} q
     */
    recordReview(q) {
      const r = A.Review.record(q);
      if (r === 'added') this.reviewStats.added++;
      if (r === 'mastered') this.reviewStats.mastered++;
    }

    finish() {
      if (this.ended) return;
      this.ended = true;
      const total = this.qIndex;
      // 복습 판은 문제 수가 적을 수 있다 → 그 판의 문제 수 기준. 단 3문제 미만은 퍼펙트 보너스 없음
      const perfect = total === this.totalQuestions && total >= 3 && this.firstTry === total;
      const msg = this.finishMessage(perfect);
      A.Sfx.music.stop();
      this.sfx(this.hearts <= 0 ? 'lose' : 'win');
      this.heroFinale(this.hearts > 0);
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
          reviewAdded: this.reviewStats.added,
          reviewMastered: this.reviewStats.mastered,
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

    // ---------- 히어로 (그림 · 애니메이션 · 공격 동작) ----------

    /**
     * 선택한 히어로를 자세별 캔버스 텍스처(hero-idle, hero-run1 …)로 그려 이미지로 만들고 애니메이션을 시작한다.
     * @param {number} x
     * @param {number} y
     * @param {number} [scale=1] 모드별 크기 (보스 배틀은 크게, 짝꿍 찾기는 작게). 반동 연출의 기준이 된다
     */
    createHero(x, y, scale = 1) {
      const { w, h } = GAME.HERO_SIZE;
      for (const pose of A.HERO_POSES) {
        const key = `hero-${pose}`;
        if (this.textures.exists(key)) this.textures.remove(key); // 다시 하기: 다른 히어로일 수 있다
        const tex = this.textures.createCanvas(key, w, h);
        A.drawHero(tex.getContext(), this.hero, w, h, { pose });
        tex.refresh();
      }
      this.heroScale = scale;
      this.heroAnim = { base: 'idle', pose: null, until: 0 };
      this.inMelee = false;
      this.player = this.add.image(x, y, 'hero-idle').setDepth(DEPTH.hero).setScale(scale);
      this.events.on('update', this.tickHeroAnim, this);
      return this.player;
    }

    /** 매 프레임: 지금 보여 줄 자세 프레임으로 텍스처를 바꾼다. */
    tickHeroAnim(time) {
      const p = this.player;
      if (!p || !p.active) return;
      const a = this.heroAnim;
      if (a.pose && time >= a.until) a.pose = null;
      const key = `hero-${a.pose || HERO_BASES[a.base](time)}`;
      if (p.texture.key !== key) p.setTexture(key);
    }

    /**
     * 계속 반복할 바탕 동작을 정한다.
     * @param {'idle'|'run'|'jump'|'win'|'hurt'} base
     */
    setHeroBase(base) {
      if (this.heroAnim) this.heroAnim.base = base;
    }

    /**
     * 잠깐 자세를 취한다 (시간이 지나면 바탕 동작으로 돌아감).
     * @param {'attack'|'win'|'hurt'|'jump'} pose
     * @param {number} [ms] 기본: POSE_MS 표
     */
    setHeroPose(pose, ms = POSE_MS[pose] || 400) {
      if (!this.heroAnim || this.ended) return;
      this.heroAnim.pose = pose;
      this.heroAnim.until = this.time.now + ms;
      this.tickHeroAnim(this.time.now);
    }

    /** 제자리에서 둥실둥실 (서 있는 모드 공통). 근접 공격 · 끝 연출 때 멈췄다가 다시 시작한다. */
    startHeroBob(amp = 4) {
      this.stopHeroBob();
      this.bobTween = this.tweens.add({ targets: this.player, y: this.player.y - amp, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }

    stopHeroBob() {
      if (this.bobTween) this.bobTween.stop();
      this.bobTween = null;
    }

    /** 투사체 발사 동작: 팔을 쭉 뻗는 공격 자세 + 반동 + 팀 발사음. 투사체 이동은 모드가 맡는다. */
    heroShoot() {
      const k = this.heroScale;
      this.setHeroPose('attack');
      this.tweens.add({ targets: this.player, scaleX: k * 1.08, scaleY: k * 0.9, duration: 60, yoyo: true, onComplete: () => this.player.setScale(k) });
      this.shotSfx();
    }

    /**
     * 근접 공격 (거인 내려찍기 · 표범 달려들기): 목표까지 포물선으로 뛰어올라 때리고 착지한다.
     * 점프 높이는 팀 공격 스타일의 melee.arc. 목표가 움직이면(떨어지는 드론) 함수로 넘겨 매 프레임 따라간다.
     * @param {{x: number, y: number}|(() => {x: number, y: number})} target 때릴 위치 (히어로 중심이 갈 곳)
     * @param {() => void} onImpact 때리는 순간
     * @param {{land?: {x: number, y: number}, onLand?: () => void}} [opts] land: 착지할 곳 (기본: 출발한 곳)
     */
    meleeTo(target, onImpact, opts = {}) {
      const p = this.player;
      const at = typeof target === 'function' ? target : () => target;
      const arc = (this.attackStyle.melee || {}).arc || MELEE_DEFAULT_ARC;
      const speed = this.ab.webSpeed || 1;
      this.stopHeroBob();
      if (this.meleeTween) this.meleeTween.stop(); // 돌아오는 중에 다시 공격하면 그 자리에서 새로 출발
      this.inMelee = true;
      this.setHeroBase('jump');
      this.shotSfx();
      const S = { x: p.x, y: p.y };
      p.setFlipX(at().x < S.x - 10);

      const prog = { t: 0 };
      let frame = 0;
      const fly = (from, getTo, lift, ms, done) => {
        prog.t = 0;
        this.meleeTween = this.tweens.add({
          targets: prog, t: 1, duration: ms, ease: 'Sine.InOut',
          onUpdate: () => {
            const T = getTo();
            const C = { x: (from.x + T.x) / 2, y: Math.min(from.y, T.y) - lift };
            const pt = A.util.bezier2(from, C, T, prog.t);
            p.setPosition(pt.x, pt.y);
            if (frame++ % 3 === 0) this.ghostTrail(); // 빠르게 뛰는 잔상
          },
          onComplete: done,
        });
      };

      fly(S, at, arc, MELEE_GO_MS / speed, () => {
        this.setHeroPose('attack');
        const dir = p.flipX ? -1 : 1;
        this.tweens.add({ targets: p, angle: dir * 22, duration: 70, yoyo: true }); // 내려찍기 · 할퀴기 동작
        onImpact();
        const L = opts.land || S;
        fly({ x: p.x, y: p.y }, () => L, arc * 0.5, MELEE_BACK_MS / speed, () => {
          this.meleeTween = null;
          this.inMelee = false;
          p.setPosition(L.x, L.y).setAngle(0);
          this.setHeroBase('idle');
          const k = this.heroScale; // 착지 반동
          this.tweens.add({ targets: p, scaleY: k * 0.86, scaleX: k * 1.08, duration: 80, yoyo: true, onComplete: () => p.setScale(k) });
          if (!this.ended) this.startHeroBob();
          if (opts.onLand) opts.onLand();
        });
      });
    }

    /** 판이 끝남: 이겼으면 승리 춤(만세 · 깡충), 졌으면 털썩. 3D 화면처럼 Phaser 히어로가 없으면 건너뛴다. */
    heroFinale(won) {
      const p = this.player;
      if (!p || !p.active || !this.heroAnim) return;
      this.stopHeroBob();
      if (this.meleeTween) this.meleeTween.stop();
      this.inMelee = false;
      this.heroAnim.pose = null;
      this.setHeroBase(won ? 'win' : 'hurt');
      p.setAngle(0);
      if (won) this.tweens.add({ targets: p, y: p.y - 26, duration: 260, yoyo: true, repeat: -1, ease: 'Quad.Out' });
    }

    /** 줄 · 공격이 나가는 손 위치. 지금 자세(공격 자세면 쭉 뻗은 손)와 크기 · 좌우 방향을 반영한다. */
    hand() {
      const p = this.player;
      const r = A.heroHand(p.texture.key.replace('hero-', ''));
      const dir = p.flipX ? -1 : 1;
      const k = Math.abs(p.scaleY) || 1; // 히어로를 크게 · 작게 그린 모드도 손 위치가 맞게
      const { w, h } = GAME.HERO_SIZE;
      return { x: p.x + dir * r.x * w * k, y: p.y + r.y * h * k };
    }

    createHud() {
      const style = (size, color) => ({
        fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#000000', strokeThickness: 5,
      });
      this.add.rectangle(W / 2, GAME.HUD_H / 2, W, GAME.HUD_H, 0x000000, 0.45).setDepth(DEPTH.hud);
      this.qText = this.add.text(W / 2, 40, '', style(46, '#ffffff')).setOrigin(0.5).setDepth(DEPTH.hud);
      // 문제를 누르면 영어 발음을 다시 들려준다 (듣기 문제 · 영어 문제 공통)
      this.qText.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (this.q && this.q.speak) A.speak(this.q.speak);
      });
      this.hintText = this.add.text(W / 2, 80, '', style(18, '#ffd166')).setOrigin(0.5).setDepth(DEPTH.hud);
      this.heartText = this.add.text(18, 12, '', style(26, '#ffffff')).setDepth(DEPTH.hud);
      this.progressText = this.add.text(18, 56, '', style(20, '#cccccc')).setDepth(DEPTH.hud);
      this.scoreText = this.add.text(W - 18, 12, '', style(26, '#ffffff')).setOrigin(1, 0).setDepth(DEPTH.hud);
      this.comboText = this.add.text(W - 18, 56, '', style(20, '#ff9f1c')).setOrigin(1, 0).setDepth(DEPTH.hud);
      this.updateHud();
    }

    updateHud() {
      this.heartText.setText('❤️'.repeat(this.hearts) + '🖤'.repeat(this.maxHearts - this.hearts));
      this.progressText.setText(`${this.opts.subject === 'review' ? '📒 복습 ' : '문제 '}${this.qIndex} / ${this.totalQuestions}`);
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

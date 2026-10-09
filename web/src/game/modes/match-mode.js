/**
 * @file 🃏 짝꿍 찾기 모드 (기억력). 문제 카드와 답 카드를 잠깐 보여 준 뒤 뒤집고, 짝을 기억해 찾는다.
 * @layer game
 * @depends A.RoundScene, A.GAME, A.util, A.speak
 * @see doc/planning/game-design.md (3.5 짝꿍 찾기)
 *
 * 한 화면(웨이브)에 여러 문제를 낸다: 문제 3~4개 → 카드 6~8장 (문제 카드 + 답 카드).
 *   - 시작할 때 모든 카드를 PREVIEW 시간 동안 보여 주고 뒤집는다 (기억하기)
 *   - 두 장을 뒤집어 같은 문제의 "문제 ↔ 답"이면 짝 성공: 두 카드를 줄로 묶고 점수
 *   - 짝이 아니면 다시 뒤집힌다. 먼저 뒤집은 카드의 문제는 별 대상에서 빠진다 (하트는 그대로 — 기억 게임은 실수가 잦다)
 * 문제 진행: 기반 장면이 고른 첫 문제(this.q) + pickQuestion 으로 더 뽑은 문제. qIndex 를 문제 수만큼 올린다.
 */
(function (A) {
  'use strict';

  if (!A.RoundScene) return;

  const { W, FONT, DEPTH } = A.GAME;

  // ----- 배치 -----
  const CARD_W = 170;
  const CARD_H = 120;
  const GAP_X = 24;
  const GAP_Y = 26;
  const BOARD_TOP = 150; // 첫 줄 카드 중심의 위쪽 기준

  // ----- 규칙 · 연출 -----
  const PAIRS_BY_LEVEL = { 1: 3, 2: 3, 3: 4, 4: 4, 5: 4, 6: 4 };
  const PREVIEW_BY_LEVEL = { 1: 3000, 2: 2600, 3: 2400, 4: 2000, 5: 1800, 6: 1500 }; // 처음 보여 주는 시간 ms
  const FLIP_MS = 160;
  const MISMATCH_SHOW_MS = 700; // 짝이 아닐 때 두 카드를 보여 주는 시간
  const NEXT_DELAY = 1100;

  /** 카드에 쓸 문제 글자: "7 + 5 = ?" → "7 + 5", "🍎  →  ?" → "🍎" */
  function cardText(q) {
    return q.prompt.replace(/\s*(=|→)\s*\?\s*$/, '').trim();
  }

  /** 카드로 낼 수 있는 문제인지 (듣기 문제는 카드에 보일 단서가 없어서 제외) */
  const usable = (q) => !q.speakOnStart && cardText(q).length > 0;

  class MatchScene extends A.RoundScene {
    constructor() {
      super({ key: 'play' });
    }

    introText() {
      return `${this.hero.name} 출동!\n카드를 잘 기억하고 짝을 찾아요`;
    }

    createWorld() {
      this.cards = [];
      this.open = []; // 지금 앞면인 (짝 확인 전) 카드
      this.locked = true; // 미리 보기 · 짝 확인 중에는 누를 수 없다
      this.pairsLeft = 0;

      this.drawSky();
      const g = this.add.graphics().setDepth(DEPTH.bg);
      this.drawCity(g, 640, 0x1a1f45, [80, 200]);
      this.createHero(70, 560, 0.8);
      this.webGfx = this.add.graphics().setDepth(DEPTH.web);
      this.links = []; // 짝 맞춘 카드를 잇는 줄 [{a, b}]

      this.input.on('pointerdown', (p) => {
        const c = this.cards.find((k) => Math.abs(p.worldX - k.c.x) <= CARD_W / 2 && Math.abs(p.worldY - k.c.y) <= CARD_H / 2);
        if (c) this.flip(c);
      });
      // PC: 숫자 1~8 키로 카드 고르기 (왼쪽 위부터)
      this.input.keyboard.on('keydown', (e) => {
        const n = Number(e.key);
        if (n >= 1 && n <= this.cards.length) this.flip(this.cards[n - 1]);
      });
    }

    // ---------- 판 만들기 ----------

    startWave(q) {
      // 첫 문제(q)에 더해 남은 문제 수 안에서 짝을 채운다. 답이 겹치면 짝이 두 개가 되므로 다시 뽑는다.
      const want = Math.min(PAIRS_BY_LEVEL[this.opts.level], this.totalQuestions - this.qIndex + 1);
      const qs = [q];
      let guard = 0;
      while (qs.length < want && guard++ < 60) {
        const extra = this.pickQuestion();
        if (!usable(extra) || qs.some((x) => x.answer === extra.answer || x.key === extra.key || cardText(x) === cardText(extra))) continue;
        extra.missed = false;
        qs.push(extra);
        this.recent.push(extra.key);
      }
      if (!usable(q)) q.prompt = q.review; // 드물게 첫 문제가 듣기 문제면 복습 문장으로 대신 보여 준다
      this.qIndex += qs.length - 1;
      this.updateHud();
      this.qText.setText('짝을 찾아요!');
      this.hintText.setText('문제 카드와 답 카드를 이어 주세요');
      this.waveQs = qs;
      this.pairsLeft = qs.length;

      // 카드 만들기 (문제 카드 + 답 카드)를 섞어서 격자로 놓는다
      const defs = A.util.shuffle(qs.flatMap((x, i) => [
        { pair: i, side: 'q', text: cardText(x) },
        { pair: i, side: 'a', text: x.answer },
      ]));
      const cols = 4;
      const rows = Math.ceil(defs.length / cols);
      const totalW = cols * CARD_W + (cols - 1) * GAP_X;
      const x0 = W / 2 - totalW / 2 + CARD_W / 2 + 40; // 왼쪽에 히어로 자리를 둔다
      const y0 = BOARD_TOP + CARD_H / 2 + (rows === 1 ? 80 : 0);
      this.cards = defs.map((d, i) => this.makeCard(d, x0 + (i % cols) * (CARD_W + GAP_X), y0 + Math.floor(i / cols) * (CARD_H + GAP_Y), i));

      // 미리 보기 → 뒤집기
      this.locked = true;
      const preview = PREVIEW_BY_LEVEL[this.opts.level] + (this.ab.timeBonus || 0) * 300;
      this.time.delayedCall(preview, () => {
        if (!this.waveActive) return;
        this.cards.forEach((c) => this.turn(c, false));
        this.time.delayedCall(FLIP_MS * 2, () => { this.locked = false; });
      });
      // 탐정 · 스캐너 능력: 짝 하나를 처음부터 맞춰 둔다
      if (this.ab.hint && qs.length > 2) {
        this.time.delayedCall(preview + FLIP_MS * 2 + 50, () => {
          const [a, b] = this.cards.filter((c) => c.pair === qs.length - 1);
          if (a && b && this.waveActive) this.match(a, b, true);
        });
      }
    }

    makeCard(def, x, y, i) {
      const c = this.add.container(x, y).setDepth(DEPTH.world);
      const back = this.add.graphics(); // 뒷면: 팀 색 + 줄 무늬
      back.fillStyle(0x2b2d42, 1);
      back.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14);
      back.lineStyle(3, this.shotColor, 0.9);
      back.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14);
      back.lineStyle(1.5, this.shotColor, 0.35);
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        back.lineBetween(0, 0, Math.cos(a) * 60, Math.sin(a) * 45);
      }
      back.strokeCircle(0, 0, 18);
      back.strokeCircle(0, 0, 36);
      const front = this.add.graphics(); // 앞면: 문제 카드는 하늘색, 답 카드는 노란색
      front.fillStyle(def.side === 'q' ? 0xe0f7ff : 0xfff3c4, 1);
      front.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14);
      front.lineStyle(3, def.side === 'q' ? 0x4cc9f0 : 0xffb703, 1);
      front.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14);
      const size = def.text.length > 9 ? 22 : def.text.length > 6 ? 28 : 36;
      const text = this.add
        .text(0, 2, def.text, { fontFamily: FONT, fontSize: `${size}px`, color: '#1a1a2e', align: 'center', wordWrap: { width: CARD_W - 16 } })
        .setOrigin(0.5);
      const num = this.add.text(-CARD_W / 2 + 10, -CARD_H / 2 + 6, String(i + 1), { fontFamily: FONT, fontSize: '14px', color: '#8d99ae' });
      c.add([back, front, text, num]);
      c.setScale(0);
      this.tweens.add({ targets: c, scale: 1, duration: 300, delay: i * 40, ease: 'Back.Out' });
      // def.text(카드 글자 데이터)와 화면 글자 객체(txt)를 다른 이름으로 둔다
      const card = { ...def, c, back, front, txt: text, faceUp: true, done: false };
      this.showFace(card, true);
      return card;
    }

    showFace(card, up) {
      card.faceUp = up;
      card.back.setVisible(!up);
      card.front.setVisible(up);
      card.txt.setVisible(up);
    }

    /** 카드를 뒤집는 연출 (가로로 줄었다 펴짐) */
    turn(card, up) {
      this.tweens.add({
        targets: card.c, scaleX: 0, duration: FLIP_MS, ease: 'Sine.In',
        onComplete: () => {
          this.showFace(card, up);
          this.tweens.add({ targets: card.c, scaleX: 1, duration: FLIP_MS, ease: 'Sine.Out' });
        },
      });
    }

    clearWave() {
      this.links = [];
      for (const card of this.cards) {
        this.tweens.killTweensOf(card.c);
        this.tweens.add({ targets: card.c, alpha: 0, scale: 0.6, delay: 500, duration: 300, onComplete: () => card.c.destroy() });
      }
      this.cards = [];
      this.open = [];
    }

    // ---------- 고르기 ----------

    flip(card) {
      if (this.locked || !this.waveActive || card.done || card.faceUp) return;
      this.sfx('flip');
      this.turn(card, true);
      this.open.push(card);
      if (this.open.length < 2) return;

      const [a, b] = this.open;
      this.open = [];
      this.locked = true;
      this.time.delayedCall(FLIP_MS * 2 + 80, () => {
        if (a.pair === b.pair) {
          this.match(a, b, false);
          this.locked = false;
        } else {
          // 먼저 뒤집은 카드의 문제를 기억하지 못한 것으로 본다
          this.penalize(false, this.waveQs[a.pair]);
          this.popup(W / 2 + 40, 600, '짝이 아니에요! 다시 기억해 봐요', '#ff5c5c');
          this.time.delayedCall(MISMATCH_SHOW_MS, () => {
            this.turn(a, false);
            this.turn(b, false);
            this.time.delayedCall(FLIP_MS * 2, () => { this.locked = false; });
          });
        }
      });
    }

    /** 짝 성공: 두 카드를 줄로 잇고 점수. 마지막 짝이면 다음 판으로. */
    match(a, b, byHint) {
      a.done = true;
      b.done = true;
      if (!a.faceUp) this.turn(a, true);
      if (!b.faceUp) this.turn(b, true);
      this.links.push({ a: a.c, b: b.c });
      const q = this.waveQs[a.pair];
      const mx = (a.c.x + b.c.x) / 2;
      const my = (a.c.y + b.c.y) / 2;
      const pts = this.awardCorrect(mx, my, q);
      this.popup(mx, my - 30, byHint ? `스캐너로 찾았어요! +${pts}` : `짝꿍! +${pts}`, '#06d6a0');
      if (q.speak && !byHint) A.speak(q.speak);
      for (const k of [a, b]) {
        this.tweens.add({ targets: k.c, scale: 1.08, duration: 120, yoyo: true });
        k.front.lineStyle(5, 0x06d6a0, 1);
        k.front.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14);
      }
      // 첫 문제(this.q)는 endWave 가 복습 노트에 기록하고, 나머지는 여기서 기록한다
      if (q !== this.q) this.recordReview(q);
      this.pairsLeft--;
      if (this.pairsLeft <= 0) this.endWave(NEXT_DELAY);
    }

    // ---------- 매 프레임 ----------

    update() {
      if (this.ended) return;
      const g = this.webGfx;
      g.clear();
      g.lineStyle(4, this.shotColor, 0.9);
      for (const l of this.links) g.lineBetween(l.a.x, l.a.y, l.b.x, l.b.y);
    }
  }

  A.GAME_MODES.match = MatchScene;
})(window.ARAH);

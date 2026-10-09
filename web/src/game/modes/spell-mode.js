/**
 * @file 🕸️ 철자 잇기 모드 (영어 전용). 그림 · 발음으로 단어를 알려 주고,
 *       떠다니는 알파벳 블록을 순서대로 거미줄로 낚아채 빈칸으로 끌어와 단어를 완성한다.
 * @layer game
 * @depends A.RoundScene, A.GAME, A.util, A.speak
 * @see doc/planning/game-design.md (3.4 철자 잇기)
 *
 * 판정: 다음 순서의 글자 → 거미줄로 끌어와 빈칸에 채움 / 모두 채우면 정답
 *       순서가 틀린 글자 → 거미줄이 끊어지고 블록이 흔들림. 철자는 실수가 잦은 활동이라 **하트는 깎지 않고**
 *       별(한 번에 맞힌 문제) 대상에서만 빠진다. HINT_AFTER 번 틀리면 다음 글자를 반짝여 알려 준다.
 * 조작: 블록 터치 · 클릭, 또는 키보드로 알파벳 입력. 상단 문제를 누르면 발음을 다시 들려준다.
 */
(function (A) {
  'use strict';

  if (!A.RoundScene) return;

  const { W, FONT, DEPTH, HUD_H } = A.GAME;

  // ----- 화면 배치 (게임 좌표) -----
  const HERO_Y = 548;
  const SLOT_Y = 165; // 빈칸 줄 높이
  const SLOT_W = 62;
  const SLOT_GAP = 8;
  const FIELD = { left: 110, right: 850, top: 285, bottom: 470 }; // 알파벳 블록이 떠다니는 영역
  const BLOCK = 68;
  const BLOCK_COLORS = [0xe63946, 0x1d4ed8, 0x06d6a0, 0xff9f1c, 0x9d4edd, 0xff4fa3];

  // ----- 연출 · 규칙 -----
  const SHOOT_MS = 160; // 거미줄이 블록까지 가는 시간
  const PULL_MS = 380; // 블록을 빈칸으로 끌어오는 시간
  const HINT_AFTER = 2; // 같은 글자에서 이만큼 틀리면 다음 글자를 반짝여 알려 준다
  const NEXT_DELAY = 1400; // 완성된 단어를 보여 주는 시간
  const KEY_QUEUE_MAX = 12; // 거미줄이 오가는 동안 기억해 둘 키 수 (가장 긴 단어 길이 이상)

  class SpellScene extends A.RoundScene {
    constructor() {
      super({ key: 'play' });
    }

    introText() {
      return `${this.hero.name} 출동!\n알파벳을 순서대로 ${this.shotName}로 잡아요`;
    }

    questionOptions() {
      return { spelling: true };
    }

    createWorld() {
      this.blocks = [];
      this.slots = [];
      this.idx = 0; // 다음에 채울 빈칸 번호
      this.busy = false; // 거미줄이 오가는 동안 입력을 막는다
      this.wrongCount = 0;
      this.web = null; // { to: {x, y}, color } — 값이 있는 동안 손에서 to 까지 거미줄을 그린다

      this.drawSky();
      const g = this.add.graphics().setDepth(DEPTH.bg);
      this.drawCity(g, 600, 0x1a1f45, [110, 250]);
      g.fillStyle(0x2a2e5c, 1);
      g.fillRect(0, 600, W, 40);

      this.createHero(W / 2, HERO_Y);
      this.tweens.add({ targets: this.player, y: HERO_Y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.webGfx = this.add.graphics().setDepth(DEPTH.web);

      this.input.on('pointerdown', (p) => {
        if (p.worldY < HUD_H) {
          if (this.q) A.speak(this.q.speak);
          return;
        }
        const b = this.blockAt(p.worldX, p.worldY);
        if (b) this.pick(b);
      });
      // PC: 알파벳 키를 누르면 그 글자 블록을 고른 것과 같다.
      // 거미줄이 오가는 동안 친 키는 버리지 않고 순서대로 기억했다가 이어서 처리한다 (빠른 타이핑 대응)
      this.keyQueue = [];
      this.input.keyboard.on('keydown', (e) => {
        const k = (e.key || '').toLowerCase();
        if (!/^[a-z]$/.test(k) || !this.waveActive) return;
        if (this.busy) {
          if (this.keyQueue.length < KEY_QUEUE_MAX) this.keyQueue.push(k);
          return;
        }
        this.typeLetter(k);
      });
    }

    typeLetter(k) {
      const b = this.blocks.find((x) => !x.used && x.ch === k);
      if (b) this.pick(b);
      else this.wrong(); // 화면에 없는 글자를 친 경우
    }

    /** 기억해 둔 키가 있으면 다음 것을 처리한다 (끌어오기가 끝날 때 부른다). */
    flushKeys() {
      if (!this.waveActive || this.busy || !this.keyQueue.length) return;
      this.typeLetter(this.keyQueue.shift());
    }

    // ---------- 문제 배치 ----------

    startWave(q) {
      this.word = q.answer;
      this.keyQueue = [];
      this.idx = 0;
      this.wrongCount = 0;
      this.busy = false;

      // 빈칸
      const n = this.word.length;
      const total = n * SLOT_W + (n - 1) * SLOT_GAP;
      const x0 = W / 2 - total / 2 + SLOT_W / 2;
      this.slots = this.word.split('').map((_, i) => {
        const x = x0 + i * (SLOT_W + SLOT_GAP);
        const g = this.add.graphics().setDepth(DEPTH.world);
        g.fillStyle(0x111633, 0.85);
        g.fillRoundedRect(x - SLOT_W / 2, SLOT_Y - SLOT_W / 2, SLOT_W, SLOT_W, 10);
        g.lineStyle(3, 0x4cc9f0, 0.9);
        g.strokeRoundedRect(x - SLOT_W / 2, SLOT_Y - SLOT_W / 2, SLOT_W, SLOT_W, 10);
        return { x, y: SLOT_Y, g };
      });
      this.slotHl = this.add.graphics().setDepth(DEPTH.world + 1);
      this.tweens.add({ targets: this.slotHl, alpha: 0.35, duration: 450, yoyo: true, repeat: -1 });
      this.updateSlotHl();

      // 알파벳 블록: 영역을 격자로 나누고 칸마다 조금씩 흩어 놓는다 (겹치지 않으면서 자연스럽게)
      const { rand, shuffle } = A.util;
      const k = q.choices.length;
      const cols = Math.min(k, 6);
      const rows = Math.ceil(k / cols);
      const cellW = (FIELD.right - FIELD.left) / cols;
      const cellH = (FIELD.bottom - FIELD.top) / rows;
      const cells = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          cells.push({
            x: FIELD.left + cellW * (c + 0.5) + rand(-cellW * 0.15, cellW * 0.15),
            y: FIELD.top + cellH * (r + 0.5) + rand(-10, 10),
          });
        }
      }
      shuffle(cells);
      this.blocks = q.choices.map((ch, i) => this.makeBlock(ch, cells[i], i));

      // 탐정 스파이더: 방해 글자를 미리 막아 둔다
      if (this.ab.hint) {
        for (const b of this.blocks) {
          if ((q.decoys || []).includes(b.ch)) this.blockDecoy(b);
        }
      }
      A.speak(q.speak); // 단어 발음을 먼저 들려준다
    }

    makeBlock(ch, pos, i) {
      const c = this.add.container(pos.x, pos.y).setDepth(DEPTH.world);
      const g = this.add.graphics();
      g.fillStyle(BLOCK_COLORS[i % BLOCK_COLORS.length], 1);
      g.fillRoundedRect(-BLOCK / 2, -BLOCK / 2, BLOCK, BLOCK, 14);
      g.lineStyle(4, 0xffffff, 0.85);
      g.strokeRoundedRect(-BLOCK / 2, -BLOCK / 2, BLOCK, BLOCK, 14);
      const t = this.add
        .text(0, 2, ch, { fontFamily: FONT, fontSize: '46px', color: '#ffffff', stroke: '#000000', strokeThickness: 5 })
        .setOrigin(0.5);
      c.add([g, t]);
      c.setScale(0);
      this.tweens.add({ targets: c, scale: 1, duration: 350, delay: i * 50, ease: 'Back.Out' });
      // 둥실둥실 떠다님 (끌어올 때는 이 tween 을 멈춘다)
      this.tweens.add({
        targets: c, y: pos.y - 7, duration: A.util.rand(800, 1300), delay: A.util.rand(0, 600),
        yoyo: true, repeat: -1, ease: 'Sine.InOut',
      });
      return { c, g, t, ch, used: false };
    }

    blockDecoy(b) {
      b.used = true;
      b.c.setAlpha(0.3);
      b.g.lineStyle(5, 0x9a9a9a, 1);
      b.g.lineBetween(-BLOCK / 2 + 8, -BLOCK / 2 + 8, BLOCK / 2 - 8, BLOCK / 2 - 8);
    }

    clearWave() {
      this.web = null;
      // 완성된 단어를 잠깐 보여 준 뒤 사라진다 (다음 문제는 NEXT_DELAY 뒤)
      const objs = [...this.slots.map((s) => s.g), ...this.blocks.map((b) => b.c), this.slotHl];
      for (const o of objs) {
        this.tweens.killTweensOf(o);
        this.tweens.add({ targets: o, alpha: 0, delay: 800, duration: 300, onComplete: () => o.destroy() });
      }
      this.blocks = [];
      this.slots = [];
    }

    updateSlotHl() {
      const g = this.slotHl;
      g.clear();
      const s = this.slots[this.idx];
      if (!s) return;
      g.lineStyle(5, 0xffd166, 1);
      g.strokeRoundedRect(s.x - SLOT_W / 2 - 5, s.y - SLOT_W / 2 - 5, SLOT_W + 10, SLOT_W + 10, 12);
    }

    blockAt(x, y) {
      return this.blocks.find((b) => !b.used && Math.abs(x - b.c.x) <= BLOCK / 2 + 8 && Math.abs(y - b.c.y) <= BLOCK / 2 + 8) || null;
    }

    // ---------- 거미줄로 고르기 ----------

    /** 블록 b 에 거미줄을 쏜다. 다음 순서의 글자면 끌어오고, 아니면 줄이 끊어진다. */
    pick(b) {
      if (!this.waveActive || this.busy || !b || b.used) return;
      this.busy = true;
      const expected = this.word[this.idx];
      const speed = this.ab.webSpeed || 1;
      this.player.setFlipX(b.c.x < this.player.x - 10);
      const tip = { ...this.hand() };
      this.web = { to: tip, color: this.shotColor };
      this.tweens.add({ targets: this.player, scaleY: 0.9, scaleX: 1.08, duration: 60, yoyo: true }); // 발사 반동
      this.tweens.add({
        targets: tip, x: b.c.x, y: b.c.y, duration: SHOOT_MS / speed,
        onComplete: () => (b.ch === expected ? this.pull(b) : this.snap(b)),
      });
    }

    /** 맞는 글자: 거미줄에 매달아 다음 빈칸으로 끌어온다. */
    pull(b) {
      b.used = true;
      b.placed = true;
      this.tweens.killTweensOf(b.c); // 둥실둥실 tween 정지
      const slot = this.slots[this.idx];
      this.idx++;
      this.wrongCount = 0;
      this.web = { to: b.c, color: this.shotColor };
      b.c.setDepth(DEPTH.world + 2);
      this.tweens.add({
        targets: b.c, x: slot.x, y: slot.y, scale: 0.85, duration: PULL_MS / (this.ab.webSpeed || 1), ease: 'Cubic.InOut',
        onComplete: () => {
          this.web = null;
          this.burster.explode(10, slot.x, slot.y);
          this.updateSlotHl();
          this.busy = false;
          if (this.idx >= this.word.length) this.complete();
          else this.flushKeys();
        },
      });
    }

    /** 틀린 글자: 거미줄이 빨갛게 끊어지고 블록이 흔들린다. */
    snap(b) {
      this.web.color = 0xff5c5c;
      this.time.delayedCall(140, () => { this.web = null; });
      b.t.setColor('#ff5c5c');
      this.tweens.add({
        targets: b.c, angle: { from: -12, to: 12 }, duration: 60, yoyo: true, repeat: 2,
        onComplete: () => { b.c.angle = 0; b.t.setColor('#ffffff'); },
      });
      this.wrong();
      this.busy = false;
    }

    /** 순서가 틀렸을 때 (하트는 그대로). 여러 번 틀리면 다음 글자를 알려 준다. */
    wrong() {
      this.keyQueue = []; // 틀리면 미리 친 키는 버린다 (틀린 흐름으로 계속 입력되지 않게)
      this.penalize(false);
      this.wrongCount++;
      this.popup(W / 2, 245, '앗! 다음 글자가 아니에요', '#ff5c5c');
      if (this.wrongCount >= HINT_AFTER) this.hintNext();
    }

    hintNext() {
      const next = this.blocks.find((b) => !b.used && b.ch === this.word[this.idx]);
      if (!next) return;
      this.tweens.add({ targets: next.c, scale: 1.25, duration: 180, yoyo: true, repeat: 2 });
      this.burster.explode(8, next.c.x, next.c.y);
    }

    complete() {
      const pts = this.awardCorrect(W / 2, SLOT_Y);
      this.popup(W / 2, SLOT_Y + 75, `${this.word}! +${pts}`, '#06d6a0');
      A.speak(this.q.speak);
      // 완성된 단어가 한 번 통통 튄다 (빈칸에 들어간 블록만)
      this.blocks.filter((b) => b.placed).forEach((b, i) => {
        this.tweens.add({ targets: b.c, y: SLOT_Y - 12, duration: 140, delay: i * 50, yoyo: true });
      });
      this.endWave(NEXT_DELAY);
    }

    // ---------- 매 프레임 ----------

    update() {
      if (this.ended) return;
      const g = this.webGfx;
      g.clear();
      if (this.web) {
        const o = this.hand();
        g.lineStyle(3, this.web.color, 0.95);
        g.lineBetween(o.x, o.y, this.web.to.x, this.web.to.y);
        g.fillStyle(this.web.color, 1);
        g.fillCircle(this.web.to.x, this.web.to.y, 5);
      }
    }
  }

  A.GAME_MODES.spell = SpellScene;
})(window.ARAH);

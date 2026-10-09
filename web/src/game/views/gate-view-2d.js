/**
 * @file 🚪 문 통과 모드의 2D 화면 (Phaser). 소실점 하나짜리 원근으로 도로와 문을 그린다.
 *       3D 를 쓰기 어려운 기기(저사양 태블릿 등)를 위한 기본 화면이다.
 * @layer game
 * @depends Phaser 3, A.GAME, A.util
 * @see web/src/game/modes/gate-mode.js (GateView typedef), doc/planning/game-design.md (3.3)
 *
 * 원근: 문 크기 배율 s 가 0.35(멀리) → 1(도착). 화면 좌표는 project(줄 x, s) 로 구한다.
 */
(function (A) {
  'use strict';

  if (!A.RoundScene) return;

  const { W, H, FONT, DEPTH, HUD_H } = A.GAME;

  const VANISH_X = W / 2; // 소실점 x
  const HORIZON_Y = 150; // 소실점 y
  const GROUND_Y = 600; // 문이 도착했을 때의 바닥선 = 히어로 발 위치
  const HERO_Y = GROUND_Y - 51; // 히어로 이미지 중심 (발끝까지 51px)
  const LANE_LEFT = 150; // 도착 지점(s=1)에서 맨 왼쪽 · 오른쪽 줄의 중심 x
  const LANE_RIGHT = 810;
  const S_FAR = 0.35; // 문이 처음 나타날 때 크기 배율 (너무 작으면 글자를 못 읽는다)
  const DOOR_H = 200;
  const FALL_MS = 450;
  const RESCUE_MS = 550;

  /** 줄 x0(도착 기준)와 배율 s 로 화면 좌표를 구한다. */
  function project(x0, s) {
    return { x: VANISH_X + (x0 - VANISH_X) * s, y: HORIZON_Y + (GROUND_Y - HORIZON_Y) * s };
  }

  /** @implements {GateView} */
  class GateView2D {
    /**
     * @param {Phaser.Scene} scene 문 통과 장면 (RoundScene 의 공통 기능을 빌려 쓴다)
     * @param {number} laneCount 줄 수
     */
    constructor(scene, laneCount) {
      this.s = scene;
      this.laneGap = (LANE_RIGHT - LANE_LEFT) / (laneCount - 1);
      this.laneXs = Array.from({ length: laneCount }, (_, i) => LANE_LEFT + this.laneGap * i);
      this.scroll = 0; // 바닥 점선 흐름
      this.frame = 0;
    }

    build(startLane) {
      const s = this.s;
      s.drawSky();
      const g = s.add.graphics().setDepth(DEPTH.bg);
      s.drawCity(g, 330, 0x141838, [60, 170]);
      this.drawRoad(g);
      this.stripeGfx = s.add.graphics().setDepth(DEPTH.bg);
      this.speedGfx = s.add.graphics().setDepth(DEPTH.web);
      this.hero = s.createHero(this.laneXs[startLane], HERO_Y);
      s.setHeroBase('run'); // 계속 달린다 (팔다리 번갈아)
      this.webGfx = s.add.graphics().setDepth(DEPTH.web);
    }

    // ---------- 배경 ----------

    drawRoad(g) {
      const left = LANE_LEFT - this.laneGap / 2;
      const right = LANE_RIGHT + this.laneGap / 2;
      const top = 0.28;
      const bottom = 1.12;
      g.fillStyle(0x1c2048, 1);
      g.fillPoints([project(left, top), project(right, top), project(right, bottom), project(left, bottom)], true);
      g.lineStyle(4, 0x4cc9f0, 0.6);
      for (const x0 of [left, right]) {
        const a = project(x0, top);
        const b = project(x0, bottom);
        g.lineBetween(a.x, a.y, b.x, b.y);
      }
    }

    /** 줄 사이 점선이 아래로 흘러 달리는 느낌을 준다. */
    drawStripes() {
      const g = this.stripeGfx;
      g.clear();
      g.lineStyle(3, 0x8d99ae, 0.6);
      for (let i = 0; i < this.laneXs.length - 1; i++) {
        const x0 = this.laneXs[i] + this.laneGap / 2;
        for (let k = 0; k < 8; k++) {
          const t = (k / 8 + this.scroll) % 1;
          const s1 = 0.3 + 0.8 * t;
          const a = project(x0, s1);
          const b = project(x0, s1 + 0.04);
          g.lineBetween(a.x, a.y, b.x, b.y);
        }
      }
    }

    /** 대시 중에는 소실점에서 바깥으로 뻗는 속도선을 그린다. */
    drawSpeedLines(time, on) {
      const g = this.speedGfx;
      g.clear();
      if (!on) return;
      g.lineStyle(2, 0xffffff, 0.35);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + Math.floor(time / 60) * 0.37; // 프레임마다 각도를 바꿔 깜빡이며 흐르게
        const r1 = 260 + ((time / 2 + i * 53) % 200);
        g.lineBetween(
          VANISH_X + Math.cos(a) * r1, HORIZON_Y + 120 + Math.sin(a) * r1 * 0.6,
          VANISH_X + Math.cos(a) * (r1 + 90), HORIZON_Y + 120 + Math.sin(a) * (r1 + 90) * 0.6,
        );
      }
    }

    // ---------- 문 ----------

    createDoors(doors, picture) {
      for (const d of doors) d.v = this.makeDoor(d.label, picture);
    }

    makeDoor(label, picture) {
      const s = this.s;
      const w = Math.min(200, this.laneGap * 0.82);
      const h = DOOR_H;

      const g = s.add.graphics();
      g.fillStyle(0x3b4170, 1);
      g.fillRect(-w / 2 - 10, -h - 10, w + 20, h + 10); // 문틀
      g.fillStyle(0x4cc9f0, 0.22);
      g.fillRect(-w / 2, -h, w, h); // 유리
      g.lineStyle(3, 0x9be7ff, 0.8);
      g.strokeRect(-w / 2, -h, w, h);
      g.lineStyle(6, 0xffffff, 0.25);
      g.lineBetween(-w / 2 + 14, -h + 30, -w / 2 + 44, -h + 80); // 유리 반짝임

      const size = picture ? 84 : label.length > 3 ? 46 : 60;
      const text = s.add
        .text(0, -h / 2, label, { fontFamily: FONT, fontSize: `${size}px`, color: '#ffffff', stroke: '#000000', strokeThickness: 6 })
        .setOrigin(0.5);

      const hl = s.add.graphics(); // 지금 달려가는 줄 표시
      hl.lineStyle(6, 0xffd166, 1);
      hl.strokeRect(-w / 2 - 14, -h - 14, w + 28, h + 14);

      const board = s.add.graphics().setVisible(false); // 막힌 문 (판자 X)
      board.lineStyle(18, 0x8b5a2b, 1);
      board.lineBetween(-w / 2, -h, w / 2, 0);
      board.lineBetween(w / 2, -h, -w / 2, 0);

      const c = s.add.container(0, 0, [g, text, hl, board]).setDepth(DEPTH.world);
      return { c, g, text, hl, board, w, h };
    }

    clearDoors(doors) {
      // 통과한 문들은 히어로 뒤로 지나가며 사라진다
      for (const d of doors) {
        const c = d.v.c;
        this.s.tweens.add({ targets: c, scale: c.scale * 1.3, alpha: 0, duration: 300, onComplete: () => c.destroy() });
      }
    }

    blockDoor(d) {
      d.v.hl.setVisible(false);
      d.v.g.setAlpha(0.25);
      d.v.text.setAlpha(0.35);
      d.v.board.setVisible(true);
    }

    /** 다가온 정도(p)에 맞춰 문 위치 · 크기를 갱신한다. 가까워질수록 빨라 보이도록 p^1.4 를 쓴다. */
    layout(doors, p, lane) {
      const sc = S_FAR + (1 - S_FAR) * Math.pow(p, 1.4);
      for (const d of doors) {
        const pos = project(this.laneXs[d.lane], sc);
        d.v.c.setPosition(pos.x, pos.y).setScale(sc);
        d.v.hl.setVisible(d.lane === lane && !d.used);
      }
    }

    moveHeroToLane(lane, ms) {
      this.hero.setFlipX(this.laneXs[lane] < this.hero.x);
      this.s.tweens.add({ targets: this.hero, x: this.laneXs[lane], duration: ms });
    }

    doorAt(doors, x, y) {
      return doors.find((d) => {
        const c = d.v.c;
        return Math.abs(x - c.x) <= (d.v.w * c.scale) / 2 + 12 && y <= c.y + 12 && y >= c.y - d.v.h * c.scale - 12;
      }) || null;
    }

    heroScreenX() {
      return this.hero.x;
    }

    doorScreenPos(d) {
      const c = d.v.c;
      return { x: c.x, y: c.y - (d.v.h * c.scale) / 2 };
    }

    markPass(d) {
      d.v.text.setColor('#06d6a0');
    }

    markWrong(d) {
      d.v.text.setColor('#ff5c5c');
    }

    crash(d, onFallen, onDone) {
      const s = this.s;
      const { x: cx, y: cy } = this.doorScreenPos(d);
      for (let i = 0; i < 10; i++) {
        const shard = s.add.triangle(cx, cy, 0, 0, 16, 4, 6, 18, 0x9be7ff, 0.85).setDepth(DEPTH.popup);
        s.tweens.add({
          targets: shard,
          x: cx + A.util.rand(-140, 140), y: cy + A.util.rand(80, 280), angle: A.util.rand(-180, 180), alpha: 0,
          duration: 700, onComplete: () => shard.destroy(),
        });
      }
      s.tweens.add({
        targets: this.hero, y: H + 80, angle: 80, duration: FALL_MS, ease: 'Quad.In',
        onComplete: () => {
          // 거미줄을 위로 쏴서 다시 올라온다 (거미 히어로다운 복귀)
          onFallen();
          s.tweens.add({ targets: this.hero, y: HERO_Y, angle: 0, duration: RESCUE_MS, ease: 'Back.Out', onComplete: onDone });
        },
      });
    }

    update(time, delta, st) {
      if (!st.busy) {
        this.scroll = (this.scroll + (delta / 600) * st.speed) % 1;
        this.hero.y = HERO_Y - Math.abs(Math.sin(time / 90)) * 6; // 달리는 들썩임
        if (st.dash && this.frame++ % 4 === 0) this.s.ghostTrail();
      }
      this.drawStripes();
      this.drawSpeedLines(time, st.dash && !st.busy);

      const g = this.webGfx;
      g.clear();
      if (st.rescuing) {
        const o = this.s.hand();
        g.lineStyle(3, this.s.shotColor, 0.95);
        g.lineBetween(o.x, o.y, o.x, HUD_H);
      }
    }
  }

  A.GateView2D = GateView2D;
})(window.ARAH);

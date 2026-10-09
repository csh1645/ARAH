/**
 * @file 팀별 공격 스타일 (보기를 고를 때 무엇이 날아가는지). 거미 = 거미줄, 아머 = 빔, 방패 = 방패 던지기,
 *       번개 = 번개, 거인 = 바위 · 점프 내려찍기, 궁수 = 화살, 마법 = 마법 구슬, 표범 = 발톱 할퀴기.
 * @layer game
 * @depends Phaser 3, A.util
 * @see web/src/data/heroes.js (HeroFamily.attack), modes/catch-mode.js · spell-mode.js · boss-mode.js
 *
 * 각 스타일은 같은 약속(AttackStyle)을 따른다. 놀이는 날아가는 위치(투사체 머리)만 계산하고,
 * 모양은 draw(), 맞았을 때 연출은 hit() 에 맡긴다. 새 팀을 추가하면 이 표에 스타일 하나만 더한다.
 */

/**
 * @typedef {Object} AttackDrawContext
 * @property {Phaser.GameObjects.Graphics} g  매 프레임 지우고 다시 그리는 그래픽
 * @property {{x: number, y: number}} from  쏜 곳 (히어로 손)
 * @property {{x: number, y: number}} to    투사체 머리 위치 (또는 끌어오는 대상)
 * @property {number} color  팀 줄 색
 * @property {number} time   장면 시간 ms (회전 · 깜빡임용)
 * @property {Object} look   히어로 외형 색 (HeroLook)
 */

/**
 * @typedef {Object} AttackStyle
 * @property {string} name   화면 · 문서용 이름
 * @property {number} speed  투사체 속도 배율 (거미줄 = 1)
 * @property {boolean} rope  손과 머리 사이를 줄로 이을지 (거미줄 · 빔 · 번개 · 화살 줄) — 끌어오기에도 쓴다
 * @property {(c: AttackDrawContext) => void} draw  투사체 그리기
 * @property {(scene: Phaser.Scene, x: number, y: number) => void} hit  맞았을 때 연출
 * @property {{arc: number}} [melee] 보스 배틀에서 투사체 대신 히어로가 직접 뛰어들어 때린다 (arc: 점프 높이 px)
 * @property {boolean} [returns]     보스 배틀에서 던진 것이 맞힌 뒤 손으로 돌아온다 (방패)
 */
(function (A) {
  'use strict';

  const hex = (s) => Phaser.Display.Color.HexStringToColor(s).color;

  /** 쏜 방향(단위 벡터)과 각도 */
  function dirOf(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len, angle: Math.atan2(dy, dx) };
  }

  /** 두 점 사이 지그재그 번개 */
  function zigzag(g, from, to, jitter, steps) {
    g.beginPath();
    g.moveTo(from.x, from.y);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      g.lineTo(from.x + (to.x - from.x) * t + A.util.rand(-jitter, jitter), from.y + (to.y - from.y) * t + A.util.rand(-jitter, jitter));
    }
    g.lineTo(to.x, to.y);
    g.strokePath();
  }

  /** 맞은 자리에서 잠깐 퍼지는 고리 (모든 스타일 공통 바탕) */
  function ring(scene, x, y, color, r) {
    const c = scene.add.circle(x, y, r, color, 0).setStrokeStyle(4, color, 0.9).setDepth(40);
    scene.tweens.add({ targets: c, scale: 2, alpha: 0, duration: 300, onComplete: () => c.destroy() });
  }

  /** @type {Object<string, AttackStyle>} */
  A.ATTACKS = {
    web: {
      name: '거미줄', speed: 1, rope: true,
      draw({ g, from, to, color }) {
        g.lineStyle(2, color, 0.85);
        g.lineBetween(from.x, from.y, to.x, to.y);
        g.fillStyle(color, 1);
        g.fillCircle(to.x, to.y, 5);
      },
      hit(s, x, y) { ring(s, x, y, 0xffffff, 14); },
    },

    laser: {
      name: '빔', speed: 2.8, rope: true,
      draw({ g, from, to, color, time }) {
        const w = 7 + Math.sin(time / 30) * 2; // 떨리는 굵은 빔
        g.lineStyle(w + 6, color, 0.25);
        g.lineBetween(from.x, from.y, to.x, to.y);
        g.lineStyle(w, color, 0.9);
        g.lineBetween(from.x, from.y, to.x, to.y);
        g.lineStyle(2, 0xffffff, 1);
        g.lineBetween(from.x, from.y, to.x, to.y);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(to.x, to.y, 7);
      },
      hit(s, x, y) {
        ring(s, x, y, 0x9be7ff, 18);
        s.flashScreen(0x9be7ff, 0.18);
      },
    },

    shield: {
      name: '방패 던지기', speed: 1.25, rope: false, returns: true,
      draw({ g, to, time, look }) {
        const r = 15;
        const spin = Math.cos(time / 40); // 빙글빙글 도는 느낌 (가로로 눌렸다 펴짐)
        const rx = r * Math.max(0.35, Math.abs(spin));
        g.fillStyle(hex(look.accent), 1);
        g.fillEllipse(to.x, to.y, rx * 2, r * 2);
        g.fillStyle(hex(look.line), 1);
        g.fillEllipse(to.x, to.y, rx * 1.5, r * 1.5);
        g.fillStyle(hex(look.suit), 1);
        g.fillEllipse(to.x, to.y, rx * 0.8, r * 0.8);
      },
      hit(s, x, y) {
        ring(s, x, y, 0xffffff, 16);
        s.burster.explode(10, x, y);
      },
    },

    bolt: {
      name: '번개', speed: 2.2, rope: true,
      draw({ g, from, to }) {
        g.lineStyle(7, 0xffd166, 0.35);
        zigzag(g, from, to, 12, 8);
        g.lineStyle(3, 0xfff3b0, 1);
        zigzag(g, from, to, 10, 8);
      },
      hit(s, x, y) {
        s.flashScreen(0xfff3b0, 0.3);
        s.cameras.main.shake(120, 0.005);
        ring(s, x, y, 0xffd166, 20);
      },
    },

    rock: {
      name: '바위 던지기', speed: 0.9, rope: false, melee: { arc: 230 }, // 보스전: 높이 뛰어 내려찍기
      draw({ g, from, to, time }) {
        const d = dirOf(from, to);
        g.fillStyle(0x8d6e63, 0.35); // 먼지 꼬리
        for (let i = 1; i <= 3; i++) g.fillCircle(to.x - d.x * i * 12, to.y - d.y * i * 12, 9 - i * 2);
        g.fillStyle(0x795548, 1);
        g.fillCircle(to.x, to.y, 13);
        g.fillStyle(0x5d4037, 1);
        g.fillCircle(to.x + 4 * Math.cos(time / 80), to.y + 4 * Math.sin(time / 80), 4); // 굴러가는 무늬
      },
      hit(s, x, y) {
        s.cameras.main.shake(180, 0.01);
        s.burster.explode(16, x, y);
        ring(s, x, y, 0xd4a373, 20);
      },
    },

    arrow: {
      name: '화살', speed: 1.7, rope: false,
      draw({ g, from, to, color }) {
        const d = dirOf(from, to);
        const tail = { x: to.x - d.x * 34, y: to.y - d.y * 34 };
        g.lineStyle(3, 0x8d6e63, 1); // 화살대
        g.lineBetween(tail.x, tail.y, to.x, to.y);
        const px = -d.y;
        const py = d.x;
        g.fillStyle(0xe0e0e0, 1); // 화살촉
        g.fillTriangle(to.x + d.x * 10, to.y + d.y * 10, to.x + px * 5, to.y + py * 5, to.x - px * 5, to.y - py * 5);
        g.fillStyle(color, 1); // 깃
        g.fillTriangle(tail.x, tail.y, tail.x - d.x * 8 + px * 6, tail.y - d.y * 8 + py * 6, tail.x + d.x * 4, tail.y + d.y * 4);
        g.fillTriangle(tail.x, tail.y, tail.x - d.x * 8 - px * 6, tail.y - d.y * 8 - py * 6, tail.x + d.x * 4, tail.y + d.y * 4);
      },
      hit(s, x, y) { ring(s, x, y, 0xc77dff, 12); },
    },

    orb: {
      name: '마법 구슬', speed: 1.1, rope: false,
      draw({ g, to, color, time }) {
        const pulse = 1 + Math.sin(time / 60) * 0.15;
        g.fillStyle(color, 0.25);
        g.fillCircle(to.x, to.y, 18 * pulse);
        g.fillStyle(color, 0.6);
        g.fillCircle(to.x, to.y, 11 * pulse);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(to.x, to.y, 5);
        g.fillStyle(0xfff3b0, 0.9); // 돌고 있는 반짝이
        for (let i = 0; i < 3; i++) {
          const a = time / 120 + (i * Math.PI * 2) / 3;
          g.fillCircle(to.x + Math.cos(a) * 20, to.y + Math.sin(a) * 20, 2.5);
        }
      },
      hit(s, x, y) {
        s.burster.explode(20, x, y);
        ring(s, x, y, 0xff9f1c, 18);
      },
    },

    claw: {
      name: '발톱 할퀴기', speed: 1.5, rope: false, melee: { arc: 70 }, // 보스전: 낮게 달려들어 할퀴기
      draw({ g, from, to, color }) {
        const d = dirOf(from, to);
        const px = -d.y;
        const py = d.x;
        g.lineStyle(3, color, 0.95);
        for (const k of [-1, 0, 1]) { // 세 줄 발톱 자국
          const ox = px * k * 8;
          const oy = py * k * 8;
          g.lineBetween(to.x + ox - d.x * 22, to.y + oy - d.y * 22, to.x + ox + d.x * 6, to.y + oy + d.y * 6);
        }
      },
      hit(s, x, y) {
        const g = s.add.graphics().setDepth(40); // 할퀸 자국이 잠깐 남는다
        g.lineStyle(4, 0xb388ff, 1);
        for (const k of [-1, 0, 1]) g.lineBetween(x - 18 + k * 10, y - 20, x + 6 + k * 10, y + 20);
        s.tweens.add({ targets: g, alpha: 0, duration: 400, onComplete: () => g.destroy() });
      },
    },
  };

  /**
   * 히어로 팀의 공격 스타일
   * @param {Hero} hero
   * @returns {AttackStyle}
   */
  A.attackOf = (hero) => A.ATTACKS[A.findFamily(hero).attack] || A.ATTACKS.web;
})(window.ARAH);

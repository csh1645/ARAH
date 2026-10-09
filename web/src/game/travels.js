/**
 * @file 팀별 "건너가기" 연출 (빌딩 스윙 모드에서 정답 빌딩으로 이동하는 방법).
 *       거미 = 거미줄 스윙, 아머 = 제트 비행, 방패 = 공중제비, 번개 = 번개 비행,
 *       거인 = 거인 점프, 궁수 = 화살 줄타기, 마법 = 순간이동, 표범 = 두 번 도약.
 * @layer game
 * @depends Phaser 3, A.util (bezier2, rand)
 * @see web/src/data/heroes.js (HeroFamily.travel), web/src/game/modes/swing-mode.js
 *
 * 새 팀을 추가하면: heroes.js 의 HERO_FAMILIES 에 travel 키를 정하고, 여기 A.TRAVELS 에 같은 키로 함수를 추가한다.
 * 모든 이동 함수는 같은 약속(TravelContext)을 따른다: 히어로를 from → to 로 옮기고, 끝나면 ctx.done() 을 한 번 부른다.
 * 히어로의 각도 · 크기 · 투명도는 바꿔도 되며, 모드가 done 이후 원래대로 되돌린다.
 */

/**
 * 이동 중 손(또는 지정한 시작점)에서 그릴 줄. 모드가 매 프레임 그린다.
 * @typedef {Object} TravelLine
 * @property {{x: number, y: number}} to   줄 끝 (움직이는 객체를 넘기면 따라간다)
 * @property {{x: number, y: number}} [from] 줄 시작 (없으면 히어로 손)
 * @property {number} color
 * @property {boolean} [zigzag] 번개처럼 지그재그로 그릴지
 */

/**
 * @typedef {Object} TravelContext
 * @property {Phaser.Scene} scene  RoundScene (player, tweens, add, burster, cameras, ghostTrail, popup, flashScreen, hero, ab)
 * @property {{x: number, y: number}} from   출발 위치 (히어로 현재 위치)
 * @property {{x: number, y: number}} to     도착 위치 (빌딩 옥상 위의 히어로 위치)
 * @property {{x: number, y: number}} anchor 빌딩 안테나 끝 (줄을 거는 곳)
 * @property {number} color  팀 줄 색
 * @property {(line: TravelLine|null) => void} setLine 그릴 줄 지정 / 지우기
 * @property {() => void} done 도착했을 때 한 번 부른다
 */
(function (A) {
  'use strict';

  const BASE_MS = 850; // 기본 이동 시간. 히어로 능력 webSpeed 배율만큼 빨라진다

  /**
   * t 를 0 → 1 로 바꾸면서 매 프레임 onStep(t) 를 부르는 공통 tween.
   * @param {Phaser.Scene} s
   * @param {number} duration ms
   * @param {string} ease Phaser ease 이름
   * @param {(t: number, frame: number) => void} onStep
   * @param {() => void} onDone
   */
  function run(s, duration, ease, onStep, onDone) {
    const p = { t: 0 };
    let frame = 0;
    s.tweens.add({
      targets: p, t: 1, duration, ease,
      onUpdate: () => onStep(p.t, frame++),
      onComplete: onDone,
    });
  }

  /** 곡선(시작 → 조절점 → 도착)을 따라 히어로를 옮긴다 */
  function follow(s, S, C, E, t) {
    const pt = A.util.bezier2(S, C, E, t);
    s.player.setPosition(pt.x, pt.y);
  }

  const speedOf = (s) => s.ab.webSpeed || 1;

  A.TRAVELS = {
    /** 🕸️ 거미줄 스윙: 안테나에 줄을 걸고 아래로 처지는 곡선으로 건너간다 */
    swing(ctx) {
      const { scene: s, from: S, to: E, anchor } = ctx;
      const C = { x: (S.x + E.x) / 2, y: Math.max(S.y, E.y) + 130 };
      ctx.setLine({ to: anchor, color: ctx.color });
      run(s, BASE_MS / speedOf(s), 'Sine.InOut', (t, f) => {
        follow(s, S, C, E, t);
        s.player.angle = -25 + 50 * t;
        if (f % 3 === 0) s.ghostTrail();
      }, () => { ctx.setLine(null); ctx.done(); });
    },

    /** ⚙️ 제트 비행: 발에서 불꽃을 뿜으며 위로 솟았다가 내려앉는다 */
    fly(ctx) {
      const { scene: s, from: S, to: E } = ctx;
      const C = { x: (S.x + E.x) / 2, y: Math.min(S.y, E.y) - 140 };
      run(s, (BASE_MS + 100) / speedOf(s), 'Sine.InOut', (t, f) => {
        follow(s, S, C, E, t);
        s.player.angle = -15 + 25 * t;
        if (f % 2 === 0) { // 추진기 불꽃
          const flame = s.add.circle(s.player.x + A.util.rand(-6, 6), s.player.y + 48, A.util.rand(4, 8), A.util.pick([0xffb703, 0xfb8500, 0xffd166]))
            .setDepth(s.player.depth - 1);
          s.tweens.add({ targets: flame, y: flame.y + 30, alpha: 0, scale: 0.3, duration: 260, onComplete: () => flame.destroy() });
        }
      }, ctx.done);
    },

    /** 🛡️ 방패 공중제비: 높이 뛰어 한 바퀴 돌고, 방패가 곁에서 함께 돈다 */
    vault(ctx) {
      const { scene: s, from: S, to: E } = ctx;
      const C = { x: (S.x + E.x) / 2, y: Math.min(S.y, E.y) - 170 };
      const look = s.hero.look;
      const shield = s.add.container(S.x, S.y, [
        s.add.circle(0, 0, 14, Phaser.Display.Color.HexStringToColor(look.accent).color),
        s.add.circle(0, 0, 9, Phaser.Display.Color.HexStringToColor(look.line).color),
        s.add.circle(0, 0, 5, Phaser.Display.Color.HexStringToColor(look.suit).color),
      ]).setDepth(s.player.depth + 1);
      run(s, (BASE_MS + 50) / speedOf(s), 'Sine.InOut', (t) => {
        follow(s, S, C, E, t);
        s.player.angle = 360 * t; // 공중제비
        shield.setPosition(s.player.x + Math.cos(t * 12) * 34, s.player.y + Math.sin(t * 12) * 20);
      }, () => { shield.destroy(); ctx.done(); });
    },

    /** ⚡ 번개 비행: 번개 자국을 남기며 일직선으로 빠르게 날아간다 */
    bolt(ctx) {
      const { scene: s, from: S, to: E } = ctx;
      ctx.setLine({ from: { ...S }, to: s.player, color: 0xffd166, zigzag: true });
      run(s, (BASE_MS * 0.6) / speedOf(s), 'Quad.In', (t) => {
        s.player.setPosition(S.x + (E.x - S.x) * t, S.y + (E.y - S.y) * t);
        s.player.angle = -12;
      }, () => {
        ctx.setLine(null);
        s.flashScreen(0xfff3b0, 0.3);
        s.burster.explode(16, E.x, E.y);
        ctx.done();
      });
    },

    /** 💪 거인 점프: 아주 높이 뛰어 "쿵!" 하고 착지, 화면이 흔들린다 */
    leap(ctx) {
      const { scene: s, from: S, to: E } = ctx;
      const C = { x: (S.x + E.x) / 2, y: Math.min(S.y, E.y) - 240 };
      s.tweens.add({ targets: s.player, scaleY: 0.75, duration: 120, yoyo: true }); // 웅크렸다 뛰기
      run(s, (BASE_MS + 250) / speedOf(s), 'Sine.InOut', (t) => {
        follow(s, S, C, E, t);
      }, () => {
        s.cameras.main.shake(220, 0.012);
        s.burster.explode(22, E.x, E.y + 45);
        s.popup(E.x, E.y - 70, '쿵!', '#d4a373');
        ctx.done();
      });
    },

    /** 🎯 화살 줄타기: 안테나에 화살 줄을 쏘고, 줄을 타고 미끄러진 뒤 옥상에 내린다 */
    zip(ctx) {
      const { scene: s, from: S, to: E, anchor } = ctx;
      const tip = { ...s.hand() };
      ctx.setLine({ to: tip, color: ctx.color });
      const speed = speedOf(s);
      s.tweens.add({
        targets: tip, x: anchor.x, y: anchor.y, duration: 220 / speed,
        onComplete: () => {
          const R = { x: anchor.x - 12, y: anchor.y + 46 }; // 줄 끝 아래 (손이 줄에 매달린 위치)
          ctx.setLine({ to: anchor, color: ctx.color });
          run(s, 460 / speed, 'Sine.In', (t) => {
            s.player.setPosition(S.x + (R.x - S.x) * t, S.y + (R.y - S.y) * t);
            s.player.angle = -10;
          }, () => {
            ctx.setLine(null);
            s.tweens.add({ targets: s.player, x: E.x, y: E.y, angle: 0, duration: 220, ease: 'Quad.In', onComplete: ctx.done });
          });
        },
      });
    },

    /** 🔮 순간이동: 포털 속으로 사라졌다가 도착 지점의 포털에서 나타난다 */
    teleport(ctx) {
      const { scene: s, from: S, to: E } = ctx;
      const portal = (x, y) => {
        const g = s.add.graphics({ x, y }).setDepth(s.player.depth - 1).setScale(0);
        g.lineStyle(4, 0xff9f1c, 1);
        g.strokeEllipse(0, 0, 90, 34);
        g.lineStyle(2, 0xffd166, 0.8);
        g.strokeEllipse(0, 0, 64, 22);
        s.tweens.add({ targets: g, scale: 1, angle: 180, duration: 300 });
        return g;
      };
      const p1 = portal(S.x, S.y + 40);
      s.sfx('teleport');
      const dur = 280 / speedOf(s);
      s.tweens.add({
        targets: s.player, scale: 0, alpha: 0, angle: 180, duration: dur, ease: 'Back.In',
        onComplete: () => {
          s.tweens.add({ targets: p1, scale: 0, duration: 200, onComplete: () => p1.destroy() });
          s.player.setPosition(E.x, E.y);
          const p2 = portal(E.x, E.y + 40);
          s.burster.explode(18, E.x, E.y);
          s.tweens.add({
            targets: s.player, scale: 1, alpha: 1, angle: 0, duration: dur + 60, ease: 'Back.Out', delay: 120,
            onComplete: () => {
              s.tweens.add({ targets: p2, scale: 0, duration: 200, onComplete: () => p2.destroy() });
              ctx.done();
            },
          });
        },
      });
    },

    /** 🐾 표범 점프: 낮고 빠르게 두 번 도약한다 (잔상이 남는다) */
    pounce(ctx) {
      const { scene: s, from: S, to: E } = ctx;
      const M = { x: (S.x + E.x) / 2, y: Math.min(S.y, E.y) - 20 };
      const hop = (A1, B1, next) => {
        const C = { x: (A1.x + B1.x) / 2, y: Math.min(A1.y, B1.y) - 90 };
        run(s, 340 / speedOf(s), 'Sine.Out', (t, f) => {
          follow(s, A1, C, B1, t);
          s.player.angle = 18 - 10 * t;
          if (f % 2 === 0) s.ghostTrail();
        }, next);
      };
      hop(S, M, () => hop(M, E, ctx.done));
    },
  };
})(window.ARAH);

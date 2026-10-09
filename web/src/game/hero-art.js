/**
 * @file 히어로 외형을 Canvas 2D 로 직접 그린다 (외부 이미지 없음 → 저작권 걱정 없음).
 *       메뉴 카드(DOM canvas)와 게임 텍스처(Phaser CanvasTexture)가 같은 함수를 쓴다.
 * @layer game
 * @depends 없음 (Hero 데이터만 받음)
 * @see web/src/data/heroes.js (HeroLook), doc/decisions/ADR-0002-original-characters.md
 *
 * 좌표계: 모든 도형은 64 x 72 기준 좌표로 그리고, drawHero 에서 실제 크기로 확대한다.
 * 새 머리 모양을 추가하려면 head() 에 style 분기를 추가하고 HeroLook typedef 도 갱신한다.
 * TODO(phase2): 그래픽 리소스가 생기면 이 파일을 스프라이트 시트 로딩으로 교체한다.
 */
(function (A) {
  'use strict';

  const TAU = Math.PI * 2;

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function limb(ctx, color, x1, y1, x2, y2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function circle(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  function webPattern(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 2);
      ctx.lineTo(cx + Math.cos(a) * r * 1.6, cy + 2 + Math.sin(a) * r * 1.6);
      ctx.stroke();
    }
    for (const rad of [5, 10, 15]) {
      ctx.beginPath();
      ctx.arc(cx, cy + 2, rad, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function eyes(ctx, round) {
    // 바깥쪽 끝이 올라간 히어로 마스크 눈. 탐정은 동그란 고글.
    [[25, 1], [39, -1]].forEach(([x, tilt]) => {
      ctx.beginPath();
      if (round) ctx.arc(x, 20, 5, 0, TAU);
      else ctx.ellipse(x, 20, 6, 4, tilt * 0.5, 0, TAU);
      ctx.fillStyle = round ? '#d9d9d9' : '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#111111';
      ctx.stroke();
    });
  }

  function emblem(ctx, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(32, 41, 2.2, 3.6, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (const side of [-1, 1]) {
      for (const [dx, dy] of [[6, -5], [7, -1], [7, 3], [6, 7]]) {
        ctx.beginPath();
        ctx.moveTo(32, 41);
        ctx.lineTo(32 + side * dx, 41 + dy);
        ctx.stroke();
      }
    }
  }

  /**
   * 머리. back=true 이면 뒷모습(눈 · 코 없이 무늬만)을 그린다.
   */
  function head(ctx, look, back) {
    const { style, suit, accent, line } = look;
    if (style === 'hood') {
      circle(ctx, 32, 20, 16, accent);
      if (back) return; // 뒤에서는 후드만 보인다
      circle(ctx, 32, 21, 12, suit);
      webPattern(ctx, 32, 21, 12, line);
      eyes(ctx, false);
      return;
    }
    if (style === 'pig') {
      ctx.fillStyle = suit;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(32 + s * 8, 9);
        ctx.lineTo(32 + s * 15, 1);
        ctx.lineTo(32 + s * 14, 12);
        ctx.closePath();
        ctx.fill();
      }
      circle(ctx, 32, 20, 14, suit);
      webPattern(ctx, 32, 20, 14, line);
      if (back) return;
      eyes(ctx, false);
      ctx.fillStyle = '#ff7aa2';
      ctx.beginPath();
      ctx.ellipse(32, 28, 5.5, 4, 0, 0, TAU);
      ctx.fill();
      circle(ctx, 30, 28, 1.1, '#7a1f3d');
      circle(ctx, 34, 28, 1.1, '#7a1f3d');
      return;
    }
    circle(ctx, 32, 20, 14, suit);
    webPattern(ctx, 32, 20, 14, line);
    if (!back) eyes(ctx, style === 'detective');
    if (style === 'detective') {
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.ellipse(32, 9, 18, 3.5, 0, 0, TAU);
      ctx.fill();
      roundRect(ctx, 22, 0, 20, 9, 3);
    }
    if (style === 'future' && !back) {
      ctx.strokeStyle = line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, 12);
      ctx.lineTo(32, 26);
      ctx.lineTo(44, 12);
      ctx.stroke();
    }
  }

  /**
   * 히어로 한 명을 캔버스에 그린다. 오른팔을 들어 거미줄을 쏘는 자세다.
   * 오른손 위치는 기준 좌표 (54, 27) 이며, play-scene.js 의 HAND_OFFSET 이 이 값에 맞춰져 있다.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Hero} hero
   * @param {number} w 캔버스 너비 (px)
   * @param {number} h 캔버스 높이 (px)
   * @param {{back?: boolean}} [opts] back: 뒷모습 (3D 3인칭 시점처럼 카메라가 히어로 뒤에 있을 때)
   */
  A.drawHero = function (ctx, hero, w, h, opts = {}) {
    const look = hero.look;
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.scale(w / 64, h / 72);

    // 다리, 부츠
    ctx.fillStyle = look.accent;
    roundRect(ctx, 22, 52, 8, 15, 3);
    roundRect(ctx, 34, 52, 8, 15, 3);
    ctx.fillStyle = look.suit;
    roundRect(ctx, 20, 63, 11, 7, 3);
    roundRect(ctx, 33, 63, 11, 7, 3);

    // 팔: 왼팔은 아래, 오른팔은 거미줄을 쏘는 자세로 위
    limb(ctx, look.suit, 20, 38, 11, 50);
    limb(ctx, look.suit, 44, 38, 54, 27);

    // 몸통
    ctx.fillStyle = look.suit;
    roundRect(ctx, 19, 33, 26, 23, 8);
    ctx.fillStyle = look.accent;
    roundRect(ctx, 19, 48, 26, 8, 4);
    emblem(ctx, look.emblem); // 앞뒤 모두 거미 문양 (등에도 있는 디자인)

    head(ctx, look, !!opts.back);
    ctx.restore();
  };
})(window.ARAH);

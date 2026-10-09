/**
 * @file 히어로 외형을 Canvas 2D 로 직접 그린다 (외부 이미지 파일 없음).
 *       메뉴 카드(DOM canvas) · 게임 텍스처(Phaser CanvasTexture) · 3D 스프라이트가 같은 함수를 쓴다.
 *       원조 히어로를 떠올리게 하는 오마주 디자인이되, 공식 로고 · 글자 마크는 그리지 않는다 (ADR-0002 개정).
 * @layer game
 * @depends 없음 (Hero 데이터만 받음)
 * @see web/src/data/heroes.js (HeroLook), doc/decisions/ADR-0002-original-characters.md
 *
 * 좌표계: 모든 도형은 64 x 72 기준 좌표로 그리고, drawHero 에서 실제 크기로 확대한다.
 * 새 머리 모양을 추가하려면 head() 에 style 분기를 추가하고 HeroLook typedef 도 갱신한다.
 * 자세(애니메이션 프레임)는 POSES 표 하나로 정한다: 팀 체형은 손 위치(P.hand · P.off)와 legPair 만 쓰면 모든 자세를 지원한다.
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

  // ---------- 공통 부품 ----------

  const SKIN = '#f1c27d';

  /** 색을 밝게(amt > 0) / 어둡게(amt < 0). amt 는 -1 ~ 1 */
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
    return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
  }

  /** 반짝이는 하이라이트 (입체감) */
  function gloss(ctx, x, y, rx, ry) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, -0.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /** 다각형 채우기 */
  function poly(ctx, color, pts) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill();
  }

  /** 오각 별 */
  function star(ctx, cx, cy, r, color) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.45;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    poly(ctx, color, pts);
  }

  /** 얼굴이 보이는 히어로의 눈 (작은 검은 눈동자) */
  function faceEyes(ctx, y) {
    circle(ctx, 28, y, 1.4, '#1a1a1a');
    circle(ctx, 36, y, 1.4, '#1a1a1a');
  }

  function line(ctx, color, width, pts) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  // ---------- 자세 (pose) ----------
  // 그림 한 장으로는 단조롭다 → 팔 각도 · 다리 각도 · 몸 기울기만 바꾼 여러 장(프레임)을 만들어 상황마다 바꿔 끼운다.
  // 팀 체형 코드는 손 위치(P.hand, P.off)와 다리 함수(legPair)만 쓰면 모든 자세를 자동으로 지원한다.

  /** 기본 체형의 어깨 (오른쪽 = 줄을 쏘는 팔) */
  const SHOULDER = { r: [44, 38], l: [20, 38] };
  const ARM_LEN = 15;
  /** 기본 자세의 오른손 위치. 장비(망치 · 활 · 마법진 · 발톱)는 여기 기준으로 그린 뒤 손을 따라 옮긴다 */
  const HAND0 = [54, 27];

  /**
   * 자세 표. 각도는 라디안(화면 좌표, 아래가 +), r/l = 오른팔/왼팔, legs = [왼다리, 오른다리] 기울기,
   * tuck = 다리 접힘(1 = 쭉 폄), lean = 몸 기울기(+ 앞으로), face = 머리 옆 표정 효과.
   * @typedef {{r: number, l: number, len?: number, legs: number[], tuck?: number, lean?: number, face?: string}} PoseDef
   * @type {Object<string, PoseDef>}
   */
  const POSES = {
    idle: { r: -0.83, l: 2.21, legs: [0, 0] }, // 오른팔을 든 기본 자세
    breath: { r: -0.72, l: 2.12, legs: [0, 0] }, // 숨쉬기 (idle 과 번갈아)
    run1: { r: -0.25, l: 2.75, legs: [-0.55, 0.5], lean: 0.08 },
    run2: { r: 0.85, l: 1.55, legs: [0.5, -0.55], lean: 0.08 },
    attack: { r: -0.22, l: 2.75, len: 16.5, legs: [-0.2, 0.3], lean: 0.12 }, // 팔을 쭉 뻗어 쏘기 · 때리기
    jump: { r: -1.25, l: -1.9, legs: [-0.75, 0.45], tuck: 0.72 }, // 두 팔 위로, 다리 접기
    hurt: { r: -1.95, l: -1.2, legs: [0.25, -0.1], lean: -0.16, face: 'hurt' }, // 팔로 얼굴 가리며 움찔
    win: { r: -1.05, l: -2.1, legs: [-0.28, 0.28], face: 'happy' }, // 만세 V 자세
  };
  /** 게임이 만드는 프레임 목록 (round-scene.js 가 텍스처로 미리 만든다) */
  A.HERO_POSES = Object.keys(POSES);

  /** 어깨 s 에서 각도 a 로 뻗은 손 위치 */
  function reach(s, a, len) {
    return [s[0] + Math.cos(a) * len, s[1] + Math.sin(a) * len];
  }

  /** 자세 정의 → 그리기용 값 (손 위치, 장비 이동량 등) */
  function resolvePose(name) {
    const d = POSES[name] || POSES.idle;
    const hand = reach(SHOULDER.r, d.r, d.len || ARM_LEN);
    return {
      ...d,
      name,
      hand,
      off: reach(SHOULDER.l, d.l, d.len || ARM_LEN),
      shift: [hand[0] - HAND0[0], hand[1] - HAND0[1]], // 장비를 손 따라 옮길 양
    };
  }

  /**
   * 엉덩이에서 기울어진 다리 한 쌍 (다리 + 부츠). 서 있을 때 원래 그림과 같은 모양이다.
   * @param {number[]} hips 왼쪽 · 오른쪽 엉덩이 x
   * @param {{y: number, w: number, len: number, bootW: number, bootH: number}} m 치수
   */
  function legPair(ctx, P, legColor, bootColor, hips, m) {
    hips.forEach((hx, i) => {
      ctx.save();
      ctx.translate(hx, m.y);
      ctx.rotate(P.legs[i]);
      ctx.scale(1, P.tuck || 1);
      ctx.fillStyle = legColor;
      roundRect(ctx, -m.w / 2, 0, m.w, m.len, 3);
      ctx.fillStyle = bootColor;
      roundRect(ctx, -m.bootW / 2, m.len - 4, m.bootW, m.bootH, 3);
      ctx.restore();
    });
  }
  const LEGS = { y: 52, w: 8, len: 15, bootW: 11, bootH: 7 };

  /** 손에 든 장비를 기본 자세 기준 좌표로 그리고 손 위치로 옮긴다 */
  function atHand(ctx, P, draw) {
    ctx.save();
    ctx.translate(P.shift[0], P.shift[1]);
    draw();
    ctx.restore();
  }

  /** 머리 옆 표정 효과: 아플 때 땀방울 · 어지러운 별, 이겼을 때 반짝이 (모든 팀 공통) */
  function faceFx(ctx, P) {
    if (P.face === 'hurt') {
      ctx.fillStyle = '#8fd3ff';
      ctx.beginPath();
      ctx.moveTo(48, 4);
      ctx.quadraticCurveTo(52, 10, 48, 12);
      ctx.quadraticCurveTo(44, 10, 48, 4);
      ctx.fill();
      star(ctx, 14, 6, 3.4, '#ffd166');
      star(ctx, 20, 2.8, 2.4, '#ffd166');
    } else if (P.face === 'happy') {
      star(ctx, 8, 8, 3.6, '#ffd166');
      star(ctx, 57, 5, 3.2, '#fff3b0');
      star(ctx, 4, 20, 2.2, '#fff3b0');
    }
  }

  /**
   * 기본 체형: 다리 · 부츠 · 팔 · 장갑 · 몸통 · 허리. 팔다리는 자세(P)를 따른다.
   * @param {Object} P 자세 (resolvePose)
   * @param {Object} [c] 부위별 색 덮어쓰기 { legs, boots, arms, gloves, torso, belt }
   */
  function baseBody(ctx, look, P, c = {}) {
    legPair(ctx, P, c.legs || look.accent, c.boots || look.suit, [26, 38], LEGS);
    const arms = c.arms || look.suit;
    limb(ctx, arms, SHOULDER.l[0], SHOULDER.l[1], P.off[0], P.off[1]);
    limb(ctx, arms, SHOULDER.r[0], SHOULDER.r[1], P.hand[0], P.hand[1]);
    circle(ctx, P.off[0], P.off[1], 3.8, c.gloves || arms);
    circle(ctx, P.hand[0], P.hand[1], 3.8, c.gloves || arms);
    ctx.fillStyle = c.torso || look.suit;
    roundRect(ctx, 19, 33, 26, 23, 8);
    gloss(ctx, 25, 38, 4, 2.5);
    ctx.fillStyle = c.belt || look.accent;
    roundRect(ctx, 19, 48, 26, 8, 4);
  }

  // ---------- 팀별 체형 ----------
  // 모두 64 x 72 기준 좌표. 팔다리는 자세(P)를 따르고, 손에 든 장비는 기본 자세 손 (54, 27) 기준으로 그려 atHand 로 옮긴다.
  // 원조 히어로를 떠올리게 하는 대표 색 · 장비 · 실루엣을 쓰되, 로고 · 글자 마크는 그리지 않는다 (ADR-0002).

  /** 거미 팀 */
  function drawSpider(ctx, look, back, P) {
    baseBody(ctx, look, P);
    emblem(ctx, look.emblem); // 앞뒤 모두 거미 문양 (등에도 있는 디자인)
    head(ctx, look, back);
    gloss(ctx, 27, 13, 4, 2.5);
  }

  /** 아머 팀: 금색 얼굴판 헬멧, 빛나는 가슴 코어, 손바닥 빔 */
  function drawArmor(ctx, look, back, P) {
    const { suit, accent, emblem: glow } = look;
    baseBody(ctx, look, P, { legs: suit, boots: suit, belt: shade(suit, -0.12), gloves: suit });
    ctx.fillStyle = accent; // 금색 판: 정강이 · 복부
    roundRect(ctx, 24, 44, 16, 4, 2); // 복부 판 (정강이 판은 다리를 따라 움직이도록 생략)
    circle(ctx, (SHOULDER.l[0] + P.off[0] * 1.5) / 2.5, (SHOULDER.l[1] + P.off[1] * 1.5) / 2.5, 2.4, accent); // 팔뚝 판
    circle(ctx, (SHOULDER.r[0] + P.hand[0] * 1.5) / 2.5, (SHOULDER.r[1] + P.hand[1] * 1.5) / 2.5, 2.4, accent);
    for (const x of [19, 45]) {
      circle(ctx, x, 35, 4.6, suit); // 어깨 보호대
      gloss(ctx, x - 1, 33.5, 2, 1.2);
    }
    if (back) {
      line(ctx, shade(suit, -0.25), 1.5, [[26, 38], [38, 38]]); // 등 통풍구
      line(ctx, shade(suit, -0.25), 1.5, [[26, 41], [38, 41]]);
    } else {
      ctx.save();
      ctx.globalAlpha = 0.4;
      circle(ctx, 32, 39, 7.5, glow); // 가슴 코어 빛무리
      ctx.restore();
      circle(ctx, 32, 39, 4.3, glow);
      circle(ctx, 32, 39, 2, '#ffffff');
    }
    ctx.save(); // 손바닥 빔
    ctx.globalAlpha = P.name === 'attack' ? 0.75 : 0.45; // 쏠 때 더 밝게
    circle(ctx, P.hand[0], P.hand[1], P.name === 'attack' ? 8 : 6, glow);
    ctx.restore();
    circle(ctx, P.hand[0], P.hand[1], 2.4, '#ffffff');
    ctx.fillStyle = suit; // 헬멧
    roundRect(ctx, 21, 6, 22, 27, 10);
    gloss(ctx, 27, 12, 4, 2.5);
    if (back) {
      ctx.fillStyle = accent;
      roundRect(ctx, 29, 8, 6, 20, 3);
    } else {
      poly(ctx, accent, [[24, 13], [40, 13], [40, 24], [36, 30], [28, 30], [24, 24]]); // 금색 얼굴판
      ctx.fillStyle = glow; // 빛나는 눈
      roundRect(ctx, 25.5, 17, 5, 2.4, 1);
      roundRect(ctx, 33.5, 17, 5, 2.4, 1);
      line(ctx, shade(accent, -0.3), 0.8, [[29, 26], [35, 26]]);
    }
  }

  /** 방패 팀: 파란 슈트, 가슴 별, 빨강 · 흰 줄무늬 배, 날개 헬멧, 줄무늬 둥근 방패 */
  function drawShield(ctx, look, back, P) {
    const skin = look.skin || SKIN;
    baseBody(ctx, look, P, { legs: look.suit, boots: look.accent, gloves: look.accent });
    for (let i = 0; i < 5; i++) { // 배 줄무늬
      ctx.fillStyle = i % 2 ? look.line : look.accent;
      ctx.fillRect(21 + i * 4.4, 44, 4.4, 9);
    }
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(19, 52, 26, 3); // 벨트
    if (!back) star(ctx, 32, 38, 4.6, look.emblem);
    for (const s of [-1, 1]) { // 헬멧 날개
      poly(ctx, look.line, [[32 + s * 10, 16], [32 + s * 18, 10], [32 + s * 16, 15], [32 + s * 19, 15], [32 + s * 13, 21]]);
    }
    circle(ctx, 32, 20, 13, look.suit);
    if (!back) {
      ctx.fillStyle = skin; // 헬멧 아래로 보이는 얼굴
      ctx.beginPath();
      ctx.ellipse(32, 24, 9, 8, 0, 0, Math.PI);
      ctx.fill();
      circle(ctx, 28, 20, 2.2, skin);
      circle(ctx, 36, 20, 2.2, skin);
      faceEyes(ctx, 20);
    }
    gloss(ctx, 27, 13, 4, 2.5);
    const [sx, sy, sr] = back ? [32, 43, 12.5] : [P.off[0], P.off[1] - 2, 11.5]; // 방패: 앞=왼손, 뒤=등
    circle(ctx, sx, sy, sr, look.accent);
    circle(ctx, sx, sy, sr * 0.78, look.line);
    circle(ctx, sx, sy, sr * 0.57, look.accent);
    circle(ctx, sx, sy, sr * 0.37, look.suit);
    star(ctx, sx, sy, sr * 0.32, look.emblem);
    gloss(ctx, sx - sr * 0.35, sy - sr * 0.35, sr * 0.35, sr * 0.2);
  }

  /** 번개 팀: 빨간 망토, 은빛 원판 갑옷, 맨팔, 금발, 망치 */
  function drawThunder(ctx, look, back, P) {
    const skin = look.skin || SKIN;
    const hair = look.hair || '#f4d35e';
    const cape = [[19, 33], [45, 33], [53, 69], [11, 69]];
    if (!back) {
      poly(ctx, look.accent, cape); // 앞모습: 망토는 몸 뒤
      ctx.fillStyle = hair; // 어깨까지 오는 머리 (뒤쪽)
      roundRect(ctx, 20, 11, 24, 23, 9);
    }
    baseBody(ctx, look, P, { legs: look.suit, boots: '#5d4037', arms: skin, gloves: look.suit, belt: shade(look.suit, -0.1) });
    for (const [x, y] of [[27, 37], [32, 37], [37, 37], [27, 42], [32, 42], [37, 42]]) circle(ctx, x, y, 1.9, look.line); // 원판 장식
    if (back) {
      poly(ctx, look.accent, cape); // 뒷모습: 망토가 몸을 덮는다
      ctx.fillStyle = hair;
      roundRect(ctx, 20, 8, 24, 26, 10);
    } else {
      circle(ctx, 32, 21, 10.5, skin);
      ctx.fillStyle = hair;
      roundRect(ctx, 21, 9, 22, 8, 4);
      faceEyes(ctx, 21);
      gloss(ctx, 28, 15, 3, 2);
    }
    atHand(ctx, P, () => {
      ctx.fillStyle = '#8d6e63'; // 망치 손잡이
      roundRect(ctx, 52.8, 17, 2.6, 13, 1);
      ctx.fillStyle = look.line; // 망치 머리
      roundRect(ctx, 46.5, 9.5, 15, 8.5, 2);
      gloss(ctx, 50, 11.5, 3, 1.4);
      poly(ctx, look.emblem, [[59, 4], [56, 9], [58, 9], [55, 14], [61, 7], [59, 7], [61, 4]]); // 번개 불꽃
    });
  }

  /** 거인 팀: 근육질 거대한 몸, 찢어진 반바지, 화난 눈썹 */
  function drawGiant(ctx, look, back, P) {
    const s = look.suit;
    const hair = look.hair || '#1a1a1a';
    legPair(ctx, P, s, s, [24, 40], { y: 54, w: 12, len: 12, bootW: 15, bootH: 8 }); // 굵은 다리 · 맨발
    ctx.fillStyle = look.accent; // 찢어진 반바지
    roundRect(ctx, 16, 47, 32, 10, 4);
    poly(ctx, look.accent, [[16, 56], [20, 61], [23, 56], [27, 60], [30, 56], [34, 60], [37, 56], [41, 61], [44, 56], [48, 56]]);
    const fistL = [P.off[0] - 2, P.off[1] + 1]; // 거인은 어깨가 넓어 손이 조금 더 바깥
    const fistR = [P.hand[0] + 1, P.hand[1] - 2];
    line(ctx, s, 11, [[17, 36], fistL]); // 굵은 팔
    line(ctx, s, 11, [[47, 36], fistR]);
    circle(ctx, fistL[0], fistL[1], 6, s); // 큰 주먹
    circle(ctx, fistR[0], fistR[1], P.name === 'attack' ? 7.5 : 6, s); // 때릴 때 주먹이 커 보이게
    ctx.fillStyle = s;
    roundRect(ctx, 13, 27, 38, 23, 11);
    gloss(ctx, 21, 33, 5, 3);
    if (!back) { // 가슴 · 배 근육
      ctx.strokeStyle = look.line;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(25, 33, 6.5, 0.3, 2.6);
      ctx.moveTo(45.4, 35);
      ctx.arc(39, 33, 6.5, 0.3, 2.6);
      ctx.stroke();
      line(ctx, look.line, 1, [[32, 38], [32, 47]]);
      line(ctx, look.line, 1, [[28, 42], [36, 42]]);
    } else {
      line(ctx, look.line, 1.3, [[32, 30], [32, 46]]); // 등 근육
    }
    circle(ctx, 32, 18, 11, s);
    poly(ctx, hair, [[21, 16], [22, 8], [26, 10], [29, 5], [32, 9], [36, 5], [38, 10], [42, 8], [43, 16], [38, 12], [26, 12]]); // 덥수룩한 머리
    if (back) {
      ctx.fillStyle = hair;
      roundRect(ctx, 22, 9, 20, 12, 5);
    } else {
      poly(ctx, '#1a1a1a', [[24, 15], [30, 17.5], [30, 19], [24, 16.6]]); // 화난 눈썹
      poly(ctx, '#1a1a1a', [[40, 15], [34, 17.5], [34, 19], [40, 16.6]]);
      circle(ctx, 28, 20, 1.6, '#ffffff');
      circle(ctx, 36, 20, 1.6, '#ffffff');
      ctx.fillStyle = '#ffffff'; // 이를 악문 입
      roundRect(ctx, 28, 24, 8, 3, 1);
      line(ctx, look.line, 0.6, [[28, 25.5], [36, 25.5]]);
    }
  }

  /** 궁수 팀: 보라 · 검정 슈트, V 무늬, 고글, 활과 화살통 */
  function drawArcher(ctx, look, back, P) {
    const skin = look.skin || SKIN;
    baseBody(ctx, look, P, { legs: look.accent, boots: look.accent, gloves: look.accent });
    if (back) {
      ctx.fillStyle = '#5d4037';
      roundRect(ctx, 35, 27, 8, 22, 3); // 화살통
      for (const x of [37, 40]) poly(ctx, look.line, [[x, 21], [x + 2.2, 27], [x - 2.2, 27]]);
    } else {
      line(ctx, look.emblem, 2, [[21, 35], [32, 43], [43, 35]]); // V 무늬
      line(ctx, look.emblem, 2, [[21, 40], [32, 48], [43, 40]]);
      line(ctx, '#5d4037', 2, [[22, 34], [42, 52]]); // 화살통 끈
    }
    circle(ctx, 32, 20, 11, back ? (look.hair || '#5d4037') : skin);
    ctx.fillStyle = look.hair || '#5d4037';
    roundRect(ctx, 21, 8, 22, 8, 4); // 짧은 머리
    if (!back) {
      ctx.fillStyle = look.emblem; // 고글
      roundRect(ctx, 23, 17, 18, 4.5, 2);
      gloss(ctx, 27, 18, 2.5, 1);
    }
    atHand(ctx, P, () => {
      ctx.strokeStyle = look.line; // 든 손의 활
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(55, 27, 11, -1.3, 1.3);
      ctx.stroke();
      line(ctx, look.line, 0.8, [[55 + Math.cos(-1.3) * 11, 27 + Math.sin(-1.3) * 11], [55 + Math.cos(1.3) * 11, 27 + Math.sin(1.3) * 11]]);
    });
  }

  /** 마법 팀: 파란 로브, 빨간 망토와 높은 깃, 목걸이 부적, 손에 마법진 */
  function drawMystic(ctx, look, back, P) {
    const skin = look.skin || SKIN;
    const cape = [[18, 32], [46, 32], [53, 69], [11, 69]];
    if (!back) poly(ctx, look.accent, cape);
    baseBody(ctx, look, P, { legs: look.suit, boots: '#3e2723', gloves: '#ffd54f', belt: '#6d4c41' });
    poly(ctx, look.suit, [[19, 50], [45, 50], [48, 65], [16, 65]]); // 로브 자락
    line(ctx, '#6d4c41', 1.6, [[21, 34], [43, 50]]); // 띠
    if (back) poly(ctx, look.accent, cape);
    for (const s of [-1, 1]) poly(ctx, look.accent, [[32 + s * 9, 31], [32 + s * 15, 13], [32 + s * 6, 26]]); // 높은 깃
    if (!back) {
      circle(ctx, 32, 38, 3.4, look.line); // 부적
      circle(ctx, 32, 38, 1.7, look.emblem);
    }
    circle(ctx, 32, 20, 10.5, back ? (look.hair || '#3e2723') : skin);
    ctx.fillStyle = look.hair || '#3e2723';
    roundRect(ctx, 21.5, 8.5, 21, 7, 3.5);
    if (!back) {
      faceEyes(ctx, 20);
      ctx.fillStyle = look.hair || '#3e2723'; // 콧수염 · 턱수염
      roundRect(ctx, 29, 25, 6, 1.5, 0.7);
      roundRect(ctx, 31, 26, 2, 3, 1);
    }
    ctx.save(); // 손의 마법진
    ctx.translate(P.shift[0], P.shift[1]);
    ctx.strokeStyle = look.line;
    ctx.shadowColor = look.line;
    ctx.shadowBlur = 4;
    ctx.lineWidth = 1.3;
    for (const r of [8.5, 5.8]) {
      ctx.beginPath();
      ctx.arc(55, 25, r, 0, TAU);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8;
      ctx.beginPath();
      ctx.moveTo(55 + Math.cos(a) * 5.8, 25 + Math.sin(a) * 5.8);
      ctx.lineTo(55 + Math.cos(a) * 8.5, 25 + Math.sin(a) * 8.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** 표범 팀: 검은 슈트, 고양이 귀 마스크, 은빛 목걸이 무늬, 발톱 */
  function drawPanther(ctx, look, back, P) {
    baseBody(ctx, look, P, { legs: look.suit, boots: look.suit, gloves: look.suit, belt: look.accent });
    for (let i = 0; i < 3; i++) line(ctx, look.line, 1.2, [[22 + i, 34 + i * 2.6], [32, 40 + i * 2.6], [42 - i, 34 + i * 2.6]]); // 목걸이 무늬
    line(ctx, look.emblem, 0.9, [[20, 44], [20, 54]]);
    line(ctx, look.emblem, 0.9, [[44, 44], [44, 54]]);
    for (const s of [-1, 1]) poly(ctx, look.suit, [[32 + s * 9, 11], [32 + s * 12, 3], [32 + s * 4, 8]]); // 고양이 귀
    circle(ctx, 32, 20, 13.5, look.suit);
    gloss(ctx, 27, 13, 4, 2.5);
    if (!back) {
      line(ctx, look.line, 0.9, [[22, 15], [32, 24], [42, 15]]); // 마스크 은빛 선
      ctx.fillStyle = '#ffffff';
      for (const [x, t] of [[26.5, 0.35], [37.5, -0.35]]) {
        ctx.beginPath();
        ctx.ellipse(x, 19, 4.2, 2, t, 0, TAU);
        ctx.fill();
      }
    } else {
      line(ctx, look.line, 0.9, [[32, 8], [32, 30]]);
    }
    atHand(ctx, P, () => {
      for (const dx of [-2, 0, 2]) line(ctx, '#e0e0e0', P.name === 'attack' ? 1.4 : 0.9, [[54 + dx, 23], [55 + dx, 19]]); // 발톱 (할퀼 때 굵게)
    });
  }

  /** style → 그리기 함수. 새 팀을 추가하면 여기에 등록하고 HeroLook typedef 도 갱신한다. */
  const BODIES = {
    armor: drawArmor,
    shield: drawShield,
    thunder: drawThunder,
    giant: drawGiant,
    archer: drawArcher,
    mystic: drawMystic,
    panther: drawPanther,
  };

  /** 몸 기울기(lean) 중심: 발 밑 */
  const LEAN_PIVOT = [32, 70];

  /**
   * 자세별 오른손(줄 · 공격이 나가는 곳) 위치를 그림 중심 기준 비율로 돌려준다.
   * round-scene.js 의 hand() 가 히어로 크기를 곱해 실제 위치를 구한다 (몸 기울기까지 반영).
   * @param {string} [pose='idle']
   * @returns {{x: number, y: number}} 그림 가로 · 세로 크기에 대한 비율 (-0.5 ~ 0.5)
   */
  A.heroHand = function (pose) {
    const P = resolvePose(pose);
    const a = P.lean || 0;
    const dx = P.hand[0] - LEAN_PIVOT[0];
    const dy = P.hand[1] - LEAN_PIVOT[1];
    const x = LEAN_PIVOT[0] + dx * Math.cos(a) - dy * Math.sin(a);
    const y = LEAN_PIVOT[1] + dx * Math.sin(a) + dy * Math.cos(a);
    return { x: x / 64 - 0.5, y: y / 72 - 0.5 };
  };

  /**
   * 히어로 한 명을 캔버스에 그린다. 기본(idle)은 오른팔을 들어 줄을 쏘는 자세다.
   * 자세(pose)를 주면 팔다리 · 몸 기울기 · 표정 효과가 바뀐다 (POSES 표). 손 위치는 A.heroHand(pose).
   * 만화처럼 보이도록 실루엣을 8방향으로 살짝 밀어 그린 뒤 그 위에 본 그림을 얹어 외곽선을 만든다.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Hero} hero
   * @param {number} w 캔버스 너비 (px)
   * @param {number} h 캔버스 높이 (px)
   * @param {{back?: boolean, pose?: string}} [opts] back: 뒷모습 (3D 3인칭 시점처럼 카메라가 히어로 뒤에 있을 때),
   *        pose: 자세 이름 (A.HERO_POSES, 기본 'idle')
   */
  A.drawHero = function (ctx, hero, w, h, opts = {}) {
    const look = hero.look;
    const art = document.createElement('canvas');
    art.width = w;
    art.height = h;
    const a = art.getContext('2d');
    a.save();
    a.scale(w / 64, h / 72);
    const P = resolvePose(opts.pose || 'idle');
    if (P.lean) { // 발 밑을 중심으로 몸을 기울인다
      a.translate(LEAN_PIVOT[0], LEAN_PIVOT[1]);
      a.rotate(P.lean);
      a.translate(-LEAN_PIVOT[0], -LEAN_PIVOT[1]);
    }
    (BODIES[look.style] || drawSpider)(a, look, !!opts.back, P);
    faceFx(a, P);
    a.restore();

    // 외곽선용 실루엣 (그림 모양 그대로 어두운 색으로 채움)
    const sil = document.createElement('canvas');
    sil.width = w;
    sil.height = h;
    const s = sil.getContext('2d');
    s.drawImage(art, 0, 0);
    s.globalCompositeOperation = 'source-in';
    s.fillStyle = 'rgba(12, 10, 28, 0.92)';
    s.fillRect(0, 0, w, h);

    const t = Math.max(1, (w / 64) * 0.9); // 외곽선 두께 (기준 좌표 약 0.9)
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    for (const [dx, dy] of [[t, 0], [-t, 0], [0, t], [0, -t], [t, t], [-t, -t], [t, -t], [-t, t]]) ctx.drawImage(sil, dx, dy);
    ctx.drawImage(art, 0, 0);
    ctx.restore();
  };
})(window.ARAH);

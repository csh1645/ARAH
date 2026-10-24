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
  /** 지금 그리는 캐릭터가 광택 없는 그림체(원피스 · 산리오 · 치이카와)인지 — drawHero 가 정한다 */
  let NO_GLOSS = false;

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
    if (NO_GLOSS) return; // 원피스 · 산리오: 원작처럼 광택 없음
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

  // ---------- 영화 원조 히어로 (데이터로 그리기) ----------
  // HeroLook 의 pattern · mark · head · cape · gear · hair 로 한 명씩 그린다 → 히어로 추가 = 데이터 한 줄 (data/heroes.js).
  // 그림체는 위 팀별 그림과 같다 (64 x 72, 큰 머리 2등신, 굵은 외곽선은 drawHero 가 붙임).

  /** 귀여운 맨얼굴 눈 · 입 · 볼터치 (얼굴이 보이는 히어로) */
  function cuteFace(ctx, y, hair, angry) {
    for (const x of [27, 37]) {
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.ellipse(x, y, 1.9, 2.5, 0, 0, TAU);
      ctx.fill();
      circle(ctx, x - 0.6, y - 0.9, 0.75, '#ffffff');
    }
    if (angry) {
      poly(ctx, hair, [[23.5, y - 5], [30, y - 3], [30, y - 1.8], [23.5, y - 3.8]]);
      poly(ctx, hair, [[40.5, y - 5], [34, y - 3], [34, y - 1.8], [40.5, y - 3.8]]);
    } else {
      line(ctx, hair, 1.1, [[25, y - 4.6], [29, y - 5]]);
      line(ctx, hair, 1.1, [[35, y - 5], [39, y - 4.6]]);
    }
    ctx.save();
    ctx.globalAlpha = 0.35;
    circle(ctx, 24, y + 4, 2.2, '#ff6b81');
    circle(ctx, 40, y + 4, 2.2, '#ff6b81');
    ctx.restore();
    ctx.strokeStyle = '#7a2a2a';
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(32, y + 4, 2.6, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }

  /** 머리 모양 (앞쪽 층). 긴 머리의 뒤쪽 층은 hairBack 이 몸보다 먼저 그린다 */
  function hairFront(ctx, look, back) {
    const c = look.hair || '#3e2723';
    const style = look.hairStyle || (look.body === 'f' ? 'long' : 'parted');
    if (back) {
      ctx.fillStyle = c;
      roundRect(ctx, 18.5, 6, 27, 22, 11);
      return;
    }
    if (style === 'buzzed') {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(32, 20, 14.2, Math.PI * 1.05, Math.PI * 1.95);
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (style === 'spiky' || style === 'messy') { // 삐죽삐죽 짧은 머리 (루피 · 조로)
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(32, 20, 14.6, Math.PI * 0.95, Math.PI * 2.05);
      const tips = style === 'spiky' ? [[44, 16], [41, 11.5], [39, 15], [35, 11], [32, 15.5], [28, 11], [25, 15], [22, 11.5], [20, 16]]
        : [[45, 15], [42, 12], [38, 13.5], [33, 11.5], [27, 13.5], [22, 12], [19, 15]];
      for (const [x, y] of tips) ctx.lineTo(x, y);
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (style === 'sideSweep') { // 한쪽 눈을 덮는 앞머리 (상디)
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(32, 20, 14.6, Math.PI * 0.97, Math.PI * 2.03);
      ctx.quadraticCurveTo(44, 24, 37, 25);
      ctx.quadraticCurveTo(34, 16, 26, 13);
      ctx.quadraticCurveTo(21, 13.5, 18, 17);
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (style === 'pompadour') { // 앞으로 솟은 머리 (프랑키)
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(32, 20, 14.4, Math.PI * 1.02, Math.PI * 1.98);
      ctx.closePath();
      ctx.fill();
      poly(ctx, c, [[20, 11], [30, 4], [46, 2], [52, 6], [44, 10], [40, 13], [24, 14]]);
      return;
    }
    if (style === 'afro') { // 큰 아프로 (브룩)
      for (const [x, y, r] of [[32, 8, 12], [21, 12, 8], [43, 12, 8], [26, 4, 7], [38, 4, 7]]) circle(ctx, x, y, r, c);
      return;
    }
    if (style === 'curly') { // 곱슬머리 (우솝)
      for (const [x, y] of [[20, 14], [24, 9], [29, 7], [35, 7], [40, 9], [44, 14], [46, 20], [18, 20]]) circle(ctx, x, y, 4.2, c);
      return;
    }
    if (style === 'slick') { // 뒤로 넘긴 머리 (징베 · 샹크스), longBack 이면 뒤로 조금 길게
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(32, 20, 14.6, Math.PI * 1.0, Math.PI * 2.0);
      ctx.quadraticCurveTo(40, 11, 32, 11);
      ctx.quadraticCurveTo(24, 11, 17.4, 20);
      ctx.closePath();
      ctx.fill();
      if (look.longBack) {
        roundRect(ctx, 16.5, 15, 5, 12, 2.5);
        roundRect(ctx, 42.5, 15, 5, 12, 2.5);
      }
      return;
    }
    // 이마를 덮는 앞머리 (가르마)
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(32, 20, 14.6, Math.PI * 0.97, Math.PI * 2.03);
    ctx.quadraticCurveTo(42, 12, 34, 13.5);
    ctx.quadraticCurveTo(27, 10.5, 18, 17);
    ctx.closePath();
    ctx.fill();
    gloss(ctx, 26, 10, 4, 1.6);
    if (style === 'buns') {
      circle(ctx, 21, 7, 5.5, c);
      circle(ctx, 43, 7, 5.5, c);
    }
    if (style === 'long') {
      ctx.fillStyle = c;
      roundRect(ctx, 16.5, 15, 5, 17, 2.5);
      roundRect(ctx, 42.5, 15, 5, 17, 2.5);
    }
  }

  /** 모자 (look.hat): straw(밀짚모자) · cowboy(카우보이모자) · topHat(실크햇). 앞모습에서 머리 위에 얹는다 */
  function drawHat(ctx, look) {
    const h = look.hat;
    if (h === 'straw') {
      oval(ctx, 32, 9.5, 21, 4.2, '#f2c94c');
      ctx.fillStyle = '#f2c94c';
      roundRect(ctx, 21, 0, 22, 10.5, 6);
      ctx.fillStyle = '#d62828';
      ctx.fillRect(21, 6, 22, 3);
      line(ctx, '#c9a227', 0.6, [[13, 9.5], [51, 9.5]]);
    } else if (h === 'cowboy') { // 에이스: 주황 카우보이모자 + 앞의 웃는 얼굴 · 우는 얼굴 장식
      oval(ctx, 32, 9.5, 20, 4, '#e8742a');
      ctx.fillStyle = '#e8742a';
      roundRect(ctx, 22, -1, 20, 11, 5);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(22, 6.5, 20, 2);
      for (const [x, happy] of [[28.5, true], [35.5, false]]) {
        circle(ctx, x, 3.5, 2.6, '#f2e6c8');
        circle(ctx, x - 0.9, 3, 0.4, '#1a1a1a');
        circle(ctx, x + 0.9, 3, 0.4, '#1a1a1a');
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        if (happy) ctx.arc(x, 4, 1, 0.15 * Math.PI, 0.85 * Math.PI);
        else ctx.arc(x, 5.6, 1, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.stroke();
      }
    } else if (h === 'lawHat') { // 로: 흰 털모자 + 갈색 점 무늬
      ctx.fillStyle = '#f5f5f0';
      roundRect(ctx, 17, 0, 30, 15, 8);
      ctx.fillRect(17, 10, 30, 5);
      for (const x of [21, 27, 33, 39, 45]) circle(ctx, x - 1, 11, 1.4, '#8d6e63');
      circle(ctx, 26, 5, 1.3, '#8d6e63');
      circle(ctx, 37, 4, 1.3, '#8d6e63');
    } else if (h === 'topHat') {
      oval(ctx, 32, 4, 13, 2.6, '#1a1a1a');
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(25, -10, 14, 14);
    }
  }

  /** 얼굴 특징 (look.faceMarks): scar · scars3 · longNose · curlyBrow · sunglasses · freckles · tusks */
  function faceMarks(ctx, look) {
    const m = new Set(look.faceMarks || []);
    if (m.has('scar')) line(ctx, '#8b3a2a', 0.9, [[25, 24], [26.5, 25.5], [28, 24.5]]); // 루피: 왼쪽 눈 밑 흉터
    if (m.has('scars3')) for (const dx of [-1.6, 0, 1.6]) line(ctx, '#8b3a2a', 0.8, [[37 + dx, 16], [38.5 + dx, 25]]); // 샹크스: 눈 위 세 줄
    if (m.has('freckles')) for (const [x, y] of [[23, 24], [25, 25], [24, 26.5], [39, 24], [41, 25], [40, 26.5]]) circle(ctx, x, y, 0.55, '#8d5524');
    if (m.has('longNose')) { // 우솝: 긴 코 (얼굴 밖까지 길게, 잉크 선 + 아래 그림자로 얼굴과 구분)
      const ny = look.op ? 24.4 : 22; // 원피스 얼굴은 눈이 아래라 코도 아래로
      const skin = look.skin || SKIN;
      ctx.fillStyle = skin;
      roundRect(ctx, 31, ny, 21, 3.8, 1.9);
      ctx.fillStyle = shade(skin, -0.18);
      ctx.fillRect(33, ny + 2.4, 17.5, 1.2);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(33, ny);
      ctx.lineTo(50.1, ny);
      ctx.arc(50.1, ny + 1.9, 1.9, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(33, ny + 3.8);
      ctx.stroke();
    }
    if (m.has('curlyBrow')) { // 상디: 꼬인 눈썹 (보이는 쪽)
      ctx.strokeStyle = look.hair || '#f4d35e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(26.5, 15.8, 1.3, 0, TAU * 0.85);
      ctx.moveTo(25, 16.3);
      ctx.lineTo(29, 16.3);
      ctx.stroke();
    }
    if (m.has('sunglasses')) { // 프랑키
      ctx.fillStyle = '#1a1a1a';
      roundRect(ctx, 21.5, 18, 9, 5, 2);
      roundRect(ctx, 33.5, 18, 9, 5, 2);
      line(ctx, '#1a1a1a', 1, [[30, 19.5], [34, 19.5]]);
    }
    if (m.has('goatee')) { // 로: 턱수염 · 구레나룻
      ctx.fillStyle = look.hair || '#1a1a1a';
      roundRect(ctx, 30, 30, 4, 3, 1.5);
      roundRect(ctx, 17.5, 17, 2.4, 9, 1.2);
      roundRect(ctx, 44.1, 17, 2.4, 9, 1.2);
    }
    if (m.has('tusks')) for (const x of [28.5, 35.5]) poly(ctx, '#ffffff', [[x - 1, 26.5], [x + 1, 26.5], [x, 23.5]]); // 징베: 엄니
  }

  /**
   * 애니 치비 얼굴 (원피스, look.anime): 큰 눈 · 큰 반짝이 · 표정 입(look.mouth: grin · smile · smirk).
   * 여자 캐릭터(body f)는 속눈썹. faceMarks 의 eyeScar(조로)는 왼눈을 감은 흉터로 그린다.
   */
  function animeFace(ctx, look) {
    const marks = new Set(look.faceMarks || []);
    const hair = look.hair || '#3e2723';
    const eyes = [[26, 1], [38, -1]];
    for (const [x, side] of eyes) {
      if (marks.has('eyeScar') && side === 1) { // 감은 눈 + 세로 흉터
        line(ctx, '#1a1a1a', 1, [[x - 2.6, 21], [x + 2.6, 21]]);
        line(ctx, '#8b3a2a', 0.9, [[x, 15.5], [x - 0.3, 26.5]]);
        continue;
      }
      if (look.hairStyle === 'sideSweep' && side === -1) continue; // 상디: 앞머리로 가린 눈
      oval(ctx, x, 21, 2.7, 3.5, '#1a1a1a');
      oval(ctx, x, 21.8, 1.8, 2.2, look.eye || '#4a2a14');
      circle(ctx, x - 0.9, 19.7, 1.15, '#ffffff');
      circle(ctx, x + 0.9, 22.8, 0.5, '#ffffff');
      if (look.body === 'f') line(ctx, '#1a1a1a', 0.9, [[x - 3, 18.4], [x - side * 3.6, 17.4]]);
    }
    // 눈썹 (머리색)
    line(ctx, hair, 1.1, [[23.5, 16.2], [28.5, 15.6]]);
    if (look.hairStyle !== 'sideSweep') line(ctx, hair, 1.1, [[35.5, 15.6], [40.5, 16.2]]);
    // 입
    const mouth = look.mouth || 'smile';
    if (mouth === 'grin') { // 활짝 웃는 입 (이 보임)
      ctx.fillStyle = '#5a1a1a';
      ctx.beginPath();
      ctx.moveTo(26.5, 25.5);
      ctx.quadraticCurveTo(32, 33, 37.5, 25.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(27, 25.6);
      ctx.lineTo(37, 25.6);
      ctx.lineTo(36.2, 27.2);
      ctx.lineTo(27.8, 27.2);
      ctx.closePath();
      ctx.fill();
      oval(ctx, 32, 29.5, 2.4, 1.2, '#ff7a8a');
    } else if (mouth === 'smirk') { // 씩 웃는 입
      line(ctx, '#5a1a1a', 1, [[29.5, 27], [33, 27.6], [35.5, 26]]);
    } else {
      ctx.strokeStyle = '#5a1a1a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(32, 25.5, 2.6, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }
    ctx.save();
    ctx.globalAlpha = 0.3;
    circle(ctx, 23, 25, 2, '#ff6b81');
    circle(ctx, 41, 25, 2, '#ff6b81');
    ctx.restore();
  }



  // ---------- 캐릭터별 세부 그림 (한 명씩 원작에 맞춰 다듬는 자리) ----------
  // body(ctx, look, P): 몸을 다 그린 뒤 · 머리보다 먼저 (옷 단추 · 흉터 · 반바지 · 신발 등)
  // face(ctx, look): 얼굴을 다 그린 뒤 (얼굴 흉터 · 표정 세부). 원작 특징은 검색 · 참고 그림으로 확인한 것만 넣는다.

  /** 다리 한 쌍 위에 덧그리기 (legPair 와 같은 자세 변환) */
  function onLegs(ctx, P, hips, m, draw) {
    hips.forEach((hx, i) => {
      ctx.save();
      ctx.translate(hx, m.y);
      ctx.rotate(P.legs[i]);
      ctx.scale(1, P.tuck || 1);
      draw(m);
      ctx.restore();
    });
  }

  /** 위팔 가운데 위치 (어깨 → 손 사이 40%) */
  const upperArm = (s, h) => [s[0] + (h[0] - s[0]) * 0.4, s[1] + (h[1] - s[1]) * 0.4];

  const CHARACTER_DETAILS = {
    /** 조로 (확인: 왼쪽 귀 금귀걸이 3개, 왼쪽 위팔의 검은 두건, 왼쪽 눈 흉터) */
    zoro: {
      body(ctx, look, P) {
        const [x, y] = upperArm(SHOULDER.r, P.hand); // 캐릭터 왼팔 = 보는 쪽 오른쪽
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(P.hand[1] - SHOULDER.r[1], P.hand[0] - SHOULDER.r[0]) + Math.PI / 2);
        ctx.fillStyle = '#1a1a1a';
        roundRect(ctx, -4.2, -1.6, 8.4, 3.2, 1.2);
        poly(ctx, '#1a1a1a', [[3.5, -1], [6.5, 1.8], [4, 2.2]]);
        ctx.restore();
      },
      face(ctx) {
        ctx.strokeStyle = '#f2c94c'; // 왼쪽 귀(보는 쪽 오른쪽) 금귀걸이 3개
        ctx.lineWidth = 0.7;
        for (const y of [23.6, 25.6, 27.6]) {
          ctx.beginPath();
          ctx.arc(47.2, y, 0.9, 0, TAU);
          ctx.stroke();
        }
      },
    },
    /** 나미 (확인: 왼쪽 어깨의 풍차 · 귤 문신, 애니에서는 파란색) */
    nami: {
      body(ctx) {
        const x = 43.5, y = 37.5; // 캐릭터 왼쪽 어깨 = 보는 쪽 오른쪽
        ctx.strokeStyle = '#2b6cb0';
        ctx.lineWidth = 0.6;
        for (let i = 0; i < 4; i++) { // 풍차 날개
          const a = (i * Math.PI) / 2 + 0.4;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, x + Math.cos(a + 0.8) * 2.2, y + Math.sin(a + 0.8) * 2.2);
          ctx.stroke();
        }
        circle(ctx, x + 2.6, y + 2.2, 1, '#2b6cb0'); // 귤
      },
    },
    /** 우솝 (확인: 셔츠 없는 갈색 멜빵바지, 흰 허리띠, 올리브색 두건, 저격용 고글) */
    usopp: {
      body(ctx, look) {
        const skin = look.skin || SKIN;
        poly(ctx, skin, [[20, 33.5], [44, 33.5], [41, 40], [23, 40]]); // 맨가슴 (멜빵 위)
        ctx.fillStyle = look.suit;
        ctx.fillRect(23, 33.5, 3, 7);
        ctx.fillRect(38, 33.5, 3, 7);
        ctx.fillStyle = '#f5f5f5'; // 흰 허리띠
        roundRect(ctx, 19, 48, 26, 4, 2);
      },
      face(ctx, look) {
        ctx.fillStyle = '#7a7a3a'; // 올리브색 두건 (곱슬머리 위)
        ctx.beginPath();
        ctx.arc(32, 15, 13.5, Math.PI * 1.08, Math.PI * 1.92);
        ctx.quadraticCurveTo(32, 9.5, 20.3, 11);
        ctx.fill();
        for (const [x, y] of [[26, 7], [32, 5.5], [38, 7]]) poly(ctx, '#c9a227', [[x, y - 1.2], [x + 1.2, y], [x, y + 1.2], [x - 1.2, y]]); // 다이아몬드 무늬
        for (const x of [27, 37]) { // 이마 위 저격용 고글
          circle(ctx, x, 11.5, 3, '#5d4037');
          circle(ctx, x, 11.5, 2.1, '#f2a33a');
          circle(ctx, x - 0.7, 10.8, 0.6, '#ffffff');
        }
        line(ctx, '#5d4037', 1, [[30, 11.5], [34, 11.5]]);
      },
    },
    /** 상디 (확인: 타임스킵 뒤 오른쪽 눈을 가리는 앞머리, 말린 눈썹, 염소수염, 검은 정장) */
    sanji: {
      face(ctx, look) {
        ctx.strokeStyle = look.hair || '#f4d35e'; // 보이는 눈(보는 쪽 오른쪽)의 말린 눈썹
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(34.5, 17.8);
        ctx.lineTo(39.5, 17.2);
        ctx.arc(39.6, 15.9, 1.3, Math.PI * 0.5, Math.PI * 2.2, true);
        ctx.stroke();
        ctx.fillStyle = shade(look.hair || '#f4d35e', -0.25); // 염소수염
        roundRect(ctx, 30.5, 33, 3, 2.6, 1.2);
      },
    },
    /**
     * 루피 (확인: 왼쪽 눈 아래 두 바늘 흉터, 가슴 X자 흉터, 민소매 빨간 조끼, 해진 파란 반바지, 노란 허리띠, 샌들)
     */
    luffy: {
      body(ctx, look, P) {
        const skin = look.skin || SKIN;
        // 가슴 X자 흉터 (열린 조끼 사이)
        line(ctx, '#c9876a', 1.1, [[29.5, 36.5], [34.5, 42.5]]);
        line(ctx, '#c9876a', 1.1, [[34.5, 36.5], [29.5, 42.5]]);
        // 조끼 단추 (양쪽 앞섶)
        for (const y of [37, 41, 45]) {
          circle(ctx, 27.2, y, 0.9, '#f2c94c');
          circle(ctx, 36.8, y, 0.9, '#f2c94c');
        }
        // 반바지: 무릎 위까지, 끝단을 걷어 올린 밝은 띠 + 해진 끝 / 아래는 맨다리 + 샌들
        onLegs(ctx, P, [26, 38], LEGS, (m) => {
          ctx.fillStyle = skin;
          roundRect(ctx, -m.w / 2 + 0.5, m.len * 0.55, m.w - 1, m.len * 0.5, 2);
          ctx.fillStyle = '#5b8fd9';
          ctx.fillRect(-m.w / 2, m.len * 0.42, m.w, 2.2);
          poly(ctx, '#5b8fd9', [[-m.w / 2, m.len * 0.42 + 2.2], [-m.w / 4, m.len * 0.42 + 3.6], [0, m.len * 0.42 + 2.2], [m.w / 4, m.len * 0.42 + 3.4], [m.w / 2, m.len * 0.42 + 2.2]]);
          ctx.fillStyle = skin; // 맨발
          roundRect(ctx, -m.bootW / 2, m.len - 4, m.bootW, m.bootH, 3);
          ctx.fillStyle = '#8d6e3f'; // 샌들 바닥 · 끈
          ctx.fillRect(-m.bootW / 2, m.len + m.bootH - 5.6, m.bootW, 1.6);
          line(ctx, '#8d6e3f', 1, [[-m.bootW / 2 + 1.5, m.len - 1], [m.bootW / 2 - 1.5, m.len - 1]]);
        });
      },
      face(ctx) {
        // 왼쪽 눈(보는 쪽 오른쪽) 아래 흉터 + 두 바늘 자국
        line(ctx, '#8b3a2a', 0.8, [[36.5, 26.9], [38.6, 27.3], [41, 26.5]]); // 광대뼈 위, 입보다 위쪽
        line(ctx, '#8b3a2a', 0.6, [[38, 26.3], [37.8, 27.9]]);
        line(ctx, '#8b3a2a', 0.6, [[39.8, 26.1], [40, 27.7]]);
      },
    },
  };

  // ---------- 원피스 (캐릭터별 얼굴 · 눈 · 머리카락) ----------
  // 원작(오다 에이치로) 치비 그림 특징: 볼 · 턱선이 있는 얼굴 + 귀, 캐릭터마다 다른 눈매(둥근 · 날카로운 · 차분한),
  // 머리카락 아래 얼굴 그림자(애니 명암), 굵은 검은 선, 광택 없음. look.op = 캐릭터 id.

  /** 캐릭터별 눈매 · 입 · 특징 */
  const OP = {
    luffy: { eye: 'round', mouth: 'grin', wide: 1 },
    zoro: { eye: 'sharp', mouth: 'smirk' },
    nami: { eye: 'round', mouth: 'grin', lash: 1, blush: 1 },
    usopp: { eye: 'round', mouth: 'grin' },
    sanji: { eye: 'sharp', mouth: 'smirk', hideLeft: 1 },
    robin: { eye: 'calm', mouth: 'smile', lash: 1 },
    franky: { eye: 'none', mouth: 'grin', wide: 1 },
    jinbe: { eye: 'sharp', mouth: 'smile', thickBrow: 1 },
    ace: { eye: 'sharp', mouth: 'grin' },
    shanks: { eye: 'calm', mouth: 'smile', stubble: 1 },
    law: { eye: 'sharp', mouth: 'smirk', bags: 1 },
  };

  /** 얼굴 윤곽: 넓은 볼에서 둥근 턱으로 (원피스 치비) */
  function opFacePath(ctx) {
    ctx.beginPath();
    ctx.moveTo(18, 18);
    ctx.bezierCurveTo(18, 28, 24, 35.5, 32, 36);
    ctx.bezierCurveTo(40, 35.5, 46, 28, 46, 18);
    ctx.bezierCurveTo(46, 9, 39.5, 5, 32, 5);
    ctx.bezierCurveTo(24.5, 5, 18, 9, 18, 18);
    ctx.closePath();
  }

  /** 머리카락 한 덩어리: 아래로 그림자(피부 어두운 색)를 먼저 깔고 머리색으로 덮는다 */
  function opHair(ctx, look, pts, shadow = true) {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
    };
    if (shadow) {
      ctx.save();
      ctx.translate(0, 1.6);
      ctx.fillStyle = shade(look.skin || SKIN, -0.16);
      path();
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = look.hair || '#1a1a1a';
    path();
    ctx.fill();
  }

  /** 뒤쪽 머리 (몸보다 먼저): 긴 머리 캐릭터 */
  function opHairBack(ctx, look) {
    const c = look.hair || '#1a1a1a';
    const wave = (x0, x1, y, amp) => { const p = []; for (let x = x1; x >= x0; x -= 3) p.push([x, y + ((x / 3) % 2 ? amp : 0)]); return p; };
    if (look.op === 'nami') poly(ctx, c, [[16, 12], [48, 12], [52, 30], [51, 46], ...wave(13, 51, 46, 3), [13, 46], [12, 30]]);
    if (look.op === 'robin') poly(ctx, c, [[16, 10], [48, 10], [50, 30], [50, 48], [14, 48], [14, 30]]);
    if (look.op === 'shanks') poly(ctx, c, [[16, 12], [48, 12], [50, 26], [49, 37], [45, 33], [43, 38], [21, 38], [19, 33], [15, 37], [14, 26]]);
    if (look.op === 'ace') poly(ctx, c, [[16, 12], [48, 12], [49, 26], [48, 33], [44, 30], [41, 34], [23, 34], [20, 30], [16, 33], [15, 26]]);
    if (look.op === 'sanji') poly(ctx, c, [[17, 12], [47, 12], [47, 28], [17, 28]]);
  }

  /** 앞쪽 머리 (얼굴 위) */
  function opHairFront(ctx, look) {
    const h = (pts) => opHair(ctx, look, pts);
    switch (look.op) {
      case 'luffy': // 삐죽삐죽 검은 앞머리 (모자 아래)
        h([[17, 19], [17, 9], [47, 9], [47, 19], [44.5, 14], [42.5, 19.5], [40, 13], [37.5, 19], [35, 13.5], [32.5, 18.5], [30, 13.5], [27.5, 19.5], [25, 13], [22.5, 19], [20, 14]]);
        break;
      case 'zoro': // 짧고 삐죽한 초록 머리 (이마가 보인다)
        h([[17.5, 18], [17, 9], [20, 4], [24, 6], [27, 2.5], [31, 5], [35, 2], [38, 5], [42, 3.5], [44.5, 7], [47, 9], [46.5, 18], [44, 13], [40, 12.5], [36, 11], [31, 12], [26, 11], [22, 12.5], [19.5, 14]]);
        break;
      case 'nami': // 한쪽으로 넘긴 앞머리
        h([[16.5, 22], [17, 9], [25, 4], [36, 4], [46, 9], [47.5, 22], [45, 15], [41, 12.5], [37, 9.5], [33, 13], [27, 15.5], [22, 18.5], [19.5, 22]]);
        break;
      case 'sanji': // 한쪽 눈을 덮는 금발 앞머리 + 단발
        h([[17, 26], [17, 9], [25, 4], [38, 4], [46.5, 9], [47, 26], [44.5, 19], [42, 13.5], [38, 12], [34, 14], [31, 18], [30, 27], [27, 28.5], [23, 26], [20, 22]]);
        break;
      case 'robin': // 이마를 드러낸 검은 생머리, 얼굴 옆으로 긴 머리
        h([[15.5, 34], [16.5, 10], [24, 4.5], [40, 4.5], [47.5, 10], [48.5, 34], [45.5, 33], [45, 18], [41, 10.5], [32, 9.5], [23, 10.5], [19, 18], [18.5, 33]]);
        break;
      case 'shanks': // 뒤로 넘긴 빨간 머리 + 이마의 잔머리
        h([[17, 24], [17, 10], [24, 4], [40, 4], [47, 10], [47, 24], [45, 16], [40, 11], [32, 10], [24, 11], [19, 16]]);
        line(ctx, look.hair, 1, [[29, 10.5], [27.5, 15.5]]);
        line(ctx, look.hair, 1, [[33.5, 10.5], [35, 15]]);
        break;
      case 'ace': // 물결치는 검은 앞머리 (모자 아래)
        h([[17, 22], [17, 9], [47, 9], [47, 22], [44, 15.5], [41.5, 18], [39, 13.5], [36, 17], [33, 13], [30, 17], [27, 13.5], [24, 18], [21, 14.5]]);
        break;
      case 'law': // 짧은 검은 머리 (털모자 아래) + 구레나룻
        h([[17.5, 26], [17, 10], [47, 10], [46.5, 26], [44.5, 18], [41, 14.5], [36, 15.5], [32, 14], [28, 15.5], [23, 14.5], [19.5, 18]]);
        break;
      case 'usopp': // 풍성한 곱슬머리
        for (const [x, y, r] of [[19, 15, 5], [24, 8.5, 5], [31, 6, 5], [38, 7, 5], [44, 12, 5], [46, 19, 4.2], [17.5, 21, 4.2]]) circle(ctx, x, y, r, look.hair);
        break;
      case 'jinbe': // 뒤로 묶은 검은 머리
        h([[18, 16], [20, 7], [32, 3.5], [44, 7], [46, 16], [42, 11], [32, 9.5], [22, 11]]);
        circle(ctx, 32, 2.5, 3.2, look.hair);
        break;
      case 'franky': // 앞으로 솟은 파란 머리
        h([[18, 16], [19, 8], [30, 3], [46, 0], [53, 4], [46, 9], [44, 14], [32, 11], [22, 12.5]]);
        break;
      default:
    }
  }

  /** 눈 (캐릭터별 눈매) */
  function opEyes(ctx, look, cfg) {
    const iris = look.eye || '#3a2414';
    for (const [x, side] of [[26.5, -1], [37.5, 1]]) {
      if (cfg.hideLeft && side === -1) continue; // 앞머리로 가린 눈 (상디)
      if (side === 1 && (look.faceMarks || []).includes('eyeScar')) { // 조로: 왼쪽 눈(보는 쪽 오른쪽)을 감은 흉터
        line(ctx, '#111111', 1.3, [[x - 3, 22.4], [x + 3, 22.4]]);
        line(ctx, '#8b3a2a', 1, [[x + 0.4, 15.8], [x - 0.3, 28]]);
        line(ctx, '#111111', 1.5, [[x + 3.8, 16.4], [x - 3.4, 18.2]]);
        continue;
      }
      const outer = x + side * 3.6, inner = x - side * 3.4;
      if (cfg.eye === 'none') continue;
      if (cfg.eye === 'round') {
        oval(ctx, x, 22.6, 3.2, 3.8, '#ffffff');
        oval(ctx, x, 23.2, 2.4, 3.1, iris);
        oval(ctx, x, 23.5, 1.2, 1.6, '#111111');
        circle(ctx, x - 0.9, 21.6, 1, '#ffffff');
        line(ctx, '#111111', 1.5, [[outer, 21.5], [x, 18.6], [inner, 21]]);
        line(ctx, '#111111', 1.3, [[x + side * 3.2, 17.4], [x, 16], [x - side * 3.2, 16.8]]); // 둥근 눈썹
      } else if (cfg.eye === 'sharp') {
        oval(ctx, x, 22.6, 3.3, 2.4, '#ffffff');
        oval(ctx, x, 22.8, 1.7, 2.2, iris);
        oval(ctx, x, 22.9, 0.9, 1.2, '#111111');
        circle(ctx, x - 0.6, 22, 0.6, '#ffffff');
        line(ctx, '#111111', 1.7, [[outer, 20.2], [inner, 21.6]]); // 날카로운 윗눈꺼풀
        line(ctx, '#111111', 0.7, [[outer - side * 0.8, 24.4], [inner + side * 0.5, 24.6]]);
        line(ctx, '#111111', cfg.thickBrow ? 2.4 : 1.5, [[x + side * 3.8, 16.4], [x - side * 3.4, 18.2]]); // 안쪽이 내려간 눈썹
      } else { // calm: 반쯤 감은 차분한 눈
        oval(ctx, x, 23, 3.2, 2.4, '#ffffff');
        oval(ctx, x, 23.6, 1.9, 1.9, iris);
        oval(ctx, x, 23.7, 0.9, 1, '#111111');
        ctx.fillStyle = shade(look.skin || SKIN, -0.05);
        ctx.fillRect(x - 3.4, 20, 6.8, 2.2); // 윗눈꺼풀이 눈 위를 덮음
        line(ctx, '#111111', 1.5, [[outer, 22.2], [inner, 22.2]]);
        line(ctx, '#111111', 1.2, [[x + side * 3.4, 18.4], [x - side * 3.2, 18]]);
      }
      if (cfg.lash) line(ctx, '#111111', 1, [[outer, 20.8], [outer + side * 1.6, 19.6]]);
      if (cfg.bags) line(ctx, shade(look.skin || SKIN, -0.3), 0.6, [[x - 2.6, 26], [x, 26.7], [x + 2.6, 26]]); // 로: 다크서클
    }
  }

  /** 입 */
  function opMouth(ctx, look, cfg) {
    if (cfg.mouth === 'grin') {
      const w = cfg.wide ? 8.5 : 6.5;
      ctx.fillStyle = '#5a1414';
      ctx.beginPath();
      ctx.moveTo(32 - w, 28);
      ctx.quadraticCurveTo(32, 37, 32 + w, 28);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(32 - w + 1, 28, (w - 1) * 2, 1.8);
      oval(ctx, 32, 32.2, w * 0.45, 1.3, '#ff7a8a');
      line(ctx, '#111111', 0.9, [[32 - w, 28], [32 + w, 28]]);
    } else if (cfg.mouth === 'smirk') {
      line(ctx, '#3a1414', 1.1, [[29, 30], [33, 30.4], [35.5, 28.8]]);
    } else {
      ctx.strokeStyle = '#3a1414';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(32, 28, 3, 0.25 * Math.PI, 0.75 * Math.PI);
      ctx.stroke();
    }
  }

  /** 원피스 캐릭터 머리 (앞모습) */
  function opHead(ctx, look) {
    const cfg = OP[look.op] || OP.luffy;
    const skin = look.skin || SKIN;
    oval(ctx, 17.5, 22, 2.4, 3.4, skin); // 귀
    oval(ctx, 46.5, 22, 2.4, 3.4, skin);
    ctx.fillStyle = skin;
    opFacePath(ctx);
    ctx.fill();
    if (cfg.stubble) { // 샹크스: 턱수염
      ctx.save();
      opFacePath(ctx);
      ctx.clip();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = shade(look.hair || '#c62828', -0.2);
      ctx.beginPath();
      ctx.ellipse(32, 37, 7.5, 3.6, 0, Math.PI, TAU); // 턱 끝만
      ctx.lineTo(41.5, 40);
      ctx.lineTo(22.5, 40);
      ctx.fill();
      ctx.restore();
    }
    line(ctx, shade(skin, -0.25), 0.8, [[31.5, 25.6], [32.6, 26.4]]); // 코 그림자
    opEyes(ctx, look, cfg);
    opMouth(ctx, look, cfg);
    if (cfg.blush) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      circle(ctx, 22.5, 27, 2, '#ff6b81');
      circle(ctx, 41.5, 27, 2, '#ff6b81');
      ctx.restore();
    }
    faceMarks(ctx, look);
    opHairFront(ctx, look);
  }

  /** 해골 얼굴 (브룩) */
  function skullFace(ctx) {
    circle(ctx, 32, 21, 13.5, '#f5f5f0');
    oval(ctx, 26.5, 20, 3.2, 3.6, '#1a1a1a');
    oval(ctx, 37.5, 20, 3.2, 3.6, '#1a1a1a');
    poly(ctx, '#1a1a1a', [[31, 25], [33, 25], [32, 23]]);
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 26, 28, 12, 4, 1.5);
    for (const x of [29, 32, 35]) line(ctx, '#888888', 0.5, [[x, 28], [x, 32]]);
  }

  /** 긴 머리 뒤쪽 층 (어깨까지) */
  function hairBack(ctx, look) {
    const style = look.hairStyle || (look.body === 'f' ? 'long' : 'parted');
    if (style !== 'long') return;
    ctx.fillStyle = look.hair || '#3e2723';
    roundRect(ctx, 17, 12, 30, 28, 10);
  }

  /** 마스크의 큰 눈 (색 · 크기 지정) */
  function lensEyes(ctx, color, big) {
    [[25.5, 1], [38.5, -1]].forEach(([x, tilt]) => {
      ctx.beginPath();
      ctx.ellipse(x, 20, big ? 7 : 6, big ? 5 : 4.2, tilt * 0.5, 0, TAU);
      ctx.fillStyle = color || '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#111111';
      ctx.stroke();
    });
  }

  /** 가슴 문양 (가운데 32, 40) */
  function chestMark(ctx, look) {
    const e = look.emblem;
    switch (look.mark) {
      case 'spider': emblem(ctx, e); break;
      case 'spiderBig':
        ctx.save();
        ctx.translate(32, 41);
        ctx.scale(1.9, 1.6);
        ctx.translate(-32, -41);
        emblem(ctx, e);
        ctx.restore();
        break;
      case 'star': star(ctx, 32, 39, 4.8, e); break;
      case 'bat':
        poly(ctx, e, [[22, 38], [26, 36.5], [29, 37.5], [30.5, 35.5], [31.3, 37], [32.7, 37], [33.5, 35.5], [35, 37.5], [38, 36.5], [42, 38],
          [39, 39], [38, 42], [35.5, 40.5], [32, 43], [28.5, 40.5], [26, 42], [25, 39]]);
        break;
      case 'super':
        poly(ctx, look.line, [[25, 36], [39, 36], [42, 39], [32, 47], [22, 39]]);
        line(ctx, e, 1.8, [[35, 38], [29.5, 38], [29.5, 40.5], [34.5, 40.5], [34.5, 43], [29, 43]]);
        break;
      case 'bolt':
        circle(ctx, 32, 40, 5.5, look.line === e ? '#ffffff' : look.line);
        poly(ctx, e, [[33.5, 35], [29, 40.5], [32, 40.5], [30.5, 45], [35, 39.5], [32, 39.5]]);
        break;
      case 'x':
        circle(ctx, 32, 40, 5, e);
        line(ctx, look.suit, 1.6, [[29, 37], [35, 43]]);
        line(ctx, look.suit, 1.6, [[35, 37], [29, 43]]);
        break;
      case 'arc': case 'beetle': case 'amulet': {
        ctx.save();
        ctx.globalAlpha = 0.4;
        circle(ctx, 32, 39, look.mark === 'amulet' ? 5 : 7, e);
        ctx.restore();
        if (look.mark === 'beetle') {
          ctx.fillStyle = e;
          ctx.beginPath();
          ctx.ellipse(32, 40, 3.2, 4.6, 0, 0, TAU);
          ctx.fill();
          line(ctx, look.suit, 0.8, [[32, 35.5], [32, 44.5]]);
        } else {
          if (look.mark === 'amulet') circle(ctx, 32, 39, 3.4, look.line);
          circle(ctx, 32, 39, look.mark === 'amulet' ? 1.8 : 4.2, e);
          if (look.mark === 'arc') circle(ctx, 32, 39, 2, '#ffffff');
        }
        break;
      }
      case 'lantern':
        circle(ctx, 32, 40, 5.4, e);
        circle(ctx, 32, 40, 3.6, look.suit);
        ctx.fillStyle = e;
        ctx.fillRect(27, 37.8, 10, 1.4);
        ctx.fillRect(27, 40.8, 10, 1.4);
        break;
      case 'eagle': case 'bird':
        line(ctx, e, 1.8, [[22, 36], [27, 40], [32, 37.5], [37, 40], [42, 36]]);
        if (look.mark === 'bird') line(ctx, e, 1.6, [[32, 37.5], [32, 45]]);
        break;
      case 'hourglass':
        poly(ctx, e, [[29.5, 49], [34.5, 49], [32, 52], [34.5, 55], [29.5, 55], [32, 52]]);
        break;
      default:
    }
  }

  /** 손에 든 장비 · 등 장비 */
  function filmGear(ctx, look, back, P) {
    const g = new Set(look.gear || []);
    if (g.has('shield')) {
      const [sx, sy, sr] = back ? [32, 43, 12.5] : [P.off[0], P.off[1] - 2, 11.5];
      if (look.pattern === 'amazon') { // 은빛 둥근 방패
        circle(ctx, sx, sy, sr, '#b0bec5');
        circle(ctx, sx, sy, sr * 0.8, '#eceff1');
        star(ctx, sx, sy, sr * 0.35, look.line);
      } else {
        circle(ctx, sx, sy, sr, look.accent);
        circle(ctx, sx, sy, sr * 0.78, look.line);
        circle(ctx, sx, sy, sr * 0.57, look.accent);
        circle(ctx, sx, sy, sr * 0.37, look.suit);
        star(ctx, sx, sy, sr * 0.32, look.emblem);
      }
      gloss(ctx, sx - sr * 0.35, sy - sr * 0.35, sr * 0.35, sr * 0.2);
    }
    atHand(ctx, P, () => {
      if (g.has('hammer')) {
        ctx.fillStyle = '#8d6e63';
        roundRect(ctx, 52.8, 17, 2.6, 13, 1);
        ctx.fillStyle = '#9aa5b1';
        roundRect(ctx, 46.5, 9.5, 15, 8.5, 2);
        gloss(ctx, 50, 11.5, 3, 1.4);
        poly(ctx, '#ffd166', [[59, 4], [56, 9], [58, 9], [55, 14], [61, 7], [59, 7], [61, 4]]);
      }
      if (g.has('bow')) {
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(55, 27, 11, -1.3, 1.3);
        ctx.stroke();
        line(ctx, '#dddddd', 0.8, [[55 + Math.cos(-1.3) * 11, 27 + Math.sin(-1.3) * 11], [55 + Math.cos(1.3) * 11, 27 + Math.sin(1.3) * 11]]);
      }
      if (g.has('trident') || g.has('spear')) {
        const gold = g.has('trident');
        line(ctx, gold ? '#f2c14e' : '#6d4c41', 1.8, [[54, 44], [54, 6]]);
        if (gold) for (const dx of [-3, 0, 3]) poly(ctx, '#f2c14e', [[54 + dx - 1.2, 8], [54 + dx, 1], [54 + dx + 1.2, 8]]);
        else poly(ctx, '#cfd8dc', [[51.5, 8], [54, 0], [56.5, 8]]);
      }
      if (g.has('sword')) {
        line(ctx, '#cfd8dc', 2, [[54, 27], [58, 7]]);
        line(ctx, '#5d4037', 2.4, [[51.5, 26], [56.5, 27.5]]);
      }
      if (g.has('claws')) for (const dx of [-2, 0, 2]) line(ctx, '#e0e0e0', P.name === 'attack' ? 1.4 : 1, [[54 + dx, 23], [55.5 + dx, 14]]);
      if (g.has('ring')) {
        ctx.save();
        ctx.strokeStyle = look.emblem;
        ctx.shadowColor = look.emblem;
        ctx.shadowBlur = 4;
        ctx.lineWidth = 1.3;
        for (const r of [8.5, 5.8]) {
          ctx.beginPath();
          ctx.arc(55, 25, r, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
      }
    });
    if (g.has('cannon')) {
      ctx.fillStyle = '#2b2f36';
      roundRect(ctx, 40, 27, 12, 4, 2);
    }
  }

  /** 등 장비 (몸보다 먼저 그림): 망토 · 날개 · 화살통 */
  function filmBackGear(ctx, look) {
    const g = new Set(look.gear || []);
    if (g.has('wings')) {
      for (const s of [-1, 1]) {
        poly(ctx, look.pattern === 'tactical' ? '#90a4ae' : 'rgba(255, 236, 140, 0.75)',
          [[32 + s * 6, 36], [32 + s * 27, 22], [32 + s * 25, 30], [32 + s * 28, 33], [32 + s * 10, 44]]);
      }
    }
    if (g.has('quiver')) {
      ctx.fillStyle = '#5d4037';
      roundRect(ctx, 37, 25, 7, 20, 3);
      for (const x of [39, 42]) poly(ctx, '#d1c4e9', [[x, 20], [x + 2, 25], [x - 2, 25]]);
    }
    if (look.cape) poly(ctx, look.cape, [[19, 33], [45, 33], [53, 69], [11, 69]]);
  }

  /** 영화 원조 히어로 한 명 (데이터로 그리기) */
  function drawFilm(ctx, look, back, P) {
    const skin = look.skin || SKIN;
    const pt = look.pattern || 'plain';
    const head = look.head || 'face';
    const bodySkin = pt === 'skin' || pt === 'rock' || pt === 'bark';
    const showHair = ['face', 'domino', 'tint', 'android'].includes(head) && !look.bald;
    if (!back) filmBackGear(ctx, look);
    if (showHair && !back) { if (look.op) opHairBack(ctx, look); else hairBack(ctx, look); }

    // 몸
    const legs = look.legs || (bodySkin ? look.suit : pt === 'amazon' ? skin : pt === 'robe' ? shade(look.suit, -0.25)
      : (pt === 'web' && look.sides) || pt === 'scales' ? look.accent : look.suit);
    const boots = bodySkin ? look.suit : look.boot || look.accent;
    const arms = look.arms || (pt === 'amazon' ? skin : look.suit); // look.arms: 맨팔 · 소매 색
    const gloves = bodySkin || pt === 'amazon' ? arms : look.glove || look.accent;
    const big = look.bulk && look.bulk > 1.1;
    legPair(ctx, P, legs, boots, big ? [24, 40] : [26, 38], big ? { y: 54, w: 11, len: 13, bootW: 14, bootH: 8 } : LEGS);
    limb(ctx, look.metalArm ? '#b0bec5' : arms, SHOULDER.l[0], SHOULDER.l[1], P.off[0], P.off[1]);
    limb(ctx, arms, SHOULDER.r[0], SHOULDER.r[1], P.hand[0], P.hand[1]);
    if (big) { // 굵은 팔 덧그리기
      line(ctx, arms, 10, [SHOULDER.l, P.off]);
      line(ctx, arms, 10, [SHOULDER.r, P.hand]);
    }
    circle(ctx, P.off[0], P.off[1], big ? 5.5 : 3.8, look.metalArm ? '#b0bec5' : gloves);
    circle(ctx, P.hand[0], P.hand[1], big ? 5.5 : 3.8, gloves);
    if (pt === 'amazon') { // 금 팔찌
      circle(ctx, (SHOULDER.l[0] + P.off[0] * 3) / 4, (SHOULDER.l[1] + P.off[1] * 3) / 4, 2.6, look.line);
      circle(ctx, (SHOULDER.r[0] + P.hand[0] * 3) / 4, (SHOULDER.r[1] + P.hand[1] * 3) / 4, 2.6, look.line);
    }
    ctx.fillStyle = look.suit;
    if (big) roundRect(ctx, 14, 29, 36, 24, 11);
    else if (look.body === 'f') { // 여성 체형: 좁은 어깨 · 잘록한 허리
      ctx.beginPath();
      ctx.moveTo(21, 35);
      ctx.quadraticCurveTo(32, 31, 43, 35);
      ctx.quadraticCurveTo(39, 45, 42, 56);
      ctx.lineTo(22, 56);
      ctx.quadraticCurveTo(25, 45, 21, 35);
      ctx.closePath();
      ctx.fill();
    } else roundRect(ctx, 19, 33, 26, 23, 8);
    gloss(ctx, 25, 38, 4, 2.5);

    // 몸 무늬
    if (pt === 'web') {
      if (look.sides) {
        ctx.fillStyle = look.accent;
        roundRect(ctx, 19, 42, 5, 13, 2);
        roundRect(ctx, 40, 42, 5, 13, 2);
      }
      if (!look.webHeadOnly) webPattern(ctx, 32, 40, 12, look.line);
    } else if (pt === 'plates') {
      ctx.fillStyle = look.accent;
      roundRect(ctx, 24, 44, 16, 4, 2);
      for (const x of [19, 45]) circle(ctx, x, 35, 4.6, look.suit);
    } else if (pt === 'stripes') {
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i % 2 ? look.line : look.accent;
        ctx.fillRect(21 + i * 4.4, 44, 4.4, 9);
      }
    } else if (pt === 'discs') {
      for (const [x, y] of [[27, 37], [32, 37], [37, 37], [27, 42], [32, 42], [37, 42]]) circle(ctx, x, y, 1.9, look.line);
    } else if (pt === 'skin' || pt === 'rock') {
      ctx.fillStyle = look.accent; // 반바지
      if (big) roundRect(ctx, 16, 47, 32, 10, 4);
      else roundRect(ctx, 19, 48, 26, 9, 4);
      if (look.topSuit) {
        ctx.fillStyle = look.accent;
        roundRect(ctx, big ? 16 : 20, big ? 31 : 34, big ? 32 : 24, 9, 4);
      }
      if (pt === 'rock') {
        for (const [x, y] of [[24, 34], [31, 33], [38, 35], [22, 41], [29, 40], [36, 42], [42, 40]]) {
          ctx.strokeStyle = look.line;
          ctx.lineWidth = 0.9;
          ctx.strokeRect(x - 3, y - 2.5, 6, 5);
        }
      } else if (!back) {
        ctx.strokeStyle = look.line;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(26, 35, 5.5, 0.3, 2.6);
        ctx.moveTo(43.4, 37);
        ctx.arc(38, 35, 5.5, 0.3, 2.6);
        ctx.stroke();
      }
    } else if (pt === 'bark') {
      for (const x of [23, 28, 33, 38, 42]) line(ctx, look.line, 1, [[x, 31], [x + 1, 38], [x - 1, 45], [x, 52]]);
    } else if (pt === 'tribal') {
      for (let i = 0; i < 3; i++) line(ctx, look.line, 1.2, [[22 + i, 34 + i * 2.6], [32, 40 + i * 2.6], [42 - i, 34 + i * 2.6]]);
    } else if (pt === 'amazon') {
      poly(ctx, look.accent, [[19, 49], [45, 49], [47, 58], [17, 58]]); // 치마
      for (let x = 20; x < 46; x += 4) circle(ctx, x, 53, 0.8, '#ffffff');
    } else if (pt === 'robe') {
      poly(ctx, look.suit, [[19, 50], [45, 50], [48, 64], [16, 64]]);
      line(ctx, look.accent, 1.8, [[21, 34], [43, 50]]);
      for (const s of [-1, 1]) poly(ctx, look.accent, [[32 + s * 9, 31], [32 + s * 15, 15], [32 + s * 6, 27]]);
    } else if (pt === 'sides') {
      ctx.fillStyle = look.accent;
      roundRect(ctx, 19, 36, 5, 19, 2);
      roundRect(ctx, 40, 36, 5, 19, 2);
    } else if (pt === 'tactical') {
      line(ctx, look.accent, 1.6, [[24, 33], [24, 55]]);
      line(ctx, look.accent, 1.6, [[40, 33], [40, 55]]);
    } else if (pt === 'vest') { // 열린 조끼 · 셔츠 (가운데 맨가슴)
      poly(ctx, look.skin || SKIN, [[28, 33.5], [36, 33.5], [34.5, 48], [29.5, 48]]);
    } else if (pt === 'bare') { // 맨 상체
      ctx.fillStyle = look.skin || SKIN;
      roundRect(ctx, 19.5, 33.5, 25, 15, 7);
      line(ctx, shade(look.skin || SKIN, -0.25), 0.8, [[32, 38], [32, 47]]);
    } else if (pt === 'suitTie') { // 정장 + 흰 셔츠 + 넥타이
      poly(ctx, '#f5f5f5', [[28, 33.5], [36, 33.5], [33.5, 44], [30.5, 44]]);
      poly(ctx, look.accent, [[31, 35], [33, 35], [33.6, 42], [32, 44], [30.4, 42]]);
    } else if (pt === 'scales') {
      for (let y = 35; y < 49; y += 3) for (let x = 22 + (y % 2); x < 43; x += 4) {
        ctx.strokeStyle = look.line;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI);
        ctx.stroke();
      }
    }
    if ((look.gear || []).includes('swords3')) { // 허리의 칼 세 자루 (조로)
      for (const [dx, col] of [[0, '#ffffff'], [2.5, '#1a1a1a'], [5, '#c62828']]) line(ctx, col, 1.5, [[40 + dx, 46], [50 + dx, 62]]);
    }
    if (look.belt) {
      ctx.fillStyle = typeof look.belt === 'string' ? look.belt : look.accent;
      roundRect(ctx, big ? 15 : 19, 49, big ? 34 : 26, 4.5, 2);
    }
    if (!back) chestMark(ctx, look);

    const detail = CHARACTER_DETAILS[look.op || look.id];
    if (detail && detail.body && !back) detail.body(ctx, look, P);
    if (look.op === 'shanks') { // 샹크스: 목이 높고 소매 없는 검은 망토 (어깨 위로 솟은 깃)
      poly(ctx, '#1a1a1a', [[14, 40], [18, 30], [24, 26], [26, 34], [20, 46]]);
      poly(ctx, '#1a1a1a', [[50, 40], [46, 30], [40, 26], [38, 34], [44, 46]]);
    }
    // 머리 (원피스 치비는 머리를 더 크게 — 목 위를 기준으로 1.2배)
    ctx.save();
    if (look.anime) {
      ctx.translate(32, 30);
      ctx.scale(1.2, 1.2);
      ctx.translate(-32, -30);
    }
    const hairC = look.hair || '#3e2723';
    if (look.ears || look.catEars) {
      for (const s of [-1, 1]) poly(ctx, look.suit, look.ears ? [[32 + s * 6, 9], [32 + s * 11, -1], [32 + s * 12, 10]] : [[32 + s * 9, 11], [32 + s * 12, 3], [32 + s * 4, 8]]);
    }
    if (look.fins) for (const s of [-1, 1]) poly(ctx, look.suit, [[32 + s * 9, 14], [32 + s * 20, 2], [32 + s * 13, 18]]);
    if (head === 'mask') {
      if (look.hood) circle(ctx, 32, 20, 16, look.accent);
      circle(ctx, 32, 20, 14, look.helmetMetal ? '#9e9e9e' : look.suit);
      if (pt === 'web') webPattern(ctx, 32, 20, 14, look.line);
      if (pt === 'tribal' && !back) line(ctx, look.line, 0.9, [[22, 15], [32, 24], [42, 15]]);
      if (look.helmetMetal && !back) {
        ctx.fillStyle = look.suit;
        roundRect(ctx, 23, 25, 18, 6, 3);
      }
      gloss(ctx, 27, 13, 4, 2.5);
      if (!back) lensEyes(ctx, look.lens, look.lensBig);
      if (look.fangs && !back) { // 베놈: 이빨 가득한 큰 입 + 혀
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(21, 25);
        ctx.quadraticCurveTo(32, 36, 43, 25);
        ctx.quadraticCurveTo(32, 29, 21, 25);
        ctx.fill();
        ctx.strokeStyle = '#0b0b10';
        ctx.lineWidth = 0.7;
        for (let x = 23; x <= 41; x += 2.4) {
          ctx.beginPath();
          ctx.moveTo(x, 25.5 + Math.abs(x - 32) * -0.05);
          ctx.lineTo(x, 30 - Math.abs(x - 32) * 0.35);
          ctx.stroke();
        }
        poly(ctx, '#e53950', [[30, 29], [34, 29], [35, 34], [32, 36], [31, 33]]);
      }
    } else if (head === 'faceplate') {
      ctx.fillStyle = look.suit;
      roundRect(ctx, 20, 6, 24, 28, 11);
      gloss(ctx, 27, 12, 4, 2.5);
      if (!back) {
        poly(ctx, look.accent, [[24, 13], [40, 13], [40, 24], [36, 30], [28, 30], [24, 24]]);
        ctx.fillStyle = look.emblem;
        roundRect(ctx, 25.5, 17, 5, 2.4, 1);
        roundRect(ctx, 33.5, 17, 5, 2.4, 1);
      }
    } else if (head === 'helmet') {
      for (const s of [-1, 1]) poly(ctx, look.line, [[32 + s * 10, 16], [32 + s * 18, 10], [32 + s * 16, 15], [32 + s * 19, 15], [32 + s * 13, 21]]);
      circle(ctx, 32, 20, 14, look.suit);
      if (!back) {
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.ellipse(32, 24, 10, 9, 0, 0, Math.PI);
        ctx.fill();
        circle(ctx, 27, 21, 2.8, skin);
        circle(ctx, 37, 21, 2.8, skin);
        cuteFace(ctx, 21, '#5d4037');
        line(ctx, look.line, 1.6, [[29, 14.5], [32, 8.5], [35, 14.5]]); // 투구의 흰 글자 A
        line(ctx, look.line, 1.2, [[30.2, 12.4], [33.8, 12.4]]);
      }
      gloss(ctx, 27, 12, 4, 2.5);
    } else if (head === 'cowl') {
      circle(ctx, 32, 20, 14, skin);
      ctx.fillStyle = look.suit; // 이마 · 눈 · 뒤통수를 덮는 고깔
      ctx.beginPath();
      ctx.arc(32, 20, 14.3, Math.PI * 0.9, Math.PI * 2.1);
      ctx.lineTo(41, 24);
      ctx.quadraticCurveTo(32, 21.5, 23, 24);
      ctx.closePath();
      ctx.fill();
      if (look.fins) {
        ctx.fillStyle = look.accent;
        poly(ctx, look.accent, [[22, 12], [29, 18], [24, 22]]);
        poly(ctx, look.accent, [[42, 12], [35, 18], [40, 22]]);
      }
      gloss(ctx, 27, 12, 4, 2.2);
      if (!back) {
        for (const [x, t] of [[27, 0.3], [37, -0.3]]) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(x, 18.5, 3.6, 2, t, 0, TAU);
          ctx.fill();
        }
        ctx.strokeStyle = '#7a2a2a';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(32, 26.5, 2.4, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
      }
    } else { // 얼굴이 보이는 히어로
      const face = head === 'tint' ? (look.skinTint || look.suit) : head === 'android' ? look.line : skin;
      if (look.op && !back) { // 원피스: 캐릭터별 얼굴
        opHead(ctx, look);
        if (detail && detail.face) detail.face(ctx, look);
        if (look.hat) drawHat(ctx, look);
        ctx.restore();
        if (look.beads) for (let i = 0; i < 9; i++) circle(ctx, 22 + i * 2.5, 35.5 + Math.sin((i / 8) * Math.PI) * 3, 1.3, '#c62828'); // 에이스 구슬 목걸이
        filmGear(ctx, look, back, P);
        return;
      }
      circle(ctx, 32, 20, 14, back && showHair ? hairC : face);
      if (showHair) hairFront(ctx, look, back);
      if (look.pattern === 'bark') { // 그루트: 머리 위 나뭇가지 · 잎 + 얼굴 나뭇결
        for (const [x1, y1, x2, y2] of [[26, 9, 22, 0], [31, 7, 30, -2], [37, 8, 40, -1], [41, 11, 46, 5]]) line(ctx, look.line, 1.6, [[x1, y1], [x2, y2]]);
        for (const [x, y] of [[22, 0], [40, -1], [46, 5]]) oval(ctx, x, y, 2.4, 1.4, look.emblem, 0.6);
        for (const x of [24, 40]) line(ctx, shade(look.suit, -0.25), 0.7, [[x, 10], [x + 1, 30]]);
        line(ctx, shade(look.suit, -0.25), 0.7, [[30, 8], [31, 15]]);
      }
      if (!back && look.skull) skullFace(ctx);
      else if (!back) {
        if (look.anime) animeFace(ctx, look);
        else cuteFace(ctx, 21, showHair ? hairC : shade(face, -0.35), look.bulk && look.bulk >= 1.3);
        faceMarks(ctx, look);
        if (head === 'domino') {
          ctx.fillStyle = look.lens || look.suit;
          roundRect(ctx, 21, 17, 22, 7, 3.5);
          circle(ctx, 27, 20.5, 2, '#ffffff');
          circle(ctx, 37, 20.5, 2, '#ffffff');
          circle(ctx, 27, 20.6, 1.1, '#1a1a1a');
          circle(ctx, 37, 20.6, 1.1, '#1a1a1a');
        }
        if (look.beard) {
          ctx.fillStyle = hairC;
          ctx.beginPath();
          ctx.arc(32, 25, 8.5, 0.05 * Math.PI, 0.95 * Math.PI);
          ctx.quadraticCurveTo(32, 30.5, 40.5, 25.5);
          ctx.fill();
          ctx.strokeStyle = '#7a2a2a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(32, 25.5, 2.2, 0.2 * Math.PI, 0.8 * Math.PI);
          ctx.stroke();
        }
        if (head === 'android') circle(ctx, 32, 11, 1.8, look.emblem);
      }
      if (look.skull && showHair && !back) hairFront(ctx, look, back); // 해골 위 아프로
      if (look.hat && !back) drawHat(ctx, look);
      if ((look.gear || []).includes('tiara')) {
        poly(ctx, look.line, [[20, 13], [44, 13], [43, 10.5], [34, 9.5], [32, 6], [30, 9.5], [21, 10.5]]);
        if (look.pattern === 'amazon') star(ctx, 32, 10.5, 2.2, '#c62828');
      }
      if ((look.gear || []).includes('horns')) {
        for (const s of [-1, 1]) {
          ctx.strokeStyle = '#c9a227';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(32 + s * 5, 9);
          ctx.quadraticCurveTo(32 + s * 9, -2, 32 + s * 15, -4);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    filmGear(ctx, look, back, P);
  }


  // ---------- 오리지널 (이 게임만의 새 캐릭터) ----------
  // 기존 작품의 공식(망토 · 마스크 · 쫄쫄이 슈트 · 가슴 문양)을 쓰지 않는다. 아이가 좋아하는 소재(공룡 옷 · 우주복 · 요리사 · 딸기 …)로
  // 오리지널만의 그림체: 큰 머리 + 반짝이 세 개의 큰 눈 + 파스텔 색 + 동글동글한 몸 + 큼직한 신발.

  /** 캔버스 하트 */
  function heartPath(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x - r * 0.5, y - r * 0.2, r * 0.55, 0, TAU);
    ctx.arc(x + r * 0.5, y - r * 0.2, r * 0.55, 0, TAU);
    ctx.fill();
    poly(ctx, color, [[x - r * 1.02, y + r * 0.05], [x + r * 1.02, y + r * 0.05], [x, y + r * 1.05]]);
  }

  /** 오리지널 얼굴: 큰 눈(반짝이 3개) · 분홍 볼 · 작은 입 */
  function origFace(ctx, y, mouth = 'smile') {
    for (const x of [26.5, 37.5]) {
      oval(ctx, x, y, 2.6, 3.3, '#2a2346');
      circle(ctx, x - 0.9, y - 1.2, 1.1, '#ffffff');
      circle(ctx, x + 0.9, y + 1.1, 0.55, '#ffffff');
      circle(ctx, x + 1.2, y - 1.6, 0.4, '#ffffff');
    }
    ctx.save();
    ctx.globalAlpha = 0.45;
    oval(ctx, 22, y + 4, 2.8, 1.8, '#ff7a9c');
    oval(ctx, 42, y + 4, 2.8, 1.8, '#ff7a9c');
    ctx.restore();
    if (mouth === 'open') {
      ctx.fillStyle = '#7a2a3a';
      ctx.beginPath();
      ctx.arc(32, y + 4, 2.4, 0, Math.PI);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#7a2a3a';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(32, y + 3.6, 2, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  }

  /** 오리지널 몸: 동글동글한 몸통 · 짧은 팔(벙어리장갑) · 큼직한 신발 */
  function origBody(ctx, P, body, mitt, shoe) {
    const run = P.legs[0] - P.legs[1];
    oval(ctx, 26 + run * 3, 64, 6, 4, shoe);
    oval(ctx, 38 - run * 3, 64, 6, 4, shoe);
    ctx.fillStyle = body;
    roundRect(ctx, 21, 38, 22, 24, 10);
    for (const [sx, a] of [[22, P.l], [42, P.r]]) {
      const ang = Math.max(-2.5, Math.min(2.5, a));
      const hx = sx + Math.cos(ang) * 8;
      const hy = 44 + Math.sin(ang) * 8;
      line(ctx, body, 6, [[sx, 44], [hx, hy]]);
      circle(ctx, hx, hy, 3.6, mitt);
    }
  }

  /** 손에 든 물건을 손 위치로 옮겨 그린다 (draw 는 손 (0, 0) 기준) */
  function inHand(ctx, P, draw) {
    const ang = Math.max(-2.5, Math.min(2.5, P.r));
    ctx.save();
    ctx.translate(42 + Math.cos(ang) * 8, 44 + Math.sin(ang) * 8);
    draw();
    ctx.restore();
  }

  const SKIN_O = '#ffd9b8';

  /** 오리지널 캐릭터 한 명 */
  function drawOriginal(ctx, look, back, P) {
    const o = look.orig;
    const L = look;
    if (o === 'dino') { // 디노 도도: 공룡 후드티 (등 가시 · 꼬리 · 밝은 배)
      poly(ctx, L.suit, [[40, 52], [56, 60], [44, 60]]); // 꼬리
      origBody(ctx, P, L.suit, L.suit, L.line);
      oval(ctx, 32, 52, 7, 8, L.accent);
      for (const [x, y] of [[20, 14], [25, 7], [32, 4.5], [39, 7], [44, 14]]) poly(ctx, L.emblem, [[x - 3, y + 3], [x, y - 3], [x + 3, y + 3]]); // 가시
      circle(ctx, 32, 22, 16, L.suit); // 후드
      if (!back) {
        oval(ctx, 32, 25, 11.5, 10, SKIN_O); // 얼굴
        origFace(ctx, 24.5, 'open');
        for (const x of [24, 40]) poly(ctx, '#ffffff', [[x - 1.6, 13], [x + 1.6, 13], [x, 16]]); // 후드 이빨 장식
      }
      return;
    }
    if (o === 'cosmo') { // 코스모 콩: 동그란 유리 헬멧 우주복 + 제트팩
      ctx.fillStyle = '#9aa8b8';
      roundRect(ctx, 16, 38, 8, 18, 3); // 제트팩
      roundRect(ctx, 40, 38, 8, 18, 3);
      poly(ctx, L.accent, [[17, 56], [23, 56], [20, 62]]);
      poly(ctx, L.accent, [[41, 56], [47, 56], [44, 62]]);
      origBody(ctx, P, L.suit, L.accent, L.accent);
      ctx.fillStyle = L.accent;
      ctx.fillRect(21, 48, 22, 3);
      circle(ctx, 32, 43, 3, L.line);
      circle(ctx, 32, 22, 16.5, '#dff1ff'); // 유리 헬멧
      if (!back) {
        circle(ctx, 32, 23, 11, SKIN_O);
        ctx.fillStyle = '#6b4a2b';
        ctx.beginPath();
        ctx.arc(32, 21, 11.2, Math.PI * 1.05, Math.PI * 1.95);
        ctx.fill();
        origFace(ctx, 23.5);
      }
      ctx.save();
      ctx.globalAlpha = 0.55;
      oval(ctx, 25, 13, 5, 2.6, '#ffffff', -0.5); // 헬멧 반사광
      ctx.restore();
      ctx.strokeStyle = L.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(32, 22, 16.5, 0, TAU);
      ctx.stroke();
      return;
    }
    if (o === 'chef') { // 셰프 팡팡: 높은 요리사 모자 · 단추 두 줄 조리복 · 프라이팬
      origBody(ctx, P, L.suit, L.suit, '#3a3a4a');
      for (const y of [44, 49, 54]) { circle(ctx, 28.5, y, 1, L.line); circle(ctx, 35.5, y, 1, L.line); }
      ctx.fillStyle = L.accent; // 빨간 스카프
      roundRect(ctx, 25, 37, 14, 4, 2);
      circle(ctx, 32, 23, 14, SKIN_O);
      ctx.fillStyle = '#ffffff'; // 요리사 모자
      roundRect(ctx, 20, 9, 24, 7, 3);
      for (const [x, y, r] of [[24, 4, 6], [32, 1, 7], [40, 4, 6]]) circle(ctx, x, y, r, '#ffffff');
      if (!back) {
        ctx.fillStyle = '#5a3a1a'; // 앞머리
        ctx.fillRect(20, 15, 24, 3);
        origFace(ctx, 23.5, 'open');
      }
      inHand(ctx, P, () => { // 프라이팬 방패
        line(ctx, '#6b4a2b', 2.4, [[0, 0], [6, -6]]);
        circle(ctx, 11, -11, 8, '#3a3a4a');
        circle(ctx, 11, -11, 6, '#5c6b7a');
        oval(ctx, 11, -11, 3, 2, '#ffe066'); // 계란 프라이
        circle(ctx, 11, -11, 1.4, '#ffb000');
      });
      return;
    }
    if (o === 'tvbot') { // 삐뽀: 네모난 TV 머리 로봇 (화면에 하트 · 안테나 둘 · 스프링 다리)
      const run = P.legs[0] - P.legs[1];
      for (const [x, d] of [[26, run], [38, -run]]) {
        ctx.strokeStyle = L.line;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) ctx.lineTo(x + d * 3 + (i % 2 ? 2.5 : -2.5), 56 + i * 1.3);
        ctx.stroke();
        oval(ctx, x + d * 3, 65, 5.5, 3, L.line);
      }
      ctx.fillStyle = L.suit;
      roundRect(ctx, 20, 38, 24, 18, 4);
      heartPath(ctx, 32, 46, 3.4, L.emblem);
      for (const [sx, a] of [[20, P.l], [44, P.r]]) {
        const ang = Math.max(-2.5, Math.min(2.5, a));
        line(ctx, L.line, 2, [[sx, 44], [sx + Math.cos(ang) * 8, 44 + Math.sin(ang) * 8]]);
        circle(ctx, sx + Math.cos(ang) * 8, 44 + Math.sin(ang) * 8, 3, L.accent);
      }
      for (const s of [-1, 1]) { line(ctx, L.line, 1.4, [[32 + s * 6, 9], [32 + s * 10, 1]]); circle(ctx, 32 + s * 10, 1, 2, L.emblem); }
      ctx.fillStyle = L.suit;
      roundRect(ctx, 15, 8, 34, 28, 6); // TV 머리
      if (!back) {
        ctx.fillStyle = '#25324a';
        roundRect(ctx, 19, 12, 26, 19, 4); // 화면
        for (const x of [26, 38]) { ctx.fillStyle = L.accent; ctx.fillRect(x - 2, 17, 4, 5); }
        heartPath(ctx, 32, 26, 2.2, L.emblem);
        for (const y of [14, 18]) circle(ctx, 47.2, y + 2, 1.1, L.line); // 다이얼
      }
      return;
    }
    if (o === 'berry') { // 딸기 뿅: 딸기 모자 (씨 · 잎) + 분홍 원피스 + 딸기씨 새총
      origBody(ctx, P, L.suit, SKIN_O, L.accent);
      ctx.fillStyle = '#ffffff';
      for (let x = 22; x <= 42; x += 4) circle(ctx, x, 61, 1.6, '#ffffff'); // 원피스 레이스
      circle(ctx, 32, 24, 14, SKIN_O);
      ctx.fillStyle = '#6b3a2a'; // 머리카락
      ctx.beginPath();
      ctx.arc(32, 24, 14.4, Math.PI * 0.85, Math.PI * 2.15);
      ctx.fill();
      ctx.fillStyle = L.accent; // 딸기 모자
      ctx.beginPath();
      ctx.moveTo(15, 18);
      ctx.quadraticCurveTo(32, -8, 49, 18);
      ctx.quadraticCurveTo(32, 13, 15, 18);
      ctx.fill();
      for (const [x, y] of [[24, 12], [30, 8], [36, 9], [41, 13], [27, 15], [35, 14]]) oval(ctx, x, y, 0.7, 1.1, L.emblem);
      for (const a of [-0.9, -0.3, 0.3, 0.9]) oval(ctx, 32 + Math.sin(a) * 5, 1 - Math.cos(a) * 2, 2, 4, L.line, a);
      if (!back) {
        circle(ctx, 32, 24, 11.5, SKIN_O);
        ctx.fillStyle = '#6b3a2a';
        ctx.fillRect(21, 17, 22, 3.5);
        origFace(ctx, 25);
      }
      inHand(ctx, P, () => { // 딸기 모양 새총
        line(ctx, '#8d5524', 2, [[0, 0], [0, -8]]);
        line(ctx, '#8d5524', 1.6, [[0, -8], [-3, -12]]);
        line(ctx, '#8d5524', 1.6, [[0, -8], [3, -12]]);
        circle(ctx, 0, -13, 2.2, L.accent);
      });
      return;
    }
    if (o === 'witch') { // 수리수리: 달 · 별 무늬 큰 보라 모자 + 별 지팡이 대신 빗자루
      inHand(ctx, P, () => { // 빗자루
        line(ctx, '#8d5524', 2, [[0, 0], [10, 14]]);
        poly(ctx, '#e8b04a', [[8, 11], [16, 13], [15, 21], [7, 19]]);
      });
      origBody(ctx, P, L.suit, L.accent, '#3a2a5a');
      for (const [x, y] of [[26, 46], [37, 52], [31, 57]]) circle(ctx, x, y, 1.1, L.accent);
      circle(ctx, 32, 24, 14, SKIN_O);
      ctx.fillStyle = '#f7c8e8'; // 연분홍 머리카락
      ctx.beginPath();
      ctx.arc(32, 24, 14.4, Math.PI * 0.8, Math.PI * 2.2);
      ctx.fill();
      oval(ctx, 32, 13, 20, 4.5, L.suit); // 모자 챙
      poly(ctx, L.suit, [[19, 13], [45, 13], [38, -6], [46, -10], [33, -4]]); // 끝이 꺾인 모자
      ctx.fillStyle = L.accent; // 초승달
      ctx.beginPath();
      ctx.arc(30, 5, 3.4, 0, TAU);
      ctx.fill();
      circle(ctx, 31.6, 4.2, 3, L.suit);
      star(ctx, 37, 8, 2, L.accent);
      if (!back) {
        circle(ctx, 32, 24.5, 11.5, SKIN_O);
        origFace(ctx, 25);
      }
      return;
    }
    if (o === 'sheep') { // 뭉게: 번개 구름 양 (몽글몽글 털 · 작은 뿔 · 꼬마 번개)
      origBody(ctx, P, L.suit, '#5c5470', '#5c5470');
      for (const [x, y, r] of [[22, 46, 6], [32, 44, 7], [42, 46, 6], [26, 54, 6], [38, 54, 6]]) circle(ctx, x, y, r, L.suit); // 털
      for (const [x, y, r] of [[20, 16, 7], [26, 9, 7], [33, 7, 8], [40, 10, 7], [45, 17, 6], [32, 22, 14]]) circle(ctx, x, y, r, L.suit);
      for (const s of [-1, 1]) { // 말린 뿔
        ctx.strokeStyle = L.line;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(32 + s * 13, 15, 3, 0, Math.PI * 1.6);
        ctx.stroke();
      }
      if (!back) {
        oval(ctx, 32, 25, 9.5, 8.5, '#5c5470'); // 얼굴
        for (const x of [28, 36]) { circle(ctx, x, 24, 1.8, '#ffffff'); circle(ctx, x - 0.4, 23.6, 0.6, '#2a2346'); }
        line(ctx, '#ffffff', 0.9, [[30.5, 28], [32, 29], [33.5, 28]]);
      }
      poly(ctx, L.accent, [[50, 2], [46, 10], [49, 10], [45, 18], [53, 7], [50, 7], [54, 2]]); // 꼬마 번개
      return;
    }
    if (o === 'lion') { // 레오: 아기 사자 후드티 (갈기 · 동그란 귀 · 발바닥 장갑)
      origBody(ctx, P, L.suit, L.accent, L.accent);
      oval(ctx, 32, 52, 6, 7, '#fff1d6');
      for (let i = 0; i < 12; i++) { // 갈기
        const a = (i / 12) * TAU;
        circle(ctx, 32 + Math.cos(a) * 15.5, 22 + Math.sin(a) * 15.5, 5, L.accent);
      }
      circle(ctx, 32, 22, 15.5, L.suit);
      for (const s of [-1, 1]) { circle(ctx, 32 + s * 11, 8, 4, L.suit); circle(ctx, 32 + s * 11, 8, 2, L.emblem); }
      if (!back) {
        oval(ctx, 32, 25, 11, 9.5, SKIN_O);
        origFace(ctx, 24.5, 'open');
        oval(ctx, 32, 27.5, 1.6, 1.1, '#7a4a2a'); // 사자 코
      }
      return;
    }
  }

  // ---------- 산리오 캐릭터 (마스코트) ----------
  // 사람형 몸 대신 큰 동물 머리 + 작은 몸. look.mascot 종류마다 머리 모양을 그린다. 몸 · 팔다리는 자세(P)를 따른다.

  function oval(ctx, x, y, rx, ry, color, rot = 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
    ctx.fill();
  }

  /** 동그란 까만 눈 (반짝이) */
  function dotEyes(ctx, y, gap = 6, ry = 2.4, rx = 1.8) {
    for (const x of [32 - gap, 32 + gap]) {
      oval(ctx, x, y, rx, ry, '#1a1a1a');
      circle(ctx, x - 0.5, y - 0.9, 0.7, '#ffffff');
    }
  }

  /** 마스코트 머리 */
  function mascotHead(ctx, look, back) {
    const m = look.mascot;
    const W = '#ffffff';
    if (m === 'kitty') { // 헬로키티: 넓은 흰 얼굴 · 귀 · 빨간 리본 · 수염 · 노란 코 (입 없음)
      for (const s of [-1, 1]) poly(ctx, W, [[32 + s * 7, 10], [32 + s * 16, 3], [32 + s * 15, 14]]);
      oval(ctx, 32, 21, 17, 13, W);
      if (!back) {
        oval(ctx, 26, 21, 1.6, 2.2, '#1a1a1a');
        oval(ctx, 38, 21, 1.6, 2.2, '#1a1a1a');
        oval(ctx, 32, 24.5, 2, 1.4, '#ffcc00');
        for (const s of [-1, 1]) for (const dy of [-1.5, 1, 3.5]) line(ctx, '#1a1a1a', 0.8, [[32 + s * 13, 22 + dy], [32 + s * 19, 21 + dy * 1.4]]);
      }
      const bow = look.bow || look.accent; // 왼쪽 귀의 리본
      poly(ctx, bow, [[42, 9], [48, 3], [50, 10]]);
      poly(ctx, bow, [[42, 9], [38, 2], [36, 9]]);
      circle(ctx, 42, 8.5, 2.4, bow);
    } else if (m === 'melody') { // 마이멜로디: 분홍 두건 · 긴 토끼 귀 · 귀에 꽃
      for (const s of [-1, 1]) oval(ctx, 32 + s * 8, 4, 4.5, 11, look.suit, s * 0.25);
      oval(ctx, 32, 20, 16, 14, look.suit);
      if (!back) {
        oval(ctx, 32, 23, 12, 9.5, W);
        dotEyes(ctx, 22, 5);
        oval(ctx, 32, 25.5, 1.6, 1.1, '#ffcc00');
        ctx.save(); ctx.globalAlpha = 0.5; circle(ctx, 24, 26, 2, '#ff6b9a'); circle(ctx, 40, 26, 2, '#ff6b9a'); ctx.restore();
      }
      // 꽃은 오른쪽 귀(보는 쪽에서 왼쪽)에 — 원작 그대로
      for (let i = 0; i < 5; i++) circle(ctx, 22 + Math.cos(i * TAU / 5) * 2.4, 3 + Math.sin(i * TAU / 5) * 2.4, 1.6, look.accent);
      circle(ctx, 22, 3, 1.3, '#ffeb3b');
    } else if (m === 'kuromi') { // 쿠로미: 검은 두건 · 뾰족 귀 · 이마의 분홍 해골
      for (const s of [-1, 1]) { // 짧고 바깥으로 휜 두건 귀 (끝이 둥글다)
        ctx.fillStyle = look.suit;
        ctx.beginPath();
        ctx.moveTo(32 + s * 4, 10);
        ctx.quadraticCurveTo(32 + s * 9, 1, 32 + s * 17, 2);
        ctx.quadraticCurveTo(32 + s * 16, 9, 32 + s * 14, 13);
        ctx.closePath();
        ctx.fill();
        circle(ctx, 32 + s * 17, 2.5, 2.4, look.suit);
      }
      oval(ctx, 32, 20, 16, 14, look.suit);
      if (!back) {
        oval(ctx, 32, 24, 11.5, 8.5, W);
        circle(ctx, 32, 11.5, 3.2, look.accent);
        circle(ctx, 30.8, 11.2, 0.7, look.suit);
        circle(ctx, 33.2, 11.2, 0.7, look.suit);
        dotEyes(ctx, 23, 4.5);
        oval(ctx, 32, 26, 1.5, 1, '#ffcc00');
        poly(ctx, W, [[34, 28], [35.5, 28], [34.8, 30]]); // 작은 덧니
        line(ctx, '#1a1a1a', 0.9, [[30, 28], [32, 29], [35.5, 28]]);
      }
    } else if (m === 'cinnamo') { // 시나모롤: 흰 강아지 · 옆으로 늘어진 큰 귀 · 파란 눈
      for (const s of [-1, 1]) oval(ctx, 32 + s * 15.5, 23, 11.5, 4.8, W, s * 0.7); // 아래로 길게 늘어진 귀
      oval(ctx, 32, 21, 15, 13, W);
      if (!back) {
        for (const x of [26, 38]) { oval(ctx, x, 22, 1.9, 2.5, '#2b6cb0'); circle(ctx, x - 0.5, 21, 0.7, W); }
        ctx.save(); ctx.globalAlpha = 0.55; circle(ctx, 23, 26, 2.2, '#ff8fb1'); circle(ctx, 41, 26, 2.2, '#ff8fb1'); ctx.restore();
        line(ctx, '#7a2a2a', 0.9, [[30, 26], [32, 27.3], [34, 26]]);
      }
    } else if (m === 'purin') { // 폼폼푸린: 노란 강아지 · 갈색 베레모 · 늘어진 갈색 귀
      for (const s of [-1, 1]) oval(ctx, 32 + s * 14, 20, 4.5, 8, '#8d5524', s * 0.2);
      oval(ctx, 32, 21, 15, 13, look.suit);
      oval(ctx, 32, 8.5, 9, 3.6, '#6d3b1a');
      circle(ctx, 32, 5, 1.5, '#6d3b1a');
      if (!back) {
        dotEyes(ctx, 21, 5, 1.6, 1.4);
        oval(ctx, 32, 24, 1.8, 1.2, '#5d3a1a');
        line(ctx, '#5d3a1a', 0.9, [[30, 26.5], [32, 27.5], [34, 26.5]]);
      }
    } else if (m === 'pochacco') { // 포차코: 옆으로 넓적한 흰 얼굴 + 머리 위에서 양옆으로 길게 늘어진 까만 귀
      oval(ctx, 32, 21, 16.5, 12.5, W);
      for (const sx of [-1, 1]) {
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.moveTo(32 + sx * 6, 9.5);
        ctx.quadraticCurveTo(32 + sx * 15, 7, 32 + sx * 19, 16);
        ctx.quadraticCurveTo(32 + sx * 21, 27, 32 + sx * 15.5, 29);
        ctx.quadraticCurveTo(32 + sx * 11.5, 26, 32 + sx * 11.5, 18);
        ctx.quadraticCurveTo(32 + sx * 10, 12, 32 + sx * 6, 9.5);
        ctx.fill();
      }
      if (!back) {
        oval(ctx, 26.5, 20.5, 1.5, 2, '#1a1a1a');
        oval(ctx, 37.5, 20.5, 1.5, 2, '#1a1a1a');
        oval(ctx, 32, 23.8, 2, 1.4, '#1a1a1a');
        line(ctx, '#1a1a1a', 0.8, [[30, 26.2], [32, 27.3], [34, 26.2]]);
      }
    } else if (m === 'keroppi') { // 케로피: 초록 개구리 · 머리 위 큰 눈 · 활짝 웃는 입
      oval(ctx, 32, 22, 17, 12, look.suit);
      for (const s of [-1, 1]) {
        circle(ctx, 32 + s * 7, 11, 6.2, look.suit);
        if (!back) { circle(ctx, 32 + s * 7, 11, 4.6, W); circle(ctx, 32 + s * 7, 11.5, 2.3, '#1a1a1a'); circle(ctx, 32 + s * 7 - 0.7, 10.6, 0.8, W); }
      }
      if (!back) {
        ctx.fillStyle = '#e91e63';
        ctx.beginPath();
        ctx.arc(32, 23, 7, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.save(); ctx.globalAlpha = 0.5; circle(ctx, 20, 24, 2, '#ff6b9a'); circle(ctx, 44, 24, 2, '#ff6b9a'); ctx.restore();
      }
    } else if (m === 'chopper') { // 쵸파: 갈색 털 · 분홍 모자(흰 X) · 파란 코 · 뿔
      for (const s of [-1, 1]) line(ctx, '#8d5524', 2, [[32 + s * 9, 6], [32 + s * 15, -3], [32 + s * 18, -2]]);
      for (const s of [-1, 1]) line(ctx, '#8d5524', 1.6, [[32 + s * 13, 1], [32 + s * 12, -4]]);
      oval(ctx, 32, 21, 15, 13, '#a0522d');
      if (!back) {
        oval(ctx, 32, 23, 11, 9, '#f3c99a');
        dotEyes(ctx, 21, 5);
        oval(ctx, 32, 25.5, 2.2, 1.6, '#2b6cb0');
        line(ctx, '#7a2a2a', 0.9, [[30, 28], [32, 29.2], [34, 28]]);
      }
      oval(ctx, 32, 9, 15, 3.5, '#ff7aa2');
      ctx.fillStyle = '#ff7aa2';
      roundRect(ctx, 21, -3, 22, 12, 6);
      line(ctx, '#ffffff', 1.6, [[29, 0], [35, 6]]);
      line(ctx, '#ffffff', 1.6, [[35, 0], [29, 6]]);
    } else if (m === 'hangyodon') { // 한교동: 초록 물고기 · 머리 옆 지느러미 · 두툼한 빨간 입술
      for (const sx of [-1, 1]) poly(ctx, '#3fa3a0', [[32 + sx * 13, 14], [32 + sx * 20, 8], [32 + sx * 19, 20], [32 + sx * 14, 22]]);
      poly(ctx, '#3fa3a0', [[26, 8], [30, 1], [32, 7], [35, 1], [38, 8]]);
      oval(ctx, 32, 20, 15, 13.5, look.suit);
      if (!back) {
        for (const x of [26, 38]) { circle(ctx, x, 17, 4, '#ffffff'); circle(ctx, x + 0.5, 17.5, 2, '#1a1a1a'); }
        oval(ctx, 32, 26, 6, 3, '#e53950');
        line(ctx, '#8a1a2a', 0.7, [[26.5, 26], [37.5, 26]]);
        for (const [x, y] of [[22, 22], [42, 22], [29, 11]]) circle(ctx, x, y, 0.9, '#2e7d6e');
      }
    } else if (m === 'badtz') { // 배드바츠마루: 검은 펭귄 · 삐죽 머리 · 노란 부리
      poly(ctx, look.suit, [[22, 10], [24, 1], [28, 7], [31, -1], [34, 6], [38, 0], [40, 8], [43, 3], [43, 12]]);
      oval(ctx, 32, 21, 15, 13, look.suit);
      if (!back) {
        oval(ctx, 32, 23, 11, 9, W);
        for (const x of [27.5, 36.5]) { // 축 처진 눈꺼풀: 반쯤 감은 시큰둥한 눈 (원작 특징)
          oval(ctx, x, 21.5, 2, 2, '#1a1a1a');
          ctx.fillStyle = W;
          ctx.fillRect(x - 2.4, 18.8, 4.8, 2.4);
          line(ctx, '#1a1a1a', 1.1, [[x - 2.6, 21], [x + 2.6, 21]]);
        }
        oval(ctx, 32, 26, 4.2, 1.8, '#ffc107'); // 노란 부리 (뾰로통)
        line(ctx, '#c79100', 0.6, [[28.5, 26], [35.5, 26]]);
      }
    }
  }

  /**
   * 치이카와 친구들 (치이카와 · 하치와레 · 우사기) — 원작 특징:
   * 머리와 몸이 하나로 이어진 찹쌀떡 같은 동그란 몸, 아주 짧은 손발, 큰 반짝이가 있는 까만 눈,
   * 빗금 들어간 분홍 볼, 작은 입, 조금 굵은 검은 손그림 선(drawHero 외곽선).
   */
  function drawChiikawa(ctx, look, back, P) {
    const m = look.mascot;
    const c = look.suit;
    const run = P.legs[0] - P.legs[1]; // 걷기 · 뛰기 때 발 엇갈림
    const hop = P.name === 'jump' || P.name === 'win' ? -3 : 0; // 뛰어오를 때 몸 전체가 위로
    const BODY = [32, 43, 19.5, 16.5]; // 몸 전체 = 납작하고 동그란 떡 하나 (가로가 더 넓다)
    ctx.save();
    ctx.translate(0, hop);
    // 귀 (몸보다 먼저)
    if (m === 'chiikawa') for (const s of [-1, 1]) circle(ctx, 32 + s * 11.5, 29, 4.4, c);
    if (m === 'hachiware') for (const s of [-1, 1]) {
      poly(ctx, look.accent, [[32 + s * 6.5, 29], [32 + s * 14, 18.5], [32 + s * 18, 32]]);
      poly(ctx, '#f7b7c3', [[32 + s * 10, 28], [32 + s * 14, 22], [32 + s * 16, 30]]);
    }
    if (m === 'usagi') for (const s of [-1, 1]) {
      oval(ctx, 32 + s * 6.5, 18, 4, 12.5, c, s * 0.12);
      oval(ctx, 32 + s * 6.5, 19.5, 1.8, 8.5, '#f7b7c3', s * 0.12);
    }
    if (m === 'hachiware') oval(ctx, 51, 54, 3, 5, look.accent, 0.7); // 꼬리
    // 발: 몸 아래 짧은 둥근 발
    oval(ctx, 25 + run * 3, 59.5, 5.2, 3.4, c);
    oval(ctx, 39 - run * 3, 59.5, 5.2, 3.4, c);
    // 아주 짧은 팔 (몸 옆, 자세 각도를 따라 살짝)
    for (const [sx, a] of [[14.5, P.l], [49.5, P.r]]) {
      const ang = Math.max(-2.4, Math.min(2.4, a));
      oval(ctx, sx + Math.cos(ang) * 3, 49 + Math.sin(ang) * 3, 3.6, 2.8, c, ang);
    }
    oval(ctx, BODY[0], BODY[1], BODY[2], BODY[3], c);
    if (m === 'hachiware') { // 머리 위 파란 무늬 — 가운데가 팔(八)자로 갈라짐
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(BODY[0], BODY[1], BODY[2], BODY[3], 0, 0, TAU);
      ctx.clip();
      poly(ctx, look.accent, [[10, 24], [54, 24], [54, 40], [44, 37], [32, 31], [20, 37], [10, 40]]);
      ctx.restore();
    }
    if (!back) {
      // 눈: 까만 타원 + 큰 반짝이
      for (const x of [25.5, 38.5]) {
        oval(ctx, x, 41, 2.4, 2.9, '#141414');
        circle(ctx, x - 0.7, 40, 1.1, '#ffffff');
        circle(ctx, x + 0.8, 42.2, 0.45, '#ffffff');
      }
      // 분홍 볼 + 빗금
      for (const x of [19.5, 44.5]) {
        oval(ctx, x, 45.5, 3.7, 2.3, '#ffb3c1');
        for (const dx of [-1.4, 0, 1.4]) line(ctx, '#ea6a8a', 0.55, [[x + dx + 0.7, 44.5], [x + dx - 0.7, 46.5]]);
      }
      // 입
      if (m === 'usagi' || P.face === 'happy') {
        ctx.fillStyle = '#7a2a2a';
        ctx.beginPath();
        ctx.arc(32, 45.2, m === 'usagi' ? 2.9 : 2.1, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#ff8a9a';
        ctx.beginPath();
        ctx.arc(32, 46.8, m === 'usagi' ? 1.4 : 1, 0, Math.PI);
        ctx.fill();
      } else {
        line(ctx, '#2a1a1a', 0.75, [[30.4, 45.2], [31.2, 46.1], [32, 45.4], [32.8, 46.1], [33.6, 45.2]]);
      }
      if (P.face === 'hurt') { // 울먹이는 눈물 (치이카와 특유)
        oval(ctx, 23, 44.5, 1, 1.6, '#8fd3ff');
        oval(ctx, 41, 44.5, 1, 1.6, '#8fd3ff');
      }
    }
    ctx.restore();
  }

  /**
   * 산리오 캐릭터 한 명 — 원작 몸 구조: 몸보다 큰 머리 + 바로 아래 붙은 통통한 몸 + 동글동글 짧은 손발.
   * 단색, 검은 외곽선(drawHero). 옷은 원작 그대로 (헬로키티 파란 멜빵바지 · 포차코 빨간 티셔츠 …).
   * 자세(P)는 짧은 팔 · 발의 각도만 살짝 바꾼다 (히어로처럼 팔을 길게 뻗지 않는다).
   * look: body3(몸 색) · shirt(윗옷) · pants(바지 · 치마) · hands · boot(발) · plump(더 통통하게, 폼폼푸린)
   */
  function drawMascot(ctx, look, back, P) {
    const body = look.body3 || look.suit;
    const plump = look.plump ? 1.18 : 1;
    const run = P.legs[0] - P.legs[1];
    const hop = P.name === 'jump' || P.name === 'win' ? -2.5 : 0;
    const BX = 32, BY = 53, BRX = 12.5 * plump, BRY = 10.5 * plump;
    ctx.save();
    ctx.translate(0, hop);
    if (look.mascot === 'kuromi' && !back) line(ctx, '#1a1a1a', 1.6, [[42, 58], [50, 61], [49, 66]]); // 악마 꼬리
    if (look.mascot === 'cinnamo') { // 말린 꼬리
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(46, 56, 3.2, Math.PI, TAU * 0.92);
      ctx.stroke();
    }
    // 발: 몸 아래 짧고 둥근 발
    oval(ctx, 26 + run * 3, 63.5, 5.2, 3.3, look.boot || body);
    oval(ctx, 38 - run * 3, 63.5, 5.2, 3.3, look.boot || body);
    // 통통한 몸
    oval(ctx, BX, BY, BRX, BRY, body);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(BX, BY, BRX, BRY, 0, 0, TAU);
    ctx.clip();
    if (look.shirt) { ctx.fillStyle = look.shirt; ctx.fillRect(10, 40, 44, 12); }
    if (look.pants) {
      ctx.fillStyle = look.pants;
      ctx.fillRect(10, 52, 44, 14);
      if (look.outfit) { ctx.fillRect(25, 44, 3, 9); ctx.fillRect(36, 44, 3, 9); } // 멜빵
    }
    ctx.restore();
    if (look.outfit) { circle(ctx, 26.5, 52.5, 1, '#ffd54f'); circle(ctx, 37.5, 52.5, 1, '#ffd54f'); }
    if (look.mascot === 'melody' || look.mascot === 'kuromi') oval(ctx, BX, BY + 2, 6, 6, look.mascot === 'melody' ? '#ffffff' : '#3a3a3a'); // 앞치마
    // 짧은 팔: 몸 옆에 붙은 둥근 손 (자세 각도를 따라 살짝)
    for (const [sx, a, side] of [[BX - BRX + 1, P.l, -1], [BX + BRX - 1, P.r, 1]]) {
      const ang = Math.max(-2.4, Math.min(2.4, a));
      oval(ctx, sx + Math.cos(ang) * 3 + side, 49 + Math.sin(ang) * 3, 3.8, 3, look.arms || look.shirt || body, ang);
      circle(ctx, sx + Math.cos(ang) * 5.5 + side, 49 + Math.sin(ang) * 5.5, 2.6, look.hands || body);
    }
    // 머리: 몸보다 훨씬 크게, 몸 바로 위에 (머리 그림 좌표 (32, 21) → (32, 29), 1.32배)
    ctx.save();
    ctx.translate(32, 29);
    ctx.scale(1.32, 1.32);
    ctx.translate(-32, -21);
    mascotHead(ctx, look, back);
    ctx.restore();
    ctx.restore();
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

  /** 치이카와 친구들 (drawChiikawa) */
  const CHIIKAWA = new Set(['chiikawa', 'hachiware', 'usagi']);

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
    const chii = CHIIKAWA.has(look.mascot);
    NO_GLOSS = !!(look.op || look.mascot || look.orig);
    const art = document.createElement('canvas');
    art.width = w;
    art.height = h;
    const a = art.getContext('2d');
    a.save();
    a.scale(w / 64, h / 72);
    const P = resolvePose(opts.pose || 'idle');
    if (look.anime || look.skull || look.mascot === 'chopper' || look.orig) { // 원피스: 머리 · 모자가 커서 화면에 다 들어가도록 전체를 발 밑 기준 90% 로
      a.translate(3.2, 7.2);
      a.scale(0.9, 0.9);
    }
    if (P.lean) { // 발 밑을 중심으로 몸을 기울인다
      a.translate(LEAN_PIVOT[0], LEAN_PIVOT[1]);
      a.rotate(P.lean);
      a.translate(-LEAN_PIVOT[0], -LEAN_PIVOT[1]);
    }
    if (look.orig) drawOriginal(a, look, !!opts.back, P); // 오리지널 (이 게임만의 새 캐릭터)
    else if (CHIIKAWA.has(look.mascot)) drawChiikawa(a, look, !!opts.back, P); // 치이카와 친구들
    else if (look.mascot) drawMascot(a, look, !!opts.back, P); // 산리오 캐릭터
    else if (look.head) drawFilm(a, look, !!opts.back, P); // 영화 원조 히어로 (데이터로 그리기)
    else (BODIES[look.style] || drawSpider)(a, look, !!opts.back, P);
    faceFx(a, P);
    a.restore();

    // 외곽선용 실루엣 (그림 모양 그대로 어두운 색으로 채움)
    const sil = document.createElement('canvas');
    sil.width = w;
    sil.height = h;
    const s = sil.getContext('2d');
    s.drawImage(art, 0, 0);
    s.globalCompositeOperation = 'source-in';
    s.fillStyle = look.mascot ? '#1a1a1a' : 'rgba(12, 10, 28, 0.92)'; // 산리오 · 치이카와: 원작처럼 검은 선
    s.fillRect(0, 0, w, h);

    const t = Math.max(1, (w / 64) * (chii ? 0.8 : look.mascot ? 0.7 : 0.9)); // 외곽선 두께 (산리오는 원작처럼 얇게, 치이카와는 손그림 선)
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    for (const [dx, dy] of [[t, 0], [-t, 0], [0, t], [0, -t], [t, t], [-t, -t], [t, -t], [-t, t]]) ctx.drawImage(sil, dx, dy);
    ctx.drawImage(art, 0, 0);
    ctx.restore();
  };
})(window.ARAH);

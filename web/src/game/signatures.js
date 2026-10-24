/**
 * @file 캐릭터별 필살기 연출 · 작품별 액션 느낌 (애니메이션처럼 다양한 움직임).
 *       놀이 규칙은 그대로 두고, 맞는 순간(attackHit)에 캐릭터 고유의 연출을 얹는다.
 *         - 작품(franchise)별: 효과 글자 · 대기 동작 (마블·DC = 미국 만화 글자, 원피스 = 굵은 만화 효과, 산리오 · 치이카와 = 하트 · 반짝이)
 *         - 캐릭터별(SIGNATURES): 루피 고무 팔 · 조로 삼도류 베기 · 나미 번개 · 토르 번개 · 헐크 내려찍기 · 슈퍼맨 눈빔 …
 *       새 캐릭터는 SIGNATURES 에 한 줄(word · hit)만 더하면 된다. 없으면 능력 종류(팀) 기본 연출을 쓴다.
 * @layer game
 * @depends Phaser 3, A.util, A.findFamily
 * @see game/round-scene.js (impactFx · heroShoot · startHeroBob), doc/planning/game-design.md (9.3 액션 연출)
 */
(function (A) {
  'use strict';

  if (typeof Phaser === 'undefined') return;

  const DEPTH_FX = 41; // 팝업(40) 바로 위, HUD(50) 아래
  const hex = (s) => Phaser.Display.Color.HexStringToColor(s).color;

  // ---------- 그리기 도우미 (모두 잠깐 보였다 사라지는 그래픽) ----------

  /** 잠깐 그렸다가 사라지는 그래픽 하나. draw(g, t) 를 진행도 t(0→1) 마다 다시 그린다 */
  function flash(scene, ms, draw) {
    const g = scene.add.graphics().setDepth(DEPTH_FX);
    const o = { t: 0 };
    draw(g, 0);
    scene.tweens.add({
      targets: o, t: 1, duration: ms,
      onUpdate: () => { g.clear(); draw(g, o.t); },
      onComplete: () => g.destroy(),
    });
    return g;
  }

  /** 두 점 사이 지그재그 (번개) */
  function bolt(g, x1, y1, x2, y2, jitter, steps) {
    g.beginPath();
    g.moveTo(x1, y1);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      g.lineTo(x1 + (x2 - x1) * t + A.util.rand(-jitter, jitter), y1 + (y2 - y1) * t + A.util.rand(-jitter, jitter));
    }
    g.lineTo(x2, y2);
    g.strokePath();
  }

  /** 하트 모양 */
  function heart(g, x, y, r, color, alpha = 1) {
    g.fillStyle(color, alpha);
    g.fillCircle(x - r * 0.5, y - r * 0.2, r * 0.55);
    g.fillCircle(x + r * 0.5, y - r * 0.2, r * 0.55);
    g.fillTriangle(x - r * 1.02, y + r * 0.05, x + r * 1.02, y + r * 0.05, x, y + r * 1.05);
  }

  /** 오각 별 */
  function star(g, x, y, r, color, alpha = 1) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      pts.push(new Phaser.Geom.Point(x + Math.cos(a) * rr, y + Math.sin(a) * rr));
    }
    g.fillStyle(color, alpha);
    g.fillPoints(pts, true);
  }

  /** 맞은 자리에서 사방으로 튀는 작은 모양들 (하트 · 별 · 불꽃 · 꽃잎) */
  function burst(scene, x, y, shape, colors, n = 10, dist = 70) {
    const parts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + A.util.rand(-0.3, 0.3);
      parts.push({ a, d: dist * A.util.rand(0.6, 1.1), c: colors[i % colors.length], r: A.util.rand(6, 11) });
    }
    flash(scene, 520, (g, t) => {
      for (const p of parts) {
        const px = x + Math.cos(p.a) * p.d * t;
        const py = y + Math.sin(p.a) * p.d * t - 30 * t * (1 - t);
        const al = 1 - t;
        if (shape === 'heart') heart(g, px, py, p.r, p.c, al);
        else if (shape === 'star') star(g, px, py, p.r, p.c, al);
        else { g.fillStyle(p.c, al); g.fillCircle(px, py, p.r * (1 - t * 0.5)); }
      }
    });
  }

  /** 퍼지는 고리 여러 겹 (충격파 · 물결) */
  function rings(scene, x, y, color, count = 3, maxR = 90, width = 6) {
    flash(scene, 480, (g, t) => {
      for (let i = 0; i < count; i++) {
        const tt = Math.max(0, t - i * 0.12);
        if (tt <= 0) continue;
        g.lineStyle(width * (1 - tt), color, 1 - tt);
        g.strokeCircle(x, y, maxR * tt);
      }
    });
  }

  /** 베기 궤적 (호) — 조로 · 브룩 · 발톱 */
  function slashes(scene, x, y, list, color, width = 8) {
    flash(scene, 360, (g, t) => {
      for (const [ang, len] of list) {
        const cut = Math.min(1, t * 2.2);
        const fade = t < 0.5 ? 1 : 1 - (t - 0.5) * 2;
        g.lineStyle(width * fade, color, fade);
        g.beginPath();
        const dx = Math.cos(ang) * len;
        const dy = Math.sin(ang) * len;
        g.moveTo(x - dx, y - dy);
        g.lineTo(x - dx + 2 * dx * cut, y - dy + 2 * dy * cut);
        g.strokePath();
        g.lineStyle(width * 0.35 * fade, 0xffffff, fade);
        g.beginPath();
        g.moveTo(x - dx, y - dy);
        g.lineTo(x - dx + 2 * dx * cut, y - dy + 2 * dy * cut);
        g.strokePath();
      }
    });
  }

  /** 손에서 목표까지 굵은 빔 (아이언맨 · 프랭키 · 슈퍼맨 눈빔) */
  function beam(scene, from, x, y, color, width = 14, ms = 260) {
    flash(scene, ms, (g, t) => {
      const w = width * (1 - t);
      g.lineStyle(w + 8, color, 0.35 * (1 - t));
      g.lineBetween(from.x, from.y, x, y);
      g.lineStyle(w, color, 1 - t);
      g.lineBetween(from.x, from.y, x, y);
      g.lineStyle(w * 0.35, 0xffffff, 1 - t);
      g.lineBetween(from.x, from.y, x, y);
    });
  }

  /** 하늘에서 떨어지는 번개 (나미 · 토르 · 스톰) */
  function skyBolt(scene, x, y, color) {
    flash(scene, 320, (g, t) => {
      const al = t < 0.3 ? 1 : 1 - (t - 0.3) / 0.7;
      g.lineStyle(9, color, al * 0.5);
      bolt(g, x + A.util.rand(-40, 40), 100, x, y, 22, 7);
      g.lineStyle(4, 0xffffff, al);
      bolt(g, x + A.util.rand(-30, 30), 100, x, y, 18, 7);
    });
    scene.cameras.main.flash(90, 255, 255, 220);
  }

  /** 늘어나는 고무 팔 (루피): 손에서 목표까지 쭉 뻗었다가 돌아온다 */
  function rubberArm(scene, from, x, y, skin) {
    flash(scene, 380, (g, t) => {
      const reach = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65; // 뻗기 → 돌아오기
      const hx = from.x + (x - from.x) * reach;
      const hy = from.y + (y - from.y) * reach;
      g.lineStyle(13, 0x1a1a1a, 1);
      g.lineBetween(from.x, from.y, hx, hy);
      g.lineStyle(9, skin, 1);
      g.lineBetween(from.x, from.y, hx, hy);
      g.fillStyle(0x1a1a1a, 1);
      g.fillCircle(hx, hy, 15);
      g.fillStyle(skin, 1);
      g.fillCircle(hx, hy, 12); // 주먹
      // 속도선 (팔 방향)
      g.lineStyle(2, 0xffffff, 0.8 * (1 - t));
      for (let i = -2; i <= 2; i++) g.lineBetween(from.x, from.y + i * 7, hx - (hx - from.x) * 0.3, hy + i * 7);
    });
  }

  /** 바닥 금 + 큰 흔들림 (헐크 · 씽 · 거인) */
  function groundCrack(scene, x, y) {
    const ground = Math.min(y + 60, 600);
    flash(scene, 600, (g, t) => {
      const al = 1 - t;
      g.lineStyle(5, 0x3e2a1a, al);
      for (const [dx, dy] of [[-70, 10], [-40, 24], [0, 30], [45, 22], [75, 8]]) {
        g.beginPath();
        g.moveTo(x, ground);
        g.lineTo(x + dx * 0.5, ground + dy * 0.4);
        g.lineTo(x + dx, ground + dy);
        g.strokePath();
      }
    });
    scene.cameras.main.shake(260, 0.016);
  }

  /** 박쥐 실루엣 (배트맨) */
  function batShape(g, x, y, s, alpha) {
    g.fillStyle(0x111111, alpha);
    g.fillEllipse(x, y, 60 * s, 22 * s);
    g.fillStyle(0xffd54f, alpha);
    g.fillEllipse(x, y, 52 * s, 16 * s);
    g.fillStyle(0x111111, alpha);
    g.fillTriangle(x - 24 * s, y - 4 * s, x, y + 8 * s, x + 24 * s, y - 4 * s);
    g.fillTriangle(x - 5 * s, y - 9 * s, x - 2 * s, y - 2 * s, x - 8 * s, y - 2 * s);
    g.fillTriangle(x + 5 * s, y - 9 * s, x + 2 * s, y - 2 * s, x + 8 * s, y - 2 * s);
  }

  // ---------- 작품(franchise)별 느낌 ----------

  const CHIIKAWA = new Set(['chiikawa', 'hachiware', 'usagi']);

  /**
   * 히어로가 속한 작품. 그림체 · 효과 글자 · 대기 동작이 작품마다 다르다.
   * @param {Hero} hero
   * @returns {'original'|'comic'|'onepiece'|'sanrio'|'chiikawa'}
   */
  A.franchiseOf = function (hero) {
    const L = hero.look || {};
    if (L.original) return 'original';
    if (L.op || L.anime || L.skull || L.mascot === 'chopper') return 'onepiece';
    if (CHIIKAWA.has(L.mascot)) return 'chiikawa';
    if (L.mascot) return 'sanrio';
    return 'comic';
  };

  /**
   * 작품별 효과 글자 모양 · 단어 (맞는 순간 화면에 크게 튀어나오는 글자).
   * comic 은 능력 종류(팀)마다 단어가 다르다.
   */
  const FRANCHISE = {
    original: {
      font: '"Black Han Sans", "Jua", sans-serif', fill: '#7cf8ff', stroke: '#2b1d6b', strokeW: 10, size: 46, angle: -8,
      words: { default: ['슈퍼!', '짜잔!', '파워업!'] },
      burst: 'stars',
    },
    comic: {
      font: '"Black Han Sans", "Jua", sans-serif', fill: '#ffeb3b', stroke: '#1a1a1a', strokeW: 10, size: 46, angle: -12,
      words: {
        spider: ['THWIP!', '슉!'], armor: ['ZAP!', '지잉!'], shield: ['CLANG!', '쾅!'], thunder: ['KRAKOOM!', '콰직!'],
        giant: ['SMASH!', '쿵!'], archer: ['THWACK!', '퍽!'], mystic: ['MAGIC!', '번쩍!'], panther: ['SNIKT!', '휙!'],
      },
      burst: 'spikes',
    },
    onepiece: {
      font: '"Black Han Sans", "Jua", sans-serif', fill: '#ffffff', stroke: '#111111', strokeW: 12, size: 52, angle: 8,
      words: { default: ['쾅!!', '두둥!!', '콰앙!!'] },
      burst: 'lines',
    },
    sanrio: {
      font: '"Jua", sans-serif', fill: '#ff6fa8', stroke: '#ffffff', strokeW: 8, size: 40, angle: -6,
      words: { default: ['뿅!', '반짝!', '짠!'] },
      burst: 'hearts',
    },
    chiikawa: {
      font: '"Jua", sans-serif', fill: '#3a3a3a', stroke: '#ffffff', strokeW: 8, size: 38, angle: -8,
      words: { default: ['얍!', '했다!', '에잇!'] },
      burst: 'stars',
    },
  };

  /** 작품별 효과 정보 */
  A.franchiseFx = (hero) => FRANCHISE[A.franchiseOf(hero)];

  // ---------- 캐릭터별 필살기 (맞는 순간) ----------
  // word: 효과 글자 (없으면 작품 · 팀 기본), hit(scene, x, y, from): 고유 연출. from = 히어로 손 위치

  const SIGNATURES = {
    // 원피스
    luffy: { word: '고무고무 총!!', hit: (s, x, y, from, L) => rubberArm(s, from, x, y, hex(L.skin || '#f3c99a')) },
    zoro: { word: '삼도류!!', hit: (s, x, y) => slashes(s, x, y, [[-0.6, 70], [0.1, 80], [0.8, 70]], 0x7ddc7d, 9) },
    sanji: { word: '불꽃 킥!!', hit: (s, x, y) => { burst(s, x, y, 'dot', [0xff7a1a, 0xffc94a, 0xff3b1a], 14, 80); rings(s, x, y, 0xff8a1a, 2, 70, 7); } },
    nami: { word: '썬더 볼트!!', hit: (s, x, y) => skyBolt(s, x, y, 0xffe066) },
    usopp: { word: '필살 새총!!', hit: (s, x, y) => burst(s, x, y, 'star', [0xffd54f, 0xff8a65], 9, 60) },
    chopper: { word: '럼블!!', hit: (s, x, y) => burst(s, x, y, 'heart', [0xff7aa2, 0xffffff], 10, 70) },
    robin: { word: '꽃 피어라!!', hit: (s, x, y) => burst(s, x, y, 'dot', [0xb388ff, 0xe1bee7, 0x7e57c2], 16, 75) },
    franky: { word: '래디컬 빔!!', hit: (s, x, y, from) => beam(s, from, x, y, 0x4fc3f7, 18) },
    brook: { word: '요호호!!', hit: (s, x, y) => { slashes(s, x, y, [[0.3, 85]], 0x9be7ff, 7); burst(s, x, y, 'star', [0xe3f2fd], 8, 55); } },
    jinbe: { word: '어인 가라테!!', hit: (s, x, y) => rings(s, x, y, 0x4fa3e0, 4, 110, 8) },
    ace: { word: '화권!!', hit: (s, x, y, from) => { beam(s, from, x, y, 0xff6d00, 22, 300); burst(s, x, y, 'dot', [0xff6d00, 0xffc107, 0xff3d00], 16, 90); } },
    shanks: { word: '패기!!', hit: (s, x, y) => { rings(s, x, y, 0x8b0000, 3, 140, 10); s.cameras.main.flash(120, 255, 60, 60); } },
    law: { word: 'ROOM!!', hit: (s, x, y) => { flash(s, 520, (g, t) => { g.fillStyle(0x4fc3f7, 0.18 * (1 - t)); g.fillCircle(x, y, 120 * Math.min(1, t * 3)); g.lineStyle(3, 0x4fc3f7, 1 - t); g.strokeCircle(x, y, 120 * Math.min(1, t * 3)); }); slashes(s, x, y, [[0, 90]], 0xffffff, 5); } },
    // 마블 · DC (대표 캐릭터 고유 연출)
    'iron-man': { word: 'ZAP!', hit: (s, x, y, from) => beam(s, from, x, y, 0x9be7ff, 16) },
    'war-machine': { word: 'BRRRT!', hit: (s, x, y) => burst(s, x, y, 'dot', [0xffc107, 0xff6d00], 12, 60) },
    thor: { word: 'KRAKOOM!', hit: (s, x, y) => skyBolt(s, x, y, 0x9be7ff) },
    storm: { word: 'KRAKOOM!', hit: (s, x, y) => skyBolt(s, x, y, 0xe3f2fd) },
    hulk: { word: 'SMASH!!', hit: (s, x, y) => groundCrack(s, x, y) },
    'the-thing': { word: 'CLOBBER!', hit: (s, x, y) => groundCrack(s, x, y) },
    'captain-america': { word: 'CLANG!', hit: (s, x, y) => { rings(s, x, y, 0x1e40af, 2, 70, 7); burst(s, x, y, 'star', [0xffffff, 0xc1121f], 8, 60); } },
    superman: { word: 'FWOOSH!', hit: (s, x, y, from) => { beam(s, { x: from.x - 6, y: from.y - 34 }, x, y, 0xff1744, 7, 300); beam(s, { x: from.x + 6, y: from.y - 34 }, x, y, 0xff1744, 7, 300); } },
    batman: { word: 'POW!', hit: (s, x, y) => flash(s, 420, (g, t) => batShape(g, x, y - 20 * t, 1.2 + t, 1 - t)) },
    flash: { word: 'ZOOM!', hit: (s, x, y, from) => flash(s, 260, (g, t) => { g.lineStyle(4, 0xffd600, 1 - t); for (let i = -3; i <= 3; i++) g.lineBetween(from.x, from.y + i * 8, x, y + i * 4); }) },
    'wonder-woman': { word: 'POW!', hit: (s, x, y) => rings(s, x, y, 0xf2c14e, 2, 60, 5) },
    'doctor-strange': { word: 'MAGIC!', hit: (s, x, y) => flash(s, 520, (g, t) => { g.lineStyle(4, 0xff9f1c, 1 - t); g.strokeCircle(x, y, 50); g.strokeCircle(x, y, 34); for (let i = 0; i < 8; i++) { const a = t * 3 + (i * Math.PI) / 4; g.lineBetween(x + Math.cos(a) * 34, y + Math.sin(a) * 34, x + Math.cos(a) * 50, y + Math.sin(a) * 50); } }) },
    'black-panther': { word: 'SLASH!', hit: (s, x, y) => slashes(s, x, y, [[1.0, 50], [1.1, 55], [1.2, 50]], 0xb388ff, 6) },
    wolverine: { word: 'SNIKT!', hit: (s, x, y) => slashes(s, x, y, [[0.9, 60], [1.0, 64], [1.1, 60]], 0xe0e0e0, 6) },
    groot: { word: '그루트!', hit: (s, x, y) => burst(s, x, y, 'dot', [0x7cb342, 0x558b2f, 0x8d6e63], 12, 70) },
    venom: { word: 'WE ARE!', hit: (s, x, y) => burst(s, x, y, 'dot', [0x111111, 0x333333], 14, 80) },
    'spider-man': { word: 'THWIP!', hit: (s, x, y) => flash(s, 420, (g, t) => { g.lineStyle(3, 0xffffff, 1 - t); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; g.lineBetween(x, y, x + Math.cos(a) * 45, y + Math.sin(a) * 45); } for (const r of [15, 30, 45]) g.strokeCircle(x, y, r); }) },
    // 오리지널
    'dino-dodo': { word: '공룡 쿵쿵!', hit: (s, x, y) => groundCrack(s, x, y) },
    'cosmo-kong': { word: '우주 슝!', hit: (s, x, y) => burst(s, x, y, 'star', [0xffffff, 0xff8a3d, 0x8fb8de], 12, 80) },
    'chef-pangpang': { word: '프라이팬 팡!', hit: (s, x, y) => { rings(s, x, y, 0xffe066, 2, 60, 6); burst(s, x, y, 'dot', [0xffe066, 0xffffff], 8, 50); } },
    beepo: { word: '삐뽀 빔!', hit: (s, x, y, from) => { beam(s, from, x, y, 0x5ad1c8, 12); burst(s, x, y, 'heart', [0xff5c8a], 6, 45); } },
    'strawberry-ppyong': { word: '딸기 뿅!', hit: (s, x, y) => burst(s, x, y, 'heart', [0xe8344a, 0xff9ec4], 10, 65) },
    'suri-suri': { word: '수리수리!', hit: (s, x, y) => { burst(s, x, y, 'star', [0xffd54f, 0xb9a6ff], 12, 80); rings(s, x, y, 0xb9a6ff, 2, 55, 5); } },
    mungge: { word: '몽글 번쩍!', hit: (s, x, y) => skyBolt(s, x, y, 0xffd23f) },
    leo: { word: '어흥!', hit: (s, x, y) => slashes(s, x, y, [[0.9, 46], [1.05, 50], [1.2, 46]], 0xd9822b, 6) },
    // 산리오 · 치이카와
    'hello-kitty': { word: '안녕!', hit: (s, x, y) => burst(s, x, y, 'heart', [0xe53935, 0xff8a80], 10, 70) },
    'my-melody': { word: '뿅!', hit: (s, x, y) => burst(s, x, y, 'heart', [0xff9ec7, 0xffffff], 10, 70) },
    kuromi: { word: '흥!', hit: (s, x, y) => burst(s, x, y, 'heart', [0x9c27b0, 0x222222], 10, 70) },
    cinnamoroll: { word: '휘잉~', hit: (s, x, y) => burst(s, x, y, 'star', [0x8fd3ff, 0xffffff], 10, 70) },
    usagi: { word: '야하!!', hit: (s, x, y) => burst(s, x, y, 'star', [0xf6e7b0, 0xffb3c1], 10, 80) },
    chiikawa: { word: '해냈다!', hit: (s, x, y) => burst(s, x, y, 'star', [0xffb3c1, 0xffffff], 9, 60) },
    hachiware: { word: '얏호!', hit: (s, x, y) => burst(s, x, y, 'star', [0x8fa9c4, 0xffffff], 9, 60) },
  };

  /** 팀(능력 종류) 기본 연출 — SIGNATURES 에 없는 캐릭터 */
  const FAMILY_HIT = {
    spider: (s, x, y) => burst(s, x, y, 'dot', [0xffffff], 8, 45),
    armor: (s, x, y, from) => beam(s, from, x, y, 0x9be7ff, 10, 220),
    shield: (s, x, y) => rings(s, x, y, 0x4cc9f0, 2, 60, 6),
    thunder: (s, x, y) => skyBolt(s, x, y, 0xffe066),
    giant: (s, x, y) => groundCrack(s, x, y),
    archer: (s, x, y) => burst(s, x, y, 'dot', [0xc77dff, 0xffffff], 8, 50),
    mystic: (s, x, y) => rings(s, x, y, 0xff9f1c, 3, 70, 5),
    panther: (s, x, y) => slashes(s, x, y, [[0.9, 50], [1.05, 54], [1.2, 50]], 0xb388ff, 5),
  };

  /** 작품별 기본 연출 — 산리오 · 치이카와는 팀 연출 대신 하트 · 별 */
  const FRANCHISE_HIT = {
    sanrio: (s, x, y, from, L) => burst(s, x, y, 'heart', [hex(L.accent || '#ff6fa8'), 0xffffff], 10, 70),
    chiikawa: (s, x, y) => burst(s, x, y, 'star', [0xffb3c1, 0xffffff], 9, 60),
  };

  /**
   * 맞는 순간의 캐릭터 연출 (필살기 · 효과 글자 단어).
   * @param {Hero} hero
   * @returns {{word: string, hit: (scene: Phaser.Scene, x: number, y: number, from: {x: number, y: number}, look: Object) => void}}
   */
  A.signatureOf = function (hero) {
    const sig = SIGNATURES[hero.id];
    const fr = A.franchiseOf(hero);
    const fx = FRANCHISE[fr];
    const words = fx.words[hero.family] || fx.words.default;
    const hit = (sig && sig.hit) || FRANCHISE_HIT[fr] || FAMILY_HIT[hero.family] || FAMILY_HIT.spider;
    return { word: sig && sig.word, words, hit };
  };

  /** 검증용: 고유 필살기가 있는 캐릭터 id 목록 */
  A.SIGNATURE_IDS = Object.keys(SIGNATURES);
})(window.ARAH);

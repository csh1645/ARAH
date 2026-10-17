/**
 * @file 3D 히어로의 슈트 재질: Quaternius 기본 몸(속옷 차림) 위에 히어로마다 슈트를 "셰이더로" 입힌다.
 *       UV 그림을 칠하지 않고, 기본 자세(T 자세)의 몸 좌표(미터)로 부위를 나눈다 — 머리 · 장갑 · 부츠 · 벨트 · 가슴 문양.
 *       히어로마다 다른 모양은 데이터(HeroLook: pattern · mark · head …)로만 정한다 → 히어로 추가 = 데이터 한 줄.
 *       그림체는 "스파이더버스" 풍: 망점(halftone) 그림자 · 빗금 · 굵은 잉크선 (A.Toon.spiderVerse).
 * @layer game
 * @depends THREE (전역), A.Toon
 * @see data/heroes.js (HeroLook), game/three/hero3d.js (몸 치수 · 장비), doc/standards/design-system.md (4절)
 *
 * 몸 좌표: 발 = y 0, 위 = +y, 앞 = +z, T 자세라 팔은 ±x 로 뻗어 있다. 치수(목 · 눈 · 손목 · 무릎 …)는 뼈 위치에서 잰다.
 * 뼈 크기를 바꿔 2등신으로 만들어도 이 좌표는 그대로라 부위 나누기가 깨지지 않는다.
 */
(function (A) {
  'use strict';

  /** look.pattern → 번호 (몸 무늬) */
  const PATTERN = { plain: 0, web: 1, plates: 2, stripes: 3, discs: 4, skin: 5, tribal: 6, amazon: 7, robe: 8, rock: 9, bark: 10, sides: 11, tactical: 12, scales: 13 };
  /** look.mark → 번호 (가슴 문양) */
  const MARK = { none: 0, spider: 1, spiderBig: 2, star: 3, bat: 4, super: 5, bolt: 6, arc: 7, lantern: 8, amulet: 9, eagle: 10, beetle: 11, bird: 12, x: 13, hourglass: 14 };
  /** look.head → 번호 (머리) */
  const HEAD = { face: 0, mask: 1, faceplate: 2, helmet: 3, cowl: 4, domino: 5, tint: 6, android: 7 };
  /** 예전 2D style 만 있는 외형(데이터가 없을 때)의 기본값 */
  const FROM_STYLE = {
    classic: ['web', 'spider', 'mask'], hood: ['web', 'spider', 'mask'], detective: ['web', 'spider', 'mask'], pig: ['web', 'spider', 'mask'],
    future: ['plain', 'spiderBig', 'mask'], armor: ['plates', 'arc', 'faceplate'], shield: ['stripes', 'star', 'helmet'], thunder: ['discs', 'none', 'face'],
    giant: ['skin', 'none', 'tint'], archer: ['tactical', 'none', 'face'], mystic: ['robe', 'amulet', 'face'], panther: ['tribal', 'none', 'mask'],
  };
  /** 얼굴을 덮어 머리카락을 숨기는 머리 */
  const COVERS_HAIR = new Set(['mask', 'faceplate', 'helmet', 'cowl']);

  const GLSL_COMMON = /* glsl */ `
    uniform vec3 uSuit, uAccent, uLine, uEmblem, uSkin, uHair, uGlove, uBoot, uLens, uBelt, uTint;
    uniform float uPattern, uMark, uHead;
    uniform vec4 uFlagA; // sides · belt · hood · metalArm
    uniform vec4 uFlagB; // topSuit · lensBig · webHeadOnly · helmetMetal
    uniform float uNeckY, uEyeY, uEyeX, uFaceZ, uWristX, uBootY, uPelvisY, uChestY, uShoulderY, uSideL;
    varying vec3 vBind;
    vec3 suitGlow;

    float hsLum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
    float hsStep(float e, float v) { return smoothstep(e - 0.004, e + 0.004, v); }
    float hsBand(float v, float a, float b) { return hsStep(a, v) * (1.0 - hsStep(b, v)); }
    float hsLine(float d, float w) { return 1.0 - smoothstep(w * 0.5, w, abs(d)); }
    float hsFill(float d) { return 1.0 - smoothstep(-0.002, 0.002, d); } // 거리 d < 0 이면 1
    float hsSeg(vec2 p, vec2 a, vec2 b) {
      vec2 pa = p - a, ba = b - a;
      return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
    }
    /** 거미줄 무늬: 중심 q 에서 뻗는 살 + 동심원 */
    float hsWeb(vec2 q, float rings, float spokes, float w) {
      float r = length(q);
      float a = atan(q.y, q.x);
      float s = abs(fract(a * spokes / 6.2831853 + 0.5) - 0.5) * (6.2831853 / spokes) * r;
      float c = abs(fract(r * rings + 0.5) - 0.5) / rings;
      return max(hsLine(s, w), hsLine(c, w));
    }
    /** 별 (iq sdStar5) — 거리 */
    float hsStar(vec2 p, float r, float rf) {
      const vec2 k1 = vec2(0.809016994375, -0.587785252292);
      const vec2 k2 = vec2(-0.809016994375, -0.587785252292);
      p.x = abs(p.x);
      p -= 2.0 * max(dot(k1, p), 0.0) * k1;
      p -= 2.0 * max(dot(k2, p), 0.0) * k2;
      p.x = abs(p.x);
      p.y -= r;
      vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
      float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
      return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
    }
    /** 거미 문양 (몸통 두 원 + 다리 8개) — 1 = 문양 안 */
    float hsSpider(vec2 p, float s) {
      p /= s;
      float d = min(length(p - vec2(0.0, 0.25)) - 0.22, length((p + vec2(0.0, 0.25)) * vec2(1.0, 0.8)) - 0.32);
      vec2 q = vec2(abs(p.x), p.y);
      d = min(d, hsSeg(q, vec2(0.1, 0.2), vec2(0.6, 0.85)) - 0.05);
      d = min(d, hsSeg(q, vec2(0.1, 0.1), vec2(0.75, 0.25)) - 0.05);
      d = min(d, hsSeg(q, vec2(0.1, -0.1), vec2(0.75, -0.35)) - 0.05);
      d = min(d, hsSeg(q, vec2(0.1, -0.2), vec2(0.55, -0.95)) - 0.05);
      return 1.0 - smoothstep(0.0, 0.06, d);
    }
    /** 박쥐 문양 — 1 = 안 */
    float hsBat(vec2 p, float s) {
      p /= s;
      vec2 q = vec2(abs(p.x), p.y);
      float wing = length(q / vec2(1.0, 0.42)) - 1.0;                  // 넓은 타원 날개
      wing = max(wing, -(length((q - vec2(0.42, -0.42)) / vec2(0.22, 0.3)) - 1.0)); // 아래 물결 1
      wing = max(wing, -(length((q - vec2(0.8, -0.36)) / vec2(0.2, 0.26)) - 1.0));  // 아래 물결 2
      float head = max(abs(q.x) - 0.12, abs(q.y - 0.12) - 0.26);
      float ear = hsSeg(q, vec2(0.08, 0.3), vec2(0.12, 0.5)) - 0.04;
      return 1.0 - smoothstep(0.0, 0.04, min(min(wing, head), ear));
    }
    /** 번개 (지그재그) — 1 = 안 */
    float hsBolt(vec2 p, float s) {
      p /= s;
      float d = hsSeg(p, vec2(0.25, 0.9), vec2(-0.2, 0.05)) - 0.12;
      d = min(d, hsSeg(p, vec2(-0.2, 0.05), vec2(0.2, 0.05)) - 0.12);
      d = min(d, hsSeg(p, vec2(0.2, 0.05), vec2(-0.25, -0.9)) - 0.1);
      return 1.0 - smoothstep(0.0, 0.05, d);
    }
    /** 마스크 · 고깔의 큰 눈 (0 바깥, 1 흰 눈, 0.5 테두리) */
    float hsLens(vec3 p, float rx, float ry, float tilt) {
      if (p.z < uFaceZ - 0.045) return 0.0;
      float best = 0.0;
      for (int i = 0; i < 2; i++) {
        float s = i == 0 ? -1.0 : 1.0;
        vec2 q = vec2(p.x - s * uEyeX, p.y - uEyeY);
        float c = cos(s * tilt), n = sin(s * tilt);
        q = vec2(c * q.x + n * q.y, -n * q.x + c * q.y);
        float e = length(q / vec2(rx, ry));
        if (e < 1.0) best = 1.0;
        else if (e < 1.3) best = max(best, 0.5);
      }
      return best;
    }
    /**
     * 만화 얼굴 (2등신): 매끈한 피부 + 동글동글 까만 눈(반짝이 두 개) + 눈썹 + 작은 웃는 입 + 볼터치
     */
    vec3 cartoonFace(vec3 p, vec3 skin, float open) {
      vec3 c = skin;
      if (p.z < uFaceZ - 0.06) return c;
      float ax = abs(p.x);
      vec2 e = vec2(ax - uEyeX, p.y - uEyeY + 0.004);
      float eye = length(e / vec2(0.0125, 0.0165));
      c = mix(c, vec3(0.06, 0.04, 0.05), (1.0 - smoothstep(0.92, 1.0, eye)) * open);
      c = mix(c, vec3(1.0), (1.0 - smoothstep(0.8, 1.0, length(e - vec2(-0.004, 0.006)) / 0.0048)) * open);
      c = mix(c, vec3(1.0), (1.0 - smoothstep(0.8, 1.0, length(e - vec2(0.004, -0.006)) / 0.0024)) * open);
      float brow = hsLine(p.y - (uEyeY + 0.03 + 0.005 * (1.0 - ax / 0.06)), 0.007) * hsBand(ax, uEyeX - 0.013, uEyeX + 0.013);
      c = mix(c, uHair * 0.6, brow * open);
      vec2 mo = vec2(p.x, p.y - (uEyeY - 0.05));
      float smile = hsLine(length(mo - vec2(0.0, 0.01)) - 0.013, 0.005) * step(mo.y, 0.004) * step(abs(mo.x), 0.011);
      c = mix(c, vec3(0.42, 0.1, 0.12), smile);
      float blush = 1.0 - smoothstep(0.0, 0.013, length(vec2(ax - uEyeX - 0.006, p.y - uEyeY + 0.03)));
      c = mix(c, vec3(1.0, 0.42, 0.45), blush * 0.4 * open);
      return c;
    }

    vec3 heroSuit(vec3 tex) {
      suitGlow = vec3(0.0);
      vec3 p = vBind;
      int pt = int(uPattern + 0.5);
      int mk = int(uMark + 0.5);
      int hd = int(uHead + 0.5);
      float ax = abs(p.x);
      float shade = clamp(hsLum(tex) / 0.42, 0.78, 1.15);         // 원본 근육 음영 (약하게 — 만화 그림체)
      float head = hsStep(uNeckY, p.y);
      float front = smoothstep(0.0, 0.04, p.z);
      float arm = hsStep(0.24, ax);                               // T 자세: 어깨 바깥 = 팔
      float glove = hsStep(uWristX - 0.07, ax);
      float boot = 1.0 - hsStep(uBootY, p.y);
      float hip = uPelvisY - 0.07;                                // 다리가 갈라지는 높이
      float legs = 1.0 - hsStep(hip, p.y);
      float torso = (1.0 - arm) * (1.0 - legs);
      vec2 chest = vec2(p.x, p.y - uChestY);
      float sides = hsBand(ax, 0.10, 0.24) * hsBand(p.y, hip, uChestY - 0.02) + hsLine(p.y - uShoulderY + 0.02, 0.05) * arm * 0.0;

      // ---- 몸 무늬 ----
      vec3 body = uSuit;
      float bare = 0.0;     // 맨살 (원더우먼 팔다리 등)
      float lines = 0.0;
      vec3 lineC = uLine;
      bool gloves = true;
      bool boots = true;
      if (pt == 1) {                                              // 거미줄
        if (uFlagA.x > 0.5) body = mix(body, uAccent, max(sides, legs * (1.0 - boot)));
        if (uFlagB.z < 0.5) lines = hsWeb(vec2(p.x, p.y - uChestY - 0.06), 13.0, 16.0, 0.006);
      } else if (pt == 2) {                                       // 갑옷 판 · 이음선
        float plate = max(hsBand(ax, 0.40, uWristX - 0.07) * arm, hsBand(p.y, uBootY + 0.12, hip - 0.12) * legs);
        body = mix(body, uAccent, plate);
        lines = hsLine(fract(p.y * 9.0) - 0.5, 0.05) * 0.7;
      } else if (pt == 3) {                                       // 배 줄무늬
        float stripes = hsBand(p.y, uPelvisY + 0.06, uChestY - 0.09) * (1.0 - arm);
        body = mix(body, mix(uAccent, uLine, step(0.5, fract(p.y * 24.0))), stripes);
      } else if (pt == 4) {                                       // 가슴 원반 6개
        for (int i = 0; i < 6; i++) {
          vec2 c = vec2(i < 3 ? -0.055 : 0.055, 0.05 - float(i - (i / 3) * 3) * 0.07);
          float d = length(chest - c);
          body = mix(body, uLine * (0.75 + 0.35 * smoothstep(0.02, 0.0, d)), (1.0 - smoothstep(0.016, 0.02, d)) * front);
        }
        body = mix(body, uSuit * 0.75, legs);
      } else if (pt == 5) {                                       // 피부색 몸 + 반바지 (헐크 · 쉬헐크)
        float shorts = hsBand(p.y + 0.015 * sin(p.x * 90.0), uPelvisY - 0.3, uPelvisY + 0.08) * (1.0 - arm);
        body = mix(uSuit, uAccent, shorts);
        if (uFlagB.x > 0.5) body = mix(body, uAccent, hsBand(p.y, uPelvisY, uShoulderY + 0.02) * (1.0 - arm));
        gloves = false; boots = false;
      } else if (pt == 6) {                                       // 와칸다 무늬: 목걸이 V · 은색 선
        float neck = hsBand(p.y, uShoulderY - 0.17, uShoulderY - 0.02) * front * (1.0 - arm);
        float chev = hsLine(fract((p.y + ax * 0.9) * 22.0) - 0.5, 0.18) * neck;
        body = mix(body, uLine, chev);
        suitGlow += uEmblem * chev * 0.35;
        lines = hsLine(ax - 0.11, 0.008) * hsBand(p.y, hip, uShoulderY - 0.17) * 0.8;
        gloves = false; boots = false;
      } else if (pt == 7) {                                       // 아마존 전사: 상의 · 치마 · 맨팔 · 맨다리
        float skirt = hsBand(p.y, hip - 0.12, uPelvisY + 0.03) * (1.0 - arm);
        body = mix(body, uAccent, skirt);
        bare = max(arm * (1.0 - hsBand(ax, uWristX - 0.16, uWristX)), legs * (1.0 - hsStep(hip - 0.12, p.y)) * (1.0 - boot));
        body = mix(body, uLine, hsBand(ax, uWristX - 0.16, uWristX) * arm);   // 금 팔찌
        gloves = false;
      } else if (pt == 8) {                                       // 망토 차림: 띠 · 높은 깃 · 어두운 바지
        body = mix(body, uAccent, hsBand(p.y, uPelvisY - 0.01, uPelvisY + 0.08) * (1.0 - arm));
        body = mix(body, uLine, hsBand(p.y, uNeckY - 0.05, uNeckY) * (1.0 - arm));
        body = mix(body, uSuit * 0.6, legs);
      } else if (pt == 9) {                                       // 바위 몸 (씽): 갈라진 금 + 파란 반바지
        vec2 g = p.xy * 22.0;
        vec2 f = fract(g + 0.5 * floor(mod(g.yx, 2.0))) - 0.5;
        lines = max(hsLine(f.x, 0.12), hsLine(f.y, 0.12));
        body = mix(uSuit, uAccent, hsBand(p.y, uPelvisY - 0.22, uPelvisY + 0.06) * (1.0 - arm));
        gloves = false; boots = false;
      } else if (pt == 10) {                                      // 나무껍질 (그루트)
        lines = hsLine(fract(p.x * 30.0 + sin(p.y * 40.0) * 0.3) - 0.5, 0.2);
        gloves = false; boots = false;
      } else if (pt == 11) {                                      // 옆구리 · 다리 바깥 색
        body = mix(body, uAccent, max(sides, hsBand(ax, 0.07, 0.2) * legs * (1.0 - boot)));
      } else if (pt == 12) {                                      // 전투복: 멜빵 · 무릎 보호대 · 금속 팔
        lines = max(hsLine(ax - 0.07, 0.012) * torso, hsLine(p.y - uPelvisY - 0.02, 0.015) * (1.0 - arm));
        body = mix(body, uAccent, hsBand(p.y, uBootY + 0.15, uBootY + 0.24) * legs);
        if (uFlagA.w > 0.5) {
          float metal = hsStep(0.2, p.x * uSideL);
          body = mix(body, uLine, metal);
          lines = max(lines, hsLine(fract(p.x * 18.0) - 0.5, 0.1) * metal);
          lineC = uLine * 0.6;
        }
      } else if (pt == 13) {                                      // 비늘 (아쿠아맨)
        vec2 g = vec2(p.x * 40.0, p.y * 40.0 + step(0.5, fract(p.x * 20.0)) * 0.5);
        lines = hsLine(length(fract(g) - vec2(0.5, 0.0)) - 0.5, 0.15) * torso;
        body = mix(body, uAccent, legs);
      }
      body = mix(body, lineC, lines);
      if (uFlagA.y > 0.5) body = mix(body, uBelt, hsBand(p.y, uPelvisY + 0.01, uPelvisY + 0.06) * (1.0 - arm));

      // ---- 가슴 문양 ----
      float em = 0.0;
      vec2 c = chest - vec2(0.0, 0.04);
      if (mk == 1) em = hsSpider(c, 0.055);
      if (mk == 2) em = hsSpider(c - vec2(0.0, -0.02), 0.13);
      if (mk == 3) em = hsFill(hsStar(c + vec2(0.0, 0.03), 0.06, 0.45));
      if (mk == 4) em = hsBat(c, 0.09);
      if (mk == 5 || mk == 6 || mk == 13) {                      // 둥근 · 마름모 바탕 문양
        float base = mk == 5 ? (abs(c.x) * 1.1 + abs(c.y + 0.005) * 1.3 - 0.07) : length(c) - 0.055;
        body = mix(body, mk == 5 ? uLine : uEmblem, hsFill(base) * front * (1.0 - arm));
        if (mk == 5) em = hsLine(sin(c.y * 120.0 + sign(c.x) * 1.2) * 0.02 + c.x * 0.4, 0.012) * hsFill(base + 0.012); // S 모양 물결
        if (mk == 6) { body = mix(body, uSuit, hsFill(base + 0.008) * front * (1.0 - arm)); em = hsBolt(c, 0.045); }
        if (mk == 13) { body = mix(body, uSuit, hsFill(base + 0.008) * front * (1.0 - arm)); em = max(hsLine(c.x - c.y, 0.012), hsLine(c.x + c.y, 0.012)) * hsFill(base + 0.012); }
      }
      if (mk == 7 || mk == 9 || mk == 11) {                      // 빛나는 코어 · 목걸이 · 딱정벌레
        float r = mk == 11 ? length(c / vec2(0.9, 1.3)) : length(c);
        float core = 1.0 - smoothstep(0.024, 0.03, r);
        body = mix(body, uLine, hsLine(r - 0.036, 0.012) * front * (1.0 - arm));
        em = core;
        suitGlow += uEmblem * core * front * 0.9;
      }
      if (mk == 8) { em = max(hsLine(length(c) - 0.045, 0.012), hsBand(abs(c.y), 0.0, 0.012) * step(abs(c.x), 0.045)); suitGlow += uEmblem * em * 0.6; }
      if (mk == 10 || mk == 12) em = hsLine(c.y - abs(c.x) * (mk == 10 ? -0.8 : 0.6) - (mk == 10 ? 0.02 : -0.02), 0.022) * step(abs(c.x), 0.1);
      if (mk == 14) em = hsFill(max(abs(c.x) - abs(p.y - uPelvisY - 0.035) * 0.8 - 0.004, abs(p.y - uPelvisY - 0.035) - 0.025)) * step(abs(c.x), 0.03);
      body = mix(body, uEmblem, em * front * (1.0 - arm));

      if (gloves) body = mix(body, uGlove, glove);
      if (boots) body = mix(body, uBoot, boot);
      vec3 col = mix(body * shade, uSkin, bare);

      // ---- 머리 ----
      vec3 h;
      float lensW = uFlagB.y > 0.5 ? 0.04 : 0.031, lensH = uFlagB.y > 0.5 ? 0.03 : 0.024;
      if (hd == 1) {                                              // 전체 마스크
        vec3 m = uFlagB.w > 0.5 ? uLine : uSuit;
        h = m;
        if (pt == 1) h = mix(h, uLine, hsWeb(vec2(p.x, p.y - uEyeY), 40.0, 14.0, 0.0035));
        if (pt == 6) h = mix(h, uLine, hsLine(ax - 0.012, 0.004) * hsStep(uEyeY + 0.02, p.y));
        if (uFlagA.z > 0.5) h = mix(h, uAccent, max(step(p.z, uFaceZ - 0.07), step(uEyeY + 0.055, p.y))); // 후드
        float lens = hsLens(p, lensW, lensH, 0.3);
        h = mix(h, vec3(0.04), step(0.4, lens) * (1.0 - step(0.9, lens)));
        h = mix(h, uLens, step(0.9, lens));
        suitGlow += uLens * step(0.9, lens) * (hsLum(uLens) < 0.9 ? 0.6 : 0.0);
      } else if (hd == 2) {                                       // 철가면: 얼굴 판 + 빛나는 눈 틈
        h = uSuit;
        float plate = hsBand(p.y, uEyeY - 0.075, uEyeY + 0.035) * (1.0 - hsStep(0.052, ax)) * step(uFaceZ - 0.05, p.z);
        h = mix(h, uAccent, plate);
        float slit = hsBand(p.y, uEyeY - 0.006, uEyeY + 0.006) * hsBand(ax, 0.012, 0.045) * step(uFaceZ - 0.04, p.z);
        h = mix(h, uEmblem, slit);
        suitGlow += uEmblem * slit;
      } else if (hd == 4) {                                       // 고깔 (배트맨 · 플래시 · 울버린): 입 · 턱은 보인다
        float cover = max(hsStep(uEyeY - 0.032, p.y), 1.0 - hsStep(uFaceZ - 0.075, p.z));
        h = mix(cartoonFace(p, uSkin, 0.0), uSuit, cover);
        if (uFlagA.x > 0.5) h = mix(h, uAccent, cover * hsBand(ax, 0.035, 0.09) * hsStep(uEyeY + 0.01, p.y)); // 울버린 옆 무늬
        float lens = hsLens(p, 0.024, 0.014, 0.35);
        h = mix(h, vec3(0.04), step(0.4, lens) * (1.0 - step(0.9, lens)));
        h = mix(h, vec3(0.97), step(0.9, lens));
      } else {
        vec3 skin = hd == 6 ? uTint : hd == 7 ? uLine : uSkin;
        h = cartoonFace(p, skin, 1.0);
        if (hd == 3) {                                            // 투구: 이마 위 · 뒤통수
          float helm = max(hsStep(uEyeY + 0.03, p.y), 1.0 - hsStep(uFaceZ - 0.085, p.z));
          h = mix(h, uSuit, helm);
          h = mix(h, uLine, helm * hsLine(ax - 0.05, 0.01) * hsBand(p.y, uEyeY + 0.03, uEyeY + 0.09));
        }
        if (hd == 5) {                                            // 눈가면
          float band = hsBand(p.y, uEyeY - 0.022, uEyeY + 0.02) * (1.0 - hsStep(0.075, ax)) * step(uFaceZ - 0.05, p.z);
          h = mix(h, uLens, band * (1.0 - (1.0 - smoothstep(0.9, 1.0, length(vec2(ax - uEyeX, p.y - uEyeY) / vec2(0.012, 0.0155))))));
        }
        if (hd == 7) {                                            // 이마의 보석 (비전)
          float gem = 1.0 - smoothstep(0.009, 0.012, length(vec2(p.x, p.y - uEyeY - 0.045)));
          h = mix(h, uEmblem, gem * step(uFaceZ - 0.04, p.z));
          suitGlow += uEmblem * gem * 0.8;
        }
      }
      return mix(col, h, head);
    }
  `;

  /** sRGB 색 → 셰이더용 선형 색 */
  const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();

  /** 외형 데이터를 셰이더 값으로 (빠진 값은 예전 2D style 기본값) */
  function resolve(look) {
    const [p, m, h] = FROM_STYLE[look.style] || FROM_STYLE.classic;
    return { pattern: look.pattern || p, mark: look.mark || m, head: look.head || h };
  }

  A.HeroSuit = {
    PATTERN, MARK, HEAD,

    /** @param {HeroLook} look @returns {boolean} 얼굴을 덮는지 */
    masked: (look) => COVERS_HAIR.has(resolve(look).head),

    /** @param {HeroLook} look @returns {boolean} 머리카락을 보일지 (마스크 · 투구 · 고깔 · 민머리면 숨김) */
    showHair: (look) => !COVERS_HAIR.has(resolve(look).head) && !look.bald,

    /**
     * 히어로 슈트 재질 (스파이더버스 풍 만화 음영 + 부위별 색 · 무늬). 모든 히어로가 같은 셰이더 프로그램을 쓰고 값만 다르다.
     * @param {HeroLook} look
     * @param {THREE.Texture} map 원본 몸 텍스처 (근육 음영)
     * @param {object} dims 몸 치수 (hero3d.js measure)
     * @returns {THREE.MeshToonMaterial}
     */
    material(look, map, dims) {
      const r = resolve(look);
      const m = A.Toon.material({ map });
      const u = {
        uSuit: { value: lin(look.suit) },
        uAccent: { value: lin(look.accent) },
        uLine: { value: lin(look.line) },
        uEmblem: { value: lin(look.emblem) },
        uSkin: { value: lin(look.skin || '#f3c99a') },
        uHair: { value: lin(look.hair || '#3e2723') },
        uGlove: { value: lin(look.glove || look.accent) },
        uBoot: { value: lin(look.boot || look.accent) },
        uLens: { value: lin(look.lens || '#f7f7f7') },
        uBelt: { value: lin(typeof look.belt === 'string' ? look.belt : look.accent) },
        uTint: { value: lin(look.skinTint || look.suit) },
        uPattern: { value: PATTERN[r.pattern] || 0 },
        uMark: { value: MARK[r.mark] || 0 },
        uHead: { value: HEAD[r.head] || 0 },
        uFlagA: { value: new THREE.Vector4(look.sides ? 1 : 0, look.belt ? 1 : 0, look.hood ? 1 : 0, look.metalArm ? 1 : 0) },
        uFlagB: { value: new THREE.Vector4(look.topSuit ? 1 : 0, look.lensBig ? 1 : 0, look.webHeadOnly ? 1 : 0, look.helmetMetal ? 1 : 0) },
        uSideL: { value: dims.sideL },
      };
      for (const k of ['neckY', 'eyeY', 'eyeX', 'faceZ', 'wristX', 'bootY', 'pelvisY', 'chestY', 'shoulderY']) {
        u[`u${k[0].toUpperCase()}${k.slice(1)}`] = { value: dims[k] };
      }
      m.userData.suit = u;
      m.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, u);
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vBind;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vBind = position;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\n${GLSL_COMMON}`)
          .replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.rgb = heroSuit(diffuseColor.rgb);')
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += suitGlow;');
        A.Toon.spiderVerse(shader, 0.5);
      };
      m.customProgramCacheKey = () => 'arah-hero-suit-v4';
      return m;
    },

    /**
     * 머리카락 · 눈썹 재질: 원본 텍스처의 밝기만 쓰고 색은 히어로 머리색으로
     * @param {string} hex 머리색
     * @param {THREE.Material} src 원본 재질 (텍스처 · 투명 설정)
     */
    hairMaterial(hex, src) {
      const m = A.Toon.material({ map: src.map || null, color: lin(hex) });
      m.alphaTest = src.alphaTest || (src.transparent ? 0.4 : 0);
      m.side = THREE.DoubleSide;
      m.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
          #ifdef USE_MAP
            vec4 hairTex = texture2D(map, vUv);
            diffuseColor.rgb *= clamp(dot(hairTex.rgb, vec3(0.299, 0.587, 0.114)) * 2.4, 0.35, 1.4);
            diffuseColor.a *= hairTex.a;
          #endif`);
        A.Toon.spiderVerse(shader, 0.5);
      };
      m.customProgramCacheKey = () => 'arah-hero-hair-v2';
      return m;
    },
  };
})(window.ARAH);

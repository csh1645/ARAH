/**
 * @file 히어로 연합: 8팀 × 6명 = 48명. 팀마다 기본 히어로 1명은 처음부터 고를 수 있고,
 *       나머지 5명은 "그 팀의 스타"를 모아 한 명씩 합류시킨다 (사용자 설계 2026-10-10).
 * @layer data
 * @depends 없음
 * @see doc/planning/game-design.md (5. 히어로 연합), doc/decisions/ADR-0002-original-characters.md
 *
 * 스타 규칙:
 *   - 판이 끝나면 받은 스타는 "그 판에 고른 히어로의 팀" 스타로 쌓인다 (예: 썬더 나이트 → ⚡ 번개 스타)
 *   - 팀 안의 합류 조건 TEAM_UNLOCKS 의 간격(10, 15, 20, 25, 30)이 한 판에 받을 수 있는 최대 스타(10 + 퍼펙트 3 = 13)보다
 *     크거나 비슷해서, 한 판에 두 명이 한꺼번에 열리지 않는다 (첫 합류 10 은 첫 판에도 열릴 수 있다 — 빠른 첫 보상 의도)
 *
 * 디자인: 원조 히어로를 떠올리게 하는 오마주(대표 색 · 장비 · 실루엣). 공식 이름 · 로고 · 공식 이미지 파일은 쓰지 않는다.
 * 저장 호환: id 는 한번 정하면 바꾸지 않는다. 예전 전체 별 기준으로 열렸던 히어로는 ui/app.js 의 이전(migration)이 유지한다.
 */

/**
 * 히어로 능력. 모두 선택 항목이며, 없으면 기본값을 쓴다 (game/round-scene.js · modes/* 참고).
 * @typedef {Object} HeroAbility
 * @property {number} [comboBonus] 콤보 보너스 점수 배율 (기본 1)
 * @property {number} [hitRadius]  줄 판정 여유 px (기본 10)
 * @property {number} [webSpeed]   줄 · 스윙 · 이동 속도 배율 (기본 1)
 * @property {number} [cooldown]   연사 간격 ms (기본 300)
 * @property {boolean} [hint]      가짜 보기 하나를 흐리게 표시 / 막아 둠 / 짝 하나를 미리 맞춤
 * @property {number} [hearts]     시작 하트 수 (기본 RULES.baseHearts)
 * @property {number} [slow]       드론 낙하 · 보스 충전 속도 배율 (작을수록 느림). 스윙 · 문 통과는 제한 시간을 1/slow 배로
 * @property {number} [timeBonus]  제한 시간 · 미리 보기 시간 추가 초
 */

/**
 * 히어로 외형. game/hero-art.js 가 이 값으로 캐릭터를 그린다.
 * @typedef {Object} HeroLook
 * @property {'classic'|'hood'|'detective'|'pig'|'future'|'armor'|'shield'|'thunder'|'giant'|'archer'|'mystic'|'panther'} style
 * @property {string} suit   주 색상
 * @property {string} accent 보조 색상 (다리, 허리, 망토 · 방패 · 장갑)
 * @property {string} line   무늬 · 장식 색
 * @property {string} emblem 가슴 문양 · 빛 색
 * @property {string} [skin] 얼굴 · 맨살 색
 * @property {string} [hair] 머리카락 색
 */

/**
 * 히어로 팀.
 * @typedef {Object} HeroFamily
 * @property {string} id
 * @property {string} name     팀 이름
 * @property {string} shot     쏘는 줄 이름 ("정답 드론에 {shot}을 쏘세요" — 모두 받침 있는 '줄'로 끝나게)
 * @property {number} color    줄 색
 * @property {string} trait    팀 공통 특징
 * @property {string} star     팀 스타 아이콘
 * @property {string} starName 팀 스타 이름
 */

/**
 * @typedef {Object} Hero
 * @property {string} id           저장 키 (바꾸지 않는다)
 * @property {string} family       HeroFamily.id
 * @property {string} name
 * @property {string} universe     출신 차원
 * @property {string} abilityText
 * @property {HeroAbility} ability
 * @property {number} unlockStars  합류에 필요한 "그 팀 스타" 수 (0 = 처음부터)
 * @property {HeroLook} look
 */
(function (A) {
  'use strict';

  /** 팀 안에서 1~6번째 히어로의 합류 조건 (그 팀 스타 수). 거미 팀의 예전 조건과 같은 값 */
  A.TEAM_UNLOCKS = [0, 10, 25, 45, 70, 100];

  /** @type {HeroFamily[]} 메뉴 도감에 보이는 순서 */
  A.HERO_FAMILIES = [
    { id: 'spider', name: '거미 팀', shot: '거미줄', color: 0xffffff, trait: '여러 차원에서 온 거미 히어로', star: '🕸️', starName: '거미 스타' },
    { id: 'armor', name: '아머 팀', shot: '레이저 줄', color: 0x9be7ff, trait: '최첨단 아머, 스캐너로 가짜를 찾아내요', star: '⚙️', starName: '아머 스타' },
    { id: 'shield', name: '방패 팀', shot: '방패 줄', color: 0x4cc9f0, trait: '별 방패로 하트를 지켜요', star: '🛡️', starName: '방패 스타' },
    { id: 'thunder', name: '번개 팀', shot: '번개 줄', color: 0xffd166, trait: '망치를 든 번개의 기사, 아주 빨라요', star: '⚡', starName: '번개 스타' },
    { id: 'giant', name: '거인 팀', shot: '바위 줄', color: 0x80ed99, trait: '힘센 근육 거인, 큼직하게 잡아요', star: '💪', starName: '거인 스타' },
    { id: 'archer', name: '궁수 팀', shot: '화살 줄', color: 0xc77dff, trait: '백발백중 궁수, 콤보 점수가 커요', star: '🎯', starName: '궁수 스타' },
    { id: 'mystic', name: '마법 팀', shot: '마법 줄', color: 0xff9f1c, trait: '마법으로 시간을 느리게 해요', star: '🔮', starName: '마법 스타' },
    { id: 'panther', name: '표범 팀', shot: '발톱 줄', color: 0xb388ff, trait: '날렵한 왕의 전사, 빠르고 단단해요', star: '🐾', starName: '표범 스타' },
  ];

  const SKIN = '#f1c27d';
  const U = A.TEAM_UNLOCKS;

  /** 짧게 쓰기 위한 생성 함수: 팀 안 순서(rank 0~5)로 합류 조건을 정한다 */
  const h = (id, family, rank, name, universe, abilityText, ability, look) =>
    ({ id, family, name, universe, abilityText, ability, unlockStars: U[rank], look });

  /** @type {Hero[]} 첫 번째는 전체 기본 히어로 (저장된 id 가 없을 때) */
  A.HEROES = [
    // ----- 🕸️ 거미 팀 -----
    h('red', 'spider', 0, '레드 스파이더', '빨강 차원', '콤보 점수가 1.5배로 올라가요', { comboBonus: 1.5 },
      { style: 'classic', suit: '#d62828', accent: '#1d4ed8', line: '#2a0505', emblem: '#111111' }),
    h('snow', 'spider', 1, '스노우 스파이더', '눈꽃 차원', '줄이 넓게 퍼지고, 생각할 시간이 2초 더 있어요', { hitRadius: 26, timeBonus: 2 },
      { style: 'hood', suit: '#f5f5f5', accent: '#ff4fa3', line: '#a0a0a0', emblem: '#222222' }),
    h('shadow', 'spider', 2, '섀도 스파이더', '그림자 차원', '줄 · 스윙 · 이동이 아주 빨라요', { webSpeed: 1.7, cooldown: 170 },
      { style: 'classic', suit: '#1b1b22', accent: '#26262f', line: '#e63946', emblem: '#e63946' }),
    h('detective', 'spider', 3, '탐정 스파이더', '흑백 차원', '가짜 보기 하나를 미리 알려줘요', { hint: true },
      { style: 'detective', suit: '#3a3a3a', accent: '#1e1e1e', line: '#8a8a8a', emblem: '#bbbbbb' }),
    h('piggy', 'spider', 4, '피기 스파이더', '꿀꿀 차원', '하트를 하나 더 가지고 시작해요', { hearts: 4 },
      { style: 'pig', suit: '#ff9eb5', accent: '#d62828', line: '#b5476a', emblem: '#7a1f3d' }),
    h('future', 'spider', 5, '퓨처 스파이더', '미래 차원', '모든 것이 천천히 다가와요', { slow: 0.7 },
      { style: 'future', suit: '#1e3a8a', accent: '#0f172a', line: '#ef4444', emblem: '#ef4444' }),

    // ----- ⚙️ 아머 팀: 스캐너(hint) -----
    h('armor-red', 'armor', 0, '레드 아머', '강철 차원', '스캐너로 가짜 보기 하나를 알려줘요', { hint: true },
      { style: 'armor', suit: '#b5121b', accent: '#f2c14e', line: '#7a0c12', emblem: '#9be7ff' }),
    h('armor-war', 'armor', 1, '워 아머', '요새 차원', '스캐너 + 하트 하나 더', { hint: true, hearts: 4 },
      { style: 'armor', suit: '#5c6370', accent: '#2b2f36', line: '#1c1f24', emblem: '#9be7ff' }),
    h('armor-blue', 'armor', 2, '블루 아머', '빙하 차원', '스캐너 + 콤보 점수 1.3배', { hint: true, comboBonus: 1.3 },
      { style: 'armor', suit: '#1d4ed8', accent: '#d9e2ec', line: '#102a75', emblem: '#e0fbfc' }),
    h('armor-stealth', 'armor', 3, '스텔스 아머', '밤하늘 차원', '스캐너 + 빠른 줄', { hint: true, webSpeed: 1.5, cooldown: 200 },
      { style: 'armor', suit: '#22223b', accent: '#9d4edd', line: '#10002b', emblem: '#c77dff' }),
    h('armor-gold', 'armor', 4, '골드 아머', '황금 공장 차원', '스캐너 + 하트 +1 + 콤보 1.3배', { hint: true, hearts: 4, comboBonus: 1.3 },
      { style: 'armor', suit: '#d4a017', accent: '#fff3b0', line: '#7a5c00', emblem: '#ffffff' }),
    h('armor-mega', 'armor', 5, '메가 아머', '거대 로봇 차원', '스캐너 + 하트 +2 + 천천히', { hint: true, hearts: 5, slow: 0.85 },
      { style: 'armor', suit: '#8b0000', accent: '#ffb703', line: '#4a0000', emblem: '#00f5d4' }),

    // ----- 🛡️ 방패 팀: 하트 -----
    h('shield-star', 'shield', 0, '스타 실드', '자유 차원', '하트를 하나 더 가지고 시작해요', { hearts: 4 },
      { style: 'shield', suit: '#1e40af', accent: '#c1121f', line: '#ffffff', emblem: '#ffffff', skin: SKIN }),
    h('shield-night', 'shield', 1, '나이트 실드', '밤 차원', '하트 +1, 시간 +1초', { hearts: 4, timeBonus: 1 },
      { style: 'shield', suit: '#1b263b', accent: '#778da9', line: '#e0e1dd', emblem: '#e0e1dd', skin: SKIN }),
    h('shield-crystal', 'shield', 2, '크리스탈 실드', '보석 차원', '하트를 두 개 더 가지고 시작해요', { hearts: 5 },
      { style: 'shield', suit: '#5a189a', accent: '#c77dff', line: '#ffffff', emblem: '#ffffff', skin: SKIN }),
    h('shield-red', 'shield', 3, '레드 실드', '불꽃 차원', '하트 +1, 콤보 점수 1.3배', { hearts: 4, comboBonus: 1.3 },
      { style: 'shield', suit: '#9d0208', accent: '#ffffff', line: '#003049', emblem: '#ffffff', skin: SKIN }),
    h('shield-snow', 'shield', 4, '스노우 실드', '설원 차원', '하트 +2, 시간 +1초', { hearts: 5, timeBonus: 1 },
      { style: 'shield', suit: '#e0fbfc', accent: '#3d5a80', line: '#98c1d9', emblem: '#3d5a80', skin: SKIN }),
    h('shield-gold', 'shield', 5, '골든 실드', '태양 차원', '하트 +2, 가짜 보기도 알려줘요', { hearts: 5, hint: true },
      { style: 'shield', suit: '#b8860b', accent: '#7f1d1d', line: '#fff3b0', emblem: '#fff3b0', skin: SKIN }),

    // ----- ⚡ 번개 팀: 속도 -----
    h('thunder-knight', 'thunder', 0, '썬더 나이트', '하늘 왕국 차원', '줄 · 스윙 · 이동이 아주 빨라요', { webSpeed: 1.7, cooldown: 170 },
      { style: 'thunder', suit: '#2f3542', accent: '#c1121f', line: '#ced4da', emblem: '#ffd166', skin: SKIN, hair: '#f4d35e' }),
    h('thunder-storm', 'thunder', 1, '스톰 나이트', '폭풍 차원', '아주 빠르고, 콤보 점수 1.3배', { webSpeed: 1.8, cooldown: 150, comboBonus: 1.3 },
      { style: 'thunder', suit: '#1f2933', accent: '#1d4ed8', line: '#9aa5b1', emblem: '#90e0ef', skin: SKIN, hair: '#3e2723' }),
    h('thunder-aurora', 'thunder', 2, '오로라 나이트', '북극광 차원', '아주 빠르고, 하트도 하나 더', { webSpeed: 1.8, cooldown: 150, hearts: 4 },
      { style: 'thunder', suit: '#264653', accent: '#06d6a0', line: '#e9f5db', emblem: '#f15bb5', skin: SKIN, hair: '#ffffff' }),
    h('thunder-queen', 'thunder', 3, '썬더 퀸', '번개 성 차원', '아주 빠르고, 시간 +1초', { webSpeed: 1.8, cooldown: 150, timeBonus: 1 },
      { style: 'thunder', suit: '#3c096c', accent: '#ff006e', line: '#e0aaff', emblem: '#ffbe0b', skin: SKIN, hair: '#ffbe0b' }),
    h('thunder-dark', 'thunder', 4, '다크 썬더', '어둠 구름 차원', '아주 빠르고, 콤보 1.4배', { webSpeed: 1.9, cooldown: 140, comboBonus: 1.4 },
      { style: 'thunder', suit: '#111111', accent: '#6a040f', line: '#adb5bd', emblem: '#e5383b', skin: SKIN, hair: '#111111' }),
    h('thunder-gold', 'thunder', 5, '골든 썬더', '황금 왕좌 차원', '가장 빠르고, 하트 +1, 콤보 1.3배', { webSpeed: 2, cooldown: 130, hearts: 4, comboBonus: 1.3 },
      { style: 'thunder', suit: '#b08900', accent: '#ffffff', line: '#fff3b0', emblem: '#4cc9f0', skin: SKIN, hair: '#fff3b0' }),

    // ----- 💪 거인 팀: 큰 판정 + 시간 -----
    h('giant-green', 'giant', 0, '그린 자이언트', '감마 차원', '줄이 넓게 퍼지고, 생각할 시간이 2초 더', { hitRadius: 26, timeBonus: 2 },
      { style: 'giant', suit: '#4caf50', accent: '#6a1b9a', line: '#1b5e20', emblem: '#1b5e20', hair: '#1a1a1a' }),
    h('giant-red', 'giant', 1, '레드 자이언트', '화산 차원', '넓은 판정 + 시간 + 콤보 1.2배', { hitRadius: 26, timeBonus: 2, comboBonus: 1.2 },
      { style: 'giant', suit: '#c62828', accent: '#263238', line: '#7f0000', emblem: '#7f0000', hair: '#212121' }),
    h('giant-gray', 'giant', 2, '그레이 자이언트', '바위산 차원', '넓은 판정 + 시간 + 천천히', { hitRadius: 26, timeBonus: 2, slow: 0.8 },
      { style: 'giant', suit: '#9e9e9e', accent: '#37474f', line: '#424242', emblem: '#424242', hair: '#212121' }),
    h('giant-blue', 'giant', 3, '블루 자이언트', '심해 차원', '넓은 판정 + 시간 + 하트 +1', { hitRadius: 26, timeBonus: 2, hearts: 4 },
      { style: 'giant', suit: '#1e88e5', accent: '#263238', line: '#0d47a1', emblem: '#0d47a1', hair: '#0b0b0b' }),
    h('giant-purple', 'giant', 4, '퍼플 자이언트', '보랏빛 협곡 차원', '넓은 판정 + 시간 +3초', { hitRadius: 28, timeBonus: 3 },
      { style: 'giant', suit: '#7b1fa2', accent: '#1b5e20', line: '#4a0072', emblem: '#4a0072', hair: '#111111' }),
    h('giant-gold', 'giant', 5, '골드 자이언트', '황금 산 차원', '넓은 판정 + 시간 +3초 + 하트 +1', { hitRadius: 28, timeBonus: 3, hearts: 4 },
      { style: 'giant', suit: '#c9a227', accent: '#3e2723', line: '#7a5c00', emblem: '#7a5c00', hair: '#3e2723' }),

    // ----- 🎯 궁수 팀: 콤보 -----
    h('archer-purple', 'archer', 0, '퍼플 애로우', '과녁 차원', '콤보 점수 1.4배, 줄도 조금 빨라요', { comboBonus: 1.4, webSpeed: 1.3 },
      { style: 'archer', suit: '#4a148c', accent: '#1a1a1a', line: '#d1c4e9', emblem: '#ce93d8', skin: SKIN, hair: '#5d4037' }),
    h('archer-shadow', 'archer', 1, '레드 섀도', '비밀 요원 차원', '콤보 1.5배, 가짜 보기도 알려줘요', { comboBonus: 1.5, hint: true },
      { style: 'archer', suit: '#1a1a1a', accent: '#2b2b2b', line: '#b71c1c', emblem: '#e53935', skin: SKIN, hair: '#c62828' }),
    h('archer-green', 'archer', 2, '그린 애로우', '초록 숲 차원', '콤보 1.6배', { comboBonus: 1.6, webSpeed: 1.3 },
      { style: 'archer', suit: '#1b5e20', accent: '#0b3d0b', line: '#c5e1a5', emblem: '#aed581', skin: SKIN, hair: '#8d6e63' }),
    h('archer-blue', 'archer', 3, '블루 애로우', '강물 차원', '콤보 1.6배, 하트 +1', { comboBonus: 1.6, hearts: 4 },
      { style: 'archer', suit: '#0d47a1', accent: '#0a1929', line: '#bbdefb', emblem: '#64b5f6', skin: SKIN, hair: '#212121' }),
    h('archer-white', 'archer', 4, '화이트 애로우', '설산 차원', '콤보 1.8배', { comboBonus: 1.8, webSpeed: 1.4 },
      { style: 'archer', suit: '#eceff1', accent: '#455a64', line: '#263238', emblem: '#90a4ae', skin: SKIN, hair: '#fafafa' }),
    h('archer-gold', 'archer', 5, '골드 애로우', '황금 숲 차원', '콤보 점수 2배! 줄도 빨라요', { comboBonus: 2, webSpeed: 1.5 },
      { style: 'archer', suit: '#b8860b', accent: '#3e2723', line: '#fff3b0', emblem: '#fff3b0', skin: SKIN, hair: '#f4d35e' }),

    // ----- 🔮 마법 팀: 시간 느리게 -----
    h('mystic-master', 'mystic', 0, '미스틱 마스터', '거울 차원', '마법으로 시간이 천천히 흘러요', { slow: 0.75, timeBonus: 1 },
      { style: 'mystic', suit: '#1a237e', accent: '#b71c1c', line: '#ffb300', emblem: '#2e7d32', skin: SKIN, hair: '#3e2723' }),
    h('mystic-dark', 'mystic', 1, '다크 미스틱', '어둠 차원', '시간이 천천히 + 가짜 보기 알림', { slow: 0.75, timeBonus: 1, hint: true },
      { style: 'mystic', suit: '#212121', accent: '#4a148c', line: '#76ff03', emblem: '#76ff03', skin: SKIN, hair: '#e0e0e0' }),
    h('mystic-scarlet', 'mystic', 2, '스칼렛 미스틱', '진홍 차원', '시간이 더 천천히 (+2초)', { slow: 0.7, timeBonus: 2 },
      { style: 'mystic', suit: '#880e4f', accent: '#d50000', line: '#ff4081', emblem: '#ff80ab', skin: SKIN, hair: '#b71c1c' }),
    h('mystic-emerald', 'mystic', 3, '에메랄드 미스틱', '비취 차원', '천천히 + 하트 +1', { slow: 0.7, timeBonus: 1, hearts: 4 },
      { style: 'mystic', suit: '#004d40', accent: '#1b5e20', line: '#69f0ae', emblem: '#00e676', skin: SKIN, hair: '#212121' }),
    h('mystic-sun', 'mystic', 4, '썬 미스틱', '태양 신전 차원', '천천히 + 콤보 1.4배', { slow: 0.7, timeBonus: 2, comboBonus: 1.4 },
      { style: 'mystic', suit: '#e65100', accent: '#ffd600', line: '#fff59d', emblem: '#ff6d00', skin: SKIN, hair: '#5d4037' }),
    h('mystic-moon', 'mystic', 5, '문 미스틱', '달 신전 차원', '가장 천천히 + 가짜 보기 + 하트 +1', { slow: 0.65, timeBonus: 2, hint: true, hearts: 4 },
      { style: 'mystic', suit: '#283593', accent: '#cfd8dc', line: '#e3f2fd', emblem: '#82b1ff', skin: SKIN, hair: '#eceff1' }),

    // ----- 🐾 표범 팀: 속도 + 하트 -----
    h('panther-night', 'panther', 0, '나이트 팬서', '비밀 왕국 차원', '날렵해서 빠르고, 하트도 하나 더', { webSpeed: 1.4, hearts: 4 },
      { style: 'panther', suit: '#151515', accent: '#2a2a2a', line: '#c0c0c0', emblem: '#b388ff' }),
    h('panther-gold', 'panther', 1, '골드 팬서', '황금 왕국 차원', '빠르고, 하트 +1, 콤보 1.3배', { webSpeed: 1.6, hearts: 4, comboBonus: 1.3 },
      { style: 'panther', suit: '#3d2b00', accent: '#1f1600', line: '#ffd54f', emblem: '#ffd54f' }),
    h('panther-snow', 'panther', 2, '스노우 팬서', '얼음 왕국 차원', '빠르고, 하트 +1, 시간 +1초', { webSpeed: 1.5, hearts: 4, timeBonus: 1 },
      { style: 'panther', suit: '#eceff1', accent: '#b0bec5', line: '#37474f', emblem: '#4fc3f7' }),
    h('panther-red', 'panther', 3, '레드 팬서', '불꽃 왕국 차원', '아주 빠르고, 하트 +1', { webSpeed: 1.8, cooldown: 170, hearts: 4 },
      { style: 'panther', suit: '#4a0000', accent: '#2b0000', line: '#ff8a80', emblem: '#ff1744' }),
    h('panther-blue', 'panther', 4, '블루 팬서', '바다 왕국 차원', '빠르고, 하트 +2', { webSpeed: 1.6, hearts: 5 },
      { style: 'panther', suit: '#0a1f44', accent: '#06122b', line: '#80d8ff', emblem: '#00b0ff' }),
    h('panther-storm', 'panther', 5, '스톰 팬서', '번개 왕국 차원', '아주 빠르고, 하트 +2, 콤보 1.3배', { webSpeed: 1.9, cooldown: 150, hearts: 5, comboBonus: 1.3 },
      { style: 'panther', suit: '#2a0a3d', accent: '#14001f', line: '#ffea00', emblem: '#d500f9' }),
  ];

  /**
   * id 로 히어로를 찾는다. 저장된 id 가 사라졌을 때를 대비해 없으면 기본 히어로를 돌려준다.
   * @param {string} id
   * @returns {Hero}
   */
  A.findHero = (id) => A.HEROES.find((x) => x.id === id) || A.HEROES[0];

  /**
   * 히어로의 팀 정보. 팀이 없으면 거미 팀으로 본다.
   * @param {Hero} hero
   * @returns {HeroFamily}
   */
  A.findFamily = (hero) => A.HERO_FAMILIES.find((f) => f.id === hero.family) || A.HERO_FAMILIES[0];
})(window.ARAH);

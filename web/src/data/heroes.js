/**
 * @file 히어로 연합: 팀 8개 × 버전 여러 개(총 25명)를 모으는 수집형 히어로 목록.
 * @layer data
 * @depends 없음
 * @see doc/planning/game-design.md (5. 히어로 연합), doc/decisions/ADR-0002-original-characters.md
 *
 * 사용자 결정(2026-10-10, ADR-0002 개정): 재미를 위해 원조 히어로를 강하게 떠올리게 하는 오마주 디자인
 * (대표 색 조합 · 상징 장비 · 실루엣)을 쓴다. 단, 공식 이름 · 로고 · 글자 마크 · 공식 이미지 파일은 쓰지 않고,
 * 그림은 hero-art.js 에서 코드로 직접 그린다. 배포 주소는 가족 범위로만 공유한다.
 *
 * 저장 호환: 이미 배포된 거미 팀 6명의 id · unlockStars 는 바꾸지 않는다 (이미 모은 히어로가 다시 잠기면 안 된다).
 */

/**
 * 히어로 능력. 모두 선택 항목이며, 없으면 기본값을 쓴다 (game/round-scene.js · modes/* 참고).
 * @typedef {Object} HeroAbility
 * @property {number} [comboBonus] 콤보 보너스 점수 배율 (기본 1)
 * @property {number} [hitRadius]  줄 판정 여유 px (기본 10)
 * @property {number} [webSpeed]   줄 · 스윙 · 이동 속도 배율 (기본 1)
 * @property {number} [cooldown]   연사 간격 ms (기본 300)
 * @property {boolean} [hint]      가짜 보기 하나를 흐리게 표시 / 막아 둠
 * @property {number} [hearts]     시작 하트 수 (기본 RULES.baseHearts)
 * @property {number} [slow]       드론 낙하 속도 배율 (기본 1, 작을수록 느림). 스윙 · 문 통과는 제한 시간을 1/slow 배로 늘린다
 * @property {number} [timeBonus]  스윙 · 문 통과 모드 제한 시간 추가 초
 *
 * 능력은 모든 모드에서 의미가 있도록 짝을 지어 준다 (예: 판정 범위 ↔ 생각할 시간).
 */

/**
 * 히어로 외형. game/hero-art.js 가 이 값으로 캐릭터를 그린다.
 * @typedef {Object} HeroLook
 * @property {'classic'|'hood'|'detective'|'pig'|'future'|'armor'|'shield'|'thunder'|'giant'|'archer'|'mystic'|'panther'} style 체형 · 머리 모양
 * @property {string} suit   주 색상 (머리, 몸통, 팔)
 * @property {string} accent 보조 색상 (다리, 허리, 망토 · 방패 · 장갑)
 * @property {string} line   무늬 · 장식 색
 * @property {string} emblem 가슴 문양 · 빛 색
 * @property {string} [skin] 얼굴 · 맨살 색 (얼굴이 보이는 팀)
 * @property {string} [hair] 머리카락 색
 */

/**
 * 히어로 팀. 팀마다 쏘는 "줄"의 이름과 색이 다르다 (거미줄, 레이저 줄 …).
 * @typedef {Object} HeroFamily
 * @property {string} id
 * @property {string} name    팀 이름 (메뉴 도감 제목)
 * @property {string} shot    쏘는 줄 이름. 안내 문구에 쓴다 ("정답 드론에 {shot}을 쏘세요" — 모두 받침 있는 '줄'로 끝나게)
 * @property {number} color   줄 색 (0xRRGGBB)
 * @property {string} trait   팀 공통 특징 한 줄
 */

/**
 * @typedef {Object} Hero
 * @property {string} id           저장 키로 쓰이므로 한번 정하면 바꾸지 않는다
 * @property {string} family       HeroFamily.id
 * @property {string} name
 * @property {string} universe     출신 차원 (멀티버스 설정)
 * @property {string} abilityText  메뉴에 보여 줄 능력 설명
 * @property {HeroAbility} ability
 * @property {number} unlockStars  합류에 필요한 누적 별 수
 * @property {HeroLook} look
 */
(function (A) {
  'use strict';

  /** @type {HeroFamily[]} 메뉴 도감에 보이는 순서 */
  A.HERO_FAMILIES = [
    { id: 'spider', name: '거미 팀', shot: '거미줄', color: 0xffffff, trait: '여러 차원에서 온 거미 히어로' },
    { id: 'armor', name: '아머 팀', shot: '레이저 줄', color: 0x9be7ff, trait: '최첨단 아머, 스캐너로 가짜를 찾아내요' },
    { id: 'shield', name: '방패 팀', shot: '방패 줄', color: 0x4cc9f0, trait: '별 방패로 하트를 지켜요' },
    { id: 'thunder', name: '번개 팀', shot: '번개 줄', color: 0xffd166, trait: '망치를 든 번개의 기사, 아주 빨라요' },
    { id: 'giant', name: '거인 팀', shot: '바위 줄', color: 0x80ed99, trait: '힘센 근육 거인, 큼직하게 잡아요' },
    { id: 'archer', name: '궁수 팀', shot: '화살 줄', color: 0xc77dff, trait: '백발백중 궁수, 콤보 점수가 커요' },
    { id: 'mystic', name: '마법 팀', shot: '마법 줄', color: 0xff9f1c, trait: '마법으로 시간을 느리게 해요' },
    { id: 'panther', name: '표범 팀', shot: '발톱 줄', color: 0xb388ff, trait: '날렵한 왕의 전사, 빠르고 단단해요' },
  ];

  const SKIN = '#f1c27d';

  /** @type {Hero[]} 첫 번째는 기본 히어로(처음부터 합류). 도감은 팀별 · 합류 조건 순서로 묶어 보여 준다 */
  A.HEROES = [
    // ----- 거미 팀 (배포된 히어로: id · unlockStars 유지) -----
    {
      id: 'red', family: 'spider', name: '레드 스파이더', universe: '빨강 차원', unlockStars: 0,
      abilityText: '콤보 점수가 1.5배로 올라가요', ability: { comboBonus: 1.5 },
      look: { style: 'classic', suit: '#d62828', accent: '#1d4ed8', line: '#2a0505', emblem: '#111111' },
    },
    {
      id: 'snow', family: 'spider', name: '스노우 스파이더', universe: '눈꽃 차원', unlockStars: 10,
      abilityText: '줄이 넓게 퍼지고, 스윙 · 문 통과 때 생각할 시간이 2초 더 있어요', ability: { hitRadius: 26, timeBonus: 2 },
      look: { style: 'hood', suit: '#f5f5f5', accent: '#ff4fa3', line: '#a0a0a0', emblem: '#222222' },
    },
    {
      id: 'shadow', family: 'spider', name: '섀도 스파이더', universe: '그림자 차원', unlockStars: 25,
      abilityText: '줄 · 스윙 · 줄 이동이 아주 빨라요', ability: { webSpeed: 1.7, cooldown: 170 },
      look: { style: 'classic', suit: '#1b1b22', accent: '#26262f', line: '#e63946', emblem: '#e63946' },
    },
    {
      id: 'detective', family: 'spider', name: '탐정 스파이더', universe: '흑백 차원', unlockStars: 45,
      abilityText: '가짜 보기 하나를 미리 흐리게 알려줘요', ability: { hint: true },
      look: { style: 'detective', suit: '#3a3a3a', accent: '#1e1e1e', line: '#8a8a8a', emblem: '#bbbbbb' },
    },
    {
      id: 'piggy', family: 'spider', name: '피기 스파이더', universe: '꿀꿀 차원', unlockStars: 70,
      abilityText: '하트를 하나 더 가지고 시작해요', ability: { hearts: 4 },
      look: { style: 'pig', suit: '#ff9eb5', accent: '#d62828', line: '#b5476a', emblem: '#7a1f3d' },
    },
    {
      id: 'future', family: 'spider', name: '퓨처 스파이더', universe: '미래 차원', unlockStars: 100,
      abilityText: '드론과 문이 천천히 다가오고, 스윙 시간도 넉넉해요', ability: { slow: 0.7 },
      look: { style: 'future', suit: '#1e3a8a', accent: '#0f172a', line: '#ef4444', emblem: '#ef4444' },
    },

    // ----- 아머 팀: 빛나는 가슴 코어, 손바닥 빔 / 능력: 스캐너(hint) -----
    {
      id: 'armor-red', family: 'armor', name: '레드 아머', universe: '강철 차원', unlockStars: 15,
      abilityText: '스캐너로 가짜 보기 하나를 미리 알려줘요', ability: { hint: true },
      look: { style: 'armor', suit: '#b5121b', accent: '#f2c14e', line: '#7a0c12', emblem: '#9be7ff' },
    },
    {
      id: 'armor-war', family: 'armor', name: '워 아머', universe: '요새 차원', unlockStars: 55,
      abilityText: '가짜 보기를 알려주고, 하트도 하나 더', ability: { hint: true, hearts: 4 },
      look: { style: 'armor', suit: '#5c6370', accent: '#2b2f36', line: '#1c1f24', emblem: '#9be7ff' },
    },
    {
      id: 'armor-blue', family: 'armor', name: '블루 아머', universe: '빙하 차원', unlockStars: 130,
      abilityText: '가짜 보기를 알려주고, 콤보 점수도 1.3배', ability: { hint: true, comboBonus: 1.3 },
      look: { style: 'armor', suit: '#1d4ed8', accent: '#d9e2ec', line: '#102a75', emblem: '#e0fbfc' },
    },

    // ----- 방패 팀: 파란 슈트 · 가슴 별 · 줄무늬 둥근 방패 / 능력: 하트 -----
    {
      id: 'shield-star', family: 'shield', name: '스타 실드', universe: '자유 차원', unlockStars: 20,
      abilityText: '하트를 하나 더 가지고 시작해요', ability: { hearts: 4 },
      look: { style: 'shield', suit: '#1e40af', accent: '#c1121f', line: '#ffffff', emblem: '#ffffff', skin: SKIN },
    },
    {
      id: 'shield-night', family: 'shield', name: '나이트 실드', universe: '밤 차원', unlockStars: 80,
      abilityText: '하트 +1, 스윙 · 문 통과 시간 +1초', ability: { hearts: 4, timeBonus: 1 },
      look: { style: 'shield', suit: '#1b263b', accent: '#778da9', line: '#e0e1dd', emblem: '#e0e1dd', skin: SKIN },
    },
    {
      id: 'shield-crystal', family: 'shield', name: '크리스탈 실드', universe: '보석 차원', unlockStars: 160,
      abilityText: '하트를 두 개 더 가지고 시작해요', ability: { hearts: 5 },
      look: { style: 'shield', suit: '#5a189a', accent: '#c77dff', line: '#ffffff', emblem: '#ffffff', skin: SKIN },
    },

    // ----- 번개 팀: 빨간 망토 · 은빛 갑옷 · 금발 · 망치 / 능력: 속도 -----
    {
      id: 'thunder-knight', family: 'thunder', name: '썬더 나이트', universe: '하늘 왕국 차원', unlockStars: 30,
      abilityText: '줄 · 스윙 · 이동이 아주 빨라요', ability: { webSpeed: 1.7, cooldown: 170 },
      look: { style: 'thunder', suit: '#2f3542', accent: '#c1121f', line: '#ced4da', emblem: '#ffd166', skin: SKIN, hair: '#f4d35e' },
    },
    {
      id: 'thunder-storm', family: 'thunder', name: '스톰 나이트', universe: '폭풍 차원', unlockStars: 90,
      abilityText: '아주 빠르고, 콤보 점수도 1.3배', ability: { webSpeed: 1.8, cooldown: 150, comboBonus: 1.3 },
      look: { style: 'thunder', suit: '#1f2933', accent: '#1d4ed8', line: '#9aa5b1', emblem: '#90e0ef', skin: SKIN, hair: '#3e2723' },
    },
    {
      id: 'thunder-aurora', family: 'thunder', name: '오로라 나이트', universe: '북극광 차원', unlockStars: 190,
      abilityText: '아주 빠르고, 하트도 하나 더', ability: { webSpeed: 1.8, cooldown: 150, hearts: 4 },
      look: { style: 'thunder', suit: '#264653', accent: '#06d6a0', line: '#e9f5db', emblem: '#f15bb5', skin: SKIN, hair: '#ffffff' },
    },

    // ----- 거인 팀: 근육 거인 · 찢어진 바지 / 능력: 큰 판정 + 시간 여유 -----
    {
      id: 'giant-green', family: 'giant', name: '그린 자이언트', universe: '감마 차원', unlockStars: 35,
      abilityText: '줄이 넓게 퍼지고, 생각할 시간이 2초 더 있어요', ability: { hitRadius: 26, timeBonus: 2 },
      look: { style: 'giant', suit: '#4caf50', accent: '#6a1b9a', line: '#1b5e20', emblem: '#1b5e20', hair: '#1a1a1a' },
    },
    {
      id: 'giant-red', family: 'giant', name: '레드 자이언트', universe: '화산 차원', unlockStars: 110,
      abilityText: '넓은 판정 + 시간 여유 + 콤보 점수 1.2배', ability: { hitRadius: 26, timeBonus: 2, comboBonus: 1.2 },
      look: { style: 'giant', suit: '#c62828', accent: '#263238', line: '#7f0000', emblem: '#7f0000', hair: '#212121' },
    },
    {
      id: 'giant-gray', family: 'giant', name: '그레이 자이언트', universe: '바위산 차원', unlockStars: 220,
      abilityText: '넓은 판정 + 시간 여유 + 천천히 다가와요', ability: { hitRadius: 26, timeBonus: 2, slow: 0.8 },
      look: { style: 'giant', suit: '#9e9e9e', accent: '#37474f', line: '#424242', emblem: '#424242', hair: '#212121' },
    },

    // ----- 궁수 팀: 보라 · 검정 슈트 · 활 · 화살통 / 능력: 콤보 -----
    {
      id: 'archer-purple', family: 'archer', name: '퍼플 애로우', universe: '과녁 차원', unlockStars: 40,
      abilityText: '콤보 점수 1.4배, 줄도 조금 빨라요', ability: { comboBonus: 1.4, webSpeed: 1.3 },
      look: { style: 'archer', suit: '#4a148c', accent: '#1a1a1a', line: '#d1c4e9', emblem: '#ce93d8', skin: SKIN, hair: '#5d4037' },
    },
    {
      id: 'archer-shadow', family: 'archer', name: '레드 섀도', universe: '비밀 요원 차원', unlockStars: 120,
      abilityText: '콤보 점수 1.6배, 가짜 보기도 알려줘요', ability: { comboBonus: 1.6, hint: true },
      look: { style: 'archer', suit: '#1a1a1a', accent: '#2b2b2b', line: '#b71c1c', emblem: '#e53935', skin: SKIN, hair: '#c62828' },
    },
    {
      id: 'archer-gold', family: 'archer', name: '골드 애로우', universe: '황금 숲 차원', unlockStars: 260,
      abilityText: '콤보 점수 2배! 줄도 빨라요', ability: { comboBonus: 2, webSpeed: 1.5 },
      look: { style: 'archer', suit: '#b8860b', accent: '#3e2723', line: '#fff3b0', emblem: '#fff3b0', skin: SKIN, hair: '#f4d35e' },
    },

    // ----- 마법 팀: 파란 로브 · 빨간 망토 · 마법진 / 능력: 시간 느리게 -----
    {
      id: 'mystic-master', family: 'mystic', name: '미스틱 마스터', universe: '거울 차원', unlockStars: 140,
      abilityText: '마법으로 시간이 천천히 흘러요 (드론 · 문 느리게, 생각할 시간 +1초)', ability: { slow: 0.75, timeBonus: 1 },
      look: { style: 'mystic', suit: '#1a237e', accent: '#b71c1c', line: '#ffb300', emblem: '#2e7d32', skin: SKIN, hair: '#3e2723' },
    },
    {
      id: 'mystic-dark', family: 'mystic', name: '다크 미스틱', universe: '어둠 차원', unlockStars: 240,
      abilityText: '시간이 더 천천히 흐르고, 가짜 보기도 알려줘요', ability: { slow: 0.7, timeBonus: 1, hint: true },
      look: { style: 'mystic', suit: '#212121', accent: '#4a148c', line: '#76ff03', emblem: '#76ff03', skin: SKIN, hair: '#e0e0e0' },
    },

    // ----- 표범 팀: 검은 슈트 · 고양이 귀 마스크 · 은빛 무늬 / 능력: 속도 + 하트 -----
    {
      id: 'panther-night', family: 'panther', name: '나이트 팬서', universe: '비밀 왕국 차원', unlockStars: 150,
      abilityText: '날렵해서 빠르고, 하트도 하나 더', ability: { webSpeed: 1.4, hearts: 4 },
      look: { style: 'panther', suit: '#151515', accent: '#2a2a2a', line: '#c0c0c0', emblem: '#b388ff' },
    },
    {
      id: 'panther-gold', family: 'panther', name: '골드 팬서', universe: '황금 왕국 차원', unlockStars: 280,
      abilityText: '아주 빠르고, 하트 +1, 콤보 점수 1.3배', ability: { webSpeed: 1.6, hearts: 4, comboBonus: 1.3 },
      look: { style: 'panther', suit: '#3d2b00', accent: '#1f1600', line: '#ffd54f', emblem: '#ffd54f' },
    },
  ];

  /**
   * id 로 히어로를 찾는다. 저장된 id 가 사라졌을 때를 대비해 없으면 기본 히어로를 돌려준다.
   * @param {string} id
   * @returns {Hero}
   */
  A.findHero = (id) => A.HEROES.find((h) => h.id === id) || A.HEROES[0];

  /**
   * 히어로의 팀 정보. 팀이 없으면 거미 팀으로 본다.
   * @param {Hero} hero
   * @returns {HeroFamily}
   */
  A.findFamily = (hero) => A.HERO_FAMILIES.find((f) => f.id === hero.family) || A.HERO_FAMILIES[0];
})(window.ARAH);

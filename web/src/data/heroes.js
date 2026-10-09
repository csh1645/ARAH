/**
 * @file 멀티버스 거미 히어로 목록 (오리지널 캐릭터).
 * @layer data
 * @depends 없음
 * @see doc/planning/game-design.md (5. 멀티버스 히어로), doc/decisions/ADR-0002-original-characters.md
 */

/**
 * 히어로 능력. 모두 선택 항목이며, 없으면 기본값을 쓴다 (game/play-scene.js 참고).
 * @typedef {Object} HeroAbility
 * @property {number} [comboBonus] 콤보 보너스 점수 배율 (기본 1)
 * @property {number} [hitRadius]  거미줄 판정 여유 px (기본 10)
 * @property {number} [webSpeed]   거미줄 속도 배율 (기본 1)
 * @property {number} [cooldown]   연사 간격 ms (기본 300)
 * @property {boolean} [hint]      가짜 드론 하나를 흐리게 표시
 * @property {number} [hearts]     시작 하트 수 (기본 RULES.baseHearts)
 * @property {number} [slow]       드론 낙하 속도 배율 (기본 1, 작을수록 느림). 스윙 · 문 통과는 제한 시간을 1/slow 배로 늘린다
 * @property {number} [timeBonus]  스윙 · 문 통과 모드 제한 시간 추가 초
 *
 * 능력은 모든 모드에서 의미가 있도록 짝을 지어 준다 (예: 판정 범위 ↔ 생각할 시간).
 */

/**
 * 히어로 외형. game/hero-art.js 가 이 값으로 캐릭터를 그린다.
 * @typedef {Object} HeroLook
 * @property {'classic'|'hood'|'detective'|'pig'|'future'} style 머리 모양
 * @property {string} suit   주 색상 (머리, 몸통, 팔)
 * @property {string} accent 보조 색상 (다리, 허리, 후드)
 * @property {string} line   마스크의 거미줄 무늬 색
 * @property {string} emblem 가슴 거미 문양 색
 */

/**
 * @typedef {Object} Hero
 * @property {string} id           저장 키로 쓰이므로 한번 정하면 바꾸지 않는다
 * @property {string} name
 * @property {string} universe     출신 차원 (멀티버스 설정)
 * @property {string} abilityText  메뉴에 보여 줄 능력 설명
 * @property {HeroAbility} ability
 * @property {number} unlockStars  합류에 필요한 누적 별 수
 * @property {HeroLook} look
 */
(function (A) {
  'use strict';

  /** @type {Hero[]} 합류 조건(unlockStars) 오름차순으로 둔다. 첫 번째는 기본 히어로. */
  A.HEROES = [
    {
      id: 'red',
      name: '레드 스파이더',
      universe: '빨강 차원',
      abilityText: '콤보 점수가 1.5배로 올라가요',
      ability: { comboBonus: 1.5 },
      unlockStars: 0,
      look: { style: 'classic', suit: '#d62828', accent: '#1d4ed8', line: '#2a0505', emblem: '#111111' },
    },
    {
      id: 'snow',
      name: '스노우 스파이더',
      universe: '눈꽃 차원',
      abilityText: '거미줄이 넓게 퍼지고, 스윙 · 문 통과 때 생각할 시간이 2초 더 있어요',
      ability: { hitRadius: 26, timeBonus: 2 },
      unlockStars: 10,
      look: { style: 'hood', suit: '#f5f5f5', accent: '#ff4fa3', line: '#a0a0a0', emblem: '#222222' },
    },
    {
      id: 'shadow',
      name: '섀도 스파이더',
      universe: '그림자 차원',
      abilityText: '거미줄 · 스윙 · 줄 이동이 아주 빨라요',
      ability: { webSpeed: 1.7, cooldown: 170 },
      unlockStars: 25,
      look: { style: 'classic', suit: '#1b1b22', accent: '#26262f', line: '#e63946', emblem: '#e63946' },
    },
    {
      id: 'detective',
      name: '탐정 스파이더',
      universe: '흑백 차원',
      abilityText: '가짜 보기 하나를 미리 흐리게 알려줘요',
      ability: { hint: true },
      unlockStars: 45,
      look: { style: 'detective', suit: '#3a3a3a', accent: '#1e1e1e', line: '#8a8a8a', emblem: '#bbbbbb' },
    },
    {
      id: 'piggy',
      name: '피기 스파이더',
      universe: '꿀꿀 차원',
      abilityText: '하트를 하나 더 가지고 시작해요',
      ability: { hearts: 4 },
      unlockStars: 70,
      look: { style: 'pig', suit: '#ff9eb5', accent: '#d62828', line: '#b5476a', emblem: '#7a1f3d' },
    },
    {
      id: 'future',
      name: '퓨처 스파이더',
      universe: '미래 차원',
      abilityText: '드론과 문이 천천히 다가오고, 스윙 시간도 넉넉해요',
      ability: { slow: 0.7 },
      unlockStars: 100,
      look: { style: 'future', suit: '#1e3a8a', accent: '#0f172a', line: '#ef4444', emblem: '#ef4444' },
    },
  ];

  /**
   * id 로 히어로를 찾는다. 저장된 id 가 사라졌을 때를 대비해 없으면 기본 히어로를 돌려준다.
   * @param {string} id
   * @returns {Hero}
   */
  A.findHero = (id) => A.HEROES.find((h) => h.id === id) || A.HEROES[0];
})(window.ARAH);

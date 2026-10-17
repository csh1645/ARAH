/**
 * @file 히어로 목록: 영화 원조 히어로(마블 · DC) + 산리오 · 치이카와 캐릭터 (공식 이름 — 가족 내부용, ADR-0010)를 한 명씩 둔다.
 *       스타를 모으면 **목록 순서대로 한 명씩** 합류한다. 새 히어로는 목록 끝에 한 줄 추가하면 다음 합류 히어로가 된다
 *       (이미 모은 스타 · 합류한 히어로는 그대로). 히어로 수에 상한은 없다.
 * @layer data
 * @depends 없음
 * @see doc/planning/game-design.md (5. 히어로 연합), doc/decisions/ADR-0002-original-characters.md
 *
 * 스타 규칙:
 *   - 판이 끝나면 받은 스타는 한 곳(⭐ stars)에 쌓인다. 어떤 히어로로 플레이해도 같다
 *   - n번째(0부터) 히어로의 합류 조건 = unlockStarsAt(n). 다음 히어로까지의 간격이 한 판 최대 스타(10 + 퍼펙트 3 = 13)보다 커서
 *     한 판에 한 명씩만 합류한다. 뒤로 갈수록 간격이 조금씩 늘어난다
 *   - 목록 순서 = 합류 순서. 앞쪽 8명은 능력 종류가 모두 달라 초반부터 여러 놀이를 맛본다. 능력도 뒤로 갈수록 세진다
 *
 * 히어로 추가: 목록 끝에 h(...) 한 줄 + data/hero-lines.js 한마디 (+ 3D 모양 look). 능력 종류(family)는 아래 8가지 중 하나.
 * 저장 호환: id 는 한번 정하면 바꾸지 않는다 (순서를 바꿔도 이미 합류한 히어로는 unlocked 에 남아 그대로 열려 있다).
 *            예전 id(팀 × 색 시절)는 HERO_ID_MAP 으로 옮긴다.
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
 * @property {string} [hair] 머리카락 색
 * @property {'m'|'f'} [body] 3D 몸 (기본 m) — game/three/hero3d.js
 * @property {string} [pattern] 3D 슈트 무늬 (game/three/hero-suit.js PATTERN): plain · web · plates · stripes · discs · skin · tribal · amazon · robe · rock · bark · sides · tactical · scales
 * @property {string} [mark]    3D 가슴 문양 (hero-suit.js MARK): none · spider · spiderBig · star · bat · super · bolt · arc · lantern · amulet · eagle · beetle · bird · x · hourglass
 * @property {string} [head]    3D 머리 (hero-suit.js HEAD): face(맨얼굴) · mask(전체 마스크) · faceplate · helmet · cowl(입 보임) · domino(눈가면) · tint(피부색 전체) · android
 * @property {string} [cape]    망토 색 (없으면 망토 없음)
 * @property {string[]} [gear]  장비: shield · hammer · bow · quiver · ring · cannon · wings · tiara · trident · horns · claws · spear · sword
 * @property {string} [glove]   장갑 색 (기본 accent) / [boot] 부츠 색 (기본 accent) / [lens] 마스크 눈 색 (기본 흰색) / [skinTint] tint 머리 피부색
 * @property {number} [bulk]    몸집 배율 (기본 1)
 * @property {string} [mascot]  마스코트 종류 (game/hero-art.js mascotHead): 산리오 kitty · melody · kuromi · cinnamo · purin · pochacco · keroppi · badtz,
 *           치이카와 chiikawa · hachiware · usagi
 *           마스코트 색: body3(몸 · 옷) · legs · boot · hands · bow(헬로키티 리본) · outfit(멜빵바지)
 * @property {number} [sides] [belt] [hood] [ears] [catEars] [fins] [metalArm] [topSuit] [lensBig] [webHeadOnly] [helmetMetal] [bald] 모양 켜기 (1)
 * @property {'parted'|'long'|'buns'|'buzzed'} [hairStyle] 3D 머리 모양 (기본: 팀 · 몸에 따라)
 * @property {boolean} [beard] 3D 턱수염
 */

/**
 * 히어로 팀.
 * @typedef {Object} HeroFamily
 * @property {string} id
 * @property {string} name     능력 이름 (예: 거미줄)
 * @property {string} shot     쏘는 줄 이름 ("정답 드론에 {shot}을 쏘세요" — 모두 받침 있는 '줄'로 끝나게)
 * @property {number} color    줄 색
 * @property {string} trait    능력 설명
 * @property {string} star     능력 아이콘
 * @property {'web'|'laser'|'shield'|'bolt'|'rock'|'arrow'|'orb'|'claw'} attack 공격 스타일 (game/attacks.js 의 A.ATTACKS 키)
 * @property {'swing'|'fly'|'vault'|'bolt'|'leap'|'zip'|'teleport'|'pounce'} travel 빌딩 스윙 모드의 이동 방법
 * @property {string} travelName 이동 이름 (안내 문구)
 * @property {string} fail     빌딩 스윙에서 오답일 때 문구
 */

/**
 * @typedef {Object} Hero
 * @property {string} id           저장 키 (바꾸지 않는다)
 * @property {string} family       능력 종류 (HeroFamily.id)
 * @property {string} name
 * @property {string} universe     출신 차원
 * @property {string} abilityText
 * @property {HeroAbility} ability
 * @property {number} unlockStars  합류에 필요한 스타 합계 (목록 순서로 정해진다, 0 = 처음부터)
 * @property {HeroLook} look
 */
(function (A) {
  'use strict';

  /**
   * n번째(0부터) 히어로의 합류에 필요한 스타 합계. 간격 = 14 + floor(k / 4) (k번째 간격) — 한 판 최대 13 보다 커서 한 명씩.
   * 48명 기준 마지막 히어로 약 920 스타 (예전 팀별 조건 합계와 비슷한 분량).
   * @param {number} n
   * @returns {number}
   */
  A.unlockStarsAt = function (n) {
    let total = 0;
    for (let k = 1; k <= n; k++) total += 14 + Math.floor(k / 4);
    return total;
  };

  /**
   * 능력 종류 (예전 "팀"). 히어로가 쓰는 공격 · 이동 방식 묶음이며, 히어로마다 하나를 고른다 (Hero.family).
   * @type {HeroFamily[]}
   * attack: 보기를 고를 때 날아가는 공격 모양 (game/attacks.js 의 ATTACKS 키 — 드론 잡기 · 철자 잇기 · 보스 배틀)
   * travel: 빌딩 스윙 모드에서 정답 빌딩으로 건너가는 방법 (game/travels.js 의 TRAVELS 키)
   * travelName: 안내 문구에 쓰는 이동 이름 / fail: 오답 빌딩을 골랐을 때 문구
   */
  A.HERO_FAMILIES = [
    { id: 'spider', name: '거미줄', shot: '거미줄', color: 0xffffff, trait: '여러 유니버스에서 온 스파이더 히어로', star: '🕸️',
      attack: 'web', travel: 'swing', travelName: '거미줄 스윙', fail: '앗! 줄이 끊어졌어요' },
    { id: 'armor', name: '슈트 빔', shot: '레이저 줄', color: 0x9be7ff, trait: '최첨단 슈트, 스캐너로 가짜를 찾아내요', star: '⚙️',
      attack: 'laser', travel: 'fly', travelName: '제트 비행', fail: '앗! 추진기가 멈췄어요' },
    { id: 'shield', name: '방패', shot: '방패 줄', color: 0x4cc9f0, trait: '방패와 용기로 하트를 지켜요', star: '🛡️',
      attack: 'shield', travel: 'vault', travelName: '방패 공중제비', fail: '앗! 방패가 튕겨 나왔어요' },
    { id: 'thunder', name: '번개', shot: '번개 줄', color: 0xffd166, trait: '번개처럼 아주 빨라요', star: '⚡',
      attack: 'bolt', travel: 'bolt', travelName: '번개 비행', fail: '앗! 번개가 빗나갔어요' },
    { id: 'giant', name: '파워', shot: '바위 줄', color: 0x80ed99, trait: '엄청난 힘, 큼직하게 잡아요', star: '💪',
      attack: 'rock', travel: 'leap', travelName: '거인 점프', fail: '앗! 점프가 짧았어요' },
    { id: 'archer', name: '명중', shot: '화살 줄', color: 0xc77dff, trait: '백발백중 명사수와 첩보원, 콤보 점수가 커요', star: '🎯',
      attack: 'arrow', travel: 'zip', travelName: '화살 줄타기', fail: '앗! 화살이 빠졌어요' },
    { id: 'mystic', name: '마법', shot: '마법 줄', color: 0xff9f1c, trait: '마법으로 시간을 느리게 해요', star: '🔮',
      attack: 'orb', travel: 'teleport', travelName: '순간이동', fail: '앗! 포털이 닫혔어요' },
    { id: 'panther', name: '발톱', shot: '발톱 줄', color: 0xb388ff, trait: '날렵한 발톱 전사, 빠르고 단단해요', star: '🐾',
      attack: 'claw', travel: 'pounce', travelName: '표범 점프', fail: '앗! 발이 미끄러졌어요' },
  ];

  /** 짧게 쓰기 위한 생성 함수 (합류 조건은 목록 순서로 아래에서 채운다) */
  const h = (id, family, name, universe, abilityText, ability, look) =>
    ({ id, family, name, universe, abilityText, ability, unlockStars: 0, look });

  /** @type {Hero[]} 목록 순서 = 합류 순서. 첫 번째는 처음부터 함께하는 기본 히어로 (저장된 id 가 없을 때도) */
  A.HEROES = [
    // ---- 1~8번째 합류 ----
    h('spider-man', 'spider', '스파이더맨', '스파이더맨 · 어벤져스', '콤보 점수가 1.5배로 올라가요', { comboBonus: 1.5 },
      { style: 'classic', suit: '#d62828', accent: '#1d4ed8', line: '#1a0505', emblem: '#111111', pattern: 'web', sides: 1, mark: 'spider', head: 'mask' }),
    h('iron-man', 'armor', '아이언맨', '아이언맨 · 어벤져스', '스캐너로 가짜 보기 하나를 알려줘요', { hint: true },
      { style: 'armor', suit: '#b5121b', accent: '#f2c14e', line: '#5a080d', emblem: '#9be7ff', pattern: 'plates', mark: 'arc', head: 'faceplate' }),
    h('captain-america', 'shield', '캡틴 아메리카', '캡틴 아메리카 · 어벤져스', '하트를 하나 더 가지고 시작해요', { hearts: 4 },
      { style: 'shield', suit: '#1e40af', accent: '#c1121f', line: '#ffffff', emblem: '#ffffff', pattern: 'stripes', mark: 'star', head: 'helmet', gear: ['shield'], skin: '#f1c27d' }),
    h('hello-kitty', 'shield', '헬로키티', '산리오', '하트를 하나 더 가지고 시작해요', { hearts: 4 },
      { style: 'classic', mascot: 'kitty', suit: '#ffffff', accent: '#1d4ed8', line: '#e53935', emblem: '#e53935', bow: '#e53935', body3: '#e53935', legs: '#1d4ed8', boot: '#ffffff', hands: '#ffffff', outfit: 1 }),
    h('thor', 'thunder', '토르', '토르 · 어벤져스', '줄 · 스윙 · 이동이 아주 빨라요', { webSpeed: 1.7, cooldown: 170 },
      { style: 'thunder', suit: '#2f3542', accent: '#c1121f', line: '#ced4da', emblem: '#ffd166', pattern: 'discs', mark: 'none', head: 'face', hair: '#f4d35e', hairStyle: 'long', beard: 1, cape: '#c1121f', gear: ['hammer'] }),
    h('chiikawa', 'shield', '치이카와', '치이카와', '하트를 하나 더 가지고 시작해요', { hearts: 4 },
      { style: 'classic', mascot: 'chiikawa', suit: '#ffffff', accent: '#ffb3c1', line: '#f06292', emblem: '#ffb3c1', body3: '#ffffff', legs: '#ffffff', boot: '#ffffff', hands: '#ffffff' }),
    h('hulk', 'giant', '헐크', '어벤져스', '줄이 넓게 퍼지고, 생각할 시간이 2초 더', { hitRadius: 26, timeBonus: 2 },
      { style: 'giant', suit: '#4caf50', accent: '#6a1b9a', line: '#1b5e20', emblem: '#1b5e20', pattern: 'skin', mark: 'none', head: 'tint', hair: '#1a1a1a', hairStyle: 'buzzed', bulk: 1.3 }),
    h('hawkeye', 'archer', '호크아이', '어벤져스 · 호크아이', '콤보 점수 1.4배, 줄도 조금 빨라요', { comboBonus: 1.4, webSpeed: 1.3 },
      { style: 'archer', suit: '#3b1f5c', accent: '#1a1a1a', line: '#7b4fb0', emblem: '#ce93d8', pattern: 'tactical', mark: 'none', head: 'face', hair: '#5d4037', hairStyle: 'buzzed', gear: ['bow', 'quiver'] }),
    // ---- 9~16번째 합류 ----
    h('doctor-strange', 'mystic', '닥터 스트레인지', '닥터 스트레인지 · 어벤져스', '마법으로 시간이 천천히 흘러요', { slow: 0.75, timeBonus: 1 },
      { style: 'mystic', suit: '#1a237e', accent: '#c9a227', line: '#c9a227', emblem: '#43a047', pattern: 'robe', mark: 'amulet', head: 'face', hair: '#2b2b2b', hairStyle: 'parted', beard: 1, cape: '#b71c1c', gear: ['ring'] }),
    h('black-panther', 'panther', '블랙 팬서', '블랙 팬서', '날렵해서 빠르고, 하트도 하나 더', { webSpeed: 1.4, hearts: 4 },
      { style: 'panther', suit: '#151515', accent: '#2a2a2a', line: '#c0c0c0', emblem: '#b388ff', pattern: 'tribal', mark: 'none', head: 'mask', catEars: 1 }),
    h('my-melody', 'mystic', '마이멜로디', '산리오', '마법으로 시간이 천천히 흘러요', { slow: 0.75, timeBonus: 1 },
      { style: 'classic', mascot: 'melody', suit: '#ff9ec7', accent: '#ff4f8b', line: '#ffffff', emblem: '#ff4f8b', body3: '#ff9ec7', legs: '#ffffff', boot: '#ffffff', hands: '#ffffff' }),
    h('miles-morales', 'spider', '마일스 모랄레스', '스파이더맨: 뉴 유니버스', '줄이 넓게 퍼지고, 생각할 시간이 2초 더 있어요', { hitRadius: 26, timeBonus: 2 },
      { style: 'classic', suit: '#141419', accent: '#141419', line: '#e63946', emblem: '#e63946', pattern: 'web', mark: 'spiderBig', head: 'mask' }),
    h('hachiware', 'spider', '하치와레', '치이카와', '콤보 점수가 1.4배로 올라가요', { comboBonus: 1.4 },
      { style: 'classic', mascot: 'hachiware', suit: '#ffffff', accent: '#8fa9c4', line: '#5b7393', emblem: '#8fa9c4', body3: '#ffffff', legs: '#ffffff', boot: '#ffffff', hands: '#ffffff' }),
    h('war-machine', 'armor', '워머신', '아이언맨 2 · 어벤져스', '스캐너 + 하트 하나 더', { hint: true, hearts: 4 },
      { style: 'armor', suit: '#5c6370', accent: '#2b2f36', line: '#1c1f24', emblem: '#9be7ff', pattern: 'plates', mark: 'arc', head: 'faceplate', gear: ['cannon'] }),
    h('wonder-woman', 'shield', '원더우먼', '원더우먼 · 저스티스 리그', '하트 +1, 시간 +1초', { hearts: 4, timeBonus: 1 },
      { style: 'shield', suit: '#b71c1c', accent: '#1d4ed8', line: '#f2c14e', emblem: '#f2c14e', pattern: 'amazon', mark: 'eagle', head: 'face', body: 'f', hair: '#1a1a1a', hairStyle: 'long', gear: ['tiara', 'shield'], boot: '#b71c1c', skin: '#e8b98a' }),
    h('flash', 'thunder', '플래시', '플래시 · 저스티스 리그', '아주 빠르고, 콤보 점수 1.3배', { webSpeed: 1.8, cooldown: 150, comboBonus: 1.3 },
      { style: 'thunder', suit: '#c62828', accent: '#ffd600', line: '#ffd600', emblem: '#ffd600', pattern: 'plain', mark: 'bolt', head: 'cowl', glove: '#c62828', boot: '#ffd600' }),
    // ---- 17~24번째 합류 ----
    h('superman', 'giant', '슈퍼맨', '맨 오브 스틸 · 슈퍼맨', '넓은 판정 + 시간 + 콤보 1.2배', { hitRadius: 26, timeBonus: 2, comboBonus: 1.2 },
      { style: 'giant', suit: '#1d4ed8', accent: '#c62828', line: '#f2c14e', emblem: '#c62828', pattern: 'plain', belt: 1, mark: 'super', head: 'face', hair: '#111111', hairStyle: 'parted', cape: '#c62828', glove: '#1d4ed8', boot: '#c62828', bulk: 1.08 }),
    h('cinnamoroll', 'thunder', '시나모롤', '산리오', '큰 귀로 날아서 아주 빨라요', { webSpeed: 1.7, cooldown: 170 },
      { style: 'classic', mascot: 'cinnamo', suit: '#ffffff', accent: '#8fd3ff', line: '#8fd3ff', emblem: '#8fd3ff', body3: '#ffffff', legs: '#ffffff', boot: '#ffffff', hands: '#ffffff' }),
    h('black-widow', 'archer', '블랙 위도우', '블랙 위도우 · 어벤져스', '콤보 1.5배, 가짜 보기도 알려줘요', { comboBonus: 1.5, hint: true },
      { style: 'archer', suit: '#141414', accent: '#262626', line: '#c62828', emblem: '#e53935', pattern: 'tactical', belt: 1, mark: 'hourglass', head: 'face', body: 'f', hair: '#b5341f', hairStyle: 'long' }),
    h('usagi', 'thunder', '우사기', '치이카와', '아주 빨라요, 콤보 1.3배', { webSpeed: 1.8, cooldown: 160, comboBonus: 1.3 },
      { style: 'classic', mascot: 'usagi', suit: '#f6e7b0', accent: '#f7b7c3', line: '#c9a96a', emblem: '#f7b7c3', body3: '#f6e7b0', legs: '#f6e7b0', boot: '#f6e7b0', hands: '#f6e7b0' }),
    h('scarlet-witch', 'mystic', '스칼렛 위치', '닥터 스트레인지: 대혼돈의 멀티버스', '시간이 천천히 + 가짜 보기 알림', { slow: 0.75, timeBonus: 1, hint: true },
      { style: 'mystic', suit: '#8e0e1e', accent: '#4a0510', line: '#ff4d6d', emblem: '#ff4d6d', pattern: 'robe', mark: 'none', head: 'face', body: 'f', hair: '#9c2a1a', hairStyle: 'long', cape: '#8e0e1e', gear: ['tiara', 'ring'] }),
    h('wolverine', 'panther', '울버린', '엑스맨 · 데드풀과 울버린', '빠르고, 하트 +1, 콤보 1.3배', { webSpeed: 1.6, hearts: 4, comboBonus: 1.3 },
      { style: 'panther', suit: '#ffd600', accent: '#1d4ed8', line: '#111111', emblem: '#c62828', pattern: 'sides', belt: 1, mark: 'x', head: 'cowl', fins: 1, gear: ['claws'], glove: '#1d4ed8', boot: '#1d4ed8' }),
    h('spider-gwen', 'spider', '스파이더 그웬', '스파이더맨: 어크로스 더 유니버스', '줄 · 스윙 · 이동이 아주 빨라요', { webSpeed: 1.7, cooldown: 170 },
      { style: 'hood', suit: '#f5f5f5', accent: '#ff4fa3', line: '#3a3a3a', emblem: '#111111', pattern: 'web', webHeadOnly: 1, mark: 'spider', head: 'mask', hood: 1, body: 'f', glove: '#00bcd4', boot: '#00bcd4' }),
    h('vision', 'armor', '비전', '어벤져스: 에이지 오브 울트론', '스캐너 + 콤보 점수 1.3배', { hint: true, comboBonus: 1.3 },
      { style: 'armor', suit: '#2e7d32', accent: '#f2c14e', line: '#c62828', emblem: '#ffd54f', pattern: 'sides', mark: 'none', head: 'android', cape: '#f2c14e' }),
    // ---- 25~32번째 합류 ----
    h('pompompurin', 'giant', '폼폼푸린', '산리오', '넓은 판정 + 생각할 시간 2초 더', { hitRadius: 26, timeBonus: 2 },
      { style: 'classic', mascot: 'purin', suit: '#ffd54f', accent: '#8d5524', line: '#8d5524', emblem: '#8d5524', body3: '#ffd54f', legs: '#ffd54f', boot: '#ffd54f', hands: '#ffd54f' }),
    h('falcon', 'shield', '팔콘', '캡틴 아메리카: 윈터 솔져', '하트를 두 개 더 가지고 시작해요', { hearts: 5 },
      { style: 'shield', suit: '#37474f', accent: '#c62828', line: '#eceff1', emblem: '#c62828', pattern: 'tactical', mark: 'none', head: 'domino', gear: ['wings'], hair: '#1a1a1a', hairStyle: 'buzzed', skin: '#8d5524' }),
    h('captain-marvel', 'thunder', '캡틴 마블', '캡틴 마블', '아주 빠르고, 하트도 하나 더', { webSpeed: 1.8, cooldown: 150, hearts: 4 },
      { style: 'thunder', suit: '#1d4ed8', accent: '#c62828', line: '#f2c14e', emblem: '#f2c14e', pattern: 'sides', mark: 'star', head: 'face', body: 'f', hair: '#e8c66a', hairStyle: 'long', glove: '#1d4ed8', boot: '#c62828' }),
    h('groot', 'giant', '그루트', '가디언즈 오브 갤럭시', '넓은 판정 + 시간 + 천천히', { hitRadius: 26, timeBonus: 2, slow: 0.8 },
      { style: 'giant', suit: '#7b5a3c', accent: '#5d4037', line: '#3e2a1a', emblem: '#7cb342', pattern: 'bark', mark: 'none', head: 'tint', bulk: 1.15 }),
    h('batman', 'archer', '배트맨', '더 배트맨 · 저스티스 리그', '콤보 1.6배', { comboBonus: 1.6, webSpeed: 1.3 },
      { style: 'archer', suit: '#3b3f45', accent: '#111111', line: '#f2c14e', emblem: '#111111', pattern: 'plates', belt: 1, mark: 'bat', head: 'cowl', ears: 1, cape: '#111111', glove: '#111111', boot: '#111111' }),
    h('green-lantern', 'mystic', '그린 랜턴', '그린 랜턴', '시간이 더 천천히 (+2초)', { slow: 0.7, timeBonus: 2 },
      { style: 'mystic', suit: '#2e7d32', accent: '#111111', line: '#e8f5e9', emblem: '#76ff03', pattern: 'sides', mark: 'lantern', head: 'domino', hair: '#3e2723', hairStyle: 'parted', glove: '#f5f5f5', gear: ['ring'] }),
    h('pochacco', 'spider', '포차코', '산리오', '콤보 점수가 1.4배로 올라가요', { comboBonus: 1.4 },
      { style: 'classic', mascot: 'pochacco', suit: '#ffffff', accent: '#1a1a1a', line: '#1a1a1a', emblem: '#1a1a1a', body3: '#ffffff', legs: '#ffffff', boot: '#ffffff', hands: '#ffffff' }),
    h('catwoman', 'panther', '캣우먼', '더 배트맨', '빠르고, 하트 +1, 시간 +1초', { webSpeed: 1.5, hearts: 4, timeBonus: 1 },
      { style: 'panther', suit: '#111111', accent: '#1c1c1c', line: '#3a3a3a', emblem: '#3a3a3a', pattern: 'plain', mark: 'none', head: 'cowl', catEars: 1, body: 'f', gear: ['claws'] }),
    // ---- 33~40번째 합류 ----
    h('spider-man-2099', 'spider', '스파이더맨 2099', '스파이더맨: 어크로스 더 유니버스', '가짜 보기 하나를 미리 알려줘요', { hint: true },
      { style: 'future', suit: '#1e3a8a', accent: '#0f172a', line: '#ef4444', emblem: '#ef4444', pattern: 'plain', mark: 'spiderBig', head: 'mask', lens: '#ff3344' }),
    h('cyborg', 'armor', '사이보그', '저스티스 리그', '스캐너 + 빠른 줄', { hint: true, webSpeed: 1.5, cooldown: 200 },
      { style: 'armor', suit: '#9aa5b1', accent: '#2b2f36', line: '#ff1744', emblem: '#ff1744', pattern: 'plates', mark: 'arc', head: 'faceplate' }),
    h('winter-soldier', 'shield', '윈터 솔져', '캡틴 아메리카: 윈터 솔져', '하트 +1, 콤보 점수 1.3배', { hearts: 4, comboBonus: 1.3 },
      { style: 'shield', suit: '#212121', accent: '#2f2f2f', line: '#b0bec5', emblem: '#c62828', pattern: 'tactical', metalArm: 1, mark: 'none', head: 'face', hair: '#2b1d14', hairStyle: 'long' }),
    h('shazam', 'thunder', '샤잠', '샤잠!', '아주 빠르고, 시간 +1초', { webSpeed: 1.8, cooldown: 150, timeBonus: 1 },
      { style: 'thunder', suit: '#c62828', accent: '#f2c14e', line: '#f2c14e', emblem: '#f2c14e', pattern: 'plain', belt: 1, mark: 'bolt', head: 'face', hair: '#1a1a1a', hairStyle: 'parted', cape: '#f5f5f5', glove: '#c62828', boot: '#f2c14e' }),
    h('keroppi', 'archer', '케로피', '산리오', '콤보 1.5배, 점프도 빨라요', { comboBonus: 1.5, webSpeed: 1.3 },
      { style: 'classic', mascot: 'keroppi', suit: '#4caf50', accent: '#e91e63', line: '#2e7d32', emblem: '#e91e63', body3: '#4caf50', legs: '#4caf50', boot: '#4caf50', hands: '#4caf50' }),
    h('the-thing', 'giant', '씽', '판타스틱 4: 새로운 출발', '넓은 판정 + 시간 + 하트 +1', { hitRadius: 26, timeBonus: 2, hearts: 4 },
      { style: 'giant', suit: '#d9822b', accent: '#1d4ed8', line: '#6b3a0e', emblem: '#ffffff', pattern: 'rock', mark: 'none', head: 'tint', bulk: 1.3 }),
    h('ant-man', 'archer', '앤트맨', '앤트맨', '콤보 1.6배, 하트 +1', { comboBonus: 1.6, hearts: 4 },
      { style: 'archer', suit: '#b71c1c', accent: '#212121', line: '#9e9e9e', emblem: '#9e9e9e', pattern: 'sides', mark: 'none', head: 'mask', lens: '#ff5252', helmetMetal: 1 }),
    h('shang-chi', 'mystic', '샹치', '샹치와 텐 링즈의 전설', '천천히 + 하트 +1', { slow: 0.7, timeBonus: 1, hearts: 4 },
      { style: 'mystic', suit: '#b71c1c', accent: '#1a1a1a', line: '#f2c14e', emblem: '#f2c14e', pattern: 'robe', mark: 'none', head: 'face', hair: '#111111', hairStyle: 'parted', gear: ['ring'], skin: '#e0ac69' }),
    // ---- 41~48번째 합류 ----
    h('shuri', 'panther', '슈리', '블랙 팬서: 와칸다 포에버', '아주 빠르고, 하트 +1', { webSpeed: 1.8, cooldown: 170, hearts: 4 },
      { style: 'panther', suit: '#151515', accent: '#c9a227', line: '#c9a227', emblem: '#c9a227', pattern: 'tribal', mark: 'none', head: 'mask', catEars: 1, body: 'f' }),
    h('spider-woman', 'spider', '스파이더 우먼', '스파이더맨: 어크로스 더 유니버스', '하트를 하나 더 가지고 시작해요', { hearts: 4 },
      { style: 'classic', suit: '#c1121f', accent: '#f2c14e', line: '#7a0c12', emblem: '#f2c14e', pattern: 'plain', mark: 'spiderBig', head: 'mask', body: 'f' }),
    h('kuromi', 'panther', '쿠로미', '산리오', '날쌔고, 하트도 하나 더', { webSpeed: 1.6, cooldown: 180, hearts: 4 },
      { style: 'classic', mascot: 'kuromi', suit: '#222222', accent: '#ff8fc7', line: '#ff8fc7', emblem: '#b388ff', body3: '#222222', legs: '#ffffff', boot: '#222222', hands: '#ffffff' }),
    h('ironheart', 'armor', '아이언하트', '블랙 팬서: 와칸다 포에버', '스캐너 + 하트 +1 + 콤보 1.3배', { hint: true, hearts: 4, comboBonus: 1.3 },
      { style: 'armor', suit: '#c62828', accent: '#ffd54f', line: '#5a0000', emblem: '#9be7ff', pattern: 'plates', mark: 'arc', head: 'faceplate', body: 'f' }),
    h('aquaman', 'shield', '아쿠아맨', '아쿠아맨', '하트 +2, 시간 +1초', { hearts: 5, timeBonus: 1 },
      { style: 'shield', suit: '#e0a106', accent: '#2e7d32', line: '#8a6400', emblem: '#f2c14e', pattern: 'scales', mark: 'none', head: 'face', hair: '#3e2723', hairStyle: 'long', beard: 1, gear: ['trident'], glove: '#2e7d32', boot: '#2e7d32' }),
    h('storm', 'thunder', '스톰', '엑스맨', '아주 빠르고, 콤보 1.4배', { webSpeed: 1.9, cooldown: 140, comboBonus: 1.4 },
      { style: 'thunder', suit: '#1c1c1c', accent: '#555555', line: '#cfd8dc', emblem: '#cfd8dc', pattern: 'tactical', mark: 'x', head: 'face', body: 'f', hair: '#f5f5f5', hairStyle: 'long', cape: '#2b2b2b', skin: '#8d5524' }),
    h('supergirl', 'giant', '슈퍼걸', '플래시 · 슈퍼걸', '넓은 판정 + 시간 +3초', { hitRadius: 28, timeBonus: 3 },
      { style: 'giant', suit: '#1d4ed8', accent: '#c62828', line: '#f2c14e', emblem: '#c62828', pattern: 'plain', belt: 1, mark: 'super', head: 'face', body: 'f', hair: '#f4d35e', hairStyle: 'long', cape: '#c62828', boot: '#c62828' }),
    h('wasp', 'archer', '와스프', '앤트맨과 와스프', '콤보 1.8배', { comboBonus: 1.8, webSpeed: 1.4 },
      { style: 'archer', suit: '#263238', accent: '#f2c14e', line: '#f2c14e', emblem: '#f2c14e', pattern: 'sides', mark: 'none', head: 'mask', lens: '#ffd54f', body: 'f', gear: ['wings'] }),
    // ---- 49~56번째 합류 ----
    h('badtz-maru', 'armor', '배드바츠마루', '산리오', '가짜 보기 하나를 미리 알려줘요', { hint: true },
      { style: 'classic', mascot: 'badtz', suit: '#1a1a1a', accent: '#ffc107', line: '#ffffff', emblem: '#ffc107', body3: '#1a1a1a', legs: '#1a1a1a', boot: '#ffc107', hands: '#1a1a1a' }),
    h('jean-grey', 'mystic', '진 그레이', '엑스맨: 다크 피닉스', '천천히 + 콤보 1.4배', { slow: 0.7, timeBonus: 2, comboBonus: 1.4 },
      { style: 'mystic', suit: '#c62828', accent: '#f2c14e', line: '#f2c14e', emblem: '#ffb300', pattern: 'sides', mark: 'bird', head: 'face', body: 'f', hair: '#c1440e', hairStyle: 'long', gear: ['ring'] }),
    h('okoye', 'panther', '오코예', '블랙 팬서', '빠르고, 하트 +2', { webSpeed: 1.6, hearts: 5 },
      { style: 'panther', suit: '#a31621', accent: '#c9a227', line: '#c9a227', emblem: '#c9a227', pattern: 'tactical', mark: 'none', head: 'face', body: 'f', bald: 1, gear: ['spear'], skin: '#5c3a21' }),
    h('venom', 'spider', '베놈', '베놈', '모든 것이 천천히 다가와요', { slow: 0.7 },
      { style: 'classic', suit: '#0b0b10', accent: '#0b0b10', line: '#1c1c26', emblem: '#f5f5f5', pattern: 'plain', mark: 'spiderBig', head: 'mask', lensBig: 1, bulk: 1.15 }),
    h('blue-beetle', 'armor', '블루 비틀', '블루 비틀', '스캐너 + 하트 +2 + 천천히', { hint: true, hearts: 5, slow: 0.85 },
      { style: 'armor', suit: '#1565c0', accent: '#0d1b2a', line: '#0a2a4a', emblem: '#00e5ff', pattern: 'plates', mark: 'beetle', head: 'mask', lens: '#00e5ff' }),
    h('ms-marvel', 'shield', '미즈 마블', '더 마블스', '하트 +2, 가짜 보기도 알려줘요', { hearts: 5, hint: true },
      { style: 'shield', suit: '#1a237e', accent: '#c62828', line: '#ffd54f', emblem: '#ffd54f', pattern: 'sides', mark: 'bolt', head: 'domino', body: 'f', hair: '#1a1a1a', hairStyle: 'long', glove: '#c62828', boot: '#c62828', skin: '#c68642' }),
    h('quicksilver', 'thunder', '퀵실버', '어벤져스: 에이지 오브 울트론', '가장 빠르고, 하트 +1, 콤보 1.3배', { webSpeed: 2, cooldown: 130, hearts: 4, comboBonus: 1.3 },
      { style: 'thunder', suit: '#3f51b5', accent: '#9fa8da', line: '#e8eaf6', emblem: '#e8eaf6', pattern: 'sides', mark: 'bolt', head: 'face', hair: '#e0e0e0', hairStyle: 'parted' }),
    h('she-hulk', 'giant', '쉬헐크', '쉬헐크', '넓은 판정 + 시간 +3초 + 하트 +1', { hitRadius: 28, timeBonus: 3, hearts: 4 },
      { style: 'giant', suit: '#66bb6a', accent: '#6a1b9a', line: '#f5f5f5', emblem: '#f5f5f5', pattern: 'skin', topSuit: 1, mark: 'none', head: 'tint', body: 'f', hair: '#1b3d1b', hairStyle: 'long', bulk: 1.15 }),
    // ---- 57~64번째 합류 ----
    h('star-lord', 'archer', '스타로드', '가디언즈 오브 갤럭시', '콤보 점수 2배! 줄도 빨라요', { comboBonus: 2, webSpeed: 1.5 },
      { style: 'archer', suit: '#6d1b1b', accent: '#3e2723', line: '#9e9e9e', emblem: '#9e9e9e', pattern: 'robe', mark: 'none', head: 'face', hair: '#7a4a2a', hairStyle: 'parted' }),
    h('loki', 'mystic', '로키', '토르 · 로키', '가장 천천히 + 가짜 보기 + 하트 +1', { slow: 0.65, timeBonus: 2, hint: true, hearts: 4 },
      { style: 'mystic', suit: '#1b5e20', accent: '#1a1a1a', line: '#c9a227', emblem: '#c9a227', pattern: 'robe', mark: 'none', head: 'face', hair: '#111111', hairStyle: 'long', cape: '#1b5e20', gear: ['horns', 'ring'] }),
    h('gamora', 'panther', '가모라', '가디언즈 오브 갤럭시', '아주 빠르고, 하트 +2, 콤보 1.3배', { webSpeed: 1.9, cooldown: 150, hearts: 5, comboBonus: 1.3 },
      { style: 'panther', suit: '#212121', accent: '#455a64', line: '#6b7c85', emblem: '#90a4ae', pattern: 'tactical', mark: 'none', head: 'tint', skinTint: '#43a047', body: 'f', hair: '#2a0f12', hairStyle: 'long', gear: ['sword'] }),
  ];
  A.HEROES.forEach((hero, i) => { hero.unlockStars = A.unlockStarsAt(i); });

  /**
   * 예전 히어로 id(팀 × 색 변형 시절) → 새 id (영화 원조 히어로, 2026-10-17). 저장된 "고른 히어로 · 합류한 히어로"를 옮길 때 쓴다 (ui/app.js).
   * 같은 팀 · 같은 순서 자리라 능력과 합류 조건은 그대로다.
   * @type {Object<string, string>}
   */
  A.HERO_ID_MAP = {
    red: 'spider-man', snow: 'miles-morales', shadow: 'spider-gwen', detective: 'spider-man-2099', piggy: 'spider-woman',
    future: 'venom', 'armor-red': 'iron-man', 'armor-war': 'war-machine', 'armor-blue': 'vision', 'armor-stealth': 'cyborg',
    'armor-gold': 'ironheart', 'armor-mega': 'blue-beetle', 'shield-star': 'captain-america', 'shield-night': 'wonder-woman',
    'shield-crystal': 'falcon', 'shield-red': 'winter-soldier', 'shield-snow': 'aquaman', 'shield-gold': 'ms-marvel',
    'thunder-knight': 'thor', 'thunder-storm': 'flash', 'thunder-aurora': 'captain-marvel', 'thunder-queen': 'shazam',
    'thunder-dark': 'storm', 'thunder-gold': 'quicksilver', 'giant-green': 'hulk', 'giant-red': 'superman',
    'giant-gray': 'groot', 'giant-blue': 'the-thing', 'giant-purple': 'supergirl', 'giant-gold': 'she-hulk',
    'archer-purple': 'hawkeye', 'archer-shadow': 'black-widow', 'archer-green': 'batman', 'archer-blue': 'ant-man',
    'archer-white': 'wasp', 'archer-gold': 'star-lord', 'mystic-master': 'doctor-strange', 'mystic-dark': 'scarlet-witch',
    'mystic-scarlet': 'green-lantern', 'mystic-emerald': 'shang-chi', 'mystic-sun': 'jean-grey', 'mystic-moon': 'loki',
    'panther-night': 'black-panther', 'panther-gold': 'wolverine', 'panther-snow': 'catwoman', 'panther-red': 'shuri',
    'panther-blue': 'okoye', 'panther-storm': 'gamora',
  };

  /**
   * id 로 히어로를 찾는다. 저장된 id 가 사라졌을 때를 대비해 없으면 기본 히어로를 돌려준다.
   * @param {string} id
   * @returns {Hero}
   */
  A.findHero = (id) => A.HEROES.find((x) => x.id === (A.HERO_ID_MAP[id] || id)) || A.HEROES[0];

  /**
   * 히어로의 팀 정보. 팀이 없으면 거미 팀으로 본다.
   * @param {Hero} hero
   * @returns {HeroFamily}
   */
  A.findFamily = (hero) => A.HERO_FAMILIES.find((f) => f.id === hero.family) || A.HERO_FAMILIES[0];
})(window.ARAH);

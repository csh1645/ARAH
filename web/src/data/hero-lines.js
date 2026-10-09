/**
 * @file 히어로 대사 (말풍선). 팀마다 말투가 다르고(팀 대사), 히어로마다 자기만의 한마디(캐치프레이즈)가 있다.
 *       아이가 "이 캐릭터는 이런 성격"이라고 느끼게 해 모으는 재미를 키우는 것이 목적이다.
 * @layer data
 * @depends A.util (heroLine 의 무작위 고르기)
 * @see doc/planning/game-design.md (9.2 히어로 대사), doc/decisions/ADR-0002-original-characters.md
 *
 * 작성 규칙:
 *   - 원조 작품의 공식 대사 · 유행어를 그대로 쓰지 않는다. 원조 캐릭터의 말투 · 성격 · 장비 · 출신을 살린 새 문장으로 쓴다 (ADR-0002)
 *   - 같은 팀 대사는 같은 말투를 지킨다 (TEAM_LINES 위 주석의 팀별 말투 표)
 *   - 초등 저학년이 한눈에 읽도록 짧게 (말풍선 한 줄, 약 15자 이내)
 *   - 틀렸을 때 대사는 탓하지 않고 다시 해 보자는 격려로 쓴다 (학습 의도)
 */

/**
 * 팀 대사 묶음. 상황마다 여러 문장 중 하나를 무작위로 고른다.
 * @typedef {Object} TeamLines
 * @property {string[]} start   판 시작
 * @property {string[]} correct 정답
 * @property {string[]} combo   콤보 3 · 5 · 7 · 10
 * @property {string[]} wrong   오답 · 놓침 (격려)
 * @property {string[]} win     판 성공
 * @property {string[]} lose    하트를 모두 잃음
 */
(function (A) {
  'use strict';

  /**
   * @type {Object<string, TeamLines>} 팀 id → 대사. 팀마다 원조 캐릭터를 떠올리게 하는 **말투**가 다르다:
   * 거미 = 장난스럽고 수다스러움 / 아머 = 자신만만한 천재 / 방패 = 다정한 리더 / 번개 = 옛 왕국 말투(~노라)
   * 거인 = 짧고 힘센 말 / 궁수 = 말수 적고 쿨함 / 마법 = 신비로움 / 표범 = 침착하고 기품 있음
   */
  A.TEAM_LINES = {
    spider: {
      start: ['거미 감각이 찌릿찌릿!', '줄 타고 출동이다~!'],
      correct: ['딱 걸렸지롱!', '거미줄 명중! 헤헤', '가볍게 슝~'],
      combo: ['거미 감각 최고조!', '아무도 날 못 잡지롱!'],
      wrong: ['앗, 줄이 미끄러졌네!', '괜찮아, 다시 슝!'],
      win: ['오늘도 동네는 안전해!'],
      lose: ['다음엔 꼭 지켜 줄게!'],
    },
    armor: {
      start: ['천재 등장! 시스템 가동!', '아머 장착 완료!'],
      correct: ['계산 끝. 역시 나야!', '목표 명중, 완벽해!'],
      combo: ['출력 최대! 내가 최고지!', '분석 완료, 천재답지?'],
      wrong: ['흠, 다시 계산. 금방이야!', '오류 수정 중…'],
      win: ['임무 완료. 박수 쳐도 돼!'],
      lose: ['업그레이드해서 올게!'],
    },
    shield: {
      start: ['방패 들고 전진!', '다 같이 힘내자!'],
      correct: ['바로 그거야!', '아주 잘했어!'],
      combo: ['포기하지 않으면 이겨!', '팀워크 최고야!'],
      wrong: ['괜찮아, 다시 일어나자!', '한 번 더 해 보자!'],
      win: ['모두 함께 이겼어!'],
      lose: ['끝까지 포기 안 해!'],
    },
    thunder: {
      start: ['번개여, 내게 오라!', '천둥과 함께 왔노라!'],
      correct: ['훌륭하도다!', '정답이로다!'],
      combo: ['하늘이 그대를 칭찬하노라!', '천둥 폭풍이로다!'],
      wrong: ['괜찮도다, 다시 하자꾸나!', '구름이 잠시 꼈구나!'],
      win: ['승리의 잔치를 열자꾸나!'],
      lose: ['번개는 다시 치리라!'],
    },
    giant: {
      start: ['쿵! 쿵! 출동!', '힘! 넘친다!'],
      correct: ['쾅! 정답!', '힘! 최고!'],
      combo: ['더 세진다! 쾅쾅!', '멈추지 않는다!'],
      wrong: ['으르렁… 다시!', '참는다! 다시!'],
      win: ['거인 최고! 쾅!'],
      lose: ['더 세져서 온다!'],
    },
    archer: {
      start: ['과녁 확인. 간다.', '활시위, 준비.'],
      correct: ['백발백중.', '한가운데.'],
      combo: ['한 발도 안 놓쳐.', '명궁 모드.'],
      wrong: ['바람 탓이야. 다시.', '조준 다시.'],
      win: ['임무 끝. 깔끔하게.'],
      lose: ['다음엔 더 정확히.'],
    },
    mystic: {
      start: ['차원의 문이 열린다…', '시간이여, 천천히…'],
      correct: ['예언대로군.', '마법 성공!'],
      combo: ['마력이 넘쳐흐른다…', '주문이 완벽하군.'],
      wrong: ['주문이 꼬였군. 다시.', '다른 미래를 보자.'],
      win: ['모든 차원에 평화를.'],
      lose: ['다른 미래를 찾아보지.'],
    },
    panther: {
      start: ['왕국을 위하여, 출동!', '사뿐사뿐, 조용히.'],
      correct: ['날렵하게, 정확하게.', '발톱 한 방!'],
      combo: ['아무도 날 따라올 수 없다.', '그림자처럼 빠르게.'],
      wrong: ['침착하게, 다시 노린다.', '숨 고르고, 다시.'],
      win: ['왕국의 이름으로 승리!'],
      lose: ['다시 사냥을 준비한다.'],
    },
  };

  /** @type {Object<string, string>} 히어로 id → 자기만의 한마디 (판 시작 · 합류 축하 · 가끔 정답 때) */
  A.HERO_CATCHPHRASES = {
    // 거미 팀
    red: '빨강 차원의 콤보 왕이 왔다!',
    snow: '눈꽃처럼 사뿐히, 줄은 넓게!',
    shadow: '그림자보다 빠르게!',
    detective: '단서 발견! 가짜는 저거야!',
    piggy: '꿀꿀! 하트 하나 더 챙겼지!',
    future: '미래에서 왔어, 천천히 가자!',
    // 아머 팀
    'armor-red': '스캐너 켜! 가짜는 내가 찾지!',
    'armor-war': '요새급 아머, 등장!',
    'armor-blue': '차갑고 정확하게. 그게 나야.',
    'armor-stealth': '안 보였지? 짠!',
    'armor-gold': '번쩍번쩍, 멋지지?',
    'armor-mega': '거대 로봇 출격! 놀랐지?',
    // 방패 팀
    'shield-star': '별 방패가 모두를 지킨다!',
    'shield-night': '밤에도 방패는 반짝여!',
    'shield-crystal': '보석 방패는 절대 안 깨져!',
    'shield-red': '불꽃처럼 뜨거운 용기!',
    'shield-snow': '눈보라도 막아 낸다!',
    'shield-gold': '태양의 방패, 빛나라!',
    // 번개 팀
    'thunder-knight': '하늘 왕국의 기사가 왔노라!',
    'thunder-storm': '폭풍을 몰고 왔노라!',
    'thunder-aurora': '오로라 번개를 보아라!',
    'thunder-queen': '번개 성의 여왕이 나가신다!',
    'thunder-dark': '먹구름 번개는 더 세니라!',
    'thunder-gold': '황금 왕좌의 번개를 받아라!',
    // 거인 팀
    'giant-green': '초록 거인! 힘 솟는다!',
    'giant-red': '화산! 폭발!',
    'giant-gray': '바위처럼! 단단!',
    'giant-blue': '바다 힘! 쾅!',
    'giant-purple': '협곡! 한 번에 점프!',
    'giant-gold': '황금 거인! 등장!',
    // 궁수 팀
    'archer-purple': '과녁 한가운데. 그것뿐.',
    'archer-shadow': '비밀 요원, 임무 시작.',
    'archer-green': '숲의 명궁, 도착.',
    'archer-blue': '강물처럼, 쉬지 않고.',
    'archer-white': '설산 바람까지 계산했어.',
    'archer-gold': '황금 화살은 안 빗나가.',
    // 마법 팀
    'mystic-master': '거울 차원의 문이여, 열려라.',
    'mystic-dark': '어둠 속에서도 답이 보이지.',
    'mystic-scarlet': '진홍 마법… 시간아, 멈춰라.',
    'mystic-emerald': '비취 마법이 하트를 지키지.',
    'mystic-sun': '태양 신전의 마법이다!',
    'mystic-moon': '달빛 아래, 천천히…',
    // 표범 팀
    'panther-night': '비밀 왕국의 수호자, 여기 있다.',
    'panther-gold': '황금 발톱, 번쩍.',
    'panther-snow': '얼음 위에서도 흔들림 없다.',
    'panther-red': '불꽃처럼, 빠르게.',
    'panther-blue': '바다 왕국의 파도처럼!',
    'panther-storm': '번개 발톱을 받아라.',
  };

  /**
   * 상황에 맞는 대사 한 줄. 'catchphrase' 는 히어로 자기만의 한마디, 나머지는 팀 대사 중 하나.
   * @param {Hero} hero
   * @param {'catchphrase'|'start'|'correct'|'combo'|'wrong'|'win'|'lose'} kind
   * @returns {string} 대사가 없으면 빈 문자열
   */
  A.heroLine = function (hero, kind) {
    if (kind === 'catchphrase') return A.HERO_CATCHPHRASES[hero.id] || '';
    const team = A.TEAM_LINES[hero.family];
    const list = team && team[kind];
    return list && list.length ? A.util.pick(list) : '';
  };
})(window.ARAH);

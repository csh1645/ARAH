/**
 * @file 히어로 대사 (말풍선). 팀마다 말투가 다르고(팀 대사), 히어로마다 자기만의 한마디(캐치프레이즈)가 있다.
 *       아이가 "이 캐릭터는 이런 성격"이라고 느끼게 해 모으는 재미를 키우는 것이 목적이다.
 * @layer data
 * @depends A.util (heroLine 의 무작위 고르기)
 * @see doc/planning/game-design.md (9.2 히어로 대사), doc/decisions/ADR-0010-official-heroes.md
 *
 * 작성 규칙:
 *   - 히어로는 영화 원조 히어로(공식 이름, ADR-0010). 대사는 영화 대사를 그대로 옮기지 않고 캐릭터의 말투 · 성격 · 장비를 살린 새 문장으로 쓴다
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
   * 스파이더 = 장난스럽고 수다스러움 / 아머 = 자신만만한 천재 / 실드 = 다정한 리더 / 썬더 = 힘차고 빠름
   * 파워 = 짧고 힘센 말 / 헌터 = 말수 적고 쿨함 / 미스틱 = 신비로움 / 클로 = 침착하고 날렵함
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
      start: ['번개처럼 출동!', '전속력으로 간다!'],
      correct: ['번쩍! 정답!', '빛보다 빠르게!'],
      combo: ['번개 폭풍이다!', '아무도 못 따라와!'],
      wrong: ['앗, 너무 빨랐나? 다시!', '괜찮아, 다시 번쩍!'],
      win: ['번개같이 승리!'],
      lose: ['다음엔 더 빨리 올게!'],
    },
    giant: {
      start: ['쿵! 쿵! 출동!', '힘! 넘친다!'],
      correct: ['쾅! 정답!', '힘! 최고!'],
      combo: ['더 세진다! 쾅쾅!', '멈추지 않는다!'],
      wrong: ['으르렁… 다시!', '참는다! 다시!'],
      win: ['힘 최고! 쾅!'],
      lose: ['더 세져서 온다!'],
    },
    archer: {
      start: ['목표 확인. 간다.', '작전, 준비.'],
      correct: ['백발백중.', '한가운데.'],
      combo: ['한 번도 안 놓쳐.', '집중 모드.'],
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
      start: ['발톱 준비, 출동!', '사뿐사뿐, 조용히.'],
      correct: ['날렵하게, 정확하게.', '발톱 한 방!'],
      combo: ['아무도 날 따라올 수 없다.', '그림자처럼 빠르게.'],
      wrong: ['침착하게, 다시 노린다.', '숨 고르고, 다시.'],
      win: ['깔끔하게 승리!'],
      lose: ['다시 사냥을 준비한다.'],
    },
  };

  /** @type {Object<string, string>} 히어로 id → 자기만의 한마디 (판 시작 · 합류 축하 · 가끔 정답 때) */
  A.HERO_CATCHPHRASES = {
    // 스파이더 팀
    'spider-man': '친절한 이웃, 출동했어!',
    'miles-morales': '나만의 방식으로 해 볼게!',
    'spider-gwen': '드럼 비트에 맞춰 슝~!',
    'spider-man-2099': '미래에서 왔다. 실수는 없다.',
    'spider-woman': '하트 하나 더, 든든하지?',
    venom: '우리는… 정답이 배고프다!',
    // 아머 팀
    'iron-man': '천재 발명가, 슈트 장착!',
    'war-machine': '화력 지원 들어간다!',
    vision: '논리적으로, 이것이 정답이다.',
    cyborg: '데이터 분석 완료. 부야!',
    ironheart: '내가 만든 슈트, 멋지지?',
    'blue-beetle': '딱정벌레 슈트, 같이 가자!',
    // 실드 팀
    'captain-america': '하루 종일이라도 할 수 있어!',
    'wonder-woman': '진실과 용기로 싸울게!',
    falcon: '하늘은 내가 맡을게!',
    'winter-soldier': '조용히, 정확하게.',
    aquaman: '바다의 왕이 왔다!',
    'ms-marvel': '나도 진짜 히어로라고!',
    // 썬더 팀
    thor: '천둥의 신이 왔노라!',
    flash: '눈 깜빡하면 끝나 있지!',
    'captain-marvel': '더 높이, 더 빠르게!',
    shazam: '마법의 단어를 외쳐라!',
    storm: '바람아, 번개야, 모여라!',
    quicksilver: '못 봤지? 벌써 끝났어!',
    // 파워 팀
    hulk: '헐크! 정답! 쾅!',
    superman: '희망의 상징, 날아오른다!',
    groot: '나는… 그루트!',
    'the-thing': '부술 시간이다!',
    supergirl: '하늘 끝까지 날아갈게!',
    'she-hulk': '힘도 똑똑함도 최고!',
    // 헌터 팀
    hawkeye: '나는 빗나가지 않아.',
    'black-widow': '작전 개시. 조용히.',
    batman: '나는 어둠 속의 기사다.',
    'ant-man': '작아져도 힘은 그대로!',
    wasp: '작고 빠르고, 따끔하게!',
    'star-lord': '음악 켜고, 출발!',
    // 미스틱 팀
    'doctor-strange': '시간의 문이여, 열려라.',
    'scarlet-witch': '혼돈 마법을 보여 줄게.',
    'green-lantern': '의지의 빛, 반지여 빛나라!',
    'shang-chi': '열 개의 반지, 집중!',
    'jean-grey': '마음의 힘을 느껴 봐.',
    loki: '속임수? 이번엔 진짜야.',
    // 클로 팀
    'black-panther': '와칸다의 왕, 여기 있다.',
    wolverine: '발톱 꺼낸다, 스닉!',
    catwoman: '고양이처럼 사뿐히.',
    shuri: '와칸다 기술은 최고야!',
    okoye: '왕국을 지키는 장군이다!',
    gamora: '은하에서 가장 날쌘 전사!',
    // 산리오
    'hello-kitty': '친구랑 함께면 뭐든 할 수 있어!',
    'my-melody': '엄마가 그랬어, 차근차근!',
    cinnamoroll: '귀를 펄럭펄럭, 날아간다!',
    pompompurin: '푸딩 먹고 힘이 불끈!',
    pochacco: '달리기라면 자신 있어!',
    keroppi: '개굴! 높이 뛰어 볼까?',
    kuromi: '흥, 이 정도는 쉽지!',
    'badtz-maru': '쿨하게 정답, 끝!',
    // 치이카와
    chiikawa: '나도… 할 수 있어!',
    hachiware: '어떻게든 될 거야!',
    usagi: '우라! 야하~!',
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

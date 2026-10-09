/**
 * @file 과목 · 단계 목록과 게임 규칙 수치. 밸런스 조정은 이 파일에서만 한다.
 * @layer data
 * @depends 없음
 * @see doc/content/curriculum.md, doc/planning/game-design.md (7. 난이도)
 */
(function (A) {
  'use strict';

  /**
   * 메뉴에 표시할 과목. id 는 questions/index.js 의 분기와 math.js 의 GENERATORS 키와 일치해야 한다.
   * @type {{id: string, label: string, icon: string}[]}
   */
  A.SUBJECTS = [
    { id: 'add', label: '덧셈', icon: '➕' },
    { id: 'sub', label: '뺄셈', icon: '➖' },
    { id: 'mul', label: '곱셈', icon: '✖️' },
    { id: 'div', label: '나눗셈', icon: '➗' },
    { id: 'mix', label: '섞어서', icon: '🎲' },
    { id: 'eng', label: '영어 단어', icon: '🔤' },
  ];

  /**
   * 놀이 방법(게임 모드). id 는 game/modes/* 가 A.GAME_MODES 에 등록하는 키와 일치해야 한다.
   * @type {{id: string, label: string, icon: string, desc: string}[]}
   */
  A.MODES = [
    { id: 'catch', label: '드론 잡기', icon: '🎯', desc: '내려오는 정답 드론을 거미줄로 맞혀요' },
    { id: 'swing', label: '빌딩 스윙', icon: '🏙️', desc: '정답 빌딩을 골라 거미줄로 날아가요' },
    { id: 'gate', label: '문 통과', icon: '🚪', desc: '달리면서 정답 문으로 통과해요' },
    { id: 'gate3d', label: '3D 문 통과', icon: '🌆', desc: '3D 하늘 다리를 달려 정답 문으로!' },
  ];

  /**
   * 난이도 단계. grade 는 메뉴에 보여 주는 학년 기준이다.
   * @type {{id: 1|2|3, label: string, grade: string}[]}
   */
  A.LEVELS = [
    { id: 1, label: '1단계', grade: '2학년 1학기' },
    { id: 2, label: '2단계', grade: '2학년 2학기' },
    { id: 3, label: '3단계', grade: '3학년 예습' },
  ];

  /** 게임 규칙 수치. 플레이 테스트 결과에 따라 이 값만 바꿔 난이도를 조정한다. */
  A.RULES = {
    /** 한 판의 문제 수. 저학년 집중 시간(3~5분)에 맞춘 값 */
    questionsPerRound: 10,
    /** 시작 하트 수 (히어로 능력 hearts 가 있으면 그 값을 쓴다) */
    baseHearts: 3,
    /** 단계별 보기(드론) 개수 */
    choicesByLevel: { 1: 3, 2: 4, 3: 4 },
    /** 단계별 드론 낙하 속도 (px/초). 1단계는 포털에서 바닥까지 약 9초 */
    fallSpeedByLevel: { 1: 36, 2: 44, 3: 52 },
    /** 빌딩 스윙 모드: 단계별 한 문제 제한 시간 (초) */
    swingTimeByLevel: { 1: 12, 2: 10, 3: 8 },
    /** 문 통과 모드: 단계별로 문이 멀리서 다가와 도착하기까지의 시간 (초) */
    gateTimeByLevel: { 1: 10, 2: 9, 3: 7 },
    /** 10문제를 모두 한 번에 맞혔을 때 추가로 주는 별 */
    perfectBonusStars: 3,
  };
})(window.ARAH);

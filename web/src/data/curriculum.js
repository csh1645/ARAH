/**
 * @file 과목 · 단계 목록과 게임 규칙 수치. 밸런스 조정은 이 파일에서만 한다.
 * @layer data
 * @depends 없음
 * @see doc/content/curriculum.md (단계별 출제 범위 · 학년 대응표), doc/planning/game-design.md (7. 난이도)
 *
 * 화면에는 학년을 보여 주지 않고 "단계"만 보여 준다 (사용자 결정 2026-10-10).
 * 학년으로 나누면 "나는 2학년이니까 여기까지"라는 한계가 생기므로, 실력에 따라 계속 올라가게 한다.
 * 학년 대응은 보호자용 문서(doc/content/curriculum.md)에만 적는다.
 */
(function (A) {
  'use strict';

  /**
   * 메뉴에 표시할 과목. id 는 questions/index.js 의 분기와 math.js 의 GENERATORS 키와 일치해야 한다.
   * 'review' 는 실제 과목이 아니라 오답 복습 노트에서 문제를 꺼내 푸는 특별 항목이다 (questions/review.js).
   * @type {{id: string, label: string, icon: string}[]}
   */
  A.SUBJECTS = [
    { id: 'add', label: '덧셈', icon: '➕' },
    { id: 'sub', label: '뺄셈', icon: '➖' },
    { id: 'mul', label: '곱셈', icon: '✖️' },
    { id: 'div', label: '나눗셈', icon: '➗' },
    { id: 'mix', label: '섞어서', icon: '🎲' },
    { id: 'eng', label: '영어 단어', icon: '🔤' },
    { id: 'review', label: '오답 복습', icon: '📒' },
  ];

  /**
   * 놀이 방법(게임 모드). id 는 game/modes/* 가 A.GAME_MODES 에 등록하는 키와 일치해야 한다.
   * @type {{id: string, label: string, icon: string, desc: string}[]}
   */
  A.MODES = [
    { id: 'catch', label: '드론 잡기', icon: '🎯', desc: '조준 · 내려오는 정답 드론을 줄로 맞혀요' },
    { id: 'swing', label: '빌딩 스윙', icon: '🏙️', desc: '선택 · 정답 빌딩으로 줄을 타고 날아가요' },
    { id: 'gate', label: '문 통과', icon: '🚪', desc: '3D 달리기 · 정답 문이 있는 줄로 달려가요' },
    { id: 'spell', label: '철자 잇기', icon: '🕸️', desc: '순서 · 영어 알파벳을 순서대로 잡아요' },
    { id: 'match', label: '짝꿍 찾기', icon: '🃏', desc: '기억 · 문제와 답 카드의 짝을 찾아요' },
    { id: 'boss', label: '보스 배틀', icon: '👾', desc: '연속 정답 · 정답으로 보스를 물리쳐요' },
  ];

  /** 예전에 쓰던 모드 id → 지금 id (저장된 선택을 이어 쓰기 위해) */
  A.MODE_ALIASES = { gate3d: 'gate' };

  /**
   * 난이도 단계. 화면에는 label 과 짧은 느낌(desc)만 보여 준다 (학년 표시 없음).
   * @type {{id: 1|2|3|4|5|6, label: string, desc: string}[]}
   */
  A.LEVELS = [
    { id: 1, label: '1단계', desc: '처음' },
    { id: 2, label: '2단계', desc: '쉬움' },
    { id: 3, label: '3단계', desc: '보통' },
    { id: 4, label: '4단계', desc: '도전' },
    { id: 5, label: '5단계', desc: '고수' },
    { id: 6, label: '6단계', desc: '마스터' },
  ];

  /** 게임 규칙 수치. 플레이 테스트 결과에 따라 이 값만 바꿔 난이도를 조정한다. */
  A.RULES = {
    /** 한 판의 문제 수. 저학년 집중 시간(3~5분)에 맞춘 값 (오답 복습은 복습 노트 문제 수가 더 적으면 그만큼만) */
    questionsPerRound: 10,
    /** 시작 하트 수 (히어로 능력 hearts 가 있으면 그 값을 쓴다) */
    baseHearts: 3,
    /** 단계별 보기(드론 · 빌딩 · 문) 개수 */
    choicesByLevel: { 1: 3, 2: 3, 3: 4, 4: 4, 5: 4, 6: 4 },
    /** 단계별 드론 낙하 속도 (px/초). 1단계는 포털에서 바닥까지 약 10초 */
    fallSpeedByLevel: { 1: 32, 2: 36, 3: 42, 4: 46, 5: 50, 6: 54 },
    /** 빌딩 스윙 모드: 단계별 한 문제 제한 시간 (초). 큰 수 계산이 늘어나는 5 · 6단계도 너무 줄이지 않는다 */
    swingTimeByLevel: { 1: 13, 2: 12, 3: 11, 4: 10, 5: 10, 6: 9 },
    /** 문 통과 모드: 단계별로 문이 멀리서 다가와 도착하기까지의 시간 (초) */
    gateTimeByLevel: { 1: 11, 2: 10, 3: 9, 4: 9, 5: 8, 6: 8 },
    /** 10문제를 모두 한 번에 맞혔을 때 추가로 주는 별 */
    perfectBonusStars: 3,
    /** 일반 판에서 복습 노트의 같은 과목 문제를 섞어 낼 확률 */
    reviewMixRate: 0.3,
    /** 복습에서 이만큼 연속으로 맞히면 복습 노트에서 졸업 */
    reviewMasterBox: 3,
    /** 복습 노트 최대 문제 수 (넘치면 오래된 것부터 지운다) */
    reviewMaxItems: 200,
  };
})(window.ARAH);

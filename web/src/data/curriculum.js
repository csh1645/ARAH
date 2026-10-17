/**
 * @file 과목 · 단계 목록과 게임 규칙 수치. 밸런스 조정은 이 파일에서만 한다.
 * @layer data
 * @depends 없음
 * @see doc/content/curriculum.md (단계별 출제 범위 · 학년 대응표), doc/planning/game-design.md (7. 난이도)
 *
 * 단계는 1~12 (초1 ~ 중3). 버튼에는 단계와 함께 "추천 학년"을 작게 보여 준다 (사용자 결정 2026-10-17, ADR-0007).
 * 추천일 뿐 제한이 아니다 — 학년과 상관없이 실력에 따라 아래 · 위 단계를 자유롭게 고른다.
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
    { id: 'eq', label: '□와 방정식', icon: '🟰' },
    { id: 'mix', label: '섞어서', icon: '🎲' },
    { id: 'eng', label: '영어', icon: '🔤' },
    { id: 'review', label: '오답 복습', icon: '📒' },
  ];

  /**
   * 놀이 방법(게임 모드). id 는 game/modes/* 가 A.GAME_MODES 에 등록하는 키와 일치해야 한다.
   * @type {{id: string, label: string, icon: string, desc: string}[]}
   */
  A.MODES = [
    { id: 'run', label: '히어로 러너', icon: '🏃', desc: 'NEW · 달리고 점프! 정답 구슬을 잡으면 파워업', isNew: true },
    { id: 'catch', label: '드론 잡기', icon: '🎯', desc: '조준 · 내려오는 정답 드론을 줄로 맞혀요' },
    { id: 'swing', label: '빌딩 스윙', icon: '🏙️', desc: '선택 · 정답 빌딩으로 줄을 타고 날아가요' },
    { id: 'gate', label: '문 통과', icon: '🚪', desc: '3D 달리기 · 정답 문이 있는 줄로 달려가요' },
    { id: 'spell', label: '철자 잇기', icon: '🕸️', desc: '순서 · 알파벳을 순서대로, 5단계부터는 단어로 문장 만들기' },
    { id: 'match', label: '짝꿍 찾기', icon: '🃏', desc: '기억 · 문제와 답 카드의 짝을 찾아요' },
    { id: 'boss', label: '보스 배틀', icon: '👾', desc: '연속 정답 · 정답으로 보스를 물리쳐요' },
  ];

  /** 예전에 쓰던 모드 id → 지금 id (저장된 선택을 이어 쓰기 위해) */
  A.MODE_ALIASES = { gate3d: 'gate' };

  /**
   * 난이도 단계 (초1 ~ 중3). grade 는 버튼에 "추천 ○○"으로 보여 주는 참고 학년.
   * 단계별 출제 내용: doc/content/curriculum.md
   * @type {{id: number, label: string, grade: string}[]}
   */
  A.LEVELS = [
    { id: 1, label: '1단계', grade: '초1' },
    { id: 2, label: '2단계', grade: '초2' },
    { id: 3, label: '3단계', grade: '초3' },
    { id: 4, label: '4단계', grade: '초4' },
    { id: 5, label: '5단계', grade: '초5' },
    { id: 6, label: '6단계', grade: '초6' },
    { id: 7, label: '7단계', grade: '중1' },
    { id: 8, label: '8단계', grade: '중1' },
    { id: 9, label: '9단계', grade: '중2' },
    { id: 10, label: '10단계', grade: '중2' },
    { id: 11, label: '11단계', grade: '중3' },
    { id: 12, label: '12단계', grade: '중3' },
  ];

  /**
   * 예전(1~6단계, 2026-10-10 판) 저장값 → 지금 단계. 예전 1~6은 초1 1학기 ~ 초4 였다.
   * ui/app.js 가 저장된 단계를 한 번 바꿔 준다 (levelScheme).
   */
  A.LEGACY_LEVEL_MAP = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 4 };

  /** 게임 규칙 수치. 플레이 테스트 결과에 따라 이 값만 바꿔 난이도를 조정한다. */
  A.RULES = {
    /** 한 판의 문제 수. 저학년 집중 시간(3~5분)에 맞춘 값 (오답 복습은 복습 노트 문제 수가 더 적으면 그만큼만) */
    questionsPerRound: 10,
    /** 시작 하트 수 (히어로 능력 hearts 가 있으면 그 값을 쓴다) */
    baseHearts: 3,
    // ----- 단계별 표 (1~12) -----
    // 높은 단계일수록 "생각할 거리"(분수 통분 · 방정식 · 문장)가 많아지므로 속도를 올리지 않고 오히려 시간을 늘린다.
    /** 단계별 보기(드론 · 빌딩 · 문) 개수 */
    choicesByLevel: { 1: 3, 2: 3, 3: 4, 4: 4, 5: 4, 6: 4, 7: 4, 8: 4, 9: 4, 10: 4, 11: 4, 12: 4 },
    /** 단계별 드론 낙하 속도 (px/초). 1단계는 포털에서 바닥까지 약 10초 */
    fallSpeedByLevel: { 1: 32, 2: 38, 3: 44, 4: 46, 5: 40, 6: 40, 7: 40, 8: 38, 9: 36, 10: 36, 11: 34, 12: 34 },
    /** 빌딩 스윙 모드: 단계별 한 문제 제한 시간 (초) */
    swingTimeByLevel: { 1: 13, 2: 11, 3: 10, 4: 10, 5: 13, 6: 13, 7: 13, 8: 14, 9: 15, 10: 15, 11: 16, 12: 16 },
    /** 문 통과 모드: 단계별로 문이 멀리서 다가와 도착하기까지의 시간 (초) */
    gateTimeByLevel: { 1: 11, 2: 10, 3: 9, 4: 8, 5: 11, 6: 11, 7: 11, 8: 12, 9: 13, 10: 13, 11: 14, 12: 14 },
    /** 보스 배틀: 보스 공격이 충전되기까지 시간 (초) */
    bossChargeSecByLevel: { 1: 13, 2: 12, 3: 11, 4: 10, 5: 13, 6: 13, 7: 13, 8: 14, 9: 15, 10: 15, 11: 16, 12: 16 },
    /** 짝꿍 찾기: 한 화면의 짝 수. 식 · 문장이 긴 높은 단계는 카드 글자가 커야 해서 3쌍 */
    matchPairsByLevel: { 1: 3, 2: 3, 3: 4, 4: 4, 5: 4, 6: 4, 7: 4, 8: 4, 9: 3, 10: 3, 11: 3, 12: 3 },
    /** 짝꿍 찾기: 처음에 카드를 보여 주는 시간 (ms). 긴 식 · 문장일수록 읽을 시간을 더 준다 */
    matchPreviewMsByLevel: { 1: 3000, 2: 2600, 3: 2400, 4: 2000, 5: 2600, 6: 2600, 7: 2600, 8: 2800, 9: 3000, 10: 3000, 11: 3200, 12: 3200 },
    /** 10문제를 모두 한 번에 맞혔을 때 추가로 주는 별 */
    perfectBonusStars: 3,
    /** 일반 판에서 복습 노트의 같은 과목 문제를 섞어 낼 확률 */
    reviewMixRate: 0.3,
    /** 복습에서 이만큼 연속으로 맞히면 복습 노트에서 졸업 */
    reviewMasterBox: 3,
    /** 복습 노트 최대 문제 수 (넘치면 오래된 것부터 지운다) */
    reviewMaxItems: 200,

    // ----- 히어로 러너 (modes/run-mode.js) -----
    // "게임이 먼저, 문제는 파워업": 달리기 · 점프 자체가 재미있고, 정답이 다음 달리기 구간의 파워업이 된다
    /** 러너 한 판의 문제 수. 한 판이 1~2분으로 짧아야 "한 판 더" 하게 된다 */
    runQuestionsPerRound: 6,
    /** 단계별 달리는 속도 (px/초). 문제 구간에서는 runQuizSpeedRate 배로 느려져 읽을 시간을 준다 */
    runSpeedByLevel: { 1: 300, 2: 320, 3: 340, 4: 350, 5: 320, 6: 320, 7: 320, 8: 310, 9: 300, 10: 300, 11: 290, 12: 290 },
    runQuizSpeedRate: 0.75,
    /** 문제 사이 달리기 구간 (초). 정답이면 이 구간 동안 파워업이 켜진다 */
    runSegmentSec: 4.5,
  };
})(window.ARAH);

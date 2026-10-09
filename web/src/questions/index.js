/**
 * @file 문제 생성 진입점과 문제 객체 형식(Question) 정의.
 * @layer questions
 * @depends A.MathQ, A.English
 * @see doc/standards/coding-standards.md (1. 계층 — questions 는 엔진 독립)
 */

/**
 * 모든 문제 생성기가 돌려주는 공통 형식. 게임 엔진은 이 형식만 알면 된다.
 * @typedef {Object} Question
 * @property {string}   key     중복 출제 방지용 고유 키
 * @property {string}   prompt  화면 상단에 크게 보여 줄 문제 (예: "7 + 5 = ?")
 * @property {string}   hint    문제 아래 안내 문구 (없으면 빈 문자열)
 * @property {string}   answer  정답. choices 중 정확히 하나와 같다
 * @property {string[]} choices 드론에 적힐 보기 (정답 포함, 섞인 순서)
 * @property {string}   review  결과 화면 복습용 문장 (예: "7 + 5 = 12")
 * @property {string}   [speak] 정답 시 읽어 줄 영어 (영어 문제만)
 * @property {boolean}  [pictureChoices] 보기가 그림(이모지)이면 true. 화면은 보기 글자를 크게 그린다
 * @property {boolean}  [spelling] 철자 잇기 문제. choices 는 섞인 알파벳(중복 가능), answer 는 완성할 단어
 * @property {string[]} [decoys]   철자 잇기의 방해 글자
 */

/**
 * 게임 모드가 문제 형식을 요청할 때 쓰는 옵션. 지원하지 않는 과목은 무시한다.
 * @typedef {Object} QuestionOptions
 * @property {boolean} [pictureChoices] 영어: 단어를 보고 그림을 고르는 문제로 낸다
 * @property {boolean} [spelling] 철자 잇기 문제로 낸다 (과목과 상관없이 영어)
 */
(function (A) {
  'use strict';

  /**
   * 과목과 단계에 맞는 문제 하나를 만든다.
   * @param {string} subject 과목 id (A.SUBJECTS 참고)
   * @param {1|2|3} level 단계
   * @param {QuestionOptions} [options] 모드가 원하는 문제 형식
   * @returns {Question}
   */
  A.makeQuestion = function (subject, level, options = {}) {
    // 철자 잇기처럼 영어 전용 형식을 요청하면 과목 선택과 상관없이 영어 문제를 낸다
    if (subject === 'eng' || options.spelling) return A.English.make(level, options);
    return A.MathQ.make(subject, level);
  };
})(window.ARAH);

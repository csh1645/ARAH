import content from './generated/content.json';

/**
 * @file 영어 어구 · 문장 목록 (5~12단계). 단어(words.js) 다음 단계: 어구 → 문장 빈칸 → 문법 → 문장 만들기.
 *       **원본은 SQLite 콘텐츠 DB (content/arah-content.db 의 phrases · sentences 표)** 이고,
 *       npm run content 가 만든 generated/content.json 을 읽는다. 문장 추가 · 수정은 DB 에서 한다 (이 파일은 고치지 않음).
 * @layer data
 * @depends generated/content.json (빌드 산출물)
 * @see doc/content/curriculum.md (영어), questions/english.js
 *
 * 작성 규칙:
 *   - 문장은 짧게 (화면 위 문제 칸 한 줄, 약 30자 이내). 철자 잇기(문장 만들기)에는 7단어 이하만 쓰인다
 *   - blank: 빈칸으로 뺄 단어 (문장 안에 정확히 그 모양으로 한 번 나와야 한다)
 *   - wrong: 빈칸 오답 3개. 그 단계 문법의 "헷갈리는 형태"를 쓴다 (has ↔ have, went ↔ goed …)
 *     한글 뜻(ko)이 함께 나오므로, 문법상 가능하지만 뜻이 다른 말은 오답으로 써도 정답이 하나로 정해진다
 *   - 새 문장을 추가하면 발음 파일을 만든다 (web/assets/audio/words/README.md — 없으면 기기 음성으로 대신 읽음)
 */

/**
 * @typedef {Object} Phrase 어구 (5단계)
 * @property {string} en    영어 어구 (예: "a red apple")
 * @property {string} ko    한글 뜻
 * @property {string} emoji 그림
 */

/**
 * @typedef {Object} Sentence 문장 (6~12단계)
 * @property {string} en     영어 문장
 * @property {string} ko     한글 뜻
 * @property {number} lv     단계 (6~12)
 * @property {string} blank  빈칸으로 뺄 단어
 * @property {string[]} wrong 빈칸 오답 3개
 * @property {string} tag    문법 이름 (복습 · 문서용)
 */
(function (A) {
  'use strict';

  /** @type {Phrase[]} 5단계: 꾸미는 말 + 이름 (a / an, 수 + 복수) */
  A.PHRASES = content.phrases;

  /** @type {Sentence[]} 6~12단계: 문장 빈칸 (오답 = 그 문법의 헷갈리는 형태) */
  A.SENTENCES = content.sentences;
})(window.ARAH);

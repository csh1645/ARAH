import content from './generated/content.json';

/**
 * @file 영어 단어 목록. **원본은 SQLite 콘텐츠 DB (content/arah-content.db 의 words 표)** 이고,
 *       npm run content 가 만든 generated/content.json 을 읽는다. 단어 추가 · 수정은 DB 에서 한다 (이 파일은 고치지 않음).
 *       발음 파일은 npm run audio 가 새 단어만 만든다 (GitHub Actions 도 자동 실행).
 * @layer data
 * @depends generated/content.json (빌드 산출물)
 * @see content/schema.sql, doc/content/curriculum.md (영어), doc/decisions/ADR-0008-vite-content-pipeline.md
 *
 * 규칙: en 은 영문 소문자만(띄어쓰기 · 기호 없음, 철자 잇기와 발음 파일 이름에 그대로 쓰인다),
 *       emoji 와 ko 는 단어끼리 겹치지 않게 한다 (그림 · 뜻 보기 문제에서 정답이 하나여야 함.
 *       예: 눈 → "눈(얼굴)" eye / "눈(날씨)" snow 로 구분).
 */

/**
 * @typedef {Object} Word
 * @property {string} en    영어 단어 (소문자)
 * @property {string} ko    한글 뜻
 * @property {string} emoji 그림 대신 쓰는 이모지
 * @property {string} cat   분류. 같은 분류 단어를 오답 보기로 쓴다
 * @property {1|2|3} lv     난이도 (1: 아주 쉬움 · 짧음, 2: 보통, 3: 길거나 어려움). 영어 단계별 출제 범위에 쓴다
 */
(function (A) {
  'use strict';

  /** @type {Word[]} */
  A.WORDS = content.words;
})(window.ARAH);

/**
 * @file 단어별 원어민 발음 파일 목록. tools/audio/generate_word_audio.py 가 자동으로 다시 쓴다 (직접 고치지 않는다).
 * @layer data
 * @depends 없음
 * @see doc/decisions/ADR-0004-pronunciation.md, web/assets/audio/words/README.md
 *
 * 여기에 있는 단어는 web/assets/audio/words/<파일> 을 재생하고, 없는 단어는 기기 음성 합성(TTS)으로 대신 읽는다.
 */
(function (A) {
  'use strict';

  /** 발음 파일 출처 (라이선스 · 표기 확인용) */
  A.WORD_AUDIO_SOURCE = '';

  /** @type {Object<string, string>} 영어 단어(소문자) → 파일 이름 */
  A.WORD_AUDIO = {};
})(window.ARAH);

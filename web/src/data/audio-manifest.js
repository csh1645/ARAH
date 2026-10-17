import manifest from './audio-manifest.json';

/**
 * @file 단어 · 어구 · 문장의 원어민 발음 파일 목록. 목록 원본은 audio-manifest.json 이고
 *       발음 생성기(npm run audio, GitHub Actions 자동 실행)가 다시 쓴다 — 직접 고치지 않는다.
 * @layer data
 * @depends audio-manifest.json
 * @see tools/audio/generate.mjs, doc/decisions/ADR-0004-pronunciation.md, web/public/assets/audio/words/README.md
 *
 * 여기에 있는 글은 web/public/assets/audio/words/<파일> 을 재생하고, 없는 글은 기기 음성 합성(TTS)으로 대신 읽는다.
 */
(function (A) {
  'use strict';

  /** 발음 파일 출처 (라이선스 · 표기 확인용) */
  A.WORD_AUDIO_SOURCE = manifest.source;

  /** @type {Object<string, string>} 영어 단어 · 어구 · 문장(소문자 원문) → 파일 이름 */
  A.WORD_AUDIO = manifest.files;
})(window.ARAH);

import manifest from './audio-manifest.json';

/**
 * @file 목소리 팩(원어민 발음 파일 묶음) 목록. 원본은 audio-manifest.json 이고
 *       발음 생성기(npm run audio, GitHub Actions 자동 실행)가 다시 쓴다 — 직접 고치지 않는다.
 * @layer data
 * @depends audio-manifest.json
 * @see tools/audio/generate.mjs (VOICES 표), core/speech.js, web/public/assets/audio/README.md
 *
 * 팩마다 web/public/assets/audio/voices/<목소리>/<파일> 이 있고, 없는 글은 기기 음성 합성(TTS)으로 대신 읽는다.
 */

/**
 * @typedef {Object} VoicePack
 * @property {string} label  메뉴에 보이는 이름 (예: "여자 목소리 1")
 * @property {string} source 출처 · 라이선스
 * @property {Object<string, string>} files 글(소문자 원문) → 파일 이름
 */
(function (A) {
  'use strict';

  /** @type {Object<string, VoicePack>} 목소리 id → 팩 */
  A.VOICE_PACKS = manifest.voices;

  /** 기본 목소리 팩 id (저장된 선택이 없을 때 · 고른 팩에 없는 글) */
  A.VOICE_DEFAULT = manifest.default;

  /** 기본 팩의 파일 목록 (점검 · 테스트용 바로가기) */
  A.WORD_AUDIO = manifest.voices[manifest.default].files;
})(window.ARAH);

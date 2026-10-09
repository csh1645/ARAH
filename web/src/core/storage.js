/**
 * @file 브라우저 localStorage 래퍼. 사생활 보호 모드 등에서 실패해도 게임은 계속 동작한다.
 * @layer core
 * @depends 없음
 * @see doc/standards/coding-standards.md (6. 보안 · 개인정보) — 개인정보는 저장하지 않는다
 *
 * 현재 저장하는 키: stars(모은 별), hero, subject, level(마지막 선택)
 */
(function (A) {
  'use strict';

  /** 다른 사이트 · 앱 데이터와 섞이지 않도록 모든 키 앞에 붙인다. */
  const PREFIX = 'arah.';

  A.storage = {
    /**
     * 저장된 값을 읽는다. 없거나 읽기에 실패하면 fallback 을 돌려준다.
     * @template T
     * @param {string} key 접두어를 뺀 키
     * @param {T} fallback
     * @returns {T}
     */
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    /**
     * 값을 JSON 으로 저장한다. 실패해도 예외를 던지지 않는다.
     * @param {string} key 접두어를 뺀 키
     * @param {*} value
     */
    set(key, value) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
      } catch (e) {
        /* 저장 실패는 무시 */
      }
    },
  };
})(window.ARAH);

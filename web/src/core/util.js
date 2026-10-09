/**
 * @file 랜덤 유틸과 전역 네임스페이스 생성. 반드시 가장 먼저 로드한다.
 * @layer core
 * @depends 없음
 * @see doc/standards/coding-standards.md (2. 모듈 방식)
 */
window.ARAH = window.ARAH || {};

(function (A) {
  'use strict';

  /**
   * min 이상 max 이하의 정수를 무작위로 고른다.
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  /**
   * 배열에서 원소 하나를 무작위로 고른다.
   * @template T
   * @param {T[]} arr
   * @returns {T}
   */
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /**
   * 배열을 제자리에서 섞고 그대로 돌려준다 (Fisher-Yates 셔플: 모든 순서가 같은 확률로 나옴).
   * @template T
   * @param {T[]} arr
   * @returns {T[]}
   */
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  A.util = { rand, pick, shuffle };
})(window.ARAH);

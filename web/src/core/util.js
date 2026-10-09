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

  /**
   * 2차 베지어 곡선 위의 점 (시작 S → 조절점 C 쪽으로 휘어 → 끝 E). 점프 · 스윙 · 비행 경로에 쓴다.
   * @param {{x: number, y: number}} S
   * @param {{x: number, y: number}} C 조절점 (경로가 이 점 쪽으로 휜다)
   * @param {{x: number, y: number}} E
   * @param {number} t 0 ~ 1
   * @returns {{x: number, y: number}}
   */
  const bezier2 = (S, C, E, t) => {
    const u = 1 - t;
    return { x: u * u * S.x + 2 * u * t * C.x + t * t * E.x, y: u * u * S.y + 2 * u * t * C.y + t * t * E.y };
  };

  A.util = { rand, pick, shuffle, bezier2 };
})(window.ARAH);

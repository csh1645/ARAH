/**
 * @file 수학 사칙연산 문제 생성기 (엔진 독립).
 * @layer questions
 * @depends A.util, A.RULES
 * @see doc/content/curriculum.md (수학) — 단계별 숫자 범위를 바꾸면 문서도 갱신한다
 */
(function (A) {
  'use strict';

  const { rand, pick, shuffle } = A.util;

  /**
   * 연산별 문제 재료를 만든다. 각 함수는 { a, b, sym, ans, near } 를 돌려준다.
   * near: 아이가 실제로 헷갈리기 쉬운 오답 간격 (오답 보기를 만들 때 사용)
   * 뺄셈 · 나눗셈은 답이 음수나 나머지가 생기지 않도록 범위를 거꾸로 계산해서 만든다.
   */
  const GENERATORS = {
    add(level) {
      let a, b;
      if (level === 1) { a = rand(1, 9); b = rand(1, 9); }
      else if (level === 2) { a = rand(10, 79); b = rand(5, 99 - a); }
      else { a = rand(100, 599); b = rand(100, 999 - a); }
      return { a, b, sym: '+', ans: a + b, near: 10 };
    },
    sub(level) {
      let a, b;
      if (level === 1) { a = rand(2, 18); b = rand(1, Math.min(9, a - 1)); }
      else if (level === 2) { a = rand(20, 99); b = rand(5, a - 5); }
      else { a = rand(200, 999); b = rand(100, a - 50); }
      return { a, b, sym: '-', ans: a - b, near: 10 };
    },
    mul(level) {
      let a, b;
      if (level === 1) { a = pick([2, 3, 4, 5]); b = rand(1, 9); }
      else if (level === 2) { a = rand(2, 9); b = rand(1, 9); }
      else { a = rand(11, 30); b = rand(2, 9); }
      // 구구단 이웃 값(a 만큼 차이)이 가장 헷갈리는 오답
      return { a, b, sym: '×', ans: a * b, near: a };
    },
    div(level) {
      // 몫(q)과 나누는 수(d)를 먼저 정하고 나뉠 수를 곱해서 만든다 → 항상 나누어떨어짐
      let d, q;
      if (level === 1) { d = pick([2, 3, 4, 5]); q = rand(1, 9); }
      else if (level === 2) { d = rand(2, 9); q = rand(1, 9); }
      else { d = rand(2, 5); q = rand(10, 19); }
      return { a: d * q, b: d, sym: '÷', ans: q, near: 3 };
    },
  };

  /**
   * 오답 보기를 만든다. 무작위 숫자보다 "계산 실수로 나올 법한 값"을 먼저 쓴다.
   * (±1, ±2: 세기 실수 / ±10: 받아올림 · 받아내림 실수 / ±near: 구구단 이웃 값)
   * @param {number} ans 정답
   * @param {number} count 필요한 오답 개수
   * @param {number} near 연산별 헷갈리는 간격
   * @returns {number[]} 0 이상이며 정답 · 서로 간에 중복 없는 값
   */
  function distractors(ans, count, near) {
    const result = new Set();
    const candidates = shuffle([ans + 1, ans - 1, ans + 2, ans - 2, ans + near, ans - near]);
    for (const c of candidates) {
      if (result.size >= count) break;
      if (c >= 0 && c !== ans) result.add(c);
    }
    let spread = 3;
    while (result.size < count) {
      const c = ans + rand(-spread, spread);
      if (c >= 0 && c !== ans) result.add(c);
      spread++;
    }
    return [...result];
  }

  A.MathQ = {
    /**
     * 수학 문제 하나를 만든다.
     * @param {'add'|'sub'|'mul'|'div'|'mix'} op 연산 ('mix' 는 네 연산 중 무작위)
     * @param {1|2|3} level 단계
     * @returns {Question}
     */
    make(op, level) {
      if (op === 'mix') op = pick(['add', 'sub', 'mul', 'div']);
      const g = GENERATORS[op](level);
      const n = A.RULES.choicesByLevel[level];
      const choices = shuffle([g.ans, ...distractors(g.ans, n - 1, g.near)]).map(String);
      return {
        key: `${g.a}${g.sym}${g.b}`,
        prompt: `${g.a} ${g.sym} ${g.b} = ?`,
        hint: '',
        answer: String(g.ans),
        choices,
        review: `${g.a} ${g.sym} ${g.b} = ${g.ans}`,
      };
    },
  };
})(window.ARAH);

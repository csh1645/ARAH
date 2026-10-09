/**
 * @file 수학 사칙연산 문제 생성기 (엔진 독립). 1~6단계.
 * @layer questions
 * @depends A.util, A.RULES
 * @see doc/content/curriculum.md (수학) — 단계별 숫자 범위를 바꾸면 문서도 갱신한다
 *
 * 단계는 초등 1~4학년 흐름을 따르지만 화면에는 학년을 보여 주지 않는다 (data/curriculum.js 참고).
 */
(function (A) {
  'use strict';

  const { rand, pick, shuffle } = A.util;

  /** 받아올림이 생기는 한 자리 + 한 자리 (합 11~18) */
  function carryOnes() {
    const a = rand(2, 9);
    return [a, rand(11 - a, 9)];
  }

  /**
   * 연산별 문제 재료를 만든다. 각 함수는 { a, b, sym, ans, near } 를 돌려준다.
   * near: 아이가 실제로 헷갈리기 쉬운 오답 간격 (오답 보기를 만들 때 사용)
   * 뺄셈 · 나눗셈은 답이 음수나 나머지가 생기지 않도록 정답부터 정해 거꾸로 만든다.
   */
  const GENERATORS = {
    add(level) {
      let a;
      let b;
      let near = 10;
      switch (level) {
        case 1: a = rand(1, 9); b = rand(1, 10 - a); break; // 합 10 이하
        case 2: // 받아올림 있는 한 자리 덧셈, 또는 받아올림 없는 두 자리 + 한 자리
          if (Math.random() < 0.6) [a, b] = carryOnes();
          else { a = rand(1, 8) * 10 + rand(0, 8); b = rand(1, 9 - (a % 10)); }
          break;
        case 3: // 두 자리 + 한 자리 (받아올림), 또는 두 자리 + 두 자리 (받아올림 없음)
          if (Math.random() < 0.5) { a = rand(1, 8) * 10 + rand(2, 9); b = rand(10 - (a % 10), 9); }
          else { a = rand(1, 7) * 10 + rand(0, 8); b = rand(1, 8 - Math.floor(a / 10)) * 10 + rand(1, 9 - (a % 10)); }
          break;
        case 4: a = rand(10, 79); b = rand(5, 99 - a); break; // 두 자리 + 두 자리 (받아올림 포함)
        case 5: a = rand(100, 599); b = rand(100, 999 - a); near = 100; break; // 세 자리
        default: a = rand(1000, 5999); b = rand(100, 9999 - a); near = 100; break; // 네 자리
      }
      return { a, b, sym: '+', ans: a + b, near };
    },

    sub(level) {
      let a;
      let b;
      let near = 10;
      switch (level) {
        case 1: a = rand(2, 10); b = rand(1, a - 1); break; // 10 이하
        case 2: // 받아내림 있는 (십몇) - (몇), 또는 받아내림 없는 두 자리 - 한 자리
          if (Math.random() < 0.6) { const [x, y] = carryOnes(); a = x + y; b = y; }
          else { a = rand(1, 9) * 10 + rand(1, 9); b = rand(1, a % 10); }
          break;
        case 3: // 두 자리 - 한 자리 (받아내림), 또는 두 자리 - 두 자리 (받아내림 없음)
          if (Math.random() < 0.5) { a = rand(2, 9) * 10 + rand(0, 7); b = rand((a % 10) + 1, 9); }
          else { a = rand(2, 9) * 10 + rand(1, 9); b = rand(1, Math.floor(a / 10) - 1) * 10 + rand(0, a % 10); }
          break;
        case 4: a = rand(20, 99); b = rand(5, a - 5); break; // 두 자리 - 두 자리 (받아내림 포함)
        case 5: a = rand(200, 999); b = rand(100, a - 50); near = 100; break; // 세 자리
        default: a = rand(2000, 9999); b = rand(100, a - 100); near = 100; break; // 네 자리
      }
      return { a, b, sym: '-', ans: a - b, near };
    },

    mul(level) {
      let a;
      let b;
      switch (level) {
        case 1: a = pick([2, 5]); b = rand(1, 5); break; // 묶어 세기 (2씩, 5씩)
        case 2: a = pick([2, 3, 4, 5]); b = rand(1, 9); break; // 구구단 2~5단
        case 3: a = pick([6, 7, 8, 9]); b = rand(1, 9); break; // 구구단 6~9단
        case 4: a = rand(2, 9); b = rand(1, 9); break; // 구구단 전체
        case 5: a = rand(11, 50); b = rand(2, 9); break; // 두 자리 × 한 자리
        default: // 세 자리 × 한 자리, 또는 두 자리 × 두 자리
          if (Math.random() < 0.5) { a = rand(100, 400); b = rand(2, 9); }
          else { a = rand(11, 40); b = rand(11, 19); }
          break;
      }
      // 곱셈은 구구단 이웃 값(a 만큼 차이)이 가장 헷갈리는 오답. 큰 곱은 ±10 도 섞는다
      return { a, b, sym: '×', ans: a * b, near: level >= 5 ? pick([a, 10]) : a };
    },

    div(level) {
      // 몫(q)과 나누는 수(d)를 먼저 정하고 나뉠 수를 곱해서 만든다 → 항상 나누어떨어짐
      let d;
      let q;
      switch (level) {
        case 1: d = 2; q = rand(1, 5); break; // 똑같이 둘로 나누기
        case 2: d = rand(2, 5); q = rand(1, 9); break;
        case 3: d = rand(6, 9); q = rand(1, 9); break;
        case 4: d = rand(2, 9); q = rand(1, 9); break; // 구구단 거꾸로 전체
        case 5: d = rand(2, 9); q = rand(10, Math.floor(99 / d)); break; // 두 자리 ÷ 한 자리
        default: // 세 자리 ÷ 한 자리, 또는 두 자리 · 세 자리 ÷ 두 자리
          if (Math.random() < 0.5) { d = rand(2, 9); q = rand(Math.ceil(100 / d), Math.floor(999 / d)); }
          else { d = rand(11, 25); q = rand(2, 9); }
          break;
      }
      return { a: d * q, b: d, sym: '÷', ans: q, near: q >= 10 ? 10 : 3 };
    },
  };

  /**
   * 오답 보기를 만든다. 무작위 숫자보다 "계산 실수로 나올 법한 값"을 먼저 쓴다.
   * (±1, ±2: 세기 실수 / ±10 · ±100: 받아올림 · 받아내림 실수 / ±near: 구구단 이웃 값)
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
     * @param {1|2|3|4|5|6} level 단계
     * @returns {Question}
     */
    make(op, level) {
      if (op === 'mix') op = pick(['add', 'sub', 'mul', 'div']);
      const g = GENERATORS[op](level);
      const n = A.RULES.choicesByLevel[level];
      const choices = shuffle([g.ans, ...distractors(g.ans, n - 1, g.near)]).map(String);
      return {
        key: `${g.a}${g.sym}${g.b}`,
        subject: op,
        prompt: `${g.a} ${g.sym} ${g.b} = ?`,
        hint: '',
        answer: String(g.ans),
        choices,
        review: `${g.a} ${g.sym} ${g.b} = ${g.ans}`,
      };
    },
  };
})(window.ARAH);

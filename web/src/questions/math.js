/**
 * @file 수학 문제 생성기 (엔진 독립). 1~12단계 = 초1 ~ 중3 (추천 학년은 data/curriculum.js A.LEVELS).
 *       과목: 덧셈 · 뺄셈 · 곱셈 · 나눗셈 · □와 방정식(eq) · 섞어서(mix)
 * @layer questions
 * @depends A.util, A.RULES, A.MathValues
 * @see doc/content/curriculum.md (수학) — 단계별 범위를 바꾸면 문서도 갱신한다
 *
 * 단계 흐름 (같은 연산이 학년에 따라 "수의 종류"가 넓어진다):
 *   1~4 자연수 (초1~초4: 받아올림 → 구구단 → 큰 수)   5 분수 (초5)   6 소수 · 대분수 (초6)
 *   7~8 정수 · 음수 (중1)   9~10 문자식 · 다항식 (중2)   11 곱셈 공식 · 이차식 (중3)   12 제곱근 (중3)
 *
 * 생성기는 { prompt, answer, wrong, fallback, hint } 를 돌려준다.
 *   wrong: "실제로 하기 쉬운 실수"로 나오는 오답 후보 (앞쪽 우선) — 무작위 숫자보다 학습 효과가 크다
 *   fallback: 후보가 모자랄 때 오답을 하나 더 만드는 함수
 */
(function (A) {
  'use strict';

  const { rand, pick, shuffle } = A.util;
  const V = A.MathValues;
  const { MINUS, int, intIn, frac, fstr, fstrIn, dstr, dstrIn, pstr } = V;

  /** 0 이 아닌 정수 */
  const nz = (lo, hi) => {
    let n = 0;
    while (n === 0) n = rand(lo, hi);
    return n;
  };
  /** 0 · ±1 이 아닌 정수 (곱셈 · 나눗셈에서 ×1, ÷1 처럼 너무 쉬운 문제를 피한다) */
  const nz2 = (lo, hi) => {
    let n = 0;
    while (n >= -1 && n <= 1) n = rand(lo, hi);
    return n;
  };
  /** 제곱 인수가 없는 수 (√ 안에 남는 수) */
  const SQUARE_FREE = [2, 3, 5, 6, 7];
  const DENOMS = [2, 3, 4, 5, 6, 8, 10, 12];

  // ---------- 자연수 (1~4단계, 예전 1~6단계 내용을 그대로 이어 씀) ----------

  /** 받아올림이 생기는 한 자리 + 한 자리 (합 11~18) */
  function carryOnes() {
    const a = rand(2, 9);
    return [a, rand(11 - a, 9)];
  }

  /**
   * 자연수 사칙연산 재료. step 은 예전 단계(1~6) 기준의 세부 난이도.
   * 뺄셈 · 나눗셈은 답이 음수 · 나머지가 생기지 않도록 정답부터 정해 거꾸로 만든다.
   * @returns {{a: number, b: number, sym: string, ans: number, near: number}}
   */
  function natural(op, step) {
    let a;
    let b;
    if (op === 'add') {
      let near = 10;
      switch (step) {
        case 1: a = rand(1, 9); b = rand(1, 10 - a); break; // 합 10 이하
        case 2: // 받아올림 있는 한 자리, 받아올림 없는 두 자리 + 한 자리
          if (Math.random() < 0.6) [a, b] = carryOnes();
          else { a = rand(1, 8) * 10 + rand(0, 8); b = rand(1, 9 - (a % 10)); }
          break;
        case 3:
          if (Math.random() < 0.5) { a = rand(1, 8) * 10 + rand(2, 9); b = rand(10 - (a % 10), 9); }
          else { a = rand(1, 7) * 10 + rand(0, 8); b = rand(1, 8 - Math.floor(a / 10)) * 10 + rand(1, 9 - (a % 10)); }
          break;
        case 4: a = rand(10, 79); b = rand(5, 99 - a); break; // 두 자리 + 두 자리
        case 5: a = rand(100, 599); b = rand(100, 999 - a); near = 100; break; // 세 자리
        default: a = rand(1000, 5999); b = rand(100, 9999 - a); near = 100; break; // 네 자리
      }
      return { a, b, sym: '+', ans: a + b, near };
    }
    if (op === 'sub') {
      let near = 10;
      switch (step) {
        case 1: a = rand(2, 10); b = rand(1, a - 1); break;
        case 2:
          if (Math.random() < 0.6) { const [x, y] = carryOnes(); a = x + y; b = y; }
          else { a = rand(1, 9) * 10 + rand(1, 9); b = rand(1, a % 10); }
          break;
        case 3:
          if (Math.random() < 0.5) { a = rand(2, 9) * 10 + rand(0, 7); b = rand((a % 10) + 1, 9); }
          else { a = rand(2, 9) * 10 + rand(1, 9); b = rand(1, Math.floor(a / 10) - 1) * 10 + rand(0, a % 10); }
          break;
        case 4: a = rand(20, 99); b = rand(5, a - 5); break;
        case 5: a = rand(200, 999); b = rand(100, a - 50); near = 100; break;
        default: a = rand(2000, 9999); b = rand(100, a - 100); near = 100; break;
      }
      return { a, b, sym: MINUS, ans: a - b, near };
    }
    if (op === 'mul') {
      switch (step) {
        case 1: a = pick([2, 5]); b = rand(1, 5); break; // 묶어 세기
        case 2: a = pick([2, 3, 4, 5]); b = rand(1, 9); break;
        case 3: a = pick([6, 7, 8, 9]); b = rand(1, 9); break;
        case 4: a = rand(2, 9); b = rand(1, 9); break; // 구구단 전체
        case 5: a = rand(11, 50); b = rand(2, 9); break; // 두 자리 × 한 자리
        default:
          if (Math.random() < 0.5) { a = rand(100, 400); b = rand(2, 9); } else { a = rand(11, 40); b = rand(11, 19); }
          break;
      }
      // 구구단 이웃 값(a 만큼 차이)이 가장 헷갈리는 오답. 큰 곱은 ±10 도 섞는다
      return { a, b, sym: '×', ans: a * b, near: step >= 5 ? pick([a, 10]) : a };
    }
    // 나눗셈: 몫(q)과 나누는 수(d)를 먼저 정한다 → 항상 나누어떨어짐
    let d;
    let q;
    switch (step) {
      case 1: d = 2; q = rand(1, 5); break;
      case 2: d = rand(2, 5); q = rand(1, 9); break;
      case 3: d = rand(6, 9); q = rand(1, 9); break;
      case 4: d = rand(2, 9); q = rand(1, 9); break;
      case 5: d = rand(2, 9); q = rand(10, Math.floor(99 / d)); break;
      default:
        if (Math.random() < 0.5) { d = rand(2, 9); q = rand(Math.ceil(100 / d), Math.floor(999 / d)); } else { d = rand(11, 25); q = rand(2, 9); }
        break;
    }
    return { a: d * q, b: d, sym: '÷', ans: q, near: q >= 10 ? 10 : 3 };
  }

  /** 새 단계 1~4 → 예전 세부 난이도 (1단계 = 예전 1 · 2, 2단계 = 예전 3 · 4, 3단계 = 예전 5, 4단계 = 예전 6) */
  const NATURAL_STEPS = { 1: [1, 2], 2: [3, 4], 3: [5], 4: [6] };

  /** 자연수 오답: ±1 ±2(세기 실수), ±near(받아올림 · 구구단 이웃) */
  function naturalQ(op, level) {
    const g = natural(op, pick(NATURAL_STEPS[level]));
    const ans = g.ans;
    return {
      prompt: `${g.a} ${g.sym} ${g.b} = ?`,
      answer: String(ans),
      wrong: shuffle([ans + 1, ans - 1, ans + 2, ans - 2, ans + g.near, ans - g.near]).filter((c) => c >= 0).map(String),
      fallback: () => String(Math.max(0, ans + rand(-9, 9))),
      hint: '',
    };
  }

  // ---------- 분수 · 소수 (4~6단계) ----------

  /**
   * 분수 정답 + 실수 오답 (분모끼리 · 분자끼리 더하기, 분자 ±1).
   * mixed(초등) 이면 음수 오답은 뺀다 — 음수는 중학 내용이라 초등 보기에 나오면 안 된다.
   */
  function fracQ(prompt, ansF, mistakes, hint, mixed = true) {
    const s = (f) => (mixed && f.n < 0 ? '0' : fstr(f, mixed)); // 초등의 음수 → '0' 으로 바꿔 아래에서 걸러진다
    return {
      prompt,
      answer: s(ansF),
      // 0 은 거의 고르지 않는 의미 없는 오답이라 뺀다
      wrong: shuffle([...mistakes.map(s), s(frac(ansF.n + 1, ansF.d)), s(frac(ansF.n - 1, ansF.d)), s(frac(ansF.n + ansF.d, ansF.d))]).filter((w) => w !== '0'),
      fallback: () => {
        const f = frac(mixed ? Math.abs(ansF.n + nz(-4, 4)) : ansF.n + nz(-4, 4), ansF.d);
        return f.n === 0 ? s(frac(ansF.n + ansF.d * 2, ansF.d)) : s(f); // 0 은 오답으로 쓰지 않는다
      },
      hint,
    };
  }

  function sameDenom(op) {
    const d = rand(3, 9);
    let a = rand(1, d - 1);
    let b = rand(1, d - 1);
    if (op === 'sub' && a < b) [a, b] = [b, a];
    if (op === 'sub' && a === b) a = Math.min(d - 1, a + 1), b = Math.max(1, b - 1);
    const A1 = frac(a, d);
    const B1 = frac(b, d);
    const ans = op === 'add' ? V.fadd(A1, B1) : V.fsub(A1, B1);
    const wrongDen = frac(op === 'add' ? a + b : a - b, d * 2); // 분모끼리도 더한 실수
    return fracQ(`${a}/${d} ${op === 'add' ? '+' : MINUS} ${b}/${d} = ?`, ans, [wrongDen], '분모가 같으면 분자끼리 계산해요');
  }

  function diffDenom(op) {
    let d1 = pick(DENOMS);
    let d2 = pick(DENOMS.filter((x) => x !== d1));
    let a = frac(rand(1, d1 - 1), d1);
    let b = frac(rand(1, d2 - 1), d2);
    while (a.d === b.d) { // 약분하면 분모가 같아지는 경우(2/4 와 1/2) 다시 뽑아 통분 연습이 되게
      d2 = pick(DENOMS.filter((x) => x !== d1));
      b = frac(rand(1, d2 - 1), d2);
    }
    if (op === 'sub' && a.n * b.d < b.n * a.d) [a, b, d1, d2] = [b, a, d2, d1];
    if (op === 'sub' && a.n * b.d === b.n * a.d) a = frac(a.n * 2 + 1, a.d * 2);
    const ans = op === 'add' ? V.fadd(a, b) : V.fsub(a, b);
    const naive = frac(op === 'add' ? a.n + b.n : Math.abs(a.n - b.n) || 1, a.d + b.d); // 분자끼리 · 분모끼리 계산하는 실수
    return fracQ(`${fstr(a)} ${op === 'add' ? '+' : MINUS} ${fstr(b)} = ?`, ans, [naive], '통분해서 계산해요 (답은 기약분수)');
  }

  function mixedNumbers(op) {
    let a = frac(rand(1, 3) * 6 + rand(1, 5), 6);
    let b = frac(rand(1, 2) * 4 + rand(1, 3), 4);
    while (a.n * b.d === b.n * a.d) b = frac(rand(1, 2) * 4 + rand(1, 3), 4); // 같은 수끼리 빼면 0
    if (op === 'sub' && a.n * b.d < b.n * a.d) [a, b] = [b, a];
    const ans = op === 'add' ? V.fadd(a, b) : V.fsub(a, b);
    return fracQ(`${fstrIn(a)} ${op === 'add' ? '+' : MINUS} ${fstrIn(b)} = ?`, ans, [frac(ans.n + 2, ans.d)], '자연수끼리, 분수끼리 계산해요');
  }

  /** 소수 덧셈 · 뺄셈 (값 × 100 으로 계산). 자리를 잘못 맞추는 실수(×10)를 오답으로 */
  function decimalAddSub(op) {
    let a = rand(11, 999);
    let b = rand(11, 999);
    if (Math.random() < 0.5) a = rand(1, 99) * 10; // 소수 한 자리
    if (op === 'sub' && a < b) [a, b] = [b, a];
    if (a === b) a += 10;
    const ans = op === 'add' ? a + b : a - b;
    return {
      prompt: `${dstr(a)} ${op === 'add' ? '+' : MINUS} ${dstr(b)} = ?`,
      answer: dstr(ans),
      wrong: shuffle([ans + 10, ans - 10, ans + 1, ans - 1, ans + 100, ans * 10]).filter((h) => h > 0).map(dstr),
      fallback: () => dstr(Math.max(1, ans + nz(-30, 30))),
      hint: '소수점끼리 맞춰서 계산해요',
    };
  }

  // ---------- 정수 (7~8단계) ----------

  function intQ(prompt, ans, mistakes, hint) {
    return {
      prompt,
      answer: int(ans),
      wrong: [...shuffle(mistakes), ans + 1, ans - 1, ans + 2, ans - 2].map(int),
      fallback: () => int(ans + nz(-10, 10)),
      hint,
    };
  }

  // ---------- 다항식 · 제곱근 (9~12단계) ----------

  /** 다항식 정답과 실수 오답 (부호 · 계수 · 차수) */
  function polyQ(prompt, ans, mistakes, hint, v = 'x') {
    const s = (p) => pstr(p, v);
    const tweak = () => {
      const keys = Object.keys(ans);
      const k = pick(keys);
      return s({ ...ans, [k]: ans[k] + pick([-1, 1, -2, 2]) });
    };
    return {
      prompt,
      answer: s(ans),
      wrong: [...shuffle(mistakes.map(s)), tweak(), tweak()],
      fallback: tweak,
      hint,
    };
  }

  /** a x^e 단항식 */
  const mono = (c, e) => ({ [e]: c });
  /** 식 안의 다항식: 항이 둘 이상이거나 음수로 시작하면 괄호 (예: 5x² × (−x²)) */
  const pIn = (p, v = 'x') => {
    const s = pstr(p, v);
    return Object.values(p).filter((c) => c !== 0).length > 1 || s.startsWith(MINUS) ? `(${s})` : s;
  };

  function rootQ(prompt, k, m, mistakes, hint) {
    return {
      prompt,
      answer: V.rstr(k, m),
      wrong: shuffle([...mistakes, V.rstr(k + 1, m), V.rstr(k - 1 || 2, m), V.rstr(k, m === 2 ? 3 : 2)]),
      fallback: () => V.rstr(nz(-8, 9), pick(SQUARE_FREE)),
      hint,
    };
  }

  // ---------- 연산별 · 단계별 생성기 ----------

  const GENERATORS = {
    add(level) {
      if (level <= 3) return naturalQ('add', level);
      if (level === 4) return Math.random() < 0.7 ? naturalQ('add', 4) : sameDenom('add');
      if (level === 5) return diffDenom('add');
      if (level === 6) return Math.random() < 0.6 ? decimalAddSub('add') : mixedNumbers('add');
      if (level === 7) { // 정수 덧셈
        const a = nz(-20, 20);
        const b = a > 0 ? nz(-20, -1) : nz(-20, 20);
        return intQ(`${intIn(a)} + ${intIn(b)} = ?`, a + b, [-(a + b), a - b, b - a], '부호가 다르면 큰 수에서 작은 수를 빼고 큰 수의 부호');
      }
      if (level === 8) {
        if (Math.random() < 0.5) {
          const [a, b, c] = [nz(-15, 15), nz(-15, 15), nz(-15, 15)];
          return intQ(`${intIn(a)} + ${intIn(b)} + ${intIn(c)} = ?`, a + b + c, [-(a + b + c), a + b - c, a - b + c], '양수끼리, 음수끼리 먼저 모아요');
        }
        const a = nz(-99, 99) * 10;
        const b = nz(-99, 99) * 10;
        return { // 음수 소수 (값 × 100)
          prompt: `${dstrIn(a)} + ${dstrIn(b)} = ?`,
          answer: dstr(a + b),
          wrong: [dstr(-(a + b)), dstr(a - b), dstr(b - a), dstr(a + b + 10), dstr(a + b - 10)],
          fallback: () => dstr(a + b + nz(-5, 5) * 10),
          hint: '음수 소수도 정수처럼 부호를 먼저 봐요',
        };
      }
      if (level === 9) { // 동류항
        if (Math.random() < 0.5) {
          const [a, b] = [nz(-9, 9), nz(-9, 9)];
          return polyQ(`${pstr(mono(a, 1))} + ${pIn(mono(b, 1))} = ?`, mono(a + b, 1), [mono(a - b, 1), mono(a * b, 2), mono(a + b, 2)], '같은 문자끼리 계수를 더해요');
        }
        const [a, c, b] = [rand(2, 9), nz(-9, 9), rand(2, 9)];
        return polyQ(`${a}a + ${intIn(c)} + ${b}a = ?`, { 1: a + b, 0: c }, [{ 1: a + b + c }, { 1: a + b, 0: -c }, { 1: a * b, 0: c }], '같은 문자끼리, 수끼리 모아요', 'a');
      }
      if (level === 10) { // 다항식 덧셈
        const p = { 1: nz(-9, 9), 0: nz(-9, 9) };
        const q = { 1: nz(-9, 9), 0: nz(-9, 9) };
        return polyQ(`${pIn(p)} + ${pIn(q)} = ?`, V.padd(p, q), [{ 1: p[1] + q[1], 0: p[0] - q[0] }, { 1: p[1] - q[1], 0: p[0] + q[0] }], '괄호를 풀고 동류항끼리 더해요');
      }
      if (level === 11) {
        const p = { 2: nz(-5, 5), 1: nz(-9, 9) };
        const q = { 2: nz(-5, 5), 1: nz(-9, 9), 0: nz(-9, 9) };
        return polyQ(`${pIn(p)} + ${pIn(q)} = ?`, V.padd(p, q), [{ ...V.padd(p, q), 0: -q[0] }, { 2: p[2] + q[2] + p[1] + q[1], 0: q[0] }], 'x² 끼리, x 끼리, 수끼리');
      }
      // 12: 제곱근 덧셈
      const m = pick(SQUARE_FREE);
      if (Math.random() < 0.5) {
        const [a, b] = [rand(1, 7), rand(1, 7)];
        return rootQ(`${V.rstr(a, m)} + ${V.rstr(b, m)} = ?`, a + b, m, [V.rstr(a + b, m * 2), V.rstr(a * b, m)], '√ 안이 같으면 앞의 수끼리 더해요');
      }
      const [j, k] = [rand(2, 4), rand(1, 3)]; // √(j²m) + √(k²m) = (j + k)√m
      return rootQ(`√${j * j * m} + √${k * k * m} = ?`, j + k, m, [`√${j * j * m + k * k * m}`, V.rstr(j * k, m)], '√ 안을 간단히 한 다음 더해요');
    },

    sub(level) {
      if (level <= 3) return naturalQ('sub', level);
      if (level === 4) return Math.random() < 0.7 ? naturalQ('sub', 4) : sameDenom('sub');
      if (level === 5) return diffDenom('sub');
      if (level === 6) return Math.random() < 0.6 ? decimalAddSub('sub') : mixedNumbers('sub');
      if (level === 7) {
        const [a, b] = [nz(-20, 20), nz(-20, 20)];
        return intQ(`${intIn(a)} ${MINUS} ${intIn(b)} = ?`, a - b, [a + b, b - a, -(a + b)], '빼기는 빼는 수의 부호를 바꿔 더하기로');
      }
      if (level === 8) {
        const [a, b, c] = [nz(-15, 15), nz(-15, 15), nz(-15, 15)];
        return intQ(`${intIn(a)} ${MINUS} ${intIn(b)} + ${intIn(c)} = ?`, a - b + c, [a + b + c, a - b - c, -(a - b + c)], '빼는 수는 부호를 바꿔 더해요');
      }
      if (level === 9) {
        if (Math.random() < 0.5) {
          const [a, b] = [rand(2, 9), nz(-9, 9)];
          return polyQ(`${pstr(mono(a, 1))} ${MINUS} ${pIn(mono(b, 1))} = ?`, mono(a - b, 1), [mono(a + b, 1), mono(b - a, 1), { 0: a - b }], '같은 문자끼리 계수를 빼요');
        }
        const [a, c, b] = [rand(4, 9), nz(-9, 9), rand(2, 3)];
        return polyQ(`${a}a + ${intIn(c)} ${MINUS} ${b}a = ?`, { 1: a - b, 0: c }, [{ 1: a + b, 0: c }, { 1: a - b - c }], '같은 문자끼리, 수끼리 모아요', 'a');
      }
      if (level === 10) { // 괄호 앞 빼기: 뒤 식의 부호를 모두 바꾸지 않는 실수가 가장 흔하다
        const p = { 1: nz(-9, 9), 0: nz(-9, 9) };
        const q = { 1: nz(-9, 9), 0: nz(-9, 9) };
        return polyQ(`${pIn(p)} ${MINUS} ${pIn(q)} = ?`, V.psub(p, q), [{ 1: p[1] - q[1], 0: p[0] + q[0] }, V.padd(p, q)], '괄호 앞이 − 이면 괄호 안 부호를 모두 바꿔요');
      }
      if (level === 11) {
        const p = { 2: nz(-5, 5), 1: nz(-9, 9), 0: nz(-9, 9) };
        const q = { 2: nz(-5, 5), 1: nz(-9, 9) };
        return polyQ(`${pIn(p)} ${MINUS} ${pIn(q)} = ?`, V.psub(p, q), [{ 2: p[2] - q[2], 1: p[1] + q[1], 0: p[0] }, V.padd(p, q)], '괄호 앞이 − 이면 괄호 안 부호를 모두 바꿔요');
      }
      const m = pick(SQUARE_FREE);
      const [a, b] = [rand(3, 9), rand(1, 7)];
      return rootQ(`${V.rstr(a, m)} ${MINUS} ${V.rstr(b, m)} = ?`, a - b, m, [`√${Math.max(2, (a - b) * (a - b) * m)}`, V.rstr(a + b, m)], '√ 안이 같으면 앞의 수끼리 빼요');
    },

    mul(level) {
      if (level <= 4) return naturalQ('mul', level);
      if (level === 5) { // 분수의 곱셈
        if (Math.random() < 0.5) {
          const d = rand(3, 9);
          const a = frac(rand(1, d - 1), d);
          const n = rand(2, 9);
          return fracQ(`${fstr(a)} × ${n} = ?`, V.fmul(a, frac(n, 1)), [frac(a.n * n, a.d * n)], '분자에만 자연수를 곱해요 (답은 기약분수)');
        }
        const a = frac(rand(1, 5), rand(6, 9));
        const b = frac(rand(1, 5), rand(6, 9));
        return fracQ(`${fstr(a)} × ${fstr(b)} = ?`, V.fmul(a, b), [frac(a.n + b.n, a.d + b.d), frac(a.n * b.d, a.d * b.n)], '분자끼리, 분모끼리 곱해요');
      }
      if (level === 6) { // 소수의 곱셈 (값 × 10 으로 만들어 × 10 끼리 곱하면 × 100)
        const a = rand(2, 9) * 10 + rand(1, 9); // 1.1 ~ 9.9 (정수가 아닌 소수)
        const b = Math.random() < 0.5 ? rand(2, 9) * 10 : rand(11, 19); // 자연수 2~9 또는 1.1 ~ 1.9
        const ans = a * b; // 단위: 1/100
        return {
          prompt: `${dstr(a * 10)} × ${dstr(b * 10)} = ?`,
          answer: dstr(ans),
          wrong: shuffle([ans * 10, ans / 10, ans + 10, ans - 10]).filter((h) => h > 0 && Number.isInteger(h)).map(dstr),
          fallback: () => dstr(Math.max(1, ans + nz(-20, 20))),
          hint: '소수점 아래 자리 수를 더한 만큼 소수점을 찍어요',
        };
      }
      if (level === 7) { // 정수의 곱셈 · 거듭제곱
        if (Math.random() < 0.65) {
          const [a, b] = [nz2(-12, 12), nz2(-9, 9)];
          return intQ(`${intIn(a)} × ${intIn(b)} = ?`, a * b, [-(a * b), a + b, a * b + a], '음수가 짝수 개면 +, 홀수 개면 −');
        }
        const base = pick([-5, -4, -3, -2, 2, 3, 4, 5]);
        const e = rand(2, 3);
        const ans = base ** e;
        return intQ(`${intIn(base)}${V.sup(e)} = ?`, ans, [-ans, base * e, Math.abs(ans) === ans ? -ans : Math.abs(ans)], '음수를 짝수 번 곱하면 +');
      }
      if (level === 8) {
        const [a, b, c] = [nz2(-6, 6), nz2(-6, 6), nz2(-5, 5)];
        return intQ(`${intIn(a)} × ${intIn(b)} × ${intIn(c)} = ?`, a * b * c, [-(a * b * c), a * b + c, a + b + c], '부호를 먼저 정하고 크기를 곱해요');
      }
      if (level === 9) { // 단항식의 곱셈
        const [a, b] = [nz(-6, 6), nz2(-6, 6)];
        const [e1, e2] = [rand(1, 2), rand(0, 2)];
        return polyQ(`${pstr(mono(a, e1))} × ${pIn(mono(b, e2))} = ?`, mono(a * b, e1 + e2), [mono(a * b, e1 * e2 || 1), mono(a + b, e1 + e2), mono(-a * b, e1 + e2)], '계수끼리 곱하고, 지수는 더해요');
      }
      if (level === 10) { // 분배법칙 · 단항식의 제곱
        if (Math.random() < 0.6) {
          const c = nz(-6, 6);
          const p = { 1: nz(-6, 6), 0: nz(-9, 9) };
          return polyQ(`${int(c)}${pIn(p)} = ?`, V.pscale(p, c), [{ 1: p[1] * c, 0: p[0] }, { 1: p[1] * c, 0: -p[0] * c }], '괄호 안의 모든 항에 곱해요');
        }
        const a = nz2(-5, 5);
        return polyQ(`(${pstr(mono(a, 1))})² = ?`, mono(a * a, 2), [mono(a * 2, 2), mono(a, 2), mono(a * a, 1)], '계수도 제곱, 문자도 제곱');
      }
      if (level === 11) { // 곱셈 공식
        const [p, q] = [nz(-9, 9), nz(-9, 9)];
        const ans = V.pmul({ 1: 1, 0: p }, { 1: 1, 0: q });
        return polyQ(`(${pstr({ 1: 1, 0: p })})(${pstr({ 1: 1, 0: q })}) = ?`, ans, [{ 2: 1, 0: p * q }, { 2: 1, 1: p * q, 0: p + q }, { 2: 1, 1: p + q, 0: p + q }], '(x + a)(x + b) = x² + (a + b)x + ab');
      }
      // 12: 제곱근의 곱셈
      if (Math.random() < 0.5) {
        const m = pick(SQUARE_FREE);
        const [a, b] = [rand(1, 5), rand(2, 5)];
        return intQ(`${V.rstr(a, m)} × ${V.rstr(b, m)} = ?`, a * b * m, [a * b, a * b * m * m, (a + b) * m], '√m × √m = m');
      }
      const m = pick([2, 3, 5]);
      const [x, y] = [m * pick([1, 2, 3]), m * pick([2, 4, 6])]; // √x × √y = √(xy) → 간단히
      const [k, r] = V.simplifyRoot(x * y);
      return rootQ(`√${x} × √${y} = ?`, k, r, [`√${x + y}`, V.rstr(k + 1, r)], '√ 안끼리 곱한 다음 간단히');
    },

    div(level) {
      if (level <= 4) return naturalQ('div', level);
      if (level === 5) { // 분수 ÷ 자연수
        const d = rand(3, 9);
        const n = rand(2, 5);
        const c = rand(1, d - 1);
        const dividend = frac(c * n, d);
        return fracQ(`${fstr(dividend)} ÷ ${n} = ?`, frac(c, d), [V.fmul(dividend, frac(n, 1)), frac(c * n, d * n * n)], '분수 ÷ 자연수 = 분수 × (1/자연수)');
      }
      if (level === 6) {
        if (Math.random() < 0.5) { // 분수 ÷ 분수
          const a = frac(rand(1, 8), rand(2, 9));
          let b = frac(rand(1, 8), rand(2, 9));
          while (b.d === 1 || (b.n === a.n && b.d === a.d)) b = frac(rand(1, 8), rand(2, 9)); // ÷ 자연수 · 같은 수 ÷ 같은 수 제외
          return fracQ(`${fstr(a)} ÷ ${fstr(b)} = ?`, V.fdiv(a, b), [V.fmul(a, b), V.fdiv(b, a)], '나누는 분수를 뒤집어서 곱해요');
        }
        const q = rand(2, 12); // 소수 ÷ 소수 (몫이 자연수)
        const d = rand(2, 9); // 단위 1/10
        return {
          prompt: `${dstr(q * d * 10)} ÷ ${dstr(d * 10)} = ?`,
          answer: String(q),
          wrong: shuffle([q * 10, q + 1, q - 1, q * d]).filter((x) => x > 0).map(String),
          fallback: () => String(q + nz(-4, 4)),
          hint: '두 수에 똑같이 10을 곱해서 나눠요',
        };
      }
      if (level === 7) {
        const [q, d] = [nz2(-12, 12), nz2(-9, 9)];
        return intQ(`${intIn(q * d)} ÷ ${intIn(d)} = ?`, q, [-q, q * d * d, q + d], '부호가 같으면 +, 다르면 −');
      }
      if (level === 8) { // 정수 ÷ 분수
        let b = frac(nz(-5, 5), rand(2, 5));
        while (b.d === 1) b = frac(nz(-5, 5), rand(2, 5)); // 약분해서 정수가 되면 분수 나눗셈이 아니다
        const q = nz(-6, 6);
        const a = q * b.n; // a ÷ (n/d) = a × d / n
        const ans = V.fdiv(frac(a, 1), b);
        return fracQ(`${intIn(a)} ÷ ${fstrIn(b, false)} = ?`, ans, [V.fmul(frac(a, 1), b), frac(-ans.n, ans.d)], '나누는 분수를 뒤집어 곱해요 (역수)', false);
      }
      if (level === 9) { // 단항식의 나눗셈
        const [a, b] = [nz(-6, 6), nz(-6, 6)];
        const [e1, e2] = [rand(2, 4), 1];
        return polyQ(`${pstr(mono(a * b, e1))} ÷ ${pIn(mono(b, e2))} = ?`, mono(a, e1 - e2), [mono(a, e1), mono(-a, e1 - e2), mono(a * b * b, e1 - e2)], '계수끼리 나누고, 지수는 빼요');
      }
      if (level === 10) { // 다항식 ÷ 단항식
        const c = nz(-4, 4);
        const q = { 1: nz(-6, 6), 0: nz(-6, 6) };
        const dividend = V.pmul(q, mono(c, 1));
        return polyQ(`${pIn(dividend)} ÷ ${pIn(mono(c, 1))} = ?`, q, [{ 1: q[1], 0: q[0] * c }, { 2: q[1], 1: q[0] }], '각 항을 똑같이 나눠요');
      }
      if (level === 11) { // 인수분해를 이용한 나눗셈
        const [p, q] = [nz(-9, 9), nz(-9, 9)];
        const dividend = V.pmul({ 1: 1, 0: p }, { 1: 1, 0: q });
        return polyQ(`${pIn(dividend)} ÷ ${pIn({ 1: 1, 0: p })} = ?`, { 1: 1, 0: q }, [{ 1: 1, 0: -q }, { 1: 1, 0: p }, { 1: 1, 0: p * q }], '먼저 인수분해해요');
      }
      // 12: 제곱근의 나눗셈
      const m = pick(SQUARE_FREE);
      const y = pick([2, 3, 5]);
      const [k, j] = [rand(1, 4), rand(1, 3)];
      const [ck, cm] = V.simplifyRoot(m * y);
      return rootQ(`${V.rstr(k * j * ck, cm)} ÷ ${V.rstr(j, y)} = ?`, k, m, [V.rstr(k * j, m), V.rstr(k, m * y)], '앞의 수끼리, √ 안끼리 나눠요');
    },

    /** □와 방정식: 초등은 □ 넣기 · 혼합 계산 · 비례식, 중학은 방정식 */
    eq(level) {
      if (level <= 4) { // □ 넣기 — 자연수 문제를 거꾸로
        const op = level === 1 ? pick(['add', 'sub']) : pick(['add', 'sub', 'mul', 'div']);
        const g = natural(op, pick(NATURAL_STEPS[level]));
        const blankFirst = Math.random() < 0.5;
        const ans = blankFirst ? g.a : g.b;
        const prompt = blankFirst ? `□ ${g.sym} ${g.b} = ${g.ans}` : `${g.a} ${g.sym} □ = ${g.ans}`;
        return {
          prompt,
          answer: String(ans),
          wrong: shuffle([g.ans, ans + 1, ans - 1, ans + 2, ans + g.near, Math.abs(ans - g.near)]).map(String),
          fallback: () => String(Math.max(0, ans + nz(-9, 9))),
          hint: '□에 들어갈 수를 찾아요',
        };
      }
      if (level === 5) { // 혼합 계산: 순서대로(왼쪽부터) 계산하는 실수를 오답으로
        const [a, b, c] = [rand(2, 9), rand(2, 9), rand(2, 3)];
        const forms = [
          [`${a} + ${b} × ${c} = ?`, a + b * c, (a + b) * c],
          [`(${a} + ${b}) × ${c} = ?`, (a + b) * c, a + b * c],
          [`${(a + b) * c} ${MINUS} ${b} × ${c} = ?`, a * c, ((a + b) * c - b) * c],
          [`${a} × ${b} ${MINUS} ${c} = ?`, a * b - c, a * Math.max(0, b - c)], // c < a × b 라 답은 항상 양수
        ];
        const [prompt, ans, mistake] = pick(forms);
        return {
          prompt,
          answer: String(ans),
          wrong: [mistake, ans + 1, ans - 1, ans + 10].filter((x) => x >= 0).map(String),
          fallback: () => String(Math.max(0, ans + nz(-9, 9))),
          hint: '괄호 → 곱셈 · 나눗셈 → 덧셈 · 뺄셈 순서',
        };
      }
      if (level === 6) { // 비례식 · 백분율
        if (Math.random() < 0.5) {
          const a = rand(1, 9);
          const b = pick([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== a)); // a : a 처럼 뻔한 비 제외
          const k = rand(2, 6);
          return {
            prompt: `${a} : ${b} = ${a * k} : □`,
            answer: String(b * k),
            wrong: [b + k, a * k, b * k + 1, b * k - 1].filter((x) => x > 0).map(String),
            fallback: () => String(Math.max(1, b * k + nz(-5, 5))),
            hint: '외항의 곱 = 내항의 곱',
          };
        }
        const total = pick([20, 40, 50, 60, 80, 100, 200]);
        const pct = pick([10, 20, 25, 30, 50, 75]);
        const ans = (total * pct) / 100;
        return {
          prompt: `${total}의 ${pct}% = ?`,
          answer: String(ans),
          wrong: [ans * 10, total - ans, pct, ans + 5].filter((x) => x > 0 && Number.isInteger(x)).map(String),
          fallback: () => String(Math.max(1, ans + nz(-6, 6))),
          hint: '%는 100 중에서 얼마인지예요',
        };
      }
      const xAns = (x, mistakes, prompt, hint) => ({
        prompt,
        answer: `x = ${int(x)}`,
        wrong: [...mistakes, x + 1, x - 1, -x].map((v) => `x = ${int(v)}`),
        fallback: () => `x = ${int(x + nz(-6, 6))}`,
        hint,
      });
      if (level === 7) { // 일차방정식
        const x = nz(-9, 12);
        const a = rand(2, 9);
        const b = nz(-15, 15);
        return xAns(x, [(a * x + b + b) / a | 0, a * x + b - b * 2], `${a}x ${b < 0 ? MINUS : '+'} ${Math.abs(b)} = ${int(a * x + b)}`, '이항할 때 부호가 바뀌어요');
      }
      if (level === 8) { // 양변에 x
        const x = nz(-9, 9);
        const [a, c] = [rand(3, 9), rand(1, 2)];
        const b = nz(-12, 12);
        const d = (a - c) * x + b; // ax + b = cx + d
        return xAns(x, [(d + b) / (a - c) | 0, (d - b) / (a + c) | 0], `${a}x ${b < 0 ? MINUS : '+'} ${Math.abs(b)} = ${c === 1 ? '' : c}x ${d < 0 ? MINUS : '+'} ${Math.abs(d)}`, 'x 는 왼쪽, 수는 오른쪽으로 모아요');
      }
      if (level === 9) { // 연립방정식
        const [x, y] = [nz(-6, 9), nz(-6, 9)];
        const k = rand(2, 3);
        const pair = (px, py) => `x = ${int(px)}, y = ${int(py)}`;
        return {
          prompt: `x + y = ${int(x + y)},  ${k}x ${MINUS} y = ${int(k * x - y)}`,
          answer: pair(x, y),
          wrong: [pair(y, x), pair(x, -y), pair(-x, y), pair(x + 1, y - 1)],
          fallback: () => pair(x + nz(-3, 3), y + nz(-3, 3)),
          hint: '두 식을 더해서 y 를 없애요',
        };
      }
      if (level === 10) { // 일차함수의 값
        const [a, b, k] = [nz(-5, 5), nz(-9, 9), nz(-5, 5)];
        const y = a * k + b;
        return {
          prompt: `y = ${pstr({ 1: a, 0: b })} 에서 x = ${int(k)} 일 때 y = ?`,
          answer: int(y),
          wrong: [a * k - b, a + k + b, -y, y + a].map(int),
          fallback: () => int(y + nz(-6, 6)),
          hint: 'x 자리에 수를 넣어 계산해요',
        };
      }
      const two = (p, q) => { // "x = p 또는 q" (작은 값부터)
        const [s, t] = [Math.min(p, q), Math.max(p, q)];
        return s === t ? `x = ${int(s)}` : `x = ${int(s)} 또는 ${int(t)}`;
      };
      if (level === 11) { // 인수분해로 푸는 이차방정식
        let [p, q] = [nz(-7, 7), nz(-7, 7)];
        if (p === q) q = p + 1 || 2;
        const poly = V.pmul({ 1: 1, 0: -p }, { 1: 1, 0: -q });
        return {
          prompt: `${pstr(poly)} = 0`,
          answer: two(p, q),
          wrong: [two(-p, -q), two(p, -q), two(-p, q), two(p + q, p * q)],
          fallback: () => two(p + nz(-2, 2), q + nz(-2, 2)),
          hint: '(x − a)(x − b) = 0 이면 x = a 또는 b',
        };
      }
      // 12: 제곱근을 이용한 이차방정식
      const k = rand(2, 9);
      if (Math.random() < 0.5) {
        return {
          prompt: `x² = ${k * k}`,
          answer: `x = ±${k}`,
          wrong: [`x = ${k}`, `x = ${k * k}`, `x = ±${k * 2}`, `x = ${MINUS}${k}`],
          fallback: () => `x = ±${k + nz(-2, 2) || 1}`,
          hint: '제곱해서 그 수가 되는 수는 두 개',
        };
      }
      const a = nz(-5, 5);
      return {
        prompt: `(${pstr({ 1: 1, 0: -a })})² = ${k * k}`,
        answer: two(a - k, a + k),
        wrong: [two(-a - k, -a + k), two(a, k), `x = ${int(a + k)}`, two(a - k * k, a + k * k)],
        fallback: () => two(a - k + nz(-2, 2), a + k),
        hint: 'x − a = ± 제곱근',
      };
    },
  };

  A.MathQ = {
    /** 섞어서(mix)가 고르는 과목 */
    MIX_OPS: ['add', 'sub', 'mul', 'div', 'eq'],

    /**
     * 수학 문제 하나를 만든다.
     * @param {'add'|'sub'|'mul'|'div'|'eq'|'mix'} op 연산 ('mix' 는 MIX_OPS 중 무작위)
     * @param {number} level 단계 1~12
     * @returns {Question}
     */
    make(op, level) {
      if (op === 'mix') op = pick(A.MathQ.MIX_OPS);
      const g = GENERATORS[op](level);
      const n = A.RULES.choicesByLevel[level];
      const wrong = V.pickWrong(g.answer, g.wrong, n - 1, g.fallback);
      const solved = g.prompt.includes('?') ? g.prompt.replace('?', g.answer) : `${g.prompt}  →  ${g.answer}`;
      return {
        key: `${op}:${g.prompt}`,
        subject: op,
        prompt: g.prompt,
        hint: g.hint,
        answer: g.answer,
        choices: shuffle([g.answer, ...wrong]),
        review: solved,
      };
    },
  };
})(window.ARAH);

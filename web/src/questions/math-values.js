/**
 * @file 수학 문제에 쓰는 값의 계산 · 표기 도구 (엔진 독립): 정수(음수) · 분수 · 소수 · 다항식 · 제곱근.
 *       문제 생성기(math.js)는 값을 이 도구로 만들고 글자로 바꾼다. 같은 값은 항상 같은 글자가 되므로
 *       "보기끼리 겹침 · 정답과 같은 오답"을 글자 비교만으로 걸러 낼 수 있다.
 * @layer questions
 * @depends A.util
 * @see questions/math.js, doc/content/curriculum.md (수학)
 *
 * 표기 규칙 (교과서 표기에 맞춤):
 *   - 음수는 진짜 빼기 기호 '−' (U+2212). 식 안의 음수는 괄호: (−3) + 5
 *   - 분수는 "3/4", 1보다 크면 대분수 "1 1/4" (중학 단계는 가분수 "5/4" — 대분수를 쓰지 않음)
 *   - 소수는 불필요한 0 없이 "2.5", 정수는 "3"
 *   - 다항식은 차수가 높은 항부터 "x² + 5x + 6", 계수 1 은 생략 "x", −1 은 "−x"
 *   - 제곱근은 "3√2", "√5"
 */
(function (A) {
  'use strict';

  const MINUS = '−';

  const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));

  /** 정수 표기 (음수는 '−') */
  const int = (n) => (n < 0 ? `${MINUS}${-n}` : String(n));

  /** 식 안에 넣는 정수: 음수면 괄호 (−3) */
  const intIn = (n) => (n < 0 ? `(${int(n)})` : String(n));

  // ---------- 분수 {n, d} (항상 기약분수, d > 0) ----------

  /** @typedef {{n: number, d: number}} Frac */

  function frac(n, d) {
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d) || 1;
    return { n: n / g, d: d / g };
  }
  const fadd = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
  const fsub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
  const fmul = (a, b) => frac(a.n * b.n, a.d * b.d);
  const fdiv = (a, b) => frac(a.n * b.d, a.d * b.n);

  /**
   * 분수 표기
   * @param {Frac} f
   * @param {boolean} [mixed=true] 1보다 크면 대분수로 (초등). false 면 가분수 (중학)
   */
  function fstr(f, mixed = true) {
    if (f.d === 1) return int(f.n);
    const sign = f.n < 0 ? MINUS : '';
    const n = Math.abs(f.n);
    if (mixed && n > f.d) return `${sign}${Math.floor(n / f.d)} ${n % f.d}/${f.d}`;
    return `${sign}${n}/${f.d}`;
  }

  /** 식 안에 넣는 분수: 음수 · 대분수면 괄호 */
  function fstrIn(f, mixed = true) {
    const s = fstr(f, mixed);
    return f.n < 0 || s.includes(' ') ? `(${s})` : s;
  }

  // ---------- 소수 (정수 단위로 계산해 오차 없게: 값 × 100) ----------

  /** 100배 한 정수를 소수 글자로 (예: 250 → "2.5", −5 → "−0.05") */
  function dstr(h) {
    const sign = h < 0 ? MINUS : '';
    const s = (Math.abs(h) / 100).toFixed(2).replace(/\.?0+$/, '');
    return sign + s;
  }
  const dstrIn = (h) => (h < 0 ? `(${dstr(h)})` : dstr(h));

  // ---------- 다항식 (변수 하나, {차수: 계수}) ----------

  /** @typedef {Object<number, number>} Poly 예: {2: 1, 1: 5, 0: 6} = x² + 5x + 6 */

  const SUP = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

  /**
   * 다항식 표기. 계수 0 인 항은 빼고, 모두 0 이면 "0".
   * @param {Poly} p
   * @param {string} [v='x'] 변수
   */
  function pstr(p, v = 'x') {
    const terms = Object.keys(p).map(Number).sort((a, b) => b - a).filter((k) => p[k] !== 0);
    if (!terms.length) return '0';
    return terms.map((k, i) => {
      const c = p[k];
      const abs = Math.abs(c);
      const body = k === 0 ? String(abs) : `${abs === 1 ? '' : abs}${v}${k === 1 ? '' : SUP[k]}`;
      if (i === 0) return (c < 0 ? MINUS : '') + body;
      return `${c < 0 ? ` ${MINUS} ` : ' + '}${body}`;
    }).join('');
  }
  const padd = (a, b) => {
    const r = { ...a };
    for (const k of Object.keys(b)) r[k] = (r[k] || 0) + b[k];
    return r;
  };
  const pscale = (a, s) => Object.fromEntries(Object.entries(a).map(([k, c]) => [k, c * s]));
  const psub = (a, b) => padd(a, pscale(b, -1));
  function pmul(a, b) {
    const r = {};
    for (const [i, x] of Object.entries(a)) for (const [j, y] of Object.entries(b)) {
      const k = Number(i) + Number(j);
      r[k] = (r[k] || 0) + x * y;
    }
    return r;
  }

  // ---------- 제곱근 k√m (m 은 제곱 인수가 없는 수) ----------

  /** k√m 표기. m = 1 이면 정수 */
  function rstr(k, m) {
    if (m === 1) return int(k);
    if (k === 1) return `√${m}`;
    if (k === -1) return `${MINUS}√${m}`;
    return `${int(k)}√${m}`;
  }

  /** √n 을 k√m 꼴로 (예: √12 → [2, 3]) */
  function simplifyRoot(n) {
    let k = 1;
    let m = n;
    for (let f = 2; f * f <= m; f++) {
      while (m % (f * f) === 0) {
        m /= f * f;
        k *= f;
      }
    }
    return [k, m];
  }

  /**
   * 오답 후보 목록에서 정답과 다르고 서로 겹치지 않는 n 개를 고른다. 모자라면 fallback 으로 더 만든다.
   * @param {string} answer
   * @param {string[]} candidates 실수로 나올 법한 오답 (앞쪽이 우선)
   * @param {number} n
   * @param {() => string} fallback 무작위 오답 하나를 만드는 함수
   * @returns {string[]}
   */
  function pickWrong(answer, candidates, n, fallback) {
    const out = [];
    for (const c of candidates) {
      if (out.length >= n) break;
      if (c && c !== answer && !out.includes(c)) out.push(c);
    }
    let guard = 0;
    while (out.length < n && guard++ < 200) {
      const c = fallback();
      if (c && c !== answer && !out.includes(c)) out.push(c);
    }
    return out;
  }

  /** 지수 표기 (예: 3 → '³') */
  const sup = (e) => SUP[e] || '';

  A.MathValues = {
    sup,
    MINUS, gcd, int, intIn,
    frac, fadd, fsub, fmul, fdiv, fstr, fstrIn,
    dstr, dstrIn,
    pstr, padd, psub, pscale, pmul,
    rstr, simplifyRoot,
    pickWrong,
  };
})(window.ARAH);

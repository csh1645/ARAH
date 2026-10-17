/**
 * @file 발음 파일 다듬기 · WAV 만들기 (브라우저 생성기 kokoro-generate.html 과 Node 생성기 generate.mjs 가 함께 쓴다).
 *       환경에 따라 다른 것은 "샘플을 얻는 방법"뿐이고, 다듬는 규칙은 이 파일 하나에만 둔다.
 * @see web/public/assets/audio/words/README.md (형식), doc/decisions/ADR-0004-pronunciation.md
 */

export const SILENCE = 0.01; // 앞뒤 무음으로 볼 진폭
export const PAD_SEC = 0.06; // 잘라낸 뒤 앞에 남겨 둘 여유
export const TAIL_SEC = 0.15; // 뒤에 남겨 둘 여유 — 끝소리(s, t)가 잘려 툭 끊기는 느낌을 없앤다
export const FADE_SEC = 0.012; // 앞뒤 페이드 — 시작 · 끝의 "틱" 잡음 방지
export const PEAK = 0.9; // 음량 정규화 목표

/**
 * 앞뒤 무음을 자르고 음량을 맞춘 뒤 앞뒤를 부드럽게 줄인다.
 * @param {Float32Array} samples
 * @param {number} rate 샘플링 주파수
 * @returns {Float32Array}
 */
export function tidy(samples, rate) {
  let s = 0;
  let e = samples.length - 1;
  while (s < e && Math.abs(samples[s]) < SILENCE) s++;
  while (e > s && Math.abs(samples[e]) < SILENCE) e--;
  const out = samples.slice(Math.max(0, s - Math.round(PAD_SEC * rate)), Math.min(samples.length, e + Math.round(TAIL_SEC * rate)));
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0 ? PEAK / peak : 1;
  const fade = Math.round(FADE_SEC * rate);
  for (let i = 0; i < out.length; i++) out[i] *= gain * Math.min(1, i / fade, (out.length - 1 - i) / fade);
  return out;
}

/**
 * Float32 샘플 → 16비트 모노 WAV 바이트
 * @returns {Uint8Array}
 */
export function toWavBytes(samples, rate) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const x = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  return new Uint8Array(buf);
}

/** 읽을 글 → kokoro 에 넣을 문장 (문장부호가 없으면 마침표: 단어 · 어구도 끝이 자연스럽게 내려가는 억양) */
export const sayText = (t) => (/[.?!]$/.test(t) ? t : `${t}.`);

/** 글 → 파일 이름: "I am happy." → "i-am-happy.wav" */
export const fileOf = (t) => `${t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.wav`;

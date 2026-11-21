/**
 * @file Godot 판 ↔ 브라우저 다리 (window.ArahBridge). Godot 는 JavaScriptBridge.get_interface('ArahBridge') 로 부른다.
 *       eval 을 쓰지 않는다 → 사이트 보안 정책(CSP: 'unsafe-eval' 없음)을 그대로 지킨다.
 * @see godot/scripts/autoload/bridge.gd, doc/planning/godot-migration-plan.md (4. 브라우저 다리)
 *
 * 하는 일
 *   - 저장: localStorage 'arah.*' 를 그대로 쓴다 → 웹(Phaser) 판과 같은 주소에서 스타 · 합류 · 복습 노트가 이어진다
 *   - 발음: 원어민 발음 파일(HTML Audio) 재생, 실패하면 기기 음성 합성
 *   - 그림 문자(이모지) · 글꼴에 없는 기호: 브라우저가 기기 글꼴로 그려 PNG(base64)로 넘긴다
 *     (그림 문자 글꼴 파일을 따로 배포하지 않아도 되고, 지금 웹 판과 같은 모양으로 보인다)
 * 보안: 아동 대상 — 외부로 아무것도 보내지 않는다. 받은 문자열은 화면 그리기에만 쓰고 HTML 로 넣지 않는다.
 */
(function () {
  'use strict';

  const PREFIX = 'arah.';
  const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
  let player = null;
  let playSeq = 0;
  let ttsVoice = null;

  function pickTtsVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices().filter((v) => /^en[-_]US/i.test(v.lang));
    return voices.find((v) => /natural|neural|aria|jenny|samantha|google us/i.test(v.name)) || voices[0] || null;
  }

  function speakTts(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.85;
      ttsVoice = ttsVoice || pickTtsVoice();
      if (ttsVoice) u.voice = ttsVoice;
      window.speechSynthesis.speak(u);
    } catch (e) {
      /* 음성 합성 실패는 게임에 영향 없음 */
    }
  }

  const canvas = document.createElement('canvas');
  const ctx2d = canvas.getContext('2d');

  window.ArahBridge = {
    // ---------- 저장 ----------
    /** @returns {string} 저장된 JSON 문자열 (없으면 빈 문자열) */
    storageGet(key) {
      try {
        const v = localStorage.getItem(PREFIX + key);
        return v === null ? '' : v;
      } catch (e) {
        return '';
      }
    },
    storageSet(key, json) {
      try {
        localStorage.setItem(PREFIX + key, json);
      } catch (e) {
        /* 저장 실패(사생활 보호 모드)는 무시 */
      }
    },

    // ---------- 발음 ----------
    /** 사용자 터치 중에 불러 모바일 자동재생 제한을 푼다 */
    unlockAudio() {
      try {
        player = player || new Audio();
        playSeq++;
        player.onerror = null;
        player.src = SILENT_WAV;
        const p = player.play();
        if (p && p.catch) p.catch(() => {});
      } catch (e) {
        /* 무시 */
      }
    },
    /**
     * 발음 파일을 재생한다. 파일이 없거나(src 빈 문자열) 실패하면 음성 합성으로 읽는다.
     * @param {string} src 사이트 기준 경로 (예: assets/audio/voices/af_heart/apple.wav)
     * @param {string} text 대신 읽을 영어
     */
    speak(src, text) {
      if (!src) {
        speakTts(text);
        return;
      }
      player = player || new Audio();
      const seq = ++playSeq;
      const fallback = (err) => {
        if (seq !== playSeq || (err && err.name === 'AbortError')) return;
        speakTts(text);
      };
      try {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        player.onerror = () => fallback();
        player.src = '/' + src.replace(/^\/+/, '');
        const p = player.play();
        if (p && p.catch) p.catch(fallback);
      } catch (e) {
        fallback(e);
      }
    },
    stopSpeech() {
      try {
        if (player) player.pause();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      } catch (e) {
        /* 무시 */
      }
    },

    // ---------- 그림 문자 ----------
    /**
     * 글자(그림 문자 · 기호) 하나를 기기 글꼴로 그려 PNG base64 로 돌려준다.
     * @param {string} ch 그릴 글자 (그림 문자 묶음 하나)
     * @param {number} px 글자 크기
     * @param {boolean} mono true 면 흰색으로 그린다 (Godot 가 글자 색을 입힌다)
     * @returns {string} base64 PNG (data: 머리말 없이)
     */
    glyphPng(ch, px, mono) {
      const pad = Math.ceil(px * 0.25);
      const font = `${px}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Malgun Gothic","Apple SD Gothic Neo",sans-serif`;
      ctx2d.font = font;
      const w = Math.max(1, Math.ceil(ctx2d.measureText(ch).width) + pad * 2);
      const h = Math.ceil(px * 1.25) + pad;
      canvas.width = w;
      canvas.height = h;
      ctx2d.font = font; // 크기를 바꾸면 설정이 초기화된다
      ctx2d.textBaseline = 'middle';
      ctx2d.fillStyle = mono ? '#ffffff' : '#000000';
      ctx2d.fillText(ch, pad, h / 2);
      return canvas.toDataURL('image/png').slice('data:image/png;base64,'.length);
    },

    // ---------- 화면 ----------
    /** 사이트 주소 (그림 파일을 같은 사이트에서 불러올 때) */
    origin() {
      return location.origin;
    },
    /** 폰(작은 터치 화면)인지 — 웹 판 ui/app.js isPhone 과 같은 기준 */
    isPhone() {
      return window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;
    },
    /** 폰에서 전체 화면 + 가로 고정 시도 (안드로이드 Chrome. iOS 는 지원하지 않아 무시) */
    enterLandscape() {
      if (!this.isPhone()) return;
      try {
        const el = document.documentElement;
        const req = el.requestFullscreen ? el.requestFullscreen() : null;
        if (req && req.then) req.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(() => {});
      } catch (e) {
        /* 무시 */
      }
    },
    /** 쿼리 문자열에 이름이 있는지 (예: ?allHeroes, ?autotest) */
    hasQuery(name) {
      return new URLSearchParams(location.search).has(name);
    },
  };
})();

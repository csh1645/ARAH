/**
 * @file 영어 발음 재생. 기기와 상관없이 같은 원어민 발음을 내기 위해 "발음 파일 우선, 음성 합성 대체" 순서로 동작한다.
 * @layer core
 * @depends A.WORD_AUDIO (data/audio-manifest.js — 실행 시점에 읽으므로 로드 순서와 무관)
 * @see doc/decisions/ADR-0004-pronunciation.md
 *
 * 1순위: web/assets/audio/words/ 의 미국 원어민 발음 파일 (모든 PC · 모바일 · 웹에서 같은 소리)
 * 2순위: 기기 음성 합성(Web Speech API) 중 가장 좋은 미국 영어 음성 (파일이 없거나 재생 실패 시)
 *
 * 모바일(특히 iOS)은 사용자가 화면을 누르지 않은 상태에서 소리 재생을 막는다.
 * 그래서 '출동!' 버튼을 누를 때 unlockAudio() 로 오디오 요소 하나를 미리 열어 두고, 이후 모든 재생에 그 요소를 재사용한다.
 */
(function (A) {
  'use strict';

  /** 초등 저학년이 따라 듣기 쉽도록 기본 속도(1.0)보다 조금 느리게 읽는다 (음성 합성일 때). */
  const SPEECH_RATE = 0.85;
  const AUDIO_DIR = 'assets/audio/words/';
  /** 오디오 요소를 여는 데 쓰는 아주 짧은 무음 WAV */
  const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

  /**
   * 음성 이름에 이 단어가 들어 있으면 점수를 더 준다 (앞쪽일수록 품질이 좋은 경향).
   * - Natural / Neural / Online: Windows Edge 의 신경망 음성 (예: "Microsoft Aria Online (Natural)")
   * - Google US English: Chrome 의 고품질 음성
   * - Samantha / Ava / Allison: macOS · iOS 의 미국 원어민 음성
   */
  const PREFERRED_NAMES = ['natural', 'neural', 'online', 'google us english', 'samantha', 'ava', 'allison', 'aria', 'jenny'];

  let chosenVoice = null;
  const player = typeof Audio !== 'undefined' ? new Audio() : null;
  /** 재생 요청 번호. 새 요청이 오면 이전 요청의 실패 처리(대체 음성)를 무시하기 위해 쓴다. */
  let playSeq = 0;

  /** 음성 하나의 우선순위 점수. 높을수록 좋다. */
  function scoreVoice(v) {
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    if (!lang.startsWith('en')) return -1;
    let score = lang === 'en-us' ? 100 : 10; // 미국 영어 최우선, 다른 영어권은 예비
    const name = v.name.toLowerCase();
    PREFERRED_NAMES.forEach((word, i) => {
      if (name.includes(word)) score += 50 - i * 3;
    });
    return score;
  }

  function pickVoice() {
    try {
      let best = null;
      let bestScore = -1;
      for (const v of window.speechSynthesis.getVoices()) {
        const s = scoreVoice(v);
        if (s > bestScore) {
          best = v;
          bestScore = s;
        }
      }
      chosenVoice = best;
    } catch (e) {
      chosenVoice = null;
    }
  }

  if ('speechSynthesis' in window) {
    pickVoice();
    // 음성 목록은 비동기로 채워지는 브라우저가 많다 (Chrome 등). 채워지면 다시 고른다.
    window.speechSynthesis.addEventListener('voiceschanged', pickVoice);
  }

  /** 2순위: 기기 음성 합성으로 읽기 */
  function speakTts(text) {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      if (chosenVoice) u.voice = chosenVoice;
      u.rate = SPEECH_RATE;
      window.speechSynthesis.speak(u);
    } catch (e) {
      /* 음성 미지원 환경은 무시 */
    }
  }

  /**
   * 사용자 터치 · 클릭 처리 중에 불러 오디오 재생을 허용받는다 (모바일 자동재생 제한 대응).
   * 게임 시작 버튼에서 한 번 부르면 된다.
   */
  A.unlockAudio = function () {
    if (!player) return;
    try {
      playSeq++; // 이전 단어의 실패 처리가 무음 재생 때문에 불리지 않게
      player.onerror = null;
      player.src = SILENT_WAV;
      const p = player.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {
      /* 무시 */
    }
  };

  /**
   * 영어 단어를 미국 원어민 발음으로 들려준다. 이전에 나던 소리는 끊는다.
   * 발음 파일이 있으면 파일을, 없거나 재생에 실패하면 음성 합성을 쓴다.
   * @param {string} text 읽을 영어 단어 (또는 짧은 문장)
   */
  A.speak = function (text) {
    const file = A.WORD_AUDIO && A.WORD_AUDIO[String(text).toLowerCase()];
    if (!file || !player) {
      speakTts(text);
      return;
    }
    // 연속 재생 시 이전 play() 는 AbortError 로 끝난다. 그건 "실패"가 아니라 "취소"이므로
    // 최신 요청이 아닐 때나 AbortError 일 때는 대체 음성을 내지 않는다 (소리 겹침 방지).
    const seq = ++playSeq;
    const fallback = (err) => {
      if (seq !== playSeq || (err && err.name === 'AbortError')) return;
      speakTts(text);
    };
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      player.onerror = () => fallback();
      player.src = AUDIO_DIR + file;
      const p = player.play();
      if (p && p.catch) p.catch(fallback);
    } catch (e) {
      fallback(e);
    }
  };

  /** 지금 발음 방식 설명 (점검용). 예: "파일 40개 + TTS: Microsoft Aria (en-US)" */
  A.voiceName = function () {
    const files = A.WORD_AUDIO ? Object.keys(A.WORD_AUDIO).length : 0;
    const tts = chosenVoice ? `${chosenVoice.name} (${chosenVoice.lang})` : '없음';
    return `파일 ${files}개 + TTS: ${tts}`;
  };
})(window.ARAH);

/**
 * @file 효과음 · 배경음. Web Audio API 로 소리를 코드에서 직접 합성한다 (음원 파일 없음 → 저작권 · 용량 걱정 없음).
 * @layer core
 * @depends A.storage
 * @see doc/planning/game-design.md (10. 소리)
 *
 * 사용법:
 *   A.Sfx.unlock()            사용자 터치 · 클릭 처리 중에 한 번 (모바일은 이때만 소리를 열 수 있다)
 *   A.Sfx.play('correct')     효과음 (이름은 아래 SOUNDS 표)
 *   A.Sfx.shot('thunder')     팀별 발사음 (HeroFamily.id)
 *   A.Sfx.music.start('hero' | 'boss') / A.Sfx.music.stop()
 *   A.Sfx.setEnabled('sfx' | 'bgm', true/false), A.Sfx.isEnabled(kind)  — 설정은 저장된다
 *
 * 게임 코드는 이 파일의 함수 이름만 알면 된다. 소리 모양(음높이 · 길이)을 바꾸려면 SOUNDS / SHOTS 표만 고친다.
 */
(function (A) {
  'use strict';

  const SETTINGS_KEY = 'sound';
  const SFX_VOLUME = 0.5;
  const BGM_VOLUME = 0.13; // 배경음은 문제 읽기 · 발음을 가리지 않게 작게

  let ctx = null;
  let master = null;
  let sfxBus = null;
  let bgmBus = null;
  let noiseBuffer = null;
  const settings = Object.assign({ sfx: true, bgm: true }, A.storage.get(SETTINGS_KEY, {}));

  /** 오디오 장치를 만든다 (처음 한 번). 지원하지 않는 브라우저면 null */
  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = settings.sfx ? SFX_VOLUME : 0;
    sfxBus.connect(master);
    bgmBus = ctx.createGain();
    bgmBus.gain.value = settings.bgm ? BGM_VOLUME : 0;
    bgmBus.connect(master);
    // 1초짜리 흰 잡음 (바람 · 번개 · 유리 소리의 재료)
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  // ---------- 합성 부품 ----------

  /**
   * 음 하나. 시작 음높이에서 끝 음높이로 미끄러지며, 짧게 커졌다 작아진다(클릭 잡음 방지).
   * @param {{f: number, to?: number, dur: number, type?: OscillatorType, vol?: number, at?: number, bus?: GainNode}} o
   */
  function tone(o) {
    const t = ctx.currentTime + (o.at || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + o.dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g).connect(o.bus || sfxBus);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  /**
   * 잡음 한 덩어리를 필터에 통과시킨다 (슉 · 콰직 · 쨍그랑).
   * @param {{dur: number, filter?: BiquadFilterType, f?: number, to?: number, q?: number, vol?: number, at?: number}} o
   */
  function noise(o) {
    const t = ctx.currentTime + (o.at || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const flt = ctx.createBiquadFilter();
    flt.type = o.filter || 'bandpass';
    flt.Q.value = o.q || 1;
    flt.frequency.setValueAtTime(o.f || 1000, t);
    if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(flt).connect(g).connect(sfxBus);
    src.start(t);
    src.stop(t + o.dur + 0.05);
  }

  // ---------- 소리 표 ----------

  /** 팀별 발사음 (HeroFamily.id → 소리) */
  const SHOTS = {
    spider: () => noise({ dur: 0.14, f: 3000, to: 900, q: 3, vol: 0.35 }), // 슉 (거미줄)
    armor: () => { tone({ f: 1400, to: 260, dur: 0.2, type: 'sawtooth', vol: 0.12 }); tone({ f: 700, to: 180, dur: 0.2, type: 'square', vol: 0.06 }); }, // 지잉 (레이저)
    shield: () => { noise({ dur: 0.15, f: 1500, to: 600, vol: 0.25 }); tone({ f: 1250, dur: 0.25, type: 'triangle', vol: 0.15, at: 0.08 }); }, // 휙-챙
    thunder: () => { noise({ dur: 0.3, filter: 'highpass', f: 2500, vol: 0.4 }); tone({ f: 90, to: 40, dur: 0.35, type: 'sawtooth', vol: 0.18 }); }, // 콰직
    giant: () => { tone({ f: 130, to: 45, dur: 0.3, type: 'sine', vol: 0.5 }); noise({ dur: 0.2, filter: 'lowpass', f: 400, vol: 0.3 }); }, // 쿵
    archer: () => { tone({ f: 660, to: 220, dur: 0.12, type: 'triangle', vol: 0.25 }); noise({ dur: 0.1, f: 4000, to: 2000, q: 4, vol: 0.15 }); }, // 핑 (활시위)
    mystic: () => [880, 1320, 1760].forEach((f, i) => tone({ f, dur: 0.25, type: 'sine', vol: 0.12, at: i * 0.05 })), // 띠링
    panther: () => { noise({ dur: 0.1, filter: 'highpass', f: 3000, vol: 0.3 }); tone({ f: 750, to: 400, dur: 0.1, type: 'triangle', vol: 0.12 }); }, // 샥 (발톱)
  };

  /** 상황 효과음 */
  const SOUNDS = {
    correct: () => { tone({ f: 784, dur: 0.12, type: 'triangle', vol: 0.3 }); tone({ f: 1175, dur: 0.22, type: 'triangle', vol: 0.3, at: 0.09 }); }, // 딩동
    wrong: () => tone({ f: 220, to: 140, dur: 0.28, type: 'square', vol: 0.12 }), // 부-
    hurt: () => { tone({ f: 160, to: 70, dur: 0.25, type: 'sine', vol: 0.4 }); noise({ dur: 0.12, filter: 'lowpass', f: 600, vol: 0.2 }); }, // 하트 잃음
    combo: () => [523, 659, 784, 1047].forEach((f, i) => tone({ f, dur: 0.18, type: 'triangle', vol: 0.22, at: i * 0.07 })), // 콤보 팡파르
    glass: () => { noise({ dur: 0.4, filter: 'highpass', f: 3500, vol: 0.35 }); [2400, 3100, 2800, 3600].forEach((f, i) => tone({ f, dur: 0.15, type: 'sine', vol: 0.08, at: i * 0.04 })); }, // 쨍그랑
    hit: () => { noise({ dur: 0.18, filter: 'lowpass', f: 1200, vol: 0.4 }); tone({ f: 200, to: 90, dur: 0.2, type: 'square', vol: 0.12 }); }, // 보스 피격
    bossAttack: () => tone({ f: 900, to: 120, dur: 0.5, type: 'sawtooth', vol: 0.15 }), // 보스 레이저
    flip: () => noise({ dur: 0.06, f: 2500, q: 2, vol: 0.2 }), // 카드 뒤집기
    land: () => tone({ f: 110, to: 60, dur: 0.12, type: 'sine', vol: 0.3 }), // 착지
    teleport: () => tone({ f: 300, to: 1500, dur: 0.35, type: 'sine', vol: 0.15 }), // 포털
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, dur: 0.3, type: 'triangle', vol: 0.25, at: i * 0.11 })), // 승리
    lose: () => [392, 330, 262].forEach((f, i) => tone({ f, dur: 0.35, type: 'triangle', vol: 0.2, at: i * 0.18 })), // 아쉬움
    click: () => tone({ f: 1000, dur: 0.05, type: 'square', vol: 0.06 }),
  };

  // ---------- 배경음 (간단한 반복 곡을 그때그때 합성) ----------

  /** 곡: 코드 진행(근음 주파수) · 템포 · 아르페지오 음정 간격 */
  const SONGS = {
    hero: { bpm: 112, chords: [261.6, 392.0, 440.0, 349.2], arp: [1, 1.25, 1.5, 2], wave: 'triangle' }, // C G Am F (밝게)
    boss: { bpm: 138, chords: [220.0, 174.6, 196.0, 164.8], arp: [1, 1.19, 1.5, 1.78], wave: 'square' }, // Am F G E (긴장)
  };

  const music = {
    timer: null,
    step: 0,
    song: null,
    /** @param {'hero'|'boss'} name */
    start(name) {
      this.stop();
      if (!ensure()) return;
      this.song = SONGS[name] || SONGS.hero;
      this.step = 0;
      const stepMs = 60000 / this.song.bpm / 2; // 8분음표 간격
      this.timer = setInterval(() => this.tick(), stepMs);
    },
    tick() {
      if (!ctx || ctx.state !== 'running') return;
      const s = this.song;
      const bar = Math.floor(this.step / 8) % s.chords.length;
      const root = s.chords[bar];
      const pos = this.step % 8;
      if (pos === 0 || pos === 4) tone({ f: root / 2, dur: 0.35, type: 'sine', vol: 0.5, bus: bgmBus }); // 베이스
      tone({ f: root * s.arp[pos % s.arp.length] * (pos >= 4 ? 2 : 1), dur: 0.18, type: s.wave, vol: 0.18, bus: bgmBus }); // 아르페지오
      this.step++;
    },
    stop() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    },
  };

  A.Sfx = {
    /** 사용자 동작 중에 불러 오디오를 연다 (iOS · 안드로이드 자동재생 제한 대응) */
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    },

    /** @param {keyof SOUNDS} name */
    play(name) {
      if (!settings.sfx || !ensure() || !SOUNDS[name]) return;
      try { SOUNDS[name](); } catch (e) { /* 소리 실패는 게임에 영향 없음 */ }
    },

    /** 팀별 발사음 @param {string} familyId */
    shot(familyId) {
      if (!settings.sfx || !ensure()) return;
      try { (SHOTS[familyId] || SHOTS.spider)(); } catch (e) { /* 무시 */ }
    },

    music,

    /** @param {'sfx'|'bgm'} kind */
    isEnabled(kind) {
      return !!settings[kind];
    },

    /**
     * 효과음 · 배경음 켜기/끄기 (저장됨)
     * @param {'sfx'|'bgm'} kind
     * @param {boolean} on
     */
    setEnabled(kind, on) {
      settings[kind] = !!on;
      A.storage.set(SETTINGS_KEY, settings);
      if (!ctx) return;
      if (kind === 'sfx') sfxBus.gain.value = on ? SFX_VOLUME : 0;
      if (kind === 'bgm') bgmBus.gain.value = on ? BGM_VOLUME : 0;
    },
  };
})(window.ARAH);

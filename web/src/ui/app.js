/**
 * @file 화면 흐름(메뉴 → 게임 → 결과)과 진행 데이터(팀 스타 · 히어로 합류 · 마지막 선택) 관리.
 *       저장 키: stars(합계), teamStars(팀별), unlocked(예전 규칙으로 열린 히어로), hero, mode, subject, level, review
 * @layer ui
 * @depends A.storage, A.speak, A.MODES, A.SUBJECTS, A.LEVELS, A.RULES, A.HEROES, A.findHero, A.drawHero,
 *          A.GAME_MODES, A.startGame
 * @see doc/planning/game-design.md (6. 점수와 보상, 8. 화면 구성)
 *
 * 보안 규칙: 데이터에서 온 문자열은 항상 textContent 로 넣는다. innerHTML 에는 고정 마크업만 쓴다.
 */
(function (A) {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const store = A.storage;

  /** 메뉴 선택 상태. 게임 시작 시 저장해서 다음 실행 때 그대로 복원한다. */
  const state = {
    stars: store.get('stars', 0),
    heroId: store.get('hero', 'red'),
    mode: store.get('mode', 'catch'),
    subject: store.get('subject', 'add'),
    level: store.get('level', 1),
  };
  // 저장값 검증: 목록에 없는 값(예전 버전 · 손상된 값)은 기본값으로 (보기 수 계산 오류 방지)
  if (!A.LEVELS.some((l) => l.id === state.level)) state.level = 1;
  state.mode = (A.MODE_ALIASES && A.MODE_ALIASES[state.mode]) || state.mode; // 예: 3D 문 통과 → 문 통과
  if (!A.SUBJECTS.some((s) => s.id === state.subject)) state.subject = 'add';
  if (typeof state.stars !== 'number' || !(state.stars >= 0)) state.stars = 0;
  let game = null;

  // ---------- 팀 스타 · 히어로 합류 ----------
  // stars: 지금까지 받은 스타 합계 (기록용) / teamStars: 팀별 스타 (합류 조건) / unlocked: 예전 규칙으로 이미 열린 히어로

  /**
   * 예전(전체 별 하나로 합류하던 시절, 2026-10-10 배포본)의 합류 조건.
   * 팀 스타로 바뀌면서 이미 열렸던 히어로가 다시 잠기지 않도록 한 번만 옮겨 담는 데 쓴다.
   */
  const LEGACY_UNLOCKS = {
    red: 0, snow: 10, shadow: 25, detective: 45, piggy: 70, future: 100,
    'armor-red': 15, 'armor-war': 55, 'armor-blue': 130, 'shield-star': 20, 'shield-night': 80, 'shield-crystal': 160,
    'thunder-knight': 30, 'thunder-storm': 90, 'thunder-aurora': 190, 'giant-green': 35, 'giant-red': 110, 'giant-gray': 220,
    'archer-purple': 40, 'archer-shadow': 120, 'archer-gold': 260, 'mystic-master': 140, 'mystic-dark': 240,
    'panther-night': 150, 'panther-gold': 280,
  };

  state.teamStars = store.get('teamStars', null);
  state.unlocked = store.get('unlocked', []);
  if (!state.teamStars || typeof state.teamStars !== 'object') {
    // 처음 한 번: 예전 별은 모두 거미 팀으로 플레이해서 모은 것이므로 거미 스타로 옮기고, 이미 열린 히어로는 기억해 둔다
    state.teamStars = { spider: state.stars };
    state.unlocked = Object.keys(LEGACY_UNLOCKS).filter((id) => state.stars >= LEGACY_UNLOCKS[id]);
    store.set('teamStars', state.teamStars);
    store.set('unlocked', state.unlocked);
  }
  if (!Array.isArray(state.unlocked)) state.unlocked = [];

  const teamStarsOf = (familyId) => Math.max(0, Number(state.teamStars[familyId]) || 0);
  const isUnlocked = (hero) => teamStarsOf(hero.family) >= hero.unlockStars || state.unlocked.includes(hero.id);

  // ---------- 모바일 대응 ----------
  // 게임 화면은 가로형(960 x 640)이라 폰을 세로로 들면 너무 작아진다.
  // 별도 모바일 화면을 만들지 않고, 폰에서는 전체 화면 + 가로 고정을 시도하고, 세로이면 안내 후 일시정지한다.

  /** 폰(작은 터치 화면)인지. 태블릿은 세로여도 게임이 충분히 커서 제외한다. */
  const isPhone = () =>
    window.matchMedia('(pointer: coarse)').matches && Math.min(window.screen.width, window.screen.height) < 600;
  const portraitQuery = window.matchMedia('(orientation: portrait)');

  /** 전체 화면 + 가로 고정 (안드로이드 Chrome 지원. iOS Safari 는 지원하지 않아 실패해도 무시하고 안내로 대신한다) */
  function enterLandscape() {
    if (!isPhone()) return;
    const el = document.documentElement;
    try {
      const req = el.requestFullscreen ? el.requestFullscreen() : null;
      if (req && req.then) {
        req.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
          .catch(() => {});
      }
    } catch (e) {
      /* 미지원 브라우저는 무시 */
    }
  }

  function exitLandscape() {
    try {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } catch (e) {
      /* 무시 */
    }
  }

  /** 게임 중 폰이 세로이면 안내를 띄우고 게임을 멈춘다. 가로로 돌리면 이어서 진행한다. */
  function updateOrientation() {
    const blocked = !!game && isPhone() && portraitQuery.matches;
    $('#rotateHint').hidden = !blocked;
    if (!game) return;
    if (blocked) game.scene.pause('play');
    else game.scene.resume('play');
  }
  portraitQuery.addEventListener('change', updateOrientation);

  function show(id) {
    for (const el of document.querySelectorAll('.screen')) el.hidden = el.id !== id;
  }

  function heroCanvas(hero, w, h) {
    const cv = document.createElement('canvas');
    const ratio = window.devicePixelRatio || 1;
    cv.width = w * ratio;
    cv.height = h * ratio;
    cv.style.width = `${w}px`;
    cv.style.height = `${h}px`;
    A.drawHero(cv.getContext('2d'), hero, cv.width, cv.height);
    return cv;
  }

  function optionButton(label, sub, selected, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'option' + (selected ? ' selected' : '');
    b.setAttribute('aria-pressed', String(selected));
    b.innerHTML = `<span class="option-label"></span>${sub ? '<span class="option-sub"></span>' : ''}`;
    b.querySelector('.option-label').textContent = label;
    if (sub) b.querySelector('.option-sub').textContent = sub;
    b.addEventListener('click', onClick);
    return b;
  }

  /** 이름 뒤 조사 '이/가': 마지막 글자에 받침이 있으면 '이' (예: 썬더 퀸이, 레드 아머가) */
  function josaIGa(word) {
    const code = word.charCodeAt(word.length - 1) - 0xac00;
    return code >= 0 && code <= 11171 && code % 28 !== 0 ? '이' : '가';
  }

  /** 팀에서 아직 합류하지 않은 히어로 중 가장 먼저 열릴 히어로 (없으면 null) */
  function nextHeroOf(family) {
    return A.HEROES.filter((h) => h.family === family.id && !isUnlocked(h)).sort((a, b) => a.unlockStars - b.unlockStars)[0] || null;
  }

  function renderMenu() {
    if (!isUnlocked(A.findHero(state.heroId))) state.heroId = 'red';
    $('#starCount').textContent = state.stars;

    // 히어로 도감: 팀별로 묶고, 팀 안에서는 합류 조건 순서로 보여 준다
    const owned = A.HEROES.filter(isUnlocked).length;
    $('#heroCount').textContent = `${owned} / ${A.HEROES.length}`;
    // 지금 고른 히어로의 팀에서 다음에 합류할 히어로 (이 팀으로 플레이하면 이 팀 스타가 쌓인다)
    const curFamily = A.findFamily(A.findHero(state.heroId));
    const nextInTeam = nextHeroOf(curFamily);
    $('#nextHero').textContent = nextInTeam
      ? `${curFamily.star} ${curFamily.starName} ${teamStarsOf(curFamily.id)}개 · 다음 합류: ${nextInTeam.name}까지 ${nextInTeam.unlockStars - teamStarsOf(curFamily.id)}개 더`
      : `${curFamily.star} ${curFamily.name} 히어로를 모두 모았어요! 🎉 다른 팀으로도 플레이해 봐요`;

    const heroes = $('#heroes');
    heroes.replaceChildren();
    for (const family of A.HERO_FAMILIES) {
      const members = A.HEROES.filter((h) => A.findFamily(h).id === family.id).sort((a, b) => a.unlockStars - b.unlockStars);
      if (!members.length) continue;
      const head = document.createElement('div');
      head.className = 'family-head';
      head.innerHTML = '<strong></strong><span class="family-star"></span><span class="family-trait"></span><span class="family-count"></span>';
      head.querySelector('strong').textContent = family.name;
      head.querySelector('.family-star').textContent = `${family.star} ${teamStarsOf(family.id)}`;
      head.querySelector('.family-trait').textContent = `${family.trait} · ${family.shot}`;
      head.querySelector('.family-count').textContent = `${members.filter(isUnlocked).length} / ${members.length}`;
      const grid = document.createElement('div');
      grid.className = 'hero-grid';
      for (const hero of members) grid.appendChild(heroCard(hero));
      heroes.append(head, grid);
    }

    renderOptions();
  }

  /** 히어로 카드 하나 (잠긴 히어로는 흐리게 + 합류 조건 표시) */
  function heroCard(hero) {
    const unlocked = isUnlocked(hero);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'hero-card' + (hero.id === state.heroId ? ' selected' : '') + (unlocked ? '' : ' locked');
    card.disabled = !unlocked;
    card.setAttribute('aria-pressed', String(hero.id === state.heroId));
    card.appendChild(heroCanvas(hero, 72, 81));
    const info = document.createElement('div');
    info.className = 'hero-info';
    info.innerHTML = '<strong></strong><span class="hero-universe"></span><span class="hero-ability"></span>';
    info.querySelector('strong').textContent = hero.name;
    info.querySelector('.hero-universe').textContent = hero.universe;
    const fam = A.findFamily(hero);
    info.querySelector('.hero-ability').textContent = unlocked
      ? hero.abilityText
      : `🔒 ${fam.star} ${fam.starName} ${hero.unlockStars}개 모으면 합류 (지금 ${teamStarsOf(fam.id)}개)`;
    card.appendChild(info);
    card.addEventListener('click', () => {
      state.heroId = hero.id;
      renderMenu();
    });
    return card;
  }

  /** 놀이 방법 · 과목 · 단계 선택 버튼 */
  function renderOptions() {
    // 불러오지 못한 모드(예: Three.js CDN 실패 시 3D)는 메뉴에서 숨긴다.
    // Phaser 자체가 없으면 모든 모드가 미등록이므로 목록은 그대로 두고, 시작할 때 안내한다.
    const available = typeof Phaser === 'undefined' ? A.MODES : A.MODES.filter((m) => A.GAME_MODES[m.id]);
    if (!available.some((m) => m.id === state.mode)) state.mode = available[0].id;
    const modes = $('#modes');
    modes.replaceChildren(
      ...available.map((m) =>
        optionButton(`${m.icon} ${m.label}`, m.desc, m.id === state.mode, () => {
          state.mode = m.id;
          renderMenu();
        })),
    );

    // 오답 복습: 지금 고른 놀이에서 쓸 수 있는 복습 문제 수를 보여 주고, 없으면 고를 수 없게 한다
    const reviewKind = state.mode === 'spell' ? 'spell' : 'choice';
    const reviewCount = A.Review.count(reviewKind);
    if (state.subject === 'review' && reviewCount === 0) state.subject = 'add';
    const subjects = $('#subjects');
    subjects.replaceChildren(
      ...A.SUBJECTS.map((s) => {
        const isReview = s.id === 'review';
        const b = optionButton(`${s.icon} ${s.label}`, isReview ? (reviewCount ? `${reviewCount}문제` : '아직 없어요') : '',
          s.id === state.subject, () => {
            state.subject = s.id;
            renderMenu();
          });
        if (isReview && reviewCount === 0) b.disabled = true;
        return b;
      }),
    );

    const levels = $('#levels');
    levels.replaceChildren(
      ...A.LEVELS.map((l) =>
        optionButton(l.label, l.desc, l.id === state.level, () => {
          state.level = l.id;
          renderMenu();
        })),
    );
  }

  function startRound() {
    if (typeof Phaser === 'undefined') {
      alert('게임 엔진(Phaser)을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.');
      return;
    }
    if (!A.GAME_MODES[state.mode]) {
      alert('이 놀이 방법을 불러오지 못했어요. 다른 놀이 방법을 골라 주세요.');
      return;
    }
    // 이전 판이 남아 있으면 정리한다 (게임이 두 개 겹쳐 도는 것 방지)
    stopGame();
    // 방금 누른 버튼(출동 · 다시 하기)에 포커스가 남아 있으면, 게임 중 스페이스를 눌렀을 때
    // 숨겨진 그 버튼이 다시 눌려 새 판이 시작된다. 포커스를 풀어 키 입력이 게임으로만 가게 한다.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    // 버튼을 누른 이 순간(사용자 동작)에만 허용되는 일들: 모바일 오디오 열기, 전체 화면 · 가로 고정
    A.unlockAudio();
    enterLandscape();
    store.set('hero', state.heroId);
    store.set('mode', state.mode);
    store.set('subject', state.subject);
    store.set('level', state.level);
    show('play');
    game = A.startGame(
      { hero: A.findHero(state.heroId), mode: state.mode, subject: state.subject, level: state.level },
      showResult,
    );
    // 브라우저 콘솔에서 상태를 살펴보기 위한 참조 (예: ARAH.currentGame.scene.getScene('play'))
    A.currentGame = game;
    // 장면이 준비된 뒤 방향을 확인한다 (세로로 시작하면 바로 안내)
    game.events.once('ready', updateOrientation);
  }

  function stopGame() {
    if (game) {
      game.destroy(true);
      game = null;
      A.currentGame = null;
    }
    $('#rotateHint').hidden = true;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  /**
   * 결과 화면을 보여 주고 스타를 적립한다. A.startGame 의 onEnd 콜백으로 불린다.
   * 스타는 "한 번에 맞힌 문제" 기준이라, 찍어서 맞히는 것보다 차분히 푸는 쪽이 유리하다.
   * 받은 스타는 이번 판에 고른 히어로의 팀 스타로 쌓이고, 그 팀의 다음 히어로가 합류할 수 있다.
   * @param {RoundResult} r
   */
  function showResult(r) {
    stopGame();
    const family = A.findFamily(A.findHero(state.heroId));
    const wasUnlocked = new Set(A.HEROES.filter(isUnlocked).map((h) => h.id));
    const earned = r.firstTry + (r.perfect ? A.RULES.perfectBonusStars : 0);
    state.stars += earned;
    state.teamStars[family.id] = teamStarsOf(family.id) + earned;
    store.set('stars', state.stars);
    store.set('teamStars', state.teamStars);
    const newHeroes = A.HEROES.filter((h) => isUnlocked(h) && !wasUnlocked.has(h.id));
    const next = nextHeroOf(family);

    $('#resultTitle').textContent =
      r.heartsLeft <= 0 ? '💪 아쉬워요! 다시 도전!' : r.perfect ? '🏆 퍼펙트 미션!' : '🎉 미션 완료!';
    $('#resultStats').innerHTML = '';
    const stats = [
      ['점수', `${r.score}점`],
      ['한 번에 맞힌 문제', `${r.firstTry} / ${r.total}`],
      ['최고 콤보', `${r.bestCombo}`],
      [`받은 ${family.starName}`, `${family.star} +${earned}${r.perfect ? ' (퍼펙트 보너스)' : ''}`],
      [`모은 ${family.starName}`, `${family.star} ${teamStarsOf(family.id)}`],
      ['다음 합류', next ? `${next.name}까지 ${family.star} ${next.unlockStars - teamStarsOf(family.id)}개` : `${family.name} 완성! 🎉`],
    ];
    // 이번 판에 틀린 문제는 모두 복습 노트에 저장된다 (이미 있던 문제는 다시 처음 상자로)
    if (r.mistakes.length) stats.push(['📒 복습 노트에 저장', `${r.mistakes.length}문제`]);
    if (r.reviewMastered) stats.push(['🎓 복습 졸업', `${r.reviewMastered}문제`]);
    for (const [k, v] of stats) {
      const row = document.createElement('div');
      row.innerHTML = '<dt></dt><dd></dd>';
      row.querySelector('dt').textContent = k;
      row.querySelector('dd').textContent = v;
      $('#resultStats').appendChild(row);
    }

    const unlock = $('#unlock');
    unlock.replaceChildren();
    unlock.hidden = newHeroes.length === 0;
    for (const hero of newHeroes) {
      const box = document.createElement('div');
      box.className = 'unlock-hero';
      box.appendChild(heroCanvas(hero, 64, 72));
      const p = document.createElement('p');
      p.textContent = `🆕 ${hero.universe}에서 ${hero.name}${josaIGa(hero.name)} 합류했어요!`;
      box.appendChild(p);
      unlock.appendChild(box);
    }

    const list = $('#mistakes');
    list.replaceChildren();
    if (r.mistakes.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = '틀린 문제가 없어요! 정말 멋져요 👏';
      list.appendChild(li);
    }
    for (const q of r.mistakes) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = q.review;
      li.appendChild(span);
      if (q.speak) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'speak';
        b.textContent = '🔊';
        b.setAttribute('aria-label', `${q.speak} 발음 듣기`);
        b.addEventListener('click', () => A.speak(q.speak));
        li.appendChild(b);
      }
      list.appendChild(li);
    }
    show('result');
  }

  function backToMenu() {
    stopGame();
    exitLandscape();
    renderMenu();
    show('menu');
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('#startBtn').addEventListener('click', startRound);
    $('#quitBtn').addEventListener('click', backToMenu);
    $('#retryBtn').addEventListener('click', startRound);
    $('#menuBtn').addEventListener('click', backToMenu);
    renderMenu();
    show('menu');
  });
})(window.ARAH);

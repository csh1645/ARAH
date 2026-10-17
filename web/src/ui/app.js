/**
 * @file 화면 흐름(메뉴 → 게임 → 결과)과 진행 데이터(스타 · 히어로 합류 · 마지막 선택) 관리.
 *       저장 키: stars(합계 = 합류 조건), unlocked(합류한 히어로 — 목록 순서가 바뀌어도 유지), hero, mode, subject, level, review,
 *       teamStars(예전 팀별 스타, 이제 쓰지 않음),
 *       runIntroduced(새 놀이 히어로 러너를 한 번 먼저 골라 뒀는지), levelScheme(저장된 단계 값의 체계: 2 = 1~12단계)
 * @layer ui
 * @depends A.storage, A.speak, A.MODES, A.SUBJECTS, A.LEVELS, A.RULES, A.HEROES, A.findHero, A.drawHero,
 *          A.findFamily, A.heroLine, A.Sfx, A.voicePacks, A.getVoice, A.setVoice, A.GAME_MODES, A.startGame,
 *          A.HeroShowcase · A.heroPortrait · A.Assets3D (로비 3D, 없으면 2D 그림)
 * @see doc/planning/game-design.md (6. 점수와 보상, 8. 화면 구성)
 *
 * 보안 규칙: 데이터에서 온 문자열은 항상 textContent 로 넣는다. innerHTML 에는 고정 마크업만 쓴다.
 */
(function (A) {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const store = A.storage;
  /** 저장된 단계 값의 체계 번호. 2 = 1~12단계(초1~중3). 1 = 예전 1~6단계 */
  const LEVEL_SCHEME = 2;

  /** 메뉴 선택 상태. 게임 시작 시 저장해서 다음 실행 때 그대로 복원한다. */
  const state = {
    stars: store.get('stars', 0),
    heroId: store.get('hero', 'spider-man'),
    mode: store.get('mode', 'run'),
    subject: store.get('subject', 'add'),
    level: store.get('level', 1),
  };
  // 단계 체계가 바뀌었다 (1~6 → 1~12, ADR-0007): 예전에 저장한 단계는 같은 수준의 새 단계로 한 번만 옮긴다
  if (store.get('levelScheme', 1) < LEVEL_SCHEME) {
    state.level = A.LEGACY_LEVEL_MAP[state.level] || 1;
    store.set('level', state.level);
    store.set('levelScheme', LEVEL_SCHEME);
  }
  // 저장값 검증: 목록에 없는 값(예전 버전 · 손상된 값)은 기본값으로 (보기 수 계산 오류 방지)
  if (!A.LEVELS.some((l) => l.id === state.level)) state.level = 1;
  state.mode = (A.MODE_ALIASES && A.MODE_ALIASES[state.mode]) || state.mode; // 예: 3D 문 통과 → 문 통과
  if (!A.SUBJECTS.some((s) => s.id === state.subject)) state.subject = 'add';
  if (typeof state.stars !== 'number' || !(state.stars >= 0)) state.stars = 0;
  // 새 놀이(히어로 러너)는 한 번만 먼저 골라 둔다 — 시험 놀이를 아이가 바로 해 보도록 (이후에는 아이의 선택 유지)
  if (!store.get('runIntroduced', false)) {
    state.mode = 'run';
    store.set('runIntroduced', true);
  }
  let game = null;
  /** @type {A.HeroShowcase|null} 로비의 3D 히어로 무대 (WebGL 이 안 되면 null) */
  let showcase = null;

  // ---------- 스타 · 히어로 합류 ----------
  // stars: 지금까지 받은 스타 합계 (합류 조건) / unlocked: 한 번 합류한 히어로 (조건이 바뀌어도 다시 잠기지 않게 기억)

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

  state.unlocked = store.get('unlocked', null);
  if (!Array.isArray(state.unlocked)) {
    // 처음 한 번 (2026-10-10 배포본 = 전체 별 하나로 합류하던 시절): 이미 열렸던 히어로를 기억해 둔다
    state.unlocked = Object.keys(LEGACY_UNLOCKS).filter((id) => state.stars >= LEGACY_UNLOCKS[id]).map((id) => A.HERO_ID_MAP[id] || id);
    store.set('unlocked', state.unlocked);
  }
  // 히어로가 영화 원조 히어로로 바뀌었다 (같은 자리 · 같은 능력): 저장된 예전 id 를 새 id 로 한 번만 옮긴다
  const toNewId = (id) => A.HERO_ID_MAP[id] || id;
  if (state.unlocked.some((id) => A.HERO_ID_MAP[id]) || A.HERO_ID_MAP[state.heroId]) {
    state.unlocked = state.unlocked.map(toNewId);
    state.heroId = toNewId(state.heroId);
    store.set('unlocked', state.unlocked);
    store.set('hero', state.heroId);
  }

  /**
   * 테스트 단계: 모든 히어로를 고를 수 있다. 사용자 결정(2026-10-17) — 지금은 운영 배포본도 테스트 단계라 항상 켠다.
   * 테스트가 끝나면 TEST_PHASE 를 false 로 (그 뒤에는 로컬 개발 서버 · 주소 ?allHeroes 일 때만).
   * 고르기만 열어 주고 진행 기록(합류 수 · 다음 합류 · 저장된 unlocked)은 실제 스타 기준 그대로다.
   */
  const TEST_PHASE = true;
  const TEST_ALL_HEROES = TEST_PHASE || !!(import.meta.env && import.meta.env.DEV) || new URLSearchParams(location.search).has('allHeroes');
  /** 스타로 실제 합류했는지 (진행 기록용) */
  const earnedUnlock = (hero) => state.stars >= hero.unlockStars || state.unlocked.includes(hero.id);
  /** 고를 수 있는지 (테스트 단계면 모두) */
  const isUnlocked = (hero) => TEST_ALL_HEROES || earnedUnlock(hero);
  /** 합류한 히어로를 기억한다 (나중에 목록 순서 · 조건이 바뀌어도 다시 잠기지 않게) */
  function rememberUnlocked() {
    const ids = A.HEROES.filter(earnedUnlock).map((h) => h.id);
    if (ids.some((id) => !state.unlocked.includes(id))) {
      state.unlocked = Array.from(new Set([...state.unlocked, ...ids]));
      store.set('unlocked', state.unlocked);
    }
  }
  rememberUnlocked();

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

  /**
   * @param {Hero} hero
   * @param {number} w
   * @param {number} h
   * @param {string} [pose] 자세 (A.HERO_POSES, 기본 서 있기)
   */
  function heroCanvas(hero, w, h, pose) {
    const cv = document.createElement('canvas');
    const ratio = window.devicePixelRatio || 1;
    cv.width = w * ratio;
    cv.height = h * ratio;
    cv.style.width = `${w}px`;
    cv.style.height = `${h}px`;
    A.drawHero(cv.getContext('2d'), hero, cv.width, cv.height, { pose });
    return cv;
  }

  /**
   * 히어로 그림: 3D 초상화(만화풍 블록 히어로)가 준비됐으면 그 이미지, 아니면 2D 그림(hero-art.js).
   * @param {Hero} hero
   * @param {number} w
   * @param {number} h
   * @returns {HTMLElement}
   */
  function heroPicture(hero, w, h) {
    const url = A.heroPortrait && A.heroPortrait(hero);
    if (!url) return heroCanvas(hero, w, h);
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.width = w;
    img.height = h;
    return img;
  }

  /** 선택 칩 (과목 · 단계) — 디자인 표준 cx-chip */
  function optionButton(label, sub, selected, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cx-chip' + (selected ? ' selected' : '');
    b.setAttribute('aria-pressed', String(selected));
    b.innerHTML = `<span class="option-label"></span>${sub ? '<span class="cx-chip-sub"></span>' : ''}`;
    b.querySelector('.option-label').textContent = label;
    if (sub) b.querySelector('.cx-chip-sub').textContent = sub;
    b.addEventListener('click', onClick);
    return b;
  }

  /** 이름 뒤 조사 '이/가': 마지막 글자에 받침이 있으면 '이' (예: 썬더 퀸이, 레드 아머가) */
  function josaIGa(word) {
    const code = word.charCodeAt(word.length - 1) - 0xac00;
    return code >= 0 && code <= 11171 && code % 28 !== 0 ? '이' : '가';
  }

  /** 아직 합류하지 않은 히어로 중 목록에서 가장 앞 (다음 합류 히어로, 없으면 null) */
  function nextHero() {
    return A.HEROES.find((h) => !earnedUnlock(h)) || null;
  }

  function renderMenu() {
    if (!isUnlocked(A.findHero(state.heroId))) state.heroId = 'spider-man';
    $('#starCount').textContent = state.stars;

    const owned = A.HEROES.filter(earnedUnlock).length;
    $('#heroCount').textContent = `${owned} / ${A.HEROES.length}`;
    const next = nextHero();
    $('#nextHero').textContent = next
      ? `⭐ 다음 합류: ${next.name}까지 ${next.unlockStars - state.stars}개 더`
      : '⭐ 히어로를 모두 모았어요! 🎉';

    renderStage(A.findHero(state.heroId));

    const heroes = $('#heroes');
    heroes.replaceChildren();
    // 히어로 도감: 합류 순서대로 한 줄로 (합류한 히어로 → 다음 합류 → 아직 잠긴 히어로)
    const grid = document.createElement('div');
    grid.className = 'hero-grid';
    for (const hero of A.HEROES) grid.appendChild(heroCard(hero, hero === next));
    heroes.append(grid);

    renderOptions();
  }

  /** 로비 위쪽 "히어로 무대": 3D 히어로 + 이름 · 출신 · 능력 말풍선 */
  function renderStage(hero) {
    const fam = A.findFamily(hero);
    $('#stageTeam').textContent = `${fam.star} ${fam.name} 능력`;
    $('#stageName').textContent = hero.name;
    $('#stageUniverse').textContent = hero.universe;
    $('#stageAbility').textContent = hero.abilityText;
    if (showcase) showcase.setHero(hero);
    else $('#showcase').replaceChildren(heroCanvas(hero, 180, 202, 'win')); // 2D 그림 무대
  }

  /**
   * 히어로 카드 하나 (3D 초상화 + 이름). 잠긴 히어로는 "???" + 필요한 스타, 다음 합류 히어로는 이름을 미리 보여 준다.
   * @param {Hero} hero
   * @param {boolean} isNext 다음 합류 히어로인지
   */
  function heroCard(hero, isNext) {
    const unlocked = isUnlocked(hero);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'cx-card' + (hero.id === state.heroId ? ' selected' : '') + (unlocked ? '' : ' locked') + (isNext ? ' is-next' : '');
    card.disabled = !unlocked;
    card.setAttribute('aria-pressed', String(hero.id === state.heroId));
    const fam = A.findFamily(hero);
    card.title = unlocked ? `${hero.name} — ${fam.star} ${fam.name} · ${hero.abilityText}` : `⭐ ${hero.unlockStars}개 모으면 합류 (지금 ${state.stars}개)`;
    card.appendChild(heroPicture(hero, 80, 90));
    const name = document.createElement('span');
    name.className = 'card-name';
    name.textContent = unlocked || isNext ? hero.name : '???';
    card.appendChild(name);
    if (!unlocked) {
      const lock = document.createElement('span');
      lock.className = 'card-lock';
      lock.textContent = `🔒 ⭐ ${hero.unlockStars}`;
      card.appendChild(lock);
    }
    card.addEventListener('click', () => {
      state.heroId = hero.id;
      renderMenu();
    });
    return card;
  }

  /** 놀이 타일 (큰 아이콘 + 이름 + 짧은 설명) — 디자인 표준 cx-tile */
  function modeTile(m) {
    const b = document.createElement('button');
    b.type = 'button';
    const selected = m.id === state.mode;
    b.className = 'cx-tile' + (selected ? ' selected' : '') + (m.isNew ? ' is-new' : '');
    b.setAttribute('aria-pressed', String(selected));
    b.innerHTML = '<span class="tile-icon"></span><span class="tile-name"></span><span class="tile-desc"></span>';
    b.querySelector('.tile-icon').textContent = m.icon;
    b.querySelector('.tile-name').textContent = m.label;
    b.querySelector('.tile-desc').textContent = m.desc.replace(/^NEW · /, '').split(' · ').pop();
    b.addEventListener('click', () => {
      state.mode = m.id;
      renderMenu();
    });
    return b;
  }

  /** 놀이 방법 · 과목 · 단계 선택 버튼 */
  function renderOptions() {
    // 불러오지 못한 모드(예: Three.js CDN 실패 시 3D)는 메뉴에서 숨긴다.
    // Phaser 자체가 없으면 모든 모드가 미등록이므로 목록은 그대로 두고, 시작할 때 안내한다.
    const available = typeof Phaser === 'undefined' ? A.MODES : A.MODES.filter((m) => A.GAME_MODES[m.id]);
    if (!available.some((m) => m.id === state.mode)) state.mode = available[0].id;
    const modes = $('#modes');
    modes.replaceChildren(...available.map((m) => modeTile(m)));

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
        optionButton(l.label, `추천 ${l.grade}`, l.id === state.level, () => {
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
    // 합류 축하 창이 떠 있으면 닫는다 (게임 화면 위에 남아 조작을 가리지 않게)
    joinQueue = [];
    $('#joinOverlay').hidden = true;
    // 방금 누른 버튼(출동 · 다시 하기)에 포커스가 남아 있으면, 게임 중 스페이스를 눌렀을 때
    // 숨겨진 그 버튼이 다시 눌려 새 판이 시작된다. 포커스를 풀어 키 입력이 게임으로만 가게 한다.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    // 버튼을 누른 이 순간(사용자 동작)에만 허용되는 일들: 모바일 오디오 열기, 전체 화면 · 가로 고정
    A.unlockAudio();
    A.Sfx.unlock();
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
    A.Sfx.music.stop();
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
   * 받은 스타는 한 곳에 쌓이고, 조건을 넘으면 목록의 다음 히어로가 합류한다 (한 판에 한 명).
   * @param {RoundResult} r
   */
  function showResult(r) {
    stopGame();
    const wasUnlocked = new Set(A.HEROES.filter(earnedUnlock).map((h) => h.id));
    const earned = r.firstTry + (r.perfect ? A.RULES.perfectBonusStars : 0);
    state.stars += earned;
    store.set('stars', state.stars);
    const newHeroes = A.HEROES.filter((h) => earnedUnlock(h) && !wasUnlocked.has(h.id));
    rememberUnlocked();
    const next = nextHero();

    $('#resultTitle').textContent =
      r.heartsLeft <= 0 ? '💪 아쉬워요! 다시 도전!' : r.perfect ? '🏆 퍼펙트 미션!' : '🎉 미션 완료!';
    $('#resultStats').innerHTML = '';
    const stats = [
      ['점수', `${r.score}점`],
      ['한 번에 맞힌 문제', `${r.firstTry} / ${r.total}`],
      ['최고 콤보', `${r.bestCombo}`],
      ['받은 스타', `⭐ +${earned}${r.perfect ? ' (퍼펙트 보너스)' : ''}`],
      ['모은 스타', `⭐ ${state.stars}`],
      ['다음 합류', next ? `${next.name}까지 ⭐ ${next.unlockStars - state.stars}개` : '히어로 모두 모음! 🎉'],
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
      box.appendChild(heroPicture(hero, 64, 72));
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
    celebrateJoin(newHeroes);
  }

  // ---------- 새 히어로 합류 축하 ----------
  // 결과 화면 위에 카드를 띄우고, 아이가 직접 눌러 뒤집으면 히어로가 만세 자세로 등장한다.
  // (한 판에 한 명만 열리지만, 혹시 여러 명이면 차례로 보여 준다)

  const CONFETTI_COLORS = ['#ffd166', '#06d6a0', '#4cc9f0', '#ff4fa3', '#e63946', '#ffffff'];
  const CONFETTI_COUNT = 60;
  let joinQueue = [];

  /** @param {Hero[]} heroes 이번 판에 새로 합류한 히어로 */
  function celebrateJoin(heroes) {
    joinQueue = heroes.slice();
    showNextJoin();
  }

  function showNextJoin() {
    const hero = joinQueue.shift();
    const overlay = $('#joinOverlay');
    if (!hero) {
      overlay.hidden = true;
      $('#retryBtn').focus();
      return;
    }
    const family = A.findFamily(hero);
    $('#joinTitle').textContent = `${family.star} 새 히어로 합류!`;
    $('#joinStar').textContent = family.star;
    const front = $('#joinFront');
    front.replaceChildren(heroPicture(hero, 150, 168));
    for (const [cls, text] of [['join-name', hero.name], ['join-universe', hero.universe], ['join-ability', hero.abilityText]]) {
      const el = document.createElement('p');
      el.className = cls;
      el.textContent = text;
      front.appendChild(el);
    }
    $('#joinCard').classList.remove('flipped');
    $('#joinCard').dataset.heroId = hero.id;
    $('#joinLine').hidden = true;
    $('#joinOk').hidden = true;
    $('#joinConfetti').replaceChildren();
    overlay.hidden = false;
    $('#joinCard').focus();
    A.Sfx.play('combo');
  }

  /** 카드를 누름: 뒤집고, 색종이 · 팡파르 · 히어로의 한마디 */
  function revealJoin() {
    const card = $('#joinCard');
    if (card.classList.contains('flipped')) return;
    card.classList.add('flipped');
    A.Sfx.play('win');
    const box = $('#joinConfetti');
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const c = document.createElement('span');
      c.className = 'join-confetti-piece';
      c.style.left = `${Math.random() * 100}%`;
      c.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      c.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
      c.style.animationDelay = `${Math.random() * 0.5}s`;
      box.appendChild(c);
    }
    const hero = A.findHero(card.dataset.heroId);
    const line = $('#joinLine');
    line.textContent = `“${A.heroLine(hero, 'catchphrase')}”`;
    // 카드가 다 뒤집힌 뒤 대사와 확인 버튼을 보여 준다
    setTimeout(() => {
      line.hidden = false;
      $('#joinOk').hidden = false;
      $('#joinOk').focus();
    }, 650);
  }

  // ---------- 소리 설정 ----------

  /** @param {'sfx'|'bgm'} kind */
  function toggleSound(kind) {
    A.Sfx.unlock(); // 버튼을 누른 순간이 소리를 열 수 있는 기회
    A.Sfx.setEnabled(kind, !A.Sfx.isEnabled(kind));
    if (kind === 'sfx' && A.Sfx.isEnabled('sfx')) A.Sfx.play('click'); // 켜졌는지 바로 들려준다
    renderSoundButtons();
  }

  function renderSoundButtons() {
    const sfx = A.Sfx.isEnabled('sfx');
    const bgm = A.Sfx.isEnabled('bgm');
    $('#sfxToggle').textContent = sfx ? '🔊 효과음 켜짐' : '🔇 효과음 꺼짐';
    $('#sfxToggle').setAttribute('aria-pressed', String(sfx));
    $('#bgmToggle').textContent = bgm ? '🎵 배경음 켜짐' : '🎵 배경음 꺼짐';
    $('#bgmToggle').setAttribute('aria-pressed', String(bgm));
    renderVoiceButton();
    $('#muteBtn').textContent = sfx || bgm ? '🔊' : '🔇';
  }

  // ---------- 영어 목소리 팩 ----------
  // 목소리마다 원어민 발음 파일 묶음이 따로 있다 (core/speech.js, tools/audio/generate.mjs VOICES 표).
  // 누를 때마다 다음 목소리로 바꾸고, 바로 들어 보도록 짧은 문장을 읽어 준다.

  const VOICE_SAMPLE = 'I am happy.';

  function renderVoiceButton() {
    const packs = A.voicePacks();
    const btn = $('#voiceToggle');
    btn.hidden = packs.length < 2; // 팩이 하나뿐이면 고를 것이 없다
    const cur = packs.find((p) => p.id === A.getVoice());
    btn.textContent = `🗣️ ${cur ? cur.label : '목소리'}`;
  }

  function nextVoice() {
    const packs = A.voicePacks();
    if (!packs.length) return;
    const i = packs.findIndex((p) => p.id === A.getVoice());
    A.setVoice(packs[(i + 1) % packs.length].id);
    A.unlockAudio();
    renderVoiceButton();
    A.speak(VOICE_SAMPLE);
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
    $('#joinCard').addEventListener('click', revealJoin);
    $('#joinOk').addEventListener('click', showNextJoin);
    // 소리 켜기 · 끄기: 메뉴는 효과음 · 배경음 따로, 게임 중 버튼은 둘 다 한 번에
    $('#sfxToggle').addEventListener('click', () => toggleSound('sfx'));
    $('#bgmToggle').addEventListener('click', () => toggleSound('bgm'));
    $('#voiceToggle').addEventListener('click', nextVoice);
    if (A.Assets3D && A.Assets3D.supported() && A.Assets3D.USE_HERO_3D) {
      showcase = new A.HeroShowcase($('#showcase'));
      // 메뉴를 보는 동안 3D 모델을 미리 불러 두고, 다 불러오면 3D 무대 · 초상화로 다시 그린다
      A.Assets3D.preloadAll().then(() => renderMenu());
    } else {
      // 히어로는 2D 그림 (USE_HERO_3D = false 또는 3D 가 안 되는 기기). 3D 배경 모델은 메뉴를 보는 동안 미리 불러 둔다
      if (A.Assets3D && A.Assets3D.supported()) A.Assets3D.preloadAll();
    }
    $('#muteBtn').addEventListener('click', () => {
      const on = !(A.Sfx.isEnabled('sfx') || A.Sfx.isEnabled('bgm'));
      A.Sfx.setEnabled('sfx', on);
      A.Sfx.setEnabled('bgm', on);
      renderSoundButtons();
    });
    renderSoundButtons();
    $('#retryBtn').addEventListener('click', startRound);
    $('#menuBtn').addEventListener('click', backToMenu);
    renderMenu();
    show('menu');
  });
})(window.ARAH);

/**
 * @file 화면 흐름(메뉴 → 게임 → 결과)과 진행 데이터(별, 마지막 선택) 관리.
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
  let game = null;

  const isUnlocked = (hero) => state.stars >= hero.unlockStars;

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

  function renderMenu() {
    if (!isUnlocked(A.findHero(state.heroId))) state.heroId = 'red';
    $('#starCount').textContent = state.stars;

    const heroes = $('#heroes');
    heroes.replaceChildren();
    for (const hero of A.HEROES) {
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
      info.querySelector('.hero-ability').textContent = unlocked ? hero.abilityText : `🔒 ⭐ ${hero.unlockStars}개 모으면 합류`;
      card.appendChild(info);
      card.addEventListener('click', () => {
        state.heroId = hero.id;
        renderMenu();
      });
      heroes.appendChild(card);
    }

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

    const subjects = $('#subjects');
    subjects.replaceChildren(
      ...A.SUBJECTS.map((s) =>
        optionButton(`${s.icon} ${s.label}`, '', s.id === state.subject, () => {
          state.subject = s.id;
          renderMenu();
        })),
    );

    const levels = $('#levels');
    levels.replaceChildren(
      ...A.LEVELS.map((l) =>
        optionButton(l.label, l.grade, l.id === state.level, () => {
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
   * 결과 화면을 보여 주고 별을 적립한다. A.startGame 의 onEnd 콜백으로 불린다.
   * 별은 "한 번에 맞힌 문제" 기준이라, 찍어서 맞히는 것보다 차분히 푸는 쪽이 유리하다.
   * @param {RoundResult} r
   */
  function showResult(r) {
    stopGame();
    const before = state.stars;
    const earned = r.firstTry + (r.perfect ? A.RULES.perfectBonusStars : 0);
    state.stars += earned;
    store.set('stars', state.stars);
    const newHeroes = A.HEROES.filter((h) => h.unlockStars > before && h.unlockStars <= state.stars);

    $('#resultTitle').textContent =
      r.heartsLeft <= 0 ? '💪 아쉬워요! 다시 도전!' : r.perfect ? '🏆 퍼펙트 미션!' : '🎉 미션 완료!';
    $('#resultStats').innerHTML = '';
    const stats = [
      ['점수', `${r.score}점`],
      ['한 번에 맞힌 문제', `${r.firstTry} / ${r.total}`],
      ['최고 콤보', `${r.bestCombo}`],
      ['받은 별', `⭐ +${earned}${r.perfect ? ' (퍼펙트 보너스)' : ''}`],
      ['모은 별', `⭐ ${state.stars}`],
    ];
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
      p.textContent = `🆕 ${hero.universe}에서 ${hero.name}가 합류했어요!`;
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

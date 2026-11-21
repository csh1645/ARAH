/**
 * @file Godot 판 시작 스크립트 (웹 껍데기 shell.html 에서 부른다). 로딩 막대 · 지원하지 않는 브라우저 안내.
 * @see godot/web/shell.html
 */
(function () {
  'use strict';

  const config = JSON.parse(document.getElementById('godot-config').textContent);
  const boot = document.getElementById('boot');
  const fill = document.getElementById('bootFill');
  const msg = document.getElementById('bootMsg');

  const missing = Engine.getMissingFeatures({ threads: false });
  if (missing.length) {
    msg.textContent = '이 브라우저에서는 게임을 열 수 없어요. 최신 크롬 · 사파리 · 엣지로 열어 주세요.';
    console.error('지원하지 않는 기능:', missing);
    return;
  }

  const engine = new Engine(config);
  engine.startGame({
    onProgress(current, total) {
      if (total > 0) fill.style.width = `${Math.min(100, (current / total) * 100)}%`;
    },
  }).then(() => {
    boot.classList.add('hidden');
  }).catch((err) => {
    msg.textContent = '게임을 불러오지 못했어요. 새로고침해 주세요.';
    console.error(err);
  });
})();

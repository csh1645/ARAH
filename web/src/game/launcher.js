/**
 * @file 게임 시작 진입점. ui 계층은 이 함수만 알면 되고, 어떤 모드가 있는지는 몰라도 된다.
 * @layer game
 * @depends Phaser 3, A.GAME, A.GAME_MODES (game/modes/* 가 먼저 로드되어 등록되어 있어야 한다)
 */
(function (A) {
  'use strict';

  /**
   * 한 판을 시작한다. 판이 끝나면 onEnd 를 한 번 부른다.
   * 게임 인스턴스는 판마다 새로 만들고, 호출한 쪽(ui)이 destroy 한다.
   * @param {{hero: Hero, subject: string, level: 1|2|3, mode: string}} opts
   * @param {(result: RoundResult) => void} onEnd
   * @returns {Phaser.Game}
   */
  A.startGame = function (opts, onEnd) {
    const SceneClass = A.GAME_MODES[opts.mode] || A.GAME_MODES.catch;
    // 3D 모드처럼 뒤에 다른 캔버스를 깔아 쓰는 장면은 Phaser 캔버스를 투명하게 만든다
    const transparent = !!SceneClass.transparent;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      width: A.GAME.W,
      height: A.GAME.H,
      transparent,
      backgroundColor: transparent ? undefined : '#0b1026',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    });
    // add 의 마지막 인자가 RoundScene.init(data) 로 전달된다
    game.scene.add('play', SceneClass, true, { opts, onEnd });
    return game;
  };
})(window.ARAH);

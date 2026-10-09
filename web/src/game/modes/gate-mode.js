/**
 * @file 🚪 문 통과 모드의 규칙 · 판정. 달리는 히어로 앞으로 보기가 붙은 문들이 다가오고,
 *       문에 닿는 순간 서 있는 줄의 문을 통과한다. 로블록스의 "맞는 문 고르기" 오비(장애물 코스)를 참고했다.
 * @layer game
 * @depends A.RoundScene, A.GAME, A.util, A.RULES, A.speak, A.GateView2D
 * @see doc/planning/game-design.md (3.3 문 통과), doc/decisions/ADR-0005-threejs-3d.md
 *
 * 판정: 정답 문 통과 → 다음 문제
 *       오답 문 → 유리문이 깨지고 떨어졌다가 거미줄로 복귀, 하트 -1, 깨진 문은 막히고 같은 구간을 다시 달린다
 *
 * 규칙(이 파일)과 화면(뷰)을 나눴다. 같은 규칙을 2D 뷰(views/gate-view-2d.js)와
 * 3D 뷰(views/gate-view-3d.js, Three.js)가 함께 쓴다. 뷰가 구현해야 할 함수는 GateView typedef 참고.
 */

/**
 * 문 하나의 데이터. 화면 객체는 뷰가 d.v 에 붙여 관리한다.
 * @typedef {Object} GateDoor
 * @property {number} lane      줄 번호 (왼쪽부터 0)
 * @property {string} label     보기 (숫자 · 단어 · 이모지 그림)
 * @property {boolean} isCorrect
 * @property {boolean} used     막힌 문 (오답으로 깨졌거나 힌트로 막힘)
 * @property {*} [v]            뷰 전용 화면 객체
 */

/**
 * 문 통과 뷰가 구현할 함수 목록 (2D · 3D 공통).
 * @typedef {Object} GateView
 * @property {(startLane: number) => void} build                    배경 · 히어로 만들기
 * @property {(doors: GateDoor[], picture: boolean) => void} createDoors
 * @property {(doors: GateDoor[]) => void} clearDoors              통과 후 문들 치우기
 * @property {(d: GateDoor) => void} blockDoor
 * @property {(doors: GateDoor[], p: number, lane: number) => void} layout  p: 다가온 정도 0 → 1
 * @property {(lane: number, ms: number) => void} moveHeroToLane
 * @property {(doors: GateDoor[], x: number, y: number) => GateDoor|null} doorAt  화면 좌표의 문
 * @property {() => number} heroScreenX
 * @property {(d: GateDoor) => {x: number, y: number}} doorScreenPos  축하 연출 위치 (게임 좌표)
 * @property {(d: GateDoor) => void} markPass
 * @property {(d: GateDoor) => void} markWrong
 * @property {(d: GateDoor, onFallen: () => void, onDone: () => void) => void} crash  떨어짐 → 거미줄 복귀
 * @property {(time: number, delta: number, st: Object) => void} update
 * @property {() => void} [destroy]                                 장면이 끝날 때 정리 (3D 리소스 해제 등)
 */
(function (A) {
  'use strict';

  if (!A.RoundScene) return;

  const { W, HUD_H } = A.GAME;

  const DASH_FACTOR = 4; // 대시하면 문이 이 배수로 빨리 다가온다
  const LANE_MOVE_MS = 140;
  const NEXT_DELAY = 800;

  class GateScene extends A.RoundScene {
    constructor() {
      super({ key: 'play' });
    }

    introText() {
      return `${this.hero.name} 출동!\n정답 문이 있는 줄로 달려가요`;
    }

    questionOptions() {
      return { pictureChoices: true };
    }

    /** 화면 뷰를 만든다. 3D 모드는 이 함수만 바꿔서 같은 규칙을 3D 로 보여 준다. @returns {GateView} */
    createView(laneCount) {
      return new A.GateView2D(this, laneCount);
    }

    createWorld() {
      /** @type {GateDoor[]} 줄 번호 순서. doors[i] 는 i 번째 줄의 문 */
      this.doors = [];
      this.p = 0; // 문이 다가온 정도 0(멀리) → 1(도착)
      this.dash = false;
      this.busy = false; // 떨어지는 중 · 복귀 중에는 입력과 진행을 멈춘다
      this.rescuing = false;

      this.laneCount = A.RULES.choicesByLevel[this.opts.level];
      this.lane = Math.floor((this.laneCount - 1) / 2);
      this.view = this.createView(this.laneCount);
      this.view.build(this.lane);
      this.events.once('shutdown', () => this.view.destroy && this.view.destroy());
      this.events.once('destroy', () => this.view.destroy && this.view.destroy());

      this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,A,D,SPACE,UP,W');
      this.input.on('pointerdown', (p) => this.onTap(p.worldX, p.worldY));
    }

    // ---------- 문 ----------

    startWave(q) {
      this.doors = q.choices.map((label, i) => ({ lane: i, label, isCorrect: label === q.answer, used: false }));
      this.view.createDoors(this.doors, !!q.pictureChoices);
      if (this.ab.hint) this.blockDoor(A.util.pick(this.doors.filter((d) => !d.isCorrect)));

      const base = A.RULES.gateTimeByLevel[this.opts.level];
      this.approachMs = (base / (this.ab.slow || 1) + (this.ab.timeBonus || 0)) * 1000;
      this.p = 0;
      this.dash = false;
      this.ensureOpenLane();
      this.view.layout(this.doors, this.p, this.lane);
      // 영어 그림 문제는 단어를 들려준다 (듣기 + 읽기 연습). 문제 글자를 누르면 다시 들을 수 있다.
      if (q.pictureChoices && q.speak) A.speak(q.speak);
    }

    clearWave() {
      this.view.clearDoors(this.doors);
      this.doors = [];
      this.dash = false;
    }

    /** 문을 막는다 (오답으로 깨졌거나 탐정 스파이더 힌트). 이 줄로는 이동할 수 없다. */
    blockDoor(d) {
      d.used = true;
      this.view.blockDoor(d);
    }

    // ---------- 줄 이동 ----------

    setLane(i) {
      if (i === this.lane) return;
      this.lane = i;
      this.view.moveHeroToLane(i, LANE_MOVE_MS / (this.ab.webSpeed || 1));
      this.view.layout(this.doors, this.p, this.lane);
    }

    /** step 방향으로 막히지 않은 다음 줄로 옮긴다. 막힌 줄은 건너뛴다. */
    moveLane(step) {
      for (let i = this.lane + step; i >= 0 && i < this.laneCount; i += step) {
        if (!this.doors[i] || !this.doors[i].used) {
          this.setLane(i);
          return;
        }
      }
    }

    /** 지금 줄이 막혀 있으면 가장 가까운 열린 줄로 비킨다. */
    ensureOpenLane() {
      if (!this.doors[this.lane] || !this.doors[this.lane].used) return;
      const open = this.doors.filter((d) => !d.used).map((d) => d.lane);
      open.sort((a, b) => Math.abs(a - this.lane) - Math.abs(b - this.lane));
      if (open.length) this.setLane(open[0]);
    }

    /**
     * 터치 · 클릭: 문을 누르면 그 줄로 이동, 이미 그 줄이면 대시.
     * 문 밖을 누르면 히어로 기준 왼쪽/오른쪽으로 한 줄 이동. 상단 문제를 누르면 단어를 다시 읽어 준다.
     */
    onTap(x, y) {
      if (y < HUD_H) {
        if (this.q && this.q.speak) A.speak(this.q.speak);
        return;
      }
      if (!this.waveActive || this.busy) return;
      const hit = this.view.doorAt(this.doors, x, y);
      if (hit) {
        if (hit.used) return;
        if (hit.lane === this.lane) this.dash = true;
        else this.setLane(hit.lane);
        return;
      }
      this.moveLane(x < this.view.heroScreenX() ? -1 : 1);
    }

    // ---------- 도착 판정 ----------

    arrive() {
      const d = this.doors[this.lane];
      if (d.isCorrect) this.passDoor(d);
      else this.crashDoor(d);
    }

    passDoor(d) {
      const pos = this.view.doorScreenPos(d);
      const pts = this.awardCorrect(pos.x, pos.y);
      this.view.markPass(d);
      this.flashScreen(0xffffff, 0.5);
      this.popup(pos.x, 330, `통과! +${pts}`, '#06d6a0');
      if (this.q.speak) A.speak(this.q.speak);
      this.endWave(NEXT_DELAY);
    }

    /** 오답 문: 유리가 깨지고 떨어졌다가 거미줄로 올라와 같은 구간을 다시 달린다. */
    crashDoor(d) {
      this.busy = true;
      this.penalize();
      this.blockDoor(d);
      this.view.markWrong(d);
      this.popup(this.view.doorScreenPos(d).x, 330, '앗! 깨지는 문이었어요', '#ff5c5c');
      this.view.crash(d, () => { this.rescuing = true; }, () => this.afterRescue());
    }

    afterRescue() {
      this.rescuing = false;
      if (this.hearts <= 0) {
        this.endWave(NEXT_DELAY);
        this.busy = false;
        return;
      }
      // 같은 구간 다시 시작: 문들이 다시 멀리서 다가온다
      this.p = 0;
      this.dash = false;
      this.ensureOpenLane();
      this.view.layout(this.doors, this.p, this.lane);
      this.popup(W / 2, 300, '다시 도전!', '#ffd166');
      this.busy = false;
    }

    // ---------- 매 프레임 ----------

    update(time, delta) {
      if (this.ended) return;
      const k = this.keys;
      const JustDown = Phaser.Input.Keyboard.JustDown;
      // 키 눌림은 항상 읽어서 비워 두고, 움직일 수 있을 때만 반영한다 (멈춘 동안 눌린 키가 나중에 튀지 않게)
      const left = JustDown(k.LEFT) || JustDown(k.A);
      const right = JustDown(k.RIGHT) || JustDown(k.D);
      const dash = JustDown(k.SPACE) || JustDown(k.UP) || JustDown(k.W);

      if (this.waveActive && !this.busy) {
        if (left) this.moveLane(-1);
        if (right) this.moveLane(1);
        if (dash) this.dash = true;
        this.p = Math.min(1, this.p + (delta / this.approachMs) * (this.dash ? DASH_FACTOR : 1));
        this.view.layout(this.doors, this.p, this.lane);
        if (this.p >= 1) this.arrive();
      }

      this.view.update(time, delta, {
        dash: this.dash && this.waveActive,
        busy: this.busy,
        rescuing: this.rescuing,
        speed: this.dash ? DASH_FACTOR : 1,
      });
    }
  }

  A.GateScene = GateScene;
  A.GAME_MODES.gate = GateScene;
})(window.ARAH);

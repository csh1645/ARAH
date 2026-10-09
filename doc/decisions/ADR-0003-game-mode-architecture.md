# ADR-0003: 게임 모드 구조 (공통 기반 장면 + 모드 등록)

* **상태:** 채택
* **날짜:** 2026-10-10

## 배경

첫 모드(드론 잡기)에 이어 빌딩 스윙 모드를 추가하게 되었고, 앞으로도 놀이 방법이 늘어날 수 있습니다.
모드마다 하트, 점수, 콤보, 문제 진행, 결과 처리를 따로 구현하면 규칙이 어긋나고 수정할 곳이 늘어납니다.

## 결정

* **공통 규칙은 기반 클래스 하나에 둡니다:** `web/src/game/round-scene.js`의 `RoundScene`
  * 하트, 점수, 콤보, 10문제 진행, 중복 출제 방지, HUD, 결과 전달(`RoundResult`)
* **모드는 하위 클래스로 만들고 훅만 구현합니다:** `web/src/game/modes/*.js`
  * `createWorld()` 배경 · 히어로 · 입력 / `startWave(q)` 보기 배치 / `clearWave()` 보기 정리
  * 판정 결과는 공통 기능 `awardCorrect()`, `penalize()`, `endWave(delay)`로 처리
* **모드는 스스로 등록합니다:** `A.GAME_MODES[id] = 장면 클래스`
* **ui 는 모드를 몰라도 됩니다:** `A.startGame({ mode, ... }, onEnd)`만 호출 (`web/src/game/launcher.js`)

## 새 모드 추가 절차

1. `web/src/game/modes/<id>-mode.js` 작성 (`A.RoundScene` 상속, 훅 구현, `A.GAME_MODES.<id>` 등록)
2. `web/index.html`에서 `launcher.js` 앞에 스크립트 추가
3. `web/src/data/curriculum.js`의 `A.MODES`에 메뉴 항목 추가
4. 히어로 능력이 새 모드에서 어떤 효과를 낼지 정하고 `doc/planning/game-design.md` 5절 표에 반영

## 결과

* 점수 · 별 · 복습 규칙이 모든 모드에서 같게 유지됩니다
* 새 모드는 "보기를 어떻게 보여 주고 어떻게 고르는가"만 구현하면 됩니다
* Phaser 를 불러오지 못한 경우(오프라인)에도 기반 파일이 조용히 멈춰 메뉴는 정상 표시되고, 시작 시 안내 메시지를 띄웁니다

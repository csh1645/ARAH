# CLAUDE.md — 에이전트 작업 안내

이 파일은 새 세션 · 다른 에이전트가 이 프로젝트를 바로 이어받기 위한 안내입니다. 작업 전에 끝까지 읽습니다.
사람용 소개는 [README.md](README.md), 문서 목차는 [doc/README.md](doc/README.md)에 있습니다.

## 1. 프로젝트 한눈에

* **무엇:** "히어로 대작전" — 초등 저학년 아이 한 명을 위한 수학 사칙연산 · 영어(단어 · 철자 · 듣기) 학습 액션 웹게임. 1~6단계 (화면에 학년 표시 없음)
* **테마:** 스파이더맨 · 어벤저스 느낌의 **히어로 연합 8팀 × 6명 = 48명**, 팀 스타로 한 명씩 합류. 원조를 떠올리게 하는 오마주 디자인이되 **공식 이름 · 로고 · 공식 이미지 파일은 절대 쓰지 않는다** ([ADR-0002](doc/decisions/ADR-0002-original-characters.md))
* **스택:** 순수 HTML/JS, 빌드 도구 없음. Phaser 3.80.1(2D) + Three.js r149(3D, 문 통과 3D 모드) — 둘 다 CDN, 버전 고정
* **배포:** GitHub `csh1645/ARAH` `main` → Vercel 자동 배포, **Root Directory = `web`** ([deploy-vercel.md](doc/guides/deploy-vercel.md))
* **사용자 선호:** 한국어 응답, 결론 먼저. 문서는 `doc/` 아래 Markdown으로 관리, 개발 표준 · 주석을 중시, **변경 후 에이전트가 직접 브라우저로 끝까지 플레이 테스트하고 결과를 보고**하길 원함

## 2. 현재 상태 (2026-10-10 기준)

| 항목 | 상태 |
|---|---|
| 놀이 6종 (드론 잡기 · 빌딩 스윙 · 문 통과(3D 자동) · 철자 잇기 · 짝꿍 찾기 · 보스 배틀) — 서로 겹치지 않게 | ✅ 모두 완주 테스트 통과 |
| 빌딩 스윙: 팀별 건너가기 8종 (`game/travels.js`) | ✅ |
| 팀별 공격 모양 8종 (`game/attacks.js`): 빔 · 방패 던지기 · 번개 · 바위 · 화살 · 구슬 · 발톱, 보스전 거인 점프 · 표범 달려들기 · 방패 복귀 | ✅ |
| 히어로 48명 · 팀 스타 · 한 번에 한 명 합류 · 기존 진행 이전 | ✅ (예전 별 → 거미 스타, `ui/app.js` LEGACY_UNLOCKS) |
| 1~6단계 수학 · 영어 123단어 · 듣기 문제 | ✅ |
| 오답 복습 노트 (간격 반복, `questions/review.js`) | ✅ |
| 발음 파일 123개 (전 단어) | ✅ kokoro-js `af_heart`, 총 약 4MB, 디코딩 검증 완료 |
| 효과음 · 배경음 (팀별 발사음 8종 · 상황음 13종 · 배경음 2곡) | ✅ `core/sfx.js` Web Audio 합성, 모드는 `this.sfx()` · `this.shotSfx()` 만 호출 |
| 동적 연출, 폰 세로 안내 | ✅ |
| 히어로 애니메이션: 자세 8프레임(서기 · 숨쉬기 · 달리기 2 · 공격 · 점프 · 아야 · 만세) + 승리 춤, 3D 도 같은 프레임 | ✅ `hero-art.js` POSES · `round-scene.js` setHeroBase/setHeroPose ([game-design 9.1](doc/planning/game-design.md)) |
| 근접 팀(거인 · 표범)은 모든 놀이에서 쏘지 않고 직접 뛰어올라 때림 | ✅ 기반 `meleeTo()` (드론 잡기 · 철자 잇기 · 보스 배틀 공통) |
| 히어로 대사 말풍선: 팀별 말투 8종 + 48명 한마디 (`data/hero-lines.js`, 기반 `heroSay()`) | ✅ [game-design 9.2](doc/planning/game-design.md) |
| 새 히어로 합류 축하: 카드 눌러 뒤집기 · 색종이 · 한마디 (`ui/app.js` celebrateJoin) | ✅ |
| **다음 후보 (사용자 결정 대기)** — 사용자: "1 · 2번 진행 뒤 고민" | ⏳ 남은 제안: ③ 오늘의 미션 · 출석 스타 ④ 보스 종류 추가 · 처치 도감 ⑤ 스티커 · 칭호. 사용자가 고르기 전에는 시작하지 않는다 |
| GitHub `csh1645/ARAH` `main` push | ✅ (2026-10-10) |
| Vercel 배포 | ✅ https://arah-web-olive.vercel.app/ (Root Directory `web`, `main` push 시 자동 배포). 배포본에서 4개 모드 시작 · 콘솔 오류 0 확인 |
| 원어민 발음 파일 40개 | ✅ kokoro-js(Kokoro-82M, `af_heart`)로 생성 · 적용. 단어 추가 시 생성 절차: [web/assets/audio/words/README.md](web/assets/audio/words/README.md) |
| 고도화 검토 | ✅ [doc/planning/enhancement-review.md](doc/planning/enhancement-review.md) — 다음 작업은 여기 "추천 진행 순서"를 따른다 |
| 실제 아이 · 실제 기기 플레이 테스트 | ⏳ 미실시 |

남은 일 전체 목록: [doc/planning/roadmap.md](doc/planning/roadmap.md)

## 3. 구조와 규칙 (반드시 지킬 것)

상세: [doc/standards/coding-standards.md](doc/standards/coding-standards.md)

```
web/src/
├─ core/       util(랜덤 · bezier2) · storage · speech   (의존 없음)
├─ data/       curriculum(단계 · 규칙 · 놀이 목록) · heroes(팀 · 48명) · words · audio-manifest   (값만, 로직 없음)
├─ questions/  math · english · index · review(복습 노트)   (엔진 독립: Phaser/DOM 금지)
├─ game/       round-scene(공통 규칙 · 능력 계산 · 소리 · 공격 그리기) · travels(팀별 이동) · attacks(팀별 공격) · modes/(놀이 6종) · views/(문 통과 2D·3D) · hero-art · launcher
└─ ui/         app.js (메뉴 · 결과 · 모바일 처리)
```

* **의존 방향:** `core ← data ← questions ← game / ui`. 역방향 참조 금지
* **모듈 방식:** 일반 `<script>` + 전역 `window.ARAH`(코드에서는 `A`) + IIFE + `'use strict'`. **로드 순서 = `web/index.html`의 script 순서**
* **주석:** 모든 JS 파일 머리에 `@file @layer @depends @see`, 공개 API(`A.*`)에는 JSDoc, 공유 객체는 `@typedef`
* **게임 수치는 `data/curriculum.js`의 `A.RULES`에만** 둔다
* **새 모드:** `RoundScene` 상속 + 훅(`createWorld/startWave/clearWave`, 선택 `questionOptions`) + `A.GAME_MODES[id]` 등록 + `A.MODES` 메뉴 항목 ([ADR-0003](doc/decisions/ADR-0003-game-mode-architecture.md))
* **3D:** 규칙(`modes/gate-mode.js`)과 화면(`views/gate-view-2d.js`, `gate-view-3d.js`) 분리. WebGL 이 되면 3D 자동 (`GateScene.use3D()`), 3D 일 때 `transparent` 로 Phaser 캔버스를 투명하게 해 HUD만 겹친다 ([ADR-0005](doc/decisions/ADR-0005-threejs-3d.md))
* **히어로 능력 공식은 기반에만:** 제한 시간 `timeLimitMs()`, 가짜 보기 `decoyIndex()` (모드에 복사하지 않는다)
* **한 화면에 여러 문제(짝꿍 찾기):** `awardCorrect(x, y, q)`, `penalize(loseHeart, q)`, `recordReview(q)` 로 문제를 지정한다
* **새 팀:** `heroes.js` 의 HERO_FAMILIES(shot · star · attack · travel · fail) + 히어로 6명 + `hero-art.js` 체형 + `attacks.js` 공격 + `travels.js` 이동
* **히어로 대사는 데이터에만:** 문장은 `data/hero-lines.js` (팀 말투 표를 지킨다, 원조 공식 대사 그대로 금지). 모드는 대사를 직접 띄우지 않는다 — 시작 · 정답 · 콤보 · 오답 · 끝에서 기반이 `heroSay()` 를 부른다
* **이름 충돌 방지:** CSS 클래스 · keyframes · DOM id · 텍스처 키 · `A.*` 는 컴포넌트 접두어 ([개발 표준 3.1](doc/standards/coding-standards.md))
* **히어로 동작은 기반 경유:** 쏘기 `heroShoot()`, 근접 `meleeTo(target, onImpact, {land})`, 애니메이션 `setHeroBase('idle'|'run'|'jump')` · `setHeroPose('attack'|'win'|'hurt')`, 둥실둥실 `startHeroBob()`. 정답(만세) · 오답(아야) · 판 끝(승리 춤)은 기반이 자동으로 한다. 히어로 크기는 `createHero(x, y, scale)` 로만 정한다 (반동 연출의 기준)
* **공격 모양은 기반 경유:** 모드는 투사체 위치만 계산하고 `this.drawAttack(g, from, to)` · `this.attackHit(x, y)` · `this.drawTether()` 를 부른다. 스타일 객체는 `this.attackStyle` (이름 주의: 예전에 `this.attack` 으로 했다가 보스 배틀의 공격 메서드와 겹쳐 오류가 났음 → 보스의 동작은 `strike()`)
* **코드와 문서를 함께 바꾼다:** 규칙 → `game-design.md`, 출제 범위 → `curriculum.md`, 중요한 결정 → 새 ADR, 테스트 → `doc/qa/`

## 4. 보안 (위반 금지)

* **`key.txt`(GitHub 토큰)는 절대 읽어서 출력하거나, 커밋하거나, Git 설정 · remote URL에 저장하지 않는다.** `.gitignore`에 등록되어 있다
* push가 필요하면 토큰을 그 명령의 환경 변수로만 전달하고 끝나면 지운다 (6절 명령). 출력은 토큰 패턴을 가린다
* 커밋 전 `git grep --cached -E "github_pat_|ghp_|AIza"`로 비밀 값이 섞이지 않았는지 확인한다
* 아동 대상: 개인정보 수집 · 외부 전송 금지, 동적 문자열은 `textContent`로만 넣는다
* 외부 API 키(Google TTS 등)는 환경 변수로만 받는다 (`tools/audio/generate_word_audio.py` 참고)

## 5. 실행 · 테스트 방법

* 로컬 서버: `python -m http.server 8123 --directory web` (Claude 데스크톱 앱에서는 `.claude/launch.json`의 `web` 설정으로 `preview_start`)
* 콘솔에서 현재 판의 장면: `ARAH.currentGame.scene.getScene('play')`
* **자동 플레이 테스트 요령** (브라우저 도구는 왕복 지연이 수 초라 실시간 클릭이 어렵다 → 페이지 안 스크립트로 진행):
  * 드론 잡기: `s.fireAt(drone.c.x, drone.c.y)` (`s.lastFire = -9999`로 연사 제한 해제)
  * 빌딩 스윙: `s.choose(s.targets.find(b => b.isCorrect))`
  * 문 통과(2D · 3D): `s.setLane(correct.lane); s.dash = true`
  * 철자 잇기: `s.pick(s.blocks.find(b => !b.used && b.ch === s.word[s.idx]))`, 또는 `window` 에 `KeyboardEvent('keydown', {key, keyCode})` 디스패치
* **로컬 서버 캐시 주의:** `python -m http.server`는 바뀐 JS 를 캐시에서 내줄 수 있다 → 테스트 전 `fetch(url, {cache:'reload'})` 후 새로고침
* **브라우저 창이 가려지면 게임 루프가 멈춘다** (`document.hidden`, frame 0). 테스트 전 `tabs_select`로 탭을 앞으로
  * 문제 생성기 검증: `ARAH.makeQuestion(subject, level, opts)`를 수천 번 호출해 정답 1개 · 보기 중복 없음 · 음수 없음 확인
  * 하나의 javascript 실행은 45초 제한 → 긴 완주는 백그라운드 async 루프로 돌리고 나중에 결과를 조회
* 브라우저 창이 가려지면(document.hidden) Phaser가 자동 일시정지한다 — 버그 아님
* **테스트로 늘어난 별은 되돌린다:** `ARAH.storage.set('stars', 13)` (13은 사용자가 직접 모은 값). 도감 전체를 보려면 잠깐 300으로 올렸다가 되돌린다
* 자동 플레이 스크립트에서 "모든 드론이 나타났는지" 검사할 때 힌트 능력의 가짜 드론(`d.decoy`, 반투명)은 제외해야 한다
* 내장 브라우저에는 한국어 음성만 있어 영어 TTS 품질 확인 불가 → 발음 파일로 해결함. 발음 재생 확인은 `HTMLMediaElement.prototype.play`를 감싸 재생된 파일 이름을 기록하는 방식으로 한다
* 발음 파일 검증: `OfflineAudioContext.decodeAudioData`로 길이(0.25~2초) · RMS(0.03 이상)를 확인 (에이전트는 소리를 직접 들을 수 없음 → 최종 청취는 사용자에게 요청)
* 효과음 검증: `AudioContext.prototype.createOscillator / createBufferSource` 를 감싸 생성 수를 센다 (예: 보스 정답 공격 = 발진기 3 · 잡음 2). 배경음은 `ARAH.Sfx.music.timer` 로 재생 여부 확인
* 다른 탭(발음 생성 서버 등)을 열면 게임 탭이 가려져 멈춘다 → 테스트 전 `tabs_select` 로 게임 탭을 앞으로

## 6. Git · 배포

* 커밋 메시지 형식: `feat: / fix: / content: / docs: / refactor:` + 한국어 요약, 끝에 `Co-Authored-By` 줄
* PowerShell에서 여러 줄 커밋 메시지는 파일로 써서 `git commit -F <파일>`을 쓴다 (`-F -` 파이프는 동작하지 않았음)
* push (토큰을 저장하지 않는 1회용 방식):

```powershell
# key.txt 에는 classic(ghp_...) 또는 fine-grained(github_pat_...) 토큰이 들어 있을 수 있다 — 둘 다 인식
$env:ARAH_PAT = ([regex]::Match((Get-Content -LiteralPath "key.txt" -Raw), '(github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9]+)')).Value
try {
  git -c credential.helper= -c 'credential.helper=!f() { test "$1" = get || exit 0; echo username=csh1645; echo "password=$ARAH_PAT"; }; f' push origin main 2>&1 | ForEach-Object { "$_" -replace '(github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9]+)', '[REDACTED]' }
} finally { Remove-Item Env:ARAH_PAT -ErrorAction SilentlyContinue }
```

* 토큰 형식 확인은 값을 출력하지 말고 형식 · 길이만 본다 (예: `type=classic token, length=47`)
* **403 (Permission denied):** 토큰 권한 문제. fine-grained 라면 Repository access 를 `Only select repositories → ARAH` 로, Permissions 의 `Contents: Read and write`. 같은 명령을 반복하지 말고 사용자에게 확인을 요청한다
* **Invalid username or token:** 토큰이 바뀌었거나 만료됨. 위처럼 형식을 다시 확인한다
* `main` 에 push 하면 Vercel 이 자동 배포한다 → 동작 확인이 끝난 변경만 push 한다

## 7. 사용자와 정한 것 (다시 묻지 말 것)

* 웹 우선, 고도화 시 MVP 결과로 플랫폼 결정 ([ADR-0001](doc/decisions/ADR-0001-web-first.md))
* 히어로는 원조 느낌이 강해야 함 (재미 우선) — 단 공식 이름 · 로고 금지, 배포 주소는 가족 공유 범위
* 변경이 끝나고 테스트에 이상이 없으면 push 까지 진행 (사용자 지시, 2026-10-10)
* 2D 단순 액션, 대상 2학년 → 3학년, 학습 목적 (수학 사칙연산 + 기초 영어)
* 영어 발음은 **미국 원어민 기준, 기기와 무관하게 동일**해야 함 → 발음 파일 방식 (출처만 미정)
* 모바일 전용 FE는 만들지 않고 반응형 + 가로 안내로 대응 (실기기 테스트 후 재검토)

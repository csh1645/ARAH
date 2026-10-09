# CLAUDE.md — 에이전트 작업 안내

이 파일은 새 세션 · 다른 에이전트가 이 프로젝트를 바로 이어받기 위한 안내입니다. 작업 전에 끝까지 읽습니다.
사람용 소개는 [README.md](README.md), 문서 목차는 [doc/README.md](doc/README.md)에 있습니다.

## 1. 프로젝트 한눈에

* **무엇:** 초등 2학년(2027년 3학년) 아이 한 명을 위한 수학 사칙연산 · 영어 단어 학습 액션 웹게임
* **테마:** 아이가 좋아하는 "여러 스파이더맨(멀티버스)" 콘셉트를 **오리지널 거미 히어로**로 구현 (공식 Marvel 이름 · 디자인 금지, [ADR-0002](doc/decisions/ADR-0002-original-characters.md))
* **스택:** 순수 HTML/JS, 빌드 도구 없음. Phaser 3.80.1(2D) + Three.js r149(3D, 문 통과 3D 모드) — 둘 다 CDN, 버전 고정
* **배포:** GitHub `csh1645/ARAH` `main` → Vercel 자동 배포, **Root Directory = `web`** ([deploy-vercel.md](doc/guides/deploy-vercel.md))
* **사용자 선호:** 한국어 응답, 결론 먼저. 문서는 `doc/` 아래 Markdown으로 관리, 개발 표준 · 주석을 중시, **변경 후 에이전트가 직접 브라우저로 끝까지 플레이 테스트하고 결과를 보고**하길 원함

## 2. 현재 상태 (2026-10-10 기준)

| 항목 | 상태 |
|---|---|
| 놀이 방법 4종 (드론 잡기 · 빌딩 스윙 · 문 통과 · 3D 문 통과) | ✅ 완성, 모두 10문제 완주 테스트 통과 |
| 히어로 6종 · 별 · 합류, 동적 연출, 폰 세로 안내 | ✅ |
| 첫 커밋 `ea7dca8` (로컬) | ✅ |
| **GitHub push** | ❌ 403 — 토큰에 저장소 쓰기 권한 없음. 사용자가 토큰 권한 수정 필요 (아래 6절) |
| Vercel 배포 | ⏳ push 이후 사용자가 진행 |
| **원어민 발음 파일 40개** | ⏳ 재생 구조 · 생성 스크립트 완료, **파일 출처 결정 대기** ([ADR-0004](doc/decisions/ADR-0004-pronunciation.md)) |
| 실제 아이 · 실제 기기 플레이 테스트 | ⏳ 미실시 |

남은 일 전체 목록: [doc/planning/roadmap.md](doc/planning/roadmap.md)

## 3. 구조와 규칙 (반드시 지킬 것)

상세: [doc/standards/coding-standards.md](doc/standards/coding-standards.md)

```
web/src/
├─ core/       util · storage · speech          (의존 없음)
├─ data/       curriculum · heroes · words · audio-manifest   (값만, 로직 없음)
├─ questions/  math · english · index           (엔진 독립: Phaser/DOM 금지)
├─ game/       round-scene(공통 규칙) · modes/(모드 규칙) · views/(2D·3D 화면) · hero-art · launcher
└─ ui/         app.js (메뉴 · 결과 · 모바일 처리)
```

* **의존 방향:** `core ← data ← questions ← game / ui`. 역방향 참조 금지
* **모듈 방식:** 일반 `<script>` + 전역 `window.ARAH`(코드에서는 `A`) + IIFE + `'use strict'`. **로드 순서 = `web/index.html`의 script 순서**
* **주석:** 모든 JS 파일 머리에 `@file @layer @depends @see`, 공개 API(`A.*`)에는 JSDoc, 공유 객체는 `@typedef`
* **게임 수치는 `data/curriculum.js`의 `A.RULES`에만** 둔다
* **새 모드:** `RoundScene` 상속 + 훅(`createWorld/startWave/clearWave`, 선택 `questionOptions`) + `A.GAME_MODES[id]` 등록 + `A.MODES` 메뉴 항목 ([ADR-0003](doc/decisions/ADR-0003-game-mode-architecture.md))
* **3D:** 규칙(`modes/gate-mode.js`)과 화면(`views/gate-view-2d.js`, `gate-view-3d.js`) 분리. 3D 장면은 `static transparent = true`로 Phaser 캔버스를 투명하게 해 HUD만 겹친다 ([ADR-0005](doc/decisions/ADR-0005-threejs-3d.md))
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
  * 문제 생성기 검증: `ARAH.makeQuestion(subject, level, opts)`를 수천 번 호출해 정답 1개 · 보기 중복 없음 · 음수 없음 확인
  * 하나의 javascript 실행은 45초 제한 → 긴 완주는 백그라운드 async 루프로 돌리고 나중에 결과를 조회
* 브라우저 창이 가려지면(document.hidden) Phaser가 자동 일시정지한다 — 버그 아님
* **테스트로 늘어난 별은 되돌린다:** `ARAH.storage.set('stars', 13)` (13은 사용자가 직접 모은 값)
* 내장 브라우저에는 한국어 음성만 있어 영어 TTS 품질 확인 불가 → 발음 파일로 해결 예정

## 6. Git · 배포

* 커밋 메시지 형식: `feat: / fix: / content: / docs: / refactor:` + 한국어 요약, 끝에 `Co-Authored-By` 줄
* PowerShell에서 여러 줄 커밋 메시지는 파일로 써서 `git commit -F <파일>`을 쓴다 (`-F -` 파이프는 동작하지 않았음)
* push (토큰을 저장하지 않는 1회용 방식):

```powershell
$env:ARAH_PAT = ([regex]::Match((Get-Content -LiteralPath "key.txt" -Raw), 'github_pat_[A-Za-z0-9_]+')).Value
try {
  git -c credential.helper= -c 'credential.helper=!f() { test "$1" = get || exit 0; echo username=csh1645; echo "password=$ARAH_PAT"; }; f' push -u origin main 2>&1 | ForEach-Object { "$_" -replace 'github_pat_[A-Za-z0-9_]+', '[REDACTED]' }
} finally { Remove-Item Env:ARAH_PAT -ErrorAction SilentlyContinue }
```

* 403이 나면 토큰 권한 문제다: GitHub → Settings → Developer settings → Fine-grained tokens → 해당 토큰 → **Repository access에 `ARAH` 포함 + Permissions의 `Contents: Read and write`**. 같은 명령을 반복하지 말고 사용자에게 확인을 요청한다

## 7. 사용자와 정한 것 (다시 묻지 말 것)

* 웹 우선, 고도화 시 MVP 결과로 플랫폼 결정 ([ADR-0001](doc/decisions/ADR-0001-web-first.md))
* 2D 단순 액션, 대상 2학년 → 3학년, 학습 목적 (수학 사칙연산 + 기초 영어)
* 영어 발음은 **미국 원어민 기준, 기기와 무관하게 동일**해야 함 → 발음 파일 방식 (출처만 미정)
* 모바일 전용 FE는 만들지 않고 반응형 + 가로 안내로 대응 (실기기 테스트 후 재검토)

# Godot 전환 계획 · 구조 (ADR-0011)

> 결정: [ADR-0011](../decisions/ADR-0011-godot-engine.md) — Godot 4.7.2 (GDScript) 로 다시 만들고 웹으로 배포한다.
> 이전 판: Git 태그 `v1.0-web-phaser` (Phaser 3 + Three.js). 개발 브랜치: `feature/godot`.

## 1. 진행 상태 (2026-11-21)

| 단계 | 내용 | 상태 |
|---|---|---|
| 0 | 이전 판 태그 · Godot 4.7.2 설치 · 웹 내보내기 템플릿 | ✅ |
| 1 | 데이터 내보내기 (`tools/godot/export-data.mjs`) — 히어로 81 · 대사 · 규칙 · 문제 풀 108개(약 1.9만 문제, 검증 규칙 통과) | ✅ |
| 2 | 기반: 저장(웹 판과 같은 localStorage 키) · 글꼴 · 그림 문자 · 효과음 합성 · 발음 · 히어로 그림 불러오기 | ✅ |
| 3 | 로비 (히어로 무대 · 놀이 · 과목 · 단계 · 출신별 도감) · 결과 · 합류 축하 | ✅ |
| 4 | 한 판 기반 (`round_base.gd`) + 공격 8종 · 필살기 45종 · 건너가기 8종 | ✅ |
| 5 | 놀이 7종 (러너 · 드론 잡기 · 빌딩 스윙 · 문 통과 · 철자 잇기 · 짝꿍 찾기 · 보스 배틀) | ✅ 자동 플레이 완주 |
| 6 | 실제 아이 · 실제 기기(폰 · 태블릿) 플레이, 사용자 확인 | ⏳ |
| 7 | 운영 전환: `/` = Godot 판, 예전 Phaser 판은 `/classic.html` (사용자 "바로 진행") | ✅ 2026-11-21 |

운영(https://arah-web-olive.vercel.app/)의 첫 화면은 Godot 판이다. 예전 판: https://arah-web-olive.vercel.app/classic.html

## 2. 폴더 구조

```
godot/
├─ project.godot · export_presets.cfg (웹, 스레드 없음) · icon.svg
├─ web/            shell.html (CSP 를 지키는 웹 껍데기) · boot.js (로딩 막대) · arah-bridge.js (브라우저 다리)
├─ data/generated/ (빌드 산출물, git 제외) game.json · fonts.json · emoji.json · questions/<과목>-<단계>.json
├─ fonts/generated/(빌드 산출물, git 제외) 주아 · 검은고딕 woff2 조각 (@fontsource)
├─ scenes/main.tscn
└─ scripts/
   ├─ main.gd            화면 흐름 (로비 → 판 → 결과), 폰 세로 안내
   ├─ autoload/          Bridge · Store · Data · Review · Fonts · Emoji · Sfx · Voice · Assets · TestHook
   ├─ ui/                kit(부품) · lobby · result_screen · progress(스타 · 합류) · hero_pic · txt/ui_text/text_draw(글자)
   └─ game/              round_base(한 판 기반) · gfx(즉시 그리기) · attacks · signatures · travels · modes/*_mode.gd
```

웹 판과 1:1 로 대응한다: `round-scene.js → round_base.gd`, `attacks.js → attacks.gd`, `signatures.js → signatures.gd`,
`travels.js → travels.gd`, `modes/*-mode.js → modes/*_mode.gd`, `ui/app.js → lobby.gd · result_screen.gd · progress.gd`, `core/sfx.js → sfx.gd`.

## 3. 데이터 — 원본은 하나

* 캐릭터 · 대사 · 규칙(RULES) · 단계 · 과목 · 놀이 목록: **웹 판 `web/src/data/*.js` 가 원본**. `export-data.mjs` 가 웹 판 코드를 그대로 실행해 JSON 으로 내보낸다
* 문제: 웹 판의 검증된 생성기를 실행해 과목 × 단계 × 형식(일반 · 그림 보기 · 철자)마다 서로 다른 문제를 최대 240개 미리 만든다.
  내보낼 때 다시 검사한다: 정답이 보기 중 정확히 하나 · 보기 중복 없음 · 1~6단계 음수 없음 · 문장 단어 = 정답. 하나라도 어기면 빌드 실패
* 손 위치(줄이 나가는 곳): `hero-art.js` 의 자세 표에서 계산해 넣는다
* 그림 · 발음: 게임 묶음(.pck)에 넣지 않고 같은 사이트의 `/assets/` 를 쓴다 (원본 파일 하나, 첫 로딩 가벼움)
* 고칠 때: 웹 판 원본을 고치고 `npm run godot:build`

## 4. 브라우저 다리 (`godot/web/arah-bridge.js`)

Godot 는 `JavaScriptBridge.get_interface('ArahBridge')` 로 부른다. **eval 을 쓰지 않는다** (사이트 CSP 에 `'unsafe-eval'` 이 없다).

| 기능 | 방법 |
|---|---|
| 저장 | localStorage `arah.*` 그대로 → **웹 판과 진행이 이어진다** (옮기기 작업 불필요) |
| 발음 | 웹 판과 같은 WAV 를 HTML Audio 로 재생, 없으면 기기 음성 합성 |
| 그림 문자 · 글꼴에 없는 기호(□ 등) | 브라우저가 기기 글꼴로 그린 PNG 를 받아 텍스처로 그린다 → 지금 웹 판과 같은 모양, 그림 문자 글꼴(수 MB)을 배포하지 않음 |
| 폰 가로 고정 · 폰 여부 | 웹 판과 같은 기준 |

## 5. 빌드 · 배포

```powershell
npm run godot:build   # 데이터 내보내기 → Godot import → 스크립트 검사 → 웹 내보내기 → web/public/play/
npm run dev           # http://localhost:5173/play/index.html 에서 확인
```

* 스크립트 검사: 웹 내보내기는 GDScript 오류가 있어도 성공하므로, 빌드 중에 모든 놀이 스크립트를 불러 오류가 있으면 멈춘다 (`ARAH_CHECK=1`)
* 결과 크기: 엔진 wasm 약 38MB(전송 시 압축으로 약 9MB) + 게임 묶음 약 7MB. 엔진 파일은 버전이 같으면 브라우저 캐시를 쓴다
* **운영 배포 (2026-11-21 결정):** Godot 웹 내보내기 결과 `godot/export/web/` 를 **커밋**한다. Vercel 설정은 그대로 — `npm run build` 의 마지막 단계 `tools/godot/publish.mjs` 가
  Phaser 판 첫 화면을 `classic.html` 로 바꾸고 Godot 판 파일을 `web/dist/` 첫 화면으로 복사한다 (Vercel 빌드 서버에 Godot 가 없어도 된다)
* Godot 판을 고치면: `npm run godot:build` → `godot/export/web/` 변경을 함께 커밋 → main push
* 엔진 wasm(38MB)은 엔진 버전을 바꿀 때만 바뀐다. 게임 묶음(index.pck, 약 7MB)은 고칠 때마다 커밋된다

## 6. 테스트 방법 (에이전트)

브라우저 콘솔에서 (godot/scripts/autoload/test_hook.gd):

```js
arahTest('set', '{"mode":"catch","hero":"hulk","subject":"add","level":1}'); arahTest('start');
arahTest('autoplay', 'on');            // 놀이가 스스로 정답을 고른다 (각 놀이의 auto_step)
arahTest('state'); JSON.parse(arahLast) // 화면 · 하트 · 점수 · 문제 · 결과 (콜백 반환값은 JS 로 오지 않아 arahLast 에 둔다)
```

* 테스트로 늘어난 스타는 되돌린다 (`arahTest('stars', '<원래 값>')`)
* 한 번의 javascript 실행은 45초 제한 → 긴 완주는 백그라운드 async 루프로 돌리고 나중에 결과를 조회

## 7. 남은 일 · 개선 후보

* 실제 아이 · 실제 기기 테스트 (터치 · 화면 크기 · 소리)
* 운영 배포 방식 결정 (5절)
* 상용 느낌 강화 (Godot 로 쉬워진 것): 파티클 · 화면 전환 연출 · 문 통과를 진짜 3D 로 · UI 키트 그림 자산
* 웹 판에서 발견해 고친 것: 러너에서 놓친 정답 구슬이 화면에 멈춘 채 남던 문제 (Godot 판은 사라지게 함)

## 8. 상용 게임 느낌 작업 (2026-11-21, 사용자: "C 먼저, A 는 러너로 시험")

**C — 그림 자산 없이 화면 · 연출 개선 (모든 놀이)**

* 화면 부품: 둥근 단색 칩 → 모바일 게임식 **두툼한 입체 버튼**(아래 두께 면 · 눌리면 내려감) · 금색 선택 빛 · 굵은 글꼴(검은고딕) (`ui/kit.gd`)
* 로비: 도는 조명 줄기 · 무대 받침 · 팀 색 후광 · 떠다니는 빛 입자 · 도시 실루엣 · 출동 버튼 반짝임 · 히어로 바꿀 때 등장 연출
* 게임: 빛을 더하는 발광 불꽃 입자 · 맞는 순간 섬광 · 화면 가장자리 어둡게(비네트) · 금색 테두리 문제 판 · 진행 구슬 · 올라가는 점수 숫자 ·
  시작 안내 띠 + "쾅" 글자 · 콤보 배너 굵은 글꼴
* 화면 전환: 어둡게 덮었다가 걷히는 전환 (로비 ↔ 판 ↔ 결과)
* 결과: 별 3개 평가 (한 번에 맞힌 비율 90% ★3 · 60% ★2 · 끝까지 ★1), 하나씩 튀어나옴

**A — 3D 캐릭터 시험 (히어로 러너만)**

* 모델: **KayKit Adventurers 1.0** (Kay Lousberg, **CC0** — 상업 사용 포함 무료, 출처 표기 선택) `godot/assets/kaykit/` (5종, 각 약 3.6MB, 동작 76종 포함)
* 방식: 2D 화면 안의 작은 3D 세상(SubViewport)에 모델 · 조명 · 카메라를 두고 그 그림을 히어로 자리에 붙인다 (`game/hero3d.gd`) —
  놀이 규칙 · 판정 · 연출은 그대로, 히어로만 관절이 움직이는 3D 동작 (달리기 · 점프 · 공격 · 아야 · 환호)
* 팀 → 모델: 거미 = 후드 도적, 아머 = 기사, 방패 = 기사 + 둥근 방패, 번개 = 바바리안 + 도끼, 거인 = 바바리안, 궁수 = 도적 + 석궁, 마법 = 마법사 + 지팡이, 표범 = 도적 + 단검.
  망토 · 모자는 히어로 색으로 물들인다
* 로비 "🧪 3D 러너 시험" 으로 켜고 끈다 (기본 켜짐, 저장 키 `hero3d`)
* 한계: 원작 캐릭터(스파이더맨 등)의 얼굴 · 옷이 아니라 모험가 모델이다. 원작 느낌의 3D 는 캐릭터별 모델이 필요하다
* 크기: 게임 묶음 7MB → 13.6MB (전송 압축 후 약 5MB 예상)

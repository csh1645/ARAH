# ADR-0011: 게임 엔진을 Godot 으로 전환 (웹 배포 유지)

* 상태: 승인 (사용자, 2026-11-21 — "현재 마지막 버전을 tag 로 별도 관리하고 바로 진행")
* 이전 버전: Git 태그 **`v1.0-web-phaser`** (Phaser 3 + Three.js + Vite, 캐릭터 81명 · 놀이 7종) — 언제든 되돌리거나 비교할 수 있다

## 배경

* 사용자: "디자인 · UI 가 단순해서 아이가 잘 하지 않는다", "유니티 같은 실제 상용 게임처럼 가능할까?"
* 검토 결론: 상용 느낌은 엔진보다 **그림 · 애니메이션 · UI 자산과 계속 하게 만드는 장치(메타 게임)** 가 결정한다.
  그래도 장기적으로 상용 수준의 화면 · 연출 · 앱 출시까지 가려면 정식 게임 엔진이 낫다.
* 엔진 후보: Unity · Godot · (웹 유지) · 로블록스. 에이전트가 직접 만들고 고치는 지금 방식과의 궁합을 기준으로 비교했다.

## 결정

**Godot 4 (GDScript) 로 다시 만들고, 지금처럼 웹(Vercel)으로 배포한다.**

* Godot 의 장면(.tscn) · 리소스(.tres) · 스크립트(.gd) 는 모두 **텍스트 파일**이라 에이전트가 에디터 조작 없이 직접 만들 수 있다 (Unity 는 에디터 작업이 많다)
* 웹 내보내기(WebAssembly + WebGL2)로 같은 주소에서 플레이, 나중에 안드로이드 · iOS 앱으로도 내보낼 수 있다
* **스레드 없는 웹 내보내기**(`web_nothreads`)를 쓴다 → SharedArrayBuffer · COEP 헤더 없이 동작 (지금 보안 헤더와 맞음)
* 언어는 **GDScript** (Godot 웹 내보내기는 C# 보다 GDScript 가 안정적)
* 엔진 버전 고정: **Godot 4.7.2-stable** (winget `GodotEngine.GodotEngine` 4.7.2, 템플릿 `%APPDATA%\Godot\export_templates\4.7.2.stable\web_*.zip`)

## 하나의 원본을 유지하는 방법 (다시 만들 범위 줄이기)

| 무엇 | 원본 (그대로) | Godot 쪽 |
|---|---|---|
| 캐릭터 · 대사 · 규칙(RULES) · 단계 · 과목 · 놀이 목록 | `web/src/data/*.js` | `tools/godot/export-data.mjs` 가 JSON 으로 내보냄 → `godot/data/*.json` |
| 단어 · 문장 | SQLite `content/arah-content.db` | 위와 같이 JSON |
| 문제 | 검증된 생성기 `web/src/questions/*.js` | 과목 × 단계마다 **미리 만든 문제 풀**(JSON). 생성기 검증 규칙(정답 1개 · 보기 중복 없음 · 음수 없음)을 내보낼 때 다시 검사 |
| 캐릭터 그림 | `game/hero-art.js` → `npm run sprites` (자세별 아틀라스 PNG) | 같은 PNG · JSON 을 그대로 씀 |
| 발음 | `web/public/assets/audio/voices/*` | 같은 WAV |
| 게임 화면 · 규칙 · 연출 · 효과음 | `game/*` | **GDScript 로 다시 작성** (모드 7종 · 기반 장면 · 액션 연출 · 효과음 합성) |
| 복습 노트(간격 반복) | `questions/review.js` | GDScript 로 옮김 (작음) |

## 저장 기록

* 같은 주소(`arah-web-olive.vercel.app`)에 올리므로, 첫 실행 때 브라우저 저장소(localStorage `arah.*`)를 읽어 Godot 저장 파일로 옮긴다 (스타 · 합류 · 고른 캐릭터 · 단계 · 복습 노트)

## 배포

* 개발 중에는 `feature/godot` 브랜치. **운영은 놀이 7종이 모두 옮겨질 때까지 `v1.0-web-phaser` 계열(Phaser)을 유지**한다
* 전환 시: Godot 웹 내보내기 결과를 Vercel 에 올린다 (빌드 방식은 [godot-migration-plan](../planning/godot-migration-plan.md) 5절)

## 결과

* 좋음: 상용 엔진의 UI · 애니메이션 · 파티클 · 앱 출시 경로. 에이전트가 계속 직접 작업 가능
* 나쁨: 첫 로딩이 느려짐(엔진 수 MB), 전면 재작성 기간 동안 두 코드가 함께 있음
* 그대로: "상용 느낌"의 핵심인 그림 자산 문제는 엔진과 별개 — UI 키트 · 캐릭터 그림을 계속 보강해야 한다

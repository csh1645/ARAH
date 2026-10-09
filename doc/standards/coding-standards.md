# 개발 표준

이 프로젝트의 모든 코드는 아래 규칙을 따릅니다. 목표는 두 가지입니다.

1. **나중에 봐도 바로 이해되는 코드:** 몇 달 뒤 다시 열거나 다른 사람이 봐도 구조와 의도를 알 수 있어야 합니다
2. **이식 가능한 구조:** 웹 MVP 이후 다른 플랫폼(Godot, 모바일 등)으로 옮길 때 로직과 데이터를 그대로 재사용할 수 있어야 합니다

---

## 1. 폴더 구조와 계층

```
web/src/
├─ core/        공통 기반 (랜덤, 저장소, 음성)           → 다른 계층에 의존하지 않음
├─ data/        순수 데이터 (히어로, 단어, 규칙)          → core 만 사용
├─ questions/   문제 생성 로직                            → core, data 만 사용
├─ game/        Phaser 게임 (위 모든 계층 사용 가능)
│  ├─ hero-art.js     캐릭터 그리기 (자세 프레임 POSES 포함)
│  ├─ round-scene.js  모든 모드 공통 규칙 (기반 장면)
│  ├─ travels.js      팀별 건너가기 연출 (빌딩 스윙에서 사용)
│  ├─ attacks.js      팀별 공격 모양 (드론 잡기 · 철자 잇기 · 보스 배틀에서 사용)
│  ├─ modes/          놀이 방법별 장면: 규칙 · 판정 (catch, swing, gate, spell, match, boss)
│  ├─ views/          모드의 화면 그리기 (gate-view-2d.js: Phaser, gate-view-3d.js: Three.js)
│  └─ launcher.js     게임 시작 진입점 (A.startGame)
└─ ui/          DOM 메뉴 · 결과 화면                      → 위 모든 계층 사용 가능
```

### 의존 방향 규칙

```
core ← data ← questions ← game / ui
```

* **화살표 반대 방향 참조 금지:** 예를 들어 `questions/`가 `game/`이나 DOM을 참조하면 안 됩니다
* **`data/`에는 로직을 넣지 않습니다:** 값과 간단한 조회 함수(`findHero` 등)만 둡니다
* **`questions/`는 엔진 독립:** `Phaser`, `document`, `window.alert` 등을 쓰지 않습니다. 이 규칙 덕분에 다른 엔진으로 옮길 때 이 폴더를 그대로 번역할 수 있습니다
* **`game/`과 `ui/`는 서로 직접 부르지 않습니다:** `ui`가 `A.startGame(opts, onEnd)`를 호출하고, 결과는 콜백으로만 돌려받습니다

### 새 파일을 어디에 둘까?

| 추가하려는 것 | 위치 |
|---|---|
| 새 놀이 방법(모드) | `game/modes/<id>-mode.js` — 절차는 [ADR-0003](../decisions/ADR-0003-game-mode-architecture.md) |
| 새 과목 (예: 시계 읽기) | `questions/clock.js` + `questions/index.js`에 연결 + `data/curriculum.js`의 `SUBJECTS`에 추가 |
| 새 히어로 | `data/heroes.js`에 항목 추가 (새 외형이면 `game/hero-art.js`에 style 추가) |
| 새 단어 | `data/words.js` |
| 효과음 · 이미지 | `web/assets/audio/`, `web/assets/images/` |
| 외부 라이브러리 로컬 사본 | `web/assets/vendor/` |

---

## 2. 모듈 방식

* 빌드 도구 없이 실행되도록 **일반 `<script>` + 전역 네임스페이스 `window.ARAH`(코드 안에서는 `A`)** 를 씁니다
* 모든 파일은 즉시 실행 함수(IIFE)로 감싸고 `'use strict'`를 선언합니다
* 외부에 공개할 것만 `A.이름 = ...`으로 노출하고, 나머지는 파일 안에 숨깁니다
* **로드 순서는 `index.html`의 `<script>` 순서**가 곧 의존 순서입니다. 새 파일은 계층 순서에 맞춰 추가합니다

```js
// 표준 파일 골격
(function (A) {
  'use strict';

  const INTERNAL_CONSTANT = 10;      // 파일 내부 전용

  function helper() { /* ... */ }    // 파일 내부 전용

  A.publicApi = function () { /* ... */ };   // 공개 API
})(window.ARAH);
```

> 프로젝트가 커져 빌드 도구(Vite 등)를 도입하면 ES 모듈(`import/export`)로 전환하고, 이 절을 ADR로 갱신합니다.

---

## 3. 이름 규칙

| 대상 | 규칙 | 예시 |
|---|---|---|
| 파일 · 폴더 | kebab-case | `play-scene.js`, `hero-art.js` |
| 변수 · 함수 | camelCase | `fallSpeed`, `makeQuestion()` |
| 상수 | UPPER_SNAKE_CASE | `MISS_Y`, `PORTAL_Y` |
| 클래스 | PascalCase | `PlayScene` |
| 데이터 id | 영문 소문자 | `'red'`, `'add'`, `'eng'` |
| HTML id | camelCase | `#startBtn`, `#resultStats` |
| localStorage 키 | `arah.` 접두어 + 키 | `arah.stars` |

* 함수 이름은 동사로 시작합니다: `make`, `draw`, `render`, `show`, `on`(이벤트 처리)
* 불리언은 `is`, `has`로 시작합니다: `isCorrect`, `isUnlocked`

---

## 4. 주석 규칙

주석은 **"무엇을"보다 "왜"를** 설명합니다. 코드만 봐서 알 수 있는 내용은 쓰지 않습니다.

### 4.1 파일 머리 주석 (필수)

모든 JS 파일 맨 위에 다음 형식으로 씁니다.

```js
/**
 * @file 이 파일의 역할 한 줄 요약
 * @layer core | data | questions | game | ui
 * @depends 이 파일이 사용하는 A.* 목록
 * @see 관련 문서 경로
 */
```

### 4.2 공개 API 주석 (필수)

`A.*`로 노출하는 모든 함수에는 JSDoc을 붙입니다.

```js
/**
 * 과목과 단계에 맞는 문제 하나를 만든다.
 * @param {string} subject 과목 id (A.SUBJECTS 참고)
 * @param {1|2|3} level 단계
 * @returns {Question} 문제 객체
 */
A.makeQuestion = function (subject, level) { ... };
```

### 4.3 데이터 구조 주석 (필수)

여러 파일이 주고받는 객체는 `@typedef`로 형식을 정의합니다. (`Question`, `Hero`, `RoundResult` 등)
형식을 바꾸면 typedef와 사용하는 모든 곳을 함께 고칩니다.

### 4.4 그 밖의 규칙

* **숫자 상수에 이름 붙이기:** `468` 대신 `MISS_Y = 468 // 정답 드론이 이 선을 넘으면 놓친 것`
* **할 일 표시:** `// TODO(phase2): 오답 복습 모드에서 이 문제 우선 출제` 처럼 로드맵 단계를 적습니다
* **교육 의도는 꼭 남기기:** 예) `// 구구단 이웃 값이 가장 헷갈리는 오답이라 보기로 쓴다`
* **주석 언어:** 한국어. 코드 식별자는 영어

---

## 5. 코드 작성 규칙

* `const`를 기본으로 쓰고, 값이 바뀔 때만 `let`을 씁니다. `var`는 쓰지 않습니다
* 들여쓰기는 공백 2칸, 문자열은 작은따옴표, 문장 끝 세미콜론을 씁니다
* 게임 수치(속도, 하트 수, 문제 수)는 코드에 직접 쓰지 않고 `data/curriculum.js`의 `A.RULES`에 둡니다
* **같은 공식 · 로직을 두 곳 이상에 쓰지 않습니다.** 여러 모드가 쓰는 계산은 `RoundScene`(예: `timeLimitMs`, `decoyIndex`)이나 `core/util.js`(예: `bezier2`)로 올리고, 팀별로 달라지는 동작은 표(예: `A.TRAVELS`)로 분리합니다
* **기능을 추가할 때마다 리팩토링 · 주석 · 문서 갱신을 함께 합니다** (사용자 기본 요구 사항)
* **기반 클래스(RoundScene)에 속성을 추가할 때는 하위 모드의 메서드 이름과 겹치지 않는지 확인합니다.** 인스턴스 속성이 같은 이름의 메서드를 가려 오류가 납니다 (예: `this.attack` 속성 ↔ 보스 배틀 `attack()` 메서드 → `attackStyle` / `strike()` 로 분리)
* 화면 문구(UI 텍스트)는 아이가 읽기 쉬운 짧은 해요체로 씁니다

---

## 6. 보안 · 개인정보

학습 대상이 어린이이므로 아래 규칙을 반드시 지킵니다.

* **개인정보 수집 금지:** 이름, 나이, 학교 등을 입력받거나 저장하지 않습니다 (MVP 기준)
* **외부 전송 금지:** 학습 기록은 브라우저 localStorage에만 저장하고, 외부 서버로 보내지 않습니다
* **동적 텍스트는 `textContent`로:** 데이터에서 온 문자열을 `innerHTML`에 넣지 않습니다 (XSS 방지, XSS: 악성 스크립트가 페이지에 끼어드는 공격)
* **외부 라이브러리는 버전을 고정:** `phaser@3.80.1`처럼 정확한 버전을 씁니다. 출시 단계에서는 SRI 해시(파일 위변조 검증값)를 추가하거나 `assets/vendor/`에 로컬 사본을 둡니다
* **저장 실패에 대비:** localStorage 접근은 항상 `A.storage`를 거칩니다 (사생활 보호 모드에서도 오류 없이 동작)

---

## 7. 접근성 · 사용성

* 버튼과 터치 영역은 최소 44px 이상으로 합니다 (아이 손가락 기준)
* 정답과 오답은 색만으로 구분하지 않고 문구(`정답!`, `앗! 다시 해 봐요`)와 효과를 함께 줍니다
* 선택 버튼에는 `aria-pressed`, 아이콘 버튼에는 `aria-label`을 붙입니다

---

## 8. 문서화와 변경 관리

* **코드와 문서는 함께 바꿉니다:** 출제 범위를 바꾸면 `doc/content/curriculum.md`, 규칙을 바꾸면 `doc/planning/game-design.md`를 갱신합니다
* **인수인계 문서 유지:** 상태가 바뀌면(기능 완료, 배포, 결정) 루트 `CLAUDE.md`의 "현재 상태" 표를 함께 갱신합니다. 다음 세션 · 에이전트가 이 파일만 읽고 이어서 작업할 수 있어야 합니다
* **중요한 결정은 ADR로:** 라이브러리 교체, 플랫폼 변경, 저장 방식 변경 등은 `doc/decisions/ADR-번호-제목.md`로 남깁니다
* **버전 관리:** Git 사용을 권장하며, 커밋 메시지는 다음 형식을 씁니다

| 접두어 | 용도 | 예시 |
|---|---|---|
| `feat:` | 기능 추가 | `feat: 시계 읽기 과목 추가` |
| `fix:` | 버그 수정 | `fix: 나눗셈 3단계 몫 범위 오류 수정` |
| `content:` | 문제 · 단어 데이터 변경 | `content: 영어 단어 10개 추가` |
| `docs:` | 문서만 변경 | `docs: 로드맵 Phase 2 갱신` |
| `refactor:` | 동작 변화 없는 구조 개선 | `refactor: 드론 생성 로직 분리` |

---

## 9. 검증

MVP 단계에서는 변경 후 아래 항목을 직접 확인하고, 큰 변경은 `doc/qa/test-report-날짜.md`로 결과를 남깁니다.

- [ ] 브라우저 콘솔(F12)에 오류가 없다
- [ ] 바꾼 모드를 10문제 끝까지 진행해 결과 화면이 나온다 (모든 모드 공통 규칙을 바꿨다면 모든 모드)
- [ ] 메뉴 → 게임 → 결과 → 다시 하기 / 메뉴로 흐름이 동작한다
- [ ] 바꾼 과목 · 단계의 문제가 출제 범위 안에 있고, 정답이 보기에 꼭 하나만 있다
- [ ] 태블릿 크기(가로 768px)와 폰 크기(가로 375px)에서 화면이 깨지지 않는다

> Phase 2에서 `questions/`에 자동 테스트(정답 포함 여부, 보기 중복, 음수 없음)를 추가합니다.

# Vercel 배포 가이드

GitHub 저장소(`csh1645/ARAH`)의 `main` 브랜치에 push하면 Vercel이 자동으로 배포합니다.

* **배포 주소:** https://arah-web-olive.vercel.app/ (2026-10-10 최초 배포)

## 최초 설정 (New Project) — 2026-10-10 ~ 10-17 (빌드 없는 순수 HTML 시절, 지금은 아래 "Vite 전환 후 설정")

| 항목 | 값 | 이유 |
|---|---|---|
| Application Preset | `Other` | 빌드 도구가 없는 순수 HTML 프로젝트 |
| **Root Directory** | **`web`** | 게임 파일은 `web/`에만 있습니다. `doc/`, `tools/`는 배포하지 않습니다 |
| Build Command | (비움) | 빌드 과정 없음 |
| Output Directory | (비움) | Root Directory(`web`)를 그대로 공개 |
| Install Command | (비움) | 설치할 패키지 없음 |
| Environment Variables | (없음) | 게임은 서버 비밀 값을 쓰지 않습니다 |

## Vite 전환 후 설정 — 2026-10-17 적용 (Vercel 화면 설정은 바꾸지 않음)

Vercel 프로젝트 설정(Root Directory `web`, Framework `Other`)은 **그대로** 두고, 빌드 방법은 저장소의 `web/vercel.json` 이 정한다.
`vercel.json` 값은 화면 설정보다 우선한다.

| 항목 | `web/vercel.json` 값 | 이유 |
|---|---|---|
| installCommand | `cd .. && npm ci` | package.json 이 저장소 루트에 있다 (Root Directory 밖 파일도 빌드에 포함되는 기본 설정을 쓴다) |
| buildCommand | `cd .. && npm run build` | 콘텐츠 DB(SQLite) → 읽기 전용 JSON 변환 + Vite 빌드 |
| outputDirectory | `dist` (= `web/dist`) | vite.config.js `outDir` |
| headers | CSP · X-Content-Type-Options · X-Frame-Options · Referrer-Policy · Permissions-Policy · COOP | 보안 헤더 (아래) |

보안 헤더 (2026-10-17 점검):

* **CSP:** `default-src 'self'` — 외부 스크립트 · 외부 접속 금지.
  * `'wasm-unsafe-eval'` 는 Three.js 모델 해제기(WebAssembly)용으로만 허용한다.
  * 글꼴은 npm `@fontsource` 로 사이트 안에 넣어, 외부 글꼴 서버로 접속하지 않는다.
* **form-action · object-src · frame-ancestors** 는 모두 막는다 (`frame-ancestors 'none'` = 다른 사이트에 끼워 넣기 금지).
* 로컬에서 같은 헤더로 확인: scratchpad 헤더 서버로 `web/dist` 를 띄워 CSP 위반 0 · 콘솔 오류 0 · 외부 요청 0 확인.

빌드가 실패하면 Vercel 은 이전 성공 배포를 그대로 운영에 둔다. 동작 문제가 있으면 Deployments → 이전 배포 → **Instant Rollback**.

## 배포 후 확인

- [ ] 배포 주소에서 메뉴가 보이고 콘솔(F12)에 오류가 없다
- [ ] 네 가지 모드가 모두 시작된다 (3D 문 통과 포함)
- [ ] 폰에서 '출동!'을 누르면 가로 전환 안내가 동작한다

## 주의

* **비밀 정보는 절대 커밋하지 않습니다.** `key.txt`, `.env`는 `.gitignore`에 들어 있습니다
* 배포 주소는 누구나 열 수 있습니다. 게임은 개인정보를 수집하지 않으며, 진행 기록은 각 기기의 브라우저에만 저장됩니다

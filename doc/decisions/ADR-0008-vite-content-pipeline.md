# ADR-0008: Vite 빌드 · SQLite 콘텐츠 DB · 발음 자동 생성 · 스프라이트 그림 자리

* 날짜: 2026-10-17
* 상태: **브랜치 `feature/vite-pipeline` 에서 로컬 확인 중** (main · Vercel 설정은 아직 그대로)
* 이전 결정: [ADR-0001 웹 우선](ADR-0001-web-first.md) (빌드 도구 없이 시작, 필요해지면 도입)

## 배경

사용자: "고도화된 디자인과 문장 · 발음 등을 할 수 있을까", "SQLite 를 쓰는 부분이 괜찮아 보인다", 추천안 1~3 준비 요청.

* 문장이 늘면서(어구 24 · 문장 84) JS 파일에 데이터를 직접 쓰는 방식은 고치기 어렵고, 발음 파일을 매번 도구로 만들어야 했다
* 캐릭터 · 배경을 코드로만 그려 디자인을 높이는 데 한계가 있다 → 그림 파일을 받아 쓸 자리가 필요

## 결정

1. **Vite 빌드** — 기존 IIFE + 전역 `ARAH` 구조를 그대로 두고 `web/src/main.js` 가 예전 `<script>` 순서대로 import. Phaser 3.80.1 · Three 0.149.0 은 npm 으로(버전 동일), 엔진은 별도 묶음(캐시 효율)
2. **SQLite 콘텐츠 DB = 원본** (`content/arah-content.db`, 읽기 전용 배포)
   * 빌드 때 `npm run content` 가 규칙 검사 후 JSON 으로 변환 → 게임은 JSON 만 읽는다 (브라우저에 SQLite 엔진을 싣지 않아 가볍다)
   * `.db` 는 바이너리라 `npm run content:export` 로 `.sql` 문서를 함께 커밋 (변경 내용 diff · 복구용)
   * sql.js(WASM) 사용 — 네이티브 컴파일이 없어 Windows · Vercel · GitHub Actions 어디서나 같다
3. **발음 자동 생성** — `npm run audio` (Node 용 kokoro-js, 없는 파일만). GitHub Actions `content-audio` 가 DB 변경 push 때 자동 실행 · 커밋. 브라우저 생성 도구는 폐지(다듬기 규칙은 `tools/audio/wav.mjs` 하나)
4. **스프라이트 그림 자리** — 히어로마다 아틀라스(앞 8 · 뒤 8 자세). 게임은 아틀라스가 있으면 그것을, 없으면 코드 그림. 지금은 `npm run sprites` 가 코드 그림을 구운 임시본(`meta.source: "generated"`), 디자이너 그림은 `"art"` 로 표시해 보호
5. 무거운 도구 의존성(음성 모델 · 캔버스)은 `tools/audio`, `tools/sprites` 의 별도 package.json → 배포 빌드에는 vite · sql.js 만 설치

## 결과 · 남은 일

* 콘텐츠를 표(DB Browser 등)로 편집하고, push 만으로 발음까지 갖춰진다
* 그림을 바꾸려면 PNG 만 교체하면 된다 (프레임 이름 · 크기 규칙: `web/public/assets/sprites/README.md`)
* **main 에 합치려면 Vercel 설정 변경 필요:** Root Directory `web` → 저장소 루트, Framework Vite, Build `npm run build`, Output `dist` ([deploy-vercel.md](../guides/deploy-vercel.md))
* 남은 일: 3D 문 통과 화면은 아직 코드 그림 (아틀라스 뒷모습 프레임 사용 예정), 스프라이트 고해상도(2배) 지원, 배경 그림 자리, 파일들을 ES 모듈 export/import 로 단계적 전환

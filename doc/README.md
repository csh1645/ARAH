# 문서 목차

| 분류 | 문서 | 내용 |
|---|---|---|
| 기획 | [planning/game-design.md](planning/game-design.md) | 게임 설계서(GDD): 콘셉트, 규칙, 히어로, 점수 |
| 기획 | [planning/roadmap.md](planning/roadmap.md) | MVP 범위와 이후 단계 |
| 콘텐츠 | [content/curriculum.md](content/curriculum.md) | 학년별 수학 · 영어 출제 범위 |
| 결정 | [decisions/ADR-0001-web-first.md](decisions/ADR-0001-web-first.md) | 웹 우선 개발 결정 |
| 결정 | [decisions/ADR-0002-original-characters.md](decisions/ADR-0002-original-characters.md) | 오리지널 캐릭터 사용 결정 |
| 결정 | [decisions/ADR-0003-game-mode-architecture.md](decisions/ADR-0003-game-mode-architecture.md) | 게임 모드 구조, 새 모드 추가 절차 |
| 결정 | [decisions/ADR-0004-pronunciation.md](decisions/ADR-0004-pronunciation.md) | 영어 발음 (미국 원어민 기준) 방안 |
| 결정 | [decisions/ADR-0005-threejs-3d.md](decisions/ADR-0005-threejs-3d.md) | Three.js 3D 적용 (규칙 · 화면 분리) |
| 가이드 | [guides/deploy-vercel.md](guides/deploy-vercel.md) | Vercel 배포 설정 |
| 품질 | [qa/test-report-2026-10-10.md](qa/test-report-2026-10-10.md) | 테스트 보고서 (세 모드 완주, 버그 3건 수정) |
| 표준 | [standards/coding-standards.md](standards/coding-standards.md) | 개발 표준: 구조, 이름, 주석, 보안, 변경 관리 |
| 가이드 | [guides/run-local.md](guides/run-local.md) | 로컬 실행 방법 |

## 문서 작성 규칙

* **위치:** 모든 문서는 `doc/` 아래 분류 폴더에 둡니다
  * `planning/` 기획 · 로드맵
  * `content/` 학습 콘텐츠 범위
  * `decisions/` 의사결정 기록(ADR)
  * `standards/` 개발 표준 · 규칙
  * `guides/` 실행 · 개발 · 운영 방법
  * `qa/` 테스트 보고서 (`test-report-YYYY-MM-DD.md`)
* **파일명:** 영문 소문자와 하이픈(`kebab-case`)을 씁니다. ADR은 `ADR-번호-제목.md` 형식을 씁니다
* **ADR(Architecture Decision Record):** 중요한 결정을 내릴 때마다 "배경 → 결정 → 결과"를 짧게 남겨, 나중에 왜 그렇게 했는지 추적할 수 있게 합니다
* 새 문서를 추가하면 이 목차에도 한 줄을 추가합니다

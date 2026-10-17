# 배포안 — 새 버전(Vite 브랜치) 검토용 배포 → 운영 전환

작성 2026-10-17 · 대상 브랜치 `feature/vite-pipeline` (로컬 worktree `ARAH-vite`)

## 결론

**지금 운영 중인 사이트(arah-web, `main`)는 그대로 둡니다.** 같은 GitHub 저장소에 Vercel 프로젝트를 **하나 더(검토용 `arah-review`)** 만들어 새 버전을 올리고, 검토하면서 고친 뒤 마지막에 운영으로 전환합니다.

| 단계 | 내용 | 누가 | 운영 사이트 영향 |
|---|---|---|---|
| 0. 준비 | 브랜치 정리 · 용량 줄이기 · 빌드 확인 · 커밋 | 에이전트 | 없음 |
| 1. 브랜치 올리기 | `feature/vite-pipeline` 을 GitHub 에 push (`main` 아님) | 에이전트 (승인 후) | 없음 |
| 2. 검토용 프로젝트 | Vercel 에서 새 프로젝트 만들기 (설정 5분) | **사용자** (계정 작업) | 없음 |
| 3. 검토 | 검토 주소에서 플레이 · 수정 · 다시 push 반복 | 함께 | 없음 |
| 4. 운영 전환 | `main` 에 합치기 + 기존 프로젝트 설정 3개 변경 | 함께 (승인 후) | **바뀜** |
| 5. 되돌리기 | 문제 있으면 Instant Rollback (1클릭) | 사용자 | 이전 상태로 |

## 왜 프로젝트를 하나 더 만드나

* Vercel 의 **Root Directory 는 프로젝트 단위 설정**이라 브랜치마다 다르게 못 합니다.
  * 지금 운영 프로젝트는 `web` 폴더를 그대로 공개하는 방식(빌드 없음)입니다.
  * 새 버전은 저장소 루트에서 `npm run build` 로 `dist/` 를 만들어야 합니다.
* 그래서 새 브랜치를 그냥 올리면 운영 프로젝트가 **옛 방식으로 미리보기를 만들어 깨진 화면**이 생깁니다.
* 검토용 프로젝트를 따로 두면 **운영 설정을 끝까지 안 건드리고** 검토할 수 있습니다.
* **저장 데이터도 분리됩니다.** 게임 진행은 브라우저 저장소(localStorage)에 주소별로 저장됩니다. 그래서 검토 주소에서 테스트해도 아이의 실제 기록(운영 주소)은 안전합니다.

## 0. 준비 (에이전트)

* [x] 운영 빌드 통과 확인 — `npm run build` 성공, 838개 파일 · 50.3MB (2026-10-17)
* [ ] **용량 줄이기** (50MB → 약 38MB 예상)
  * 3D 사람형 히어로 모델 6.9MB 제외 — 지금 꺼 둔 기능(`USE_HERO_3D = false`)이라 배포하지 않습니다. 파일과 만드는 도구는 저장소에 남깁니다.
  * 예전 Kenney 블록 캐릭터 0.1MB 삭제
  * 예전 히어로 스프라이트 4.9MB 삭제 후 새 그림 56명으로 다시 만들기 (`npm run sprites`)
  * 발음 파일 3목소리 × 231개(37MB, WAV)는 검토 뒤 목소리를 정하면 정리합니다
* [ ] 검토용 배포 설정 파일 2개 추가
  * 루트 `vercel.json` — 검토용 프로젝트가 읽습니다. Vite 빌드: `npm run build` → `dist`
  * `web/vercel.json` — 운영 프로젝트가 읽습니다. 이 브랜치의 미리보기를 끕니다 (`git.deploymentEnabled`)
* [ ] 비밀 값 검사 `git grep --cached -E "github_pat_|ghp_|AIza"` → 커밋 (로컬)

## 1. 브랜치 올리기 (에이전트, 사용자 승인 후)

* `feature/vite-pipeline` 브랜치만 push 합니다. **`main` 은 push 하지 않으므로 운영 사이트는 바뀌지 않습니다.**
* `web/vercel.json` 덕분에 운영 프로젝트는 이 브랜치를 배포하지 않습니다.

## 2. 검토용 Vercel 프로젝트 만들기 (사용자)

Vercel 대시보드 → **Add New → Project** → `csh1645/ARAH` 가져오기(Import):

| 항목 | 값 |
|---|---|
| Project Name | `arah-review` |
| Framework Preset | `Vite` (루트 `vercel.json` 이 있으면 자동) |
| **Root Directory** | **`./` (저장소 루트)** |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Environment Variables | 없음 |

만든 뒤 설정 두 가지를 바꿉니다.

1. **Settings → Environments → Production → Branch Tracking** 을 `feature/vite-pipeline` 으로 바꿉니다. 처음에는 `main` 을 배포하려다 실패하는데, 정상입니다. 바꾼 뒤 **Redeploy** 합니다.
2. **Settings → Deployment Protection → Vercel Authentication 켜기**
   * 이 버전은 마블 · DC · 산리오 **공식 이름**을 씁니다(가족 내부용). 그래서 검토 주소는 로그인한 사람만 보게 합니다.
   * Hobby 요금제에서 보호 범위(미리보기만인지, 프로덕션 주소까지인지)는 화면에서 확인이 필요합니다. 프로덕션 주소가 보호되지 않으면 **브랜치 미리보기 주소로만 검토**합니다.
   * 아이 태블릿에서 테스트하려면 그 기기에서 Vercel 로 로그인하거나, 공유 링크 기능을 씁니다. 공유 링크는 요금제별 지원 여부 확인이 필요합니다.

## 3. 검토 (함께)

검토 주소에서 확인 → 고칠 점 말씀 → 에이전트가 수정 · push → 자동 재배포를 반복합니다. 테스트 단계에서는 주소 끝에 `?allHeroes` 를 붙이면 56명을 모두 고를 수 있습니다(진행 기록에는 저장 안 됨).

* [ ] 로비: 히어로 56명 그림 · 이름 · 합류 순서 (원작과 다른 캐릭터 목록 받기)
* [ ] 놀이 7종 끝까지 완주 (드론 잡기 · 빌딩 스윙 · 문 통과 · 철자 잇기 · 짝꿍 찾기 · 보스 배틀 · 히어로 러너)
* [ ] 발음: 목소리 3종 비교 → 하나 또는 둘로 정하기 (용량 정리)
* [ ] 태블릿 · 폰 가로 화면, 소리, 첫 로딩 속도
* [ ] 결정 사항: 로비 화면(밝은 만화풍 / 예전 어두운 화면), 게임 배경(3D 도시 / 2D)
* [ ] 콘솔 오류 0

## 4. 운영 전환 (검토 완료 · 사용자 승인 후)

순서가 중요합니다. **설정을 먼저 바꾸고, 그다음 `main` 에 합칩니다.** 설정만 바꿔서는 다시 배포되지 않으므로 그 사이에 사이트가 깨지지 않습니다.

1. 운영 프로젝트(`arah-web`) → Settings → Build and Deployment
   * Framework Preset `Vite`, **Root Directory 비움(루트)**, Output Directory `dist`
   * 자세한 값: [deploy-vercel.md](deploy-vercel.md) "Vite 전환 후 설정"
2. 에이전트가 `feature/vite-pipeline` → `main` 합치기 · push → 자동 배포
3. 운영 주소에서 기존 저장 기록이 이어지는지 확인합니다.
   * 스타 · 단계 · 합류한 히어로를 봅니다.
   * 예전 히어로 id 는 새 id 로 자동으로 옮겨집니다 (`HERO_ID_MAP`).
4. 공식 이름이 들어가므로 운영 주소 공개 범위를 다시 정합니다. 보호 기능을 켤지, 주소를 가족에게만 알릴지 결정합니다.

## 5. 되돌리기

* **Vercel → Deployments → 이전 배포(`94c07db`) → Instant Rollback.** 1클릭이고 다시 빌드할 필요가 없습니다.
* 설정까지 되돌릴 때는 Root Directory `web`, Framework `Other`, Build · Output 비움으로 돌립니다.
* 검토용 프로젝트(`arah-review`)는 전환 뒤에도 다음 검토용으로 남겨 두거나 삭제합니다.

## 참고

* 새 버전 구조: [ADR-0008](../decisions/ADR-0008-vite-content-pipeline.md) (Vite · SQLite 콘텐츠 DB · 발음 생성)
* 아직 문서로 남기지 않은 결정은 검토 중에 ADR 로 정리합니다.
  * 히어로 개편: 영화 원조 히어로 + 산리오, 공식 이름, 한 명씩 합류
  * 2D 2등신 그림 유지
  * 3D 사람형 히어로 보류

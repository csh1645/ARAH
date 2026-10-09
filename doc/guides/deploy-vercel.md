# Vercel 배포 가이드

GitHub 저장소(`csh1645/ARAH`)의 `main` 브랜치에 push하면 Vercel이 자동으로 배포합니다.

## 최초 설정 (New Project)

| 항목 | 값 | 이유 |
|---|---|---|
| Application Preset | `Other` | 빌드 도구가 없는 순수 HTML 프로젝트 |
| **Root Directory** | **`web`** | 게임 파일은 `web/`에만 있습니다. `doc/`, `tools/`는 배포하지 않습니다 |
| Build Command | (비움) | 빌드 과정 없음 |
| Output Directory | (비움) | Root Directory(`web`)를 그대로 공개 |
| Install Command | (비움) | 설치할 패키지 없음 |
| Environment Variables | (없음) | 게임은 서버 비밀 값을 쓰지 않습니다 |

## 배포 후 확인

- [ ] 배포 주소에서 메뉴가 보이고 콘솔(F12)에 오류가 없다
- [ ] 네 가지 모드가 모두 시작된다 (3D 문 통과 포함)
- [ ] 폰에서 '출동!'을 누르면 가로 전환 안내가 동작한다

## 주의

* **비밀 정보는 절대 커밋하지 않습니다.** `key.txt`, `.env`는 `.gitignore`에 들어 있습니다
* 배포 주소는 누구나 열 수 있습니다. 게임은 개인정보를 수집하지 않으며, 진행 기록은 각 기기의 브라우저에만 저장됩니다

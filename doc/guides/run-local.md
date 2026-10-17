# 로컬 실행 가이드 (Vite)

2026-10-17 부터 Vite 로 실행 · 빌드합니다 ([ADR-0008](../decisions/ADR-0008-vite-content-pipeline.md)). **Node.js LTS** 가 필요합니다.

> **Windows PowerShell 에서 `npm : 이 시스템에서 스크립트를 실행할 수 없으므로 … npm.ps1 …` 오류가 나면**
> PowerShell 보안 정책이 `npm.ps1` 을 막는 것입니다. 정책은 바꾸지 말고 **`npm` 대신 `npm.cmd`** 를 쓰세요 (예: `npm.cmd run dev`).
> 명령은 **`ARAH-vite` 폴더**(package.json 이 있는 곳)에서 실행합니다. Node.js 를 막 설치했다면 터미널을 새로 엽니다.

## 처음 한 번

```bash
npm install
```

## 개발 서버

```bash
npm run dev
```

* PC 브라우저: `http://localhost:5173` — 코드를 고치면 바로 새로고침됩니다
* 같은 Wi-Fi 의 태블릿 · 폰: `npm run dev -- --host` 로 실행한 뒤 표시되는 `Network:` 주소로 접속 (Windows 방화벽에서 Node 허용이 필요할 수 있음)
* `npm run dev` 는 먼저 콘텐츠 DB 를 검사 · 변환합니다 (`npm run content`)

## 배포용 빌드 확인

```bash
npm run build
npm run preview
```

`dist/` 에 배포 파일이 만들어지고, `http://localhost:4173` 에서 실제 배포와 같은 결과를 볼 수 있습니다.

## 명령 모음

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 콘텐츠 변환 + 개발 서버 |
| `npm run build` | 콘텐츠 변환 + 배포 파일(`dist/`) |
| `npm run content` | `content/arah-content.db` → `web/src/data/generated/content.json` (규칙 검사 포함) |
| `npm run content:export` | DB → `content/arah-content.sql` (사람이 읽는 SQL, git 에서 변경 내용 확인용) |
| `npm run audio` | 발음 파일이 없는 단어 · 어구 · 문장만 생성 (처음 한 번 모델 약 86MB 내려받기) |
| `npm run sprites` | 히어로 스프라이트 아틀라스 굽기 (디자이너 그림은 건드리지 않음) |

## 콘텐츠(단어 · 문장) 고치기

1. [DB Browser for SQLite](https://sqlitebrowser.org/) 로 `content/arah-content.db` 를 연다
2. `words` · `phrases` · `sentences` 표에서 행을 추가 · 수정하고 저장 (규칙은 `content/schema.sql` 머리 주석)
3. `npm run content` 로 검사 → `npm run dev` 로 확인
4. 발음: `npm run audio` (또는 push 하면 GitHub Actions 가 자동 생성)
5. `npm run content:export` 후 `.db` 와 `.sql` 을 함께 커밋

## 저장 데이터 초기화

모은 별과 설정은 브라우저 localStorage 에 `arah.` 접두어로 저장됩니다.
초기화하려면 개발자 도구(F12) → Application → Local Storage 에서 `arah.` 로 시작하는 항목을 지웁니다.
(개발 서버 주소 `localhost:5173` 은 다른 주소와 저장소가 따로라 기록이 섞이지 않습니다. 배포 주소는 같으므로 배포본의 기록은 그대로)

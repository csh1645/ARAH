# 발음 파일 (단어 · 어구 · 문장)

이 폴더의 `.wav` 파일은 게임에서 **기기와 상관없이 같은 미국 원어민 발음**을 들려주는 데 씁니다.

* **대상:** 콘텐츠 DB(`content/arah-content.db`)의 단어 · 어구 · 문장 전부
* **파일 이름:** 글자를 소문자 · 하이픈으로 바꾼 이름 — `apple.wav`, `a-red-apple.wav`, `i-am-happy.wav`, `don-t-run-in-the-hall.wav`
* **출처:** Kokoro-82M (kokoro-js 1.2.0), 음성 `af_heart`, 속도 0.9 — 가중치 라이선스 Apache-2.0
* **형식:** 24kHz 모노 16비트 WAV, 앞뒤 무음 제거 · 음량 정규화 · 앞뒤 12ms 페이드 · 끝 0.15초 여유 (규칙: `tools/audio/wav.mjs`)
* **목록:** `web/src/data/audio-manifest.json` (생성기가 자동 갱신, 직접 고치지 않음). 키는 소문자 원문 (예: `"i am happy."`)

## 단어 · 문장을 추가했을 때

* **자동:** 콘텐츠 DB 를 고쳐 `main` 에 push 하면 GitHub Actions(`content-audio`)가 새 발음 파일을 만들어 커밋합니다
* **로컬:** `npm run audio` — 파일이 없는 것만 만듭니다 (처음 한 번 모델 약 86MB 내려받기)
  * `npm run audio -- --all` 모두 다시 만들기 / `-- --limit 5` 시험으로 5개만

파일이 없는 글은 게임에서 기기 음성 합성으로 대신 읽습니다 (기기마다 소리가 달라 부자연스러울 수 있음).

결정 배경: [ADR-0004](../../../../doc/decisions/ADR-0004-pronunciation.md), [ADR-0008](../../../../doc/decisions/ADR-0008-vite-content-pipeline.md)

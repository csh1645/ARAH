# 발음 파일 (단어 · 어구 · 문장)

이 폴더의 `.wav` 파일은 게임에서 **기기와 상관없이 같은 미국 원어민 발음**을 들려주는 데 씁니다.

* **대상:** 단어(`web/src/data/words.js`) · 어구 · 문장(`web/src/data/sentences.js`)
* **파일 이름:** 글자를 소문자 · 하이픈으로 바꾼 이름 — `apple.wav`, `a-red-apple.wav`, `i-am-happy.wav`, `don-t-run-in-the-hall.wav`
* **출처:** Kokoro-82M (kokoro-js 1.2.0), 음성 `af_heart`, 속도 0.9 — 가중치 라이선스 Apache-2.0
* **형식:** 24kHz 모노 16비트 WAV, 앞뒤 무음 제거 · 음량 정규화 · 앞뒤 12ms 페이드 · 끝 0.15초 여유 (끝소리가 툭 끊기거나 "틱" 잡음이 나지 않게, 2026-10-17)
* **목록:** `web/src/data/audio-manifest.js` (생성 도구가 자동 갱신, 직접 고치지 않음). 키는 소문자 원문 (예: `"i am happy."`)

## 단어 · 문장을 추가했을 때

1. `words.js` 또는 `sentences.js`에 추가
2. 프로젝트 루트에서 `python tools/audio/collect_server.py` 실행
3. 브라우저(Chrome · Edge)에서 `http://127.0.0.1:8124/tools/audio/kokoro-generate.html` → **[생성 시작]**
   * "이미 있는 파일은 건너뛰기"가 켜져 있으면 **새 것만** 만듭니다
   * 처음 한 번은 모델(약 86MB)을 내려받습니다
4. 표의 ▶ 버튼으로 들어 보고 커밋 · push

파일이 없는 글은 게임에서 기기 음성 합성으로 대신 읽습니다 (기기마다 소리가 달라 부자연스러울 수 있음).
대안 도구: `tools/audio/generate_word_audio.py` (Google Cloud TTS, API 키 필요)

결정 배경: [ADR-0004](../../../../doc/decisions/ADR-0004-pronunciation.md)

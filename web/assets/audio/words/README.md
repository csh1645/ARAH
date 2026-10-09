# 단어 발음 파일

이 폴더의 `<단어>.wav` 파일은 게임에서 **기기와 상관없이 같은 미국 원어민 발음**을 들려주는 데 씁니다.

* **출처:** Kokoro-82M (kokoro-js 1.2.0), 음성 `af_heart`, 속도 0.9 — 가중치 라이선스 Apache-2.0
* **형식:** 24kHz 모노 16비트 WAV, 앞뒤 무음 제거 · 음량 정규화
* **목록:** `web/src/data/audio-manifest.js` (생성 도구가 자동 갱신, 직접 고치지 않음)

## 단어를 추가했을 때

1. `web/src/data/words.js`에 단어 추가
2. 프로젝트 루트에서 `python tools/audio/collect_server.py` 실행
3. 브라우저(Chrome · Edge)에서 `http://127.0.0.1:8124/tools/audio/kokoro-generate.html` → **[생성 시작]**
   * "이미 있는 파일은 건너뛰기"가 켜져 있으면 **새 단어만** 만듭니다
   * 처음 한 번은 모델(약 86MB)을 내려받습니다
4. 표의 ▶ 버튼으로 들어 보고 커밋 · push

파일이 없는 단어는 게임에서 기기 음성 합성으로 대신 읽습니다.
대안 도구: `tools/audio/generate_word_audio.py` (Google Cloud TTS, API 키 필요)

결정 배경: [ADR-0004](../../../../doc/decisions/ADR-0004-pronunciation.md)

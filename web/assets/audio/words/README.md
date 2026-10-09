# 단어 발음 파일

이 폴더의 `<단어>.mp3` 파일은 게임에서 **기기와 상관없이 같은 미국 원어민 발음**을 들려주는 데 씁니다.

* 만들기: `tools/audio/generate_word_audio.py` (사용법은 파일 맨 위 설명 참고)
* 목록: `web/src/data/audio-manifest.js` (스크립트가 자동 갱신)
* 파일이 없는 단어는 기기 음성 합성으로 대신 읽습니다
* 출처와 라이선스: `audio-manifest.js`의 `WORD_AUDIO_SOURCE`에 기록합니다. 다른 출처(직접 녹음, 위키미디어 등)의 파일을 넣을 때는 그 라이선스 조건(저작자 표시 등)을 이 문서에 적습니다

결정 배경: [ADR-0004](../../../../doc/decisions/ADR-0004-pronunciation.md)

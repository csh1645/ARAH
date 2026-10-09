"""
단어별 미국 원어민 발음 파일(mp3)을 만든다.

- 단어 목록: web/src/data/words.js 의 en 값
- 출력: web/assets/audio/words/<단어>.mp3 + web/src/data/audio-manifest.js (자동 갱신)
- 음성: Google Cloud Text-to-Speech, 미국 영어 신경망 음성 (기본 en-US-Neural2-F)

사용법 (프로젝트 루트에서):
    # API 키는 환경 변수로만 전달한다. 코드나 파일에 키를 적지 않는다.
    $env:GOOGLE_TTS_API_KEY = "<키>"          # PowerShell
    python tools/audio/generate_word_audio.py

    python tools/audio/generate_word_audio.py --voice en-US-Neural2-J --rate 0.9 --force

필요한 것: Python 3.8+ (표준 라이브러리만 사용), Google Cloud 프로젝트의 Text-to-Speech API 키.
관련 문서: doc/decisions/ADR-0004-pronunciation.md
"""

import argparse
import base64
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORDS_JS = ROOT / "web" / "src" / "data" / "words.js"
OUT_DIR = ROOT / "web" / "assets" / "audio" / "words"
MANIFEST_JS = ROOT / "web" / "src" / "data" / "audio-manifest.js"
API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"

MANIFEST_TEMPLATE = """/**
 * @file 단어별 원어민 발음 파일 목록. tools/audio/generate_word_audio.py 가 자동으로 다시 쓴다 (직접 고치지 않는다).
 * @layer data
 * @depends 없음
 * @see doc/decisions/ADR-0004-pronunciation.md, web/assets/audio/words/README.md
 *
 * 여기에 있는 단어는 web/assets/audio/words/<파일> 을 재생하고, 없는 단어는 기기 음성 합성(TTS)으로 대신 읽는다.
 */
(function (A) {{
  'use strict';

  /** 발음 파일 출처 (라이선스 · 표기 확인용) */
  A.WORD_AUDIO_SOURCE = {source};

  /** @type {{Object<string, string>}} 영어 단어(소문자) → 파일 이름 */
  A.WORD_AUDIO = {mapping};
}})(window.ARAH);
"""


def read_words():
    """words.js 에서 en: '단어' 값을 순서대로 읽는다."""
    text = WORDS_JS.read_text(encoding="utf-8")
    # words.js 는 분류별 ['apple', '사과', '🍎', 1] 묶음 형식
    words = re.findall(r"\[\s*'([a-z]+)'\s*,", text)
    if not words:
        sys.exit(f"단어를 찾지 못했습니다: {WORDS_JS}")
    return words


def synthesize(word, api_key, voice, rate):
    """Google Cloud TTS 로 단어 하나를 mp3 바이트로 만든다."""
    body = {
        "input": {"text": word},
        "voice": {"languageCode": "en-US", "name": voice},
        "audioConfig": {"audioEncoding": "MP3", "speakingRate": rate},
    }
    req = urllib.request.Request(
        f"{API_URL}?key={api_key}",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        payload = json.loads(res.read().decode("utf-8"))
    return base64.b64decode(payload["audioContent"])


def write_manifest(files, voice):
    mapping = json.dumps(files, ensure_ascii=False, indent=4).replace("\n}", "\n  }")
    source = json.dumps(f"Google Cloud Text-to-Speech ({voice})", ensure_ascii=False)
    MANIFEST_JS.write_text(MANIFEST_TEMPLATE.format(source=source, mapping=mapping), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="단어별 미국 원어민 발음 mp3 생성")
    parser.add_argument("--voice", default="en-US-Neural2-F", help="Google TTS 음성 이름 (기본: en-US-Neural2-F)")
    parser.add_argument("--rate", type=float, default=0.9, help="말하기 속도 (기본 0.9, 저학년용으로 조금 느리게)")
    parser.add_argument("--force", action="store_true", help="이미 있는 파일도 다시 만든다")
    args = parser.parse_args()

    api_key = os.environ.get("GOOGLE_TTS_API_KEY")
    if not api_key:
        sys.exit("환경 변수 GOOGLE_TTS_API_KEY 가 없습니다. (키는 코드나 파일에 적지 마세요)")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    files = {}
    for word in read_words():
        out = OUT_DIR / f"{word}.mp3"
        if out.exists() and not args.force:
            print(f"  건너뜀 (이미 있음): {out.name}")
        else:
            try:
                out.write_bytes(synthesize(word, api_key, args.voice, args.rate))
                print(f"  생성: {out.name}")
            except urllib.error.HTTPError as e:
                # 응답 본문에는 키가 들어 있지 않지만, 요청 URL(키 포함)은 출력하지 않는다
                sys.exit(f"API 오류 ({word}): HTTP {e.code} {e.reason}")
        files[word] = out.name

    write_manifest(files, args.voice)
    print(f"완료: {len(files)}개 → {OUT_DIR.relative_to(ROOT)}, 목록 갱신: {MANIFEST_JS.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

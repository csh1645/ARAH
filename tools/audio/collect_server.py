"""
발음 파일 생성용 로컬 서버.

- 프로젝트 루트를 정적 파일로 제공한다 (생성 페이지가 web/src/data/words.js 를 읽을 수 있게)
- 생성 페이지(tools/audio/kokoro-generate.html)가 보낸 wav 를 web/assets/audio/words/ 에 저장한다
- 끝나면 web/src/data/audio-manifest.js 를 다시 쓴다

사용법 (프로젝트 루트에서):
    python tools/audio/collect_server.py
    → 브라우저에서 http://127.0.0.1:8124/tools/audio/kokoro-generate.html 열기

보안: 127.0.0.1 에서만 열리고, 저장은 "영문 소문자.wav" 이름만 허용한다 (경로 조작 차단).
관련 문서: doc/decisions/ADR-0004-pronunciation.md
"""

import json
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "web" / "assets" / "audio" / "words"
MANIFEST_JS = ROOT / "web" / "src" / "data" / "audio-manifest.js"
HOST, PORT = "127.0.0.1", 8124
MAX_WAV_BYTES = 2 * 1024 * 1024  # 단어 하나에 2MB 를 넘을 일은 없다
NAME_RE = re.compile(r"^[a-z]{1,20}\.wav$")

MANIFEST_TEMPLATE = """/**
 * @file 단어별 원어민 발음 파일 목록. 발음 생성 도구가 자동으로 다시 쓴다 (직접 고치지 않는다).
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


class Handler(SimpleHTTPRequestHandler):
    def _reply(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self, limit):
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > limit:
            return None
        return self.rfile.read(length)

    def do_POST(self):
        url = urlparse(self.path)
        if url.path == "/save":
            name = (parse_qs(url.query).get("name") or [""])[0]
            if not NAME_RE.match(name):
                return self._reply(400, {"error": "invalid name"})
            data = self._read_body(MAX_WAV_BYTES)
            if not data or data[:4] != b"RIFF" or data[8:12] != b"WAVE":
                return self._reply(400, {"error": "not a wav file"})
            OUT_DIR.mkdir(parents=True, exist_ok=True)
            (OUT_DIR / name).write_bytes(data)
            return self._reply(200, {"saved": name, "bytes": len(data)})

        if url.path == "/manifest":
            data = self._read_body(64 * 1024)
            try:
                payload = json.loads(data.decode("utf-8"))
                files = {w: f for w, f in payload["files"].items() if re.match(r"^[a-z]+$", w) and NAME_RE.match(f)}
                source = str(payload.get("source", ""))[:200]
            except Exception:
                return self._reply(400, {"error": "invalid manifest"})
            missing = [f for f in files.values() if not (OUT_DIR / f).exists()]
            if missing:
                return self._reply(400, {"error": "missing files", "files": missing})
            mapping = json.dumps(files, ensure_ascii=False, indent=4).replace("\n}", "\n  }")
            MANIFEST_JS.write_text(
                MANIFEST_TEMPLATE.format(source=json.dumps(source, ensure_ascii=False), mapping=mapping),
                encoding="utf-8",
            )
            return self._reply(200, {"manifest": str(MANIFEST_JS.relative_to(ROOT)), "count": len(files)})

        return self._reply(404, {"error": "not found"})

    def log_message(self, fmt, *args):
        # 정적 파일 요청은 조용히, 저장 요청만 출력
        if "POST" in (fmt % args):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), partial(Handler, directory=str(ROOT)))
    print(f"발음 생성 서버: http://{HOST}:{PORT}/tools/audio/kokoro-generate.html")
    server.serve_forever()

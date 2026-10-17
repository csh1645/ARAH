-- 히어로 대작전 콘텐츠 DB (읽기 전용으로 배포 — 게임은 빌드 때 만든 JSON 을 읽는다)
-- 편집: DB Browser for SQLite 등으로 content/arah-content.db 를 열어 행을 추가 · 수정
-- 빌드: npm run content  →  web/src/data/generated/content.json
-- 규칙 (빌드가 검사한다):
--   words:     en 은 영문 소문자만, ko · emoji 는 서로 겹치지 않게 (그림 · 뜻 보기의 정답이 하나여야 함)
--   sentences: blank 는 en 안에 정확히 한 번 나오는 단어, wrong1~3 은 blank 와 다르고 서로 다르게
-- @see doc/decisions/ADR-0008-vite-content-pipeline.md, doc/content/curriculum.md

CREATE TABLE IF NOT EXISTS words (
  en    TEXT PRIMARY KEY,           -- 영어 단어 (소문자)
  ko    TEXT NOT NULL UNIQUE,       -- 한글 뜻
  emoji TEXT NOT NULL UNIQUE,       -- 그림 대신 쓰는 이모지
  cat   TEXT NOT NULL,              -- 분류 (같은 분류 단어를 오답 보기로 쓴다)
  lv    INTEGER NOT NULL CHECK (lv BETWEEN 1 AND 3), -- 단어 난이도
  sort  INTEGER NOT NULL DEFAULT 0  -- 표시 순서
);

CREATE TABLE IF NOT EXISTS phrases (  -- 영어 5단계 어구
  en    TEXT PRIMARY KEY,
  ko    TEXT NOT NULL,
  emoji TEXT NOT NULL,
  sort  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sentences ( -- 영어 6~12단계 문장 빈칸
  en     TEXT PRIMARY KEY,
  ko     TEXT NOT NULL,
  lv     INTEGER NOT NULL CHECK (lv BETWEEN 6 AND 12),
  blank  TEXT NOT NULL,
  wrong1 TEXT NOT NULL,
  wrong2 TEXT NOT NULL,
  wrong3 TEXT NOT NULL,
  tag    TEXT NOT NULL,              -- 문법 이름 (be동사, 현재완료 …)
  sort   INTEGER NOT NULL DEFAULT 0
);

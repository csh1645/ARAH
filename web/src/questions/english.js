/**
 * @file 영어 단어 문제 생성기 (엔진 독립). 1~6단계.
 *       유형: 그림→단어, 뜻→단어, 빈칸 철자, 듣고 고르기, 단어→그림(문 통과), 철자 잇기(철자 잇기 모드)
 * @layer questions
 * @depends A.util, A.RULES, A.WORDS
 * @see doc/content/curriculum.md (영어)
 */
(function (A) {
  'use strict';

  const { rand, pick, shuffle } = A.util;

  // 빈칸 철자 오답은 정답과 같은 종류(모음/자음)에서 골라야 소리로 구별하는 연습이 된다.
  const VOWELS = 'aeiou';
  const CONSONANTS = 'bcdfghklmnprstw';

  /**
   * 단계별 출제 설정
   * - maxLv: 쓸 단어 난이도 상한 (Word.lv)
   * - kinds: 이 단계에서 고르는 문제 유형 (같은 확률)
   * - koHint: 그림 보기 문제에 한글 뜻 힌트를 함께 보여 줄지
   */
  const LEVELS = {
    1: { maxLv: 1, kinds: ['emoji'], koHint: true },
    2: { maxLv: 1, kinds: ['emoji', 'ko'], koHint: true },
    3: { maxLv: 2, kinds: ['emoji', 'ko'], koHint: false },
    4: { maxLv: 2, kinds: ['ko', 'blank'], koHint: false },
    5: { maxLv: 3, kinds: ['ko', 'blank', 'listen'], koHint: false },
    6: { maxLv: 3, kinds: ['listen', 'blank', 'ko'], koHint: false },
  };

  /** 철자 잇기: 단계별 단어 최대 길이와 방해 글자 수 */
  const SPELL_RULES = {
    1: { maxLen: 3, decoys: 0 },
    2: { maxLen: 4, decoys: 0 },
    3: { maxLen: 5, decoys: 1 },
    4: { maxLen: 6, decoys: 1 },
    5: { maxLen: 8, decoys: 2 },
    6: { maxLen: 99, decoys: 3 },
  };

  const poolFor = (level) => A.WORDS.filter((w) => w.lv <= LEVELS[level].maxLv);

  /**
   * 오답 단어를 고른다. 같은 분류(과일, 동물 등)를 우선 써서 대충 찍기 어렵게 한다.
   * 뜻(ko) · 그림(emoji)이 같은 단어는 정답이 두 개가 되므로 뺀다.
   * @param {Word} word 정답 단어
   * @param {number} count
   * @param {Word[]} pool 고를 수 있는 단어
   * @returns {Word[]}
   */
  function wrongWords(word, count, pool) {
    const ok = (w) => w !== word && w.ko !== word.ko && w.emoji !== word.emoji && w.en !== word.en;
    const same = shuffle(pool.filter((w) => ok(w) && w.cat === word.cat));
    const other = shuffle(A.WORDS.filter((w) => ok(w) && w.cat !== word.cat));
    return [...same, ...other].slice(0, count);
  }

  /** 공통 형식으로 묶는다 */
  function base(word, extra) {
    return { subject: 'eng', review: `${word.emoji} ${word.en} (${word.ko})`, speak: word.en, ...extra };
  }

  /**
   * 단서(그림 · 뜻 · 소리)를 보고 영어 단어를 고르는 문제.
   * @param {Word} word
   * @param {'emoji'|'ko'|'listen'} mode
   * @param {number} n 보기 개수
   * @param {Word[]} pool
   * @param {boolean} koHint
   * @returns {Question}
   */
  function chooseWord(word, mode, n, pool, koHint) {
    const choices = shuffle([word, ...wrongWords(word, n - 1, pool)]).map((w) => w.en);
    const prompts = {
      emoji: koHint ? `${word.emoji}  ${word.ko}  →  ?` : `${word.emoji}  →  ?`,
      ko: `"${word.ko}"  →  ?`,
      listen: '🔊  →  ?',
    };
    const hints = {
      emoji: '그림에 맞는 영어 단어를 잡아요',
      ko: '뜻에 맞는 영어 단어를 잡아요',
      listen: '잘 듣고 들린 단어를 잡아요 (문제를 누르면 다시 들려요)',
    };
    return base(word, {
      key: `${mode}:${word.en}`,
      prompt: prompts[mode],
      hint: hints[mode],
      answer: word.en,
      choices,
      speakOnStart: mode === 'listen', // 듣기 문제는 시작할 때 소리를 들려준다
    });
  }

  /**
   * 단어의 글자 하나를 빈칸으로 만들고 들어갈 알파벳을 고르는 문제 (예: ap_le → p).
   * 오답 글자를 넣었을 때 다른 실제 단어가 되면(예: c_t 에 u → cut) 정답이 두 개가 되므로 그런 글자는 뺀다.
   * @param {Word} word
   * @param {number} n
   * @returns {Question}
   */
  function blank(word, n) {
    const idx = rand(0, word.en.length - 1);
    const letter = word.en[idx];
    const pool = VOWELS.includes(letter) ? VOWELS : CONSONANTS;
    const allWords = new Set(A.WORDS.map((w) => w.en));
    const makes = (c) => allWords.has(word.en.slice(0, idx) + c + word.en.slice(idx + 1));
    const wrong = new Set();
    let guard = 0;
    while (wrong.size < n - 1 && guard++ < 200) {
      const c = pick(pool.split(''));
      if (c !== letter && !makes(c)) wrong.add(c);
    }
    const masked = word.en.slice(0, idx) + '_' + word.en.slice(idx + 1);
    return base(word, {
      key: `spell:${word.en}:${idx}`,
      prompt: `${word.emoji}  ${masked}`,
      hint: '빈칸에 들어갈 알파벳을 잡아요',
      answer: letter,
      choices: shuffle([letter, ...wrong]),
    });
  }

  /**
   * 영어 단어를 보고(듣고) 알맞은 그림을 고르는 문제. 보기가 이모지 그림이다.
   * @param {Word} word
   * @param {number} n
   * @param {Word[]} pool
   * @param {boolean} koHint 한글 뜻 힌트 표시
   * @returns {Question}
   */
  function choosePicture(word, n, pool, koHint) {
    const choices = shuffle([word, ...wrongWords(word, n - 1, pool)]).map((w) => w.emoji);
    return base(word, {
      key: `pic:${word.en}`,
      prompt: `🔊 ${word.en}`,
      hint: koHint ? `"${word.ko}" 그림이 있는 문으로 달려가요` : '단어에 맞는 그림 문으로 달려가요',
      answer: word.emoji,
      choices,
      pictureChoices: true,
    });
  }

  /**
   * 철자 잇기 문제: 단어의 알파벳을 섞어 주고 순서대로 고르게 한다.
   * choices 에 같은 글자가 여러 번 들어갈 수 있다 (예: apple 의 p 두 개) — 철자 잇기 모드만 쓰는 형식.
   * @param {1|2|3|4|5|6} level
   * @returns {Question}
   */
  function spellOrder(level) {
    const rule = SPELL_RULES[level];
    const word = pick(A.WORDS.filter((w) => w.en.length <= rule.maxLen));
    const extra = [];
    while (extra.length < rule.decoys) {
      // 방해 글자는 단어에 없는 글자로만 고른다 (있는 글자면 정답이 헷갈림)
      const c = pick('abcdefghijklmnoprstuwy'.split(''));
      if (!word.en.includes(c) && !extra.includes(c)) extra.push(c);
    }
    return base(word, {
      key: `order:${word.en}`,
      prompt: `${word.emoji}  🔊`,
      hint: level <= 2 ? `"${word.ko}" 철자를 순서대로 잡아요` : '철자를 순서대로 잡아요',
      answer: word.en,
      choices: shuffle([...word.en.split(''), ...extra]),
      decoys: extra,
      spelling: true,
    });
  }

  A.English = {
    /**
     * 단계에 맞는 영어 문제 하나를 만든다.
     * @param {1|2|3|4|5|6} level
     * @param {QuestionOptions} [options] pictureChoices: 단어→그림 / spelling: 철자 잇기
     * @returns {Question}
     */
    make(level, options = {}) {
      if (options.spelling) return spellOrder(level);
      const n = A.RULES.choicesByLevel[level];
      const cfg = LEVELS[level];
      const pool = poolFor(level);
      const word = pick(pool);
      if (options.pictureChoices) return choosePicture(word, n, pool, cfg.koHint);
      const kind = pick(cfg.kinds);
      if (kind === 'blank') return blank(word, n);
      return chooseWord(word, kind, n, pool, cfg.koHint);
    },
  };
})(window.ARAH);

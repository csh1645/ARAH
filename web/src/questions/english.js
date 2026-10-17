/**
 * @file 영어 문제 생성기 (엔진 독립). 1~12단계 = 초1 ~ 중3.
 *       1~4 단어 (그림→단어, 뜻→단어, 빈칸 철자, 듣고 고르기, 단어→그림)
 *       5   어구 (a red apple, two cats — 뜻 · 그림 → 어구)
 *       6~12 문장 빈칸 (be동사 → 일반동사 → 과거 · 진행 → 조동사 · 비교 → 현재완료 · 동명사 → 수동태 · 관계대명사)
 *       철자 잇기 모드: 1~4 알파벳 순서, 5~ 단어 블록으로 문장 만들기 (방해 블록 = 그 문법의 헷갈리는 형태)
 * @layer questions
 * @depends A.util, A.RULES, A.WORDS, A.PHRASES, A.SENTENCES
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
    2: { maxLv: 2, kinds: ['emoji', 'ko'], koHint: false },
    3: { maxLv: 2, kinds: ['ko', 'blank'], koHint: false },
    4: { maxLv: 3, kinds: ['ko', 'blank', 'listen'], koHint: false },
    5: { maxLv: 3, kinds: ['phrase', 'phraseEmoji', 'listen'], koHint: false },
    // 6~12: 문장 빈칸. listenFill = 문장을 듣고 빈칸 단어 고르기
    6: { kinds: ['fill'] },
    7: { kinds: ['fill', 'fill', 'listenFill'] },
    8: { kinds: ['fill', 'fill', 'listenFill'] },
    9: { kinds: ['fill', 'fill', 'listenFill'] },
    10: { kinds: ['fill', 'fill', 'listenFill'] },
    11: { kinds: ['fill', 'fill', 'listenFill'] },
    12: { kinds: ['fill', 'fill', 'listenFill'] },
  };
  /** 문장 단계에서 아래 단계 문장을 섞어 낼 확률 (배운 문법을 다시 만나게) */
  const SENTENCE_REVIEW_RATE = 0.3;

  /**
   * 철자 잇기: 1~4 는 알파벳 (단어 최대 길이 · 방해 글자 수),
   * 5~ 는 단어 블록 문장 만들기 (최대 단어 수 · 방해 블록 수)
   */
  const SPELL_RULES = {
    1: { maxLen: 4, decoys: 0 },
    2: { maxLen: 5, decoys: 1 },
    3: { maxLen: 6, decoys: 1 },
    4: { maxLen: 99, decoys: 2 },
    5: { words: true, maxWords: 4, decoys: 0 },
    6: { words: true, maxWords: 5, decoys: 1 },
    7: { words: true, maxWords: 6, decoys: 1 },
    8: { words: true, maxWords: 6, decoys: 1 },
    9: { words: true, maxWords: 7, decoys: 2 },
    10: { words: true, maxWords: 7, decoys: 2 },
    11: { words: true, maxWords: 7, decoys: 2 },
    12: { words: true, maxWords: 7, decoys: 2 },
  };

  const poolFor = (level) => A.WORDS.filter((w) => w.lv <= (LEVELS[level].maxLv || 3));

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

  // ---------- 어구 · 문장 (5~12단계) ----------

  /** 어구 오답: 같은 단어를 함께 쓰는 어구를 우선 (red apple ↔ red flowers), an 어구는 "a ~" 실수도 */
  function choosePhrase(ph, mode, n) {
    const words = new Set(ph.en.split(' '));
    const shared = (o) => o.en.split(' ').filter((w) => words.has(w) && w !== 'a').length;
    const others = shuffle(A.PHRASES.filter((o) => o !== ph && o.ko !== ph.ko)).sort((x, y) => shared(y) - shared(x));
    const wrong = others.map((o) => o.en);
    if (ph.en.startsWith('an ')) wrong.unshift(`a ${ph.en.slice(3)}`); // an orange → a orange (관사 실수)
    const choices = shuffle([ph.en, ...wrong.slice(0, n - 1)]);
    return {
      subject: 'eng',
      key: `${mode}:${ph.en}`,
      prompt: mode === 'phrase' ? `"${ph.ko}"  →  ?` : `${ph.emoji}  →  ?`,
      hint: mode === 'phrase' ? '뜻에 맞는 영어를 잡아요' : '그림에 맞는 영어를 잡아요',
      answer: ph.en,
      choices,
      review: `${ph.emoji} ${ph.en} (${ph.ko})`,
      speak: ph.en,
    };
  }

  /** 문장 단어 목록 (끝의 문장부호는 떼어 낸다). 철자 잇기 블록 · 빈칸 만들기에 쓴다 */
  const tokensOf = (en) => en.replace(/[.?!]$/, '').split(' ').map((t) => t.replace(/,$/, ''));

  /** 빈칸 단어를 ___ 로 바꾼 문장 (쉼표 · 문장부호는 그대로) */
  function maskSentence(st) {
    return st.en.split(' ').map((t) => (t.replace(/[.,?!]$/, '') === st.blank ? t.replace(st.blank, '___') : t)).join(' ');
  }

  /** 단계에 맞는 문장 하나 (가끔 아래 단계 문장으로 복습) */
  function pickSentence(level, maxWords = 99) {
    const fits = (st) => tokensOf(st.en).length <= maxWords;
    const now = A.SENTENCES.filter((st) => st.lv === level && fits(st));
    const below = A.SENTENCES.filter((st) => st.lv < level && fits(st));
    return pick(below.length && (Math.random() < SENTENCE_REVIEW_RATE || !now.length) ? below : now);
  }

  /** 문장 빈칸 문제. listen 이면 문장을 먼저 들려주고 들린 단어를 고른다 */
  function fillSentence(st, n, listen) {
    return {
      subject: 'eng',
      key: `${listen ? 'hear' : 'fill'}:${st.en}`,
      prompt: `${listen ? '🔊 ' : ''}${maskSentence(st)}`,
      hint: listen ? '잘 듣고 빈칸 단어를 잡아요 (문제를 누르면 다시 들려요)' : `"${st.ko}"  ·  빈칸에 알맞은 말을 잡아요`,
      answer: st.blank,
      choices: shuffle([st.blank, ...shuffle(st.wrong).slice(0, n - 1)]),
      review: `${st.en} (${st.ko})  · ${st.tag}`,
      speak: st.en,
      speakOnStart: listen,
    };
  }

  /**
   * 문장 만들기 (철자 잇기 5단계~): 단어 블록을 순서대로 골라 문장을 완성한다.
   * 방해 블록은 그 문장의 빈칸 오답(헷갈리는 문법 형태)이라, 고르면서 문법을 연습하게 된다.
   */
  function wordOrder(level) {
    const rule = SPELL_RULES[level];
    const item = level === 5 ? pick(A.PHRASES) : pickSentence(level, rule.maxWords);
    const tokens = tokensOf(item.en);
    const decoys = level === 5 ? [] : shuffle(item.wrong.filter((w) => !tokens.includes(w) && !w.includes(' '))).slice(0, rule.decoys);
    return {
      subject: 'eng',
      key: `words:${item.en}`,
      prompt: level === 5 ? `${item.emoji}  🔊` : `"${item.ko}"  🔊`,
      hint: '단어를 순서대로 잡아 문장을 만들어요',
      answer: tokens.join(' '),
      tokens,
      choices: shuffle([...tokens, ...decoys]),
      decoys,
      spelling: true,
      review: `${item.en} (${item.ko})`,
      speak: item.en,
    };
  }

  /**
   * 철자 잇기 문제: 단어의 알파벳을 섞어 주고 순서대로 고르게 한다.
   * choices 에 같은 글자가 여러 번 들어갈 수 있다 (예: apple 의 p 두 개) — 철자 잇기 모드만 쓰는 형식.
   * @param {1|2|3|4|5|6} level
   * @returns {Question}
   */
  function spellOrder(level) {
    const rule = SPELL_RULES[level];
    if (rule.words) return wordOrder(level);
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
      hint: level <= 1 ? `"${word.ko}" 철자를 순서대로 잡아요` : '철자를 순서대로 잡아요',
      answer: word.en,
      choices: shuffle([...word.en.split(''), ...extra]),
      decoys: extra,
      spelling: true,
    });
  }

  A.English = {
    /**
     * 철자 잇기가 이 단계에서 단어 블록(문장 만들기)을 쓰는지. 철자 잇기 화면이 안내 문구 · 블록 모양을 정할 때 쓴다.
     * @param {number} level
     * @returns {boolean}
     */
    usesWordBlocks(level) {
      return !!(SPELL_RULES[level] && SPELL_RULES[level].words);
    },

    /**
     * 단계에 맞는 영어 문제 하나를 만든다.
     * @param {number} level 1~12
     * @param {QuestionOptions} [options] pictureChoices: 단어→그림 (1~4단계만, 그 위는 글자 보기) / spelling: 철자 잇기
     * @returns {Question}
     */
    make(level, options = {}) {
      if (options.spelling) return spellOrder(level);
      const n = A.RULES.choicesByLevel[level];
      const cfg = LEVELS[level];
      const kind = pick(cfg.kinds);
      if (kind === 'fill' || kind === 'listenFill') return fillSentence(pickSentence(level), n, kind === 'listenFill');
      if (kind === 'phrase' || kind === 'phraseEmoji') {
        if (!options.pictureChoices) return choosePhrase(pick(A.PHRASES), kind, n);
      }
      const pool = poolFor(Math.min(level, 4));
      const word = pick(pool);
      if (options.pictureChoices) return choosePicture(word, n, pool, cfg.koHint);
      if (kind === 'blank') return blank(word, n);
      return chooseWord(word, kind, n, pool, cfg.koHint);
    },
  };
})(window.ARAH);

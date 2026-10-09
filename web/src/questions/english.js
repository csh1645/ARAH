/**
 * @file 영어 단어 문제 생성기 (엔진 독립). 유형: 그림→단어, 뜻→단어, 빈칸 철자.
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
   * 오답 단어를 고른다. 같은 분류(과일, 동물 등)를 우선 써서 대충 찍기 어렵게 한다.
   * @param {Word} word 정답 단어
   * @param {number} count
   * @returns {Word[]}
   */
  function wrongWords(word, count) {
    const same = shuffle(A.WORDS.filter((w) => w !== word && w.cat === word.cat));
    const other = shuffle(A.WORDS.filter((w) => w !== word && w.cat !== word.cat));
    return [...same, ...other].slice(0, count);
  }

  /**
   * 그림 또는 한글 뜻을 보고 영어 단어를 고르는 문제.
   * @param {Word} word
   * @param {'emoji'|'ko'} mode 문제에 보여 줄 단서
   * @param {number} n 보기 개수
   * @returns {Question}
   */
  function chooseWord(word, mode, n) {
    const choices = shuffle([word, ...wrongWords(word, n - 1)]).map((w) => w.en);
    return {
      key: `${mode}:${word.en}`,
      prompt: mode === 'emoji' ? `${word.emoji}  →  ?` : `"${word.ko}"  →  ?`,
      hint: mode === 'emoji' ? '그림에 맞는 영어 단어를 잡아요' : '뜻에 맞는 영어 단어를 잡아요',
      answer: word.en,
      choices,
      review: `${word.emoji} ${word.en} (${word.ko})`,
      speak: word.en,
    };
  }

  /**
   * 단어의 글자 하나를 빈칸으로 만들고 들어갈 알파벳을 고르는 문제 (예: ap_le → p).
   * @param {Word} word
   * @param {number} n 보기 개수
   * @returns {Question}
   */
  function spelling(word, n) {
    const idx = rand(0, word.en.length - 1);
    const letter = word.en[idx];
    const pool = VOWELS.includes(letter) ? VOWELS : CONSONANTS;
    const wrong = new Set();
    while (wrong.size < n - 1) {
      const c = pick(pool.split(''));
      if (c !== letter) wrong.add(c);
    }
    const masked = word.en.slice(0, idx) + '_' + word.en.slice(idx + 1);
    return {
      key: `spell:${word.en}:${idx}`,
      prompt: `${word.emoji}  ${masked}`,
      hint: '빈칸에 들어갈 알파벳을 잡아요',
      answer: letter,
      choices: shuffle([letter, ...wrong]),
      review: `${word.emoji} ${word.en} (${word.ko})`,
      speak: word.en,
    };
  }

  /**
   * 영어 단어를 보고(듣고) 알맞은 그림을 고르는 문제. 보기가 이모지 그림이다.
   * 로블록스의 "맞는 그림 고르기" 류 게임처럼, 글자 → 그림으로 의미를 연결하는 연습.
   * @param {Word} word
   * @param {number} n 보기 개수
   * @param {1|2|3} level 3단계는 한글 뜻 없이 영어만 보여 준다
   * @returns {Question}
   */
  function choosePicture(word, n, level) {
    const choices = shuffle([word, ...wrongWords(word, n - 1)]).map((w) => w.emoji);
    return {
      key: `pic:${word.en}`,
      prompt: `🔊 ${word.en}`,
      hint: level === 1 ? `"${word.ko}" 그림이 있는 문으로 달려가요` : '단어에 맞는 그림 문으로 달려가요',
      answer: word.emoji,
      choices,
      review: `${word.emoji} ${word.en} (${word.ko})`,
      speak: word.en,
      pictureChoices: true,
    };
  }

  /** 철자 잇기: 단계별 단어 최대 길이와 방해 글자 수 */
  const SPELL_RULES = {
    1: { maxLen: 4, decoys: 0 },
    2: { maxLen: 6, decoys: 1 },
    3: { maxLen: 99, decoys: 2 },
  };

  /**
   * 철자 잇기 문제: 단어의 알파벳을 섞어 주고 순서대로 고르게 한다.
   * 다른 문제와 달리 choices 에 같은 글자가 여러 번 들어갈 수 있다 (예: apple 의 p 두 개) — 이 모드만 쓰는 형식.
   * @param {1|2|3} level
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
    return {
      key: `order:${word.en}`,
      prompt: `${word.emoji}  🔊`,
      hint: level === 1 ? `"${word.ko}" 철자를 순서대로 거미줄로 잡아요` : '철자를 순서대로 거미줄로 잡아요',
      answer: word.en,
      choices: shuffle([...word.en.split(''), ...extra]),
      decoys: extra,
      review: `${word.emoji} ${word.en} (${word.ko})`,
      speak: word.en,
      spelling: true,
    };
  }

  A.English = {
    /**
     * 단계에 맞는 영어 문제 하나를 만든다.
     * 기본: 1단계 그림→단어 / 2단계 그림 또는 뜻→단어 / 3단계 뜻→단어 또는 빈칸 철자
     * pictureChoices: 모든 단계에서 단어→그림 (1단계만 한글 뜻 힌트)
     * spelling: 철자 잇기 (알파벳을 순서대로 고르기, 단계별 길이 · 방해 글자)
     * @param {1|2|3} level
     * @param {QuestionOptions} [options]
     * @returns {Question}
     */
    make(level, options = {}) {
      const n = A.RULES.choicesByLevel[level];
      if (options.spelling) return spellOrder(level);
      const word = pick(A.WORDS);
      if (options.pictureChoices) return choosePicture(word, n, level);
      if (level === 1) return chooseWord(word, 'emoji', n);
      if (level === 2) return chooseWord(word, pick(['emoji', 'ko']), n);
      return Math.random() < 0.5 ? spelling(word, n) : chooseWord(word, 'ko', n);
    },
  };
})(window.ARAH);

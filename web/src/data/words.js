/**
 * @file 영어 단어 목록. 단어를 추가하면 doc/content/curriculum.md 의 단어 목록도 함께 갱신한다.
 * @layer data
 * @depends 없음
 * @see doc/content/curriculum.md (영어)
 */

/**
 * @typedef {Object} Word
 * @property {string} en    영어 단어 (소문자)
 * @property {string} ko    한글 뜻
 * @property {string} emoji 그림 대신 쓰는 이모지
 * @property {'fruit'|'animal'|'nature'|'thing'} cat 분류. 같은 분류 단어를 오답 보기로 쓴다
 */
(function (A) {
  'use strict';

  /** @type {Word[]} 분류별로 묶어서 둔다. */
  A.WORDS = [
    // 과일
    { en: 'apple', ko: '사과', emoji: '🍎', cat: 'fruit' },
    { en: 'banana', ko: '바나나', emoji: '🍌', cat: 'fruit' },
    { en: 'grape', ko: '포도', emoji: '🍇', cat: 'fruit' },
    { en: 'orange', ko: '오렌지', emoji: '🍊', cat: 'fruit' },
    { en: 'strawberry', ko: '딸기', emoji: '🍓', cat: 'fruit' },
    { en: 'lemon', ko: '레몬', emoji: '🍋', cat: 'fruit' },
    { en: 'peach', ko: '복숭아', emoji: '🍑', cat: 'fruit' },
    { en: 'watermelon', ko: '수박', emoji: '🍉', cat: 'fruit' },
    // 동물
    { en: 'dog', ko: '개', emoji: '🐶', cat: 'animal' },
    { en: 'cat', ko: '고양이', emoji: '🐱', cat: 'animal' },
    { en: 'lion', ko: '사자', emoji: '🦁', cat: 'animal' },
    { en: 'tiger', ko: '호랑이', emoji: '🐯', cat: 'animal' },
    { en: 'rabbit', ko: '토끼', emoji: '🐰', cat: 'animal' },
    { en: 'bear', ko: '곰', emoji: '🐻', cat: 'animal' },
    { en: 'pig', ko: '돼지', emoji: '🐷', cat: 'animal' },
    { en: 'cow', ko: '소', emoji: '🐮', cat: 'animal' },
    { en: 'monkey', ko: '원숭이', emoji: '🐵', cat: 'animal' },
    { en: 'fish', ko: '물고기', emoji: '🐟', cat: 'animal' },
    { en: 'bird', ko: '새', emoji: '🐦', cat: 'animal' },
    { en: 'spider', ko: '거미', emoji: '🕷️', cat: 'animal' },
    { en: 'frog', ko: '개구리', emoji: '🐸', cat: 'animal' },
    // 자연
    { en: 'sun', ko: '해', emoji: '☀️', cat: 'nature' },
    { en: 'moon', ko: '달', emoji: '🌙', cat: 'nature' },
    { en: 'star', ko: '별', emoji: '⭐', cat: 'nature' },
    { en: 'tree', ko: '나무', emoji: '🌳', cat: 'nature' },
    { en: 'flower', ko: '꽃', emoji: '🌸', cat: 'nature' },
    { en: 'rain', ko: '비', emoji: '🌧️', cat: 'nature' },
    { en: 'snow', ko: '눈', emoji: '❄️', cat: 'nature' },
    // 물건
    { en: 'car', ko: '자동차', emoji: '🚗', cat: 'thing' },
    { en: 'bus', ko: '버스', emoji: '🚌', cat: 'thing' },
    { en: 'book', ko: '책', emoji: '📖', cat: 'thing' },
    { en: 'ball', ko: '공', emoji: '⚽', cat: 'thing' },
    { en: 'cake', ko: '케이크', emoji: '🍰', cat: 'thing' },
    { en: 'milk', ko: '우유', emoji: '🥛', cat: 'thing' },
    { en: 'egg', ko: '달걀', emoji: '🥚', cat: 'thing' },
    { en: 'house', ko: '집', emoji: '🏠', cat: 'thing' },
    { en: 'hat', ko: '모자', emoji: '🧢', cat: 'thing' },
    { en: 'bag', ko: '가방', emoji: '🎒', cat: 'thing' },
    { en: 'pencil', ko: '연필', emoji: '✏️', cat: 'thing' },
    { en: 'clock', ko: '시계', emoji: '⏰', cat: 'thing' },
  ];
})(window.ARAH);

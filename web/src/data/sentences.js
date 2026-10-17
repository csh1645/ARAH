/**
 * @file 영어 어구 · 문장 목록 (5~12단계). 단어(words.js) 다음 단계: 어구 → 문장 빈칸 → 문법 → 문장 만들기.
 * @layer data
 * @depends 없음
 * @see doc/content/curriculum.md (영어), questions/english.js
 *
 * 작성 규칙:
 *   - 문장은 짧게 (화면 위 문제 칸 한 줄, 약 30자 이내). 철자 잇기(문장 만들기)에는 7단어 이하만 쓰인다
 *   - blank: 빈칸으로 뺄 단어 (문장 안에 정확히 그 모양으로 한 번 나와야 한다)
 *   - wrong: 빈칸 오답 3개. 그 단계 문법의 "헷갈리는 형태"를 쓴다 (has ↔ have, went ↔ goed …)
 *     한글 뜻(ko)이 함께 나오므로, 문법상 가능하지만 뜻이 다른 말은 오답으로 써도 정답이 하나로 정해진다
 *   - 새 문장을 추가하면 발음 파일을 만든다 (web/assets/audio/words/README.md — 없으면 기기 음성으로 대신 읽음)
 */

/**
 * @typedef {Object} Phrase 어구 (5단계)
 * @property {string} en    영어 어구 (예: "a red apple")
 * @property {string} ko    한글 뜻
 * @property {string} emoji 그림
 */

/**
 * @typedef {Object} Sentence 문장 (6~12단계)
 * @property {string} en     영어 문장
 * @property {string} ko     한글 뜻
 * @property {number} lv     단계 (6~12)
 * @property {string} blank  빈칸으로 뺄 단어
 * @property {string[]} wrong 빈칸 오답 3개
 * @property {string} tag    문법 이름 (복습 · 문서용)
 */
(function (A) {
  'use strict';

  /** @type {Phrase[]} 5단계: 꾸미는 말 + 이름 (a / an, 수 + 복수) */
  A.PHRASES = [
    ['a red apple', '빨간 사과', '🍎'],
    ['a yellow banana', '노란 바나나', '🍌'],
    ['an orange', '오렌지 하나', '🍊'],
    ['an umbrella', '우산 하나', '☂️'],
    ['two cats', '고양이 두 마리', '🐈🐈'],
    ['three dogs', '개 세 마리', '🐕🐕🐕'],
    ['five stars', '별 다섯 개', '⭐⭐⭐⭐⭐'],
    ['four red flowers', '빨간 꽃 네 송이', '🌹🌹🌹🌹'],
    ['a big elephant', '큰 코끼리', '🐘'],
    ['a small mouse', '작은 생쥐', '🐭'],
    ['a happy boy', '행복한 소년', '😄👦'],
    ['a sad girl', '슬픈 소녀', '😢👧'],
    ['a blue car', '파란 자동차', '🚙'],
    ['a white cloud', '하얀 구름', '☁️'],
    ['a hot pizza', '뜨거운 피자', '🍕🔥'],
    ['cold water', '차가운 물', '🧊💧'],
    ['a fast rabbit', '빠른 토끼', '🐇💨'],
    ['a slow turtle', '느린 거북', '🐢'],
    ['a tall giraffe', '키 큰 기린', '🦒'],
    ['my new shoes', '나의 새 신발', '👟✨'],
    ['a long snake', '긴 뱀', '🐍'],
    ['a black cat', '검은 고양이', '🐈‍⬛'],
    ['a green frog', '초록 개구리', '🐸'],
    ['six eggs', '달걀 여섯 개', '🥚🥚🥚🥚🥚🥚'],
  ].map(([en, ko, emoji]) => ({ en, ko, emoji }));

  /** [en, ko, blank, wrong[3], tag] 를 단계별로 적는다 (읽고 고치기 쉽게) */
  const RAW = {
    6: [ // 초6: be동사 · have/has · 지시대명사 · there is/are · 기본 형용사
      ['I am happy.', '나는 행복해요.', 'am', ['is', 'are', 'be'], 'be동사'],
      ['She is my sister.', '그녀는 내 여동생이에요.', 'is', ['am', 'are', 'be'], 'be동사'],
      ['They are in the park.', '그들은 공원에 있어요.', 'are', ['is', 'am', 'be'], 'be동사'],
      ['We are good friends.', '우리는 좋은 친구예요.', 'are', ['is', 'am', 'be'], 'be동사'],
      ['He has a red bike.', '그는 빨간 자전거가 있어요.', 'has', ['have', 'is', 'are'], 'have / has'],
      ['I have two cats.', '나는 고양이 두 마리가 있어요.', 'have', ['has', 'am', 'is'], 'have / has'],
      ['There are three apples.', '사과가 세 개 있어요.', 'are', ['is', 'am', 'be'], 'there is / are'],
      ['There is a dog here.', '여기에 개가 한 마리 있어요.', 'is', ['are', 'am', 'be'], 'there is / are'],
      ['This is my book.', '이것은 내 책이에요.', 'This', ['These', 'Those', 'We'], '지시대명사'],
      ['These are my shoes.', '이것들은 내 신발이에요.', 'These', ['This', 'That', 'It'], '지시대명사'],
      ['It is cold today.', '오늘은 추워요.', 'cold', ['hot', 'warm', 'sunny'], '날씨'],
      ['My dog is very big.', '우리 개는 아주 커요.', 'big', ['small', 'fast', 'old'], '형용사'],
    ],
    7: [ // 중1: 일반동사 현재 · 명령문 · 전치사 · 의문사 · can
      ['I like pizza.', '나는 피자를 좋아해요.', 'like', ['likes', 'liking', 'to like'], '일반동사'],
      ['We play soccer after school.', '우리는 방과 후에 축구를 해요.', 'play', ['plays', 'playing', 'to play'], '일반동사'],
      ['The book is on the desk.', '책이 책상 위에 있어요.', 'on', ['under', 'in', 'behind'], '전치사'],
      ['The cat is under the chair.', '고양이가 의자 아래에 있어요.', 'under', ['on', 'in', 'next'], '전치사'],
      ['Open the door, please.', '문을 열어 주세요.', 'Open', ['Opens', 'Opening', 'To open'], '명령문'],
      ["Don't run in the hall.", '복도에서 뛰지 마세요.', "Don't", ["Doesn't", 'Not', 'No'], '명령문'],
      ['I go to school by bus.', '나는 버스로 학교에 가요.', 'by', ['on', 'in', 'at'], '전치사'],
      ["Let's go to the beach.", '해변에 가자.', 'go', ['goes', 'going', 'went'], 'Let\'s'],
      ['What time is it?', '몇 시예요?', 'What', ['Who', 'Where', 'Why'], '의문사'],
      ['Where is my bag?', '내 가방은 어디에 있어요?', 'Where', ['What', 'Who', 'When'], '의문사'],
      ['I can swim well.', '나는 수영을 잘할 수 있어요.', 'can', ['cans', 'am', 'do'], 'can'],
      ['How many pens do you have?', '펜이 몇 자루 있어요?', 'many', ['much', 'old', 'long'], '의문사'],
    ],
    8: [ // 중1: 3인칭 단수 · do/does 의문문 · 부정문
      ['She likes music.', '그녀는 음악을 좋아해요.', 'likes', ['like', 'liking', 'to like'], '3인칭 단수'],
      ['He plays the piano.', '그는 피아노를 쳐요.', 'plays', ['play', 'playing', 'to play'], '3인칭 단수'],
      ['My mom works at a hospital.', '엄마는 병원에서 일해요.', 'works', ['work', 'working', 'to work'], '3인칭 단수'],
      ['Tom watches TV every day.', '톰은 매일 TV를 봐요.', 'watches', ['watch', 'watchs', 'watching'], '3인칭 단수'],
      ['She studies English.', '그녀는 영어를 공부해요.', 'studies', ['study', 'studys', 'studying'], '3인칭 단수'],
      ['My dad goes to work early.', '아빠는 일찍 출근해요.', 'goes', ['go', 'gos', 'going'], '3인칭 단수'],
      ['The sun rises in the east.', '해는 동쪽에서 떠요.', 'rises', ['rise', 'rising', 'rised'], '3인칭 단수'],
      ['Do you like cats?', '너는 고양이를 좋아하니?', 'Do', ['Does', 'Is', 'Are'], 'do / does'],
      ['Does he have a pet?', '그는 애완동물이 있니?', 'Does', ['Do', 'Is', 'Has'], 'do / does'],
      ['Does your sister wear glasses?', '네 언니는 안경을 쓰니?', 'Does', ['Do', 'Is', 'Are'], 'do / does'],
      ["I don't eat carrots.", '나는 당근을 먹지 않아요.', "don't", ["doesn't", 'not', "isn't"], '부정문'],
      ["She doesn't like milk.", '그녀는 우유를 좋아하지 않아요.', "doesn't", ["don't", "isn't", 'not'], '부정문'],
    ],
    9: [ // 중2: 과거 · 불규칙 과거 · 진행형 · will
      ['I went to the zoo yesterday.', '나는 어제 동물원에 갔어요.', 'went', ['go', 'goes', 'goed'], '과거 (불규칙)'],
      ['She ate an apple.', '그녀는 사과를 먹었어요.', 'ate', ['eat', 'eated', 'eats'], '과거 (불규칙)'],
      ['She bought a new hat.', '그녀는 새 모자를 샀어요.', 'bought', ['buy', 'buyed', 'buys'], '과거 (불규칙)'],
      ['We played soccer last Sunday.', '우리는 지난 일요일에 축구를 했어요.', 'played', ['play', 'plays', 'playing'], '과거'],
      ['He was tired last night.', '그는 어젯밤 피곤했어요.', 'was', ['were', 'is', 'are'], 'be동사 과거'],
      ['They were at home.', '그들은 집에 있었어요.', 'were', ['was', 'are', 'is'], 'be동사 과거'],
      ['Did you see the movie?', '그 영화 봤어?', 'Did', ['Do', 'Does', 'Were'], '과거 의문문'],
      ['I am reading a book now.', '나는 지금 책을 읽고 있어요.', 'reading', ['read', 'reads', 'to read'], '현재진행'],
      ['The baby is sleeping.', '아기가 자고 있어요.', 'sleeping', ['sleep', 'sleeps', 'slept'], '현재진행'],
      ['They are swimming in the sea.', '그들은 바다에서 수영하고 있어요.', 'swimming', ['swiming', 'swim', 'swims'], '현재진행'],
      ['I will visit my grandma.', '나는 할머니를 방문할 거예요.', 'will', ['was', 'did', 'am'], '미래 will'],
      ['It will rain tomorrow.', '내일 비가 올 거예요.', 'will', ['is', 'was', 'did'], '미래 will'],
    ],
    10: [ // 중2: 조동사 · 비교급 · 최상급 · to부정사 기초
      ['You must wear a helmet.', '너는 헬멧을 꼭 써야 해요.', 'must', ['may', 'did', 'are'], '조동사'],
      ['You should drink more water.', '물을 더 마시는 게 좋아요.', 'should', ['shoulds', 'are', 'did'], '조동사'],
      ['May I come in?', '들어가도 될까요?', 'May', ['Do', 'Am', 'Was'], '조동사'],
      ['He can run very fast.', '그는 아주 빨리 달릴 수 있어요.', 'run', ['runs', 'running', 'ran'], '조동사 + 동사원형'],
      ['I have to finish my homework.', '나는 숙제를 끝내야 해요.', 'have', ['has', 'having', 'am'], 'have to'],
      ['A cheetah is faster than a dog.', '치타는 개보다 빨라요.', 'faster', ['fast', 'fastest', 'more fast'], '비교급'],
      ['My bag is bigger than yours.', '내 가방이 네 것보다 커요.', 'bigger', ['big', 'biggest', 'more big'], '비교급'],
      ['Math is more difficult than art.', '수학은 미술보다 어려워요.', 'more', ['most', 'much', 'very'], '비교급'],
      ['This is the tallest tree.', '이것이 가장 키 큰 나무예요.', 'tallest', ['taller', 'tall', 'most tall'], '최상급'],
      ['She is the best singer.', '그녀가 최고의 가수예요.', 'best', ['better', 'good', 'goodest'], '최상급'],
      ['I want to be a doctor.', '나는 의사가 되고 싶어요.', 'to', ['for', 'at', 'in'], 'to부정사'],
      ['It is too hot to play outside.', '너무 더워서 밖에서 놀 수 없어요.', 'too', ['very', 'so', 'much'], 'too ~ to'],
    ],
    11: [ // 중3: 현재완료 · 동명사 · 감각동사 · 수여동사
      ['I have lived here for five years.', '나는 여기서 5년 동안 살았어요.', 'lived', ['live', 'living', 'lives'], '현재완료'],
      ['She has been to Paris.', '그녀는 파리에 가 본 적이 있어요.', 'been', ['be', 'being', 'was'], '현재완료 (경험)'],
      ['Have you ever seen a whale?', '고래를 본 적이 있니?', 'seen', ['saw', 'see', 'seeing'], '현재완료 (경험)'],
      ['I have just finished lunch.', '나는 방금 점심을 다 먹었어요.', 'finished', ['finish', 'finishing', 'finishes'], '현재완료 (완료)'],
      ['She has already left.', '그녀는 벌써 떠났어요.', 'left', ['leave', 'leaving', 'leaves'], '현재완료 (완료)'],
      ['I enjoy playing the guitar.', '나는 기타 치는 것을 즐겨요.', 'playing', ['play', 'to play', 'plays'], '동명사'],
      ['Reading books is fun.', '책 읽기는 재미있어요.', 'Reading', ['Read', 'Reads', 'Readed'], '동명사'],
      ['I stopped eating sweets.', '나는 단것 먹기를 그만뒀어요.', 'eating', ['eat', 'ate', 'eats'], '동명사'],
      ['She decided to study abroad.', '그녀는 유학 가기로 결심했어요.', 'to', ['for', 'at', 'of'], 'to부정사'],
      ['You look happy today.', '너 오늘 행복해 보여요.', 'happy', ['happily', 'happiness', 'happied'], '감각동사 + 형용사'],
      ['This soup smells good.', '이 수프는 냄새가 좋아요.', 'good', ['well', 'goodly', 'nicely'], '감각동사 + 형용사'],
      ['He gave me a present.', '그가 나에게 선물을 줬어요.', 'me', ['I', 'my', 'mine'], '수여동사'],
    ],
    12: [ // 중3: 수동태 · 관계대명사 · 접속사 · 간접의문문 · 5형식
      ['This book was written by her.', '이 책은 그녀가 썼어요.', 'written', ['wrote', 'write', 'writing'], '수동태'],
      ['The window was broken by Tom.', '창문은 톰이 깼어요.', 'broken', ['broke', 'break', 'breaking'], '수동태'],
      ['English is spoken in Canada.', '캐나다에서는 영어를 써요.', 'spoken', ['spoke', 'speak', 'speaking'], '수동태'],
      ['I know a boy who sings well.', '나는 노래를 잘하는 소년을 알아요.', 'who', ['which', 'what', 'where'], '관계대명사'],
      ['This is the cake which I made.', '이것은 내가 만든 케이크예요.', 'which', ['who', 'where', 'what'], '관계대명사'],
      ['I stayed home because it rained.', '비가 와서 나는 집에 있었어요.', 'because', ['but', 'so', 'or'], '접속사'],
      ['It was cold, so I wore a coat.', '추워서 나는 코트를 입었어요.', 'so', ['because', 'but', 'or'], '접속사'],
      ['If it is sunny, we will go.', '날씨가 맑으면 우리는 갈 거예요.', 'If', ['But', 'So', 'Or'], '접속사'],
      ['Both Tom and Jerry are cats.', '톰과 제리 둘 다 고양이예요.', 'and', ['or', 'but', 'so'], 'both A and B'],
      ["I don't know where he lives.", '그가 어디 사는지 몰라요.', 'where', ['who', 'what', 'which'], '간접의문문'],
      ['The song makes me happy.', '그 노래는 나를 행복하게 해요.', 'happy', ['happily', 'happiness', 'to happy'], '5형식'],
      ['I want you to come.', '나는 네가 왔으면 해요.', 'to', ['for', 'at', 'by'], '5형식'],
    ],
  };

  /** @type {Sentence[]} */
  A.SENTENCES = Object.entries(RAW).flatMap(([lv, rows]) =>
    rows.map(([en, ko, blank, wrong, tag]) => ({ en, ko, lv: Number(lv), blank, wrong, tag })));
})(window.ARAH);

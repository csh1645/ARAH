/**
 * @file 오답 복습 노트 (간격 반복). 틀린 문제를 저장해 두었다가 다시 내고, 연속으로 맞히면 졸업시킨다.
 * @layer questions
 * @depends A.util, A.storage, A.RULES
 * @see doc/planning/game-design.md (6.1 오답 복습)
 *
 * 방식 (라이트너 상자를 단순화):
 *   - 틀리거나 놓친 문제 → 상자 1 에 넣는다 (이미 있으면 상자 1 로 되돌림)
 *   - 복습 노트에서 나온 문제를 한 번에 맞힘 → 상자 +1. 상자가 RULES.reviewMasterBox 를 넘으면 졸업(노트에서 삭제)
 *   - 꺼낼 때는 상자 번호가 낮을수록(=아직 약한 문제) 자주 나온다
 *
 * 저장: localStorage 'arah.review' = { [key]: { q, box, wrong, at } }. 개인정보 없음, 이 기기에만 저장.
 * 문제 종류(kind): 'spell'(철자 잇기 전용 형식) / 'choice'(나머지 모든 놀이). 놀이마다 쓸 수 있는 종류만 꺼낸다.
 */

/**
 * @typedef {Object} ReviewEntry
 * @property {Question} q   저장한 문제 (보기 순서는 꺼낼 때 다시 섞는다)
 * @property {number} box   1 부터. 높을수록 잘 아는 문제
 * @property {number} wrong 틀린 횟수 (누적)
 * @property {number} at    마지막으로 갱신한 시각 (ms)
 */
(function (A) {
  'use strict';

  const STORE_KEY = 'review';

  /** 저장할 때 남길 문제 필드 (화면 전용 · 상태 필드는 빼고 저장) */
  const KEEP = ['key', 'subject', 'prompt', 'hint', 'answer', 'choices', 'review', 'speak', 'speakOnStart', 'pictureChoices', 'spelling', 'decoys'];

  const REVIEW_TAG = '📒 복습 문제 · ';
  const load = () => A.storage.get(STORE_KEY, {}) || {};
  const save = (book) => A.storage.set(STORE_KEY, book);
  const kindOf = (q) => (q.spelling ? 'spell' : 'choice');

  function snapshot(q) {
    const s = {};
    for (const k of KEEP) if (q[k] !== undefined) s[k] = q[k];
    if (s.hint) s.hint = s.hint.replace(REVIEW_TAG, ''); // 복습 표시가 겹겹이 붙지 않게
    return s;
  }

  /** 과목 선택과 맞는지 ('mix' 는 수학 네 연산 모두, 'review' 는 전부) */
  function matchesSubject(entry, subject) {
    if (!subject || subject === 'review') return true;
    if (subject === 'mix') return ['add', 'sub', 'mul', 'div'].includes(entry.q.subject);
    return entry.q.subject === subject;
  }

  A.Review = {
    /**
     * 한 문제가 끝났을 때 결과를 반영한다. RoundScene.endWave 에서 문제마다 한 번 부른다.
     * @param {Question} q 끝난 문제 (q.missed: 한 번이라도 틀렸는지, q.fromReview: 복습 노트에서 나온 문제인지)
     * @returns {'added'|'mastered'|'up'|null} 결과 화면 집계용
     */
    record(q) {
      if (!q || !q.key) return null;
      const book = load();
      const entry = book[q.key];
      let result = null;
      if (q.missed) {
        book[q.key] = { q: snapshot(q), box: 1, wrong: (entry ? entry.wrong : 0) + 1, at: Date.now() };
        result = entry ? null : 'added';
      } else if (entry && q.fromReview) {
        entry.box += 1;
        entry.at = Date.now();
        if (entry.box > A.RULES.reviewMasterBox) {
          delete book[q.key];
          result = 'mastered';
        } else {
          result = 'up';
        }
      }
      // 너무 많아지면 가장 오래된 것부터 지운다
      const keys = Object.keys(book);
      if (keys.length > A.RULES.reviewMaxItems) {
        keys.sort((a, b) => book[a].at - book[b].at);
        for (const k of keys.slice(0, keys.length - A.RULES.reviewMaxItems)) delete book[k];
      }
      save(book);
      return result;
    },

    /**
     * 복습 노트 문제 수
     * @param {'spell'|'choice'} [kind] 없으면 전체
     * @param {string} [subject] 과목 거르기
     */
    count(kind, subject) {
      return Object.values(load()).filter((e) => (!kind || kindOf(e.q) === kind) && matchesSubject(e, subject)).length;
    },

    /**
     * 복습할 문제 하나를 꺼낸다. 상자가 낮을수록 뽑힐 확률이 높다. 없으면 null.
     * @param {'spell'|'choice'} kind
     * @param {string} [subject] 과목 거르기 ('review' 면 전체)
     * @param {string[]} [avoidKeys] 최근에 낸 문제 (가능하면 피한다)
     * @returns {Question|null}
     */
    pick(kind, subject, avoidKeys = []) {
      let list = Object.values(load()).filter((e) => kindOf(e.q) === kind && matchesSubject(e, subject));
      if (!list.length) return null;
      const fresh = list.filter((e) => !avoidKeys.includes(e.q.key));
      if (fresh.length) list = fresh;
      // 가중치: 상자 1 → 3, 상자 2 → 2, 상자 3 → 1
      const weighted = list.flatMap((e) => Array(Math.max(1, 4 - e.box)).fill(e));
      const e = A.util.pick(weighted);
      const q = JSON.parse(JSON.stringify(e.q));
      q.choices = A.util.shuffle(q.choices); // 보기 위치를 외우지 않게 다시 섞는다
      q.fromReview = true;
      q.hint = `${REVIEW_TAG}${q.hint || '다시 도전!'}`;
      return q;
    },

    kindOf,
  };
})(window.ARAH);

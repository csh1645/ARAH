/**
 * @file 디자인 토큰 (히어로 코믹스). 색 · 글꼴 · 선 두께를 이 한 곳에 두고
 *       메뉴(CSS 변수로 자동 주입) · 게임 화면(Phaser) · 3D(Three) 가 같은 값을 쓴다.
 * @layer core
 * @depends 없음
 * @see doc/standards/design-system.md (2. 디자인 토큰)
 */
(function (A) {
  'use strict';

  /** 색 (문서 2절 표와 같은 이름) */
  const COLORS = {
    ink: '#1d1a2b',
    paper: '#fffaf0',
    sky: '#4fb3ff',
    sun: '#ffd23f',
    hero: '#ef3e36',
    pow: '#ff7a1a',
    go: '#2fbf71',
    night: '#3a2f8f',
  };

  A.THEME = {
    COLORS,
    /** Phaser · Three 에서 쓰는 숫자 색 (예: 0x1d1a2b) */
    hex: Object.fromEntries(Object.entries(COLORS).map(([k, v]) => [k, parseInt(v.slice(1), 16)])),
    FONT_TITLE: '"Black Han Sans", "Jua", sans-serif',
    FONT_BODY: '"Jua", "Malgun Gothic", sans-serif',
    LINE: 3, // 패널 · 버튼 테두리 px
    SHADOW: 4, // 단단한 그림자 어긋남 px
  };

  // 메뉴(DOM)용 CSS 변수로 내보낸다 → CSS 는 var(--cx-ink) 처럼 쓴다 (값을 CSS 에 따로 적지 않음)
  if (typeof document !== 'undefined') {
    const root = document.documentElement.style;
    for (const [k, v] of Object.entries(COLORS)) root.setProperty(`--cx-${k}`, v);
    root.setProperty('--cx-line', `${A.THEME.LINE}px`);
    root.setProperty('--cx-shadow', `${A.THEME.SHADOW}px`);
    root.setProperty('--cx-font-title', A.THEME.FONT_TITLE);
    root.setProperty('--cx-font-body', A.THEME.FONT_BODY);
  }
})(window.ARAH);

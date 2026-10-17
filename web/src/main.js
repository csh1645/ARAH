/**
 * @file 앱 진입점 (Vite). 예전 index.html 의 <script> 순서를 그대로 import 순서로 옮겼다.
 *       각 파일은 전역 window.ARAH 에 기능을 붙이는 방식(IIFE)이라, **import 순서 = 의존 순서**다.
 *       계층: 외부 엔진 → core → data → questions → game → ui (doc/standards/coding-standards.md 1절)
 * @see doc/decisions/ADR-0008-vite-content-pipeline.md
 *
 * 새 파일을 추가하면 이 목록의 알맞은 계층 위치에 import 한 줄을 더한다.
 * (나중에 파일들을 ES 모듈 export/import 로 바꾸면 이 목록은 자연스럽게 줄어든다)
 */
import './vendor-globals.js';
import './styles/style.css'; // 화면 스타일 (Vite 가 묶어서 내보냄)

// core
import './core/util.js';
import './core/theme.js'; // 디자인 토큰 (CSS 변수도 여기서 만든다)
import './core/storage.js';
import './core/speech.js';
import './core/sfx.js';

// data (콘텐츠는 content/arah-content.db → npm run content 가 만든 generated/*.json 을 읽는다)
import './data/curriculum.js';
import './data/heroes.js';
import './data/hero-lines.js';
import './data/words.js';
import './data/sentences.js';
import './data/audio-manifest.js';
import './data/sprite-manifest.js';

// questions (엔진 독립)
import './questions/math-values.js';
import './questions/math.js';
import './questions/english.js';
import './questions/index.js';
import './questions/review.js';

// game
import './game/hero-art.js';
import './game/round-scene.js';
import './game/three/assets3d.js'; // 3D: 모델 불러오기 → 슈트 입히기 → 3D 히어로 → 무대 → 소품 (round-scene 다음: A.GAME 사용)
import './game/three/toon.js';
import './game/three/hero-suit.js';
import './game/three/hero3d.js';
import './game/three/stage3d.js';
import './game/three/props3d.js';
import './game/three/showcase.js'; // 메뉴 로비: 3D 히어로 무대 · 초상화
import './game/travels.js';
import './game/attacks.js';
import './game/views/gate-view-2d.js';
import './game/views/gate-view-3d.js';
import './game/modes/run-mode.js';
import './game/modes/catch-mode.js';
import './game/modes/swing-mode.js';
import './game/modes/gate-mode.js';
import './game/modes/spell-mode.js';
import './game/modes/match-mode.js';
import './game/modes/boss-mode.js';
import './game/launcher.js';

// ui
import './ui/app.js';

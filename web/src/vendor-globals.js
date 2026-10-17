/**
 * @file 외부 엔진(Phaser · Three.js)을 npm 패키지에서 불러와 전역으로 둔다.
 *       기존 코드는 전역 Phaser · THREE 를 쓰므로 (CDN 시절과 같게), main.js 에서 가장 먼저 import 한다.
 *       버전은 package.json 에 고정 (phaser 3.80.1, three 0.149.0 — CDN 때와 같은 버전).
 * @layer core (외부 라이브러리 연결)
 * @see web/src/main.js, doc/decisions/ADR-0008-vite-content-pipeline.md
 */
import Phaser from 'phaser';
import * as THREE from 'three';

window.Phaser = Phaser;
window.THREE = THREE;

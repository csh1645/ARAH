/**
 * @file 만화풍 3D 표현 (디자인 표준 4절): 3단계 음영(toon) 재질 · 잉크 외곽선 · 망점 하늘.
 *       히어로 · 소품 · Kenney 모델이 모두 이 도구를 써서 같은 그림체가 된다.
 * @layer game
 * @depends THREE (전역), A.THEME
 * @see doc/standards/design-system.md (4. 3D 세상)
 */
(function (A) {
  'use strict';

  /** 3단계 명암표 (어두움 · 중간 · 밝음) — 부드러운 그라데이션 대신 뚝 끊기는 만화 명암 */
  const STEPS = new Uint8Array([90, 175, 255]);
  const GRADIENT = new THREE.DataTexture(STEPS, STEPS.length, 1, THREE.RedFormat);
  GRADIENT.minFilter = THREE.NearestFilter;
  GRADIENT.magFilter = THREE.NearestFilter;
  GRADIENT.needsUpdate = true;

  const OUTLINE_W = 0.035; // 모델 단위 (블록 캐릭터 키 2.7 기준 약 1.3%)

  /** 잉크 외곽선 재질: 법선 방향으로 부풀린 뒷면 */
  function outlineMaterial(width) {
    const m = new THREE.MeshBasicMaterial({ color: A.THEME.hex.ink, side: THREE.BackSide });
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n  transformed += normalize(normal) * ${width.toFixed(4)};`);
    };
    m.userData.shared = true;
    return m;
  }
  const OUTLINE = outlineMaterial(OUTLINE_W);

  A.Toon = {
    /**
     * 만화 음영 재질
     * @param {object} [opts] MeshToonMaterial 옵션 (color · map …)
     */
    material(opts = {}) {
      return new THREE.MeshToonMaterial({ gradientMap: GRADIENT, ...opts });
    },

    /**
     * 메시에 잉크 외곽선을 단다 (같은 형상을 공유하는 자식 메시, 뼈대 메시면 같은 뼈대에 묶인 자식)
     * @param {THREE.Mesh|THREE.SkinnedMesh} mesh
     * @param {number} [width] 기본 OUTLINE_W
     */
    outline(mesh, width) {
      const m = width ? outlineMaterial(width) : OUTLINE;
      let o;
      if (mesh.isSkinnedMesh) { // 뼈대로 움직이는 몸: 외곽선도 같은 뼈대에 묶는다
        o = new THREE.SkinnedMesh(mesh.geometry, m);
        o.bind(mesh.skeleton, mesh.bindMatrix);
        o.frustumCulled = false;
      } else {
        o = new THREE.Mesh(mesh.geometry, m);
      }
      o.userData.shared = true;
      o.userData.isOutline = true;
      mesh.add(o);
      return o;
    },

    /**
     * 불러온 모델 전체를 만화풍으로: 재질을 toon 으로 바꾸고(원래 색 · 텍스처 유지) 외곽선을 단다.
     * 같은 원본 재질은 한 번만 바꿔 복제본끼리 공유한다.
     * @param {THREE.Object3D} root
     * @param {{outline?: number}} [opts] outline: 외곽선 두께 (0 이면 없음)
     */
    toonify(root, opts = {}) {
      const cache = new Map();
      const meshes = [];
      root.traverse((o) => { if (o.isMesh && !o.userData.isOutline) meshes.push(o); });
      for (const o of meshes) {
        const src = o.material;
        if (!cache.has(src)) cache.set(src, A.Toon.material({ color: src.color ? src.color.clone() : 0xffffff, map: src.map || null }));
        o.material = cache.get(src);
        o.material.userData.shared = true;
        o.castShadow = true;
        o.receiveShadow = true;
        if (opts.outline !== 0) A.Toon.outline(o, opts.outline);
      }
      return root;
    },

    /**
     * 스파이더버스 풍 망점: 그림자 부분에 화면 기준 점(halftone)을 찍어 어둡게 한다. onBeforeCompile 안에서 부른다.
     * @param {object} shader onBeforeCompile 의 shader
     * @param {number} [amount=0.5] 점 진하기 (0 ~ 1)
     */
    spiderVerse(shader, amount = 0.5) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <output_fragment>', `
        {
          float svLight = dot(outgoingLight, vec3(0.299, 0.587, 0.114)) / max(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)), 0.001);
          float svShadow = clamp(1.0 - svLight, 0.0, 1.0);
          vec2 svUv = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / 5.0;
          float svDot = 1.0 - smoothstep(0.0, 0.08, length(fract(svUv) - 0.5) - svShadow * 0.55);
          outgoingLight *= 1.0 - svDot * ${amount.toFixed(2)} * step(0.08, svShadow);
        }
        #include <output_fragment>`);
    },

    /** 망점 하늘 텍스처 (하늘색 + 흰 점) — 장면 배경용 */
    halftoneSky() {
      const cv = document.createElement('canvas');
      cv.width = 512;
      cv.height = 512;
      const c = cv.getContext('2d');
      const g = c.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, '#2f9bff');
      g.addColorStop(1, '#a8dcff');
      c.fillStyle = g;
      c.fillRect(0, 0, 512, 512);
      c.fillStyle = 'rgba(255, 255, 255, 0.28)';
      for (let y = 0; y < 512; y += 14) {
        for (let x = (y / 14) % 2 ? 7 : 0; x < 512; x += 14) {
          const r = 1 + (y / 512) * 3.2; // 아래로 갈수록 점이 커진다 (만화 망점)
          c.beginPath();
          c.arc(x, y, r, 0, Math.PI * 2);
          c.fill();
        }
      }
      const t = new THREE.CanvasTexture(cv);
      t.encoding = THREE.sRGBEncoding;
      return t;
    },
  };
})(window.ARAH);

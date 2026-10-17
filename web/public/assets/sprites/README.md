# 스프라이트 (그림 리소스)

게임은 이 폴더의 **아틀라스 그림**을 먼저 쓰고, 없으면 코드 그림(`web/src/game/hero-art.js`)으로 그립니다.

## 히어로 (`heroes/<히어로 id>.png` + `.json`)

* **한 장에 16칸:** 윗줄 앞모습 8자세, 아랫줄 뒷모습 8자세(3D 시점용, `back-` 접두어)
* **프레임 크기:** 96 × 108 px (게임의 히어로 크기). 발 끝이 칸 아래쪽, 오른손(줄 · 공격이 나가는 곳)은 기본 자세에서 약 (54, 27) / 64 × 72 기준
* **프레임 이름 = 자세 이름:** `idle` `breath` `run1` `run2` `attack` `jump` `hurt` `win` (+ `back-…`)
* **형식:** Phaser 아틀라스 JSON(hash). 예시는 `npm run sprites` 가 만든 파일을 참고

## 디자이너 그림으로 바꾸는 방법

1. 같은 이름 · 같은 칸 배치로 PNG 를 그린다 (예: `heroes/red.png`)
2. `heroes/red.json` 의 `meta.source` 를 `"art"` 로 바꾼다 → `npm run sprites` 를 다시 돌려도 덮어쓰지 않는다
3. `npm run dev` 로 확인 후 커밋

지금 들어 있는 그림은 모두 `meta.source: "generated"` — 코드 그림을 구운 **임시본**입니다.

## 저작권

* 원조 히어로를 떠올리게 하는 오마주는 되지만 **공식 이름 · 로고 · 공식 이미지(캡처 포함)는 쓰지 않는다** ([ADR-0002](../../../../doc/decisions/ADR-0002-original-characters.md))
* 외부 에셋 · AI 생성 그림은 라이선스(공유 · 배포 허용 범위)를 확인하고 출처를 이 파일에 적는다

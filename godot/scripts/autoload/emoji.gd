## 그림 문자(이모지) · 글꼴에 없는 기호를 그림(텍스처)으로 바꿔 준다 (웹 전용).
## 브라우저가 기기 글꼴로 그린 PNG 를 받는다 (godot/web/arah-bridge.js glyphPng) → 지금 웹 판과 같은 모양,
## 그림 문자 글꼴 파일(수 MB)을 따로 배포하지 않아도 된다. 데스크톱은 글꼴의 기기 대체 글꼴로 그리므로 쓰지 않는다.
extends Node

const PX := 72 # 그릴 때 크기 (화면에서는 줄여 쓴다 → 확대해도 선명)
const PAD := 18 # 브라우저 그림의 사방 여백 = ceil(PX * 0.25) (arah-bridge.js glyphPng 와 같아야 한다)

var _cache: Dictionary = {}


## 웹에서 그림으로 바꿔 그려야 하는지
func enabled() -> bool:
	return Bridge.is_web()


## 글자 묶음 하나의 텍스처. mono = true 면 흰색 글자 (글자 색을 곱해 쓴다)
func texture(cluster: String, mono: bool = false) -> Texture2D:
	var key := cluster + ("#m" if mono else "")
	if _cache.has(key):
		return _cache[key]
	var tex: Texture2D = null
	if Bridge.is_web():
		var b64 := str(Bridge.call_js("glyphPng", [cluster, PX, mono]))
		if b64 != "" and b64 != "null":
			var img := Image.new()
			if img.load_png_from_buffer(Marshalls.base64_to_raw(b64)) == OK:
				img.generate_mipmaps()
				tex = ImageTexture.create_from_image(img)
	_cache[key] = tex
	return tex


## 그림 문자의 시작 글자인지 (대략적인 범위 — 데이터에 쓰인 그림 문자 151개를 모두 포함)
static func is_emoji_start(cp: int) -> bool:
	return cp >= 0x1F000 \
		or (cp >= 0x2600 and cp <= 0x27BF) \
		or (cp >= 0x2B00 and cp <= 0x2BFF) \
		or (cp >= 0x2300 and cp <= 0x23FF) \
		or (cp >= 0x2190 and cp <= 0x21FF) \
		or cp in [0x00A9, 0x00AE, 0x203C, 0x2049, 0x2122, 0x2139, 0x24C2, 0x3030, 0x303D, 0x3297, 0x3299, 0x2934, 0x2935]


## 묶음에 이어 붙는 글자인지 (변형 선택자 · 피부색 · 키캡 · 태그)
static func is_joiner(cp: int) -> bool:
	return cp == 0xFE0F or cp == 0xFE0E or (cp >= 0x1F3FB and cp <= 0x1F3FF) or cp == 0x20E3 or (cp >= 0xE0020 and cp <= 0xE007F)

## 글자 그리기 공통 (게임 화면 Txt · 메뉴 UiText 가 함께 쓴다).
## 웹에서는 그림 문자 · 글꼴에 없는 기호를 Emoji 텍스처로 끼워 그린다. 테두리(외곽선) 글자를 지원한다.
class_name TextDraw
extends RefCounted

const EMOJI_SCALE := 1.12 # 그림 문자는 글자보다 살짝 크게


## 글자열을 조각으로 나눈다: [{t: "글자", img: false}, {t: "🔥", img: true, mono: false}, …]
static func segments(text: String, font: Font) -> Array:
	if not Emoji.enabled():
		return [{"t": text, "img": false}]
	var out: Array = []
	var buf := ""
	var i := 0
	var n := text.length()
	while i < n:
		var cp := text.unicode_at(i)
		var emoji := Emoji.is_emoji_start(cp)
		var missing := not emoji and cp > 0x7F and not (cp >= 0xAC00 and cp <= 0xD7A3) and cp != 0xFE0F and not Fonts.has_char(font, cp)
		if not emoji and not missing:
			if cp != 0xFE0F:
				buf += text[i]
			i += 1
			continue
		if buf != "":
			out.append({"t": buf, "img": false})
			buf = ""
		var cluster := text[i]
		i += 1
		if emoji:
			# 국기(지역 표시 글자 두 개) · 변형 선택자 · 피부색 · ZWJ 로 이은 묶음
			if cp >= 0x1F1E6 and cp <= 0x1F1FF and i < n and text.unicode_at(i) >= 0x1F1E6 and text.unicode_at(i) <= 0x1F1FF:
				cluster += text[i]
				i += 1
			while i < n:
				var c2 := text.unicode_at(i)
				if Emoji.is_joiner(c2):
					cluster += text[i]
					i += 1
				elif c2 == 0x200D and i + 1 < n:
					cluster += text[i] + text[i + 1]
					i += 2
				else:
					break
		out.append({"t": cluster, "img": true, "mono": not emoji})
	if buf != "":
		out.append({"t": buf, "img": false})
	return out


## 한 줄의 폭
static func line_width(segs: Array, font: Font, size: int) -> float:
	var w := 0.0
	for s in segs:
		if s.img:
			w += _img_size(s, size).x
		else:
			w += font.get_string_size(s.t, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	return w


## 그림 글자의 배율 (브라우저가 그린 PNG 는 글자 크기 Emoji.PX 에 사방 여백 Emoji.PAD 가 있다)
static func _img_scale(s: Dictionary, size: int) -> float:
	return size * (1.0 if s.get("mono", false) else EMOJI_SCALE) / float(Emoji.PX)


static func _img_size(s: Dictionary, size: int) -> Vector2:
	var tex: Texture2D = Emoji.texture(s.t, s.get("mono", false))
	var k := _img_scale(s, size)
	if tex == null:
		return Vector2(Emoji.PX, Emoji.PX) * k
	return Vector2(maxf(1.0, tex.get_width() - Emoji.PAD * 2), tex.get_height()) * k


## 한 줄 그리기. pos = 줄의 왼쪽 위
static func draw_line(ci: CanvasItem, pos: Vector2, segs: Array, font: Font, size: int, color: Color, outline: int, outline_color: Color) -> void:
	var ascent := font.get_ascent(size)
	var line_h := font.get_height(size)
	var x := pos.x
	for s in segs:
		if s.img:
			var tex: Texture2D = Emoji.texture(s.t, s.get("mono", false))
			var k := _img_scale(s, size)
			var adv := _img_size(s, size).x
			if tex:
				var dst := Rect2(Vector2(x - Emoji.PAD * k, pos.y + (line_h - tex.get_height() * k) * 0.5), Vector2(tex.get_width(), tex.get_height()) * k)
				var mono: bool = s.get("mono", false)
				if outline > 0 and mono:
					var o := maxf(1.5, outline * 0.4)
					for d in [Vector2(-o, 0), Vector2(o, 0), Vector2(0, -o), Vector2(0, o)]:
						ci.draw_texture_rect(tex, Rect2(dst.position + d, dst.size), false, outline_color)
				ci.draw_texture_rect(tex, dst, false, color if mono else Color(1, 1, 1, color.a))
			x += adv
		else:
			var base := Vector2(x, pos.y + ascent)
			if outline > 0:
				ci.draw_string_outline(font, base, s.t, HORIZONTAL_ALIGNMENT_LEFT, -1, size, outline, outline_color)
			ci.draw_string(font, base, s.t, HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)
			x += font.get_string_size(s.t, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x


## 글자열을 주어진 폭에 맞춰 여러 줄로 나눈다 (공백 기준, 한 단어가 너무 길면 글자 단위)
static func wrap(text: String, font: Font, size: int, max_w: float) -> PackedStringArray:
	var out := PackedStringArray()
	for para in text.split("\n"):
		var line := ""
		for w in para.split(" "):
			var trial: String = w if line == "" else line + " " + w
			if line != "" and font.get_string_size(trial, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x > max_w:
				out.append(line)
				line = w
			else:
				line = trial
			while line.length() > 1 and font.get_string_size(line, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x > max_w:
				var cut := line.length() - 1
				while cut > 1 and font.get_string_size(line.substr(0, cut), HORIZONTAL_ALIGNMENT_LEFT, -1, size).x > max_w:
					cut -= 1
				out.append(line.substr(0, cut))
				line = line.substr(cut)
		out.append(line)
	return out

## 메뉴 화면 부품 (디자인 표준 — 웹 판 cx-chip · cx-tile · cx-card 에 해당). 색 · 둥근 모서리 · 눌림 연출을 한곳에서 정한다.
class_name Kit
extends RefCounted

const C_BG_TOP := Color("#1b1f5b")
const C_BG_BOTTOM := Color("#0b1026")
const C_PANEL := Color(1, 1, 1, 0.07)
const C_PANEL_BORDER := Color(1, 1, 1, 0.14)
const C_ACCENT := Color("#ffd166")
const C_PINK := Color("#ff4fa3")
const C_RED := Color("#e63946")
const C_TEXT := Color("#ffffff")
const C_SUB := Color("#b8bfe8")
const C_SELECTED := Color("#ffd166")


static func box(bg: Color, radius: int = 14, border: Color = Color(0, 0, 0, 0), border_w: int = 0, shadow: int = 0) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.set_corner_radius_all(radius)
	if border_w > 0:
		s.border_color = border
		s.set_border_width_all(border_w)
	if shadow > 0:
		s.shadow_color = Color(0, 0, 0, 0.35)
		s.shadow_size = shadow
		s.shadow_offset = Vector2(0, shadow * 0.5)
	s.anti_aliasing = true
	return s


static func panel(bg: Color = C_PANEL, radius: int = 18) -> PanelContainer:
	var p := PanelContainer.new()
	var s := box(bg, radius, C_PANEL_BORDER, 2)
	s.content_margin_left = 14
	s.content_margin_right = 14
	s.content_margin_top = 10
	s.content_margin_bottom = 12
	p.add_theme_stylebox_override("panel", s)
	return p


## 글자(그림 문자 포함) 버튼. 누르면 살짝 눌렸다가 튀어 오른다.
## @param kind "chip" | "tile" | "big" | "icon"
static func button(label: String, size: int, kind: String, on_press: Callable, sub: String = "") -> Button:
	var b := Button.new()
	b.focus_mode = Control.FOCUS_NONE
	b.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	var base: Color
	match kind:
		"big":
			base = C_RED
		"icon":
			base = Color(1, 1, 1, 0.10)
		_:
			base = Color(1, 1, 1, 0.09)
	var radius := 22 if kind == "big" else 14
	var normal := box(base, radius, Color(1, 1, 1, 0.16), 2, 4 if kind == "big" else 0)
	var hover := box(base.lightened(0.12), radius, Color(1, 1, 1, 0.3), 2, 4 if kind == "big" else 0)
	var pressed := box(base.darkened(0.15), radius, Color(1, 1, 1, 0.3), 2)
	var disabled := box(Color(1, 1, 1, 0.03), radius, Color(1, 1, 1, 0.06), 2)
	for s in [normal, hover, pressed, disabled]:
		s.content_margin_left = 12
		s.content_margin_right = 12
		s.content_margin_top = 6
		s.content_margin_bottom = 6
	b.add_theme_stylebox_override("normal", normal)
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("pressed", pressed)
	b.add_theme_stylebox_override("disabled", disabled)
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	var v := VBoxContainer.new()
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 0)
	v.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var t := UiText.make(label, size, C_TEXT, 0.5, Fonts.title if kind == "big" else null)
	t.name = "Label"
	t.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	if kind == "big":
		t.outline = 6
	v.add_child(t)
	if sub != "":
		var s2 := UiText.make(sub, maxi(11, size - 8), C_SUB, 0.5)
		s2.name = "Sub"
		s2.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		v.add_child(s2)
	b.add_child(v)
	b.custom_minimum_size = Vector2(t.custom_minimum_size.x + 28, (t.custom_minimum_size.y + (size if sub != "" else 0)) + 14)
	b.pressed.connect(func() -> void:
		Sfx.play("click")
		pop(b)
		on_press.call())
	return b


## 선택된 모양 (노란 테두리 + 살짝 밝게)
static func set_selected(b: Button, on: bool) -> void:
	var s: StyleBoxFlat = b.get_theme_stylebox("normal").duplicate()
	s.border_color = C_SELECTED if on else Color(1, 1, 1, 0.16)
	s.set_border_width_all(4 if on else 2)
	s.bg_color = Color(1, 0.82, 0.4, 0.22) if on else s.bg_color
	b.add_theme_stylebox_override("normal", s)
	var h: StyleBoxFlat = b.get_theme_stylebox("hover").duplicate()
	h.border_color = s.border_color
	h.set_border_width_all(s.border_width_left)
	b.add_theme_stylebox_override("hover", h)


## 눌림 연출: 작아졌다가 튀어 오름
static func pop(c: Control) -> void:
	c.pivot_offset = c.size * 0.5
	var tw := c.create_tween()
	tw.tween_property(c, "scale", Vector2(0.92, 0.92), 0.06)
	tw.tween_property(c, "scale", Vector2.ONE, 0.18).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


static func label_of(b: Button) -> UiText:
	return b.find_child("Label", true, false) as UiText


## 위아래 그라데이션 배경
static func gradient_rect(top: Color, bottom: Color) -> TextureRect:
	var g := Gradient.new()
	g.set_color(0, top)
	g.set_color(1, bottom)
	var tex := GradientTexture2D.new()
	tex.gradient = g
	tex.fill_from = Vector2(0, 0)
	tex.fill_to = Vector2(0, 1)
	tex.width = 8
	tex.height = 256
	var r := TextureRect.new()
	r.texture = tex
	r.stretch_mode = TextureRect.STRETCH_SCALE
	r.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	r.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	return r


## 이름 뒤 조사 '이/가' (받침이 있으면 '이')
static func josa_i_ga(word: String) -> String:
	if word.is_empty():
		return "가"
	var code := word.unicode_at(word.length() - 1) - 0xAC00
	return "이" if code >= 0 and code <= 11171 and code % 28 != 0 else "가"

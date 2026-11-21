## 메뉴 화면 부품 (디자인 표준). 모바일 게임처럼 "두툼한 입체 버튼"(아래 테두리가 두꺼운 그림자 면) · 어두운 유리 패널 ·
## 금색 선택 빛 · 굵은 글꼴(검은고딕)을 쓴다. 색 · 모서리 · 눌림 연출을 한곳에서 정한다.
## (2026-11-21 사용자: "유아틱하다" → 둥근 단색 칩 대신 상용 게임 느낌의 부품으로)
class_name Kit
extends RefCounted

const C_BG_TOP := Color("#1a1446")
const C_BG_BOTTOM := Color("#070a1c")
const C_PANEL := Color(0.06, 0.08, 0.2, 0.82)
const C_PANEL_BORDER := Color(0.45, 0.55, 1.0, 0.28)
const C_ACCENT := Color("#ffc93c")
const C_PINK := Color("#ff4fa3")
const C_RED := Color("#ff3b4e")
const C_TEXT := Color("#ffffff")
const C_SUB := Color("#a9b4e8")
const C_SELECTED := Color("#ffc93c")
## 버튼 종류별 [윗면, 아래 두께 면(그림자 색)]
const FACES := {
	"big": [Color("#ff4757"), Color("#a3122a")],
	"chip": [Color("#26306b"), Color("#11173d")],
	"tile": [Color("#26306b"), Color("#11173d")],
	"icon": [Color("#26306b"), Color("#11173d")],
	"go": [Color("#2ecc71"), Color("#17803f")],
}


static func box(bg: Color, radius: int = 14, border: Color = Color(0, 0, 0, 0), border_w: int = 0, shadow: int = 0) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.set_corner_radius_all(radius)
	if border_w > 0:
		s.border_color = border
		s.set_border_width_all(border_w)
	if shadow > 0:
		s.shadow_color = Color(0, 0, 0, 0.45)
		s.shadow_size = shadow
		s.shadow_offset = Vector2(0, shadow * 0.6)
	s.anti_aliasing = true
	return s


## 입체 버튼 면: 아래 테두리를 두껍게(depth) 칠해 "눌리는 버튼"처럼 보이게 한다
static func face(top: Color, bottom: Color, radius: int, depth: int, glow: Color = Color(0, 0, 0, 0)) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = top
	s.set_corner_radius_all(radius)
	s.border_color = bottom
	s.border_width_bottom = depth
	s.border_width_left = 0
	s.border_width_right = 0
	s.border_width_top = 0
	s.border_blend = false
	if glow.a > 0:
		s.shadow_color = glow
		s.shadow_size = 10
	else:
		s.shadow_color = Color(0, 0, 0, 0.35)
		s.shadow_size = 4
		s.shadow_offset = Vector2(0, 3)
	s.content_margin_left = 14
	s.content_margin_right = 14
	s.content_margin_top = 6
	s.content_margin_bottom = 6 + depth
	s.anti_aliasing = true
	return s


static func panel(bg: Color = C_PANEL, radius: int = 18) -> PanelContainer:
	var p := PanelContainer.new()
	var s := box(bg, radius, C_PANEL_BORDER, 2, 8)
	s.content_margin_left = 16
	s.content_margin_right = 16
	s.content_margin_top = 12
	s.content_margin_bottom = 14
	p.add_theme_stylebox_override("panel", s)
	return p


## 글자(그림 문자 포함) 버튼. 누르면 눌렸다가 튀어 오른다.
## @param kind "chip" | "tile" | "big" | "icon" | "go"
static func button(label: String, size: int, kind: String, on_press: Callable, sub: String = "") -> Button:
	var b := Button.new()
	b.focus_mode = Control.FOCUS_NONE
	b.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	b.set_meta("kind", kind)
	_apply_faces(b, kind, false)
	var v := VBoxContainer.new()
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 0)
	v.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var depth := 7 if kind in ["big", "go"] else 4
	v.offset_bottom = -depth # 글자는 윗면 가운데
	var t := UiText.make(label, size, C_TEXT, 0.5, Fonts.title)
	t.name = "Label"
	t.outline = 6 if kind in ["big", "go"] else 4
	t.outline_color = Color(0, 0, 0, 0.55)
	t.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_child(t)
	if sub != "":
		var s2 := UiText.make(sub, maxi(11, size - 7), C_SUB, 0.5)
		s2.name = "Sub"
		s2.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		v.add_child(s2)
	b.add_child(v)
	b.custom_minimum_size = Vector2(t.custom_minimum_size.x + 32, (t.custom_minimum_size.y + (size if sub != "" else 0)) + 16 + depth)
	b.pressed.connect(func() -> void:
		Sfx.play("click")
		pop(b)
		on_press.call())
	return b


static func _apply_faces(b: Button, kind: String, selected: bool) -> void:
	var f: Array = FACES.get(kind, FACES.chip)
	var top: Color = f[0]
	var bottom: Color = f[1]
	if selected:
		top = Color("#ffb627")
		bottom = Color("#b06a00")
	var radius := 20 if kind in ["big", "go"] else 14
	var depth := 7 if kind in ["big", "go"] else 4
	var glow := Color(1, 0.75, 0.2, 0.55) if selected else Color(0, 0, 0, 0)
	b.add_theme_stylebox_override("normal", face(top, bottom, radius, depth, glow))
	b.add_theme_stylebox_override("hover", face(top.lightened(0.1), bottom, radius, depth, glow))
	var pressed := face(top.darkened(0.08), bottom, radius, 2, glow)
	pressed.content_margin_top = 6 + depth - 2 # 눌리면 윗면이 아래로 내려간 것처럼
	b.add_theme_stylebox_override("pressed", pressed)
	var dis := face(Color(0.16, 0.18, 0.3, 0.6), Color(0.08, 0.09, 0.16, 0.6), radius, depth)
	b.add_theme_stylebox_override("disabled", dis)
	b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())


## 선택된 모양 (금색 윗면 + 빛)
static func set_selected(b: Button, on: bool) -> void:
	_apply_faces(b, str(b.get_meta("kind", "chip")), on)
	var l := label_of(b)
	if l:
		l.color = Color("#3a1d00") if on else C_TEXT
		l.outline_color = Color(1, 1, 1, 0.35) if on else Color(0, 0, 0, 0.55)
	var s: UiText = b.find_child("Sub", true, false)
	if s:
		s.color = Color("#5a3300") if on else C_SUB


## 눌림 연출: 작아졌다가 튀어 오름
static func pop(c: Control) -> void:
	c.pivot_offset = c.size * 0.5
	var tw := c.create_tween()
	tw.tween_property(c, "scale", Vector2(0.92, 0.92), 0.06)
	tw.tween_property(c, "scale", Vector2.ONE, 0.2).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


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


## 둥근 빛 텍스처 (가운데가 밝고 바깥으로 사라짐) — 발광 · 입자 · 조명에 쓴다
static func glow_texture(size: int = 128) -> GradientTexture2D:
	var g := Gradient.new()
	g.set_color(0, Color(1, 1, 1, 1))
	g.set_color(1, Color(1, 1, 1, 0))
	g.add_point(0.35, Color(1, 1, 1, 0.55))
	var tex := GradientTexture2D.new()
	tex.gradient = g
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(1.0, 0.5)
	tex.width = size
	tex.height = size
	return tex


## 화면 가장자리를 어둡게 (비네트 — 시선을 가운데로 모은다)
static func vignette_texture() -> GradientTexture2D:
	var g := Gradient.new()
	g.set_color(0, Color(0, 0, 0, 0))
	g.set_color(1, Color(0, 0, 0, 0.6))
	g.add_point(0.62, Color(0, 0, 0, 0))
	var tex := GradientTexture2D.new()
	tex.gradient = g
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(1.05, 0.5)
	tex.width = 256
	tex.height = 256
	return tex


## 빛을 더하는 재질 (겹칠수록 밝아짐 — 불꽃 · 빔 · 섬광)
static func additive() -> CanvasItemMaterial:
	var m := CanvasItemMaterial.new()
	m.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	return m


## 이름 뒤 조사 '이/가' (받침이 있으면 '이')
static func josa_i_ga(word: String) -> String:
	if word.is_empty():
		return "가"
	var code := word.unicode_at(word.length() - 1) - 0xAC00
	return "이" if code >= 0 and code <= 11171 and code % 28 != 0 else "가"

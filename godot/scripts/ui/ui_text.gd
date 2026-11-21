## 메뉴 화면 글자 (Label 대신 — 웹에서 그림 문자를 그리기 위해). 컨테이너 안에서 크기를 스스로 알린다.
class_name UiText
extends Control

var text: String = "":
	set(v):
		text = v
		_rebuild()
var font_size: int = 20:
	set(v):
		font_size = v
		_rebuild()
var color: Color = Color.WHITE:
	set(v):
		color = v
		queue_redraw()
var outline: int = 0:
	set(v):
		outline = v
		queue_redraw()
var outline_color: Color = Color(0, 0, 0, 0.85)
## 0 왼쪽 · 0.5 가운데 · 1 오른쪽
var h_align: float = 0.0:
	set(v):
		h_align = v
		queue_redraw()
## 0 보다 크면 이 폭에서 줄을 바꾼다
var wrap_width: float = 0.0:
	set(v):
		wrap_width = v
		_rebuild()
var font: Font = null

var _lines: Array = []
var _box := Vector2.ZERO


static func make(t: String, size: int, col: Color = Color.WHITE, align: float = 0.0, f: Font = null) -> UiText:
	var n := UiText.new()
	n.font = f
	n.mouse_filter = Control.MOUSE_FILTER_IGNORE
	n.font_size = size
	n.color = col
	n.h_align = align
	n.text = t
	return n


func _font() -> Font:
	return font if font != null else Fonts.main


func _rebuild() -> void:
	var f := _font()
	if f == null:
		return
	_lines.clear()
	var raw: PackedStringArray = TextDraw.wrap(text, f, font_size, wrap_width) if wrap_width > 0 else text.split("\n")
	var w := 0.0
	for line in raw:
		var segs := TextDraw.segments(line, f)
		var lw := TextDraw.line_width(segs, f, font_size)
		_lines.append({"segs": segs, "w": lw})
		w = maxf(w, lw)
	_box = Vector2(ceil(w) + 2, ceil(f.get_height(font_size) * _lines.size()))
	custom_minimum_size = Vector2(wrap_width if wrap_width > 0 else _box.x, _box.y)
	update_minimum_size()
	queue_redraw()


func _draw() -> void:
	var f := _font()
	var lh := f.get_height(font_size)
	var top := (size.y - _box.y) * 0.5
	for i in _lines.size():
		var L: Dictionary = _lines[i]
		var x := (size.x - float(L.w)) * h_align
		TextDraw.draw_line(self, Vector2(x, top + lh * i), L.segs, f, font_size, color, outline, outline_color)

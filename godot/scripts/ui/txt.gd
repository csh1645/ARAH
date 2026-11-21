## 게임 화면 글자 (Phaser Text 대신). 기준점(origin) · 테두리 · 여러 줄 · 그림 문자를 지원한다.
## 예: Txt.make("정답!", 30, Color("#ffd166"), 6) → 가운데 기준 (origin 0.5, 0.5)
class_name Txt
extends Node2D

var text: String = "":
	set(v):
		if v == text:
			return
		text = v
		_rebuild()
var font_size: int = 24:
	set(v):
		font_size = maxi(6, v)
		_rebuild()
var color: Color = Color.WHITE:
	set(v):
		color = v
		queue_redraw()
var outline: int = 0:
	set(v):
		outline = v
		queue_redraw()
var outline_color: Color = Color.BLACK:
	set(v):
		outline_color = v
		queue_redraw()
## 기준점 (0,0 = 왼쪽 위, 0.5,0.5 = 가운데, 1,0 = 오른쪽 위)
var origin: Vector2 = Vector2(0.5, 0.5):
	set(v):
		origin = v
		queue_redraw()
## 여러 줄일 때 줄 맞춤 (0 왼쪽 · 0.5 가운데 · 1 오른쪽)
var align: float = 0.5
var font: Font = null:
	set(v):
		font = v
		_rebuild()
## 0 보다 크면 이 폭에서 줄을 바꾼다
var wrap_width: float = 0.0:
	set(v):
		wrap_width = v
		_rebuild()

## 글자 덩어리 크기 (px, 배율 전)
var box: Vector2 = Vector2.ZERO
var _lines: Array = []


static func make(t: String, size: int, col: Color = Color.WHITE, outline_px: int = 0, outline_col: Color = Color.BLACK, org: Vector2 = Vector2(0.5, 0.5), f: Font = null) -> Txt:
	var n := Txt.new()
	n.font = f
	n.font_size = size
	n.color = col
	n.outline = outline_px
	n.outline_color = outline_col
	n.origin = org
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
	box = Vector2(w, f.get_height(font_size) * _lines.size())
	queue_redraw()


## 글자가 max_w 보다 넓으면 글자 크기를 줄여 한 줄에 맞춘다 (웹 판 fitText)
func fit(size: int, max_w: float, min_size: int) -> void:
	font_size = size
	if box.x > max_w:
		font_size = maxi(min_size, int(floor(size * max_w / box.x)))


## 화면(부모 기준) 위의 글자 영역 — 누르기 판정용
func hit_rect() -> Rect2:
	var s := scale.abs()
	return Rect2(position - box * origin * s, box * s)


func _draw() -> void:
	if _lines.is_empty():
		return
	var f := _font()
	var tl := -box * origin
	var lh := f.get_height(font_size)
	for i in _lines.size():
		var L: Dictionary = _lines[i]
		var x := tl.x + (box.x - float(L.w)) * align
		TextDraw.draw_line(self, Vector2(x, tl.y + lh * i), L.segs, f, font_size, color, outline, outline_color)

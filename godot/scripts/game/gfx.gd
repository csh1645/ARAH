## 즉시 그리기 그래픽 (Phaser Graphics 와 같은 사용법). 웹 판 그리기 코드를 거의 그대로 옮기기 위한 도구.
##   g.clear(); g.line_style(3, 0xffffff, 1); g.line_between(x1, y1, x2, y2); g.fill_style(0xff0000); g.fill_circle(x, y, r)
## 색은 0xRRGGBB 정수 또는 Color. 명령을 모아 두었다가 _draw 에서 다시 그린다.
## Gfx.flash(parent, ms, painter) — 진행도 t(0→1)마다 painter(g, t) 로 다시 그리고 끝나면 사라지는 연출.
class_name Gfx
extends Node2D

var _cmds: Array = []
var _line_w := 1.0
var _line_c := Color.WHITE
var _fill_c := Color.WHITE
var _path := PackedVector2Array()


static func col(c: Variant, alpha: float = 1.0) -> Color:
	if c is Color:
		return Color(c.r, c.g, c.b, c.a * alpha)
	var v := int(c)
	return Color8((v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff, int(clampf(alpha, 0.0, 1.0) * 255))


## 잠깐 그렸다가 사라지는 그래픽 (웹 판 signatures.js flash)
static func flash(parent: Node, ms: float, painter: Callable, z: int = 41) -> Gfx:
	var g := Gfx.new()
	g.z_index = z
	parent.add_child(g)
	painter.call(g, 0.0)
	var tw := g.create_tween()
	tw.tween_method(func(t: float) -> void:
		g.clear()
		painter.call(g, t), 0.0, 1.0, ms / 1000.0)
	tw.tween_callback(g.queue_free)
	return g


func clear() -> Gfx:
	_cmds.clear()
	queue_redraw()
	return self


func line_style(width: float, color: Variant, alpha: float = 1.0) -> Gfx:
	_line_w = width
	_line_c = col(color, alpha)
	return self


func fill_style(color: Variant, alpha: float = 1.0) -> Gfx:
	_fill_c = col(color, alpha)
	return self


func _add(cmd: Array) -> void:
	_cmds.append(cmd)
	queue_redraw()


func line_between(x1: float, y1: float, x2: float, y2: float) -> void:
	if _line_w <= 0.0 or _line_c.a <= 0.0:
		return
	_add(["line", Vector2(x1, y1), Vector2(x2, y2), _line_c, _line_w])


func fill_circle(x: float, y: float, r: float) -> void:
	if r <= 0.0:
		return
	_add(["circle", Vector2(x, y), r, _fill_c])


func stroke_circle(x: float, y: float, r: float) -> void:
	if r <= 0.0 or _line_w <= 0.0:
		return
	_add(["arc", Vector2(x, y), r, 0.0, TAU, _line_c, _line_w])


func stroke_arc(x: float, y: float, r: float, a0: float, a1: float) -> void:
	_add(["arc", Vector2(x, y), r, a0, a1, _line_c, _line_w])


func fill_rect(x: float, y: float, w: float, h: float) -> void:
	_add(["rect", Rect2(x, y, w, h), _fill_c, true, 0.0])


func stroke_rect(x: float, y: float, w: float, h: float) -> void:
	_add(["rect", Rect2(x, y, w, h), _line_c, false, _line_w])


func fill_rounded_rect(x: float, y: float, w: float, h: float, r: float) -> void:
	_add(["poly", _round_rect(x, y, w, h, r), _fill_c])


func stroke_rounded_rect(x: float, y: float, w: float, h: float, r: float) -> void:
	var pts := _round_rect(x, y, w, h, r)
	pts.append(pts[0])
	_add(["polyline", pts, _line_c, _line_w])


func fill_triangle(x1: float, y1: float, x2: float, y2: float, x3: float, y3: float) -> void:
	_add(["poly", PackedVector2Array([Vector2(x1, y1), Vector2(x2, y2), Vector2(x3, y3)]), _fill_c])


func fill_ellipse(x: float, y: float, w: float, h: float) -> void:
	_add(["poly", _ellipse(x, y, w * 0.5, h * 0.5), _fill_c])


func stroke_ellipse(x: float, y: float, w: float, h: float) -> void:
	var pts := _ellipse(x, y, w * 0.5, h * 0.5)
	pts.append(pts[0])
	_add(["polyline", pts, _line_c, _line_w])


func fill_points(pts: PackedVector2Array) -> void:
	if pts.size() >= 3:
		_add(["poly", pts, _fill_c])


## 위아래 두 색 그라데이션 사각형 (Phaser fillGradientStyle + fillRect)
func fill_gradient_rect(x: float, y: float, w: float, h: float, top: Variant, bottom: Variant, alpha: float = 1.0) -> void:
	var a := col(top, alpha)
	var b := col(bottom, alpha)
	_add(["grad", PackedVector2Array([Vector2(x, y), Vector2(x + w, y), Vector2(x + w, y + h), Vector2(x, y + h)]), PackedColorArray([a, a, b, b])])


func begin_path() -> void:
	_path = PackedVector2Array()


func move_to(x: float, y: float) -> void:
	_path = PackedVector2Array([Vector2(x, y)])


func line_to(x: float, y: float) -> void:
	_path.append(Vector2(x, y))


func stroke_path() -> void:
	if _path.size() >= 2:
		_add(["polyline", _path.duplicate(), _line_c, _line_w])


func fill_path() -> void:
	fill_points(_path.duplicate())


func _ellipse(x: float, y: float, rx: float, ry: float) -> PackedVector2Array:
	var pts := PackedVector2Array()
	var n := clampi(int((rx + ry) * 0.6), 12, 48)
	for i in n:
		var a := TAU * i / n
		pts.append(Vector2(x + cos(a) * rx, y + sin(a) * ry))
	return pts


func _round_rect(x: float, y: float, w: float, h: float, r: float) -> PackedVector2Array:
	r = minf(r, minf(w, h) * 0.5)
	var pts := PackedVector2Array()
	var corners := [[x + w - r, y + r, -PI / 2], [x + w - r, y + h - r, 0.0], [x + r, y + h - r, PI / 2], [x + r, y + r, PI]]
	for c in corners:
		for i in 7:
			var a: float = c[2] + (PI / 2) * i / 6.0
			pts.append(Vector2(c[0] + cos(a) * r, c[1] + sin(a) * r))
	return pts


func _draw() -> void:
	for c in _cmds:
		match c[0]:
			"line":
				draw_line(c[1], c[2], c[3], c[4], true)
			"circle":
				draw_circle(c[1], c[2], c[3], true, -1.0, true)
			"arc":
				draw_arc(c[1], c[2], c[3], c[4], clampi(int(c[2] * 0.8), 16, 64), c[5], c[6], true)
			"rect":
				if c[3]:
					draw_rect(c[1], c[2], true)
				else:
					draw_rect(c[1], c[2], false, c[4])
			"poly":
				if Geometry2D.triangulate_polygon(c[1]).size() > 0:
					draw_colored_polygon(c[1], c[2])
			"polyline":
				draw_polyline(c[1], c[2], c[3], true)
			"grad":
				draw_polygon(c[1], c[2])

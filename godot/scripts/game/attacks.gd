## 팀별 공격 스타일 (보기를 고를 때 무엇이 날아가는지) — 웹 판 game/attacks.js 를 그대로 옮겼다.
## 거미 = 거미줄, 아머 = 빔, 방패 = 방패 던지기, 번개 = 번개, 거인 = 점프 내려찍기, 궁수 = 화살, 마법 = 마법 구슬, 표범 = 발톱.
## 놀이는 날아가는 위치(투사체 머리)만 계산하고 모양은 draw(), 맞았을 때 연출은 hit() 에 맡긴다.
class_name Attacks
extends RefCounted

## 스타일 정보: speed 투사체 속도 배율 · rope 손과 머리를 줄로 잇는지 · melee 근접(쏘지 않고 뛰어들어 때림, 점프 높이) · returns 보스전에서 돌아옴
const STYLES := {
	"web": {"name": "거미줄", "speed": 1.0, "rope": true},
	"laser": {"name": "빔", "speed": 2.8, "rope": true},
	"shield": {"name": "방패 던지기", "speed": 1.25, "rope": false, "returns": true},
	"bolt": {"name": "번개", "speed": 2.2, "rope": true},
	"rock": {"name": "점프 내려찍기", "speed": 0.9, "rope": false, "melee": 230},
	"arrow": {"name": "화살", "speed": 1.7, "rope": false},
	"orb": {"name": "마법 구슬", "speed": 1.1, "rope": false},
	"claw": {"name": "발톱 할퀴기", "speed": 1.5, "rope": false, "melee": 70},
}


## 히어로 팀의 공격 스타일 (key 포함)
static func of(hero: Dictionary) -> Dictionary:
	var key := str(Data.find_family(hero).get("attack", "web"))
	if not STYLES.has(key):
		key = "web"
	var s: Dictionary = STYLES[key].duplicate()
	s.key = key
	return s


static func _hex(look: Dictionary, k: String, fallback: String = "#ffffff") -> Color:
	return Color(str(look.get(k, fallback)))


static func _dir(from: Vector2, to: Vector2) -> Vector2:
	var d := to - from
	return d.normalized() if d.length() > 0.001 else Vector2.RIGHT


static func _zigzag(g: Gfx, from: Vector2, to: Vector2, jitter: float, steps: int) -> void:
	g.move_to(from.x, from.y)
	for i in range(1, steps):
		var t := float(i) / steps
		g.line_to(from.x + (to.x - from.x) * t + randf_range(-jitter, jitter), from.y + (to.y - from.y) * t + randf_range(-jitter, jitter))
	g.line_to(to.x, to.y)
	g.stroke_path()


## 투사체 그리기. time = 장면 시간 ms (회전 · 깜빡임)
static func draw(key: String, g: Gfx, from: Vector2, to: Vector2, color: Color, time: float, look: Dictionary) -> void:
	match key:
		"laser":
			var w := 7.0 + sin(time / 30.0) * 2.0
			g.line_style(w + 6, color, 0.25)
			g.line_between(from.x, from.y, to.x, to.y)
			g.line_style(w, color, 0.9)
			g.line_between(from.x, from.y, to.x, to.y)
			g.line_style(2, 0xffffff, 1)
			g.line_between(from.x, from.y, to.x, to.y)
			g.fill_style(0xffffff, 1)
			g.fill_circle(to.x, to.y, 7)
		"shield":
			var r := 15.0
			var rx := r * maxf(0.35, absf(cos(time / 40.0)))
			g.fill_style(_hex(look, "accent"), 1)
			g.fill_ellipse(to.x, to.y, rx * 2, r * 2)
			g.fill_style(_hex(look, "line"), 1)
			g.fill_ellipse(to.x, to.y, rx * 1.5, r * 1.5)
			g.fill_style(_hex(look, "suit"), 1)
			g.fill_ellipse(to.x, to.y, rx * 0.8, r * 0.8)
		"bolt":
			g.line_style(7, 0xffd166, 0.35)
			_zigzag(g, from, to, 12, 8)
			g.line_style(3, 0xfff3b0, 1)
			_zigzag(g, from, to, 10, 8)
		"rock":
			var d := _dir(from, to)
			g.fill_style(0x8d6e63, 0.35)
			for i in range(1, 4):
				g.fill_circle(to.x - d.x * i * 12, to.y - d.y * i * 12, 9 - i * 2)
			g.fill_style(0x795548, 1)
			g.fill_circle(to.x, to.y, 13)
			g.fill_style(0x5d4037, 1)
			g.fill_circle(to.x + 4 * cos(time / 80.0), to.y + 4 * sin(time / 80.0), 4)
		"arrow":
			var d := _dir(from, to)
			var tail := to - d * 34
			var p := Vector2(-d.y, d.x)
			g.line_style(3, 0x8d6e63, 1)
			g.line_between(tail.x, tail.y, to.x, to.y)
			g.fill_style(0xe0e0e0, 1)
			var tip := to + d * 10
			g.fill_triangle(tip.x, tip.y, to.x + p.x * 5, to.y + p.y * 5, to.x - p.x * 5, to.y - p.y * 5)
			g.fill_style(color, 1)
			var back := tail + d * 4
			for k in [1, -1]:
				var f: Vector2 = tail - d * 8 + p * 6 * k
				g.fill_triangle(tail.x, tail.y, f.x, f.y, back.x, back.y)
		"orb":
			var pulse := 1.0 + sin(time / 60.0) * 0.15
			g.fill_style(color, 0.25)
			g.fill_circle(to.x, to.y, 18 * pulse)
			g.fill_style(color, 0.6)
			g.fill_circle(to.x, to.y, 11 * pulse)
			g.fill_style(0xffffff, 1)
			g.fill_circle(to.x, to.y, 5)
			g.fill_style(0xfff3b0, 0.9)
			for i in 3:
				var a := time / 120.0 + i * TAU / 3.0
				g.fill_circle(to.x + cos(a) * 20, to.y + sin(a) * 20, 2.5)
		"claw":
			var d := _dir(from, to)
			var p := Vector2(-d.y, d.x)
			g.line_style(3, color, 0.95)
			for k in [-1, 0, 1]:
				var o: Vector2 = p * k * 8
				g.line_between(to.x + o.x - d.x * 22, to.y + o.y - d.y * 22, to.x + o.x + d.x * 6, to.y + o.y + d.y * 6)
		_: # web
			g.line_style(2, color, 0.85)
			g.line_between(from.x, from.y, to.x, to.y)
			g.fill_style(color, 1)
			g.fill_circle(to.x, to.y, 5)


## 맞은 자리에서 잠깐 퍼지는 고리
static func ring(s: Node, x: float, y: float, color: Variant, r: float) -> void:
	Gfx.flash(s, 300, func(g: Gfx, t: float) -> void:
		g.line_style(4, color, 0.9 * (1.0 - t))
		g.stroke_circle(x, y, r * (1.0 + t)), 40)


## 맞았을 때 팀별 연출 (s = RoundBase)
static func hit(key: String, s: Node, x: float, y: float) -> void:
	match key:
		"laser":
			ring(s, x, y, 0x9be7ff, 18)
			s.flash_screen(Color("#9be7ff"), 0.18)
		"shield":
			ring(s, x, y, 0xffffff, 16)
			s.spark_burst(x, y, 10)
		"bolt":
			s.flash_screen(Color("#fff3b0"), 0.3)
			s.shake(0.12, 0.005)
			ring(s, x, y, 0xffd166, 20)
		"rock":
			s.shake(0.18, 0.01)
			s.spark_burst(x, y, 16)
			ring(s, x, y, 0xd4a373, 20)
		"arrow":
			ring(s, x, y, 0xc77dff, 12)
		"orb":
			s.spark_burst(x, y, 20)
			ring(s, x, y, 0xff9f1c, 18)
		"claw":
			Gfx.flash(s, 400, func(g: Gfx, t: float) -> void:
				g.line_style(4, 0xb388ff, 1.0 - t)
				for k in [-1, 0, 1]:
					g.line_between(x - 18 + k * 10, y - 20, x + 6 + k * 10, y + 20), 40)
		_:
			ring(s, x, y, 0xffffff, 14)

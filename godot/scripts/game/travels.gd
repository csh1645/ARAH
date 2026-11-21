## 팀별 "건너가기" 연출 (빌딩 스윙에서 정답 빌딩으로 이동) — 웹 판 game/travels.js 를 옮겼다.
## 거미 = 거미줄 스윙, 아머 = 제트 비행, 방패 = 공중제비, 번개 = 번개 비행, 거인 = 거인 점프, 궁수 = 화살 줄타기,
## 마법 = 순간이동, 표범 = 두 번 도약. 모든 이동은 히어로를 from → to 로 옮기고 끝나면 done 을 한 번 부른다.
## ctx = {s: RoundBase, from: Vector2, to: Vector2, anchor: Vector2, color: Color, set_line: Callable(Dictionary), done: Callable}
## 줄(line) = {to: Vector2 또는 Callable, from?: Vector2, color, zigzag?: bool} — 모드가 매 프레임 그린다.
class_name Travels
extends RefCounted

const BASE_MS := 850.0


static func play(key: String, ctx: Dictionary) -> void:
	match key:
		"fly": _fly(ctx)
		"vault": _vault(ctx)
		"bolt": _bolt(ctx)
		"leap": _leap(ctx)
		"zip": _zip(ctx)
		"teleport": _teleport(ctx)
		"pounce": _pounce(ctx)
		_: _swing(ctx)


static func _speed(s: Node) -> float:
	return float(s.ab.get("webSpeed", 1.0))


## t 0→1 을 ms 동안 step(t, frame) 로 부르는 공통 진행
static func _run(s: Node, ms: float, ease: String, step: Callable, done: Callable) -> void:
	var frame := [0]
	s.tween_t(ms, func(t: float) -> void:
		step.call(t, frame[0])
		frame[0] += 1, ease, done)


## 🕸️ 거미줄 스윙: 안테나에 줄을 걸고 아래로 처지는 곡선으로
static func _swing(ctx: Dictionary) -> void:
	var s: Node = ctx.s
	var S: Vector2 = ctx.from
	var E: Vector2 = ctx.to
	var C := Vector2((S.x + E.x) / 2, maxf(S.y, E.y) + 130)
	ctx.set_line.call({"to": ctx.anchor, "color": ctx.color})
	_run(s, BASE_MS / _speed(s), "sine_inout", func(t: float, f: int) -> void:
		s.player.position = RoundBase.bezier2(S, C, E, t)
		s.player.rotation_degrees = -25 + 50 * t
		if f % 3 == 0:
			s.ghost_trail(), func() -> void:
		ctx.set_line.call({})
		ctx.done.call())


## ⚙️ 제트 비행: 발에서 불꽃을 뿜으며 솟았다가 내려앉는다
static func _fly(ctx: Dictionary) -> void:
	var s: Node = ctx.s
	var S: Vector2 = ctx.from
	var E: Vector2 = ctx.to
	var C := Vector2((S.x + E.x) / 2, minf(S.y, E.y) - 140)
	_run(s, (BASE_MS + 100) / _speed(s), "sine_inout", func(t: float, f: int) -> void:
		s.player.position = RoundBase.bezier2(S, C, E, t)
		s.player.rotation_degrees = -15 + 25 * t
		if f % 2 == 0:
			var flame := Gfx.new()
			flame.fill_style([0xffb703, 0xfb8500, 0xffd166].pick_random(), 1)
			flame.fill_circle(0, 0, randf_range(4, 8))
			flame.position = s.player.position + Vector2(randf_range(-6, 6), 48)
			flame.z_index = s.player.z_index - 1
			s.add_child(flame)
			var tw := flame.create_tween().set_parallel(true)
			tw.tween_property(flame, "position:y", flame.position.y + 30, 0.26)
			tw.tween_property(flame, "modulate:a", 0.0, 0.26)
			tw.tween_property(flame, "scale", Vector2(0.3, 0.3), 0.26)
			tw.chain().tween_callback(flame.queue_free), ctx.done)


## 🛡️ 방패 공중제비: 높이 뛰어 한 바퀴, 방패가 곁에서 함께 돈다
static func _vault(ctx: Dictionary) -> void:
	var s: Node = ctx.s
	var S: Vector2 = ctx.from
	var E: Vector2 = ctx.to
	var C := Vector2((S.x + E.x) / 2, minf(S.y, E.y) - 170)
	var look: Dictionary = s.hero.get("look", {})
	var shield := Gfx.new()
	shield.fill_style(Color(str(look.get("accent", "#c1121f"))), 1)
	shield.fill_circle(0, 0, 14)
	shield.fill_style(Color(str(look.get("line", "#ffffff"))), 1)
	shield.fill_circle(0, 0, 9)
	shield.fill_style(Color(str(look.get("suit", "#1e40af"))), 1)
	shield.fill_circle(0, 0, 5)
	shield.z_index = s.player.z_index + 1
	shield.position = S
	s.add_child(shield)
	_run(s, (BASE_MS + 50) / _speed(s), "sine_inout", func(t: float, _f: int) -> void:
		s.player.position = RoundBase.bezier2(S, C, E, t)
		s.player.rotation_degrees = 360 * t
		shield.position = s.player.position + Vector2(cos(t * 12) * 34, sin(t * 12) * 20), func() -> void:
		shield.queue_free()
		ctx.done.call())


## ⚡ 번개 비행: 번개 자국을 남기며 일직선으로
static func _bolt(ctx: Dictionary) -> void:
	var s: Node = ctx.s
	var S: Vector2 = ctx.from
	var E: Vector2 = ctx.to
	ctx.set_line.call({"from": S, "to": func() -> Vector2: return s.player.position, "color": Color("#ffd166"), "zigzag": true})
	_run(s, BASE_MS * 0.6 / _speed(s), "quad_in", func(t: float, _f: int) -> void:
		s.player.position = S.lerp(E, t)
		s.player.rotation_degrees = -12, func() -> void:
		ctx.set_line.call({})
		s.flash_screen(Color("#fff3b0"), 0.3)
		s.spark_burst(E.x, E.y, 16)
		ctx.done.call())


## 💪 거인 점프: 아주 높이 뛰어 "쿵!" 착지, 화면이 흔들린다
static func _leap(ctx: Dictionary) -> void:
	var s: Node = ctx.s
	var S: Vector2 = ctx.from
	var E: Vector2 = ctx.to
	var C := Vector2((S.x + E.x) / 2, minf(S.y, E.y) - 240)
	var p: Sprite2D = s.player
	var tw := p.create_tween()
	tw.tween_property(p, "scale:y", 0.75, 0.12)
	tw.tween_property(p, "scale:y", 1.0, 0.12)
	_run(s, (BASE_MS + 250) / _speed(s), "sine_inout", func(t: float, _f: int) -> void:
		p.position = RoundBase.bezier2(S, C, E, t), func() -> void:
		s.shake(0.22, 0.012)
		s.spark_burst(E.x, E.y + 45, 22)
		s.popup(E.x, E.y - 70, "쿵!", Color("#d4a373"))
		ctx.done.call())


## 🎯 화살 줄타기: 안테나에 화살 줄을 쏘고 줄을 타고 미끄러져 옥상에 내린다
static func _zip(ctx: Dictionary) -> void:
	var s: Node = ctx.s
	var S: Vector2 = ctx.from
	var E: Vector2 = ctx.to
	var anchor: Vector2 = ctx.anchor
	var tip := [s.hand()]
	ctx.set_line.call({"to": func() -> Vector2: return tip[0], "color": ctx.color})
	var speed := _speed(s)
	s.tween_t(220 / speed, func(t: float) -> void: tip[0] = tip[0].lerp(anchor, t), "linear", func() -> void:
		var R := Vector2(anchor.x - 12, anchor.y + 46)
		ctx.set_line.call({"to": anchor, "color": ctx.color})
		_run(s, 460 / speed, "quad_in", func(t: float, _f: int) -> void:
			s.player.position = S.lerp(R, t)
			s.player.rotation_degrees = -10, func() -> void:
			ctx.set_line.call({})
			var p: Sprite2D = s.player
			var tw := p.create_tween().set_parallel(true)
			tw.tween_property(p, "position", E, 0.22).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
			tw.tween_property(p, "rotation_degrees", 0.0, 0.22)
			tw.chain().tween_callback(ctx.done)))


## 🔮 순간이동: 포털 속으로 사라졌다가 도착 지점 포털에서 나타난다
static func _teleport(ctx: Dictionary) -> void:
	var s: Node = ctx.s
	var S: Vector2 = ctx.from
	var E: Vector2 = ctx.to
	var p: Sprite2D = s.player
	var portal := func(pos: Vector2) -> Gfx:
		var g := Gfx.new()
		g.position = pos
		g.z_index = p.z_index - 1
		g.scale = Vector2.ZERO
		g.line_style(4, 0xff9f1c, 1)
		g.stroke_ellipse(0, 0, 90, 34)
		g.line_style(2, 0xffd166, 0.8)
		g.stroke_ellipse(0, 0, 64, 22)
		s.add_child(g)
		var tw := g.create_tween().set_parallel(true)
		tw.tween_property(g, "scale", Vector2.ONE, 0.3)
		tw.tween_property(g, "rotation_degrees", 180.0, 0.3)
		return g
	var p1: Gfx = portal.call(S + Vector2(0, 40))
	Sfx.play("teleport")
	var dur := 0.28 / _speed(s)
	var k: float = s.hero_scale
	var tw := p.create_tween().set_parallel(true)
	tw.tween_property(p, "scale", Vector2.ZERO, dur).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_IN)
	tw.tween_property(p, "modulate:a", 0.0, dur)
	tw.tween_property(p, "rotation_degrees", 180.0, dur)
	tw.chain().tween_callback(func() -> void:
		var t1 := p1.create_tween()
		t1.tween_property(p1, "scale", Vector2.ZERO, 0.2)
		t1.tween_callback(p1.queue_free)
		p.position = E
		var p2: Gfx = portal.call(E + Vector2(0, 40))
		s.spark_burst(E.x, E.y, 18)
		var t2 := p.create_tween().set_parallel(true)
		t2.tween_property(p, "scale", Vector2(k, k), dur + 0.06).set_delay(0.12).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		t2.tween_property(p, "modulate:a", 1.0, dur + 0.06).set_delay(0.12)
		t2.tween_property(p, "rotation_degrees", 0.0, dur + 0.06).set_delay(0.12)
		t2.chain().tween_callback(func() -> void:
			var t3 := p2.create_tween()
			t3.tween_property(p2, "scale", Vector2.ZERO, 0.2)
			t3.tween_callback(p2.queue_free)
			ctx.done.call()))


## 🐾 표범 점프: 낮고 빠르게 두 번 도약 (잔상)
static func _pounce(ctx: Dictionary) -> void:
	var s: Node = ctx.s
	var S: Vector2 = ctx.from
	var E: Vector2 = ctx.to
	var M := Vector2((S.x + E.x) / 2, minf(S.y, E.y) - 20)
	var hop := func(A1: Vector2, B1: Vector2, next: Callable) -> void:
		var C := Vector2((A1.x + B1.x) / 2, minf(A1.y, B1.y) - 90)
		_run(s, 340 / _speed(s), "quad_out", func(t: float, f: int) -> void:
			s.player.position = RoundBase.bezier2(A1, C, B1, t)
			s.player.rotation_degrees = 18 - 10 * t
			if f % 2 == 0:
				s.ghost_trail(), next)
	hop.call(S, M, func() -> void: hop.call(M, E, ctx.done))

## 🏙️ 빌딩 스윙 — 웹 판 game/modes/swing-mode.js 를 옮겼다.
## 보기가 적힌 간판을 단 빌딩들이 밀려 들어온다. 정답 빌딩을 누르면 팀별 방법(travels.gd)으로 건너간다.
## 오답: 건너가다 실패(하트 -1, 같은 문제 계속) / 시간 초과: 정답을 알려 주고 자동으로 건너감(점수 없음).
## 조작: 빌딩 누르기 · ←→ 선택 + 스페이스/엔터 · 숫자 1~4
extends RoundBase

const START_X := 115.0
const START_W := 150.0
const START_ROOF := 430.0
const TARGET_LEFT := 260.0
const TARGET_RIGHT := 945.0
const ROOF_RANGE := [330.0, 440.0]
const SIGN_H := 56.0
const SIGN_GAP := 10.0
const ANCHOR_RISE := 135.0
const HERO_FOOT := 51.0
const TIMER_Y := HUD_H + 4
const TIMER_H := 8.0
const BUILDING_COLORS := [0x23284f, 0x2d2350, 0x1f3350, 0x332a4f]
const ZIGZAG_STEPS := 9
const SCROLL_MS := 600.0
const NEXT_DELAY := 1000.0

var targets: Array = []
var selected := 0
var keyboard_used := false
var swinging := false
var line: Dictionary = {}
var landed: Variant = null
var current: Dictionary = {}
var time_limit := 0.0
var time_left := 0.0
var _web_gfx: Gfx
var _timer_gfx: Gfx


func intro_text() -> String:
	return "%s 출동!\n정답 빌딩으로 %s!" % [hero.name, family.travelName]


func create_world() -> void:
	draw_backdrop({"city": {"baseY": H, "color": 0x141838, "range": [220, 360]}})
	current = _make_building(START_X, START_ROOF, START_W, "")
	create_hero(START_X, START_ROOF - HERO_FOOT)
	_web_gfx = Gfx.new()
	_web_gfx.z_index = Z_WEB
	add_child(_web_gfx)
	_timer_gfx = Gfx.new()
	_timer_gfx.z_index = Z_HUD
	add_child(_timer_gfx)


# ---------- 빌딩 ----------

func _make_building(cx: float, roof_y: float, w: float, label: String) -> Dictionary:
	var c := Node2D.new()
	c.position.x = cx
	c.z_index = Z_WORLD
	var g := Gfx.new()
	g.fill_style(BUILDING_COLORS.pick_random(), 1)
	g.fill_rect(-w / 2, roof_y, w, H - roof_y + 400)
	g.fill_style(0x3b4170, 1)
	g.fill_rect(-w / 2 - 4, roof_y - 6, w + 8, 8)
	g.fill_style(0xffd166, 0.55)
	var y := roof_y + 18
	while y < H - 10:
		var x := -w / 2 + 12
		while x < w / 2 - 12:
			if randf() < 0.4:
				g.fill_rect(x, y, 9, 11)
			x += 20
		y += 24
	c.add_child(g)
	add_child(c)
	var b := {"c": c, "roofY": roof_y, "w": w, "label": label, "isCorrect": false, "used": false, "signParts": [], "homeX": cx}
	if label == "":
		return b
	var size := 20 if label.length() > 7 else (26 if label.length() > 4 else 32)
	var sign_bottom := roof_y - SIGN_GAP
	var sign_top := sign_bottom - SIGN_H
	var text := Txt.make(label, size, Color.WHITE)
	text.position = Vector2(0, (sign_top + sign_bottom) / 2 + 2)
	var sw := maxf(84.0, text.box.x + 28)
	b.anchorY = maxf(HUD_H + 40, roof_y - ANCHOR_RISE)
	var s := Gfx.new()
	s.line_style(4, 0x8d99ae, 1)
	s.line_between(0, sign_top, 0, b.anchorY)
	s.line_between(-sw / 2 + 14, sign_bottom, -sw / 2 + 14, roof_y)
	s.line_between(sw / 2 - 14, sign_bottom, sw / 2 - 14, roof_y)
	s.fill_style(0xff4d6d, 1)
	s.fill_circle(0, b.anchorY, 6)
	s.fill_style(0x111633, 1)
	s.fill_rounded_rect(-sw / 2, sign_top, sw, SIGN_H, 12)
	s.line_style(3, 0x4cc9f0, 1)
	s.stroke_rounded_rect(-sw / 2, sign_top, sw, SIGN_H, 12)
	var hl := Gfx.new()
	hl.line_style(5, 0xffd166, 1)
	hl.stroke_rounded_rect(-sw / 2 - 6, sign_top - 6, sw + 12, SIGN_H + 12, 16)
	hl.visible = false
	c.add_child(s)
	c.add_child(text)
	c.add_child(hl)
	b.text = text
	b.hl = hl
	b.signW = sw
	b.signParts = [s, text, hl]
	return b


func start_wave(nq: Dictionary) -> void:
	var n: int = nq.choices.size()
	var slot := (TARGET_RIGHT - TARGET_LEFT) / n
	var w := minf(140.0, slot - 24)
	var decoy := decoy_index(nq)
	targets = []
	for i in n:
		var label := str(nq.choices[i])
		var cx := TARGET_LEFT + slot * (i + 0.5)
		var b := _make_building(cx, randf_range(ROOF_RANGE[0], ROOF_RANGE[1]), w, label)
		b.isCorrect = label == str(nq.answer)
		if i == decoy:
			b.used = true
			b.c.modulate.a = 0.3
		b.homeX = cx
		b.c.position.x = cx + W
		b.slide = tween_to(b.c, {"position:x": cx}, 500, "cubic_out", i * 80.0)
		targets.append(b)
	selected = 0
	for i in targets.size():
		if not targets[i].used:
			selected = i
			break
	_update_highlight()
	time_limit = time_limit_ms(level_value("swingTimeByLevel"))
	time_left = time_limit
	swinging = false


## 밀려 들어오는 중인 빌딩을 제자리에 세운다 (다 들어오기 전에 고르면 화면 밖으로 날아가던 문제 방지)
func _settle_targets() -> void:
	for b in targets:
		if b.has("slide") and b.slide.is_valid():
			b.slide.kill()
		b.c.position.x = b.homeX


## 착지한 빌딩을 왼쪽 시작 위치로 옮기고 나머지는 화면 밖으로 흘려보낸다
func clear_wave() -> void:
	_timer_gfx.clear()
	line = {}
	var l: Variant = landed
	landed = null
	var dx: float = START_X - l.c.position.x if l != null else 0.0
	var all := [current]
	all.append_array(targets)
	for b in all:
		if b.is_empty() or (l != null and b.c == l.c):
			continue
		var c: Node2D = b.c
		var tw := c.create_tween().set_parallel(true)
		tw.tween_property(c, "position:x", c.position.x + dx, SCROLL_MS / 1000.0)
		tw.tween_property(c, "modulate:a", 0.0, SCROLL_MS / 1000.0)
		tw.chain().tween_callback(c.queue_free)
	if l != null:
		for o in l.signParts:
			o.visible = false
		tween_to(l.c, {"position:x": START_X}, SCROLL_MS, "sine_inout")
		tween_to(player, {"position:x": player.position.x + dx}, SCROLL_MS, "sine_inout")
		current = l
	targets = []


func _building_at(pos: Vector2) -> Variant:
	for b in targets:
		if b.used:
			continue
		var half := maxf(b.w, b.signW) / 2 + 8
		if absf(pos.x - b.c.position.x) <= half and pos.y >= b.anchorY - 30:
			return b
	return null


func _update_highlight() -> void:
	for i in targets.size():
		targets[i].hl.visible = keyboard_used and i == selected and not targets[i].used


func _move_selection(step: int) -> void:
	var n := targets.size()
	for k in range(1, n + 1):
		var i := (selected + step * k + n * k) % n
		if not targets[i].used:
			selected = i
			break
	_update_highlight()


# ---------- 선택과 이동 ----------

func on_pointer(pos: Vector2) -> void:
	var b: Variant = _building_at(pos)
	if b != null:
		choose(b)


func on_key(keycode: int, _u: int) -> void:
	if not wave_active or swinging:
		return
	match keycode:
		KEY_LEFT:
			keyboard_used = true
			_move_selection(-1)
		KEY_RIGHT:
			keyboard_used = true
			_move_selection(1)
		KEY_SPACE, KEY_ENTER:
			if selected < targets.size():
				choose(targets[selected])
		KEY_1, KEY_2, KEY_3, KEY_4:
			var i := keycode - KEY_1
			if i < targets.size():
				choose(targets[i])


func choose(b: Dictionary) -> void:
	if not wave_active or swinging or b.is_empty() or b.used:
		return
	_settle_targets()
	if b.isCorrect:
		_swing_to(b, true)
	else:
		_fail_swing(b)


## 빌딩 b 로 건너간다 (방법은 팀마다 다르다, travels.gd)
func _swing_to(b: Dictionary, earned: bool) -> void:
	swinging = true
	player.flip_h = false
	set_hero_base("jump")
	Sfx.shot(hero.family)
	var done := func() -> void:
		line = {}
		player.rotation = 0
		player.scale = Vector2.ONE
		player.modulate.a = 1.0
		set_hero_base("idle")
		_land(b, earned)
	var set_line := func(l: Dictionary) -> void: line = l
	Travels.play(str(family.get("travel", "swing")), {
		"s": self,
		"from": player.position,
		"to": Vector2(b.c.position.x, b.roofY - HERO_FOOT),
		"anchor": Vector2(b.c.position.x, b.anchorY),
		"color": shot_color,
		"set_line": set_line,
		"done": done,
	})


func _land(b: Dictionary, earned: bool) -> void:
	var tw := player.create_tween()
	tw.tween_property(player, "scale:y", 0.85, 0.09)
	tw.tween_property(player, "scale:y", 1.0, 0.09)
	Sfx.play("land")
	if earned:
		var pts := award_correct(Vector2(b.c.position.x, b.roofY - 40))
		b.text.color = Color("#06d6a0")
		popup(b.c.position.x, b.roofY - 120, "정답! +%d" % pts, Color("#06d6a0"))
		if q.has("speak"):
			Voice.speak(str(q.speak))
	landed = b
	end_wave(NEXT_DELAY)


## 오답: 건너가려다 실패해서 제자리로 떨어진다 (같은 문제는 계속)
func _fail_swing(b: Dictionary) -> void:
	swinging = true
	b.used = true
	b.text.color = Color("#ff5c5c")
	b.c.modulate.a = 0.4
	penalize()
	line = {"to": Vector2(b.c.position.x, b.anchorY), "color": shot_color}
	var y0 := player.position.y
	var tw := player.create_tween()
	tw.tween_property(player, "position:y", y0 - 50, 0.22).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_callback(func() -> void:
		line = {}
		popup(b.c.position.x, b.roofY - 120, str(family.fail), Color("#ff5c5c")))
	tw.tween_property(player, "position:y", y0, 0.22).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tw.tween_callback(func() -> void:
		swinging = false
		if hearts <= 0:
			end_wave(NEXT_DELAY)
		else:
			_move_selection(1))


## 시간 초과: 정답을 알려 주고 자동으로 건너감 (점수 없음)
func _on_timeout() -> void:
	var answer: Dictionary = {}
	for b in targets:
		if b.isCorrect:
			answer = b
	penalize()
	answer.text.color = Color("#ffd166")
	popup(answer.c.position.x, answer.roofY - 120, "시간 초과! 정답은 %s" % q.answer, Color("#ffd166"))
	swinging = true
	after(700, func() -> void: _swing_to(answer, false))


# ---------- 매 프레임 ----------

func tick(delta: float) -> void:
	if ended:
		return
	if wave_active and not swinging:
		time_left -= delta * 1000.0
		if time_left <= 0:
			_on_timeout()
	_timer_gfx.clear()
	if wave_active and time_limit > 0:
		var frac := clampf(time_left / time_limit, 0, 1)
		_timer_gfx.fill_style(0x000000, 0.4)
		_timer_gfx.fill_rect(0, TIMER_Y, W, TIMER_H)
		_timer_gfx.fill_style(0x4cc9f0 if frac > 0.3 else 0xff4d6d, 1)
		_timer_gfx.fill_rect(0, TIMER_Y, W * frac, TIMER_H)
	_draw_line()


## 이동 연출이 지정한 줄을 그린다 (번개는 매 프레임 바뀌는 지그재그)
func _draw_line() -> void:
	var g := _web_gfx
	g.clear()
	if line.is_empty():
		return
	var o: Vector2 = line.get("from", hand())
	var to: Vector2 = line.to.call() if line.to is Callable else line.to
	var zig: bool = line.get("zigzag", false)
	g.line_style(4 if zig else 3, line.color, 0.95)
	if zig:
		g.move_to(o.x, o.y)
		for i in range(1, ZIGZAG_STEPS):
			var t := float(i) / ZIGZAG_STEPS
			g.line_to(o.x + (to.x - o.x) * t + randf_range(-10, 10), o.y + (to.y - o.y) * t + randf_range(-10, 10))
		g.line_to(to.x, to.y)
		g.stroke_path()
		return
	g.line_between(o.x, o.y, to.x, to.y)
	g.fill_style(0xffffff, 1)
	g.fill_circle(to.x, to.y, 5)


## 자동 플레이 (검증용): 정답 빌딩을 고른다
func auto_step() -> void:
	if not wave_active or swinging:
		return
	for b in targets:
		if b.isCorrect and not b.used:
			choose(b)
			return


func auto_wrong() -> bool:
	if swinging:
		return false
	for b in targets:
		if not b.isCorrect and not b.used:
			choose(b)
			return true
	return false

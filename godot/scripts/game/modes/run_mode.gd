## 🏃 히어로 러너 — "게임이 먼저, 문제는 파워업" (웹 판 game/modes/run-mode.js 를 옮겼다, ADR-0006).
## 히어로는 도시 옥상을 계속 달리고, 아이는 점프 하나로 상자를 넘고 · 밟고 코인을 모은다.
## 문제가 나오면 정답 구슬들이 줄지어 다가오고, 정답 구슬을 점프해서 잡으면 다음 달리기 구간 동안 파워업.
## 판정: 정답 구슬 잡음 → 정답 + 파워업 / 오답 구슬 → 하트 -1 / 정답 구슬이 지나감 → 하트 -1 (한 문제에 최대 1개)
##       상자에 부딪힘 → 잠깐 느려질 뿐 (학습과 무관한 실수로 벌주지 않는다)
## 조작: 화면 아무 곳 터치 · 클릭, 스페이스 · ↑ · W (공중에서 한 번 더 = 2단 점프)
## @see doc/planning/game-design.md (3.7 히어로 러너)
extends RoundBase

const GROUND_Y := 560.0
const HERO_X := 220.0
const HERO_HALF_H := 52.0
const ORB_RISE := 150.0
const ORB_H := 74.0
const ORB_FIRST_X := W + 260
const ORB_GAP := 380.0
const CRATE := 56.0
const GRAVITY := 2600.0
const JUMP_V := -980.0
const JUMP2_V := -820.0
const STOMP_V := -700.0
const GRAB_DY := 62.0
const COIN_R := 40.0
const MAGNET_R := 320.0
const STUMBLE_MS := 900.0
const STUMBLE_RATE := 0.5
const STAR_SPEED_RATE := 1.35
const GIANT_SCALE := 1.6
const SPAWN_STOP_MS := 1500.0
const RUN_SEGMENT_TEXT := "🏃 달려요!"
const RUN_SEGMENT_HINT := "상자는 점프로 넘거나 밟고, 코인을 모아요 · 곧 다음 문제!"
const COIN_POINTS := 10
const SMASH_POINTS := 30
const LAYER_PERIOD := 1440.0 # 흐르는 배경 한 장의 폭 (바닥 무늬 160 의 배수)
const POWER_UPS := [
	{"id": "giant", "label": "💪 거대화! 상자를 부숴요"},
	{"id": "star", "label": "🌟 무적 별! 신나게 달려요"},
	{"id": "magnet", "label": "🧲 코인 자석!"},
	{"id": "coinRain", "label": "💰 코인 비!"},
]

var orbs: Array = []
var crates: Array = []
var coins: Array = []
var vy := 0.0
var on_ground := true
var jumps := 0
var segment := "run"
var segment_end := 0.0
var next_spawn := 0.0
var stumble_until := 0.0
var power: Dictionary = {}
var base_speed := 300.0
var scroll_x := 0.0
var _layers: Array = [] # [{node, rate}]
var _fx: Gfx


func intro_text() -> String:
	return "%s 출동!\n점프! 정답 구슬을 잡으면 파워업" % hero.name


func question_count() -> int:
	return int(Data.rule("runQuestionsPerRound"))


func create_world() -> void:
	base_speed = level_value("runSpeedByLevel") * float(ab.get("slow", 1.0))
	draw_sky()
	_make_scroll_layers()
	create_hero(HERO_X, ground_hero_y())
	set_hero_base("run")
	_fx = Gfx.new()
	_fx.z_index = Z_HERO - 1
	add_child(_fx)


## 멀리 · 가까운 도시와 옥상 바닥을 서로 다른 속도로 흘린다 (시차 = 속도감)
func _make_scroll_layers() -> void:
	_layer(0.2, Z_BG, func(g: Gfx) -> void: draw_city(g, GROUND_Y, 0x141838, [120, 280], 0, LAYER_PERIOD))
	_layer(0.45, Z_BG, func(g: Gfx) -> void: draw_city(g, GROUND_Y, 0x1f2552, [70, 200], 0, LAYER_PERIOD))
	_layer(1.0, Z_WORLD, func(g: Gfx) -> void:
		g.fill_style(0x2a2e5c, 1)
		g.fill_rect(0, GROUND_Y, LAYER_PERIOD, H + 400)
		g.fill_style(0x4a4f8c, 1)
		g.fill_rect(0, GROUND_Y, LAYER_PERIOD, 6)
		g.fill_style(0x363b74, 1)
		var x := 0.0
		while x < LAYER_PERIOD:
			g.fill_rect(x, GROUND_Y + 6, 6, 74)
			g.fill_rect(x + 80, GROUND_Y + 30, 40, 6)
			x += 160)


func _layer(rate: float, z: int, painter: Callable) -> Node2D:
	var holder := Node2D.new()
	holder.z_index = z
	add_child(holder)
	var g := Gfx.new()
	painter.call(g)
	holder.add_child(g)
	for k in [-1, 1, 2]: # 같은 그림을 옆에 이어 붙여 끝없이 흐르게
		var copy := Gfx.new()
		copy._cmds = g._cmds
		copy.position.x = k * LAYER_PERIOD
		holder.add_child(copy)
	_layers.append({"node": holder, "rate": rate})
	return holder


func ground_hero_y() -> float:
	return GROUND_Y - HERO_HALF_H * hero_scale


# ---------- 점프 ----------

func on_pointer(_pos: Vector2) -> void:
	jump()


func on_key(keycode: int, _u: int) -> void:
	if keycode in [KEY_SPACE, KEY_UP, KEY_W]:
		jump()


func jump() -> void:
	if ended:
		return
	if on_ground:
		vy = JUMP_V
		on_ground = false
		jumps = 1
	elif jumps < 2: # 2단 점프: 한 바퀴 돈다
		vy = JUMP2_V
		jumps = 2
		var dir := -1.0 if player.flip_h else 1.0
		var tw := player.create_tween()
		tw.tween_property(player, "rotation_degrees", dir * 360, 0.38)
		tw.tween_callback(func() -> void: player.rotation = 0)
	else:
		return
	set_hero_base("jump")
	Sfx.play("jump")


func land() -> void:
	var k := hero_scale
	on_ground = true
	jumps = 0
	vy = 0
	player.position.y = ground_hero_y()
	set_hero_base("run")
	var tw := player.create_tween()
	tw.tween_property(player, "scale", Vector2(k * 1.06, k * 0.88), 0.07)
	tw.tween_property(player, "scale", Vector2(k, k), 0.07)


# ---------- 문제 구간: 정답 구슬 ----------

func start_wave(nq: Dictionary) -> void:
	segment = "quiz"
	var decoy := decoy_index(nq)
	var y := ground_hero_y() - ORB_RISE
	orbs = []
	for i in nq.choices.size():
		var label := str(nq.choices[i])
		orbs.append(_make_orb(label, label == str(nq.answer), ORB_FIRST_X + i * ORB_GAP, y, i == decoy))


func _make_orb(label: String, is_correct: bool, x: float, y: float, decoy: bool) -> Dictionary:
	var size := 22 if label.length() > 7 else (28 if opts.subject == "eng" else 32)
	var t := Txt.make(label, size, Color.WHITE)
	t.position = Vector2(0, 2)
	var w := maxf(92.0, t.box.x + 34)
	var g := Gfx.new()
	g.fill_style(0x4cc9f0, 0.25)
	g.fill_rounded_rect(-w / 2 - 8, -ORB_H / 2 - 8, w + 16, ORB_H + 16, 30)
	g.fill_style(0x3a0ca3, 1)
	g.fill_rounded_rect(-w / 2, -ORB_H / 2, w, ORB_H, 26)
	g.line_style(4, 0x4cc9f0, 1)
	g.stroke_rounded_rect(-w / 2, -ORB_H / 2, w, ORB_H, 26)
	g.fill_style(0xffffff, 0.25)
	g.fill_rounded_rect(-w / 2 + 10, -ORB_H / 2 + 8, w * 0.4, 10, 5)
	if decoy: # 힌트 능력: 가짜 구슬은 흐리게 X
		g.line_style(5, 0x9a9a9a, 1)
		g.line_between(-w / 2 + 14, -ORB_H / 2 + 12, w / 2 - 14, ORB_H / 2 - 12)
	var c := Node2D.new()
	c.add_child(g)
	c.add_child(t)
	c.position = Vector2(x, y)
	c.z_index = Z_WORLD + 1
	c.modulate.a = 0.35 if decoy else 1.0
	add_child(c)
	var pulse := tween_yoyo(c, {"scale": Vector2(1.06, 1.06)}, 420)
	return {"c": c, "t": t, "w": w, "isCorrect": is_correct, "decoy": decoy, "done": false, "baseY": y, "phase": randf() * 6, "pulse": pulse}


## 구슬을 잡음
func grab_orb(o: Dictionary) -> void:
	o.done = true
	var pos: Vector2 = o.c.position
	attack_hit(pos.x, pos.y)
	if o.isCorrect:
		var pts := award_correct(pos)
		popup(pos.x, pos.y - 60, "정답! +%d" % pts, Color("#06d6a0"))
		if q.has("speak"):
			Voice.speak(str(q.speak))
		_pop_orb(o, 0x06d6a0)
		_end_wave_run(Data.rule("runSegmentSec") * 1000, true)
	else:
		penalize(not q.get("missed", false))
		o.t.color = Color("#ff5c5c")
		popup(pos.x, pos.y - 60, "앗! 다른 구슬이에요", Color("#ff5c5c"))
		_pop_orb(o, 0xff3355)
		if hearts <= 0:
			_end_wave_run(1200)


func _pop_orb(o: Dictionary, color: int) -> void:
	var pos: Vector2 = o.c.position
	spark_burst(pos.x, pos.y, 16)
	Gfx.flash(self, 350, func(g: Gfx, t: float) -> void:
		g.line_style(5, color, 1.0 - t)
		g.stroke_circle(pos.x, pos.y, 30 * (1.0 + 1.5 * t)), Z_POPUP)
	o.pulse.kill()
	var c: Node2D = o.c
	var tw := c.create_tween().set_parallel(true)
	tw.tween_property(c, "scale", Vector2(1.4, 1.4), 0.25)
	tw.tween_property(c, "modulate:a", 0.0, 0.25)
	tw.chain().tween_callback(c.queue_free)


## 정답 구슬이 그냥 지나감: 하트 -1, 정답을 보여 주고 달리기 구간으로
func _miss_orb(o: Dictionary) -> void:
	o.done = true
	penalize(not q.get("missed", false))
	o.t.color = Color("#ffd166")
	popup(HERO_X + 160, o.c.position.y - 60, "정답은 %s" % q.answer, Color("#ffd166"))
	# 놓친 정답 구슬은 잠깐 보여 준 뒤 사라진다 (웹 판에서는 멈춘 채 남아 있던 문제를 고침)
	o.pulse.kill()
	var c: Node2D = o.c
	var tw := c.create_tween()
	tw.tween_interval(0.8)
	tw.tween_property(c, "modulate:a", 0.0, 0.4)
	tw.tween_callback(c.queue_free)
	_end_wave_run(Data.rule("runSegmentSec") * 1000, false)


## 문제를 끝내고 달리기 구간으로 (정답이면 파워업)
func _end_wave_run(delay: float, earned: bool = false) -> void:
	if not wave_active:
		return
	segment = "run"
	segment_end = now + delay
	next_spawn = now + 500
	if earned:
		_start_power(POWER_UPS.pick_random())
	end_wave(delay)
	if hearts > 0:
		set_prompt_text(RUN_SEGMENT_TEXT, RUN_SEGMENT_HINT)


func clear_wave() -> void:
	for o in orbs:
		if o.done:
			continue
		o.done = true
		o.pulse.kill()
		var c: Node2D = o.c
		var tw := c.create_tween().set_parallel(true)
		tw.tween_property(c, "modulate:a", 0.0, 0.4)
		tw.tween_property(c, "position:y", c.position.y - 40, 0.4)
		tw.chain().tween_callback(c.queue_free)
	orbs = []


# ---------- 파워업 ----------

func _start_power(p: Dictionary) -> void:
	power = {"id": p.id, "until": segment_end - 300}
	Sfx.play("powerUp")
	_show_banner(p.label)
	if p.id == "giant":
		_set_giant(true)
	if p.id == "coinRain":
		for i in 4:
			_spawn_coin_arc(W + 60 + i * 220)


func _end_power() -> void:
	if power.is_empty():
		return
	if power.id == "giant":
		_set_giant(false)
	player.modulate = Color.WHITE
	power = {}


func has_power(id: String) -> bool:
	return not power.is_empty() and power.id == id


func _set_giant(on: bool) -> void:
	hero_scale = GIANT_SCALE if on else 1.0
	tween_to(player, {"scale": Vector2(hero_scale, hero_scale)}, 250, "back_out")
	if on_ground:
		tween_to(player, {"position:y": ground_hero_y()}, 250)


func _show_banner(msg: String) -> void:
	var t := Txt.make(msg, 40, Color("#ffd166"), 8)
	t.position = Vector2(W / 2, 230)
	t.z_index = Z_POPUP
	t.scale = Vector2(0.3, 0.3)
	add_child(t)
	var tw := t.create_tween()
	tw.tween_property(t, "scale", Vector2.ONE, 0.3).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_interval(0.9)
	tw.set_parallel(true)
	tw.tween_property(t, "modulate:a", 0.0, 0.4)
	tw.tween_property(t, "position:y", 200.0, 0.4)
	tw.chain().tween_callback(t.queue_free)


# ---------- 달리기 구간: 상자 · 코인 ----------

func _spawn_pattern() -> void:
	var x := W + 60
	match ["crate", "crateCoins", "coinLine", "crate"].pick_random():
		"crate":
			_spawn_crate(x)
		"crateCoins": # 상자 위로 코인 아치 → 점프하면 같이 줍는다
			_spawn_crate(x)
			_spawn_coin_arc(x - 90)
		"coinLine":
			for i in 5:
				_spawn_coin(x + i * 46, GROUND_Y - 40)


func _spawn_crate(x: float) -> void:
	var g := Gfx.new()
	g.fill_style(0xb5651d, 1)
	g.fill_rounded_rect(-CRATE / 2, -CRATE, CRATE, CRATE, 6)
	g.line_style(4, 0x7a3e0f, 1)
	g.stroke_rounded_rect(-CRATE / 2, -CRATE, CRATE, CRATE, 6)
	g.line_between(-CRATE / 2 + 4, -CRATE + 4, CRATE / 2 - 4, -4)
	g.line_between(CRATE / 2 - 4, -CRATE + 4, -CRATE / 2 + 4, -4)
	g.position = Vector2(x, GROUND_Y)
	g.z_index = Z_WORLD + 1
	add_child(g)
	crates.append({"c": g, "done": false})


func _spawn_coin(x: float, y: float) -> void:
	var g := Gfx.new()
	g.fill_style(0xffd166, 1)
	g.fill_circle(0, 0, 13)
	g.fill_style(0xffe9a8, 1)
	g.fill_circle(-3, -3, 5)
	g.line_style(3, 0xe09f00, 1)
	g.stroke_circle(0, 0, 13)
	g.position = Vector2(x, y)
	g.z_index = Z_WORLD + 1
	add_child(g)
	var spin := tween_yoyo(g, {"scale:x": 0.25}, 300, "linear")
	coins.append({"c": g, "done": false, "spin": spin})


func _spawn_coin_arc(x: float) -> void:
	var top := ground_hero_y() - 150
	for i in 5:
		var t := i / 4.0
		_spawn_coin(x + i * 45, top + pow(t * 2 - 1, 2) * 90)


## 상자에 닿음: 위에서 밟거나 파워업 중이면 부수기, 아니면 휘청 (느려지기만)
func _hit_crate(cr: Dictionary, from_above: bool) -> void:
	cr.done = true
	if from_above or has_power("giant") or has_power("star"):
		_smash_crate(cr)
		if from_above:
			vy = STOMP_V
			jumps = 1
		return
	stumble_until = now + STUMBLE_MS
	set_hero_pose("hurt", STUMBLE_MS * 0.6)
	Sfx.play("wrong")
	shake(0.12, 0.004)
	var c: Node2D = cr.c
	var tw := c.create_tween().set_parallel(true)
	tw.tween_property(c, "rotation_degrees", 70.0, 0.45)
	tw.tween_property(c, "position:y", GROUND_Y + 20, 0.45)
	tw.tween_property(c, "modulate:a", 0.0, 0.45)
	tw.chain().tween_callback(c.queue_free)


func _smash_crate(cr: Dictionary) -> void:
	Sfx.play("smash")
	spark_burst(cr.c.position.x, GROUND_Y - CRATE / 2, 14)
	shake(0.1, 0.005)
	score += SMASH_POINTS
	update_hud()
	cr.c.queue_free()


func _collect_coin(co: Dictionary) -> void:
	co.done = true
	score += COIN_POINTS
	update_hud()
	Sfx.play("coin")
	co.spin.kill()
	var c: Node2D = co.c
	var tw := c.create_tween().set_parallel(true)
	tw.tween_property(c, "position:y", c.position.y - 40, 0.22)
	tw.tween_property(c, "modulate:a", 0.0, 0.22)
	tw.tween_property(c, "scale", Vector2(1.5, 1.5), 0.22)
	tw.chain().tween_callback(c.queue_free)


# ---------- 매 프레임 ----------

func tick(delta: float) -> void:
	if ended:
		return
	var s := minf(delta, 0.05)
	var p := player
	if not power.is_empty() and now >= power.until:
		_end_power()
	var v := base_speed
	if segment == "quiz":
		v *= Data.rule("runQuizSpeedRate")
	if now < stumble_until:
		v *= STUMBLE_RATE
	if has_power("star"):
		v *= STAR_SPEED_RATE
	var dx := v * s
	scroll_x += dx
	for L in _layers:
		L.node.position.x = -fmod(scroll_x * L.rate, LAYER_PERIOD)

	# 점프 물리
	var prev_bottom := p.position.y + HERO_HALF_H * hero_scale
	if not on_ground:
		vy += GRAVITY * s
		p.position.y += vy * s
		if p.position.y >= ground_hero_y():
			land()
	var bottom := p.position.y + HERO_HALF_H * hero_scale
	var half_w := 24.0 * hero_scale

	if has_power("star"): # 무지개빛
		p.modulate = Color.from_hsv(fmod(now / 600.0, 1.0), 0.5, 1.0)

	if segment == "run" and not wave_active and now >= next_spawn and now < segment_end - SPAWN_STOP_MS:
		_spawn_pattern()
		next_spawn = now + randf_range(900, 1500)

	for cr in crates:
		if cr.done:
			continue
		cr.c.position.x -= dx
		if cr.c.position.x < -60 - W * 0.5:
			cr.done = true
			cr.c.queue_free()
			continue
		var top := GROUND_Y - CRATE
		if absf(cr.c.position.x - p.position.x) < CRATE / 2 + half_w and bottom > top + 6:
			_hit_crate(cr, not on_ground and vy > 0 and prev_bottom <= top + 14)
	crates = crates.filter(func(c): return not c.done)

	var magnet := has_power("magnet")
	for co in coins:
		if co.done:
			continue
		var c: Node2D = co.c
		c.position.x -= dx
		if magnet:
			var m := p.position - c.position
			var d := m.length()
			if d < MAGNET_R and d > 0.1:
				c.position += m / d * 700 * s
		if c.position.x < -30 - W * 0.5:
			co.done = true
			c.queue_free()
			continue
		if c.position.distance_to(p.position) < COIN_R * hero_scale:
			_collect_coin(co)
	coins = coins.filter(func(c): return not c.done)

	for o in orbs:
		if o.done:
			continue
		var c: Node2D = o.c
		c.position.x -= dx
		c.position.y = o.baseY + sin(now / 300.0 + o.phase) * 8
		if not o.decoy and wave_active and absf(c.position.x - p.position.x) < o.w / 2 + half_w and absf(c.position.y - p.position.y) < GRAB_DY:
			grab_orb(o)
			continue
		if c.position.x < HERO_X - o.w / 2 - half_w:
			if o.isCorrect and wave_active:
				_miss_orb(o)
				continue
			o.done = true
			o.pulse.kill()
			var tw := c.create_tween()
			tw.tween_property(c, "modulate:a", 0.0, 0.3)
			tw.tween_callback(c.queue_free)

	_fx.clear()
	if magnet:
		_fx.line_style(3, 0xffd166, 0.35 + sin(now / 120.0) * 0.15)
		_fx.stroke_circle(p.position.x, p.position.y, MAGNET_R * 0.5)


## 자동 플레이 테스트용: 지금 정답 구슬 (없으면 빈 Dictionary)
func test_correct_orb() -> Dictionary:
	for o in orbs:
		if not o.done and o.isCorrect:
			return o
	return {}


## 자동 플레이 (검증용, TestHook): 정답 구슬이 40~95px 앞에 오면 점프, 상자가 가까우면 점프
func auto_step() -> void:
	if not on_ground:
		return
	var o := test_correct_orb()
	if not o.is_empty() and _skip_q != q_index:
		var dx: float = o.c.position.x - player.position.x
		if dx > 40 and dx < 95:
			jump()
			return
	for cr in crates:
		var d: float = cr.c.position.x - player.position.x
		if not cr.done and d > 50 and d < 110:
			jump()
			return


func test_state() -> Dictionary:
	return {"segment": segment, "orbs": orbs.size(), "power": power.get("id", "")}


## 자동 플레이 (검증용): 이번 문제는 정답 구슬을 일부러 놓친다
func auto_wrong() -> bool:
	_skip_q = q_index
	return true


var _skip_q := -1

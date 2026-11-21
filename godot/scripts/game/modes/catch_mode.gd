## 🎯 드론 잡기 — 웹 판 game/modes/catch-mode.js 를 옮겼다.
## 차원 포털에서 보기가 적힌 드론이 내려온다. 정답 드론을 누르면 팀 공격이 날아가 맞힌다 (누른 드론을 따라가는 유도).
## 근접 팀(거인 · 표범)은 쏘지 않고 뛰어올라 때린다. 정답 드론이 위험선을 넘으면 놓침(하트 -1).
## 조작: 드론 누르기 · ←→/A D 이동 · 스페이스 위로 쏘기
extends RoundBase

const PORTAL_Y := 135.0
const MISS_Y := 468.0
const HERO_Y := 548.0
const GROUND_Y := 600.0
const DRONE_MARGIN_X := 130.0
const DRONE_H := 64.0
const WEB_SPEED := 950.0
const MOVE_SPEED := 460.0
const DEFAULT_COOLDOWN := 300.0
const DEFAULT_HIT_RADIUS := 10.0
const LOCK_ON_PADDING := 24.0
const NEXT_DELAY_CORRECT := 900.0
const NEXT_DELAY_MISSED := 1600.0

var webs: Array = []
var drones: Array = []
var last_fire := -9999.0
var fall_speed := 32.0
var _run_tween: Tween = null
var _web_gfx: Gfx


func intro_text() -> String:
	if is_melee():
		return "%s 출동!\n정답 드론으로 뛰어올라 쾅!" % hero.name
	return "%s 출동!\n정답 드론에 %s을 쏘세요" % [hero.name, shot_name]


func create_world() -> void:
	fall_speed = level_value("fallSpeedByLevel") * float(ab.get("slow", 1.0))
	draw_backdrop({"city": {"baseY": GROUND_Y, "color": 0x1a1f45, "range": [130, 300]}, "ground": {"y": GROUND_Y, "h": 40}})
	var line := Gfx.new()
	line.z_index = Z_BG + 1
	line.line_style(2, 0xff4d6d, 0.6)
	var dx := 0.0
	while dx < W:
		line.line_between(dx, MISS_Y + DRONE_H / 2 + 2, dx + 12, MISS_Y + DRONE_H / 2 + 2)
		dx += 24
	add_child(line)
	var portal := Gfx.new()
	portal.position = Vector2(W / 2, PORTAL_Y)
	portal.z_index = Z_BG
	for p in [[0x7b2ff7, 220, 50], [0x00d4ff, 160, 36], [0xff4fd8, 100, 22]]:
		portal.line_style(5, p[0], 0.7)
		portal.stroke_ellipse(0, 0, p[1], p[2])
	add_child(portal)
	tween_yoyo(portal, {"scale": Vector2(1.12, 0.9)}, 900)
	create_hero(W / 2, HERO_Y)
	start_hero_bob()
	_web_gfx = Gfx.new()
	_web_gfx.z_index = Z_WEB
	add_child(_web_gfx)


# ---------- 드론 ----------

func start_wave(nq: Dictionary) -> void:
	var n: int = nq.choices.size()
	var gap := (W - DRONE_MARGIN_X * 2) / maxf(1, n - 1)
	var xs := []
	for i in n:
		xs.append(DRONE_MARGIN_X + i * gap)
	xs.shuffle()
	var decoy := decoy_index(nq)
	drones = []
	for i in n:
		var label := str(nq.choices[i])
		drones.append(_make_drone(label, label == str(nq.answer), xs[i], i == decoy, i * 120.0))


func clear_wave() -> void:
	webs = []
	for d in drones:
		if d.done:
			continue
		d.done = true
		_fade_out(d, -20)


func _make_drone(label: String, is_correct: bool, target_x: float, decoy: bool, delay: float) -> Dictionary:
	var size := 24 if label.length() > 7 else (30 if opts.subject == "eng" else 34)
	var text := Txt.make(label, size, Color.WHITE)
	text.position = Vector2(0, 2)
	var w := maxf(96.0, text.box.x + 36)
	var h := DRONE_H
	var c := Node2D.new()
	for rx in [-w / 2 + 25, w / 2 - 25]: # 프로펠러: 좌우로 빠르게 늘었다 줄었다
		var r := Gfx.new()
		r.position = Vector2(rx, -h / 2 - 10)
		r.fill_style(0xc0c8d8, 1)
		r.fill_rect(-17, -2.5, 34, 5)
		c.add_child(r)
		tween_yoyo(r, {"scale:x": 0.15}, 70, "linear")
	var g := Gfx.new()
	g.fill_style(0x8d99ae, 1)
	g.fill_rect(-w / 2 + 23, -h / 2 - 8, 4, 8)
	g.fill_rect(w / 2 - 27, -h / 2 - 8, 4, 8)
	g.fill_style(0x2b2d42, 1)
	g.fill_rounded_rect(-w / 2, -h / 2, w, h, 18)
	g.line_style(3, 0x9d4edd, 1)
	g.stroke_rounded_rect(-w / 2, -h / 2, w, h, 18)
	g.fill_style(0xff3355, 1)
	g.fill_circle(0, h / 2 + 6, 4)
	if decoy:
		g.line_style(4, 0x9a9a9a, 1)
		g.line_between(-w / 2 + 12, -h / 2 + 10, w / 2 - 12, h / 2 - 10)
	c.add_child(g)
	c.add_child(text)
	c.position = Vector2(W / 2, PORTAL_Y)
	c.z_index = Z_WORLD
	c.scale = Vector2(0.2, 0.2)
	c.modulate.a = 0
	add_child(c)
	var d := {"c": c, "text": text, "w": w, "h": h, "isCorrect": is_correct, "decoy": decoy, "done": false, "y": PORTAL_Y, "baseX": W / 2, "phase": randf() * 6}
	tween_to(c, {"scale": Vector2.ONE, "modulate:a": 0.3 if decoy else 1.0}, 500, "back_out", delay)
	var spread := create_tween()
	spread.tween_interval(delay / 1000.0)
	spread.tween_method(func(x: float) -> void: d.baseX = x, W / 2, target_x, 0.7).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	return d


func _fade_out(d: Dictionary, dy: float) -> void:
	var c: Node2D = d.c
	if not is_instance_valid(c):
		return
	var tw := c.create_tween().set_parallel(true)
	tw.tween_property(c, "modulate:a", 0.0, 0.45)
	tw.tween_property(c, "position:y", c.position.y + dy, 0.45)
	tw.chain().tween_callback(c.queue_free)


func _drone_in_column(x: float) -> Variant:
	var best: Variant = null
	for d in drones:
		if d.done or d.decoy or absf(x - d.c.position.x) > d.w / 2 + LOCK_ON_PADDING:
			continue
		if best == null or d.c.position.y > best.c.position.y:
			best = d
	return best


func _drone_near(x: float, y: float) -> Variant:
	var best: Variant = null
	var best_dist := INF
	for d in drones:
		if d.done or d.decoy:
			continue
		var p: Vector2 = d.c.position
		if absf(x - p.x) <= d.w / 2 + LOCK_ON_PADDING and absf(y - p.y) <= d.h / 2 + LOCK_ON_PADDING:
			var dist := Vector2(x, y).distance_to(p)
			if dist < best_dist:
				best = d
				best_dist = dist
	return best


# ---------- 발사와 판정 ----------

func on_pointer(pos: Vector2) -> void:
	fire_at(pos.x, pos.y)


func on_key(keycode: int, _u: int) -> void:
	if keycode == KEY_SPACE:
		fire_at(hand().x, 0)


func fire_at(tx: float, ty: float) -> void:
	if not wave_active:
		return
	if in_melee or now - last_fire < float(ab.get("cooldown", DEFAULT_COOLDOWN)):
		return
	last_fire = now
	if is_melee():
		_melee_at(tx, ty)
		return
	player.flip_h = tx < player.position.x - 10
	hero_shoot()
	var o := hand()
	var dx := tx - o.x
	var dy := minf(ty - o.y, -20)
	var len := Vector2(dx, dy).length()
	var speed := WEB_SPEED * float(ab.get("webSpeed", 1.0)) * float(attack_style.speed)
	webs.append({"x": o.x, "y": o.y, "vx": dx / len * speed, "vy": dy / len * speed, "speed": speed, "target": _drone_near(tx, ty), "dead": false})


## 근접 팀: 누른 드론(없으면 그 줄의 가장 아래 드론)까지 뛰어올라 아래에서 때리고 그 아래에 착지
func _melee_at(tx: float, ty: float) -> void:
	var d: Variant = _drone_near(tx, ty)
	if d == null:
		d = _drone_in_column(tx)
	if d == null:
		_run_to(tx)
		return
	_stop_run()
	melee_to(func() -> Vector2: return Vector2(d.c.position.x, d.c.position.y + d.h / 2 + 34), func() -> void:
		if d.done or not wave_active:
			return
		attack_hit(d.c.position.x, d.c.position.y + d.h / 2)
		if d.isCorrect:
			_on_correct(d)
		else:
			_on_wrong(d), {"land": Vector2(clampf(d.c.position.x, 50, W - 50), HERO_Y)})


func _run_to(tx: float) -> void:
	var x := clampf(tx, 50, W - 50)
	_stop_run()
	player.flip_h = x < player.position.x
	set_hero_base("run")
	_run_tween = player.create_tween()
	_run_tween.tween_property(player, "position:x", x, absf(x - player.position.x) / MOVE_SPEED)
	_run_tween.tween_callback(func() -> void:
		_run_tween = null
		set_hero_base("idle"))


func _stop_run() -> void:
	if _run_tween:
		_run_tween.kill()
	_run_tween = null


func _on_correct(d: Dictionary) -> void:
	d.done = true
	var c: Node2D = d.c
	var pts := award_correct(c.position)
	if attack_style.key == "web": # 거미줄일 때만 드론이 거미줄에 감긴다
		var wg := Gfx.new()
		wg.line_style(2, shot_color, 0.95)
		for i in 8:
			var a := i * PI / 4
			wg.line_between(0, 0, cos(a) * (d.w / 2 + 6), sin(a) * (d.h / 2 + 6))
		wg.stroke_circle(0, 0, 14)
		wg.stroke_circle(0, 0, 28)
		c.add_child(wg)
	popup(c.position.x, c.position.y - 50, "정답! +%d" % pts, Color("#06d6a0"))
	if q.has("speak"):
		Voice.speak(str(q.speak))
	var tw := c.create_tween().set_parallel(true)
	tw.tween_property(c, "position:y", c.position.y - 40, 0.6).set_delay(0.35)
	tw.tween_property(c, "scale", Vector2(0.6, 0.6), 0.6).set_delay(0.35)
	tw.tween_property(c, "modulate:a", 0.0, 0.6).set_delay(0.35)
	tw.chain().tween_callback(c.queue_free)
	end_wave(NEXT_DELAY_CORRECT)


## 오답 드론: 하트 -1. 정답 드론이 남아 있어 다시 도전할 수 있다
func _on_wrong(d: Dictionary) -> void:
	d.done = true
	penalize()
	d.text.color = Color("#ff5c5c")
	var c: Node2D = d.c
	popup(c.position.x, c.position.y - 50, "앗! 다시 해 봐요", Color("#ff5c5c"))
	var tw := c.create_tween()
	for i in 4:
		tw.tween_property(c, "rotation_degrees", 10.0, 0.06)
		tw.tween_property(c, "rotation_degrees", -10.0, 0.06)
	tw.tween_callback(func() -> void: _fade_out(d, 40))
	if hearts <= 0:
		end_wave(NEXT_DELAY_CORRECT)


func _on_missed(d: Dictionary) -> void:
	d.done = true
	penalize()
	d.text.color = Color("#ffd166")
	popup(d.c.position.x, d.c.position.y - 50, "정답은 %s" % q.answer, Color("#ffd166"))
	after(700, func() -> void: _fade_out(d, 20))
	end_wave(NEXT_DELAY_MISSED)


# ---------- 매 프레임 ----------

func tick(delta: float) -> void:
	if ended:
		return
	var s := minf(delta, 0.05)
	var dir := 0
	if Input.is_key_pressed(KEY_LEFT) or Input.is_key_pressed(KEY_A):
		dir -= 1
	if Input.is_key_pressed(KEY_RIGHT) or Input.is_key_pressed(KEY_D):
		dir += 1
	if in_melee:
		dir = 0
	if dir != 0:
		_stop_run()
		player.position.x = clampf(player.position.x + dir * MOVE_SPEED * s, 50, W - 50)
		player.flip_h = dir < 0
		set_hero_base("run")
	elif not in_melee and _run_tween == null and hero_anim.base == "run":
		set_hero_base("idle")

	for d in drones:
		if d.done:
			continue
		d.y += fall_speed * s
		var c: Node2D = d.c
		c.position = Vector2(d.baseX + sin(now / 500.0 + d.phase) * 8, d.y)
		c.rotation_degrees = cos(now / 500.0 + d.phase) * 6
		if d.y > MISS_Y:
			if d.isCorrect:
				_on_missed(d)
			else:
				d.done = true
				_fade_out(d, 20)

	var r := float(ab.get("hitRadius", DEFAULT_HIT_RADIUS))
	for w in webs:
		var t: Variant = w.target
		if t != null and not t.done:
			var to := Vector2(t.c.position.x - w.x, t.c.position.y - w.y)
			var tl := maxf(0.001, to.length())
			w.vx = to.x / tl * w.speed
			w.vy = to.y / tl * w.speed
		w.x += w.vx * s
		w.y += w.vy * s
		if w.x < -20 or w.x > W + 20 or w.y < -20 or w.y > H:
			w.dead = true
		if w.dead:
			continue
		for d in drones:
			if d.done or d.decoy:
				continue
			if absf(w.x - d.c.position.x) <= d.w / 2 + r and absf(w.y - d.c.position.y) <= d.h / 2 + r:
				w.dead = true
				attack_hit(w.x, w.y)
				if d.isCorrect:
					_on_correct(d)
				else:
					_on_wrong(d)
				break
	webs = webs.filter(func(w): return not w.dead)
	_web_gfx.clear()
	var o := hand()
	for w in webs:
		draw_attack(_web_gfx, o, Vector2(w.x, w.y))


## 자동 플레이 (검증용): 정답 드론을 누른다
func auto_step() -> void:
	if not wave_active or in_melee:
		return
	last_fire = -9999.0
	for d in drones:
		if not d.done and d.isCorrect and d.c.modulate.a > 0.9 and webs.is_empty():
			fire_at(d.c.position.x, d.c.position.y)
			return


func test_state() -> Dictionary:
	return {"drones": drones.size(), "webs": webs.size()}


## 자동 플레이 (검증용): 틀린 드론을 한 번 맞힌다. @return 했는지
func auto_wrong() -> bool:
	for d in drones:
		if not d.done and not d.isCorrect and not d.decoy and d.c.modulate.a > 0.9:
			last_fire = -9999.0
			fire_at(d.c.position.x, d.c.position.y)
			return true
	return false

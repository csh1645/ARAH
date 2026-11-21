## 🚪 문 통과 — 웹 판 game/modes/gate-mode.js + views/gate-view-2d.js 를 옮겼다 (원근 2D 화면).
## 히어로는 계속 달리고, 보기가 적힌 유리문들이 멀리서 다가온다. 정답 문이 있는 줄로 옮겨 통과한다.
## 오답 문: 유리가 깨지고 떨어졌다가 줄을 쏴서 올라와 같은 구간을 다시 달린다 (하트 -1).
## 조작: 문 누르기(그 줄로 · 이미 그 줄이면 대시) · 문 밖 누르기(한 줄 이동) · ←→/A D · 스페이스/↑ 대시
## (나중에 Godot 3D 로 바꿀 수 있게 화면 함수(_layout · _make_door …)를 한곳에 모았다)
extends RoundBase

const DASH_FACTOR := 4.0
const LANE_MOVE_MS := 140.0
const NEXT_DELAY := 800.0
const VANISH_X := W / 2
const HORIZON_Y := 150.0
const GROUND_Y := 600.0
const HERO_Y := GROUND_Y - 51
const LANE_LEFT := 150.0
const LANE_RIGHT := 810.0
const S_FAR := 0.35
const DOOR_H := 200.0
const FALL_MS := 450.0
const RESCUE_MS := 550.0

var doors: Array = []
var p := 0.0
var dash := false
var busy := false
var rescuing := false
var lane_count := 3
var lane := 1
var approach_ms := 10000.0
var lane_gap := 0.0
var lane_xs: Array = []
var _scroll := 0.0
var _frame := 0
var _stripes: Gfx
var _speed_gfx: Gfx
var _web_gfx: Gfx


func intro_text() -> String:
	return "%s 출동!\n정답 문이 있는 줄로 달려가요" % hero.name


func question_options() -> Dictionary:
	return {"pictureChoices": true}


static func _project(x0: float, s: float) -> Vector2:
	return Vector2(VANISH_X + (x0 - VANISH_X) * s, HORIZON_Y + (GROUND_Y - HORIZON_Y) * s)


func create_world() -> void:
	lane_count = int(level_value("choicesByLevel"))
	lane = int((lane_count - 1) / 2)
	lane_gap = (LANE_RIGHT - LANE_LEFT) / (lane_count - 1)
	for i in lane_count:
		lane_xs.append(LANE_LEFT + lane_gap * i)
	draw_sky()
	var g := Gfx.new()
	g.z_index = Z_BG
	add_child(g)
	draw_city(g, 330, 0x141838, [60, 170])
	g.fill_style(0x0e1130, 1)
	g.fill_rect(-W, 330, W * 3, H + 400)
	var left := LANE_LEFT - lane_gap / 2
	var right := LANE_RIGHT + lane_gap / 2
	g.fill_style(0x1c2048, 1)
	g.fill_points(PackedVector2Array([_project(left, 0.28), _project(right, 0.28), _project(right, 1.12), _project(left, 1.12)]))
	g.line_style(4, 0x4cc9f0, 0.6)
	for x0 in [left, right]:
		var a := _project(x0, 0.28)
		var b := _project(x0, 1.12)
		g.line_between(a.x, a.y, b.x, b.y)
	_stripes = Gfx.new()
	_stripes.z_index = Z_BG
	add_child(_stripes)
	_speed_gfx = Gfx.new()
	_speed_gfx.z_index = Z_WEB
	add_child(_speed_gfx)
	create_hero(lane_xs[lane], HERO_Y)
	set_hero_base("run")
	_web_gfx = Gfx.new()
	_web_gfx.z_index = Z_WEB
	add_child(_web_gfx)


# ---------- 문 ----------

func start_wave(nq: Dictionary) -> void:
	doors = []
	var picture: bool = nq.get("pictureChoices", false)
	for i in nq.choices.size():
		var label := str(nq.choices[i])
		var d := {"lane": i, "label": label, "isCorrect": label == str(nq.answer), "used": false}
		d.v = _make_door(label, picture)
		doors.append(d)
	var decoy := decoy_index(nq)
	if decoy >= 0:
		_block_door(doors[decoy])
	approach_ms = time_limit_ms(level_value("gateTimeByLevel"))
	p = 0
	dash = false
	_ensure_open_lane()
	_layout()
	if picture and nq.has("speak"):
		Voice.speak(str(nq.speak))


func _make_door(label: String, picture: bool) -> Dictionary:
	var w := minf(200.0, lane_gap * 0.82)
	var h := DOOR_H
	var g := Gfx.new()
	g.fill_style(0x3b4170, 1)
	g.fill_rect(-w / 2 - 10, -h - 10, w + 20, h + 10)
	g.fill_style(0x4cc9f0, 0.22)
	g.fill_rect(-w / 2, -h, w, h)
	g.line_style(3, 0x9be7ff, 0.8)
	g.stroke_rect(-w / 2, -h, w, h)
	g.line_style(6, 0xffffff, 0.25)
	g.line_between(-w / 2 + 14, -h + 30, -w / 2 + 44, -h + 80)
	var size := 84 if picture else (46 if label.length() > 3 else 60)
	var text := Txt.make(label, size, Color.WHITE, 6)
	text.position = Vector2(0, -h / 2)
	if text.box.x > w - 8:
		text.fit(size, w - 8, 22)
	var hl := Gfx.new()
	hl.line_style(6, 0xffd166, 1)
	hl.stroke_rect(-w / 2 - 14, -h - 14, w + 28, h + 14)
	var board := Gfx.new()
	board.visible = false
	board.line_style(18, 0x8b5a2b, 1)
	board.line_between(-w / 2, -h, w / 2, 0)
	board.line_between(w / 2, -h, -w / 2, 0)
	var c := Node2D.new()
	for n in [g, text, hl, board]:
		c.add_child(n)
	c.z_index = Z_WORLD
	add_child(c)
	return {"c": c, "g": g, "text": text, "hl": hl, "board": board, "w": w, "h": h}


func clear_wave() -> void:
	for d in doors:
		var c: Node2D = d.v.c
		var tw := c.create_tween().set_parallel(true)
		tw.tween_property(c, "scale", c.scale * 1.3, 0.3)
		tw.tween_property(c, "modulate:a", 0.0, 0.3)
		tw.chain().tween_callback(c.queue_free)
	doors = []
	dash = false


func _block_door(d: Dictionary) -> void:
	d.used = true
	d.v.hl.visible = false
	d.v.g.modulate.a = 0.25
	d.v.text.modulate.a = 0.35
	d.v.board.visible = true


## 다가온 정도(p)에 맞춰 문 위치 · 크기 (가까워질수록 빨라 보이도록 p^1.4)
func _layout() -> void:
	var sc := S_FAR + (1 - S_FAR) * pow(p, 1.4)
	for d in doors:
		var c: Node2D = d.v.c
		c.position = _project(lane_xs[d.lane], sc)
		c.scale = Vector2(sc, sc)
		d.v.hl.visible = d.lane == lane and not d.used


# ---------- 줄 이동 ----------

func set_lane(i: int) -> void:
	if i == lane:
		return
	lane = i
	player.flip_h = lane_xs[i] < player.position.x
	tween_to(player, {"position:x": lane_xs[i]}, LANE_MOVE_MS / float(ab.get("webSpeed", 1.0)))
	_layout()


func _move_lane(step: int) -> void:
	var i := lane + step
	while i >= 0 and i < lane_count:
		if i >= doors.size() or not doors[i].used:
			set_lane(i)
			return
		i += step


func _ensure_open_lane() -> void:
	if lane >= doors.size() or not doors[lane].used:
		return
	var open := doors.filter(func(d): return not d.used).map(func(d): return d.lane)
	open.sort_custom(func(a, b): return absi(a - lane) < absi(b - lane))
	if not open.is_empty():
		set_lane(open[0])


func _door_at(pos: Vector2) -> Variant:
	for d in doors:
		var c: Node2D = d.v.c
		var s := c.scale.x
		if absf(pos.x - c.position.x) <= d.v.w * s / 2 + 12 and pos.y <= c.position.y + 12 and pos.y >= c.position.y - d.v.h * s - 12:
			return d
	return null


func on_pointer(pos: Vector2) -> void:
	if pos.y < HUD_H or not wave_active or busy:
		return
	var hit: Variant = _door_at(pos)
	if hit != null:
		if hit.used:
			return
		if hit.lane == lane:
			dash = true
		else:
			set_lane(hit.lane)
		return
	_move_lane(-1 if pos.x < player.position.x else 1)


func on_key(keycode: int, _u: int) -> void:
	if not wave_active or busy:
		return
	match keycode:
		KEY_LEFT, KEY_A:
			_move_lane(-1)
		KEY_RIGHT, KEY_D:
			_move_lane(1)
		KEY_SPACE, KEY_UP, KEY_W:
			dash = true


# ---------- 도착 판정 ----------

func _door_screen_pos(d: Dictionary) -> Vector2:
	var c: Node2D = d.v.c
	return Vector2(c.position.x, c.position.y - d.v.h * c.scale.y / 2)


func _arrive() -> void:
	var d: Dictionary = doors[lane]
	if d.isCorrect:
		var pos := _door_screen_pos(d)
		var pts := award_correct(pos)
		d.v.text.color = Color("#06d6a0")
		flash_screen(Color.WHITE, 0.5)
		popup(pos.x, 330, "통과! +%d" % pts, Color("#06d6a0"))
		if q.has("speak"):
			Voice.speak(str(q.speak))
		end_wave(NEXT_DELAY)
	else:
		_crash_door(d)


## 오답 문: 유리가 깨지고 떨어졌다가 줄로 올라와 같은 구간을 다시 달린다
func _crash_door(d: Dictionary) -> void:
	busy = true
	penalize()
	_block_door(d)
	d.v.text.color = Color("#ff5c5c")
	Sfx.play("glass")
	var c := _door_screen_pos(d)
	popup(c.x, 330, "앗! 깨지는 문이었어요", Color("#ff5c5c"))
	for i in 10:
		var shard := Gfx.new()
		shard.fill_style(0x9be7ff, 0.85)
		shard.fill_triangle(0, 0, 16, 4, 6, 18)
		shard.position = c
		shard.z_index = Z_POPUP
		add_child(shard)
		var tw := shard.create_tween().set_parallel(true)
		tw.tween_property(shard, "position", c + Vector2(randf_range(-140, 140), randf_range(80, 280)), 0.7)
		tw.tween_property(shard, "rotation_degrees", randf_range(-180, 180), 0.7)
		tw.tween_property(shard, "modulate:a", 0.0, 0.7)
		tw.chain().tween_callback(shard.queue_free)
	var tw2 := player.create_tween()
	tw2.tween_property(player, "position:y", H + 80, FALL_MS / 1000.0).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tw2.parallel().tween_property(player, "rotation_degrees", 80.0, FALL_MS / 1000.0)
	tw2.tween_callback(func() -> void: rescuing = true)
	tw2.tween_property(player, "position:y", HERO_Y, RESCUE_MS / 1000.0).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw2.parallel().tween_property(player, "rotation_degrees", 0.0, RESCUE_MS / 1000.0)
	tw2.tween_callback(_after_rescue)


func _after_rescue() -> void:
	rescuing = false
	if hearts <= 0:
		end_wave(NEXT_DELAY)
		busy = false
		return
	p = 0
	dash = false
	_ensure_open_lane()
	_layout()
	popup(W / 2, 300, "다시 도전!", Color("#ffd166"))
	busy = false


# ---------- 매 프레임 ----------

func tick(delta: float) -> void:
	if ended:
		return
	var ms := delta * 1000.0
	if wave_active and not busy:
		p = minf(1.0, p + ms / approach_ms * (DASH_FACTOR if dash else 1.0))
		_layout()
		if p >= 1.0:
			_arrive()
	var speed := DASH_FACTOR if dash else 1.0
	var dashing := dash and wave_active
	if not busy:
		_scroll = fmod(_scroll + ms / 600.0 * speed, 1.0)
		player.position.y = HERO_Y - absf(sin(now / 90.0)) * 6
		if dashing:
			_frame += 1
			if _frame % 4 == 0:
				ghost_trail()
	# 줄 사이 점선이 아래로 흘러 달리는 느낌
	_stripes.clear()
	_stripes.line_style(3, 0x8d99ae, 0.6)
	for i in lane_xs.size() - 1:
		var x0: float = lane_xs[i] + lane_gap / 2
		for k in 8:
			var t := fmod(k / 8.0 + _scroll, 1.0)
			var s1 := 0.3 + 0.8 * t
			var a := _project(x0, s1)
			var b := _project(x0, s1 + 0.04)
			_stripes.line_between(a.x, a.y, b.x, b.y)
	# 대시 속도선
	_speed_gfx.clear()
	if dashing and not busy:
		_speed_gfx.line_style(2, 0xffffff, 0.35)
		for i in 14:
			var a := float(i) / 14 * TAU + floorf(now / 60.0) * 0.37
			var r1 := 260.0 + fmod(now / 2.0 + i * 53, 200.0)
			_speed_gfx.line_between(VANISH_X + cos(a) * r1, HORIZON_Y + 120 + sin(a) * r1 * 0.6, VANISH_X + cos(a) * (r1 + 90), HORIZON_Y + 120 + sin(a) * (r1 + 90) * 0.6)
	_web_gfx.clear()
	if rescuing:
		var o := hand()
		_web_gfx.line_style(3, shot_color, 0.95)
		_web_gfx.line_between(o.x, o.y, o.x, HUD_H)


## 자동 플레이 (검증용): 정답 줄로 옮기고 대시
func auto_step() -> void:
	if not wave_active or busy:
		return
	for d in doors:
		if d.isCorrect:
			set_lane(d.lane)
			dash = true
			return


func auto_wrong() -> bool:
	if busy:
		return false
	for d in doors:
		if not d.isCorrect and not d.used:
			set_lane(d.lane)
			dash = true
			return true
	return false

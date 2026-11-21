## 🕸️ 철자 잇기 — 웹 판 game/modes/spell-mode.js 를 옮겼다.
## 단어 발음을 듣고, 떠다니는 알파벳 블록을 순서대로 팀 공격으로 잡아 빈칸으로 끌어온다 (5단계~: 단어 블록으로 문장 만들기).
## 순서가 틀리면 하트는 그대로(실수가 잦은 놀이), 두 번 틀리면 다음 글자를 반짝여 알려 준다.
## 조작: 블록 누르기 · 알파벳 키 (거미줄이 오가는 동안 친 키는 기억했다가 이어서 처리)
extends RoundBase

const HERO_Y := 548.0
const SLOT_Y := 165.0
const SLOT_W := 62.0
const SLOT_GAP := 8.0
const FIELD := {"left": 110.0, "right": 850.0, "top": 285.0, "bottom": 470.0}
const WORD_FIELD := {"left": 90.0, "right": 870.0, "top": 262.0, "bottom": 482.0}
const BLOCK := 68.0
const WORD_BLOCK_H := 56.0
const WORD_FONT := 32
const CHAR_W := 18.0
const SLOT_ROW_MAX := W - 40
const BLOCK_COLORS := [0xe63946, 0x1d4ed8, 0x06d6a0, 0xff9f1c, 0x9d4edd, 0xff4fa3]
const SHOOT_MS := 160.0
const PULL_MS := 380.0
const HINT_AFTER := 2
const NEXT_DELAY := 1400.0
const KEY_QUEUE_MAX := 12

var blocks: Array = []
var slots: Array = []
var parts: Array = []
var idx := 0
var busy := false
var wrong_count := 0
var web: Dictionary = {}
var word := ""
var word_mode := false
var fit := 1.0
var key_queue: Array = []
var _web_gfx: Gfx
var _slot_hl: Gfx = null
var _hl_tween: Tween = null


func intro_text() -> String:
	var sample := Data.make_question("eng", int(opts.level), {"spelling": true})
	var what := "단어를 순서대로" if sample.has("tokens") else "알파벳을 순서대로"
	if is_melee():
		return "%s 출동!\n%s 쳐서 날려요" % [hero.name, what]
	return "%s 출동!\n%s %s로 잡아요" % [hero.name, what, shot_name]


func question_options() -> Dictionary:
	return {"spelling": true}


func create_world() -> void:
	draw_backdrop({"city": {"baseY": 600, "color": 0x1a1f45, "range": [110, 250]}, "ground": {"y": 600, "h": 40}})
	create_hero(W / 2, HERO_Y)
	start_hero_bob()
	_web_gfx = Gfx.new()
	_web_gfx.z_index = Z_WEB
	add_child(_web_gfx)


func on_pointer(pos: Vector2) -> void:
	if pos.y < HUD_H:
		return # 문제 글자 누르기(발음 다시 듣기)는 기반이 처리
	var b: Variant = _block_at(pos)
	if b != null:
		pick(b)


func on_key(_keycode: int, unicode: int) -> void:
	if unicode == 0:
		return
	var k := char(unicode).to_lower()
	if not (k >= "a" and k <= "z") or not wave_active:
		return
	if busy:
		if key_queue.size() < KEY_QUEUE_MAX:
			key_queue.append(k)
		return
	_type_letter(k)


func _type_letter(k: String) -> void:
	var expected: String = parts[idx] if idx < parts.size() else ""
	var found: Variant = null
	for x in blocks:
		if x.used:
			continue
		var ok: bool = str(x.ch).to_lower().begins_with(k) if word_mode else x.ch == k
		if ok and x.ch == expected:
			found = x
			break
		if ok and found == null:
			found = x
	if found != null:
		pick(found)
	else:
		_wrong()


func _flush_keys() -> void:
	if not wave_active or busy or key_queue.is_empty():
		return
	_type_letter(key_queue.pop_front())


# ---------- 문제 배치 ----------

func _part_width(part: String) -> float:
	return maxf(SLOT_W, round(part.length() * CHAR_W * fit + 26)) if word_mode else SLOT_W


func _row_w() -> float:
	var s := 0.0
	for p0 in parts:
		s += _part_width(p0)
	return s + (parts.size() - 1) * SLOT_GAP


func start_wave(nq: Dictionary) -> void:
	word = str(nq.answer)
	word_mode = nq.has("tokens")
	parts = nq.tokens.duplicate() if word_mode else Array(word.split(""))
	key_queue = []
	idx = 0
	wrong_count = 0
	busy = false
	fit = 1.0
	if _row_w() > SLOT_ROW_MAX:
		fit = SLOT_ROW_MAX / _row_w()
	var x := W / 2 - _row_w() / 2
	var sh := WORD_BLOCK_H if word_mode else SLOT_W
	slots = []
	for p0 in parts:
		var w := _part_width(p0)
		var cx := x + w / 2
		x += w + SLOT_GAP
		var g := Gfx.new()
		g.z_index = Z_WORLD
		g.fill_style(0x111633, 0.85)
		g.fill_rounded_rect(cx - w / 2, SLOT_Y - sh / 2, w, sh, 10)
		g.line_style(3, 0x4cc9f0, 0.9)
		g.stroke_rounded_rect(cx - w / 2, SLOT_Y - sh / 2, w, sh, 10)
		add_child(g)
		slots.append({"x": cx, "y": SLOT_Y, "w": w, "h": sh, "g": g})
	_slot_hl = Gfx.new()
	_slot_hl.z_index = Z_WORLD + 1
	add_child(_slot_hl)
	_hl_tween = tween_yoyo(_slot_hl, {"modulate:a": 0.35}, 450, "linear")
	_update_slot_hl()

	# 블록: 영역을 격자로 나누고 칸마다 조금씩 흩어 놓는다
	var k: int = nq.choices.size()
	var field: Dictionary = WORD_FIELD if word_mode else FIELD
	var cols := mini(k, 4 if word_mode else 6)
	var rows := ceili(float(k) / cols)
	var cell_w: float = (field.right - field.left) / cols
	var cell_h: float = (field.bottom - field.top) / rows
	var jitter := 0.05 if word_mode else 0.15
	var cells := []
	for r in rows:
		for c in cols:
			cells.append(Vector2(field.left + cell_w * (c + 0.5) + randf_range(-cell_w * jitter, cell_w * jitter), field.top + cell_h * (r + 0.5) + randf_range(-6, 6)))
	cells.shuffle()
	blocks = []
	for i in k:
		blocks.append(_make_block(str(nq.choices[i]), cells[i], i))
	if ab.get("hint", false): # 힌트 능력: 방해 글자를 미리 막아 둔다
		var decoys: Array = nq.get("decoys", [])
		for b in blocks:
			if decoys.has(b.ch):
				_block_decoy(b)
	if nq.has("speak"):
		Voice.speak(str(nq.speak))


func _make_block(ch: String, pos: Vector2, i: int) -> Dictionary:
	var w := _part_width(ch) + 6 if word_mode else BLOCK
	var h := WORD_BLOCK_H if word_mode else BLOCK
	var g := Gfx.new()
	g.fill_style(BLOCK_COLORS[i % BLOCK_COLORS.size()], 1)
	g.fill_rounded_rect(-w / 2, -h / 2, w, h, 14)
	g.line_style(4, 0xffffff, 0.85)
	g.stroke_rounded_rect(-w / 2, -h / 2, w, h, 14)
	var size := int(round(WORD_FONT * fit)) if word_mode else 46
	var t := Txt.make(ch, size, Color.WHITE, 5)
	t.position = Vector2(0, 2)
	var c := Node2D.new()
	c.add_child(g)
	c.add_child(t)
	c.position = pos
	c.z_index = Z_WORLD
	c.scale = Vector2.ZERO
	add_child(c)
	tween_to(c, {"scale": Vector2.ONE}, 350, "back_out", i * 50.0)
	var bob := tween_yoyo(c, {"position:y": pos.y - 7}, randf_range(800, 1300), "sine_inout", 0, randf_range(0, 600))
	return {"c": c, "g": g, "t": t, "ch": ch, "w": w, "h": h, "used": false, "bob": bob}


func _block_decoy(b: Dictionary) -> void:
	b.used = true
	b.c.modulate.a = 0.3
	b.g.line_style(5, 0x9a9a9a, 1)
	b.g.line_between(-b.w / 2 + 8, -b.h / 2 + 8, b.w / 2 - 8, b.h / 2 - 8)


func clear_wave() -> void:
	web = {}
	var objs: Array = []
	for s in slots:
		objs.append(s.g)
	for b in blocks:
		if b.bob:
			b.bob.kill()
		objs.append(b.c)
	if _hl_tween:
		_hl_tween.kill()
	objs.append(_slot_hl)
	for o in objs:
		if not is_instance_valid(o):
			continue
		var tw: Tween = o.create_tween()
		tw.tween_interval(0.8)
		tw.tween_property(o, "modulate:a", 0.0, 0.3)
		tw.tween_callback(o.queue_free)
	blocks = []
	slots = []
	_slot_hl = null


func _update_slot_hl() -> void:
	if _slot_hl == null:
		return
	_slot_hl.clear()
	if idx >= slots.size():
		return
	var s: Dictionary = slots[idx]
	_slot_hl.line_style(5, 0xffd166, 1)
	_slot_hl.stroke_rounded_rect(s.x - s.w / 2 - 5, s.y - s.h / 2 - 5, s.w + 10, s.h + 10, 12)


func _block_at(pos: Vector2) -> Variant:
	for b in blocks:
		if not b.used and absf(pos.x - b.c.position.x) <= b.w / 2 + 8 and absf(pos.y - b.c.position.y) <= b.h / 2 + 8:
			return b
	return null


# ---------- 팀 공격으로 고르기 ----------

## 블록 b 에 팀 공격을 쏜다. 다음 순서면 끌어오고, 아니면 줄이 끊어진다
func pick(b: Dictionary) -> void:
	if not wave_active or busy or b.is_empty() or b.used:
		return
	busy = true
	var expected: String = parts[idx]
	var judge := func() -> void:
		attack_hit(b.c.position.x, b.c.position.y)
		if b.ch == expected:
			_pull(b)
		else:
			_snap(b)
	if is_melee(): # 근접 팀: 블록 아래까지 뛰어올라 친다
		melee_to(func() -> Vector2: return Vector2(b.c.position.x, b.c.position.y + b.h / 2 + 34), judge, {"land": Vector2(W / 2, HERO_Y)})
		return
	var speed := float(ab.get("webSpeed", 1.0)) * float(attack_style.speed)
	player.flip_h = b.c.position.x < player.position.x - 10
	hero_shoot()
	var start := hand()
	var target: Vector2 = b.c.position
	web = {"to": start, "phase": "shoot"}
	tween_t(SHOOT_MS / speed, func(t: float) -> void: web.to = start.lerp(target, t), "linear", judge)


## 맞는 글자: 줄에 매달아 다음 빈칸으로 끌어온다 (근접 팀은 쳐서 날려 보낸다)
func _pull(b: Dictionary) -> void:
	b.used = true
	b.placed = true
	if b.bob:
		b.bob.kill()
	var slot: Dictionary = slots[idx]
	idx += 1
	wrong_count = 0
	var c: Node2D = b.c
	web = {} if is_melee() else {"to": c, "phase": "pull"}
	c.z_index = Z_WORLD + 2
	var dur := PULL_MS / float(ab.get("webSpeed", 1.0)) / 1000.0
	var tw := c.create_tween().set_parallel(true)
	if is_melee():
		tw.tween_property(c, "rotation_degrees", 360.0, dur)
	tw.tween_property(c, "position", Vector2(slot.x, slot.y), dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	tw.tween_property(c, "scale", Vector2(0.85, 0.85), dur).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	tw.chain().tween_callback(func() -> void:
		web = {}
		c.rotation = 0
		spark_burst(slot.x, slot.y, 10)
		_update_slot_hl()
		busy = false
		if idx >= parts.size():
			_complete()
		else:
			_flush_keys())


## 틀린 글자: 줄이 빨갛게 끊어지고 블록이 흔들린다
func _snap(b: Dictionary) -> void:
	if not is_melee():
		web = {"to": b.c.position, "phase": "snap"}
		after(140, func() -> void: web = {})
	b.t.color = Color("#ff5c5c")
	var c: Node2D = b.c
	var tw := c.create_tween()
	for i in 3:
		tw.tween_property(c, "rotation_degrees", 12.0, 0.06)
		tw.tween_property(c, "rotation_degrees", -12.0, 0.06)
	tw.tween_callback(func() -> void:
		c.rotation = 0
		b.t.color = Color.WHITE)
	_wrong()
	busy = false


## 순서가 틀림 (하트는 그대로). 여러 번 틀리면 다음 글자를 알려 준다
func _wrong() -> void:
	key_queue = []
	penalize(false)
	wrong_count += 1
	popup(W / 2, 245, "앗! 다음 글자가 아니에요", Color("#ff5c5c"))
	if wrong_count >= HINT_AFTER:
		_hint_next()


func _hint_next() -> void:
	for b in blocks:
		if not b.used and idx < parts.size() and b.ch == parts[idx]:
			var c: Node2D = b.c
			tween_yoyo(c, {"scale": Vector2(1.25, 1.25)}, 180, "linear", 3)
			spark_burst(c.position.x, c.position.y, 8)
			return


func _complete() -> void:
	var pts := award_correct(Vector2(W / 2, SLOT_Y))
	popup(W / 2, SLOT_Y + 75, "%s! +%d" % [word, pts], Color("#06d6a0"))
	if q.has("speak"):
		Voice.speak(str(q.speak))
	var i := 0
	for b in blocks:
		if b.get("placed", false):
			var c: Node2D = b.c
			var tw := c.create_tween()
			tw.tween_interval(i * 0.05)
			tw.tween_property(c, "position:y", SLOT_Y - 12, 0.14)
			tw.tween_property(c, "position:y", SLOT_Y, 0.14)
			i += 1
	end_wave(NEXT_DELAY)


func tick(_dt: float) -> void:
	if ended:
		return
	_web_gfx.clear()
	if web.is_empty():
		return
	var o := hand()
	var to: Vector2 = web.to.position if web.to is Node2D else web.to
	match web.phase:
		"shoot":
			draw_attack(_web_gfx, o, to)
		"pull":
			draw_tether(_web_gfx, o, to)
		_:
			_web_gfx.line_style(3, 0xff5c5c, 0.95)
			_web_gfx.line_between(o.x, o.y, to.x, to.y)


## 자동 플레이 (검증용): 다음 순서의 블록을 고른다
func auto_step() -> void:
	if not wave_active or busy or in_melee or idx >= parts.size():
		return
	for b in blocks:
		if not b.used and b.ch == parts[idx]:
			pick(b)
			return


func auto_wrong() -> bool:
	if busy or in_melee or idx >= parts.size():
		return false
	for b in blocks:
		if not b.used and b.ch != parts[idx]:
			pick(b)
			return true
	return false

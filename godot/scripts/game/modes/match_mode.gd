## 🃏 짝꿍 찾기 — 웹 판 game/modes/match-mode.js 를 옮겼다.
## 문제 카드와 답 카드를 잠깐 보여 준 뒤 뒤집는다. 두 장을 골라 짝이면 줄로 잇고 점수, 아니면 다시 뒤집는다(하트는 그대로).
## 한 화면에 여러 문제 → award_correct(pos, q) · penalize(false, q) · record_review(q) 로 문제를 지정한다.
## 조작: 카드 누르기 · 숫자 1~8
extends RoundBase

const CARD_W := 170.0
const CARD_H := 120.0
const GAP_X := 24.0
const GAP_Y := 26.0
const BOARD_TOP := 150.0
const FLIP_MS := 160.0
const MISMATCH_SHOW_MS := 700.0
const NEXT_DELAY := 1100.0

var cards: Array = []
var open: Array = []
var locked := true
var pairs_left := 0
var wave_qs: Array = []
var links: Array = []
var _web_gfx: Gfx


func intro_text() -> String:
	return "%s 출동!\n카드를 잘 기억하고 짝을 찾아요" % hero.name


## 카드에 쓸 문제 글자: "7 + 5 = ?" → "7 + 5", "🍎  →  ?" → "🍎"
static func card_text(qq: Dictionary) -> String:
	var re := RegEx.create_from_string("\\s*(=|→)\\s*\\?\\s*$")
	return re.sub(str(qq.prompt), "").strip_edges()


static func usable(qq: Dictionary) -> bool:
	return not qq.get("speakOnStart", false) and card_text(qq).length() > 0


func create_world() -> void:
	draw_backdrop({"city": {"baseY": 640, "color": 0x1a1f45, "range": [80, 200]}})
	create_hero(70, 560, 0.8)
	_web_gfx = Gfx.new()
	_web_gfx.z_index = Z_WEB
	add_child(_web_gfx)


func on_pointer(pos: Vector2) -> void:
	for c in cards:
		if absf(pos.x - c.c.position.x) <= CARD_W / 2 and absf(pos.y - c.c.position.y) <= CARD_H / 2:
			flip(c)
			return


func on_key(keycode: int, _u: int) -> void:
	var n := keycode - KEY_0
	if n >= 1 and n <= cards.size():
		flip(cards[n - 1])


# ---------- 판 만들기 ----------

func start_wave(first: Dictionary) -> void:
	var want := mini(int(level_value("matchPairsByLevel")), total_questions - q_index + 1)
	var qs := [first]
	var guard := 0
	while qs.size() < want and guard < 60:
		guard += 1
		var extra := pick_question()
		if not usable(extra) or qs.any(func(x): return x.answer == extra.answer or x.key == extra.key or card_text(x) == card_text(extra)):
			continue
		extra.missed = false
		qs.append(extra)
		recent.append(extra.key)
	if not usable(first):
		first.prompt = first.get("review", first.prompt)
	q_index += qs.size() - 1
	update_hud()
	set_prompt_text("짝을 찾아요!", "문제 카드와 답 카드를 이어 주세요")
	wave_qs = qs
	pairs_left = qs.size()
	var defs := []
	for i in qs.size():
		defs.append({"pair": i, "side": "q", "text": card_text(qs[i])})
		defs.append({"pair": i, "side": "a", "text": str(qs[i].answer)})
	defs.shuffle()
	var cols := 4
	var rows := ceili(defs.size() / float(cols))
	var total_w := cols * CARD_W + (cols - 1) * GAP_X
	var x0 := W / 2 - total_w / 2 + CARD_W / 2 + 40
	var y0 := BOARD_TOP + CARD_H / 2 + (80 if rows == 1 else 0)
	cards = []
	for i in defs.size():
		cards.append(_make_card(defs[i], x0 + (i % cols) * (CARD_W + GAP_X), y0 + int(i / cols) * (CARD_H + GAP_Y), i))
	locked = true
	var preview := level_value("matchPreviewMsByLevel") + float(ab.get("timeBonus", 0)) * 300
	after(preview, func() -> void:
		if not wave_active:
			return
		for c in cards:
			_turn(c, false)
		after(FLIP_MS * 2, func() -> void: locked = false))
	if ab.get("hint", false) and qs.size() > 2: # 탐정 · 스캐너 능력: 짝 하나를 처음부터 맞춰 둔다
		after(preview + FLIP_MS * 2 + 50, func() -> void:
			var pair := cards.filter(func(c): return c.pair == qs.size() - 1)
			if pair.size() == 2 and wave_active:
				_match(pair[0], pair[1], true))


func _make_card(def: Dictionary, x: float, y: float, i: int) -> Dictionary:
	var back := Gfx.new()
	back.fill_style(0x2b2d42, 1)
	back.fill_rounded_rect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14)
	back.line_style(3, shot_color, 0.9)
	back.stroke_rounded_rect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14)
	back.line_style(1.5, shot_color, 0.35)
	for k in 8:
		var a := k * PI / 4
		back.line_between(0, 0, cos(a) * 60, sin(a) * 45)
	back.stroke_circle(0, 0, 18)
	back.stroke_circle(0, 0, 36)
	var is_q: bool = def.side == "q"
	var front := Gfx.new()
	front.fill_style(0xe0f7ff if is_q else 0xfff3c4, 1)
	front.fill_rounded_rect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14)
	front.line_style(3, 0x4cc9f0 if is_q else 0xffb703, 1)
	front.stroke_rounded_rect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14)
	var tx: String = def.text
	var size := 22 if tx.length() > 9 else (28 if tx.length() > 6 else 36)
	var text := Txt.make(tx, size, Color("#1a1a2e"))
	text.wrap_width = CARD_W - 16
	text.position = Vector2(0, 2)
	var num := Txt.make(str(i + 1), 14, Color("#8d99ae"), 0, Color.BLACK, Vector2(0, 0))
	num.position = Vector2(-CARD_W / 2 + 10, -CARD_H / 2 + 6)
	var c := Node2D.new()
	for n in [back, front, text, num]:
		c.add_child(n)
	c.position = Vector2(x, y)
	c.z_index = Z_WORLD
	c.scale = Vector2.ZERO
	add_child(c)
	tween_to(c, {"scale": Vector2.ONE}, 300, "back_out", i * 40.0)
	var card := def.duplicate()
	card.merge({"c": c, "back": back, "front": front, "txt": text, "faceUp": true, "done": false})
	_show_face(card, true)
	return card


func _show_face(card: Dictionary, up: bool) -> void:
	card.faceUp = up
	card.back.visible = not up
	card.front.visible = up
	card.txt.visible = up


## 카드를 뒤집는 연출 (가로로 줄었다 펴짐)
func _turn(card: Dictionary, up: bool) -> void:
	var c: Node2D = card.c
	var tw := c.create_tween()
	tw.tween_property(c, "scale:x", 0.0, FLIP_MS / 1000.0).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)
	tw.tween_callback(func() -> void: _show_face(card, up))
	tw.tween_property(c, "scale:x", 1.0, FLIP_MS / 1000.0).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)


func clear_wave() -> void:
	links = []
	for card in cards:
		var c: Node2D = card.c
		var tw := c.create_tween()
		tw.tween_interval(0.5)
		tw.set_parallel(true)
		tw.tween_property(c, "modulate:a", 0.0, 0.3)
		tw.tween_property(c, "scale", Vector2(0.6, 0.6), 0.3)
		tw.chain().tween_callback(c.queue_free)
	cards = []
	open = []


# ---------- 고르기 ----------

func flip(card: Dictionary) -> void:
	if locked or not wave_active or card.done or card.faceUp:
		return
	Sfx.play("flip")
	_turn(card, true)
	open.append(card)
	if open.size() < 2:
		return
	var a: Dictionary = open[0]
	var b: Dictionary = open[1]
	open = []
	locked = true
	after(FLIP_MS * 2 + 80, func() -> void:
		if a.pair == b.pair:
			_match(a, b, false)
			locked = false
		else:
			penalize(false, wave_qs[a.pair])
			popup(W / 2 + 40, 600, "짝이 아니에요! 다시 기억해 봐요", Color("#ff5c5c"))
			after(MISMATCH_SHOW_MS, func() -> void:
				_turn(a, false)
				_turn(b, false)
				after(FLIP_MS * 2, func() -> void: locked = false)))


## 짝 성공: 두 카드를 줄로 잇고 점수. 마지막 짝이면 다음 판으로
func _match(a: Dictionary, b: Dictionary, by_hint: bool) -> void:
	a.done = true
	b.done = true
	if not a.faceUp:
		_turn(a, true)
	if not b.faceUp:
		_turn(b, true)
	links.append([a.c, b.c])
	var qq: Dictionary = wave_qs[a.pair]
	var m: Vector2 = (a.c.position + b.c.position) / 2
	var pts := award_correct(m, qq)
	popup(m.x, m.y - 30, ("스캐너로 찾았어요! +%d" if by_hint else "짝꿍! +%d") % pts, Color("#06d6a0"))
	if qq.has("speak") and not by_hint:
		Voice.speak(str(qq.speak))
	for k in [a, b]:
		tween_yoyo(k.c, {"scale": Vector2(1.08, 1.08)}, 120, "linear", 1)
		k.front.line_style(5, 0x06d6a0, 1)
		k.front.stroke_rounded_rect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14)
	if not is_same(qq, q): # 첫 문제는 end_wave 가 복습 노트에 기록한다
		record_review(qq)
	pairs_left -= 1
	if pairs_left <= 0:
		end_wave(NEXT_DELAY)


func tick(_dt: float) -> void:
	if ended:
		return
	_web_gfx.clear()
	_web_gfx.line_style(4, shot_color, 0.9)
	for l in links:
		if is_instance_valid(l[0]) and is_instance_valid(l[1]):
			_web_gfx.line_between(l[0].position.x, l[0].position.y, l[1].position.x, l[1].position.y)


## 자동 플레이 (검증용): 아직 못 맞춘 짝을 차례로 고른다
func auto_step() -> void:
	if locked or not wave_active or not open.is_empty():
		return
	for a in cards:
		if a.done:
			continue
		for b in cards:
			if not is_same(a, b) and not b.done and b.pair == a.pair:
				flip(a)
				after(10, func() -> void: flip(b))
				return


func auto_wrong() -> bool:
	if locked or not open.is_empty():
		return false
	var free := cards.filter(func(c): return not c.done)
	for a in free:
		for b in free:
			if a.pair != b.pair:
				flip(a)
				after(10, func() -> void: flip(b))
				return true
	return false

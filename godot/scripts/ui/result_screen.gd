## 결과 화면 + 새 히어로 합류 축하 (웹 판 ui/app.js showResult · celebrateJoin).
## 스타 = 한 번에 맞힌 문제 수 (+ 퍼펙트 보너스). 틀린 문제는 복습 노트에 저장되고, 영어는 🔊 로 다시 듣는다.
## 합류 축하: 카드를 눌러 뒤집으면 색종이 · 팡파르 · 히어로의 한마디.
class_name ResultScreen
extends Control

signal retry
signal menu

const CONFETTI_COLORS := [Color("#ffd166"), Color("#06d6a0"), Color("#4cc9f0"), Color("#ff4fa3"), Color("#e63946"), Color.WHITE]

var progress: Progress
var r: Dictionary
var earned := 0
var fresh: Array = []
var _join_queue: Array = []
var _overlay: Control


func _init(p: Progress, result: Dictionary, stars_earned: int, new_heroes: Array) -> void:
	progress = p
	r = result
	earned = stars_earned
	fresh = new_heroes


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(Kit.gradient_rect(Color("#2a1b5e"), Kit.C_BG_BOTTOM))
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	var panel := Kit.panel(Color(0, 0, 0, 0.4), 26)
	panel.custom_minimum_size = Vector2(640, 0)
	center.add_child(panel)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	panel.add_child(v)

	var title_text := "💪 아쉬워요! 다시 도전!" if int(r.heartsLeft) <= 0 else ("🏆 퍼펙트 미션!" if r.perfect else "🎉 미션 완료!")
	var title := UiText.make(title_text, 40, Kit.C_ACCENT, 0.5, Fonts.title)
	title.outline = 7
	title.name = "Title"
	v.add_child(title)
	title.pivot_offset = Vector2(300, 25)
	title.scale = Vector2(0.4, 0.4)
	title.create_tween().tween_property(title, "scale", Vector2.ONE, 0.45).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	v.add_child(_star_rating())

	var nxt := progress.next_hero()
	var stats := [
		["점수", "%d점" % int(r.score)],
		["한 번에 맞힌 문제", "%d / %d" % [int(r.firstTry), int(r.total)]],
		["최고 콤보", str(int(r.bestCombo))],
		["받은 스타", "⭐ +%d%s" % [earned, " (퍼펙트 보너스)" if r.perfect else ""]],
		["모은 스타", "⭐ %d" % progress.stars],
		["다음 합류", "%s까지 ⭐ %d개" % [nxt.name, int(nxt.unlockStars) - progress.stars] if not nxt.is_empty() else "히어로 모두 모음! 🎉"],
	]
	if not r.mistakes.is_empty():
		stats.append(["📒 복습 노트에 저장", "%d문제" % r.mistakes.size()])
	if int(r.reviewMastered) > 0:
		stats.append(["🎓 복습 졸업", "%d문제" % int(r.reviewMastered)])
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 24)
	grid.add_theme_constant_override("v_separation", 2)
	for row in stats:
		grid.add_child(UiText.make(row[0], 19, Kit.C_SUB, 1.0))
		grid.add_child(UiText.make(row[1], 21, Kit.C_TEXT, 0.0))
	var gc := CenterContainer.new()
	gc.add_child(grid)
	v.add_child(gc)

	for h in fresh:
		var row := HBoxContainer.new()
		row.alignment = BoxContainer.ALIGNMENT_CENTER
		row.add_child(HeroPic.make(h.id, 56, 63, "win"))
		row.add_child(UiText.make("🆕 %s에서 %s%s 합류했어요!" % [h.universe, h.name, Kit.josa_i_ga(h.name)], 19, Kit.C_ACCENT))
		v.add_child(row)

	var mist_title := UiText.make("틀린 문제 다시 보기", 17, Kit.C_SUB, 0.5)
	v.add_child(mist_title)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(0, 110)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var list := VBoxContainer.new()
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(list)
	v.add_child(scroll)
	if r.mistakes.is_empty():
		list.add_child(UiText.make("틀린 문제가 없어요! 정말 멋져요 👏", 19, Color("#06d6a0"), 0.5))
	for mq in r.mistakes:
		var row := HBoxContainer.new()
		var t := UiText.make(str(mq.get("review", mq.prompt)), 18, Kit.C_TEXT)
		t.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(t)
		if mq.has("speak"):
			var say := str(mq.speak)
			row.add_child(Kit.button("🔊", 16, "icon", func() -> void: Voice.speak(say)))
		list.add_child(row)

	var buttons := HBoxContainer.new()
	buttons.alignment = BoxContainer.ALIGNMENT_CENTER
	buttons.add_theme_constant_override("separation", 16)
	var again := Kit.button("🔁 다시 하기", 26, "go", func() -> void: retry.emit())
	again.name = "RetryButton"
	again.custom_minimum_size = Vector2(220, 60)
	var home := Kit.button("🏠 메뉴로", 24, "tile", func() -> void: menu.emit())
	home.name = "MenuButton"
	home.custom_minimum_size = Vector2(170, 60)
	buttons.add_child(again)
	buttons.add_child(home)
	v.add_child(buttons)

	_join_queue = fresh.duplicate()
	_show_next_join()


## 별 3개 평가 (한 번에 맞힌 비율): 90% 이상 ★3 · 60% 이상 ★2 · 끝까지 했으면 ★1. 하나씩 "쾅" 튀어나온다
func _star_rating() -> Control:
	var total := maxi(1, int(r.total))
	var ratio := float(r.firstTry) / total
	var n := 3 if ratio >= 0.9 else (2 if ratio >= 0.6 else (1 if int(r.heartsLeft) > 0 or ratio >= 0.3 else 0))
	var row := HBoxContainer.new()
	row.name = "Stars"
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 10)
	row.set_meta("count", n)
	for i in 3:
		var s := UiText.make("⭐", 52 if i == 1 else 42, Color.WHITE, 0.5)
		s.custom_minimum_size = Vector2(70, 64)
		s.modulate = Color(0.25, 0.25, 0.4, 0.8)
		row.add_child(s)
		if i < n:
			var tw := s.create_tween()
			tw.tween_interval(0.45 + i * 0.32)
			tw.tween_callback(func() -> void:
				s.modulate = Color.WHITE
				s.pivot_offset = s.size / 2
				s.scale = Vector2(2.2, 2.2)
				Sfx.play("coin"))
			tw.tween_property(s, "scale", Vector2.ONE, 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	return row


# ---------- 새 히어로 합류 축하 ----------

func _show_next_join() -> void:
	if is_instance_valid(_overlay):
		_overlay.queue_free()
	if _join_queue.is_empty():
		return
	var h: Dictionary = _join_queue.pop_front()
	var fam := Data.find_family(h)
	_overlay = Control.new()
	_overlay.name = "JoinOverlay"
	_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_overlay)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.75)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_overlay.add_child(dim)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_overlay.add_child(center)
	var v := VBoxContainer.new()
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	v.add_theme_constant_override("separation", 10)
	center.add_child(v)
	var title := UiText.make("%s 새 히어로 합류!" % fam.star, 34, Kit.C_ACCENT, 0.5, Fonts.title)
	title.outline = 7
	v.add_child(title)

	var card := Button.new()
	card.name = "JoinCard"
	card.focus_mode = Control.FOCUS_NONE
	card.custom_minimum_size = Vector2(240, 300)
	card.add_theme_stylebox_override("normal", Kit.box(Color("#3a0ca3"), 22, Kit.C_ACCENT, 5, 8))
	card.add_theme_stylebox_override("hover", Kit.box(Color("#4361ee"), 22, Kit.C_ACCENT, 5, 8))
	card.add_theme_stylebox_override("pressed", Kit.box(Color("#3a0ca3"), 22, Kit.C_ACCENT, 5, 8))
	card.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	var back := UiText.make("%s\n\n눌러서 확인!" % fam.star, 30, Color.WHITE, 0.5)
	back.name = "Back"
	back.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	card.add_child(back)
	var front := VBoxContainer.new()
	front.name = "Front"
	front.visible = false
	front.alignment = BoxContainer.ALIGNMENT_CENTER
	front.mouse_filter = Control.MOUSE_FILTER_IGNORE
	front.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var pic := HeroPic.make(h.id, 150, 168, "win", true)
	front.add_child(pic)
	front.add_child(UiText.make(h.name, 26, Color.WHITE, 0.5, Fonts.title))
	front.add_child(UiText.make(h.universe, 15, Kit.C_SUB, 0.5))
	var ability := UiText.make(h.abilityText, 14, Kit.C_ACCENT, 0.5)
	ability.wrap_width = 220
	front.add_child(ability)
	card.add_child(front)
	var cc := CenterContainer.new()
	cc.add_child(card)
	v.add_child(cc)

	var line := UiText.make("“%s”" % Data.hero_line(h, "catchphrase"), 22, Color.WHITE, 0.5)
	line.modulate.a = 0.0
	v.add_child(line)
	var ok := Kit.button("좋아요! 👍", 24, "big", _show_next_join)
	ok.name = "JoinOk"
	ok.custom_minimum_size = Vector2(200, 56)
	ok.visible = false
	var oc := CenterContainer.new()
	oc.add_child(ok)
	v.add_child(oc)
	Sfx.play("combo")
	# 카드가 둥실둥실 (눌러 달라는 신호)
	card.pivot_offset = Vector2(120, 150)
	var bob := card.create_tween().set_loops()
	bob.tween_property(card, "rotation_degrees", 3.0, 0.5).set_trans(Tween.TRANS_SINE)
	bob.tween_property(card, "rotation_degrees", -3.0, 0.5).set_trans(Tween.TRANS_SINE)
	card.pressed.connect(func() -> void:
		if front.visible:
			return
		bob.kill()
		card.rotation = 0
		Sfx.play("win")
		var tw := card.create_tween()
		tw.tween_property(card, "scale:x", 0.0, 0.18).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		tw.tween_callback(func() -> void:
			back.visible = false
			front.visible = true)
		tw.tween_property(card, "scale:x", 1.0, 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		_confetti()
		var tw2 := create_tween()
		tw2.tween_interval(0.65)
		tw2.tween_callback(func() -> void:
			ok.visible = true
			line.create_tween().tween_property(line, "modulate:a", 1.0, 0.3)))


## 색종이: 위에서 흩날리며 떨어진다
func _confetti() -> void:
	var layer := Control.new()
	layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_overlay.add_child(layer)
	var w := get_viewport_rect().size.x
	var h := get_viewport_rect().size.y
	for i in 60:
		var c := ColorRect.new()
		c.size = Vector2(randf_range(8, 14), randf_range(12, 20))
		c.color = CONFETTI_COLORS[i % CONFETTI_COLORS.size()]
		c.position = Vector2(randf() * w, -30)
		c.mouse_filter = Control.MOUSE_FILTER_IGNORE
		c.pivot_offset = c.size / 2
		layer.add_child(c)
		var dur := randf_range(1.6, 3.2)
		var tw := c.create_tween().set_parallel(true)
		tw.tween_property(c, "position", Vector2(c.position.x + randf_range(-80, 80), h + 30), dur).set_delay(randf() * 0.5).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		tw.tween_property(c, "rotation_degrees", randf_range(-720, 720), dur).set_delay(randf() * 0.5)

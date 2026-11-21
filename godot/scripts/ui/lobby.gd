## 로비 (메뉴 화면): 히어로 무대 · 출동 버튼 · 놀이 · 과목 · 단계 · 출신별 히어로 도감 · 소리 설정.
## 웹 판 ui/app.js renderMenu 와 같은 규칙 (도감은 출신별 묶음, 잠긴 히어로는 ??? + 필요한 스타, 다음 합류 히어로는 이름 미리 보기).
## @see doc/planning/game-design.md (8. 화면 구성)
class_name Lobby
extends Control

signal start_requested

var progress: Progress
var _stage_pic: HeroPic
var _stage_name: UiText
var _stage_team: UiText
var _stage_universe: UiText
var _stage_ability: UiText
var _star_text: UiText
var _count_text: UiText
var _next_text: UiText
var _next_bar: ProgressBar
var _modes_box: GridContainer
var _subjects_box: HFlowContainer
var _levels_box: HFlowContainer
var _book: VBoxContainer
var _sfx_btn: Button
var _bgm_btn: Button
var _voice_btn: Button
var _scroll: ScrollContainer
var _hero_buttons: Dictionary = {}


func _init(p: Progress) -> void:
	progress = p


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(Kit.gradient_rect(Kit.C_BG_TOP, Kit.C_BG_BOTTOM))
	add_child(_sky())

	var root := VBoxContainer.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.offset_left = 14
	root.offset_right = -14
	root.offset_top = 8
	root.offset_bottom = -10
	root.add_theme_constant_override("separation", 8)
	add_child(root)
	root.add_child(_top_bar())

	var body := HBoxContainer.new()
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 12)
	root.add_child(body)
	body.add_child(_stage())

	_scroll = ScrollContainer.new()
	_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_scroll.scroll_deadzone = 12
	body.add_child(_scroll)
	var right := VBoxContainer.new()
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.add_theme_constant_override("separation", 10)
	_scroll.add_child(right)

	right.add_child(_section_title("🎮 놀이 고르기"))
	_modes_box = GridContainer.new()
	_modes_box.columns = 4
	_modes_box.add_theme_constant_override("h_separation", 8)
	_modes_box.add_theme_constant_override("v_separation", 8)
	right.add_child(_modes_box)

	right.add_child(_section_title("📚 과목"))
	_subjects_box = HFlowContainer.new()
	_subjects_box.add_theme_constant_override("h_separation", 6)
	_subjects_box.add_theme_constant_override("v_separation", 6)
	right.add_child(_subjects_box)

	right.add_child(_section_title("🪜 단계 (추천 학년)"))
	_levels_box = HFlowContainer.new()
	_levels_box.add_theme_constant_override("h_separation", 6)
	_levels_box.add_theme_constant_override("v_separation", 6)
	right.add_child(_levels_box)

	right.add_child(_section_title("📖 히어로 도감"))
	_book = VBoxContainer.new()
	_book.add_theme_constant_override("separation", 6)
	right.add_child(_book)
	_build_book()
	render()


# ---------- 배경: 반짝이는 별 ----------

func _sky() -> Control:
	var c := Control.new()
	c.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for i in 40:
		var s := ColorRect.new()
		var r := randf_range(1.5, 3.5)
		s.size = Vector2(r, r)
		s.position = Vector2(randf_range(0, 1400), randf_range(0, 700))
		s.color = Color(1, 1, 1, randf_range(0.3, 0.9))
		s.mouse_filter = Control.MOUSE_FILTER_IGNORE
		c.add_child(s)
		var tw := s.create_tween().set_loops()
		tw.tween_property(s, "modulate:a", 0.15, randf_range(0.6, 1.6)).set_delay(randf_range(0, 1.5))
		tw.tween_property(s, "modulate:a", 1.0, randf_range(0.6, 1.6))
	return c


# ---------- 위 막대 ----------

func _top_bar() -> Control:
	var bar := HBoxContainer.new()
	bar.add_theme_constant_override("separation", 8)
	var title := UiText.make("🦸 히어로 대작전", 30, Kit.C_ACCENT, 0.0, Fonts.title)
	title.outline = 6
	bar.add_child(title)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar.add_child(spacer)
	var star_box := Kit.panel(Color(0, 0, 0, 0.35), 16)
	_star_text = UiText.make("⭐ 0", 22, Kit.C_ACCENT)
	star_box.add_child(_star_text)
	bar.add_child(star_box)
	var count_box := Kit.panel(Color(0, 0, 0, 0.35), 16)
	_count_text = UiText.make("🦸 0 / 0", 20, Kit.C_TEXT)
	count_box.add_child(_count_text)
	bar.add_child(count_box)
	_sfx_btn = Kit.button("🔊", 20, "icon", func() -> void: _toggle_sound("sfx"))
	_bgm_btn = Kit.button("🎵", 20, "icon", func() -> void: _toggle_sound("bgm"))
	_voice_btn = Kit.button("🗣️ 목소리", 16, "icon", func() -> void:
		Voice.next_voice()
		_render_sound())
	bar.add_child(_sfx_btn)
	bar.add_child(_bgm_btn)
	bar.add_child(_voice_btn)
	return bar


# ---------- 왼쪽: 히어로 무대 ----------

func _stage() -> Control:
	var p := Kit.panel(Color(0, 0, 0, 0.3), 22)
	p.custom_minimum_size = Vector2(270, 0)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	p.add_child(v)
	_stage_team = UiText.make("", 15, Kit.C_SUB, 0.5)
	v.add_child(_stage_team)
	var holder := Control.new()
	holder.custom_minimum_size = Vector2(240, 210)
	v.add_child(holder)
	var glow := Gfx.new()
	glow.position = Vector2(121, 118)
	holder.add_child(glow)
	for i in 6:
		glow.fill_style(0xffd166, 0.05)
		glow.fill_circle(0, 0, 100 - i * 14)
	var spin := glow.create_tween().set_loops()
	spin.tween_property(glow, "scale", Vector2(1.08, 1.08), 1.2).set_trans(Tween.TRANS_SINE)
	spin.tween_property(glow, "scale", Vector2.ONE, 1.2).set_trans(Tween.TRANS_SINE)
	_stage_pic = HeroPic.make(progress.hero_id, 192, 216, "idle", true)
	_stage_pic.position = Vector2(25, -6)
	_stage_pic.size = Vector2(192, 216)
	holder.add_child(_stage_pic)
	_stage_name = UiText.make("", 30, Kit.C_TEXT, 0.5, Fonts.title)
	_stage_name.outline = 6
	v.add_child(_stage_name)
	_stage_universe = UiText.make("", 15, Kit.C_SUB, 0.5)
	v.add_child(_stage_universe)
	_stage_ability = UiText.make("", 15, Kit.C_ACCENT, 0.5)
	_stage_ability.wrap_width = 236
	v.add_child(_stage_ability)
	var fill := Control.new()
	fill.size_flags_vertical = Control.SIZE_EXPAND_FILL
	v.add_child(fill)
	_next_text = UiText.make("", 14, Kit.C_SUB, 0.5)
	_next_text.wrap_width = 236
	v.add_child(_next_text)
	_next_bar = ProgressBar.new()
	_next_bar.show_percentage = false
	_next_bar.custom_minimum_size = Vector2(0, 12)
	_next_bar.add_theme_stylebox_override("background", Kit.box(Color(1, 1, 1, 0.12), 6))
	_next_bar.add_theme_stylebox_override("fill", Kit.box(Kit.C_ACCENT, 6))
	v.add_child(_next_bar)
	var start := Kit.button("🚀 출동!", 34, "big", func() -> void: start_requested.emit())
	start.custom_minimum_size.y = 72
	start.name = "StartButton"
	v.add_child(start)
	# 출동 버튼이 살짝 숨쉬며 눈길을 끈다
	start.pivot_offset = Vector2(120, 36)
	var tw := start.create_tween().set_loops()
	tw.tween_property(start, "scale", Vector2(1.04, 1.04), 0.7).set_trans(Tween.TRANS_SINE)
	tw.tween_property(start, "scale", Vector2.ONE, 0.7).set_trans(Tween.TRANS_SINE)
	return p


func _section_title(t: String) -> Control:
	var u := UiText.make(t, 20, Kit.C_ACCENT)
	u.outline = 4
	return u


# ---------- 그리기 ----------

func render() -> void:
	var hero := Data.find_hero(progress.hero_id)
	if not progress.selectable(hero):
		progress.hero_id = "spider-man"
		hero = Data.find_hero(progress.hero_id)
	_star_text.text = "⭐ %d" % progress.stars
	_count_text.text = "🦸 %d / %d" % [progress.earned_count(), Data.heroes.size()]
	var nxt := progress.next_hero()
	if nxt.is_empty():
		_next_text.text = "⭐ 히어로를 모두 모았어요! 🎉"
		_next_bar.value = 100
	else:
		_next_text.text = "⭐ 다음 합류: %s까지 %d개 더" % [nxt.name, int(nxt.unlockStars) - progress.stars]
		var idx := Data.heroes.find(nxt)
		var prev := int(Data.heroes[idx - 1].unlockStars) if idx > 0 else 0
		_next_bar.max_value = maxf(1.0, float(nxt.unlockStars) - prev)
		_next_bar.value = clampf(float(progress.stars - prev), 0.0, _next_bar.max_value)
	var fam := Data.find_family(hero)
	_stage_team.text = "%s %s 능력" % [fam.star, fam.name]
	_stage_name.text = hero.name
	_stage_universe.text = hero.universe
	_stage_ability.text = hero.abilityText
	_stage_pic.set_hero(hero.id)
	_render_modes()
	_render_subjects()
	_render_levels()
	_render_book_state()
	_render_sound()


func _render_modes() -> void:
	for c in _modes_box.get_children():
		c.queue_free()
	for m in Data.modes:
		var desc: String = str(m.desc).trim_prefix("NEW · ")
		desc = desc.split(" · ")[-1]
		var b := Kit.button("%s %s" % [m.icon, m.label], 18, "tile", _pick_mode.bind(m.id), desc if desc.length() < 16 else desc.substr(0, 15) + "…")
		b.custom_minimum_size = Vector2(150, 64)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.tooltip_text = str(m.desc)
		Kit.set_selected(b, m.id == progress.mode)
		if m.get("isNew", false):
			var badge := UiText.make("NEW", 12, Color.WHITE, 0.5)
			badge.outline = 4
			badge.outline_color = Kit.C_PINK
			badge.position = Vector2(118, -6)
			b.add_child(badge)
		_modes_box.add_child(b)


func _render_subjects() -> void:
	for c in _subjects_box.get_children():
		c.queue_free()
	var kind := "spell" if progress.mode == "spell" else "choice"
	var review_count := Review.count(kind)
	if progress.subject == "review" and review_count == 0:
		progress.subject = "add"
	for s in Data.subjects:
		var is_review: bool = s.id == "review"
		var sub := ""
		if is_review:
			sub = "%d문제" % review_count if review_count > 0 else "아직 없어요"
		var b := Kit.button("%s %s" % [s.icon, s.label], 18, "chip", _pick_subject.bind(s.id), sub)
		Kit.set_selected(b, s.id == progress.subject)
		b.disabled = is_review and review_count == 0
		_subjects_box.add_child(b)


func _render_levels() -> void:
	for c in _levels_box.get_children():
		c.queue_free()
	for l in Data.levels:
		var b := Kit.button(str(l.label), 17, "chip", _pick_level.bind(int(l.id)), "추천 %s" % l.grade)
		b.custom_minimum_size.x = 76
		Kit.set_selected(b, int(l.id) == progress.level)
		_levels_box.add_child(b)


## 도감은 한 번만 만들고 (히어로 81명), 선택 · 잠금 표시만 바꾼다
func _build_book() -> void:
	for origin in Data.origins:
		var members := Data.heroes.filter(func(h): return h.origin == origin.id)
		if members.is_empty():
			continue
		var head := HBoxContainer.new()
		var name_t := UiText.make("%s %s" % [origin.icon, origin.name], 18, Kit.C_TEXT)
		name_t.name = "Name"
		head.add_child(name_t)
		var cnt := UiText.make("", 15, Kit.C_SUB)
		cnt.name = "Count_" + str(origin.id)
		head.add_child(cnt)
		_book.add_child(head)
		var grid := HFlowContainer.new()
		grid.add_theme_constant_override("h_separation", 6)
		grid.add_theme_constant_override("v_separation", 6)
		_book.add_child(grid)
		for h in members:
			grid.add_child(_hero_card(h))


func _hero_card(hero: Dictionary) -> Button:
	var b := Button.new()
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(82, 108)
	b.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	var v := VBoxContainer.new()
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	v.add_theme_constant_override("separation", 0)
	var pic := HeroPic.make(hero.id, 72, 80)
	pic.name = "Pic"
	v.add_child(pic)
	var nm := UiText.make(hero.name, 12, Kit.C_TEXT, 0.5)
	nm.name = "Label"
	nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_child(nm)
	b.add_child(v)
	var lock := UiText.make("", 12, Kit.C_ACCENT, 0.5)
	lock.name = "Lock"
	lock.position = Vector2(4, 4)
	b.add_child(lock)
	b.pressed.connect(func() -> void:
		Sfx.play("click")
		Kit.pop(b)
		progress.hero_id = hero.id
		render())
	_hero_buttons[hero.id] = b
	return b


func _render_book_state() -> void:
	var nxt := progress.next_hero()
	for h in Data.heroes:
		var b: Button = _hero_buttons.get(h.id)
		if b == null:
			continue
		var ok := progress.selectable(h)
		var is_next: bool = not nxt.is_empty() and nxt.id == h.id
		b.disabled = not ok
		var selected: bool = h.id == progress.hero_id
		var base := Kit.box(Color(1, 1, 1, 0.08) if ok else Color(0, 0, 0, 0.3), 14, Kit.C_SELECTED if selected else (Kit.C_PINK if is_next else Color(1, 1, 1, 0.12)), 4 if selected else 2)
		b.add_theme_stylebox_override("normal", base)
		b.add_theme_stylebox_override("hover", Kit.box(Color(1, 1, 1, 0.16), 14, base.border_color, base.border_width_left))
		b.add_theme_stylebox_override("pressed", base)
		b.add_theme_stylebox_override("disabled", base)
		b.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
		var pic: HeroPic = b.find_child("Pic", true, false)
		pic.modulate = Color.WHITE if ok else Color(0.1, 0.1, 0.15, 0.9)
		var label: UiText = b.find_child("Label", true, false)
		label.text = h.name if ok or is_next else "???"
		var lock: UiText = b.find_child("Lock", true, false)
		lock.text = "" if ok else "🔒 %d" % int(h.unlockStars)
		var fam := Data.find_family(h)
		b.tooltip_text = "%s — %s %s · %s" % [h.name, fam.star, fam.name, h.abilityText] if ok else "⭐ %d개 모으면 합류 (지금 %d개)" % [int(h.unlockStars), progress.stars]
	for origin in Data.origins:
		var cnt: UiText = _book.find_child("Count_" + str(origin.id), true, false)
		if cnt:
			var members := Data.heroes.filter(func(h): return h.origin == origin.id)
			cnt.text = "  %d / %d" % [members.filter(func(h): return progress.earned(h)).size(), members.size()]


func _render_sound() -> void:
	Kit.label_of(_sfx_btn).text = "🔊" if Sfx.is_enabled("sfx") else "🔇"
	Kit.label_of(_bgm_btn).text = "🎵" if Sfx.is_enabled("bgm") else "🔕"
	_sfx_btn.tooltip_text = "효과음 켜기 · 끄기"
	_bgm_btn.tooltip_text = "배경음 켜기 · 끄기"
	_voice_btn.visible = Voice.packs().size() >= 2
	Kit.label_of(_voice_btn).text = "🗣️ " + Voice.label()


func _toggle_sound(kind: String) -> void:
	Sfx.set_enabled(kind, not Sfx.is_enabled(kind))
	if kind == "sfx" and Sfx.is_enabled("sfx"):
		Sfx.play("click")
	_render_sound()


func _pick_mode(id: String) -> void:
	progress.mode = id
	render()


func _pick_subject(id: String) -> void:
	progress.subject = id
	render()


func _pick_level(id: int) -> void:
	progress.level = id
	render()

## 로비 (메뉴 화면): 히어로 무대 · 출동 버튼 · 놀이 · 과목 · 단계 · 출신별 히어로 도감 · 소리 설정.
## 웹 판 ui/app.js renderMenu 와 같은 규칙 (도감은 출신별 묶음, 잠긴 히어로는 ??? + 필요한 스타, 다음 합류 히어로는 이름 미리 보기).
## 화면 연출 (상용 게임 느낌, 2026-11-21): 도는 조명 · 떠다니는 빛 입자 · 도시 실루엣 · 무대 받침 · 출동 버튼 반짝임.
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
var _rays: Gfx
var _stage_glow: Sprite2D


func _init(p: Progress) -> void:
	progress = p


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(Kit.gradient_rect(Kit.C_BG_TOP, Kit.C_BG_BOTTOM))
	add_child(_backdrop())

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

	right.add_child(_section_title("놀이 고르기", Color("#4cc9f0")))
	_modes_box = GridContainer.new()
	_modes_box.columns = 4
	_modes_box.add_theme_constant_override("h_separation", 8)
	_modes_box.add_theme_constant_override("v_separation", 8)
	right.add_child(_modes_box)

	right.add_child(_section_title("과목", Color("#06d6a0")))
	_subjects_box = HFlowContainer.new()
	_subjects_box.add_theme_constant_override("h_separation", 6)
	_subjects_box.add_theme_constant_override("v_separation", 6)
	right.add_child(_subjects_box)

	right.add_child(_section_title("단계 (추천 학년)", Color("#ff9f1c")))
	_levels_box = HFlowContainer.new()
	_levels_box.add_theme_constant_override("h_separation", 6)
	_levels_box.add_theme_constant_override("v_separation", 6)
	right.add_child(_levels_box)

	right.add_child(_section_title("히어로 도감", Color("#ff4fa3")))
	_book = VBoxContainer.new()
	_book.add_theme_constant_override("separation", 6)
	right.add_child(_book)
	_build_book()
	render()


# ---------- 배경: 도시 실루엣 · 떠다니는 빛 ----------

func _backdrop() -> Control:
	var c := Control.new()
	c.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# 멀리 있는 도시 (아래쪽, 어둡게)
	var city := Gfx.new()
	city.position = Vector2(0, 0)
	var x := -40.0
	while x < 1800:
		var bw := randf_range(40, 100)
		var bh := randf_range(60, 200)
		city.fill_style(0x0d1033, 1)
		city.fill_rect(x, 700 - bh, bw - 3, bh)
		city.fill_style(0xffc93c, 0.18)
		var wy := 700 - bh + 10
		while wy < 690:
			var wx := x + 6
			while wx < x + bw - 10:
				if randf() < 0.3:
					city.fill_rect(wx, wy, 5, 7)
				wx += 13
			wy += 16
		x += bw
	c.add_child(city)
	c.resized.connect(func() -> void: city.position.y = c.size.y - 700)
	# 떠다니는 빛 입자 (빛을 더하는 재질)
	var p := CPUParticles2D.new()
	p.texture = Kit.glow_texture(32)
	p.material = Kit.additive()
	p.amount = 40
	p.lifetime = 9.0
	p.preprocess = 9.0
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.emission_rect_extents = Vector2(900, 20)
	p.position = Vector2(700, 760)
	p.direction = Vector2(0, -1)
	p.spread = 25
	p.gravity = Vector2.ZERO
	p.initial_velocity_min = 30
	p.initial_velocity_max = 70
	p.scale_amount_min = 0.2
	p.scale_amount_max = 0.7
	var ramp := Gradient.new()
	ramp.set_color(0, Color(0.6, 0.7, 1, 0))
	ramp.add_point(0.3, Color(0.7, 0.8, 1, 0.5))
	ramp.set_color(1, Color(1, 0.8, 0.5, 0))
	p.color_ramp = ramp
	c.add_child(p)
	return c


# ---------- 위 막대 ----------

func _pill(text_node: UiText, accent: Color) -> PanelContainer:
	var p := PanelContainer.new()
	var s := Kit.box(Color(0.04, 0.05, 0.14, 0.85), 20, accent, 2, 4)
	s.content_margin_left = 14
	s.content_margin_right = 16
	s.content_margin_top = 4
	s.content_margin_bottom = 4
	p.add_theme_stylebox_override("panel", s)
	p.add_child(text_node)
	return p


func _top_bar() -> Control:
	var bar := HBoxContainer.new()
	bar.add_theme_constant_override("separation", 8)
	var title := UiText.make("히어로 대작전", 32, Kit.C_ACCENT, 0.0, Fonts.title)
	title.outline = 8
	title.outline_color = Color("#3a1060")
	bar.add_child(title)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar.add_child(spacer)
	_star_text = UiText.make("⭐ 0", 22, Kit.C_ACCENT, 0.0, Fonts.title)
	bar.add_child(_pill(_star_text, Color(1, 0.79, 0.24, 0.6)))
	_count_text = UiText.make("🦸 0 / 0", 20, Kit.C_TEXT, 0.0, Fonts.title)
	bar.add_child(_pill(_count_text, Color(0.3, 0.8, 0.94, 0.5)))
	_sfx_btn = Kit.button("🔊", 20, "icon", func() -> void: _toggle_sound("sfx"))
	_bgm_btn = Kit.button("🎵", 20, "icon", func() -> void: _toggle_sound("bgm"))
	_voice_btn = Kit.button("🗣️ 목소리", 15, "icon", func() -> void:
		Voice.next_voice()
		_render_sound())
	bar.add_child(_sfx_btn)
	bar.add_child(_bgm_btn)
	bar.add_child(_voice_btn)
	return bar


# ---------- 왼쪽: 히어로 무대 ----------

func _stage() -> Control:
	var p := Kit.panel(Color(0.05, 0.05, 0.16, 0.88), 22)
	p.custom_minimum_size = Vector2(270, 0)
	p.clip_contents = true
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 4)
	p.add_child(v)
	_stage_team = UiText.make("", 15, Kit.C_SUB, 0.5, Fonts.title)
	v.add_child(_stage_team)
	var holder := Control.new()
	holder.custom_minimum_size = Vector2(240, 220)
	v.add_child(holder)
	# 도는 조명 줄기 (빛을 더하는 재질 — 겹칠수록 밝다)
	_rays = Gfx.new()
	_rays.position = Vector2(121, 120)
	_rays.material = Kit.additive()
	for i in 12:
		var a := i * TAU / 12
		_rays.fill_style(0xffc93c if i % 2 else 0x7b5cff, 0.10)
		_rays.fill_triangle(0, 0, cos(a - 0.12) * 220, sin(a - 0.12) * 220, cos(a + 0.12) * 220, sin(a + 0.12) * 220)
	holder.add_child(_rays)
	var spin := _rays.create_tween().set_loops()
	spin.tween_property(_rays, "rotation", TAU, 24.0).from(0.0)
	# 뒤에서 비추는 빛 + 무대 받침
	_stage_glow = Sprite2D.new()
	_stage_glow.texture = Kit.glow_texture(256)
	_stage_glow.material = Kit.additive()
	_stage_glow.modulate = Color(1, 0.8, 0.5, 0.55)
	_stage_glow.position = Vector2(121, 110)
	_stage_glow.scale = Vector2(0.9, 0.9)
	holder.add_child(_stage_glow)
	var pulse := _stage_glow.create_tween().set_loops()
	pulse.tween_property(_stage_glow, "scale", Vector2(1.05, 1.05), 1.4).set_trans(Tween.TRANS_SINE)
	pulse.tween_property(_stage_glow, "scale", Vector2(0.9, 0.9), 1.4).set_trans(Tween.TRANS_SINE)
	var base := Gfx.new()
	base.position = Vector2(121, 205)
	base.fill_style(0x000000, 0.35)
	base.fill_ellipse(0, 6, 190, 34)
	base.fill_style(0x2b2f6e, 1)
	base.fill_ellipse(0, 0, 170, 30)
	base.line_style(3, 0xffc93c, 0.8)
	base.stroke_ellipse(0, 0, 170, 30)
	holder.add_child(base)
	_stage_pic = HeroPic.make(progress.hero_id, 192, 216, "idle", true)
	_stage_pic.position = Vector2(25, -10)
	_stage_pic.size = Vector2(192, 216)
	holder.add_child(_stage_pic)
	_stage_name = UiText.make("", 30, Kit.C_TEXT, 0.5, Fonts.title)
	_stage_name.outline = 7
	_stage_name.outline_color = Color("#3a1060")
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
	_next_bar.custom_minimum_size = Vector2(0, 14)
	_next_bar.add_theme_stylebox_override("background", Kit.box(Color(0, 0, 0, 0.5), 7, Color(1, 1, 1, 0.15), 1))
	_next_bar.add_theme_stylebox_override("fill", Kit.box(Kit.C_ACCENT, 7))
	v.add_child(_next_bar)
	var start := Kit.button("출동!", 36, "big", func() -> void: start_requested.emit())
	start.custom_minimum_size.y = 78
	start.name = "StartButton"
	start.clip_contents = true
	v.add_child(start)
	_add_shine(start)
	start.pivot_offset = Vector2(120, 39)
	var tw := start.create_tween().set_loops()
	tw.tween_property(start, "scale", Vector2(1.03, 1.03), 0.7).set_trans(Tween.TRANS_SINE)
	tw.tween_property(start, "scale", Vector2.ONE, 0.7).set_trans(Tween.TRANS_SINE)
	return p


## 버튼 위를 비스듬한 빛이 지나간다 (2.5초마다)
func _add_shine(b: Control) -> void:
	var s := ColorRect.new()
	s.color = Color(1, 1, 1, 0.35)
	s.size = Vector2(26, 160)
	s.rotation_degrees = 20
	s.position = Vector2(-80, -40)
	s.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(s)
	var tw := s.create_tween().set_loops()
	tw.tween_interval(1.6)
	tw.tween_property(s, "position:x", 320.0, 0.6).from(-80.0).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)


func _section_title(t: String, accent: Color) -> Control:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 8)
	var bar := ColorRect.new()
	bar.color = accent
	bar.custom_minimum_size = Vector2(6, 22)
	h.add_child(bar)
	var u := UiText.make(t, 20, Kit.C_TEXT, 0.0, Fonts.title)
	u.outline = 5
	u.outline_color = Color(0, 0, 0, 0.6)
	h.add_child(u)
	return h


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
	if _stage_pic.hero_id != hero.id:
		_stage_pic.set_hero(hero.id)
		# 히어로를 바꾸면 무대에 등장 연출
		_stage_pic.pivot_offset = Vector2(96, 216)
		_stage_pic.scale = Vector2(0.6, 1.25)
		_stage_pic.create_tween().tween_property(_stage_pic, "scale", Vector2.ONE, 0.35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	var col := Data.family_color(hero)
	_stage_glow.modulate = Color(col.r, col.g, col.b, 0.6)
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
		b.custom_minimum_size = Vector2(150, 70)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.tooltip_text = str(m.desc)
		Kit.set_selected(b, m.id == progress.mode)
		if m.get("isNew", false):
			var badge := PanelContainer.new()
			var bs := Kit.box(Kit.C_PINK, 8)
			bs.content_margin_left = 6
			bs.content_margin_right = 6
			badge.add_theme_stylebox_override("panel", bs)
			badge.add_child(UiText.make("NEW", 11, Color.WHITE, 0.5, Fonts.title))
			badge.position = Vector2(108, -8)
			badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
			b.add_child(badge)
		_modes_box.add_child(b)
	# 시험: 히어로 러너의 히어로를 3D 모델로 (상용 게임 방향 A 비교용, 2026-11-21)
	var on := bool(Store.get_value("hero3d", true))
	var t := Kit.button("🧪 3D 러너 시험", 16, "tile", func() -> void:
		Store.set_value("hero3d", not bool(Store.get_value("hero3d", true)))
		render(), "켜짐 · 러너에서 3D 캐릭터" if on else "꺼짐 · 2D 그림")
	t.name = "Hero3DToggle"
	t.custom_minimum_size = Vector2(150, 70)
	t.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	Kit.set_selected(t, on)
	_modes_box.add_child(t)


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
		var b := Kit.button("%s %s" % [s.icon, s.label], 17, "chip", _pick_subject.bind(s.id), sub)
		Kit.set_selected(b, s.id == progress.subject)
		b.disabled = is_review and review_count == 0
		_subjects_box.add_child(b)


func _render_levels() -> void:
	for c in _levels_box.get_children():
		c.queue_free()
	for l in Data.levels:
		var b := Kit.button(str(l.label), 16, "chip", _pick_level.bind(int(l.id)), "추천 %s" % l.grade)
		b.custom_minimum_size.x = 78
		Kit.set_selected(b, int(l.id) == progress.level)
		_levels_box.add_child(b)


## 도감은 한 번만 만들고 (히어로 81명), 선택 · 잠금 표시만 바꾼다
func _build_book() -> void:
	for origin in Data.origins:
		var members := Data.heroes.filter(func(h): return h.origin == origin.id)
		if members.is_empty():
			continue
		var head := HBoxContainer.new()
		var name_t := UiText.make("%s %s" % [origin.icon, origin.name], 18, Kit.C_TEXT, 0.0, Fonts.title)
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
	b.custom_minimum_size = Vector2(84, 112)
	b.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	var v := VBoxContainer.new()
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	v.offset_bottom = -4
	v.add_theme_constant_override("separation", 0)
	var pic := HeroPic.make(hero.id, 72, 82)
	pic.name = "Pic"
	v.add_child(pic)
	var nm := UiText.make(hero.name, 12, Kit.C_TEXT, 0.5)
	nm.name = "Label"
	nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_child(nm)
	b.add_child(v)
	var lock := UiText.make("", 12, Kit.C_ACCENT, 0.5, Fonts.title)
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
		var top := Color("#2a3478") if ok else Color(0.05, 0.06, 0.14, 0.9)
		var base := Kit.face(top, Color("#141a45"), 14, 4, Color(1, 0.75, 0.2, 0.7) if selected else (Color(1, 0.3, 0.65, 0.5) if is_next else Color(0, 0, 0, 0)))
		if selected:
			base.border_color = Color("#ffb627")
		b.add_theme_stylebox_override("normal", base)
		var hover := Kit.face(top.lightened(0.12), Color("#141a45"), 14, 4, Color(1, 0.75, 0.2, 0.7) if selected else Color(0, 0, 0, 0))
		b.add_theme_stylebox_override("hover", hover)
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

## 모든 놀이가 함께 쓰는 "한 판" 기반 — 웹 판 game/round-scene.js (RoundScene) 를 옮겼다.
## 하트 · 점수 · 콤보 · 문제 진행 · HUD · 액션 연출 · 히어로 애니메이션 · 말풍선 · 결과 전달.
## 놀이(modes/*)가 구현할 훅: intro_text() · question_options() · question_count() · create_world() · start_wave(q) · clear_wave()
##                             선택: music_name() · finish_message(perfect) · on_pointer(pos) · on_key(keycode) · tick(dt)
## 놀이가 쓰는 공통 기능: award_correct() · penalize() · end_wave() · hero_shoot() · melee_to() · set_hero_base() · set_hero_pose()
##                        draw_attack() · attack_hit() · draw_tether() · time_limit_ms() · decoy_index() · popup() · after()
## 게임 좌표는 960 x 640 고정 (카메라가 가운데를 맞추고, 넓은 화면은 양옆이 더 보인다).
## @see doc/planning/game-design.md (3. 핵심 루프, 6. 점수와 보상, 9. 연출)
class_name RoundBase
extends Node2D

signal finished(result: Dictionary)
signal quit_requested

const W := 960.0
const H := 640.0
const HUD_H := 96.0
const HERO_SIZE := Vector2(96, 108)
## 깊이(z_index): 배경 0 · 세상 10 · 줄 20 · 히어로 30 · 팝업 40 · 연출 41 · HUD 50
const Z_SKY := -2
const Z_AMBIENT := -1
const Z_BG := 0
const Z_WORLD := 10
const Z_WEB := 20
const Z_HERO := 30
const Z_POPUP := 40
const Z_FX := 41
const Z_HUD := 50

const BASE_POINTS := 100
const COMBO_STEP := 20
const INTRO_MS := 1500.0
const RECENT_LIMIT := 8
const Q_FONT := 46
const Q_FONT_MIN := 24
const HINT_FONT := 18
const HINT_FONT_MIN := 13
const TEXT_SIDE_MARGIN := 150.0
const BURST_COLORS := [0xffd166, 0x06d6a0, 0x4cc9f0, 0xff4fa3, 0xffffff]
const COMBO_MILESTONES := [3, 5, 7, 10]
const POSE_MS := {"attack": 260.0, "win": 650.0, "hurt": 520.0}
const MELEE_GO_MS := 340.0
const MELEE_BACK_MS := 300.0
const MELEE_DEFAULT_ARC := 120.0
const HITSTOP_SEC := 0.07
const HITSTOP_SCALE := 0.08
const FX_WORD_GAP_MS := 380.0
const SPECIAL_WORD_CHANCE := 0.55
const SAY_MS := 1500.0
const SAY_CORRECT_CHANCE := 0.35
const SAY_CATCHPHRASE_CHANCE := 0.25
const SAY_WRONG_CHANCE := 0.6
const SAY_START_DELAY := 300.0

var opts: Dictionary
var hero: Dictionary
var ab: Dictionary
var family: Dictionary
var shot_name := ""
var shot_color := Color.WHITE
var attack_style: Dictionary
var franchise := "comic"

var max_hearts := 3
var hearts := 3
var score := 0
var combo := 0
var best_combo := 0
var q_index := 0
var first_try := 0
var mistakes: Array = []
var recent: Array = []
var q: Dictionary = {}
var wave_active := false
var ended := false
var review_stats := {"added": 0, "mastered": 0}
var review_kind := "choice"
var total_questions := 10

## 장면 시간 (ms, 히트스톱 때 느려진다) — 웹 판 this.time.now
var now := 0.0
var camera: Camera2D
var world: Node2D
var player: Sprite2D = null
var hero_scale := 1.0
var hero_anim := {"base": "idle", "pose": "", "until": 0.0, "current": "idle"}
var in_melee := false

var q_text: Txt
var hint_text: Txt
var heart_text: Txt
var progress_text: Txt
var score_text: Txt
var combo_text: Txt
var bubble: Node2D = null

var _timers: Array = []
var _last_fx_word := -9999.0
var _bob_tween: Tween = null
var _shoot_tween: Tween = null
var _melee_tween: Tween = null
var _shake_left := 0.0
var _shake_amt := 0.0
var _hud_buttons: Array = []


# ---------- 시작 ----------

## 메인이 판을 만들기 전에 부른다. o = {hero, mode, subject, level}
func setup(o: Dictionary) -> void:
	opts = o
	hero = o.hero
	ab = hero.get("ability", {})
	family = Data.find_family(hero)
	shot_name = str(family.shot)
	shot_color = Data.family_color(hero)
	attack_style = Attacks.of(hero)
	franchise = str(hero.get("franchise", "comic"))


func _ready() -> void:
	camera = Camera2D.new()
	camera.position = Vector2(W / 2, H / 2)
	add_child(camera)
	camera.make_current()
	world = self
	Assets.request(hero.id)
	Assets.hero_loaded.connect(_on_hero_loaded)
	max_hearts = int(ab.get("hearts", Data.rule("baseHearts")))
	hearts = max_hearts
	review_kind = "spell" if question_options().get("spelling", false) else "choice"
	total_questions = question_count()
	if opts.subject == "review":
		total_questions = maxi(1, mini(question_count(), Review.count(review_kind)))
	create_world()
	Sfx.music_start(music_name())
	_create_hud()
	after(SAY_START_DELAY, func() -> void: hero_say("catchphrase", true))
	show_intro(intro_text())
	after(INTRO_MS, next_question)


func _exit_tree() -> void:
	Engine.time_scale = 1.0
	Sfx.music_stop()


# ---------- 놀이가 구현할 훅 (기본) ----------

func intro_text() -> String:
	return "%s 출동!" % hero.name


func music_name() -> String:
	return "hero"


func finish_message(perfect: bool) -> String:
	if hearts <= 0:
		return "조금만 더 힘내요!"
	return "퍼펙트 미션!" if perfect else "미션 완료!"


func question_count() -> int:
	return int(Data.rule("questionsPerRound"))


func question_options() -> Dictionary:
	return {}


func create_world() -> void:
	pass


func start_wave(_q: Dictionary) -> void:
	pass


func clear_wave() -> void:
	pass


## 매 프레임 (dt 초)
func tick(_dt: float) -> void:
	pass


## 화면을 누름 (게임 좌표)
func on_pointer(_pos: Vector2) -> void:
	pass


## 키를 누름
func on_key(_keycode: int, _unicode: int) -> void:
	pass


# ---------- 시간 ----------

## ms 뒤에 fn 을 부른다 (판이 끝나 사라지면 함께 사라진다, 히트스톱 때 같이 느려진다)
func after(ms: float, fn: Callable) -> void:
	_timers.append({"at": now + ms, "fn": fn})


## 반복 타이머: ms 마다 fn (판이 끝나면 멈춘다)
func every(ms: float, fn: Callable) -> void:
	_timers.append({"at": now + ms, "fn": fn, "every": ms})


func _process(delta: float) -> void:
	now += delta * 1000.0
	var due: Array = []
	for t in _timers:
		if now >= t.at:
			due.append(t)
	for t in due:
		if t.has("every"):
			t.at = now + t.every
		else:
			_timers.erase(t)
		t.fn.call()
		if not is_inside_tree():
			return
	# 화면 비율이 3:2 가 아니면: 위쪽은 HUD 에 맞추고 가로는 가운데 (남는 공간은 아래 · 양옆에 배경이 더 보인다)
	var vs := get_viewport_rect().size
	camera.position = Vector2(W / 2, vs.y / 2)
	if _shake_left > 0.0:
		_shake_left -= delta
		camera.offset = Vector2(randf_range(-1, 1), randf_range(-1, 1)) * _shake_amt * W
		if _shake_left <= 0.0:
			camera.offset = Vector2.ZERO
	_tick_hero_anim()
	_place_bubble()
	tick(delta)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var pos := get_global_mouse_position()
		for b in _hud_buttons:
			if b.rect.has_point(pos):
				b.fn.call()
				get_viewport().set_input_as_handled()
				return
		if q_text and q_text.hit_rect().grow(10).has_point(pos) and not q.is_empty() and q.has("speak"):
			Voice.speak(str(q.speak)) # 문제를 누르면 영어 발음을 다시 들려준다
		on_pointer(pos)
	elif event is InputEventKey and event.pressed and not event.echo:
		on_key(event.keycode, event.unicode)


# ---------- 문제 진행 ----------

func next_question() -> void:
	if ended:
		return
	if hearts <= 0 or q_index >= total_questions:
		finish()
		return
	var nq := pick_question()
	recent.append(nq.key)
	if recent.size() > RECENT_LIMIT:
		recent.pop_front()
	nq.missed = false
	q = nq
	q_index += 1
	set_prompt_text(str(nq.prompt), str(nq.get("hint", "")))
	q_text.scale = Vector2(0.6, 0.6)
	tween_to(q_text, {"scale": Vector2.ONE}, 300, "back_out")
	update_hud()
	wave_active = true
	start_wave(nq)
	if nq.get("speakOnStart", false) and nq.has("speak"):
		Voice.speak(str(nq.speak))


## 이번 문제: 오답 복습이면 복습 노트에서, 일반 과목이면 reviewMixRate 확률로 복습 문제를 섞는다. 최근 문제는 피한다.
func pick_question() -> Dictionary:
	var o := question_options()
	var subject: String = opts.subject
	var review_subject := "review" if o.get("spelling", false) else subject
	if subject == "review" or randf() < Data.rule("reviewMixRate"):
		var rq := Review.pick(review_kind, review_subject, recent)
		if not rq.is_empty():
			return rq
	var real := "mix" if subject == "review" else subject
	var nq: Dictionary = {}
	for i in 8:
		nq = Data.make_question(real, int(opts.level), o)
		if not recent.has(nq.key):
			break
	return nq


## 정답 처리. (x, y) 를 주면 그 자리에서 축하 연출. @return 얻은 점수
func award_correct(pos: Variant = null, qq: Dictionary = {}) -> int:
	if qq.is_empty():
		qq = q
	combo += 1
	best_combo = maxi(best_combo, combo)
	if not qq.get("missed", false):
		first_try += 1
	var pts := BASE_POINTS + int(round((combo - 1) * COMBO_STEP * float(ab.get("comboBonus", 1.0))))
	score += pts
	update_hud()
	Sfx.play("correct")
	if pos is Vector2:
		celebrate(pos)
	if not in_melee:
		set_hero_pose("win")
	if combo in COMBO_MILESTONES:
		hero_say("combo", true)
	elif randf() < SAY_CORRECT_CHANCE:
		hero_say("catchphrase" if randf() < SAY_CATCHPHRASE_CHANCE else "correct")
	return pts


## 오답 · 놓침: 하트 -1(lose_heart), 콤보 초기화, 복습 목록, 흔들림 · 빨간 번쩍임
func penalize(lose_heart: bool = true, qq: Dictionary = {}) -> void:
	if qq.is_empty():
		qq = q
	combo = 0
	if lose_heart:
		hearts = maxi(0, hearts - 1)
	if not qq.get("missed", false):
		qq.missed = true
		mistakes.append(qq)
	shake(0.16, 0.006)
	update_hud()
	flash_screen(Color("#ff3355"), 0.22 if lose_heart else 0.12)
	Sfx.play("hurt" if lose_heart else "wrong")
	set_hero_pose("hurt")
	if randf() < SAY_WRONG_CHANCE:
		hero_say("wrong")
	if lose_heart:
		var tw := create_tween()
		for i in 3:
			tw.tween_property(heart_text, "position:x", 24.0, 0.05)
			tw.tween_property(heart_text, "position:x", 12.0, 0.05)
		tw.tween_property(heart_text, "position:x", 18.0, 0.05)


## 현재 문제를 끝내고 delay ms 뒤 다음 문제 (한 번만)
func end_wave(delay: float) -> void:
	if not wave_active:
		return
	wave_active = false
	record_review(q)
	clear_wave()
	after(delay, next_question)


func record_review(qq: Dictionary) -> void:
	var r := Review.record(qq)
	if r == "added":
		review_stats.added += 1
	elif r == "mastered":
		review_stats.mastered += 1


func finish() -> void:
	if ended:
		return
	ended = true
	var total := q_index
	var perfect := total == total_questions and total >= 3 and first_try == total
	var msg := finish_message(perfect)
	Sfx.music_stop()
	Sfx.play("lose" if hearts <= 0 else "win")
	hero_finale(hearts > 0)
	hero_say("win" if hearts > 0 else "lose", true)
	q_text.text = ""
	hint_text.text = ""
	var t := Txt.make(msg, 64, Color("#ffc93c"), 10, Color("#3a1060"), Vector2(0.5, 0.5), Fonts.title)
	flare(W / 2, 300, 3.0, Color(1, 0.85, 0.4) if hearts > 0 else Color(0.6, 0.6, 1))
	t.position = Vector2(W / 2, 300)
	t.z_index = Z_POPUP
	t.scale = Vector2(0.3, 0.3)
	add_child(t)
	tween_to(t, {"scale": Vector2.ONE}, 500, "back_out")
	after(1700, func() -> void:
		finished.emit({
			"score": score, "total": total, "firstTry": first_try, "bestCombo": best_combo,
			"heartsLeft": hearts, "perfect": perfect, "mistakes": mistakes,
			"reviewAdded": review_stats.added, "reviewMastered": review_stats.mastered,
		}))


# ---------- 능력 공통 계산 ----------

## 히어로 능력(slow · timeBonus)을 반영한 제한 시간 ms
func time_limit_ms(base_sec: float) -> float:
	return (base_sec / float(ab.get("slow", 1.0)) + float(ab.get("timeBonus", 0.0))) * 1000.0


## 힌트 능력이 있으면 미리 막아 둘 오답 보기 번호 (없으면 -1)
func decoy_index(qq: Dictionary) -> int:
	if not ab.get("hint", false):
		return -1
	var wrong := []
	for i in qq.choices.size():
		if qq.choices[i] != qq.answer:
			wrong.append(i)
	return wrong.pick_random() if not wrong.is_empty() else -1


func level_value(table: String) -> float:
	return Data.by_level(table, int(opts.level))


# ---------- 트윈 도우미 (Phaser tweens 대신) ----------

## props 의 값으로 ms 동안 움직인다. ease: linear · quad_out · quad_in · back_out · sine_inout · cubic_out
func tween_to(target: Object, props: Dictionary, ms: float, ease: String = "linear", delay_ms: float = 0.0) -> Tween:
	var tw := _tween_for(target).set_parallel(true)
	for k in props:
		var pt := tw.tween_property(target, k, props[k], ms / 1000.0)
		_apply_ease(pt, ease)
		if delay_ms > 0:
			pt.set_delay(delay_ms / 1000.0)
	return tw


## 왔다 갔다 반복 (yoyo). loops = 0 이면 무한
func tween_yoyo(target: Object, props: Dictionary, ms: float, ease: String = "sine_inout", loops: int = 0, delay_ms: float = 0.0) -> Tween:
	var tw := _tween_for(target)
	if loops == 0:
		tw.set_loops()
	else:
		tw.set_loops(loops)
	var back := {}
	for k in props:
		back[k] = target.get_indexed(k)
	if delay_ms > 0:
		tw.tween_interval(delay_ms / 1000.0)
	tw.set_parallel(true)
	for k in props:
		_apply_ease(tw.tween_property(target, k, props[k], ms / 1000.0), ease)
	tw.chain().set_parallel(true)
	for k in back:
		_apply_ease(tw.tween_property(target, k, back[k], ms / 1000.0), ease)
	return tw


## 대상 노드에 묶인 트윈 (대상이 사라지면 함께 멈춘다)
func _tween_for(target: Object) -> Tween:
	return (target as Node).create_tween() if target is Node else create_tween()


## 진행도 0→1 을 ms 동안 fn(t) 로 (매 프레임)
func tween_t(ms: float, fn: Callable, ease: String = "linear", done: Callable = Callable()) -> Tween:
	var tw := create_tween()
	_apply_ease(tw.tween_method(fn, 0.0, 1.0, ms / 1000.0), ease)
	if done.is_valid():
		tw.tween_callback(done)
	return tw


static func _apply_ease(pt: Tweener, ease: String) -> void:
	if not (pt is PropertyTweener or pt is MethodTweener):
		return
	var tr := Tween.TRANS_LINEAR
	var ea := Tween.EASE_IN_OUT
	match ease:
		"quad_out":
			tr = Tween.TRANS_QUAD
			ea = Tween.EASE_OUT
		"quad_in":
			tr = Tween.TRANS_QUAD
			ea = Tween.EASE_IN
		"back_out":
			tr = Tween.TRANS_BACK
			ea = Tween.EASE_OUT
		"sine_inout":
			tr = Tween.TRANS_SINE
			ea = Tween.EASE_IN_OUT
		"cubic_out":
			tr = Tween.TRANS_CUBIC
			ea = Tween.EASE_OUT
		"cubic_in":
			tr = Tween.TRANS_CUBIC
			ea = Tween.EASE_IN
	pt.set_trans(tr).set_ease(ea)


# ---------- 화면 연출 ----------

func shake(sec: float, intensity: float) -> void:
	_shake_left = maxf(_shake_left, sec)
	_shake_amt = maxf(_shake_amt if _shake_left > 0 else 0.0, intensity)


## 화면 전체를 잠깐 색으로 번쩍인다
func flash_screen(color: Color, alpha: float) -> void:
	var r := ColorRect.new()
	r.color = Color(color.r, color.g, color.b, alpha)
	r.position = Vector2(-W, -H)
	r.size = Vector2(W * 3, H * 3)
	r.z_index = Z_POPUP
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(r)
	var tw := r.create_tween()
	tw.tween_property(r, "modulate:a", 0.0, 0.32)
	tw.tween_callback(r.queue_free)


## 정답 축하: 불꽃, 화면 줌 펄스, 콤보 단계 배너
func celebrate(pos: Vector2) -> void:
	var big: bool = combo in COMBO_MILESTONES
	spark_burst(pos.x, pos.y, 60 if big else 28)
	var z := 1.06 if big else 1.03
	var tw := camera.create_tween()
	tw.tween_property(camera, "zoom", Vector2(z, z), 0.11).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(camera, "zoom", Vector2.ONE, 0.11)
	combo_text.scale = Vector2(1.6, 1.6)
	tween_to(combo_text, {"scale": Vector2.ONE}, 250, "back_out")
	if big:
		combo_banner(combo)
		Sfx.play("combo")


## 불꽃 파티클 (웹 판 burster.explode). 빛을 더하는 재질의 발광 입자 + 가운데 섬광 — 겹칠수록 밝게 빛난다
func spark_burst(x: float, y: float, n: int) -> void:
	var p := CPUParticles2D.new()
	p.texture = _glow_tex()
	p.material = _add_mat()
	p.position = Vector2(x, y)
	p.z_index = Z_POPUP
	p.one_shot = true
	p.explosiveness = 0.95
	p.amount = maxi(4, n)
	p.lifetime = 0.75
	p.spread = 180
	p.gravity = Vector2(0, 420)
	p.initial_velocity_min = 160
	p.initial_velocity_max = 440
	p.damping_min = 40
	p.damping_max = 120
	p.scale_amount_min = 0.12
	p.scale_amount_max = 0.32
	var sc := Curve.new()
	sc.add_point(Vector2(0, 1))
	sc.add_point(Vector2(1, 0))
	p.scale_amount_curve = sc
	var ramp := Gradient.new()
	ramp.set_color(0, Color(1, 1, 1, 1))
	ramp.set_color(1, Color(1, 1, 1, 0))
	p.color_ramp = ramp
	var cols := Gradient.new() # 알갱이마다 다른 색 (노랑 · 초록 · 하늘 · 분홍 · 흰색)
	cols.set_color(0, Gfx.col(BURST_COLORS[0]))
	cols.set_color(1, Gfx.col(BURST_COLORS[4]))
	for i in range(1, 4):
		cols.add_point(i / 4.0, Gfx.col(BURST_COLORS[i]))
	p.color_initial_ramp = cols
	add_child(p)
	p.emitting = true
	p.finished.connect(p.queue_free)
	flare(x, y, 0.9, Color(1, 0.95, 0.8))


var _glow_cache: Texture2D = null
var _add_cache: CanvasItemMaterial = null


func _glow_tex() -> Texture2D:
	if _glow_cache == null:
		_glow_cache = Kit.glow_texture(64)
	return _glow_cache


func _add_mat() -> CanvasItemMaterial:
	if _add_cache == null:
		_add_cache = Kit.additive()
	return _add_cache


## 섬광: 빛 덩어리가 확 커졌다 사라진다 (맞는 순간 · 정답)
func flare(x: float, y: float, size: float, color: Color) -> void:
	var s := Sprite2D.new()
	s.texture = _glow_tex()
	s.material = _add_mat()
	s.position = Vector2(x, y)
	s.modulate = color
	s.z_index = Z_FX
	s.scale = Vector2.ONE * size * 0.6
	add_child(s)
	var tw := s.create_tween().set_parallel(true)
	tw.tween_property(s, "scale", Vector2.ONE * size * 3.2, 0.28).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(s, "modulate:a", 0.0, 0.28)
	tw.chain().tween_callback(s.queue_free)


func combo_banner(c: int) -> void:
	var words := {3: "좋아요!", 5: "대단해요!", 7: "최고예요!", 10: "전설의 히어로!"}
	var t := Txt.make("🔥 %d 콤보! %s" % [c, words.get(c, "")], 50, Color("#ffb627"), 9, Color("#4a1300"), Vector2(0.5, 0.5), Fonts.title)
	t.position = Vector2(-300, 260)
	t.z_index = Z_POPUP
	add_child(t)
	var tw := t.create_tween()
	tw.tween_property(t, "position:x", W / 2, 0.35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(t, "scale", Vector2(1.15, 1.15), 0.2)
	tw.tween_property(t, "scale", Vector2.ONE, 0.2)
	tw.tween_interval(0.25)
	tw.set_parallel(true)
	tw.tween_property(t, "position:x", W + 300, 0.35).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tw.tween_property(t, "modulate:a", 0.0, 0.35)
	tw.chain().tween_callback(t.queue_free)


## 히어로 잔상 (스윙 · 대시처럼 빠르게 움직일 때)
func ghost_trail() -> void:
	if player == null or player.texture == null or hero3d != null: # 3D 히어로는 관절 동작으로 속도감을 낸다
		return
	var g := Sprite2D.new()
	g.texture = player.texture
	g.position = player.position
	g.rotation = player.rotation
	g.flip_h = player.flip_h
	g.scale = player.scale
	g.modulate = Color(0.6, 0.9, 1.0, 0.35)
	g.z_index = Z_HERO - 1
	add_child(g)
	var tw := g.create_tween()
	tw.tween_property(g, "modulate:a", 0.0, 0.26)
	tw.tween_callback(g.queue_free)


## 맞는 순간의 액션 연출: 히트스톱 · 속도선 · 효과 글자 · 캐릭터 필살기
func impact_fx(x: float, y: float) -> void:
	if ended and not is_inside_tree():
		return
	var from := hand() if player != null else Vector2(W / 2, H - 120)
	hit_stop()
	speed_lines(x, y, 18, 70)
	flare(x, y, 1.3, shot_color.lerp(Color.WHITE, 0.4))
	Signatures.play(self, hero, x, y, from)
	if now - _last_fx_word < FX_WORD_GAP_MS:
		return
	_last_fx_word = now
	var w := Signatures.words_of(hero)
	var word: String = w.word if w.word != "" and randf() < SPECIAL_WORD_CHANCE else w.words.pick_random()
	fx_word(x, y - 50, word)


## 히트스톱: 맞는 순간 아주 잠깐 전체를 느리게 ("탁!" 하는 타격감)
func hit_stop() -> void:
	Engine.time_scale = HITSTOP_SCALE
	get_tree().create_timer(HITSTOP_SEC, true, false, true).timeout.connect(func() -> void: Engine.time_scale = 1.0)


## 집중선: 한 점을 중심으로 바깥에서 안쪽으로 짧은 선 (만화 효과)
func speed_lines(x: float, y: float, n: int, r: float) -> void:
	var lines := []
	for i in n:
		lines.append([float(i) / n * TAU + randf_range(-0.12, 0.12), r + randf_range(0, 20), r + randf_range(55, 95)])
	var color := 0xff9ec7 if franchise == "sanrio" else (0x9e9e9e if franchise == "chiikawa" else 0xffffff)
	var width := 4.0 if franchise == "onepiece" else 3.0
	Gfx.flash(self, 260, func(g: Gfx, t: float) -> void:
		g.line_style(width, color, 1.0 - t)
		for L in lines:
			var s: float = L[1] + (L[2] - L[1]) * t * 0.4
			g.line_between(x + cos(L[0]) * s, y + sin(L[0]) * s, x + cos(L[0]) * L[2], y + sin(L[0]) * L[2]), Z_POPUP)


## 효과 글자 (POW! · 쾅!! · 뿅!) — 작품별 글꼴 · 색 · 기울기
func fx_word(x: float, y: float, word: String) -> void:
	var fx := Signatures.franchise_fx(hero)
	var t := Txt.make(word, int(fx.size), Color(str(fx.fill)), int(fx.strokeW), Color(str(fx.stroke)), Vector2(0.5, 0.5), Fonts.title if fx.title else Fonts.main)
	t.position = Vector2(clampf(x, 120, W - 120), maxf(HUD_H + 40, y))
	t.rotation_degrees = float(fx.angle) + randf_range(-6, 6)
	t.scale = Vector2(0.2, 0.2)
	t.z_index = Z_FX + 1
	add_child(t)
	var tw := t.create_tween()
	tw.tween_property(t, "scale", Vector2(1.25, 1.25), 0.12).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(t, "scale", Vector2.ONE, 0.09)
	tw.tween_interval(0.26)
	tw.set_parallel(true)
	tw.tween_property(t, "position:y", t.position.y - 24, 0.42).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tw.tween_property(t, "modulate:a", 0.0, 0.42)
	tw.chain().tween_callback(t.queue_free)


# ---------- 공격 모양 ----------

func draw_attack(g: Gfx, from: Vector2, to: Vector2) -> void:
	Attacks.draw(attack_style.key, g, from, to, shot_color, now, hero.get("look", {}))


func attack_hit(x: float, y: float) -> void:
	Attacks.hit(attack_style.key, self, x, y)
	impact_fx(x, y)


## 끌어오기 줄 (철자 잇기): 줄 스타일은 그 모양, 아니면 팀 색의 가는 힘의 줄
func draw_tether(g: Gfx, from: Vector2, to: Vector2) -> void:
	if attack_style.get("rope", false):
		draw_attack(g, from, to)
		return
	g.line_style(2, shot_color, 0.5)
	g.line_between(from.x, from.y, to.x, to.y)


func is_melee() -> bool:
	return attack_style.has("melee")


# ---------- 배경 ----------

## 배경(하늘 · 도시 · 바닥). o = {city: {baseY, color, range: [lo, hi]}, ground: {y, h, color}}
func draw_backdrop(o: Dictionary) -> Gfx:
	draw_sky()
	var g := Gfx.new()
	g.z_index = Z_BG
	add_child(g)
	var city: Dictionary = o.get("city", {})
	if not city.is_empty():
		draw_city(g, float(city.baseY), city.color, city.range)
	if o.has("ground"):
		var gr: Dictionary = o.ground
		g.fill_style(gr.get("color", 0x2a2e5c), 1)
		g.fill_rect(-W, float(gr.y), W * 3, float(gr.get("h", H - float(gr.y))) + H)
	return g


## 살아 움직이는 밤하늘: 그라데이션, 별(일부 반짝임), 달, 구름, 서치라이트, 별똥별
func draw_sky() -> void:
	var g := Gfx.new()
	g.z_index = Z_SKY
	add_child(g)
	g.fill_gradient_rect(-W, -H, W * 3, H * 1.0, 0x0b1026, 0x0b1026)
	g.fill_gradient_rect(-W, 0, W * 3, H, 0x0b1026, 0x41206b)
	g.fill_gradient_rect(-W, H, W * 3, H, 0x41206b, 0x41206b)
	g.fill_style(0xffffff, 0.8)
	for i in 110:
		g.fill_circle(randf_range(-W * 0.5, W * 1.5), randf_range(100, 380), randf() * 1.4 + 0.3)
	for i in 18:
		var s := Gfx.new()
		s.z_index = Z_AMBIENT
		s.position = Vector2(randf_range(-200, W + 200), randf_range(100, 360))
		s.fill_style(0xffffff, 1)
		s.fill_circle(0, 0, randf() * 1.5 + 1)
		add_child(s)
		tween_yoyo(s, {"modulate:a": 0.15}, randf_range(600, 1600), "linear", 0, randf_range(0, 1500))
	var glow := Gfx.new()
	glow.z_index = Z_AMBIENT
	glow.position = Vector2(850, 175)
	glow.fill_style(0xfff3c4, 0.15)
	glow.fill_circle(0, 0, 56)
	add_child(glow)
	tween_yoyo(glow, {"scale": Vector2(1.25, 1.25), "modulate:a": 0.35}, 1800)
	var moon := Gfx.new()
	moon.z_index = Z_AMBIENT
	moon.position = Vector2(850, 175)
	moon.fill_style(0xfff3c4, 1)
	moon.fill_circle(0, 0, 34)
	add_child(moon)
	for b in [[200.0, -22.0], [700.0, 18.0]]:
		var beam := Gfx.new()
		beam.z_index = Z_AMBIENT
		beam.position = Vector2(b[0], 640)
		beam.fill_style(0x9be7ff, 0.07)
		beam.fill_triangle(0, 0, -45, -560, 45, -560)
		beam.rotation_degrees = b[1]
		add_child(beam)
		tween_yoyo(beam, {"rotation_degrees": -b[1]}, 3200)
	for i in 3:
		var cloud := Gfx.new()
		cloud.z_index = Z_AMBIENT
		cloud.fill_style(0x2d2f63, 0.55)
		cloud.fill_ellipse(0, 0, randf_range(160, 260), randf_range(28, 44))
		cloud.position = Vector2(randf_range(-150, W + 150), randf_range(120, 260))
		add_child(cloud)
		var dur := randf_range(28, 45)
		var tw := cloud.create_tween().set_loops()
		var first := (W + 150 - cloud.position.x) / (W + 300) * dur
		tw.tween_property(cloud, "position:x", W + 150, first)
		tw.tween_property(cloud, "position:x", -150.0, 0.0)
		tw.tween_property(cloud, "position:x", cloud.position.x, dur - first)
	every(4500, func() -> void:
		var sx := randf_range(300, W)
		var sy := randf_range(105, 200)
		var m := Gfx.new()
		m.z_index = Z_AMBIENT
		m.position = Vector2(sx, sy)
		m.rotation_degrees = -160
		m.fill_style(0xffffff, 0.9)
		m.fill_rect(-35, -1, 70, 2)
		add_child(m)
		var tw2 := m.create_tween().set_parallel(true)
		tw2.tween_property(m, "position", Vector2(sx - 260, sy + 95), 0.7)
		tw2.tween_property(m, "modulate:a", 0.0, 0.7)
		tw2.chain().tween_callback(m.queue_free))


## 창문이 켜진 도시 실루엣
func draw_city(g: Gfx, base_y: float, color: Variant, height_range: Array, x_from: float = -W * 0.6, x_to: float = W * 1.6) -> void:
	var x := x_from
	while x < x_to:
		var bw := minf(randf_range(50, 110), x_to - x)
		if bw < 20:
			break
		var bh := randf_range(float(height_range[0]), float(height_range[1]))
		g.fill_style(color, 1)
		g.fill_rect(x, base_y - bh, bw - 4, bh)
		g.fill_style(0xffd166, 0.5)
		var wy := base_y - bh + 12
		while wy < base_y - 10:
			var wx := x + 8
			while wx < x + bw - 14:
				if randf() < 0.35:
					g.fill_rect(wx, wy, 7, 9)
				wx += 16
			wy += 20
		x += bw


# ---------- 히어로 ----------

## 히어로를 만든다 (scale: 놀이별 크기 — 반동 연출의 기준)
func create_hero(x: float, y: float, s: float = 1.0) -> Sprite2D:
	hero_scale = s
	hero_anim = {"base": "idle", "pose": "", "until": 0.0, "current": ""}
	in_melee = false
	player = Sprite2D.new()
	player.position = Vector2(x, y)
	player.scale = Vector2(s, s)
	player.z_index = Z_HERO
	add_child(player)
	if use_hero_3d():
		hero3d = Hero3D.create(hero)
	if hero3d:
		# 3D 히어로: 2D 자리(크기 · 위치 · 반동 연출)는 그대로 두고, 그 위에 3D 그림을 붙인다
		add_child(hero3d)
		var blank := Image.create(int(HERO_SIZE.x), int(HERO_SIZE.y), false, Image.FORMAT_RGBA8)
		player.texture = ImageTexture.create_from_image(blank)
		_skin = Sprite2D.new()
		_skin.texture = hero3d.texture()
		_skin.scale = Vector2.ONE * HERO_SIZE.x / Hero3D.VIEW.x * Hero3D.SHOW_SCALE
		_skin.position = Vector2(0, -6)
		player.add_child(_skin)
	else:
		Assets.anim_loaded.connect(_on_anim_loaded)
		_setup_anim_skin()
	_tick_hero_anim()
	return player


# ---------- 2D 관절 애니메이션 (2026-11-21) ----------
# 관절 동작 아틀라스(<id>.anim.webp, 2배 해상도)가 있으면: 2D 자리는 그대로 두고 그 위에 동작 그림을 붙인다.
# 동작 묶음(idle · run · attack · jump · fall · hurt · win)을 초당 프레임대로 재생하고,
# 셰이더(hero_deform)로 머리 끄덕임 · 몸 눌림을 덧입힌다. 아틀라스를 받기 전에는 예전 자세 그림을 쓴다.

const DEFORM := preload("res://shaders/hero_deform.gdshader")
## 작품별 목 높이 (프레임 비율 — 머리가 큰 마스코트일수록 아래)
const NECK := {"comic": 0.41, "onepiece": 0.47, "original": 0.5, "sanrio": 0.58, "chiikawa": 0.6}

var _anim_sheet: Texture2D = null
var _clip := ""
var _clip_start := 0.0
var _anim_frame := 0
var _clips: Dictionary = {}


func _on_anim_loaded(id: String) -> void:
	if id == hero.id and _anim_sheet == null and player != null and hero3d == null:
		_setup_anim_skin()


func _setup_anim_skin() -> void:
	var sheet := Assets.anim(hero.id)
	if sheet == null:
		return
	_anim_sheet = sheet
	for c in Data.game.get("anims", {}).get("clips", []):
		_clips[c.name] = c
	var blank := Image.create(int(HERO_SIZE.x), int(HERO_SIZE.y), false, Image.FORMAT_RGBA8)
	player.texture = ImageTexture.create_from_image(blank)
	_skin = Sprite2D.new()
	_skin.texture = sheet
	_skin.region_enabled = true
	_skin.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	_skin.scale = Vector2.ONE / float(Data.game.get("anims", {}).get("scale", 2))
	var mat := ShaderMaterial.new()
	mat.shader = DEFORM
	mat.set_shader_parameter("neck", NECK.get(franchise, 0.45))
	_skin.material = mat
	player.add_child(_skin)
	_clip = ""
	hero_anim.current = ""
	_tick_hero_anim()


## 지금 상태 → 동작 묶음 이름. 놀이가 바꿀 수 있다 (러너: 떨어질 때 fall)
func hero_clip(state: String) -> String:
	return state


func _tick_anim_skin(state: String) -> void:
	var clip := hero_clip(state)
	if not _clips.has(clip):
		clip = "idle"
	if clip != _clip:
		_clip = clip
		_clip_start = now
	var c: Dictionary = _clips[clip]
	var n := int(c.count)
	var k := int((now - _clip_start) / 1000.0 * float(c.fps))
	k = k % n if c.loop else mini(k, n - 1)
	_anim_frame = int(c.start) + k
	var r := Assets.anim_rect(_anim_frame)
	_skin.region_rect = r
	_skin.flip_h = player.flip_h
	var ts := _anim_sheet.get_size()
	var mat: ShaderMaterial = _skin.material
	mat.set_shader_parameter("region", Vector4(r.position.x / ts.x, r.position.y / ts.y, r.size.x / ts.x, r.size.y / ts.y))
	# 2차 움직임: 머리 끄덕임 · 기울임 · 몸 눌림 (동작마다 다르게, 시간에 따라 부드럽게)
	var t := now / 1000.0
	var ang := 0.0
	var off := Vector2.ZERO
	var sq := 0.0
	match clip:
		"idle":
			ang = 0.05 * sin(t * 2.2)
			off.y = 0.006 * sin(t * 4.4)
			sq = 0.015 * sin(t * 4.4)
		"run":
			var ph := (now - _clip_start) / 1000.0 * float(c.fps) / n * TAU
			ang = 0.07 + 0.05 * sin(ph * 2.0)
			off.y = -0.012 * absf(sin(ph))
			sq = 0.04 * cos(ph * 2.0)
		"attack":
			ang = [-0.12, -0.08, 0.16, 0.14, 0.08, 0.02][k] if k < 6 else 0.0
			sq = [0.05, 0.03, -0.06, -0.03, 0.0, 0.0][k] if k < 6 else 0.0
		"jump":
			ang = -0.1
			sq = -0.08 if k >= 1 else 0.1
		"fall":
			ang = 0.06
			sq = -0.04
		"hurt":
			ang = -0.22 + 0.06 * sin(t * 40.0)
			off.x = -0.015
		"win":
			ang = 0.14 * sin(t * 7.0)
			off.y = -0.01 * absf(sin(t * 7.0))
			sq = 0.04 * sin(t * 14.0)
	if player.flip_h:
		ang = -ang
		off.x = -off.x
	mat.set_shader_parameter("head_angle", ang)
	mat.set_shader_parameter("head_offset", off)
	mat.set_shader_parameter("squash", sq)


## 3D 히어로 시험: 히어로 러너에서만, 로비의 "3D 러너 시험" 을 켰을 때 (기본 꺼짐 — 사용자가 2D 관절 애니메이션을 골랐다, 2026-11-21)
func use_hero_3d() -> bool:
	return opts.get("mode", "") == "run" and bool(Store.get_value("hero3d", false))


var hero3d: Hero3D = null
var _skin: Sprite2D = null


func _on_hero_loaded(id: String) -> void:
	if id == hero.id:
		hero_anim.current = ""
		_tick_hero_anim()


const HERO_BASES := {"idle": [520.0, "breath", "idle"], "run": [110.0, "run1", "run2"], "win": [260.0, "win", "jump"]}


func _tick_hero_anim() -> void:
	if player == null:
		return
	var a := hero_anim
	if a.pose != "" and now >= a.until:
		a.pose = ""
	if hero3d: # 3D: 자세 이름을 관절 동작으로 (달리기 · 점프 · 공격 · 아야 · 환호)
		hero3d.play(a.pose if a.pose != "" else a.base)
		_skin.flip_h = player.flip_h
		return
	if _anim_sheet: # 2D 관절 동작
		_tick_anim_skin(a.pose if a.pose != "" else a.base)
		return
	var pose: String = a.pose
	if pose == "":
		var base: String = a.base
		if HERO_BASES.has(base):
			var b: Array = HERO_BASES[base]
			pose = b[1] if int(now / b[0]) % 2 else b[2]
		else:
			pose = base # jump · hurt
	if a.current == pose:
		return
	var tex := Assets.frame(hero.id, pose)
	if tex == null:
		return
	a.current = pose
	player.texture = tex


## 계속 반복할 바탕 동작: idle · run · jump · win · hurt
func set_hero_base(base: String) -> void:
	hero_anim.base = base


## 잠깐 자세 (attack · win · hurt · jump)
func set_hero_pose(pose: String, ms: float = -1.0) -> void:
	if ended or player == null:
		return
	hero_anim.pose = pose
	hero_anim.until = now + (ms if ms > 0 else float(POSE_MS.get(pose, 400.0)))
	_tick_hero_anim()


## 제자리에서 둥실둥실 (작품마다 다르게)
func start_hero_bob(amp: float = 4.0) -> void:
	stop_hero_bob()
	var p := player
	var k := hero_scale
	var y0 := p.position.y
	var tw := p.create_tween().set_loops()
	match franchise:
		"sanrio": # 통통 튀는 마스코트
			tw.tween_property(p, "position:y", y0 - amp * 2, 0.42).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
			tw.parallel().tween_property(p, "scale", Vector2(k * 0.96, k * 1.05), 0.42)
			tw.tween_property(p, "position:y", y0, 0.42).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
			tw.parallel().tween_property(p, "scale", Vector2(k, k), 0.42)
		"chiikawa": # 꼼지락
			p.rotation_degrees = -5
			tw.tween_property(p, "rotation_degrees", 5.0, 0.52).set_trans(Tween.TRANS_SINE)
			tw.parallel().tween_property(p, "position:y", y0 - amp, 0.52).set_trans(Tween.TRANS_SINE)
			tw.tween_property(p, "rotation_degrees", -5.0, 0.52).set_trans(Tween.TRANS_SINE)
			tw.parallel().tween_property(p, "position:y", y0, 0.52).set_trans(Tween.TRANS_SINE)
		"onepiece": # 힘이 넘치는 대기
			tw.tween_property(p, "position:y", y0 - amp * 1.4, 0.56).set_trans(Tween.TRANS_SINE)
			tw.parallel().tween_property(p, "scale:y", k * 1.03, 0.56).set_trans(Tween.TRANS_SINE)
			tw.tween_property(p, "position:y", y0, 0.56).set_trans(Tween.TRANS_SINE)
			tw.parallel().tween_property(p, "scale:y", k, 0.56).set_trans(Tween.TRANS_SINE)
		_:
			tw.tween_property(p, "position:y", y0 - amp, 0.7).set_trans(Tween.TRANS_SINE)
			tw.tween_property(p, "position:y", y0, 0.7).set_trans(Tween.TRANS_SINE)
	_bob_tween = tw
	_bob_base_y = y0


var _bob_base_y := 0.0


func stop_hero_bob() -> void:
	if _bob_tween:
		_bob_tween.kill()
		_bob_tween = null
		if player and not in_melee:
			player.position.y = _bob_base_y
	if player and not in_melee:
		player.rotation = 0
		player.scale = Vector2(hero_scale, hero_scale)


## 투사체 발사 동작: 움츠림 → 쭉 늘어나며 튀어나감 → 여운 + 팀 발사음
func hero_shoot() -> void:
	var k := hero_scale
	var p := player
	var dir := -1.0 if p.flip_h else 1.0
	set_hero_pose("attack")
	if _shoot_tween:
		_shoot_tween.kill()
	p.scale = Vector2(k, k)
	var tw := p.create_tween()
	tw.tween_property(p, "scale", Vector2(k * 0.9, k * 1.1), 0.045).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(p, "scale", Vector2(k * 1.14, k * 0.88), 0.07).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(p, "rotation_degrees", dir * -6, 0.07)
	tw.tween_property(p, "scale", Vector2(k, k), 0.16).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(p, "rotation_degrees", 0.0, 0.16)
	_shoot_tween = tw
	var h := hand()
	speed_lines(h.x, h.y, 10, 18)
	Sfx.shot(hero.family)


## 근접 공격 (거인 내려찍기 · 표범 달려들기): 목표까지 포물선으로 뛰어가 때리고 착지.
## target: Vector2 또는 Callable(→Vector2, 움직이는 목표), on_impact: 때리는 순간, o = {land: Vector2, on_land: Callable}
func melee_to(target: Variant, on_impact: Callable, o: Dictionary = {}) -> void:
	var p := player
	var at: Callable = target if target is Callable else func() -> Vector2: return target
	var arc := float(attack_style.get("melee", MELEE_DEFAULT_ARC))
	var speed := float(ab.get("webSpeed", 1.0))
	stop_hero_bob()
	if _melee_tween:
		_melee_tween.kill()
	in_melee = true
	set_hero_base("jump")
	Sfx.shot(hero.family)
	var S := p.position
	p.flip_h = at.call().x < S.x - 10
	var frame := [0]
	var fly := func(from: Vector2, get_to: Callable, lift: float, ms: float, done: Callable) -> void:
		_melee_tween = tween_t(ms, func(t: float) -> void:
			var T: Vector2 = get_to.call()
			var C := Vector2((from.x + T.x) / 2, minf(from.y, T.y) - lift)
			p.position = bezier2(from, C, T, t)
			frame[0] += 1
			if frame[0] % 3 == 0:
				ghost_trail(), "sine_inout", done)
	fly.call(S, at, arc, MELEE_GO_MS / speed, func() -> void:
		set_hero_pose("attack")
		var dir := -1.0 if p.flip_h else 1.0
		var tw := p.create_tween()
		tw.tween_property(p, "rotation_degrees", dir * 22, 0.07)
		tw.tween_property(p, "rotation_degrees", 0.0, 0.07)
		on_impact.call()
		var L: Vector2 = o.get("land", S)
		fly.call(p.position, func() -> Vector2: return L, arc * 0.5, MELEE_BACK_MS / speed, func() -> void:
			_melee_tween = null
			in_melee = false
			p.position = L
			p.rotation = 0
			set_hero_base("idle")
			var k := hero_scale
			var tw2 := p.create_tween()
			tw2.tween_property(p, "scale", Vector2(k * 1.08, k * 0.86), 0.08)
			tw2.tween_property(p, "scale", Vector2(k, k), 0.08)
			if not ended:
				start_hero_bob()
			if o.has("on_land"):
				o.on_land.call()))


static func bezier2(S: Vector2, C: Vector2, E: Vector2, t: float) -> Vector2:
	var u := 1.0 - t
	return u * u * S + 2.0 * u * t * C + t * t * E


## 줄 · 공격이 나가는 손 위치 (지금 자세 · 크기 · 좌우 방향 반영)
func hand() -> Vector2:
	var p := player
	if p == null:
		return Vector2(W / 2, H - 120)
	var r := Data.hand_of(str(hero_anim.current) if hero_anim.current != "" else "idle")
	if _anim_sheet: # 관절 동작: 지금 프레임의 손 위치
		var hs: Array = Data.game.get("anims", {}).get("hands", [])
		if _anim_frame < hs.size():
			r = Vector2(float(hs[_anim_frame].x), float(hs[_anim_frame].y))
	var dir := -1.0 if p.flip_h else 1.0
	var k := absf(p.scale.y) if p.scale.y != 0 else 1.0
	return Vector2(p.position.x + dir * r.x * HERO_SIZE.x * k, p.position.y + r.y * HERO_SIZE.y * k)


## 판이 끝남: 이겼으면 승리 춤, 졌으면 털썩
func hero_finale(won: bool) -> void:
	if player == null:
		return
	stop_hero_bob()
	if _melee_tween:
		_melee_tween.kill()
	in_melee = false
	hero_anim.pose = ""
	set_hero_base("win" if won else "hurt")
	player.rotation = 0
	if won:
		var y0 := player.position.y
		var tw := player.create_tween().set_loops()
		tw.tween_property(player, "position:y", y0 - 26, 0.26).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.tween_property(player, "position:y", y0, 0.26).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)


# ---------- 말풍선 ----------

## 히어로 머리 위 말풍선. important = true 면 떠 있는 말풍선을 바꿔서라도 말한다
func hero_say(kind: String, important: bool = false) -> void:
	if not important and is_instance_valid(bubble):
		return
	var msg := Data.hero_line(hero, kind)
	if msg == "":
		return
	clear_bubble()
	var t := Txt.make(msg, 22, Color("#1b1f3b"))
	var w := t.box.x + 28
	var h := t.box.y + 14
	var g := Gfx.new()
	g.fill_style(0xffffff, 0.97)
	g.fill_rounded_rect(-w / 2, -h / 2, w, h, 14)
	g.fill_triangle(-9, h / 2 - 2, 9, h / 2 - 2, 0, h / 2 + 12)
	g.line_style(3, shot_color, 1)
	g.stroke_rounded_rect(-w / 2, -h / 2, w, h, 14)
	var c := Node2D.new()
	c.add_child(g)
	c.add_child(t)
	c.z_index = Z_POPUP
	c.scale = Vector2.ZERO
	c.set_meta("bw", w)
	c.set_meta("bh", h)
	add_child(c)
	bubble = c
	_place_bubble()
	tween_to(c, {"scale": Vector2.ONE}, 180, "back_out")
	var cid := c.get_instance_id() # 노드를 직접 붙잡지 않는다 (먼저 사라지면 "capture freed" 오류)
	after(SAY_MS, func() -> void:
		var bc := instance_from_id(cid) as Node2D
		if bc == null or bubble != bc:
			return
		bubble = null
		var tw := bc.create_tween().set_parallel(true)
		tw.tween_property(bc, "modulate:a", 0.0, 0.2)
		tw.tween_property(bc, "scale", Vector2(0.8, 0.8), 0.2)
		tw.chain().tween_callback(bc.queue_free))


func clear_bubble() -> void:
	if is_instance_valid(bubble):
		bubble.queue_free()
	bubble = null


## 말풍선이 히어로를 따라다닌다 (화면 밖으로 나가지 않게)
func _place_bubble() -> void:
	if not is_instance_valid(bubble):
		return
	var anchor := bubble_anchor()
	if anchor == Vector2.INF:
		return
	var bw: float = bubble.get_meta("bw")
	var bh: float = bubble.get_meta("bh")
	bubble.position = Vector2(clampf(anchor.x, bw / 2 + 8, W - bw / 2 - 8), maxf(HUD_H + bh / 2 + 8, anchor.y - bh / 2 - 12))


## 말풍선 기준점 (히어로 머리 위). 히어로가 없는 놀이는 바꾼다
func bubble_anchor() -> Vector2:
	if player == null:
		return Vector2.INF
	return Vector2(player.position.x, player.position.y - HERO_SIZE.y / 2 * absf(player.scale.y))


# ---------- HUD ----------

## HUD: 위쪽 어두운 띠 + 가운데 문제 판(금색 테두리) + 진행 구슬 + 점수 판. 화면 가장자리는 어둡게(비네트).
func _create_hud() -> void:
	var vig := Sprite2D.new() # 비네트: 시선을 가운데로 모은다 (넓은 화면도 덮도록 크게)
	vig.texture = Kit.vignette_texture()
	vig.position = Vector2(W / 2, H / 2)
	vig.scale = Vector2(W * 1.5 / 256.0, H * 1.5 / 256.0)
	vig.z_index = Z_HUD - 1
	add_child(vig)
	var bg := Gfx.new()
	bg.z_index = Z_HUD
	bg.fill_gradient_rect(-W, -H, W * 3, H + HUD_H - 10, 0x05071a, 0x05071a, 0.85)
	bg.fill_gradient_rect(-W, HUD_H - 10, W * 3, 26, 0x05071a, 0x05071a, 0.0)
	# 가운데 문제 판
	var pw := W - TEXT_SIDE_MARGIN * 2 + 40
	bg.fill_style(0x141a4a, 0.95)
	bg.fill_rounded_rect(W / 2 - pw / 2, 6, pw, 66, 18)
	bg.line_style(3, 0xffc93c, 0.9)
	bg.stroke_rounded_rect(W / 2 - pw / 2, 6, pw, 66, 18)
	bg.fill_style(0xffffff, 0.07)
	bg.fill_rounded_rect(W / 2 - pw / 2 + 8, 10, pw - 16, 18, 9)
	# 점수 판
	bg.fill_style(0x141a4a, 0.95)
	bg.fill_rounded_rect(W - 132, 8, 124, 40, 12)
	bg.line_style(2, 0x4cc9f0, 0.7)
	bg.stroke_rounded_rect(W - 132, 8, 124, 40, 12)
	add_child(bg)
	_pips = Gfx.new()
	_pips.z_index = Z_HUD
	add_child(_pips)
	q_text = _hud_text(Vector2(W / 2, 40), Q_FONT, Color.WHITE, Vector2(0.5, 0.5), Fonts.title)
	hint_text = _hud_text(Vector2(W / 2, 84), HINT_FONT, Color("#ffd166"), Vector2(0.5, 0.5))
	heart_text = _hud_text(Vector2(16, 10), 26, Color.WHITE, Vector2(0, 0))
	progress_text = _hud_text(Vector2(18, 48), 15, Color("#a9b4e8"), Vector2(0, 0), Fonts.title)
	score_text = _hud_text(Vector2(W - 70, 28), 24, Color("#ffc93c"), Vector2(0.5, 0.5), Fonts.title)
	combo_text = _hud_text(Vector2(W - 18, 62), 22, Color("#ff9f1c"), Vector2(1, 0), Fonts.title)
	_hud_button(Vector2(30, H - 30), "🏠", func() -> void:
		Sfx.play("click")
		quit_requested.emit())
	var sound := _hud_button(Vector2(80, H - 30), "🔊" if Sfx.is_enabled("sfx") or Sfx.is_enabled("bgm") else "🔇", Callable())
	_hud_buttons[-1].fn = func() -> void:
		var on := not (Sfx.is_enabled("sfx") or Sfx.is_enabled("bgm"))
		Sfx.set_enabled("sfx", on)
		Sfx.set_enabled("bgm", on)
		if on:
			Sfx.music_start(music_name())
		sound.text = "🔊" if on else "🔇"
	update_hud()


func _hud_text(pos: Vector2, size: int, col: Color, org: Vector2, f: Font = null) -> Txt:
	var t := Txt.make("", size, col, 5, Color(0, 0, 0, 0.8), org, f)
	t.position = pos
	t.z_index = Z_HUD
	add_child(t)
	return t


## 작은 둥근 HUD 버튼 (그만하기 · 소리)
func _hud_button(pos: Vector2, label: String, fn: Callable) -> Txt:
	var g := Gfx.new()
	g.position = pos
	g.z_index = Z_HUD
	g.fill_style(0x000000, 0.4)
	g.fill_circle(0, 0, 22)
	g.line_style(2, 0xffffff, 0.35)
	g.stroke_circle(0, 0, 22)
	add_child(g)
	var t := Txt.make(label, 22, Color.WHITE)
	t.position = pos
	t.z_index = Z_HUD
	add_child(t)
	_hud_buttons.append({"rect": Rect2(pos - Vector2(24, 24), Vector2(48, 48)), "fn": fn})
	return t


var _pips: Gfx
var _shown_score := 0
var _score_tween: Tween = null


func update_hud() -> void:
	heart_text.text = "❤️".repeat(hearts) + "🖤".repeat(maxi(0, max_hearts - hearts))
	progress_text.text = "%s%d / %d" % ["복습 " if opts.subject == "review" else "문제 ", q_index, total_questions]
	combo_text.text = "🔥 %d 콤보" % combo if combo >= 2 else ""
	# 진행 구슬: 지나간 문제는 금색, 지금 문제는 크게
	if _pips:
		_pips.clear()
		var n := mini(total_questions, 12)
		for i in n:
			var cx := 22.0 + i * 13
			var done := i < q_index - 1
			var cur := i == q_index - 1
			_pips.fill_style(0xffc93c if done else (0xffffff if cur else 0x3a4380), 1)
			_pips.fill_circle(cx, 78, 5.0 if cur else 4.0)
	# 점수는 올라가는 숫자로 (상용 게임처럼 촤라락)
	if score != _shown_score:
		if _score_tween:
			_score_tween.kill()
		var from := _shown_score
		_shown_score = score
		_score_tween = create_tween()
		_score_tween.tween_method(func(v: float) -> void: score_text.text = str(int(v)), float(from), float(score), 0.4)
		score_text.scale = Vector2(1.25, 1.25)
		tween_to(score_text, {"scale": Vector2.ONE}, 250, "back_out")
	elif score_text.text == "":
		score_text.text = str(score)


func set_prompt_text(prompt: String, hint: String = "") -> void:
	q_text.text = prompt
	hint_text.text = hint
	q_text.fit(Q_FONT, W - TEXT_SIDE_MARGIN * 2, Q_FONT_MIN)
	hint_text.fit(HINT_FONT, W - TEXT_SIDE_MARGIN * 2, HINT_FONT_MIN)


## 시작 안내: 띠가 가로질러 펼쳐지고 글자가 "쾅" 하고 내려앉는다 (상용 게임의 스테이지 시작 연출)
func show_intro(msg: String) -> void:
	var band := Gfx.new()
	band.z_index = Z_POPUP
	band.position = Vector2(W / 2, 300)
	band.fill_gradient_rect(-W, -62, W * 2, 124, 0x2a0f5c, 0x0b1033, 0.85)
	band.fill_style(0xffc93c, 1)
	band.fill_rect(-W, -64, W * 2, 4)
	band.fill_rect(-W, 60, W * 2, 4)
	band.scale = Vector2(1, 0)
	add_child(band)
	var bt := band.create_tween()
	bt.tween_property(band, "scale:y", 1.0, 0.18).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	bt.tween_interval((INTRO_MS - 450) / 1000.0)
	bt.tween_property(band, "scale:y", 0.0, 0.2)
	bt.tween_callback(band.queue_free)
	var t := Txt.make(msg, 40, Color.WHITE, 8, Color("#2a0f5c"), Vector2(0.5, 0.5), Fonts.title)
	t.position = Vector2(W / 2, 300)
	t.z_index = Z_POPUP
	t.scale = Vector2(2.2, 2.2)
	t.modulate.a = 0
	add_child(t)
	var tw := t.create_tween()
	tw.set_parallel(true)
	tw.tween_property(t, "scale", Vector2.ONE, 0.22).set_delay(0.08).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tw.tween_property(t, "modulate:a", 1.0, 0.12).set_delay(0.08)
	tw.chain().tween_callback(func() -> void: shake(0.12, 0.004))
	tw.chain().tween_interval((INTRO_MS - 550) / 1000.0)
	tw.chain().tween_property(t, "modulate:a", 0.0, 0.25)
	tw.chain().tween_callback(t.queue_free)


## 떠올랐다 사라지는 안내 문구 (정답!, 앗! 등) — 톡 튀어나왔다가 떠오른다
func popup(x: float, y: float, msg: String, color: Color) -> void:
	var t := Txt.make(msg, 30, color, 7, Color(0, 0, 0, 0.85), Vector2(0.5, 0.5), Fonts.title)
	t.scale = Vector2(0.4, 0.4)
	t.create_tween().tween_property(t, "scale", Vector2.ONE, 0.18).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	t.position = Vector2(x, y)
	t.z_index = Z_POPUP
	add_child(t)
	var tw := t.create_tween().set_parallel(true)
	tw.tween_property(t, "position:y", y - 60, 1.2)
	tw.tween_property(t, "modulate:a", 0.0, 1.2)
	tw.chain().tween_callback(t.queue_free)

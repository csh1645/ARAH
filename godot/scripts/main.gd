## 화면 흐름: 로비 → 한 판(놀이) → 결과(+ 새 히어로 합류 축하) → 로비. 웹 판 ui/app.js 의 흐름과 같다.
## 폰을 세로로 들면 게임을 멈추고 "가로로 돌려 주세요" 안내 (웹 판과 같은 방식, 별도 모바일 화면 없음).
extends Node

const MODE_SCRIPTS := {
	"run": "res://scripts/game/modes/run_mode.gd",
	"catch": "res://scripts/game/modes/catch_mode.gd",
	"swing": "res://scripts/game/modes/swing_mode.gd",
	"gate": "res://scripts/game/modes/gate_mode.gd",
	"spell": "res://scripts/game/modes/spell_mode.gd",
	"match": "res://scripts/game/modes/match_mode.gd",
	"boss": "res://scripts/game/modes/boss_mode.gd",
}

var progress: Progress
var ui: CanvasLayer
var lobby: Lobby
var result: Control
var round_node: Node = null
var _rotate_hint: Control
var _is_phone := false


func _ready() -> void:
	# 빌드 검사 (tools/godot/build-web.mjs): 모든 놀이 스크립트를 불러 문법 오류를 찾고 끝낸다
	if OS.get_environment("ARAH_CHECK") == "1":
		for id in MODE_SCRIPTS:
			var s: Variant = load(MODE_SCRIPTS[id])
			print("[검사] ", id, " ", "OK" if s is GDScript and s.can_instantiate() else "실패")
		load("res://scripts/ui/result_screen.gd")
		get_tree().quit()
		return
	progress = Progress.new()
	ui = CanvasLayer.new()
	ui.layer = 10
	add_child(ui)
	_rotate_hint = _make_rotate_hint()
	_is_phone = Bridge.is_web() and bool(Bridge.call_js("isPhone"))
	_make_cover()
	_show_lobby_now()


## 놀이 방법이 준비됐는지 (옮겨지지 않은 놀이는 메뉴에서 숨긴다)
static func mode_ready(id: String) -> bool:
	return MODE_SCRIPTS.has(id) and ResourceLoader.exists(MODE_SCRIPTS[id])


func show_lobby() -> void:
	_fade(_show_lobby_now)


func _show_lobby_now() -> void:
	_clear_screens()
	lobby = Lobby.new(progress)
	lobby.start_requested.connect(start_round)
	ui.add_child(lobby)


func _clear_screens() -> void:
	for n in [lobby, result]:
		if is_instance_valid(n):
			n.queue_free()
	lobby = null
	result = null
	if is_instance_valid(round_node):
		round_node.queue_free()
	round_node = null
	Sfx.music_stop()


func start_round() -> void:
	if not mode_ready(progress.mode):
		progress.mode = "run" if mode_ready("run") else progress.mode
	if not mode_ready(progress.mode):
		push_warning("놀이를 아직 옮기는 중이에요: " + progress.mode)
		return
	Voice.unlock()
	Bridge.call_js("enterLandscape")
	progress.save_choice()
	_fade(_start_round_now)


func _start_round_now() -> void:
	_clear_screens()
	var script: GDScript = load(MODE_SCRIPTS[progress.mode])
	var r: Node = script.new()
	r.setup({"hero": Data.find_hero(progress.hero_id), "mode": progress.mode, "subject": progress.subject, "level": progress.level})
	r.finished.connect(_on_round_finished)
	r.quit_requested.connect(show_lobby)
	round_node = r
	add_child(r)


func _on_round_finished(r: Dictionary) -> void:
	var earned := int(r.firstTry) + (int(Data.rule("perfectBonusStars")) if r.perfect else 0)
	var fresh := progress.add_stars(earned)
	_fade(func() -> void: _show_result_now(r, earned, fresh))


func _show_result_now(r: Dictionary, earned: int, fresh: Array) -> void:
	_clear_screens()
	var scr: GDScript = load("res://scripts/ui/result_screen.gd")
	result = scr.new(progress, r, earned, fresh)
	result.retry.connect(start_round)
	result.menu.connect(show_lobby)
	ui.add_child(result)


# ---------- 화면 전환 (어둡게 덮었다가 걷힌다) ----------

var _cover: ColorRect
var _fading := false


func _make_cover() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 50
	add_child(layer)
	_cover = ColorRect.new()
	_cover.color = Color(0.02, 0.02, 0.08, 0)
	_cover.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_cover.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(_cover)


## 화면을 어둡게 덮고 fn 으로 바꾼 뒤 다시 걷는다 (전환 중 누름은 막는다)
func _fade(fn: Callable) -> void:
	if _fading:
		return
	_fading = true
	_cover.mouse_filter = Control.MOUSE_FILTER_STOP
	var tw := create_tween()
	tw.tween_property(_cover, "color:a", 1.0, 0.16)
	tw.tween_callback(fn)
	tw.tween_property(_cover, "color:a", 0.0, 0.24)
	tw.tween_callback(func() -> void:
		_fading = false
		_cover.mouse_filter = Control.MOUSE_FILTER_IGNORE)


# ---------- 폰 세로 안내 ----------

func _make_rotate_hint() -> Control:
	var layer := CanvasLayer.new()
	layer.layer = 100
	layer.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(layer)
	var c := ColorRect.new()
	c.color = Color(0.04, 0.06, 0.15, 0.96)
	c.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	c.visible = false
	layer.add_child(c)
	var t := UiText.make("📱↻\n폰을 가로로 돌려 주세요!", 34, Color.WHITE, 0.5)
	t.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	c.add_child(t)
	return c


func _process(_delta: float) -> void:
	if _rotate_hint == null:
		return
	var vs := get_viewport().get_visible_rect().size
	var blocked := round_node != null and _is_phone and vs.y > vs.x
	if blocked != _rotate_hint.visible:
		_rotate_hint.visible = blocked
		get_tree().paused = blocked

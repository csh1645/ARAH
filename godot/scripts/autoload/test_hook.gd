## 자동 플레이 테스트 연결 (웹 전용, 개발 · 검증용). 브라우저 콘솔에서:
##   arahTest('state'); JSON.parse(arahLast)  → 지금 화면 · 판 상태 (콜백 반환값은 JS 로 오지 않아 arahLast 에 둔다)
##   arahTest('set', '{"mode":"run","subject":"add","level":1,"hero":"luffy"}')
##   arahTest('start') · arahTest('menu') · arahTest('retry') · arahTest('joinFlip') · arahTest('joinOk')
##   arahTest('autoplay', 'on')           → 놀이가 스스로 정답을 고른다 (각 놀이의 auto_step)
##   arahTest('autoplay', 'mixed')        → 홀수 번째 문제는 먼저 틀린 답을 한 번 (각 놀이의 auto_wrong, 오답 경로 검사)
##   arahTest('stars', '13')              → 테스트로 늘어난 스타 되돌리기
## 아이 화면에는 아무것도 보이지 않는다. 외부로 아무것도 보내지 않는다.
extends Node

var _cb: JavaScriptObject
var autoplay := false
## "mixed" 면 문제마다 절반은 먼저 틀린 답을 한 번 고른다 (오답 경로 검사)
var mixed := false
var _wrong_done_for := -1
## 틀린 답을 고른 뒤 그 문제가 "틀림"으로 처리될 때까지 정답을 고르지 않는다 (문 통과처럼 도착까지 시간이 걸리는 놀이)
var _hold_until := 0.0
var _hold_q := -1 # 기다리기를 거는 문제 번호 (틀린 답을 고른 문제만)
var _round_id := 0
var _acc := 0.0


func _ready() -> void:
	if not Bridge.is_web():
		return
	_cb = JavaScriptBridge.create_callback(_on_call)
	var win := JavaScriptBridge.get_interface("window")
	win.arahTest = _cb


func _main() -> Node:
	return get_tree().root.get_node_or_null("Main")


func _on_call(args: Array) -> Variant:
	var cmd := str(args[0]) if args.size() > 0 else "state"
	var arg := str(args[1]) if args.size() > 1 else ""
	var m := _main()
	if m == null:
		return "{}"
	match cmd:
		"set":
			var o: Variant = JSON.parse_string(arg)
			if o is Dictionary:
				for k in o:
					match k:
						"mode": m.progress.mode = str(o[k])
						"subject": m.progress.subject = str(o[k])
						"level": m.progress.level = int(o[k])
						"hero": m.progress.hero_id = str(o[k])
				if is_instance_valid(m.lobby):
					m.lobby.render()
		"start", "retry":
			m.start_round()
		"menu":
			m.show_lobby()
		"autoplay":
			autoplay = arg == "on" or arg == "mixed"
			mixed = arg == "mixed"
		"stars":
			m.progress.stars = int(arg)
			Store.set_value("stars", int(arg))
		"joinFlip":
			var card: Button = m.find_child("JoinCard", true, false)
			if card:
				card.pressed.emit()
		"joinOk":
			var ok: Button = m.find_child("JoinOk", true, false)
			if ok:
				ok.pressed.emit()
	# Godot 콜백의 반환값은 JS 로 전달되지 않는다 → window.arahLast 에 남긴다
	var out := JSON.stringify(_state(m))
	JavaScriptBridge.get_interface("window").arahLast = out
	return out


func _state(m: Node) -> Dictionary:
	var s := {"screen": "lobby" if is_instance_valid(m.lobby) else ("result" if is_instance_valid(m.result) else "round"),
		"stars": m.progress.stars, "mode": m.progress.mode, "hero": m.progress.hero_id, "subject": m.progress.subject, "level": m.progress.level,
		"fps": Engine.get_frames_per_second()}
	var r: Node = m.round_node
	if is_instance_valid(r):
		s.round = {"hearts": r.hearts, "score": r.score, "combo": r.combo, "qIndex": r.q_index, "total": r.total_questions,
			"firstTry": r.first_try, "ended": r.ended, "prompt": str(r.q.get("prompt", "")), "answer": str(r.q.get("answer", "")),
			"waveActive": r.wave_active, "extra": r.test_state() if r.has_method("test_state") else {}}
	if is_instance_valid(m.result):
		s.result = {"firstTry": int(m.result.r.firstTry), "total": int(m.result.r.total), "earned": m.result.earned,
			"fresh": m.result.fresh.map(func(h): return h.id), "join": m.find_child("JoinOverlay", true, false) != null}
	return s


func _process(delta: float) -> void:
	if not autoplay:
		return
	_acc += delta
	if _acc < 0.03:
		return
	_acc = 0.0
	var m := _main()
	if m and is_instance_valid(m.round_node) and m.round_node.has_method("auto_step") and not m.round_node.ended:
		var r: Node = m.round_node
		var t := Time.get_ticks_msec()
		if r.get_instance_id() != _round_id: # 새 판: 기록을 비운다
			_round_id = r.get_instance_id()
			_wrong_done_for = -1
			_hold_until = 0
			_hold_q = -1
		if t < _hold_until and _hold_q == r.q_index and not r.q.get("missed", false):
			return
		if mixed and r.wave_active and _wrong_done_for != r.q_index and r.has_method("auto_wrong"):
			if r.q_index % 2 == 0:
				_wrong_done_for = r.q_index
			elif r.auto_wrong(): # 보기가 아직 안 나타났으면 다음 번에 다시 시도
				_wrong_done_for = r.q_index
				_hold_until = t + 15000
				_hold_q = r.q_index
				return
			else:
				return
		r.auto_step()

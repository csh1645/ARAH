## 히어로 그림(스프라이트 아틀라스, npm run sprites 가 만든 PNG)을 불러온다.
## 웹: 같은 사이트의 assets/sprites/heroes/<id>.png 를 받아 온다 (게임 묶음에 넣지 않음 → 첫 로딩이 가볍고, 원본 파일이 하나).
## 데스크톱(편집기 실행): 저장소의 web/public/ 에서 바로 읽는다.
## 아틀라스 배치: 8칸 × 2줄 (앞모습 · 뒷모습), 자세 이름 = 프레임 이름 (tools/sprites/build.mjs)
extends Node

signal hero_loaded(id: String)

var _sheets: Dictionary = {} # id → Texture2D
var _frames: Dictionary = {} # id → {pose: AtlasTexture}
var _pending: Dictionary = {} # id → true (받는 중)
var _queue: Array[String] = []
var _active := 0
const MAX_PARALLEL := 4


func _sprite_path(id: String) -> String:
	return str(Data.game.get("sprites", {}).get("heroes", {}).get(id, ""))


## 히어로 자세 그림 (없으면 null — 다 받으면 hero_loaded 신호)
func frame(id: String, pose: String = "idle") -> Texture2D:
	var f: Dictionary = _frames.get(id, {})
	if f.is_empty():
		request(id)
		return null
	return f.get(pose, f.get("idle"))


func is_loaded(id: String) -> bool:
	return _frames.has(id)


## 히어로 그림을 받아 둔다 (이미 있거나 받는 중이면 아무것도 안 함)
func request(id: String) -> void:
	if _frames.has(id) or _pending.has(id):
		return
	var path := _sprite_path(id)
	if path == "":
		return
	_pending[id] = true
	if not Bridge.is_web():
		var abs_path := ProjectSettings.globalize_path("res://").path_join("../web/public/" + path + ".png")
		var img := Image.load_from_file(abs_path)
		_store(id, img)
		return
	_queue.append(id)
	_pump()


func _pump() -> void:
	while _active < MAX_PARALLEL and not _queue.is_empty():
		var id: String = _queue.pop_front()
		_active += 1
		var req := HTTPRequest.new()
		add_child(req)
		req.request_completed.connect(_on_done.bind(id, req))
		var url := str(Bridge.call_js("origin")) + "/" + _sprite_path(id) + ".png"
		if req.request(url) != OK:
			_on_done(HTTPRequest.RESULT_CANT_CONNECT, 0, PackedStringArray(), PackedByteArray(), id, req)


func _on_done(result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, id: String, req: HTTPRequest) -> void:
	req.queue_free()
	_active -= 1
	var img: Image = null
	if result == HTTPRequest.RESULT_SUCCESS and code == 200:
		img = Image.new()
		if img.load_png_from_buffer(body) != OK:
			img = null
	_store(id, img)
	_pump()


func _store(id: String, img: Image) -> void:
	_pending.erase(id)
	if img == null or img.is_empty():
		push_warning("히어로 그림을 불러오지 못했어요: %s" % id)
		return
	var tex := ImageTexture.create_from_image(img)
	_sheets[id] = tex
	var frames := {}
	var rects: Dictionary = Data.game.get("sprites", {}).get("frames", {})
	for pose in rects:
		var r: Array = rects[pose]
		var at := AtlasTexture.new()
		at.atlas = tex
		at.region = Rect2(r[0], r[1], r[2], r[3])
		frames[pose] = at
	_frames[id] = frames
	hero_loaded.emit(id)

## 히어로 그림을 불러온다 (npm run sprites 가 만든 파일).
##   <id>.png       자세 8칸 × 2줄 아틀라스 (도감 카드 · 예전 방식)
##   <id>.anim.webp 관절 동작 아틀라스 (2배 해상도, 동작 표는 Data.game.anims — 판 · 로비 무대에서 쓴다)
## 웹: 같은 사이트의 assets/sprites/heroes/ 에서 받아 온다 (게임 묶음에 넣지 않음 → 첫 로딩이 가볍고, 원본 파일이 하나).
## 데스크톱(편집기 실행): 저장소의 web/public/ 에서 바로 읽는다.
extends Node

signal hero_loaded(id: String)
signal anim_loaded(id: String)

var _frames: Dictionary = {} # id → {pose: AtlasTexture}
var _anims: Dictionary = {} # id → Texture2D (관절 동작 아틀라스)
var _pending: Dictionary = {} # "png:<id>" · "anim:<id>" → true (받는 중 · 실패 포함 한 번만)
var _queue: Array = []
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


## 관절 동작 아틀라스 (없으면 null — 다 받으면 anim_loaded 신호)
func anim(id: String) -> Texture2D:
	if _anims.has(id):
		return _anims[id]
	_fetch("anim", id)
	return null


## 관절 동작 프레임 k 의 아틀라스 안 영역 (px)
static func anim_rect(k: int) -> Rect2:
	var a: Dictionary = Data.game.get("anims", {})
	var cols := int(a.get("cols", 8))
	var sc := float(a.get("scale", 2))
	var fw := 96.0 * sc
	var fh := 108.0 * sc
	return Rect2((k % cols) * fw, int(k / cols) * fh, fw, fh)


## 히어로 그림을 받아 둔다 (이미 있거나 받는 중이면 아무것도 안 함)
func request(id: String) -> void:
	if _frames.has(id):
		return
	_fetch("png", id)


func _url_path(kind: String, id: String) -> String:
	var base := _sprite_path(id)
	if base == "":
		return ""
	return base + (".png" if kind == "png" else ".anim.webp")


func _fetch(kind: String, id: String) -> void:
	var key := kind + ":" + id
	if _pending.has(key):
		return
	var rel := _url_path(kind, id)
	if rel == "":
		return
	_pending[key] = true
	if not Bridge.is_web():
		var abs_path := ProjectSettings.globalize_path("res://").path_join("../web/public/" + rel)
		_store(kind, id, Image.load_from_file(abs_path) if FileAccess.file_exists(abs_path) else null)
		return
	# 무대 · 판의 그림(관절 동작)을 도감 카드보다 먼저 받는다
	if kind == "anim":
		_queue.push_front([kind, id])
	else:
		_queue.append([kind, id])
	_pump()


func _pump() -> void:
	while _active < MAX_PARALLEL and not _queue.is_empty():
		var job: Array = _queue.pop_front()
		_active += 1
		var req := HTTPRequest.new()
		add_child(req)
		req.request_completed.connect(_on_done.bind(job[0], job[1], req))
		var url := str(Bridge.call_js("origin")) + "/" + _url_path(job[0], job[1])
		if req.request(url) != OK:
			_on_done(HTTPRequest.RESULT_CANT_CONNECT, 0, PackedStringArray(), PackedByteArray(), job[0], job[1], req)


func _on_done(result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, kind: String, id: String, req: HTTPRequest) -> void:
	req.queue_free()
	_active -= 1
	var img: Image = null
	if result == HTTPRequest.RESULT_SUCCESS and code == 200:
		img = Image.new()
		var err := img.load_png_from_buffer(body) if kind == "png" else img.load_webp_from_buffer(body)
		if err != OK:
			img = null
	_store(kind, id, img)
	_pump()


func _store(kind: String, id: String, img: Image) -> void:
	if img == null or img.is_empty():
		push_warning("히어로 그림을 불러오지 못했어요: %s %s" % [kind, id])
		return
	if kind == "anim":
		img.generate_mipmaps() # 반으로 줄여 그려도 매끄럽게
		_anims[id] = ImageTexture.create_from_image(img)
		anim_loaded.emit(id)
		return
	var tex := ImageTexture.create_from_image(img)
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

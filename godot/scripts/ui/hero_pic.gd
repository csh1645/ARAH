## 메뉴 화면의 히어로 그림 (도감 카드 · 무대 · 합류 축하). 그림을 다 받으면 저절로 나타난다.
## animate = true 면 관절 동작 아틀라스(2배 해상도)로 살아 움직인다: 숨쉬기 반복 + 3초마다 만세 흔들기 (무대 · 합류 축하).
## 관절 동작 그림을 받기 전에는 예전 자세 그림으로 숨쉬기 · 만세를 번갈아 보여 준다.
class_name HeroPic
extends TextureRect

var hero_id := ""
var pose := "idle"
var animate := false
var _t := 0.0
var _atlas: AtlasTexture = null


static func make(id: String, w: float, h: float, p: String = "idle", anim: bool = false) -> HeroPic:
	var n := HeroPic.new()
	n.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	n.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	n.custom_minimum_size = Vector2(w, h)
	n.mouse_filter = Control.MOUSE_FILTER_IGNORE
	n.pose = p
	n.animate = anim
	n.set_hero(id)
	return n


func _ready() -> void:
	Assets.hero_loaded.connect(_on_loaded)
	set_process(animate)
	if animate:
		texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS


func set_hero(id: String) -> void:
	hero_id = id
	_atlas = null
	texture = Assets.frame(id, pose)
	if animate:
		Assets.anim(id) # 관절 동작 그림을 미리 받는다


func _on_loaded(id: String) -> void:
	if id == hero_id and _atlas == null:
		texture = Assets.frame(id, pose)


func _clip(name: String) -> Dictionary:
	for c in Data.game.get("anims", {}).get("clips", []):
		if c.name == name:
			return c
	return {}


func _process(delta: float) -> void:
	_t += delta
	var cycle := fmod(_t, 3.2)
	var sheet := Assets.anim(hero_id)
	if sheet == null: # 아직 관절 동작 그림이 없으면 예전 자세 그림으로
		var p := "idle" if int(_t / 0.52) % 2 == 0 else "breath"
		if cycle > 2.4:
			p = "win" if int(_t / 0.26) % 2 == 0 else "jump"
		var tex := Assets.frame(hero_id, p)
		if tex:
			texture = tex
		return
	var c := _clip("win" if cycle > 2.2 else "idle")
	if c.is_empty():
		return
	var since := cycle - 2.2 if cycle > 2.2 else _t
	var k := int(c.start) + int(since * float(c.fps)) % int(c.count)
	if _atlas == null or _atlas.atlas != sheet:
		_atlas = AtlasTexture.new()
		_atlas.atlas = sheet
	_atlas.region = Assets.anim_rect(k)
	texture = _atlas

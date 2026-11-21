## 메뉴 화면의 히어로 그림 (도감 카드 · 무대 · 합류 축하). 그림을 다 받으면 저절로 나타난다.
## animate = true 면 숨쉬기 · 가끔 만세 · 점프로 살아 움직인다 (무대).
class_name HeroPic
extends TextureRect

var hero_id := ""
var pose := "idle"
var animate := false
var _t := 0.0


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


func set_hero(id: String) -> void:
	hero_id = id
	texture = Assets.frame(id, pose)


func _on_loaded(id: String) -> void:
	if id == hero_id:
		texture = Assets.frame(id, pose)


## 무대 애니메이션: 숨쉬기 반복 + 3초마다 만세 → 점프 (웹 판 로비 2D 무대의 'win' 자세를 살아 있게)
func _process(delta: float) -> void:
	_t += delta
	var cycle := fmod(_t, 3.2)
	var p := "idle" if int(_t / 0.52) % 2 == 0 else "breath"
	if cycle > 2.4:
		p = "win" if int(_t / 0.26) % 2 == 0 else "jump"
	var tex := Assets.frame(hero_id, p)
	if tex:
		texture = tex

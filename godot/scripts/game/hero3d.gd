## 3D 히어로 (시험, "A" 방향 — 2026-11-21 사용자 요청): 2D 게임 화면 안에 3D 모델을 그려 넣는다.
## 작은 3D 세상(SubViewport)에서 모델 · 조명 · 카메라를 따로 그리고, 그 그림을 2D 히어로 자리에 붙인다
## → 놀이 규칙 · 판정 · 연출은 그대로, 히어로만 상용 게임처럼 관절이 움직이는 3D 애니메이션이 된다.
## 모델: KayKit Adventurers (Kay Lousberg, CC0 — godot/assets/kaykit/LICENSE.txt). 팀(능력 종류)마다 모델 · 공격 동작을 고른다.
class_name Hero3D
extends Node

const VIEW := Vector2i(288, 324) # 그리는 크기 (화면에서는 줄여 쓴다 → 선명)
## 2D 그림보다 크게 보이게 하는 배율 (3D 모델은 몸이 가늘어 같은 크기면 작아 보인다)
const SHOW_SCALE := 1.3
## 팀 → [모델, 공격 동작, 남길 소품] — 모델에는 무기 · 방패가 모두 붙어 있어 팀에 맞는 것만 남긴다
const BY_FAMILY := {
	"spider": ["Rogue_Hooded", "Throw", []],
	"armor": ["Knight", "Spellcast_Shoot", []],
	"shield": ["Knight", "1H_Melee_Attack_Chop", ["Round_Shield"]],
	"thunder": ["Barbarian", "2H_Melee_Attack_Chop", ["1H_Axe"]],
	"giant": ["Barbarian", "Unarmed_Melee_Attack_Punch_A", []],
	"archer": ["Rogue", "1H_Ranged_Shoot", ["1H_Crossbow"]],
	"mystic": ["Mage", "Spellcast_Shoot", ["1H_Wand"]],
	"panther": ["Rogue", "Dualwield_Melee_Attack_Slice", ["Knife", "Knife_Offhand"]],
}
## 몸 부위 (항상 보임)
const BODY_PARTS := ["Body", "Head", "Arm", "Leg", "Cape", "Hat", "Helmet"]
## 게임 자세 → 3D 동작 (반복 여부)
const MOTIONS := {
	"idle": ["Idle", true],
	"run": ["Running_A", true],
	"jump": ["Jump_Idle", true],
	"win": ["Cheer", true],
	"hurt": ["Hit_A", false],
}

var viewport: SubViewport
var model: Node3D
var anim: AnimationPlayer
var attack_anim := "1H_Melee_Attack_Chop"
var _current := ""


## 이 히어로로 3D 모델을 만든다. 모델 파일이 없으면 null (2D 그림을 그대로 쓴다)
static func create(hero: Dictionary) -> Hero3D:
	var pick: Array = BY_FAMILY.get(str(hero.get("family", "")), BY_FAMILY.spider)
	var path := "res://assets/kaykit/%s.glb" % pick[0]
	if not ResourceLoader.exists(path):
		return null
	var h := Hero3D.new()
	h.attack_anim = pick[1]
	h._build(load(path))
	h._dress(pick[2], hero.get("look", {}))
	return h


## 팀 소품만 남기고, 망토 · 모자를 히어로 색으로 물들인다 (스파이더맨 = 빨강, 헐크 = 초록 …)
func _dress(keep: Array, look: Dictionary) -> void:
	var tint := Color(str(look.get("suit", "#ffffff")))
	for m in model.find_children("*", "MeshInstance3D", true, false):
		var n: String = m.name
		var body := BODY_PARTS.any(func(p): return n.contains(p))
		m.visible = body or keep.has(n)
		if n.contains("Cape") or n.contains("Hat"):
			for i in m.get_surface_override_material_count():
				var base: Material = m.mesh.surface_get_material(i)
				if base is StandardMaterial3D:
					var mat: StandardMaterial3D = base.duplicate()
					mat.albedo_color = tint.lerp(Color.WHITE, 0.15)
					m.set_surface_override_material(i, mat)


func _build(scene: PackedScene) -> void:
	viewport = SubViewport.new()
	viewport.size = VIEW
	viewport.transparent_bg = true
	viewport.own_world_3d = true
	viewport.msaa_3d = Viewport.MSAA_DISABLED
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(viewport)
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_CLEAR_COLOR
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.75, 0.78, 1.0)
	e.ambient_light_energy = 0.9
	env.environment = e
	viewport.add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-40, 35, 0)
	sun.light_energy = 1.3
	viewport.add_child(sun)
	var rim := DirectionalLight3D.new() # 뒤에서 비추는 테두리 빛 (밤 도시에서 실루엣이 살아나게)
	rim.rotation_degrees = Vector3(-15, 200, 0)
	rim.light_color = Color(0.6, 0.8, 1.0)
	rim.light_energy = 0.8
	viewport.add_child(rim)
	var cam := Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.size = 2.4
	cam.position = Vector3(0, 1.0, 6)
	viewport.add_child(cam)
	# (0, 1, 6) 에서 -Z 방향을 보는 기본 방향 그대로 = 모델 정면 (트리에 붙기 전이라 look_at 은 쓰지 않는다)
	model = scene.instantiate()
	model.rotation_degrees.y = 65 # 오른쪽을 보되 얼굴이 살짝 보이게 (3/4 시점)
	viewport.add_child(model)
	anim = model.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if anim:
		for key in MOTIONS:
			var m: Array = MOTIONS[key]
			if anim.has_animation(m[0]) and m[1]:
				anim.get_animation(m[0]).loop_mode = Animation.LOOP_LINEAR
	play("idle")


func texture() -> Texture2D:
	return viewport.get_texture()


## 게임 자세(idle · run · jump · win · hurt · attack)를 3D 동작으로
func play(state: String) -> void:
	if anim == null or state == _current:
		return
	_current = state
	var name: String
	if state == "attack":
		name = attack_anim
	else:
		name = MOTIONS.get(state, MOTIONS.idle)[0]
	if not anim.has_animation(name):
		name = "Idle"
	anim.play(name, 0.12, 1.4 if state == "attack" else 1.0)

## 게임 데이터 (읽기 전용). 원본은 웹 판 web/src/data/*.js · content DB · 문제 생성기이고,
## tools/godot/export-data.mjs 가 만든 res://data/generated/*.json 을 읽는다 (ADR-0011 "원본은 하나").
## 데이터를 GDScript 에 다시 적지 않는다 — 고칠 때는 웹 판 원본을 고치고 npm run godot:data.
extends Node

const DIR := "res://data/generated/"

var game: Dictionary = {}
var rules: Dictionary = {}
var heroes: Array = []
var families: Array = []
var origins: Array = []
var modes: Array = []
var subjects: Array = []
var levels: Array = []
var _hero_by_id: Dictionary = {}
var _family_by_id: Dictionary = {}
var _pools: Dictionary = {}


func _ready() -> void:
	game = _read_json(DIR + "game.json")
	rules = game.get("rules", {})
	heroes = game.get("heroes", [])
	families = game.get("families", [])
	origins = game.get("origins", [])
	modes = game.get("modes", [])
	subjects = game.get("subjects", [])
	levels = game.get("levels", [])
	for h in heroes:
		_hero_by_id[h.id] = h
	for f in families:
		_family_by_id[f.id] = f


func _read_json(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		push_error("데이터 파일이 없어요: %s (npm run godot:data 를 먼저 실행)" % path)
		return {}
	var v: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	return v if v != null else {}


## 단계별 표 (예: rules.choicesByLevel) 에서 값 하나. JSON 키는 문자열이다.
func by_level(table_name: String, level: int) -> float:
	var t: Dictionary = rules.get(table_name, {})
	return float(t.get(str(level), t.get("1", 0)))


func rule(name: String) -> float:
	return float(rules.get(name, 0))


# ---------- 히어로 ----------

## id 로 히어로를 찾는다. 예전 id 는 새 id 로, 없으면 첫 번째 히어로 (웹 판 A.findHero)
func find_hero(id: String) -> Dictionary:
	var map: Dictionary = game.get("heroIdMap", {})
	var real: String = map.get(id, id)
	return _hero_by_id.get(real, heroes[0])


func has_hero(id: String) -> bool:
	return _hero_by_id.has(id)


func find_family(hero: Dictionary) -> Dictionary:
	return _family_by_id.get(hero.get("family", ""), families[0])


## 팀 색 (데이터는 0xRRGGBB 정수)
func family_color(hero: Dictionary) -> Color:
	return hex_color(int(find_family(hero).get("color", 0xffffff)))


static func hex_color(rgb: int, alpha: float = 1.0) -> Color:
	return Color8((rgb >> 16) & 0xff, (rgb >> 8) & 0xff, rgb & 0xff, int(alpha * 255))


## 히어로 한마디 (웹 판 A.heroLine): catchphrase 는 히어로 자기만의 말, 나머지는 팀 말투 중 하나
func hero_line(hero: Dictionary, kind: String) -> String:
	if kind == "catchphrase":
		return str(game.get("catchphrases", {}).get(hero.id, ""))
	var team: Dictionary = game.get("teamLines", {}).get(hero.get("family", ""), {})
	var list: Array = team.get(kind, [])
	return str(list.pick_random()) if not list.is_empty() else ""


## 자세별 손 위치 (그림 중심 기준 비율, hero-art.js A.heroHand)
func hand_of(pose: String) -> Vector2:
	var hands: Dictionary = game.get("hands", {})
	var h: Dictionary = hands.get(pose, hands.get("idle", {"x": 0.34, "y": -0.12}))
	return Vector2(float(h.x), float(h.y))


func mode_info(id: String) -> Dictionary:
	for m in modes:
		if m.id == id:
			return m
	return modes[0]


# ---------- 문제 ----------

## 과목 · 단계 · 형식에 맞는 문제 하나 (웹 판 A.makeQuestion). 미리 만든 검증된 문제 풀에서 꺼낸다.
## @param options pictureChoices: 그림 보기 / spelling: 철자 잇기
func make_question(subject: String, level: int, options: Dictionary = {}) -> Dictionary:
	var name: String = subject
	if options.get("spelling", false):
		name = "spell"
	elif subject == "eng" and options.get("pictureChoices", false):
		name = "eng-pic"
	var pool := _pool("%s-%d" % [name, level])
	if pool.is_empty():
		pool = _pool("mix-%d" % level)
	var q: Dictionary = pool.pick_random().duplicate(true)
	if q.has("choices") and not q.get("spelling", false):
		var c: Array = q.choices
		c.shuffle()
	return q


func _pool(name: String) -> Array:
	if not _pools.has(name):
		var v: Variant = _read_json(DIR + "questions/%s.json" % name)
		_pools[name] = v if v is Array else []
	return _pools[name]

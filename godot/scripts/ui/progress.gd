## 진행 데이터 (스타 · 히어로 합류 · 마지막 선택). 웹 판 ui/app.js 의 규칙과 저장 키를 그대로 쓴다
## → 같은 주소에서 웹 판으로 모은 스타 · 합류한 히어로가 그대로 이어진다.
## 저장 키: stars · unlocked · hero · mode · subject · level · levelScheme · runIntroduced
class_name Progress
extends RefCounted

## 저장된 단계 값의 체계 번호. 2 = 1~12단계(초1~중3)
const LEVEL_SCHEME := 2
## 테스트 단계: 모든 히어로를 고를 수 있다 (사용자 결정 2026-10-17, 웹 판 TEST_PHASE 와 같다).
## 고르기만 열어 주고 진행 기록(합류 수 · 다음 합류)은 실제 스타 기준.
const TEST_PHASE := true
## 예전(전체 별 하나로 합류하던 시절) 합류 조건 — 이미 열렸던 히어로가 다시 잠기지 않게 한 번만 옮긴다
const LEGACY_UNLOCKS := {
	"red": 0, "snow": 10, "shadow": 25, "detective": 45, "piggy": 70, "future": 100,
	"armor-red": 15, "armor-war": 55, "armor-blue": 130, "shield-star": 20, "shield-night": 80, "shield-crystal": 160,
	"thunder-knight": 30, "thunder-storm": 90, "thunder-aurora": 190, "giant-green": 35, "giant-red": 110, "giant-gray": 220,
	"archer-purple": 40, "archer-shadow": 120, "archer-gold": 260, "mystic-master": 140, "mystic-dark": 240,
	"panther-night": 150, "panther-gold": 280,
}

var stars := 0
var hero_id := "spider-man"
var mode := "run"
var subject := "add"
var level := 1
var unlocked: Array = []


func _init() -> void:
	stars = int(Store.get_value("stars", 0))
	hero_id = str(Store.get_value("hero", "spider-man"))
	mode = str(Store.get_value("mode", "run"))
	subject = str(Store.get_value("subject", "add"))
	level = int(Store.get_value("level", 1))
	# 단계 체계가 바뀌었다 (1~6 → 1~12, ADR-0007): 예전 저장값은 같은 수준의 새 단계로 한 번만 옮긴다
	if int(Store.get_value("levelScheme", 1)) < LEVEL_SCHEME:
		level = int(Data.game.get("legacyLevelMap", {}).get(str(level), 1))
		Store.set_value("level", level)
		Store.set_value("levelScheme", LEVEL_SCHEME)
	if not Data.levels.any(func(l): return int(l.id) == level):
		level = 1
	mode = str(Data.game.get("modeAliases", {}).get(mode, mode))
	if not Data.modes.any(func(m): return m.id == mode):
		mode = "run"
	if not Data.subjects.any(func(s): return s.id == subject):
		subject = "add"
	if stars < 0:
		stars = 0
	# 새 놀이(히어로 러너)는 한 번만 먼저 골라 둔다
	if not Store.get_value("runIntroduced", false):
		mode = "run"
		Store.set_value("runIntroduced", true)
	var saved: Variant = Store.get_value("unlocked", null)
	var id_map: Dictionary = Data.game.get("heroIdMap", {})
	if saved is Array:
		unlocked = saved
	else:
		unlocked = []
		for id in LEGACY_UNLOCKS:
			if stars >= int(LEGACY_UNLOCKS[id]):
				unlocked.append(id_map.get(id, id))
		Store.set_value("unlocked", unlocked)
	# 예전 id → 새 id
	var moved := false
	for i in unlocked.size():
		if id_map.has(unlocked[i]):
			unlocked[i] = id_map[unlocked[i]]
			moved = true
	if id_map.has(hero_id):
		hero_id = id_map[hero_id]
		moved = true
	if moved:
		Store.set_value("unlocked", unlocked)
		Store.set_value("hero", hero_id)
	if not Data.has_hero(hero_id):
		hero_id = "spider-man"
	remember_unlocked()


## 스타로 실제 합류했는지 (진행 기록용)
func earned(hero: Dictionary) -> bool:
	return stars >= int(hero.unlockStars) or unlocked.has(hero.id)


## 고를 수 있는지 (테스트 단계면 모두, 주소에 ?allHeroes 가 있어도)
func selectable(hero: Dictionary) -> bool:
	return TEST_PHASE or Bridge.has_query("allHeroes") or earned(hero)


func remember_unlocked() -> void:
	var changed := false
	for h in Data.heroes:
		if earned(h) and not unlocked.has(h.id):
			unlocked.append(h.id)
			changed = true
	if changed:
		Store.set_value("unlocked", unlocked)


func earned_count() -> int:
	return Data.heroes.filter(func(h): return earned(h)).size()


## 아직 합류하지 않은 히어로 중 목록에서 가장 앞 (없으면 빈 Dictionary)
func next_hero() -> Dictionary:
	for h in Data.heroes:
		if not earned(h):
			return h
	return {}


func save_choice() -> void:
	Store.set_value("hero", hero_id)
	Store.set_value("mode", mode)
	Store.set_value("subject", subject)
	Store.set_value("level", level)


## 한 판 결과로 스타를 적립한다. @return 새로 합류한 히어로 목록
func add_stars(n: int) -> Array:
	var before := {}
	for h in Data.heroes:
		if earned(h):
			before[h.id] = true
	stars += n
	Store.set_value("stars", stars)
	var fresh := Data.heroes.filter(func(h): return earned(h) and not before.has(h.id))
	remember_unlocked()
	return fresh

## 오답 복습 노트 (간격 반복) — 웹 판 questions/review.js 를 그대로 옮겼다. 저장 키도 같다('review').
## 틀린 문제 → 상자 1. 복습에서 한 번에 맞히면 상자 +1, reviewMasterBox 를 넘으면 졸업.
## 상자 번호가 낮을수록(아직 약한 문제) 자주 나온다.
## @see doc/planning/game-design.md (6.1 오답 복습)
extends Node

const STORE_KEY := "review"
const REVIEW_TAG := "📒 복습 문제 · "
const KEEP := ["key", "subject", "prompt", "hint", "answer", "choices", "review", "speak", "speakOnStart", "pictureChoices", "spelling", "decoys", "tokens"]


func _load() -> Dictionary:
	var v: Variant = Store.get_value(STORE_KEY, {})
	return v if v is Dictionary else {}


static func kind_of(q: Dictionary) -> String:
	return "spell" if q.get("spelling", false) else "choice"


static func _snapshot(q: Dictionary) -> Dictionary:
	var s := {}
	for k in KEEP:
		if q.has(k):
			s[k] = q[k]
	if s.has("hint"):
		s.hint = str(s.hint).replace(REVIEW_TAG, "")
	return s


static func _matches(entry: Dictionary, subject: String) -> bool:
	if subject == "" or subject == "review":
		return true
	var qs: String = entry.q.get("subject", "")
	if subject == "mix":
		return qs in ["add", "sub", "mul", "div"]
	return qs == subject


## 한 문제가 끝났을 때 결과 반영. @return "added" | "mastered" | "up" | ""
func record(q: Dictionary) -> String:
	if q.is_empty() or not q.has("key"):
		return ""
	var book := _load()
	var entry: Variant = book.get(q.key)
	var result := ""
	var now := Time.get_unix_time_from_system() * 1000.0
	if q.get("missed", false):
		book[q.key] = {"q": _snapshot(q), "box": 1, "wrong": (int(entry.wrong) if entry else 0) + 1, "at": now}
		result = "" if entry else "added"
	elif entry and q.get("fromReview", false):
		entry.box = int(entry.box) + 1
		entry.at = now
		if entry.box > int(Data.rule("reviewMasterBox")):
			book.erase(q.key)
			result = "mastered"
		else:
			result = "up"
	var max_items := int(Data.rule("reviewMaxItems"))
	if book.size() > max_items:
		var keys := book.keys()
		keys.sort_custom(func(a, b): return float(book[a].at) < float(book[b].at))
		for k in keys.slice(0, keys.size() - max_items):
			book.erase(k)
	Store.set_value(STORE_KEY, book)
	return result


## 복습 노트 문제 수 (kind: "spell" | "choice" | "" 전체)
func count(kind: String = "", subject: String = "") -> int:
	var n := 0
	for e in _load().values():
		if (kind == "" or kind_of(e.q) == kind) and _matches(e, subject):
			n += 1
	return n


## 복습할 문제 하나 (없으면 빈 Dictionary)
func pick(kind: String, subject: String, avoid_keys: Array) -> Dictionary:
	var list := []
	for e in _load().values():
		if kind_of(e.q) == kind and _matches(e, subject):
			list.append(e)
	if list.is_empty():
		return {}
	var fresh := list.filter(func(e): return not avoid_keys.has(e.q.key))
	if not fresh.is_empty():
		list = fresh
	var weighted := []
	for e in list:
		for i in max(1, 4 - int(e.box)):
			weighted.append(e)
	var q: Dictionary = weighted.pick_random().q.duplicate(true)
	if q.has("choices") and not q.get("spelling", false):
		var c: Array = q.choices
		c.shuffle()
	q.fromReview = true
	q.hint = REVIEW_TAG + (str(q.hint) if str(q.get("hint", "")) != "" else "다시 도전!")
	return q

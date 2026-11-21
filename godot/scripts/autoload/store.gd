## 저장소. 웹에서는 브라우저 localStorage 'arah.*' 를 그대로 쓴다 → 웹(Phaser) 판과 같은 주소에서
## 스타 · 합류 · 고른 히어로 · 단계 · 복습 노트가 그대로 이어진다 (ADR-0011 저장 기록 — 옮기기 작업이 필요 없다).
## 데스크톱(편집기 실행)은 user://arah-save.json 에 같은 키로 저장한다.
## 개인정보는 저장하지 않는다 (doc/standards/coding-standards.md 6절).
extends Node

const DESKTOP_FILE := "user://arah-save.json"

var _desktop: Dictionary = {}


func _ready() -> void:
	if not Bridge.is_web() and FileAccess.file_exists(DESKTOP_FILE):
		var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(DESKTOP_FILE))
		if parsed is Dictionary:
			_desktop = parsed


## 저장된 값을 읽는다. 없거나 읽기에 실패하면 fallback.
func get_value(key: String, fallback: Variant = null) -> Variant:
	var raw: String = ""
	if Bridge.is_web():
		raw = str(Bridge.call_js("storageGet", [key]))
	elif _desktop.has(key):
		raw = str(_desktop[key])
	if raw == "" or raw == "null":
		return fallback
	var json := JSON.new()
	if json.parse(raw) != OK:
		return fallback
	var v: Variant = json.data
	# JSON 숫자는 float 로 읽힌다 → 정수 값은 int 로 (별 · 단계 비교가 자연스럽게)
	if v is float and fallback is int and v == floor(v):
		return int(v)
	return v


## 값을 JSON 으로 저장한다. 실패해도 게임은 계속된다.
func set_value(key: String, value: Variant) -> void:
	var raw := JSON.stringify(value)
	if Bridge.is_web():
		Bridge.call_js("storageSet", [key, raw])
		return
	_desktop[key] = raw
	var f := FileAccess.open(DESKTOP_FILE, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(_desktop))

## 글꼴: 주아(Jua, 기본) · 검은고딕(Black Han Sans, 효과 글자). 웹 판과 같은 글꼴을 사이트 안에 함께 배포한다
## (외부 글꼴 서버 금지 — 아동 대상 보안 규칙). @fontsource 의 글자 범위별 조각(woff2)을 대체 글꼴 목록으로 잇는다.
## 데스크톱(편집기 실행)에서는 기기 그림 문자 글꼴을 마지막 대체 글꼴로 붙인다 (웹은 Emoji 가 그림으로 그린다).
extends Node

const DIR := "res://fonts/generated/"

var main: Font
var title: Font


func _ready() -> void:
	var list: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://data/generated/fonts.json"))
	if not (list is Dictionary):
		push_error("fonts.json 이 없어요 (npm run godot:data)")
		main = ThemeDB.fallback_font
		title = main
		return
	main = _chain("jua", list.get("jua", []), [])
	title = _chain("blackhan", list.get("blackhan", []), [main])
	# 모든 Control 의 기본 글꼴
	ThemeDB.fallback_font = main
	ThemeDB.fallback_font_size = 22


func _chain(id: String, files: Array, extra: Array) -> Font:
	var fonts: Array[Font] = []
	for f in files:
		var res: Variant = load(DIR + id + "/" + str(f))
		if res is FontFile:
			fonts.append(res)
	if fonts.is_empty():
		return ThemeDB.fallback_font
	var head: FontFile = fonts[0].duplicate()
	var rest: Array[Font] = []
	rest.append_array(fonts.slice(1))
	for e in extra:
		rest.append(e)
	if not OS.has_feature("web"):
		var sys := SystemFont.new()
		sys.font_names = PackedStringArray(["Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Malgun Gothic"])
		rest.append(sys)
	head.fallbacks = rest
	return head


## 이 글꼴(대체 글꼴 포함)에 글자가 있는지
func has_char(font: Font, cp: int) -> bool:
	if font.has_char(cp):
		return true
	for fb in font.fallbacks:
		if fb is FontFile and fb.has_char(cp):
			return true
	return false

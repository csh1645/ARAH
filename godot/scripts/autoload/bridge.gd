## 브라우저 다리 (웹에서만). godot/web/arah-bridge.js 의 window.ArahBridge 를 부른다.
## eval 을 쓰지 않는다 (사이트 CSP 에 'unsafe-eval' 이 없다). 데스크톱(편집기 실행)에서는 is_web() 이 false.
## @see godot/web/arah-bridge.js
extends Node

var _js: JavaScriptObject = null


func _ready() -> void:
	if OS.has_feature("web"):
		_js = JavaScriptBridge.get_interface("ArahBridge")
		if _js == null:
			push_warning("ArahBridge 를 찾지 못했어요 (shell.html 에 arah-bridge.js 가 있는지 확인)")


## 웹에서 다리가 준비됐는지
func is_web() -> bool:
	return _js != null


## 다리 함수 호출. 웹이 아니면 null
func call_js(method: String, args: Array = []) -> Variant:
	if _js == null:
		return null
	return _js.callv(method, args)


## 주소에 쿼리 이름이 있는지 (예: ?allHeroes)
func has_query(name: String) -> bool:
	return bool(call_js("hasQuery", [name])) if is_web() else false

## 영어 발음: 원어민 발음 파일(웹 판과 같은 WAV, 사이트의 assets/audio/voices/)을 브라우저가 재생한다.
## 파일이 없으면 기기 음성 합성. 목소리 팩 선택은 웹 판과 같은 저장 키('voice').
## 발음 파일은 게임 묶음(.pck)에 넣지 않는다 → 첫 로딩이 가볍고 원본 파일이 하나다.
## @see godot/web/arah-bridge.js speak, web/src/core/speech.js
extends Node

const VOICES_DIR := "assets/audio/voices/"
const VOICE_KEY := "voice"
const SAMPLE := "I am happy."


func _packs() -> Dictionary:
	return Data.game.get("voices", {}).get("packs", {})


func _default() -> String:
	return str(Data.game.get("voices", {}).get("default", "af_heart"))


## 지금 고른 목소리 팩 id
func current() -> String:
	var id := str(Store.get_value(VOICE_KEY, _default()))
	return id if _packs().has(id) else _default()


## 메뉴에 보여 줄 목소리 팩 [{id, label}] (파일이 있는 팩만)
func packs() -> Array:
	var out := []
	var p := _packs()
	for id in p:
		if not p[id].get("files", {}).is_empty():
			out.append({"id": id, "label": p[id].get("label", id)})
	return out


func set_voice(id: String) -> void:
	if _packs().has(id):
		Store.set_value(VOICE_KEY, id)


## 다음 목소리로 바꾸고 짧은 문장을 들려준다
func next_voice() -> void:
	var list := packs()
	if list.is_empty():
		return
	var cur := current()
	var i := 0
	for k in list.size():
		if list[k].id == cur:
			i = k
	set_voice(list[(i + 1) % list.size()].id)
	unlock()
	speak(SAMPLE)


func label() -> String:
	for p in packs():
		if p.id == current():
			return str(p.label)
	return "목소리"


## 사용자 터치 중에 불러 모바일 자동재생 제한을 푼다 (시작 버튼)
func unlock() -> void:
	Bridge.call_js("unlockAudio")


## 영어를 읽어 준다 (이전 소리는 끊는다)
func speak(text: String) -> void:
	var key := text.to_lower()
	var src := ""
	var p := _packs()
	for id in [current(), _default()]:
		if p.has(id) and p[id].get("files", {}).has(key):
			src = VOICES_DIR + id + "/" + str(p[id].files[key])
			break
	if Bridge.is_web():
		Bridge.call_js("speak", [src, text])
	else:
		print("[발음] ", text, " → ", src if src != "" else "(음성 합성)")


func stop() -> void:
	Bridge.call_js("stopSpeech")

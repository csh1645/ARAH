## 효과음 · 배경음. 웹 판 core/sfx.js 의 소리 표(SOUNDS · SHOTS · SONGS)를 그대로 옮겨 코드로 합성한다
## (음원 파일 없음 → 저작권 · 용량 걱정 없음). 처음 실행 때 소리마다 파형을 한 번 만들어 두고 재생만 한다.
##   Sfx.play("correct") · Sfx.shot("thunder") · Sfx.music_start("hero"|"boss") · Sfx.music_stop()
##   Sfx.set_enabled("sfx"|"bgm", on) — 설정은 저장된다 (웹 판과 같은 키 'sound')
## @see doc/planning/game-design.md (10. 소리)
extends Node

const RATE := 22050
const SFX_VOLUME := 0.5
const BGM_VOLUME := 0.13
const VOICES := 10 # 동시에 낼 수 있는 효과음 수
const SETTINGS_KEY := "sound"

## 팀별 발사음 (HeroFamily.id) — 부품: [종류, 값…] (아래 _render 참고)
const SHOTS := {
	"spider": [["n", {"dur": 0.14, "f": 3000, "to": 900, "q": 3, "vol": 0.35}]],
	"armor": [["t", {"f": 1400, "to": 260, "dur": 0.2, "type": "saw", "vol": 0.12}], ["t", {"f": 700, "to": 180, "dur": 0.2, "type": "square", "vol": 0.06}]],
	"shield": [["n", {"dur": 0.15, "f": 1500, "to": 600, "vol": 0.25}], ["t", {"f": 1250, "dur": 0.25, "type": "tri", "vol": 0.15, "at": 0.08}]],
	"thunder": [["n", {"dur": 0.3, "filter": "high", "f": 2500, "vol": 0.4}], ["t", {"f": 90, "to": 40, "dur": 0.35, "type": "saw", "vol": 0.18}]],
	"giant": [["t", {"f": 130, "to": 45, "dur": 0.3, "vol": 0.5}], ["n", {"dur": 0.2, "filter": "low", "f": 400, "vol": 0.3}]],
	"archer": [["t", {"f": 660, "to": 220, "dur": 0.12, "type": "tri", "vol": 0.25}], ["n", {"dur": 0.1, "f": 4000, "to": 2000, "q": 4, "vol": 0.15}]],
	"mystic": [["t", {"f": 880, "dur": 0.25, "vol": 0.12}], ["t", {"f": 1320, "dur": 0.25, "vol": 0.12, "at": 0.05}], ["t", {"f": 1760, "dur": 0.25, "vol": 0.12, "at": 0.1}]],
	"panther": [["n", {"dur": 0.1, "filter": "high", "f": 3000, "vol": 0.3}], ["t", {"f": 750, "to": 400, "dur": 0.1, "type": "tri", "vol": 0.12}]],
}

## 상황 효과음
const SOUNDS := {
	"correct": [["t", {"f": 784, "dur": 0.12, "type": "tri", "vol": 0.3}], ["t", {"f": 1175, "dur": 0.22, "type": "tri", "vol": 0.3, "at": 0.09}]],
	"wrong": [["t", {"f": 220, "to": 140, "dur": 0.28, "type": "square", "vol": 0.12}]],
	"hurt": [["t", {"f": 160, "to": 70, "dur": 0.25, "vol": 0.4}], ["n", {"dur": 0.12, "filter": "low", "f": 600, "vol": 0.2}]],
	"combo": [["arp", {"fs": [523, 659, 784, 1047], "dur": 0.18, "type": "tri", "vol": 0.22, "gap": 0.07}]],
	"glass": [["n", {"dur": 0.4, "filter": "high", "f": 3500, "vol": 0.35}], ["arp", {"fs": [2400, 3100, 2800, 3600], "dur": 0.15, "vol": 0.08, "gap": 0.04}]],
	"hit": [["n", {"dur": 0.18, "filter": "low", "f": 1200, "vol": 0.4}], ["t", {"f": 200, "to": 90, "dur": 0.2, "type": "square", "vol": 0.12}]],
	"bossAttack": [["t", {"f": 900, "to": 120, "dur": 0.5, "type": "saw", "vol": 0.15}]],
	"flip": [["n", {"dur": 0.06, "f": 2500, "q": 2, "vol": 0.2}]],
	"land": [["t", {"f": 110, "to": 60, "dur": 0.12, "vol": 0.3}]],
	"teleport": [["t", {"f": 300, "to": 1500, "dur": 0.35, "vol": 0.15}]],
	"win": [["arp", {"fs": [523, 659, 784, 1047, 1319], "dur": 0.3, "type": "tri", "vol": 0.25, "gap": 0.11}]],
	"lose": [["arp", {"fs": [392, 330, 262], "dur": 0.35, "type": "tri", "vol": 0.2, "gap": 0.18}]],
	"click": [["t", {"f": 1000, "dur": 0.05, "type": "square", "vol": 0.06}]],
	"jump": [["t", {"f": 330, "to": 660, "dur": 0.12, "type": "square", "vol": 0.07}]],
	"coin": [["t", {"f": 1319, "dur": 0.06, "type": "square", "vol": 0.06}], ["t", {"f": 1760, "dur": 0.1, "type": "square", "vol": 0.06, "at": 0.05}]],
	"powerUp": [["arp", {"fs": [392, 523, 659, 784, 1047, 1319], "dur": 0.1, "type": "square", "vol": 0.08, "gap": 0.05}]],
	"smash": [["n", {"dur": 0.2, "filter": "low", "f": 900, "vol": 0.4}], ["t", {"f": 140, "to": 60, "dur": 0.18, "type": "square", "vol": 0.12}]],
}

## 배경음: 코드 진행(근음) · 템포 · 아르페지오 간격 (C G Am F 밝게 / Am F G E 긴장)
const SONGS := {
	"hero": {"bpm": 112, "chords": [261.6, 392.0, 440.0, 349.2], "arp": [1, 1.25, 1.5, 2], "wave": "tri"},
	"boss": {"bpm": 138, "chords": [220.0, 174.6, 196.0, 164.8], "arp": [1, 1.19, 1.5, 1.78], "wave": "square"},
}

var settings := {"sfx": true, "bgm": true}
var _streams: Dictionary = {}
var _songs: Dictionary = {}
var _players: Array[AudioStreamPlayer] = []
var _next := 0
var _music: AudioStreamPlayer
var _music_name := ""
var _noise := PackedFloat32Array()


func _ready() -> void:
	var saved: Variant = Store.get_value(SETTINGS_KEY, {})
	if saved is Dictionary:
		for k in ["sfx", "bgm"]:
			if saved.has(k):
				settings[k] = bool(saved[k])
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	_noise.resize(RATE)
	for i in RATE:
		_noise[i] = rng.randf() * 2.0 - 1.0
	for i in VOICES:
		var p := AudioStreamPlayer.new()
		add_child(p)
		_players.append(p)
	_music = AudioStreamPlayer.new()
	add_child(_music)
	_apply_volume()
	# 첫 화면이 뜬 뒤 조금씩 미리 만든다 (처음 재생 때 끊김 없게)
	_prebuild.call_deferred()


func _prebuild() -> void:
	for name in SOUNDS:
		_get_stream("s:" + name)
		await get_tree().process_frame
	for fam in SHOTS:
		_get_stream("f:" + fam)
		await get_tree().process_frame


func _apply_volume() -> void:
	for p in _players:
		p.volume_db = linear_to_db(SFX_VOLUME)
	_music.volume_db = linear_to_db(BGM_VOLUME)


func is_enabled(kind: String) -> bool:
	return bool(settings.get(kind, true))


func set_enabled(kind: String, on: bool) -> void:
	settings[kind] = on
	Store.set_value(SETTINGS_KEY, settings)
	if kind == "bgm":
		if on and _music_name != "" and not _music.playing:
			_music.play()
		elif not on:
			_music.stop()


## 상황 효과음 (correct · wrong · hurt · combo · glass · hit · bossAttack · flip · land · teleport · win · lose · click · jump · coin · powerUp · smash)
func play(name: String) -> void:
	if not is_enabled("sfx") or not SOUNDS.has(name):
		return
	_play_stream(_get_stream("s:" + name))


## 팀별 발사음
func shot(family_id: String) -> void:
	if not is_enabled("sfx"):
		return
	_play_stream(_get_stream("f:" + (family_id if SHOTS.has(family_id) else "spider")))


func _play_stream(s: AudioStream) -> void:
	var p := _players[_next]
	_next = (_next + 1) % VOICES
	p.stream = s
	p.play()


func music_start(name: String) -> void:
	_music_name = name if SONGS.has(name) else "hero"
	if not _songs.has(_music_name):
		_songs[_music_name] = _render_song(SONGS[_music_name])
	_music.stream = _songs[_music_name]
	if is_enabled("bgm"):
		_music.play()


func music_stop() -> void:
	_music_name = ""
	_music.stop()


func music_playing() -> bool:
	return _music.playing


# ---------- 합성 ----------

func _get_stream(key: String) -> AudioStreamWAV:
	if not _streams.has(key):
		var parts: Array = SOUNDS[key.substr(2)] if key.begins_with("s:") else SHOTS[key.substr(2)]
		_streams[key] = _to_wav(_render(parts))
	return _streams[key]


## 부품 목록을 하나의 파형으로. "t" 음 · "n" 잡음 · "arp" 여러 음을 간격을 두고
func _render(parts: Array) -> PackedFloat32Array:
	var flat: Array = []
	for p in parts:
		if p[0] == "arp":
			var o: Dictionary = p[1]
			var i := 0
			for f in o.fs:
				flat.append(["t", {"f": f, "dur": o.dur, "type": o.get("type", "sine"), "vol": o.vol, "at": i * o.gap}])
				i += 1
		else:
			flat.append(p)
	var length := 0.0
	for p in flat:
		length = maxf(length, float(p[1].get("at", 0.0)) + float(p[1].dur) + 0.02)
	var buf := PackedFloat32Array()
	buf.resize(int(length * RATE))
	for p in flat:
		if p[0] == "t":
			_tone(buf, p[1])
		else:
			_noise_part(buf, p[1])
	return buf


## 음 하나: 시작 음높이에서 끝 음높이로 지수 곡선으로 미끄러지며, 10ms 에 커졌다가 끝까지 지수로 작아진다 (웹 판 tone)
func _tone(buf: PackedFloat32Array, o: Dictionary) -> void:
	var start := int(float(o.get("at", 0.0)) * RATE)
	var dur := float(o.dur)
	var n := int(dur * RATE)
	var f0 := float(o.f)
	var f1 := maxf(20.0, float(o.get("to", o.f)))
	var vol := float(o.get("vol", 0.3))
	var type: String = o.get("type", "sine")
	var phase := 0.0
	for i in n:
		var idx := start + i
		if idx >= buf.size():
			break
		var t := float(i) / RATE
		var freq := f0 * pow(f1 / f0, t / dur)
		phase = fmod(phase + freq / RATE, 1.0)
		var s: float
		match type:
			"square":
				s = 1.0 if phase < 0.5 else -1.0
			"saw":
				s = phase * 2.0 - 1.0
			"tri":
				s = 1.0 - 4.0 * absf(phase - 0.5)
			_:
				s = sin(phase * TAU)
		buf[idx] += s * _env(t, dur, vol)


## 지수 엔벌로프 (0.0001 → vol 10ms → 0.0001)
func _env(t: float, dur: float, vol: float) -> float:
	if t < 0.01:
		return 0.0001 * pow(vol / 0.0001, t / 0.01)
	return vol * pow(0.0001 / vol, (t - 0.01) / maxf(0.001, dur - 0.01))


## 잡음 한 덩어리를 2차 필터(대역 · 저역 · 고역)에 통과 (웹 판 noise, BiquadFilter 와 같은 공식)
func _noise_part(buf: PackedFloat32Array, o: Dictionary) -> void:
	var start := int(float(o.get("at", 0.0)) * RATE)
	var dur := float(o.dur)
	var n := int(dur * RATE)
	var f0 := float(o.get("f", 1000))
	var f1 := float(o.get("to", f0))
	var q := float(o.get("q", 1.0))
	var vol := float(o.get("vol", 0.3))
	var kind: String = o.get("filter", "band")
	var x1 := 0.0
	var x2 := 0.0
	var y1 := 0.0
	var y2 := 0.0
	for i in n:
		var idx := start + i
		if idx >= buf.size():
			break
		var t := float(i) / RATE
		var freq := minf(f0 * pow(f1 / f0, t / dur), RATE * 0.45)
		var w0 := TAU * freq / RATE
		var alpha := sin(w0) / (2.0 * q)
		var cw := cos(w0)
		var b0: float
		var b1: float
		var b2: float
		match kind:
			"low":
				b0 = (1.0 - cw) / 2.0
				b1 = 1.0 - cw
				b2 = b0
			"high":
				b0 = (1.0 + cw) / 2.0
				b1 = -(1.0 + cw)
				b2 = b0
			_:
				b0 = alpha
				b1 = 0.0
				b2 = -alpha
		var a0 := 1.0 + alpha
		var a1 := -2.0 * cw
		var a2 := 1.0 - alpha
		var x := _noise[i % _noise.size()]
		var y := (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0
		x2 = x1
		x1 = x
		y2 = y1
		y1 = y
		buf[idx] += y * vol * pow(0.0001, t / dur)


## 배경음 한 바퀴(코드 진행 전체)를 미리 만들어 반복 재생한다
func _render_song(s: Dictionary) -> AudioStreamWAV:
	var step := 60.0 / float(s.bpm) / 2.0
	var chords: Array = s.chords
	var steps := chords.size() * 8
	var buf := PackedFloat32Array()
	buf.resize(int(step * steps * RATE))
	for k in steps:
		var root: float = chords[int(k / 8) % chords.size()]
		var pos := k % 8
		var at := k * step
		if pos == 0 or pos == 4:
			_tone(buf, {"f": root / 2.0, "dur": 0.35, "vol": 0.5, "at": at})
		var arp: Array = s.arp
		_tone(buf, {"f": root * float(arp[pos % arp.size()]) * (2.0 if pos >= 4 else 1.0), "dur": 0.18, "type": s.wave, "vol": 0.18, "at": at})
	var wav := _to_wav(buf)
	wav.loop_mode = AudioStreamWAV.LOOP_FORWARD
	wav.loop_begin = 0
	wav.loop_end = buf.size()
	return wav


func _to_wav(buf: PackedFloat32Array) -> AudioStreamWAV:
	var bytes := PackedByteArray()
	bytes.resize(buf.size() * 2)
	for i in buf.size():
		bytes.encode_s16(i * 2, int(clampf(buf[i], -1.0, 1.0) * 32767.0))
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = RATE
	w.stereo = false
	w.data = bytes
	return w

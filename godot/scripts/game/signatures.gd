## 캐릭터별 필살기 연출 · 작품별 액션 느낌 — 웹 판 game/signatures.js 를 그대로 옮겼다.
##   작품(franchise)별: 효과 글자 · 대기 동작 (마블·DC = 미국 만화 글자, 원피스 = 굵은 만화 효과, 산리오 · 치이카와 = 하트 · 반짝이)
##   캐릭터별(SIGNATURES): 루피 고무 팔 · 조로 삼도류 · 나미 번개 · 토르 번개 · 헐크 내려찍기 · 슈퍼맨 눈빔 …
## 새 캐릭터는 SIGNATURES 에 한 줄(word · fx) 더하면 된다. 없으면 작품 → 팀 기본 연출.
## @see doc/planning/game-design.md (9.3 액션 연출)
class_name Signatures
extends RefCounted

const FX_Z := 41

## 작품별 효과 글자 모양 · 단어
const FRANCHISE := {
	"original": {"title": true, "fill": "#7cf8ff", "stroke": "#2b1d6b", "strokeW": 10, "size": 46, "angle": -8, "words": {"default": ["슈퍼!", "짜잔!", "파워업!"]}},
	"comic": {"title": true, "fill": "#ffeb3b", "stroke": "#1a1a1a", "strokeW": 10, "size": 46, "angle": -12, "words": {
		"spider": ["THWIP!", "슉!"], "armor": ["ZAP!", "지잉!"], "shield": ["CLANG!", "쾅!"], "thunder": ["KRAKOOM!", "콰직!"],
		"giant": ["SMASH!", "쿵!"], "archer": ["THWACK!", "퍽!"], "mystic": ["MAGIC!", "번쩍!"], "panther": ["SNIKT!", "휙!"]}},
	"onepiece": {"title": true, "fill": "#ffffff", "stroke": "#111111", "strokeW": 12, "size": 52, "angle": 8, "words": {"default": ["쾅!!", "두둥!!", "콰앙!!"]}},
	"sanrio": {"title": false, "fill": "#ff6fa8", "stroke": "#ffffff", "strokeW": 8, "size": 40, "angle": -6, "words": {"default": ["뿅!", "반짝!", "짠!"]}},
	"chiikawa": {"title": false, "fill": "#3a3a3a", "stroke": "#ffffff", "strokeW": 8, "size": 38, "angle": -8, "words": {"default": ["얍!", "했다!", "에잇!"]}},
}

## 캐릭터별 필살기: [효과 글자, 연출 이름, 인자…] (연출은 아래 play 의 match)
const SIGNATURES := {
	# 원피스
	"luffy": ["고무고무 총!!", "rubberArm"],
	"zoro": ["삼도류!!", "slashes", [[-0.6, 70], [0.1, 80], [0.8, 70]], 0x7ddc7d, 9],
	"sanji": ["불꽃 킥!!", "sanji"],
	"nami": ["썬더 볼트!!", "skyBolt", 0xffe066],
	"usopp": ["필살 새총!!", "burst", "star", [0xffd54f, 0xff8a65], 9, 60],
	"chopper": ["럼블!!", "burst", "heart", [0xff7aa2, 0xffffff], 10, 70],
	"robin": ["꽃 피어라!!", "burst", "dot", [0xb388ff, 0xe1bee7, 0x7e57c2], 16, 75],
	"franky": ["래디컬 빔!!", "beam", 0x4fc3f7, 18, 260],
	"brook": ["요호호!!", "brook"],
	"jinbe": ["어인 가라테!!", "rings", 0x4fa3e0, 4, 110, 8],
	"ace": ["화권!!", "ace"],
	"shanks": ["패기!!", "shanks"],
	"law": ["ROOM!!", "law"],
	# 마블 · DC
	"iron-man": ["ZAP!", "beam", 0x9be7ff, 16, 260],
	"war-machine": ["BRRRT!", "burst", "dot", [0xffc107, 0xff6d00], 12, 60],
	"thor": ["KRAKOOM!", "skyBolt", 0x9be7ff],
	"storm": ["KRAKOOM!", "skyBolt", 0xe3f2fd],
	"hulk": ["SMASH!!", "groundCrack"],
	"the-thing": ["CLOBBER!", "groundCrack"],
	"captain-america": ["CLANG!", "cap"],
	"superman": ["FWOOSH!", "superman"],
	"batman": ["POW!", "batman"],
	"flash": ["ZOOM!", "flash"],
	"wonder-woman": ["POW!", "rings", 0xf2c14e, 2, 60, 5],
	"doctor-strange": ["MAGIC!", "strange"],
	"black-panther": ["SLASH!", "slashes", [[1.0, 50], [1.1, 55], [1.2, 50]], 0xb388ff, 6],
	"wolverine": ["SNIKT!", "slashes", [[0.9, 60], [1.0, 64], [1.1, 60]], 0xe0e0e0, 6],
	"groot": ["그루트!", "burst", "dot", [0x7cb342, 0x558b2f, 0x8d6e63], 12, 70],
	"venom": ["WE ARE!", "burst", "dot", [0x111111, 0x333333], 14, 80],
	"spider-man": ["THWIP!", "webNet"],
	# 오리지널
	"dino-dodo": ["공룡 쿵쿵!", "groundCrack"],
	"cosmo-kong": ["우주 슝!", "burst", "star", [0xffffff, 0xff8a3d, 0x8fb8de], 12, 80],
	"chef-pangpang": ["프라이팬 팡!", "chef"],
	"beepo": ["삐뽀 빔!", "beepo"],
	"strawberry-ppyong": ["딸기 뿅!", "burst", "heart", [0xe8344a, 0xff9ec4], 10, 65],
	"suri-suri": ["수리수리!", "suri"],
	"mungge": ["몽글 번쩍!", "skyBolt", 0xffd23f],
	"leo": ["어흥!", "slashes", [[0.9, 46], [1.05, 50], [1.2, 46]], 0xd9822b, 6],
	# 산리오 · 치이카와
	"hello-kitty": ["안녕!", "burst", "heart", [0xe53935, 0xff8a80], 10, 70],
	"my-melody": ["뿅!", "burst", "heart", [0xff9ec7, 0xffffff], 10, 70],
	"kuromi": ["흥!", "burst", "heart", [0x9c27b0, 0x222222], 10, 70],
	"cinnamoroll": ["휘잉~", "burst", "star", [0x8fd3ff, 0xffffff], 10, 70],
	"usagi": ["야하!!", "burst", "star", [0xf6e7b0, 0xffb3c1], 10, 80],
	"chiikawa": ["해냈다!", "burst", "star", [0xffb3c1, 0xffffff], 9, 60],
	"hachiware": ["얏호!", "burst", "star", [0x8fa9c4, 0xffffff], 9, 60],
}

## 팀(능력 종류) 기본 연출
const FAMILY_HIT := {
	"spider": ["burst", "dot", [0xffffff], 8, 45],
	"armor": ["beam", 0x9be7ff, 10, 220],
	"shield": ["rings", 0x4cc9f0, 2, 60, 6],
	"thunder": ["skyBolt", 0xffe066],
	"giant": ["groundCrack"],
	"archer": ["burst", "dot", [0xc77dff, 0xffffff], 8, 50],
	"mystic": ["rings", 0xff9f1c, 3, 70, 5],
	"panther": ["slashes", [[0.9, 50], [1.05, 54], [1.2, 50]], 0xb388ff, 5],
}


static func franchise_fx(hero: Dictionary) -> Dictionary:
	return FRANCHISE.get(str(hero.get("franchise", "comic")), FRANCHISE.comic)


## 이 히어로의 효과 글자: {word: 필살기 이름(없으면 ""), words: 짧은 효과 글자 목록}
static func words_of(hero: Dictionary) -> Dictionary:
	var fx := franchise_fx(hero)
	var w: Dictionary = fx.words
	var sig: Array = SIGNATURES.get(hero.id, [])
	return {"word": sig[0] if not sig.is_empty() else "", "words": w.get(hero.family, w.get("default", ["POW!"]))}


## 맞는 순간의 캐릭터 연출 (s = RoundBase, from = 히어로 손)
static func play(s: Node, hero: Dictionary, x: float, y: float, from: Vector2) -> void:
	var sig: Array = SIGNATURES.get(hero.id, [])
	var spec: Array
	if not sig.is_empty():
		spec = sig.slice(1)
	else:
		var fr := str(hero.get("franchise", "comic"))
		var look: Dictionary = hero.get("look", {})
		if fr == "sanrio":
			spec = ["burst", "heart", [Color(str(look.get("accent", "#ff6fa8"))), 0xffffff], 10, 70]
		elif fr == "chiikawa":
			spec = ["burst", "star", [0xffb3c1, 0xffffff], 9, 60]
		else:
			spec = FAMILY_HIT.get(hero.family, FAMILY_HIT.spider)
	_run(s, spec, x, y, from, hero.get("look", {}))


static func _run(s: Node, spec: Array, x: float, y: float, from: Vector2, look: Dictionary) -> void:
	match str(spec[0]):
		"burst":
			burst(s, x, y, spec[1], spec[2], spec[3], spec[4])
		"rings":
			rings(s, x, y, spec[1], spec[2], spec[3], spec[4])
		"slashes":
			slashes(s, x, y, spec[1], spec[2], spec[3])
		"beam":
			beam(s, from, x, y, spec[1], spec[2], spec[3])
		"skyBolt":
			sky_bolt(s, x, y, spec[1])
		"groundCrack":
			ground_crack(s, x, y)
		"rubberArm":
			rubber_arm(s, from, x, y, Color(str(look.get("skin", "#f3c99a"))))
		"sanji":
			burst(s, x, y, "dot", [0xff7a1a, 0xffc94a, 0xff3b1a], 14, 80)
			rings(s, x, y, 0xff8a1a, 2, 70, 7)
		"brook":
			slashes(s, x, y, [[0.3, 85]], 0x9be7ff, 7)
			burst(s, x, y, "star", [0xe3f2fd], 8, 55)
		"ace":
			beam(s, from, x, y, 0xff6d00, 22, 300)
			burst(s, x, y, "dot", [0xff6d00, 0xffc107, 0xff3d00], 16, 90)
		"shanks":
			rings(s, x, y, 0x8b0000, 3, 140, 10)
			s.flash_screen(Color(1, 0.24, 0.24), 0.35)
		"law":
			Gfx.flash(s, 520, func(g: Gfx, t: float) -> void:
				var r := 120.0 * minf(1.0, t * 3.0)
				g.fill_style(0x4fc3f7, 0.18 * (1.0 - t))
				g.fill_circle(x, y, r)
				g.line_style(3, 0x4fc3f7, 1.0 - t)
				g.stroke_circle(x, y, r), FX_Z)
			slashes(s, x, y, [[0.0, 90]], 0xffffff, 5)
		"cap":
			rings(s, x, y, 0x1e40af, 2, 70, 7)
			burst(s, x, y, "star", [0xffffff, 0xc1121f], 8, 60)
		"superman":
			beam(s, from + Vector2(-6, -34), x, y, 0xff1744, 7, 300)
			beam(s, from + Vector2(6, -34), x, y, 0xff1744, 7, 300)
		"batman":
			Gfx.flash(s, 420, func(g: Gfx, t: float) -> void: _bat(g, x, y - 20 * t, 1.2 + t, 1.0 - t), FX_Z)
		"flash":
			Gfx.flash(s, 260, func(g: Gfx, t: float) -> void:
				g.line_style(4, 0xffd600, 1.0 - t)
				for i in range(-3, 4):
					g.line_between(from.x, from.y + i * 8, x, y + i * 4), FX_Z)
		"strange":
			Gfx.flash(s, 520, func(g: Gfx, t: float) -> void:
				g.line_style(4, 0xff9f1c, 1.0 - t)
				g.stroke_circle(x, y, 50)
				g.stroke_circle(x, y, 34)
				for i in 8:
					var a := t * 3.0 + i * PI / 4.0
					g.line_between(x + cos(a) * 34, y + sin(a) * 34, x + cos(a) * 50, y + sin(a) * 50), FX_Z)
		"webNet":
			Gfx.flash(s, 420, func(g: Gfx, t: float) -> void:
				g.line_style(3, 0xffffff, 1.0 - t)
				for i in 8:
					var a := i * PI / 4.0
					g.line_between(x, y, x + cos(a) * 45, y + sin(a) * 45)
				for r in [15, 30, 45]:
					g.stroke_circle(x, y, r), FX_Z)
		"chef":
			rings(s, x, y, 0xffe066, 2, 60, 6)
			burst(s, x, y, "dot", [0xffe066, 0xffffff], 8, 50)
		"beepo":
			beam(s, from, x, y, 0x5ad1c8, 12, 260)
			burst(s, x, y, "heart", [0xff5c8a], 6, 45)
		"suri":
			burst(s, x, y, "star", [0xffd54f, 0xb9a6ff], 12, 80)
			rings(s, x, y, 0xb9a6ff, 2, 55, 5)


# ---------- 그리기 도우미 (모두 잠깐 보였다 사라짐) ----------

static func _heart(g: Gfx, x: float, y: float, r: float, c: Variant, a: float) -> void:
	g.fill_style(c, a)
	g.fill_circle(x - r * 0.5, y - r * 0.2, r * 0.55)
	g.fill_circle(x + r * 0.5, y - r * 0.2, r * 0.55)
	g.fill_triangle(x - r * 1.02, y + r * 0.05, x + r * 1.02, y + r * 0.05, x, y + r * 1.05)


static func _star(g: Gfx, x: float, y: float, r: float, c: Variant, a: float) -> void:
	var pts := PackedVector2Array()
	for i in 10:
		var ang := -PI / 2 + i * PI / 5
		var rr := r * 0.45 if i % 2 else r
		pts.append(Vector2(x + cos(ang) * rr, y + sin(ang) * rr))
	g.fill_style(c, a)
	g.fill_points(pts)


## 사방으로 튀는 작은 모양들 (하트 · 별 · 점)
static func burst(s: Node, x: float, y: float, shape: String, colors: Array, n: int = 10, dist: float = 70) -> void:
	var parts := []
	for i in n:
		parts.append({"a": float(i) / n * TAU + randf_range(-0.3, 0.3), "d": dist * randf_range(0.6, 1.1), "c": colors[i % colors.size()], "r": randf_range(6, 11)})
	Gfx.flash(s, 520, func(g: Gfx, t: float) -> void:
		for p in parts:
			var px: float = x + cos(p.a) * p.d * t
			var py: float = y + sin(p.a) * p.d * t - 30 * t * (1 - t)
			var al := 1.0 - t
			if shape == "heart":
				_heart(g, px, py, p.r, p.c, al)
			elif shape == "star":
				_star(g, px, py, p.r, p.c, al)
			else:
				g.fill_style(p.c, al)
				g.fill_circle(px, py, p.r * (1.0 - t * 0.5)), FX_Z)


## 퍼지는 고리 여러 겹 (충격파 · 물결)
static func rings(s: Node, x: float, y: float, color: Variant, count: int = 3, max_r: float = 90, width: float = 6) -> void:
	Gfx.flash(s, 480, func(g: Gfx, t: float) -> void:
		for i in count:
			var tt := maxf(0.0, t - i * 0.12)
			if tt <= 0.0:
				continue
			g.line_style(width * (1.0 - tt), color, 1.0 - tt)
			g.stroke_circle(x, y, max_r * tt), FX_Z)


## 베기 궤적
static func slashes(s: Node, x: float, y: float, list: Array, color: Variant, width: float = 8) -> void:
	Gfx.flash(s, 360, func(g: Gfx, t: float) -> void:
		for it in list:
			var ang: float = it[0]
			var length: float = it[1]
			var cut := minf(1.0, t * 2.2)
			var fade := 1.0 if t < 0.5 else 1.0 - (t - 0.5) * 2.0
			var d := Vector2(cos(ang), sin(ang)) * length
			var a := Vector2(x, y) - d
			var b := a + d * 2.0 * cut
			g.line_style(width * fade, color, fade)
			g.line_between(a.x, a.y, b.x, b.y)
			g.line_style(width * 0.35 * fade, 0xffffff, fade)
			g.line_between(a.x, a.y, b.x, b.y), FX_Z)


## 손에서 목표까지 굵은 빔
static func beam(s: Node, from: Vector2, x: float, y: float, color: Variant, width: float = 14, ms: float = 260) -> void:
	Gfx.flash(s, ms, func(g: Gfx, t: float) -> void:
		var w := width * (1.0 - t)
		g.line_style(w + 8, color, 0.35 * (1.0 - t))
		g.line_between(from.x, from.y, x, y)
		g.line_style(w, color, 1.0 - t)
		g.line_between(from.x, from.y, x, y)
		g.line_style(w * 0.35, 0xffffff, 1.0 - t)
		g.line_between(from.x, from.y, x, y), FX_Z)


static func _bolt(g: Gfx, x1: float, y1: float, x2: float, y2: float, jitter: float, steps: int) -> void:
	g.move_to(x1, y1)
	for i in range(1, steps):
		var t := float(i) / steps
		g.line_to(x1 + (x2 - x1) * t + randf_range(-jitter, jitter), y1 + (y2 - y1) * t + randf_range(-jitter, jitter))
	g.line_to(x2, y2)
	g.stroke_path()


## 하늘에서 떨어지는 번개
static func sky_bolt(s: Node, x: float, y: float, color: Variant) -> void:
	Gfx.flash(s, 320, func(g: Gfx, t: float) -> void:
		var al := 1.0 if t < 0.3 else 1.0 - (t - 0.3) / 0.7
		g.line_style(9, color, al * 0.5)
		_bolt(g, x + randf_range(-40, 40), 100, x, y, 22, 7)
		g.line_style(4, 0xffffff, al)
		_bolt(g, x + randf_range(-30, 30), 100, x, y, 18, 7), FX_Z)
	s.flash_screen(Color(1, 1, 0.86), 0.35)


## 늘어나는 고무 팔 (루피)
static func rubber_arm(s: Node, from: Vector2, x: float, y: float, skin: Color) -> void:
	Gfx.flash(s, 380, func(g: Gfx, t: float) -> void:
		var reach := t / 0.35 if t < 0.35 else 1.0 - (t - 0.35) / 0.65
		var h := from + (Vector2(x, y) - from) * reach
		g.line_style(13, 0x1a1a1a, 1)
		g.line_between(from.x, from.y, h.x, h.y)
		g.line_style(9, skin, 1)
		g.line_between(from.x, from.y, h.x, h.y)
		g.fill_style(0x1a1a1a, 1)
		g.fill_circle(h.x, h.y, 15)
		g.fill_style(skin, 1)
		g.fill_circle(h.x, h.y, 12)
		g.line_style(2, 0xffffff, 0.8 * (1.0 - t))
		for i in range(-2, 3):
			g.line_between(from.x, from.y + i * 7, h.x - (h.x - from.x) * 0.3, h.y + i * 7), FX_Z)


## 바닥 금 + 큰 흔들림
static func ground_crack(s: Node, x: float, y: float) -> void:
	var ground := minf(y + 60, 600)
	Gfx.flash(s, 600, func(g: Gfx, t: float) -> void:
		g.line_style(5, 0x3e2a1a, 1.0 - t)
		for d in [[-70, 10], [-40, 24], [0, 30], [45, 22], [75, 8]]:
			g.move_to(x, ground)
			g.line_to(x + d[0] * 0.5, ground + d[1] * 0.4)
			g.line_to(x + d[0], ground + d[1])
			g.stroke_path(), FX_Z)
	s.shake(0.26, 0.016)


static func _bat(g: Gfx, x: float, y: float, k: float, a: float) -> void:
	g.fill_style(0x111111, a)
	g.fill_ellipse(x, y, 60 * k, 22 * k)
	g.fill_style(0xffd54f, a)
	g.fill_ellipse(x, y, 52 * k, 16 * k)
	g.fill_style(0x111111, a)
	g.fill_triangle(x - 24 * k, y - 4 * k, x, y + 8 * k, x + 24 * k, y - 4 * k)
	g.fill_triangle(x - 5 * k, y - 9 * k, x - 2 * k, y - 2 * k, x - 8 * k, y - 2 * k)
	g.fill_triangle(x + 5 * k, y - 9 * k, x + 2 * k, y - 2 * k, x + 8 * k, y - 2 * k)

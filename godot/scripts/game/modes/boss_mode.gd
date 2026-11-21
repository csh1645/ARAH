## 👾 보스 배틀 — 웹 판 game/modes/boss-mode.js 를 옮겼다.
## 답 버튼을 고르면 정답은 팀 공격으로 보스 체력 감소(콤보 3부터 크리티컬 2), 오답은 보스가 막고 공격 충전이 빨라진다(하트 그대로).
## 충전이 가득 차면 보스 레이저 → 하트 -1. 보스 체력 8 을 모두 깎으면 즉시 승리.
## 조작: 답 버튼 누르기 · 숫자 1~4
extends RoundBase

const BOSS_X := 600.0
const BOSS_Y := 270.0
const HERO_X := 150.0
const HERO_Y := 440.0
const BTN_Y := 568.0
const BTN_H := 74.0
const HP_Y := 128.0
const CHARGE_Y := 400.0
const BOSS_HP := 8
const CRIT_COMBO := 3
const WRONG_CHARGE := 0.3
const SHOT_MS := 200.0
const BOSSES := [
	{"name": "메가 드론 킹", "body": 0x4a4e69, "plate": 0x22223b, "eye": 0xff3355, "horn": 0x9d4edd},
	{"name": "어둠 로봇", "body": 0x2b2d42, "plate": 0x111827, "eye": 0x00f5d4, "horn": 0xff9f1c},
	{"name": "번개 골렘", "body": 0x5c677d, "plate": 0x33415c, "eye": 0xffd166, "horn": 0x4cc9f0},
]

var boss: Dictionary
var boss_hp := BOSS_HP
var victory := false
var buttons: Array = []
var busy := false
var charge := 0.0
var charge_ms := 13000.0
var shot: Dictionary = {}
var enemy_shot: Dictionary = {}
var _boss_c: Node2D
var _boss_flash: ColorRect
var _boss_bob: Tween
var _hp_gfx: Gfx
var _charge_gfx: Gfx
var _web_gfx: Gfx


func intro_text() -> String:
	return "%s 출동!\n정답으로 %s을 물리쳐요" % [hero.name, boss.name]


func music_name() -> String:
	return "boss"


func finish_message(perfect: bool) -> String:
	if victory:
		return "퍼펙트 보스 격파!" if perfect else "보스 격파!"
	if hearts <= 0:
		return "조금만 더 힘내요!"
	return "보스가 도망갔어요! 다음엔 꼭!"


func create_world() -> void:
	boss = BOSSES.pick_random()
	draw_backdrop({"city": {"baseY": 640, "color": 0x1a1f45, "range": [120, 260]}, "ground": {"y": 500}})
	create_hero(HERO_X, HERO_Y, 1.3)
	start_hero_bob(5)
	_make_boss()
	_hp_gfx = Gfx.new()
	_hp_gfx.z_index = Z_WORLD + 2
	add_child(_hp_gfx)
	_charge_gfx = Gfx.new()
	_charge_gfx.z_index = Z_WORLD + 2
	add_child(_charge_gfx)
	var name_t := Txt.make(str(boss.name), 20, Color.WHITE, 5)
	name_t.position = Vector2(BOSS_X, HP_Y - 22)
	name_t.z_index = Z_WORLD + 2
	add_child(name_t)
	_web_gfx = Gfx.new()
	_web_gfx.z_index = Z_WEB
	add_child(_web_gfx)
	_draw_hp()


## 보스 로봇 (코드로 그린 오리지널 악당)
func _make_boss() -> void:
	var b := boss
	var g := Gfx.new()
	g.fill_style(b.horn, 1)
	g.fill_triangle(-90, -70, -60, -150, -40, -80)
	g.fill_triangle(90, -70, 60, -150, 40, -80)
	g.fill_style(b.body, 1)
	g.fill_rounded_rect(-170, -20, 60, 30, 12)
	g.fill_rounded_rect(110, -20, 60, 30, 12)
	g.fill_style(b.plate, 1)
	g.fill_circle(-175, -5, 22)
	g.fill_circle(175, -5, 22)
	g.fill_style(b.body, 1)
	g.fill_rounded_rect(-115, -100, 230, 190, 40)
	g.fill_style(b.plate, 1)
	g.fill_rounded_rect(-85, -60, 170, 70, 20)
	g.fill_style(0xffffff, 0.12)
	g.fill_rounded_rect(-100, -92, 90, 30, 14)
	g.fill_style(b.eye, 1)
	g.fill_circle(-40, -25, 16)
	g.fill_circle(40, -25, 16)
	g.fill_style(0xffffff, 0.9)
	g.fill_circle(-35, -30, 5)
	g.fill_circle(45, -30, 5)
	g.fill_style(0x0b0b14, 1)
	g.fill_rounded_rect(-55, 30, 110, 30, 8)
	g.line_style(3, b.eye, 0.8)
	for x in range(-40, 41, 20):
		g.line_between(x, 32, x, 58)
	_boss_flash = ColorRect.new()
	_boss_flash.position = Vector2(-120, -105)
	_boss_flash.size = Vector2(240, 200)
	_boss_flash.color = Color(1, 1, 1, 0)
	_boss_flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_boss_c = Node2D.new()
	_boss_c.add_child(g)
	_boss_c.add_child(_boss_flash)
	_boss_c.position = Vector2(BOSS_X, BOSS_Y)
	_boss_c.z_index = Z_WORLD
	add_child(_boss_c)
	_boss_bob = tween_yoyo(_boss_c, {"position:y": BOSS_Y - 10}, 1200)


func _draw_hp() -> void:
	var g := _hp_gfx
	g.clear()
	var w := 320.0
	g.fill_style(0x000000, 0.6)
	g.fill_rounded_rect(BOSS_X - w / 2 - 3, HP_Y - 3, w + 6, 22, 8)
	var frac := maxf(0.0, float(boss_hp) / BOSS_HP)
	g.fill_style(0x06d6a0 if frac > 0.5 else (0xffd166 if frac > 0.25 else 0xff3355), 1)
	if frac > 0:
		g.fill_rounded_rect(BOSS_X - w / 2, HP_Y, w * frac, 16, 6)


func _draw_charge() -> void:
	var g := _charge_gfx
	g.clear()
	if not wave_active:
		return
	var w := 240.0
	g.fill_style(0x000000, 0.55)
	g.fill_rounded_rect(BOSS_X - w / 2 - 2, CHARGE_Y - 2, w + 4, 14, 6)
	g.fill_style(0xff3355, 0.4 + 0.6 * charge)
	if charge > 0.01:
		g.fill_rounded_rect(BOSS_X - w / 2, CHARGE_Y, w * minf(1.0, charge), 10, 5)


# ---------- 답 버튼 ----------

func start_wave(nq: Dictionary) -> void:
	var n: int = nq.choices.size()
	var bw := minf(200.0, (W - 60 - (n - 1) * 16) / n)
	var x0 := W / 2 - ((n - 1) * (bw + 16)) / 2
	buttons = []
	for i in n:
		var label := str(nq.choices[i])
		buttons.append(_make_button(label, label == str(nq.answer), x0 + i * (bw + 16), bw, i, nq.get("pictureChoices", false)))
	var decoy := decoy_index(nq)
	if decoy >= 0:
		_disable_button(buttons[decoy])
	charge_ms = time_limit_ms(level_value("bossChargeSecByLevel"))
	charge = 0
	busy = false


func _make_button(label: String, is_correct: bool, x: float, w: float, i: int, picture: bool) -> Dictionary:
	var g := Gfx.new()
	g.fill_style(0x1d2d5c, 1)
	g.fill_rounded_rect(-w / 2, -BTN_H / 2, w, BTN_H, 16)
	g.line_style(3, shot_color, 0.9)
	g.stroke_rounded_rect(-w / 2, -BTN_H / 2, w, BTN_H, 16)
	var size := 40 if picture else (22 if label.length() > 8 else (28 if label.length() > 5 else 34))
	var t := Txt.make(label, size, Color.WHITE)
	t.position = Vector2(0, 2)
	if t.box.x > w - 10:
		t.fit(size, w - 10, 14)
	var num := Txt.make(str(i + 1), 14, Color("#8d99ae"), 0, Color.BLACK, Vector2(0, 0))
	num.position = Vector2(-w / 2 + 10, -BTN_H / 2 + 5)
	var c := Node2D.new()
	for n in [g, t, num]:
		c.add_child(n)
	c.position = Vector2(x, BTN_Y)
	c.z_index = Z_WORLD + 3
	c.scale = Vector2(0.6, 0.6)
	c.modulate.a = 0
	add_child(c)
	tween_to(c, {"scale": Vector2.ONE, "modulate:a": 1.0}, 220, "back_out", i * 50.0)
	return {"c": c, "g": g, "t": t, "w": w, "isCorrect": is_correct, "used": false}


func _disable_button(btn: Dictionary) -> void:
	btn.used = true
	btn.c.modulate.a = 0.35


func clear_wave() -> void:
	for b in buttons:
		var c: Node2D = b.c
		var tw := c.create_tween()
		tw.tween_interval(0.3)
		tw.set_parallel(true)
		tw.tween_property(c, "modulate:a", 0.0, 0.2)
		tw.tween_property(c, "scale", Vector2(0.7, 0.7), 0.2)
		tw.chain().tween_callback(c.queue_free)
	buttons = []
	_draw_charge()


func on_pointer(pos: Vector2) -> void:
	for b in buttons:
		if absf(pos.x - b.c.position.x) <= b.w / 2 and absf(pos.y - b.c.position.y) <= BTN_H / 2:
			choose(b)
			return


func on_key(keycode: int, _u: int) -> void:
	var n := keycode - KEY_0
	if n >= 1 and n <= buttons.size():
		choose(buttons[n - 1])


# ---------- 전투 ----------

func choose(btn: Dictionary) -> void:
	if not wave_active or busy or btn.is_empty() or btn.used:
		return
	if btn.isCorrect:
		_strike(btn)
	else:
		_blocked(btn)


## 정답: 팀 공격 → 보스 체력 감소 (콤보가 높으면 크리티컬)
func _strike(btn: Dictionary) -> void:
	busy = true
	btn.t.color = Color("#06d6a0")
	var pts := award_correct(Vector2(BOSS_X, BOSS_Y))
	var crit := combo >= CRIT_COMBO
	var dmg := 2 if crit else 1
	if q.has("speak"):
		Voice.speak(str(q.speak))
	_deliver_attack(func() -> void:
		Sfx.play("hit")
		attack_hit(BOSS_X, BOSS_Y)
		boss_hp = maxi(0, boss_hp - dmg)
		_draw_hp()
		_boss_flash.color.a = 0.7
		var fl := _boss_flash.create_tween()
		fl.tween_property(_boss_flash, "color:a", 0.0, 0.25)
		var sh := _boss_c.create_tween()
		for i in 4:
			sh.tween_property(_boss_c, "position:x", BOSS_X + 12, 0.05)
			sh.tween_property(_boss_c, "position:x", BOSS_X, 0.05)
		popup(BOSS_X, BOSS_Y - 120, ("크리티컬! -%d  (+%d)" if crit else "-%d  (+%d)") % [dmg, pts], Color("#ff9f1c") if crit else Color("#06d6a0"))
		if boss_hp <= 0:
			_defeat_boss()
		else:
			end_wave(650))


## 팀 공격 스타일대로 전달: 투사체 / 방패(돌아옴) / 근접(직접 뛰어들어 때림)
func _deliver_attack(on_impact: Callable) -> void:
	if is_melee():
		melee_to(Vector2(BOSS_X - 170, BOSS_Y + 30), on_impact, {"land": Vector2(HERO_X, HERO_Y)})
		return
	hero_shoot()
	var start := hand()
	var target := Vector2(BOSS_X, BOSS_Y)
	shot = {"to": start}
	var dur := SHOT_MS / (float(ab.get("webSpeed", 1.0)) * float(attack_style.speed))
	tween_t(dur, func(t: float) -> void: shot.to = start.lerp(target, t), "linear", func() -> void:
		on_impact.call()
		if not attack_style.get("returns", false):
			shot = {}
			return
		var h := hand()
		tween_t(260, func(t: float) -> void: shot.to = target.lerp(h, t), "quad_in", func() -> void: shot = {}))


## 오답: 보스가 막고 충전이 빨라진다 (하트는 그대로)
func _blocked(btn: Dictionary) -> void:
	_disable_button(btn)
	btn.t.color = Color("#ff5c5c")
	penalize(false)
	charge = minf(0.99, charge + WRONG_CHARGE)
	popup(BOSS_X, BOSS_Y - 120, "막았다! 다른 답을 골라요", Color("#ff5c5c"))


## 충전이 가득 참: 보스 레이저 → 하트 -1, 정답 알려 주고 다음 문제
func _boss_attack() -> void:
	busy = true
	Sfx.play("bossAttack")
	penalize(true)
	for b in buttons:
		if b.isCorrect:
			b.t.color = Color("#ffd166")
	enemy_shot = {"from": Vector2(BOSS_X, BOSS_Y), "to": player.position}
	after(350, func() -> void: enemy_shot = {})
	var tw := player.create_tween()
	for i in 3:
		tw.tween_property(player, "position:x", HERO_X - 20, 0.08)
		tw.tween_property(player, "position:x", HERO_X, 0.08)
	popup(player.position.x + 40, HERO_Y - 110, "보스의 공격! 정답은 %s" % q.answer, Color("#ffd166"))
	end_wave(1500)


func _defeat_boss() -> void:
	victory = true
	for i in 4:
		after(i * 160.0, func() -> void: spark_burst(BOSS_X + randf_range(-90, 90), BOSS_Y + randf_range(-70, 70), 30))
	_boss_bob.kill()
	var tw := _boss_c.create_tween()
	tw.tween_interval(0.3)
	tw.set_parallel(true)
	tw.tween_property(_boss_c, "rotation_degrees", 25.0, 0.9)
	tw.tween_property(_boss_c, "modulate:a", 0.0, 0.9)
	tw.tween_property(_boss_c, "position:y", BOSS_Y + 60, 0.9)
	tw.tween_property(_boss_c, "scale", Vector2(0.7, 0.7), 0.9)
	flash_screen(Color.WHITE, 0.6)
	total_questions = q_index # 이긴 즉시 판을 끝낸다
	update_hud()
	end_wave(900)


func tick(delta: float) -> void:
	if ended:
		return
	if wave_active and not busy:
		charge += delta * 1000.0 / charge_ms
		if charge >= 1.0:
			_boss_attack()
	_draw_charge()
	_web_gfx.clear()
	if not shot.is_empty():
		draw_attack(_web_gfx, hand(), shot.to)
	if not enemy_shot.is_empty():
		_web_gfx.line_style(10, 0xff3355, 0.35)
		_web_gfx.line_between(enemy_shot.from.x, enemy_shot.from.y, enemy_shot.to.x, enemy_shot.to.y)
		_web_gfx.line_style(4, 0xffb3c1, 1)
		_web_gfx.line_between(enemy_shot.from.x, enemy_shot.from.y, enemy_shot.to.x, enemy_shot.to.y)


## 자동 플레이 (검증용): 정답 버튼을 누른다
func auto_step() -> void:
	if not wave_active or busy:
		return
	for b in buttons:
		if b.isCorrect and not b.used:
			choose(b)
			return


func test_state() -> Dictionary:
	return {"bossHp": boss_hp, "victory": victory}


func auto_wrong() -> bool:
	if busy:
		return false
	for b in buttons:
		if not b.isCorrect and not b.used:
			choose(b)
			return true
	return false

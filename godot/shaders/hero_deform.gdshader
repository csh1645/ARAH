// 히어로 몸 흔들기 (2D 관절 애니메이션의 2차 움직임). 관절 동작 프레임 위에 머리 끄덕임 · 기울임과 몸 눌림을 덧입힌다.
// 히어로 그림은 머리와 몸이 한 장이라, 목 위쪽을 부드럽게 나눠(smoothstep) 목을 중심으로 돌린다 (그림을 다시 그리지 않는 방식).
// region: 아틀라스 안 지금 프레임 영역 (UV), neck: 프레임 안 목 높이 (0 위 ~ 1 아래)
shader_type canvas_item;

uniform vec4 region = vec4(0.0, 0.0, 1.0, 1.0);
uniform float neck = 0.42;
uniform float head_angle = 0.0; // 라디안, + = 앞으로 끄덕
uniform vec2 head_offset = vec2(0.0); // 프레임 비율, 머리만 옮김
uniform float squash = 0.0; // + = 납작하게(눌림), - = 길쭉하게 (발 밑 기준)

const vec2 ASPECT = vec2(1.0, 1.125); // 프레임 가로:세로 = 96:108

void fragment() {
	vec2 local = (UV - region.xy) / region.zw;
	// 몸 눌림 (발 밑 0.95 를 기준으로 거꾸로 펼쳐 표본 위치를 구한다)
	vec2 q = local;
	q.x = 0.5 + (q.x - 0.5) / (1.0 + squash * 0.6);
	q.y = 0.95 + (q.y - 0.95) / (1.0 - squash);
	// 머리: 목 위쪽만 돌리고 옮긴다 (경계는 부드럽게)
	float w = smoothstep(neck + 0.08, neck - 0.04, q.y);
	vec2 pivot = vec2(0.5, neck);
	vec2 p = (q - pivot) * ASPECT;
	float a = -head_angle * w;
	p = mat2(vec2(cos(a), sin(a)), vec2(-sin(a), cos(a))) * p;
	q = p / ASPECT + pivot - head_offset * w;
	if (q.x < 0.002 || q.x > 0.998 || q.y < 0.002 || q.y > 0.998) {
		COLOR = vec4(0.0);
	} else {
		COLOR = texture(TEXTURE, region.xy + q * region.zw) * COLOR;
	}
}

# WGSL 컴파일의 내부

> 대상 API: 5 · 대상 빌드: `ab90qa` · 상태: Analyzed (라이브 번들에서 복원)

두 번째 검증 단계 — 브라우저의 WGSL 컴파일러를 통한 진짜 컴파일 — 과 v5 의 검증 스텁.

## 두 단계인 이유

정적 검증의 형 검사는 불완전하므로, 어떤 실수는 여기서만 드러난다 (예: `mixing '*' and '^' requires parenthesis` 같은 WGSL 연산자 우선순위 요건). 오류는 게임 안에 베리언트명과 함께 나타난다 ([컴파일 오류](../troubleshooting/compilation.md)).

## 검증 스텁 생성

엔진은 정적 검증을 통과한 코드에 스텁을 합성한다 (모듈 29866 에서 복원):

- 형 스텁 표:

| 형 | 스텁값 |
|---|---|
| `bool` | `p.x > 0.0` |
| `f32` | `p.x` |
| `vec2f` | `p.xy` |
| `vec3f` | `p.xyz` |
| `vec4f` | `p` |
| `i32` / `vec2i` / `vec3i` / `vec4i` | `i32(p.x)` 등 |
| `u32` / `vec2u` / `vec3u` / `vec4u` | `u32(p.x)` 등 |

- 구조체는 재귀적으로 구축 — 각 필드를 스텁값으로 채운다 (중첩 구조체는 재귀)
- 합성되는 엔트리 포인트:

```wgsl
var<private> bloxdValidationP: vec4f;

fn <special fn>(<params>) -> <returns> {
    let p = bloxdValidationP;
    return <stub value>;
}

@vertex
fn bloxdValidateVertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    let p = vec4f(f32(i));
    let o = <vertexHook>(BloxdVertexIn(<stubs>));
    return vec4f(o.position, 1.0);
}

@fragment
fn bloxdValidateFragment(@builtin(position) p: vec4f) -> @location(0) vec4f {
    bloxdValidationP = p;
    let s = <surfaceHook or bloxdDefaultSurface>(BloxdSurfaceIn(<stubs>));
    let o = <lightHook or bloxdDefaultLight>(s, BloxdLightIn(<stubs>));
    return vec4f(o.colour, 1.0);
}
```

검증은 문자 그대로 「스텁 입력으로 당신의 훅을 부르는 WGSL」을 브라우저에서 컴파일해, 구문·형·언어 기능 위반을 드러낸다.

## 오류 메시지 이름 복원

훅 호출을 접합할 때 엔진은 식별자 대응 (`originalNames`) 을 유지한다. 브라우저 오류 속의 식별자는 **당신의 원래 이름으로 되돌려** 매핑되고, `sourceOf(lineNum)` 이 접합된 행 번호를 (파일, 행) 으로 되돌린다 — 오류는 변환된 텍스트가 아니라 당신의 코드 기준으로 읽는다.

## 참가 시점의 런타임 재검증

`checkCompilation` 은 게임 참가마다 돌며, 실제로 모든 기존 지형 머티리얼을 컴파일한다 (설정 화면 검사보다 엄격). 실패하면 그 게임에서 팩이 떨어진다. 이 검사에는 60초 강제 타임아웃이 있다 ([퍼포먼스](../troubleshooting/performance.md)).

## 관련 문서

- [컴파일 오류](../troubleshooting/compilation.md) · [셰이더 검증의 내부](shader-validation.md) · [시작하기: 검증](../getting-started/validation.md)

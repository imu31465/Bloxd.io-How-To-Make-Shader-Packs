# 셰이더 검증의 내부

> 대상 API: 5 · 대상 빌드: `ab90qa` · 상태: Analyzed (라이브 검증기에서 복원)

정적 검증 (분석기, 로드 검사의 1단계). 사용자용 해결책: [검증 오류](../troubleshooting/validation.md).

## 단계들

1. **로더 제한** (zip / pack.json 형태) → [팩 형식](../api/pack-format.md)
2. **정적 검증 (분석기)** — 이 페이지. 구문, 형, 예약명, 6베리언트 전체의 훅 계약
3. **브라우저의 진짜 컴파일** → [WGSL 컴파일](wgsl-compilation.md)
4. **게임 참가 시점의 런타임 재검증** — 실제로 모든 기존 지형 머티리얼을 컴파일한다 (설정 화면 검사보다 엄격). 실패하면 그 게임에서 팩이 떨어진다

## 특수 함수 시그니처 표

검증기는 모듈 29849 에 표를 유지하고, 훅 간 호출 제한을 검사한다:

```js
const Jq = new Map([
  ["bloxdFragmentBlockPosition", { params: "position: vec3f, normal: vec3f", returns: "vec3i", symbol: null, vertex: true }],
  ["bloxdOpaqueBehind", { params: "", returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }],
  ["bloxdTexel", { params: "textureId: u32, uv: vec2f, mipLevel: f32", returns: "vec4f", symbol: null }],
  ["bloxdTextureSize", { params: "mipLevel: f32", returns: "vec2u", symbol: null }],
]);
```

복원된 논리:

- `vertex: true` 가 아닌 특수 함수를 버텍스 훅에서 호출 → *"X reaches Y, which only surface and light hooks can use."*
- `symbol` 이 있는 함수 (`bloxdOpaqueBehind` → `BLOXD_SCENE_DEPTH`) 를, 그 매크로를 정의하지 않는 베리언트에서 도달 → *"X reaches Y, which needs BLOXD_SCENE_DEPTH, and Z doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH."*

주의: `bloxdFragmentBlockPosition` 은 헤더 생성에서 사라졌지만, 이 라이브 표에는 항목이 남아 있다 — 식별자 검사가 참조하는 것이 바로 이 표이므로, 호출은 여전히 검증을 통과한다. 코드 생성기도 정의를 계속 주입하므로 (terrain/liquid 와 양쪽 모델 프로그램), 함수는 실전에서 그대로 호출 가능하다. 사실상 폐기 예정 취급이다: 문서화되지 않았고, 어떤 미래 버전에서든 잘려나갈 수 있다.

## 예약명 진단

- **`/^bloxd/i` 일반 규칙**: *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*
- **텍스처/샘플러 직접 선언**: *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*

## 텍스처명 해석과 진단

`bloxdTextureId*` 해석에는 전용 경로가 있다 ([메시지 목록](../api/texture-api.md#이름-해석-오류-검증기에서-그대로)):

- **접기**: 비영숫자로 분할, CamelCase, `bloxdTextureId` 접두. 역방향 대조는 대소문자/언더스코어 무관
- **철자 제안** (v5 신규): 일치하지 않는 이름에 임계값 `max(2, floor(len/4)) + 1` 의 레벤슈타인 제안
- 프레임 철자와 회전 사본 철자에는 전용 메시지
- 접은 뒤 모호한 이름은 사용 불가

## v5 의 새 진단

- *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."* — 제거된 매크로를 지목한다
- `blockFlags` 를 읽거나 `bloxdBlockFlag*` 를 참조하는 팩은 예약명 진단에 실패한다 — **조용히 오동작하는 팩은 없다**

## Y 도함수 재작성

분석기의 토큰 재작성 패스는 `dpdy` / `dpdyCoarse` / `dpdyFine` 호출 전부를 `(-dpdy(...))` 로 재작성한다 (dpdy 계열이 반전 집합으로 명시 열거되어 있다). `dpdx` 와 `fwidth` 는 손대지 않는다 ([제한과 예약명](../api/restrictions.md#자동-재작성)).

## 헤더·텍스처 상수 생성

- 헤더는 읽기 전용으로 앞에 붙는다 ([엔진 헤더](engine-header.md))
- `bloxdTextureId*` 블록은 참조된 이름에서 **팩마다** 생성된다

## HEADER_VERSION

`HEADER_VERSION` 은 `9.<fnv1a32(header)>.<fnv1a32(텍스처 레지스트리)>` (선두 정수는 v4 에서 8 → 9). 두 fnv1a32 접미사가 헤더 소재와 정렬된 이름-id 레지스트리를 지문화한다. 저장 팩 재검증은 이 지문으로 「재확인 필요」를 판정한다 ([호환성](../api/compatibility.md#저장-팩-재검증-재확인-필요)).

## 검증 스텁

정적 검증을 통과한 코드에는, 브라우저의 진짜 WGSL 검사 전에 스텁 코드가 합성된다: `var<private> bloxdValidationP: vec4f` 와 `bloxdValidateVertex` / `bloxdValidateFragment` — 형 스텁 표 (`bool` → `p.x > 0.0`, `vec3f` → `p.xyz`, …) 가 입력 구조체를 구축해 훅을 부른다. 상세: [WGSL 컴파일](wgsl-compilation.md).

## 관련 문서

- [검증 오류](../troubleshooting/validation.md) · [WGSL 컴파일](wgsl-compilation.md) · [텍스처 레지스트리](texture-registry.md) · [엔진 데이터](engine-data.md)

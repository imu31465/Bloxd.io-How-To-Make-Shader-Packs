# Bloxd.io 셰이더 팩 만드는 법 (완전판)

자급자족형 Bloxd.io 셰이더 팩 (WebGPU 렌더러 전용) 제작·배포 가이드.
`apiVersion: 2` 시점의 사양에 근거한다. 레시피집과 API 레퍼런스를 포함하므로 이 파일 하나로 처음부터 배포까지 가능하다. v1 팩은 현행 게임에서 읽히지 않는다 (v1 `apiVersion` 값·구 식별자는 거부된다). v1에서의 이전은 제8부를 참조.

> 본서는 비공식 가이드이며 개발사의 공식 입장이 아니다. API는 예고 없이 변경될 수 있다.  
> 최종 리뷰: 2026-10-15 (포그 적용 순서·실포그 설정·수중 렌더링 구조를 렌더러 구현과 대조해 업데이트). 공개된 공식 WGSL API 레퍼런스를 확인하지 못했으므로 API 설명과 레시피는 로딩 화면·실기 컴파일로 계속 검증할 것.  
> 셰이더 팩 기능 자체는 게임 내 UI에서 불러올 수 있는 공식 기능이며, 팩은 순수 WGSL  
> (JS 실행·통신 불가)이므로 일반적인 코드로는 위험한 일이 일어나지 않는다.  
> 본 가이드는 AI의 도움을 받아 작성되었으며 내용의 정확성은 보장되지 않는다. 실제 게임 동작으로 확인할 것.

## 목차

- [제1부: 팩 만들기](#제1부-팩-만들기)
- [제2부: API 레퍼런스](#제2부-api-레퍼런스)
- [제3부: 레시피집](recipes.md)
- [제4부: 리얼화 가이드](#제4부-리얼화-가이드)
- [제5부: 트러블슈팅·주의](#제5부-트러블슈팅주의)
- [제6부: 구현 시 중요한 보충](#제6부-구현-시-중요한-보충)
- [제7부: 내부 사양의 보충](#제7부-내부-사양의-보충)
- [제8부: API Version 2 마이그레이션 가이드](#제8부-api-version-2-마이그레이션-가이드)

---

# 제1부: 팩 만들기

## 1. 개요와 전제

- 셰이더 팩은 **WebGPU 렌더러 전용**이다. 팩을 도입한 동안 설정의 WebGPU 렌더러가 강제 온이 된다
- 팩은 **WGSL의 제한된 서브셋**으로 기술한다. 대상은 **지형 (terrain) 과 액체 (liquid)** 의 겉모습뿐이다
- 할 수 있는 것: 색·투명도·발광 변경, 조명 재구축, 투영풍의 그림자 (R9.12), (일부 게임 한정으로) 정점 이동
- 할 수 없는 것: 텍스처 추가·샘플링, 포스트프로세스 (블룸 등), 태양과 함께 도는 픽셀 정밀도의 그림자 (섀도맵) 와 진짜 반사 (SSR) 의 신설, 하늘이나 엔티티에 적용
- 할 수 있는데 (간과하기 쉬운) 것: **`skyLight` (복셀 하늘 가림) 를 사용한 투영풍의 그림자** — 나무 밑·지붕 밑을 명확히 어둡게 할 수 있다 (R9.12). 블록을 부수면 LightEngine 이 즉시 재계산하므로 그림자도 실시간으로 따라간다
- **대다수의 게임은 strict 모드** (정점 이동·`discard` 금지) 이다. 일반 배포용 팩은 strict 로 동작하게 만들 것

## 2. 최단 순서

1. 폴더를 만들고 `pack.json` 과 `.wgsl` 파일을 둔다
2. 게임 설정 → Shader Pack 에서 zip 또는 폴더를 읽힌다
3. 에러가 나면 고쳐서 다시 읽힌다 (제5부)
4. 대응 게임에서 동작 확인한다
5. 완성되면 zip 으로 굳혀서 배포한다

## 3. 팩의 구성

- **배포 형태**: `.zip` 1개, 또는 폴더 (폴더 읽기는 데스크톱판 브라우저만)
- **내용**: `pack.json` 1개 (팩의 최상위에 배치. 대소문자 구별 없음) + `.wgsl` 파일 1~256개
- 복수의 `.wgsl` 은 연결되어 1 모듈로 취급되므로 분할·디렉터리 나누기는 자유. 파일명에 제약은 없다. `.wgsl` 이외의 파일 (README 등) 은 무시된다
- ZIP 묶기 요령: 전 파일이 공통된 1 계층의 루트 폴더에 들어 있으면 그 prefix 가 자동 제거된다 (macOS 「폴더를 압축」 으로 만든 zip 그대로 OK). 단 루트 계층에 여분의 파일이 섞이면 최상위 판정을 잃으므로, 확실한 건 폴더 안에 들어가서 `pack.json` 과 `.wgsl` 을 직접 지정해 굳히는 것 (`pack.json` 이 ZIP 직하에 오는 것을 확인할 것)

| 항목 | 상한 |
|---|---|
| zip 크기 / 엔트리 수 | 32MB / 1024 |
| pack.json 크기 | 64KB, UTF-8 |
| .wgsl 합계 크기 | 256KB, UTF-8 |
| zip 형식 | zip64·분할·암호화 zip 불가 |

## 4. pack.json

```json
{
  "apiVersion": 2,
  "name": "My Pack",
  "author": "your name"
}
```

| 필드 | 필수 | 설명 |
|---|---|---|
| `apiVersion` | 필수 | `2` 와 완전 일치시킬 것. `1` 팩은 `shaderPack:loadWrongApiVersion` 으로 거부된다 |
| `name` | 필수 | 빈 문자열 불가. 설정 UI 에 표시된다 |
| `author` | 임의 | 생략 가능. 문자열 이외 (수치 등) 는 에러 |

그 외의 필드는 무시된다.

## 5. 최소 템플릿

`pack.json` (4장) 과 아래 `pack.wgsl` 만으로 동작하는 팩이 된다:

```wgsl
// 은은히 따뜻한 최소 팩
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

지킬 작법:

- 출력 구조체는 **직접 구축하지 않는다** (`BloxdSurface(...)` 는 에러). 반드시 `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` 에서 시작해 필드를 고친다. 예외로 light 훅 첫 파라미터 (`s: BloxdSurface`) 는 출력과 동형이므로 `var out = s;` 로 시작해도 된다
- 초기화 없는 `var x: BloxdSurface;` (타입 주석뿐) 도 에러
- 훅의 파라미터는 **읽기 전용**이다. 고치고 싶으면 `var sv = s;` 처럼 복사하고 나서
- 자신의 식별자에 `bloxd_` 접두사는 쓸 수 없다 (6개 훅명 제외)
- 상수는 `const` 로 쓴다 (`#define` 에 값은 쓸 수 없다)

## 6. 6개 훅

전부 임의. 시그니처는 타입까지 정확히 일치시킬 것 (파라미터명은 자유).

| 훅 | 역할 |
|---|---|
| `fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex` | 지형 정점 이동. **strict 에서는 사용 불가** |
| `fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface` | 지형의 색·투명도·발광. `s.colour` 는 텍스처×정점색 |
| `fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight` | 지형의 최종색. **프래그먼트의 최종단**에서 불리며 반환값이 그대로 최종색이 된다 |
| `fn bloxdLiquidVertex / bloxdLiquidSurface / bloxdLiquidLight` (동형) | 액체판. `alpha` 는 액체의 투과율로 작용한다 |

폴백 규칙:

- liquid 훅이 미정의면 **terrain 의 동명 훅이 쓰인다** (역은 없음). surface 만 써도 액체에 같은 효과가 걸린다
- light 훅이 미정의면 기존 동작 (`engineColour + emission × fogVisibility`) 이 쓰인다
- `engineColour` 을 버리고 소재색에서 다시 짜면, 직접 포그를 다시 건다: `mix(l.fogColour, col, l.fogVisibility)`. emission 을 더할 때는 `fogVisibility` 를 곱하고 나서

## 7. 8 베리언트와 가드

쓸 코드는 1개지만 `{strict, allow} × {조명on, 조명off} × {지형, 액체}` 의 **8가지 전부에서 컴파일이 통해야 한다**.
조건 분기에 쓸 수 있는 것은 `#define` (값 없는) / `#ifdef` / `#ifndef` / `#else` / `#endif` 뿐이다. `#` 은 반드시 그 줄의 선두에 둔다 (함수 안에서도 가능).

| 가드 | 의미 | 용도 |
|---|---|---|
| `#ifndef BLOXD_STRICT` | strict 이외 (allow) 에서만 | vertex 훅 전체, `discard` 를 감싼다 |
| `#ifdef BLOXD_LIGHTING` | 조명on 때만 | `blockLight`·`skyLight`·`ambientLightColour` 등을 만지는 코드를 감싼다. **공용 헬퍼 함수 (모듈스코프 fn) 는 함수째 감싼다** (호출측만 가드로는 불충분) |
| `#ifdef BLOXD_ALPHA` | `alpha` 필드가 있을 경우 (액체는 항상·지형은 allow 만) | `alpha` 를 만지는 코드를 감싼다 |

## 8. 쓸 수 있는 언어 기능·금지 사항

쓸 수 있는 것:

- WGSL 의 내장 함수 (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select` 등 전부)
- 자신의 `fn` / `struct` / `const` / `alias` / `var<private>`, 함수 안의 `let`·제어 구문 (if/for/while/switch 등)
- `#ifdef` / `#ifndef` / `#else` / `#endif` / `#define` (플래그명만) — 행두라면 함수 안에서도 가능
- 미분 (`dpdx` / `dpdy` / `fwidth`) 은 surface/light 훅 (프래그먼트단) 에서만 사용 가능. vertex 불가
- `const` 배열·`ptr`·행렬도 사용 가능

금지·주의:

- **텍스처 불가**: `texture_*` / `sampler` 타입은 쓸 수 없다. 질감은 해시 노이즈 등의 절차적 계산으로 만든다
- **`discard` 는 strict 에서 금지** (`#ifndef BLOXD_STRICT` 로 감싼다)
- `@속성` / `enable` / `requires` / `override` 는 금지. `enable f16;` 을 쓸 수 없으므로 **f16계 타입은 사용 불가**
- `@builtin` 속성도 금지이므로 `fragCoord` (화면 좌표) 나 `vertex_index` 를 읽을 수 없다
- **모듈스코프 `let` 은 쓰지 않는다** (`const` 나 `var` 를 쓴다)
- `atomic` 은 쓸 수 없다
- 좌표계는 noa 로컬. 월드 좌표로 하려면 `bloxdOriginOffset()` 을 더한다. 블록 좌표는 `bloxdFaceBlock(position, normal)`

## 9. 검증·동작 확인·배포

읽히면 게임측에서 다음 순서로 검사된다:

1. 로더 제한 체크 (3장의 상한)
2. 정적 컴파일 (8 베리언트 전부)
3. 브라우저 WebGPU 에 의한 실컴파일 검증 (정적 검증은 타입 검사가 완전하지 않으므로 여기서 떨어지는 코드가 있다. 8장의 함정을 피할 것)

순서:

1. 설정 → Shader Pack 에서 zip / 폴더를 읽힌다
2. 스테이터스를 확인한다. 「Ready to use」 가 되면 성공. 「Saved, but it won't run until you fix these errors...」 의 경우는 에러 일람 (file:줄 + 베리언트 표기) 을 고쳐서 재읽기
3. 읽힌 후는 페이지를 새로고침해 유효화한다
4. 먼저 제한이 널널한 게임에서 확인하고, 다음에 strict 게임 (대다수는 이쪽) 에서 확인한다. 정점 이동을 쓰는 경우는 allow 게임에서만 동작한다
5. 완성되면 `pack.json` 을 최상위로 굳혀서 zip 으로 배포한다 (3장의 상한 이내일 것)

# 제2부: API 레퍼런스

## 10. 엔진 헤더 (팩 코드 선두에 자동 부여되는 코드)

아래 코드는 엔진이 자동으로 팩 코드 선두에 삽입하는 것이다 (팩측에서 재선언 불가). `#ifdef` 로 감싸인 부분은 베리언트에 따라 존재가 달라진다.

```wgsl
// Engine-provided and read-only to packs. apiVersion 2.
const bloxdTimeWrap: f32 = 3600.0;   // seconds until time wraps to 0

fn bloxdTime() -> f32;               // seconds. wraps to 0 every 3600 s
fn bloxdOriginOffset() -> vec3i;     // whole blocks. noa-local + this = world coords
fn bloxdEyePosition() -> vec3f;      // camera position (noa-local)
fn bloxdSunDirection() -> vec3f;     // sun direction (unit vector, non-zero only with earth skybox)
fn bloxdWorldPosition(position: vec3f) -> vec3f;  // noa-local -> world coords
fn bloxdFaceBlock(position: vec3f, normal: vec3f) -> vec3i;  // world block coords of this face
fn bloxdApplyFog(colour: vec3f, l: BloxdLightIn) -> vec3f;   // mix(l.fogColour, colour, l.fogVisibility)

struct BloxdVertexIn {
    position: vec3f,   // noa-local world space (world minus bloxdOriginOffset())
    normal: vec3f,
    blockId: u32,      // owning block id (flat-interpolated, uniform across the face)
}

#ifndef BLOXD_STRICT
struct BloxdVertex {
    position: vec3f,     // noa-local
}
#endif

struct BloxdSurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    blockId: u32,        // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdSurface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct BloxdLightIn {
    litColour: vec3f,          // engine lighting result (before emission and fog)
    engineColour: vec3f,       // post-fog = bloxdApplyFog(litColour, l). excludes emission
    directional: f32,          // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,            // the material's ambient times the scene's
    blockLight: vec3f,         // voxel block light, tone-mapped (all variants; 0 when unlit)
    skyLight: f32,             // voxel sky light, tone-mapped (all variants; 1 when unlit)
    ambientLightColour: vec3f, // present in all variants (white when unlit)
    skyLightColour: vec3f,     // present in all variants (white when unlit)
    heldLight: vec3f,          // held light here (all variants; 0 when unlit/out of range)
    fogColour: vec3f,
    fogVisibility: f32,        // 1 = no fog, 0 = fully fogged (renamed from v1 fogFactor)
    position: vec3f,           // as in BloxdSurfaceIn
    normal: vec3f,
    blockId: u32,              // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdLight {
    colour: vec3f,
}

// liquid variants, surface / light hooks only
struct BloxdOpaqueBehind {
    found: bool,       // false when no opaque face behind (sky)
    position: vec3f,   // opaque face position behind (noa-local)
    distance: f32,     // distance from the eye
}
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind;

#ifndef BLOXD_STRICT
fn bloxdDefaultVertex(v: BloxdVertexIn) -> BloxdVertex;
#endif

fn bloxdDefaultSurface(s: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdDefaultLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight;
```

해석 포인트:

- `bloxdTime()` 은 3600초에 감기는 경과 시간 (`bloxdTimeWrap`)이다. 게임 안의 낮밤 시계와 동기된다는 보장은 없다. bind group의 stage 가시성이 VERTEX|FRAGMENT이므로 **vertex 훅에서도 호출할 수 있다**
- `bloxdSunDirection()` 은 태양이 있을 때의 단위 벡터이며, 태양 없는 하늘에서는 제로이다. **달은 항상 `-bloxdSunDirection()` 에 있다** (엔진이 달의 위치를 태양의 정반대로 계산하기 때문). 단 기존 월드에서는 태양이 정지해 있으므로 달도 정지해 있으며, 움직이는 달이 의미 있는 것은 낮밤 사이클을 구현한 월드뿐이다 (제7부 24절)
- ※보충: 종래 「제로일 때 달의 방향으로 재사용할 수 없다」 고 썼지만, 방향 자체는 `-bloxdSunDirection()` 으로 얻을 수 있다. 외부 배포용 팩은 제로를 전제로 `sunPresent` 로 분기하는 쓰기가 안전하다 (파란 환경광 유사 표현은 R2, 방향성 달빛은 제7부 R-A 참조)
- `emission` 은 조명 계산 후에 가산되고, **`fogVisibility` 로 감쇠된다** (defaultLight 구현 `engineColour + emission × fogVisibility`. 완전히 안개에 잠긴 원경에서는 발광도 사라진다)
- **포그 적용 순서**: 프래그먼트 안의 처리 순서는 ① 조명·발광 합성 → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ light 훅 호출 → ⑤ return. 따라서 **engineColour 는 포그된 상태로 도착하며**, **light 훅 반환값이 그대로 최종색** (훅 뒤에 포그는 다시 걸리지 않는다)
- **fogVisibility 의 정의원**: 뷰 공간 거리 (정점 단위로 계산·보간). linear 모드에서는 `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **fogMode == 0 일 때**: `fogColour` 에는 `vec3f(0.0)` (흑) 이 전달된다. fogColour 색감으로 시간대를 추정하는 코드는 주의
- **현행 빌드의 실포그 설정**: **linear 고정**. `fogStart` = 그리기 청크 거리, `fogEnd` = +1 청크 (지평선만). 포그 끄기 설정에서는 100 / 101 청크로 설정되어 사실상 무효. 기본 포그색은 RGB(183, 191, 195)
- `bloxdPackInputs` uniform (`@group(3) @binding(0)`, 64B)은 **헤더 함수 경유로만 쓴다**. 팩에서 직접 참조하지 않는다. stage 가시성이 VERTEX|FRAGMENT이므로, 헤더 함수는 훅 밖의 모듈스코프 함수나 vertex 훅에서도 호출할 수 있다. 깊이 텍스처 (binding 1)는 FRAGMENT 전용이므로, `bloxdOpaqueBehind()` 는 surface / light 훅 한정이다
- **`skyLight` / `blockLight` / `heldLight` 는 「리프트 곡선」 통과 후의 값**으로 도착한다. 헤더 주석의 `tone-mapped` 가 이것을 가리킨다: 엔진은 프래그먼트에 반드시 `y = 1-(1-x/(3-2x))³` (어두운 곳을 들어올리는 S 커브) 를 걸고 나서 팩에 건넨다. 생 voxel 값 (n/15) 이 아니라, 예를 들어 나무 밑 (생값 0.87) 은 **0.97 로 들려서 도착한다**
- `skyLight` 의 실체는 「그 장소에서 하늘이 보이는가」 의 복셀 가림 데이터 (= 섀도맵) 이며, 단순한 밝기 파라미터가 아니다 (15장 「그림자의 진실」)
- **`litColour` 를 기점으로 쓸 수 있다**: v1에서는 포그 완료된 `engineColour` 밖에 없었으므로, 독자 대기 표현에서 이중 포그가 되기 쉬웠다. v2에서는 포그 전·emission 전의 `litColour` 에서 시작해, `bloxdApplyFog()` 으로 자신의 페이스로 포그를 다시 걸 수 있다
- **`blockId` 로 블록 종류를 가릴 수 있다**: 텍스처 색에 의존하지 않는 식별. 단 ID와 블록 종류의 대응표는 엔진 내부이므로, 어느 ID가 무슨 블록인지는 월드 안에서 실측한다 (제8부 참조)
- **구조체의 직접 구축은 금지**: `BloxdLight(...)` 등의 생성자 호출은 정적 검증에서 거부된다. 반드시 `bloxdDefault*` 에서 변경하거나, 입력의 복사를 쓴다

## 11. 베리언트 일람

| 베리언트 | BLOXD_STRICT | BLOXD_LIGHTING | BLOXD_ALPHA |
|---|---|---|---|
| allow + 조명off + 지형 | – | – | ✓ |
| allow + 조명off + 액체 | – | – | ✓ |
| allow + 조명on + 지형 | – | ✓ | ✓ |
| allow + 조명on + 액체 | – | ✓ | ✓ |
| strict + 조명off + 지형 | ✓ | – | – |
| strict + 조명off + 액체 | ✓ | – | ✓ |
| strict + 조명on + 지형 | ✓ | ✓ | – |
| strict + 조명on + 액체 | ✓ | ✓ | ✓ |

베리언트마다 헤더 구조체의 모양도 달라진다 (strict 에서는 `BloxdVertex` 자체가 없음, 조명off 에서는 `blockLight` 등이 없음, strict 지형에서는 `alpha` 가 없음).

## 12. 골격 치트시트

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);          // 직접 구축은 금지. 반드시 default 에서
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // terrain 에서는 allow 일 때만 alpha 가 있다
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);         // engineColour + emission*fogVisibility
    #ifdef BLOXD_LIGHTING                       // 조명 on 전용 입력은 가드한다
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex 는 반드시 이 가드와 함께
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdTime()) * 0.05;
    return out;
}
#endif
```

항상 의식할 5점: 8 베리언트 전부에서 통할 것 / strict 게임이 대다수일 것 / 텍스처 불가 / 훅 파라미터는 읽기 전용일 것 / `let` 은 모듈스코프에 두지 않을 것.

---

# 제4부: 리얼화 가이드

## 13. 엔진 기존 조명과 리얼화의 여지

엔진 기존의 조명은 곱셈뿐이며, 스페큘러·프레넬·난색-냉색 분리·반구 환경광은 존재하지 않는다. 아래가 재구축 가능한 범위이다:

| 기능 | 기존 | 팩으로 가능? |
|---|---|---|
| 확산 (Lambert) | 방향광의 스칼라 총합뿐 | ◎ `bloxdSunDirection()` 으로 직접 구현 (랩광원 등) |
| 스페큘러 (경면 반사) | 전무 | ◎ Blinn-Phong (R9.2) |
| 프레넬 | 전무 | ◎ Schlick 근사 (R9.3) |
| 난색 토치 / 냉색 하늘빛 분리 | 무색 | ◎ (R9.1) |
| 반구 환경광 | 무방향 | ◎ 위=하늘색 / 아래=바닥 튐 (R9.4) |
| 톤맵 | 없음 (clamp 뿐) | ◎ ACES 필믹 (R9.5) |
| 대기 원근법 | 포그 (색 교체) 뿐 | ◎ 거리 디새추레이트 (R9.6) |
| 표면 디테일 | 텍스처 해상도뿐 | △ 해시 노이즈 절차적 마이크로범프 (R9.8) |
| 정점파 (수면) | 전무 (평면) | ◎ allow 한정 (R7) |
| 파법선 / 태양 글린트 | 전무 | ◎ (R9.7) |
| 밤의 달빛 처리 | 하늘색이 어두워질 뿐 | △ 달의 방향은 `-bloxdSunDirection()` 에 있다: 유사 표현 (R2 밤의 파란 환경광 / R9.11) + 방향성 달빛 (R-A, 낮밤 사이클 한정) |
| 그림자 (하늘 가림) | `mix(환경색, 하늘색, skyLight)` 로 살짝 섞을 뿐 | ◎ 리프트 역변환 + 임계값 커트 + 태양 게이트 (R9.12). 나무 그늘·처마 밑이 명확히 떨어지고 블록 편집에 실시간 추종 |

## 14. 리얼화의 구현 유파 — 2가지

**유파 A: 가산 수정 (defaultLight 기점)** — `engineColour` (완성색) 를 바탕으로, 난색 글로우나 림을 더한다. 간편하고 안전하지만 조명 모델 자체는 기존 그대로.

**유파 B: 완전 리라이팅 (s.colour 기점)** — `l.engineColour` 을 버리고 `s.colour` (알베도) 와 LightIn 생소재에서 조명을 다시 짠다. 리얼화의 본명. 지킬 4점:

1. **포그를 다시 건다**: light 훅은 최종단 (포그 뒤) 에서 불리므로 `mix(l.fogColour, col, l.fogVisibility)` 를 직접 적용한다 (R9.10). 짙을 때는 `max(l.fogVisibility, 0.3)` 으로 하한을 깐다. 반대로 engineColour 기점 팩에 포그색을 더 섞으면 이중 포그로 원경이 하얗게 뜬다
2. **조명off 베리언트 폴백**: `#ifdef BLOXD_LIGHTING` 밖에서는 `defaultLight` 로 그대로 통과시킨다
3. **공용 함수째 가드한다**: `BloxdLightIn` 을 인수로 취하는 공용 함수는 fn째 `#ifdef BLOXD_LIGHTING` 로 감싼다 (호출측만으로는 불충분)
4. **태양 방향이 없을 때**: `bloxdSunDirection()` 이 제로면 방향성 스페큘러는 계산하지 않는다. `l.directional` 은 광량의 스칼라지 방향 벡터가 아니므로 하이라이트 방향을 복원하는 용도로는 쓸 수 없다. 필요하면 방향성 없는 약한 환경광으로 전환한다. 단 달의 방향은 `-bloxdSunDirection()` 으로 얻을 수 있다 (낮밤 사이클 월드에서만 움직인다. 제7부 R-A)

## 15. 도달할 수 없는 표현 (리얼화의 「천장」)

| 표현 | 이유 |
|---|---|
| 픽셀 정밀 섀도맵 (태양과 함께 도는 그림자·반음영) | 깊이 텍스처 참조 불가 (액체 한정의 `bloxdOpaqueBehind()` 는 기하 정보뿐이라 섀도맵에 쓸 수 없다). 광선 가림 판정도 훅에 입력되지 않는다 |
| SSAO | 씬 깊이에 접근 불가 (메셔 구운 정점 AO 뿐. 액체 한정의 깊이는 SSAO에 쓸 수 없다) |
| SSR (반사) | 씬색을 얻을 수 없다. 프레넬로 하늘색을 얹는 유사뿐 |
| 블룸 / 글레어 | 포스트프로세스에 훅이 존재하지 않는다 |
| 피사계 심도·색수차·그레인 | 풀스크린 후처리가 필요 |
| 체적광 (god rays) | 마찬가지 |
| PBR 텍스처 | 텍스처 참조 금지. 색의 휘도에서 유사 추정뿐 |
| 수중 굴절 | 씬색을 얻을 수 없다. 액체 한정의 깊이 (`bloxdOpaqueBehind()`) 로 두께 흡수·바닥 투영이 가능 (제8부 R-E) |
| 수중 베일 (파란 틴트) 제거·변경 | 베일은 「카메라가 들어간 액체 블록 정의 color/alpha」 에서 생성되는 emissive 풀스크린 quad 로, 훅 파이프라인 밖 (최전면) 에 그려지므로 팩에서는 색도 농도도 바꿀 수 없다 |
| 수중 직접 검출 | 카메라가 수중인지 나타내는 입력이 없고, 수중에서도 fogStart / fogEnd / fogColour 는 변하지 않으므로 fogVisibility 등에서 수중을 추정하는 믿을 만한 방법도 없다 |

### 그림자의 진실 — 「나무 그림자」 는 만들 수 있다

위 표에서 불가능한 것은 **태양과 함께 도는 픽셀 정밀 섀도맵** 뿐이다. 엔진은 처음부터 「그림자」 를 계산하고 있으며, 그것이 `skyLight` 이다. 메시측 LightEngine 은 마인크래프트식 알고리즘으로 돈다:

1. **종열 스캔**: 각 (x,z) 열을 위에서 아래로 훑는다. 하늘에서 오는 빛은 15 로 시작해, **불투명 블록에서 0** 이 되며, `lightFilter` (공기 1 / 물 3 / 불투명 15) 로 감광하면서 내려간다
2. **BFS 플러드필**: 6근방으로 옆 확산 (1 블록에 -1) — 이것이 그림자 가장자리를 부드럽게 하는 정체. 반경 r 가림물 밑의 생값은 (15-r)/15 가 된다
3. blockLight (횃불 등) 는 RGB 3채널 (4bit 팩) 의 별도 BFS

즉 `l.skyLight` 는 단순한 밝기 파라미터가 아니라 **「그 장소에서 하늘이 보이는가」 의 복셀 분해능 가림 데이터 = 섀도맵** 이다. 나무 밑·처마 밑·실내는 수치로 이미 낮으며, 정점 보간으로 매끄럽게 도착한다. 블록을 두거나 부수면 LightEngine 이 즉시 재계산한다 = **실시간 추종 그림자** 이다. 바닐라는 이것을 `mix(환경색, 하늘색, skyLight)` 로 살짝 쓸 뿐이다.

올바른 도구는 R9.12 의 2단계 (**리프트 역변환으로 생값 복원 → 임계값 `smoothstep` 으로 이값화**. `th = 1 - r/15` 가 직접 「그림자로 간주하는 가림 반경」 다이얼) 에, **태양 직사광을 sky 로 게이트** (태양은 하늘이 보이는 장소에만 닿는다 = 투영의 정체) 를 더해, 낮=난색 / 그림자=냉색으로 물들이는 구성이다.

**솔직한 제한**: 이 그림자는 「위쪽 하늘」 기준이므로, **태양이 시간으로 움직여도 그림자는 돌지 않는다**. 분해능은 블록 단위 (부드러운 가장자리는 BFS 확산에 의한 것). 참고로 엔진 조명 템플릿에는 `var shadow: f32 = 1.;` 라는 섀도맵용 마개가 닫힌 채 남아 있으며 (항상 1.0 = 무효), 픽셀 정밀 회전 그림자는 「장래 구현 예정」 의 흔적으로 해석된다. 픽셀 정밀 회전 그림자가 꼭 필요하면, API 밖 수단 (userscript GLSL 주입 등) 을 검토할 수밖에 없다.

### 수중의 실체

수중 겉모습은 3층으로 되어 있다:

| 층 | 내용 | 팩에서 다룰 수 있는가? |
|---|---|---|
| ① 지형/액체 그리기 | 훅으로 다룰 수 있다. light 훅은 수중에서도 평소처럼 불린다 | 가능 (「베일 밑」 에서 통한다) |
| ② 액체 정의색 베일 | 카메라가 들어간 액체 블록 정의 color/alpha 의 emissive 풀스크린 quad 로, 훅 파이프라인 밖 (최전면) 에 그려진다. 게임 설정 `cameraTint` 이 있으면 그쪽이 우선 | 불가 (색도 농도도 바꿀 수 없다) |
| ③ cameraTint | 게임 설정 | 불가 |

실무 포인트: 팩은 수중에서도 계속 동작한다 / 베일은 없앨 수 없다 / 수중에서는 분기할 수 없다 (fogStart / fogEnd / fogColour 는 수중에서도 변하지 않으므로 fogVisibility 로도 검출할 수 없다).

## 16. 디버깅 요령

- 동굴이 너무 밝다 → `skyLight` 의 비선형 커브가 부족하다 (R2 동굴 레시피 / R9.9)
- 낮이 하얗게 날린다 → ACES 앞의 노출을 낮춘다
- 밤이 어두워서 아무것도 안 보인다 → 최소 환경광을 확보한다 (밤의 `skyLightColour` 는 거의 흑이 되는 것이 전제)
- 원경이 너무 흐리다 → 대기 계수를 낮춘다
- 횃불 주위가 오렌지투성이 → 난색 블렌드 비율을 낮춘다 (생 날색광을 남긴다)
- 블록이 거의 새하얘진다 → light 훅 출력 합계가 1.0 초과 (출력 뒤에 클램프는 없음). 마지막에 `clamp(col, vec3f(0.0), vec3f(1.0))` 를 넣는다
- 가산이 없는데 하얗다 → fogVisibility 나눗셈 un-fog 역산이 원인. un-fog 를 빼고, 다시 짤 거면 `s.colour` 기점으로 포그는 마지막에 한 번만 `mix`
- 발광 블록이 빛나지 않는다 → 재구축 계열에서 emission 재가산 누락. `+ s.emission * l.fogVisibility` 를 더한다
- 밤인데 비춰진 면만 밝게 남는다 → 그림자만 어둡게 하지 말고 완성색 (`engineColour`) 전체에 야간 감쇠를 건다. 국소광을 남기려면 `blockLight` / `heldLight` 로 감쇠를 약하게 한다 (제6부 19절)
- `pow(skyLight, γ)` 를 올려도 그림자가 짙어지지 않는다 → `l.skyLight` 는 리프트 후의 값 (10장). R9.12 의 역변환 + 임계값 커트로 전환한다
- 그림자 면적·농도를 조정하고 싶다 → R9.12 의 조정 가이드 참조 (면적=임계값 `shTh` / 가장자리=`shSoft` / 그림자 심의 어둡기는 최저 환경광과 하늘 산란광의 2점 시프트)

---

# 제5부: 트러블슈팅·주의

## 17. 자주 나오는 에러와 고치기

| 증상 | 고치기 |
|---|---|
| strict 게임에서 읽히지 않는다 | vertex 훅을 `#ifndef BLOXD_STRICT` 로 감싼다 |
| `.alpha` 가 미정의라고 나온다 | `#ifdef BLOXD_ALPHA` 로 감싼다 |
| `blockLight` 가 미정의라고 나온다 | `#ifdef BLOXD_LIGHTING` 로 감싼다. 공용 헬퍼 함수는**함수째** 감싼다 (v2에서는 필드가 항상 존재하므로 보통 일어나지 않는다. 판정용 가드는 남긴다) |
| `Packs can't construct BloxdSurface directly` | `bloxdDefaultSurface(s)` 를 기점으로 고친다 |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | `#ifndef BLOXD_STRICT` 로 감싼다 |
| 원경이 하얗게 흐리다 | 이중 포그가 원인인 경우가 많다. 완성색은 포그 완료 상태이므로 독자 안개는 삼가고 채도만 떨어뜨리는 방식을 검토한다 |
| 게임 참가시에 팩이 제외된다 | 게임 개시시의 실기 체크에서 실패하고 있다. 가드 누락을 다시 본다 |
| `pack.json needs "apiVersion": 2.` | `apiVersion` 이 없거나 `2` 가 아니다. 수치 `2` 를 넣는다 (문자열 `"2"` 는 불가). v1 팩은 `shaderPack:loadWrongApiVersion` 으로 거부된다 |
| `There's no pack.json at the top of the pack.` | ZIP 최상위에 `pack.json` 이 없다. 폴더째 굳히지 않았는지 확인한다 |
| `bloxdTerrainVertex must be declared as: fn ...` | 시그니처 불일치. 표시된 선언대로 다시 쓴다 |
| `bloxdTerrainVertex can't run in strict games...` | vertex 훅을 `#ifndef BLOXD_STRICT` 로 감싼다 |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | `#ifdef BLOXD_LIGHTING` 로 감싼다 (v2에서는 필드가 항상 존재하므로 보통 일어나지 않는다) |
| `pow(l.skyLight, γ)` 를 올려도 그림자가 짙어지지 않는다 | `l.skyLight` 는 리프트 곡선 통과 후의 값 (생값 0.87 이 0.97 로 도착한다). R9.12 의 리프트 역변환 + 임계값 커트로 전환한다 (10장) |
| `... can only be a function's parameter or return type, ...` | 초기화 없는 `var x: BloxdSurface;` 는 거부된다. `bloxdDefault*` 에서 만든다 |
| `bloxdPackInputs isn't part of the bloxd_ header` | PackInputs uniform 은 팩에서 직접 참조 불가. `bloxdTime()` 등의 헤더 함수 경유로 쓴다 |
| `Packs can't declare bloxd_ names...` | 자신의 식별자에서 `bloxd_` 접두사를 뺀다. 정의할 수 있는 것은 6개 훅명뿐 |
| `loadDuplicateManifest` (zip 읽기에서) | `pack.json` 이 2개 있다 (대소문자 차이 포함). 1개로 한다 |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | `bloxdDefaultSurface(s)` 등을 기점으로 고친다. light 훅 첫 파라미터 복사 (`var out = s;`) 에서 시작해도 된다 |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` 는 불가. `_ = f();` 로 쓴다 |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | 지형 훅 안의 `bloxdOpaqueBehind()` 호출을 `#ifdef BLOXD_SCENE_DEPTH` 로 감싼다 |
| `...only surface and light hooks can use.` | vertex 훅 안의 `bloxdOpaqueBehind()` 를 지운다 (surface / light만 가능) |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | 에러가 아니라 strict 게임에서의 자동 비활성화 (`shaderPack:offInStrict`). vertex 훅과 `discard` 는 `#ifndef BLOXD_STRICT` 로 감싼다 |
| `mixing '*' and '^' requires parenthesis (only in ...)` | 제2단계 (브라우저 Tint) 의 에러. `^` `&` `\|` `<<` `>>` 의 피연산자는 괄호로 묶는다 (§38) |

## 18. 권리·주의

- 셰이더 팩 기능 자체는 게임 내 UI에서 불러올 수 있는 공식 기능이며, 팩 제작은 예정된 행위로 간주된다. 단 공개된 공식 문서는 현재 존재하지 않는다
- 팩은 순수 WGSL이며, JS 실행·네트워크 액세스는 설계상 불가능하다
- 본서는 비공식 안내서이며, 개발사의 공식 입장이 아니다. API는 예고 없이 변경될 수 있다

---

# 제6부: 구현 시 중요한 보충

## 19. 야간에 「그림자는 어두운데 표면만 밝다」 를 고친다

그림자만 어둡게 하면, 태양 없을 때 엔진 완성색 (`engineColour`) 이 밝은 채 남아, 면과 그림자의 차이가 부자연스러워질 수 있다. 그림자의 색조가 아니라 완성색 전체에 감쇠를 걸 필요가 있다.

다음 예는 `bloxdSunDirection()` 이 제로면 밤측, 방향이 있으면 낮측으로 보고, 어두운 시간은 지형의 완성색을 감쇠시킨다. 조명 대응 베리언트에서는 `blockLight` 와 `heldLight` 가 강한 장소일수록 감쇠를 약하게 해, 횃불 등의 근거리광을 가급적 남긴다. `0.52` 는 조정값으로, 더 어둡게 하고 싶으면 작게 한다.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    #ifdef BLOXD_LIGHTING
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
    let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
    let protectLocalLight = smoothstep(0.03, 0.35, localLight);
    scale = mix(nightDim, 1.0, protectLocalLight);
    #endif
    // 완성색을 감쇠시키고, 소재의 emission 은 기존대로 포그를 통해 가산한다
    out.colour = l.engineColour * scale + s.emission * l.fogVisibility;
    return out;
}
```

**이 처리의 한계:** `bloxdSunDirection()` 의 동작이 「태양 있음=단위 방향, 태양 없음=제로」 의 두 값이라면, 낮과 밤의 구별은 되어도 노을·박명을 연속적으로 추정할 수 없다. 또 완성색을 감쇠시키므로, 엔진측의 주광·환경광을 함께 약하게 하는 방식이며, 시간대를 완전히 재현하는 것은 아니다. 액체에도 같은 처리를 적용하고 싶으면 액체 훅의 폴백 관계를 확인할 것.

## 20. 물을 자연스럽게 보이게 하는 통합 레시피

이 API에서는 씬색을 샘플링할 수 없으므로, **진짜 반사·굴절이 아니라, 프레넬풍의 색 블렌드와 태양 하이라이트에 의한 유사 표현**이 된다 (수심 계산은 v2의 `bloxdOpaqueBehind()` 로 가능해져, 제8부 R-E에 분리했다). 아래는 색의 베이스를 남기면서, 얕은 시선 각도로 하늘색에 가까운 색을 조금 섞고, 태양이 있을 때만 작은 글린트를 더하는 샘플.

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = bloxdWorldPosition(l.position);
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdTime()), topness));
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let halfDir = normalize(viewDir + sunDir);
        let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
        out.colour += vec3f(1.0, 0.97, 0.90) * glint;
    }
    #endif
    return out;
}
```

조정 기준:

- 물이 하얗다 / 밝다: `fresnel * 0.38` 의 `0.38` 과 글린트의 `0.55` 를 낮춘다.
- 물이 진하다: `fakeSkyReflection` 의 혼합률을 조금 올린다. 단 올리면 플라스틱처럼 보인다.
- 수면에 선도 규칙적인 줄무늬가 보인다: 파의 주파수나 글린트 강도를 낮춘다. 수면 메시 자체의 정점 변위는 이 코드에는 없다.
- 실제 경치를 비추고 싶다: 이 API 입력에는 화면색이 없으므로, 색을 섞을 뿐 실반사가 안 된다 (깊이는 액체 한정으로 얻을 수 있다. 제8부 R-E).

이 레시피는 기존의 `bloxdLiquidLight` 를**바꾼다**는 것. R9.7 의 동명 파법선 함수나 다른 동명 훅과 중복해 붙이지 않는다.

## 21. 실기 테스트 체크리스트

컴파일 성공과 「보기 좋다」 는 별개이므로, 다음 순서로 확인한다.

1. **읽기:** `pack.json` 이 ZIP 직하에 있을 것, 설정 화면에서 `Ready to use` 가 될 것.
2. **8 베리언트:** strict / allow, 조명 on / off, terrain / liquid 각 조건에서 타입 가드 누락이 없을 것. 게임이 일부 조건만 쓰더라도, 배포용 팩은 8가지를 전제한다.
3. **주간:** 풀·돌·모래·목재 등 소재마다 색이 날지 않았는가, 윗면과 측면의 명암차가 부자연스럽지 않은가를 본다.
4. **야간:** 해가 비출 때와 같은 소재, 그림자, 횃불 근처를 비교한다. 밝은 면만 남으면 노출 감쇠, 전부가 어두워지면 국소광 보호를 조정한다.
5. **물:** 바로 위·얕은 시선 각도·기슭·수중·밤을 따로 본다. 알파 거동과 수중 보기는 게임측 합성 방식에 의존하므로 하나의 시점에서만 판단하지 않는다. 수중에서는 액체 정의색 베일이 앞을 가리므로 (위 참조), 팩 차이는 주로 수면과 베일 너머 지형에서 확인한다.
6. **경계와 거리:** 청크 / 원점 전환으로 파도나 무늬가 튀지 않는가, 원경에서 이중 포그나 흰 안개가 나오지 않는가를 확인한다.
7. **성능:** 해시·삼각 함수·`pow` 를 남용하는 효과는 필요 최소한으로 한다. 디테일을 조금씩 추가해 FPS를 비교한다.

### 알려진 제약을 전제로 한다

- shader pack 은 terrain / liquid 훅에 한정되며, 하늘·엔티티·UI를 같은 코드로 처리하는 구조가 아니다.
- 섀도맵, 화면 공간 반사, 굴절, 블룸 등을 추가하기 위한 입력은 이 API에 없다 (씬 깊이는 액체 한정으로 `bloxdOpaqueBehind()` 로 풀렸다. 제8부 참조).
- `bloxdTime()` 은 애니메이션용 시간으로, 게임 안의 낮밤과 연동된다는 보장은 없다.
- `bloxdSunDirection()` 이 제로면 진짜 달의 방향은 알 수 없으며, 파란 환경광을 더하는 처리는 분위기를 만드는 근사. 방향성 달빛은 `-bloxdSunDirection()` 으로 만든다 (낮밤 사이클 월드 한정. 제7부 R-A).
- `s.position` / `l.position` 은 로컬 좌표이므로, 월드 위치에 의존하는 효과에서는 `bloxdOriginOffset()` 을 더한다. 블록 안 로컬 무늬를 만들 경우는, 의도적으로 로컬 좌표를 쓸 수도 있다.

## 22. 셰이더 단독으로 한계가 있을 경우의 조합

셰이더 팩측에서 텍스처를 추가·샘플링할 수 없다는 제약이 있으므로, 소재 그 자체의 미세한 요철이나 하늘의 화상을 바꾸고 싶으면 셰이더만으로 해결하려 하지 않는다. Bloxd.io용 공개 텍스처팩 리포지토리 [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) 에는 텍스처, skybox, 모델 등을 다루는 별도 방식이 있다.

현실적으로는, **셰이더로 빛과 색을 조정하고, 대응하는 별도 리소스팩으로 소재나 하늘을 보완**하는 방침이 좋다. 단, 별도 팩과의 동시 이용 가능 여부나 읽기 순서는 게임측의 구현·설정으로 확인할 것.

## 23. 셰이더 팩과 수중의 실상

수중 겉모습은 3층으로 되어 있다:

| 층 | 내용 | 팩에서 다룰 수 있는가? |
|---|---|---|
| ① 지형/액체 그리기 | 훅으로 다룰 수 있다. light 훅은 수중에서도 평소처럼 불린다 | 가능 (「베일 밑」 에서 통한다) |
| ② 액체 정의색 베일 | 카메라가 들어간 액체 블록 정의 color/alpha 의 emissive 풀스크린 quad 로, 훅 파이프라인 밖 (최전면) 에 그려진다. 게임 설정 `cameraTint` 이 있으면 그쪽이 우선 | 불가 (색도 농도도 바꿀 수 없다) |
| ③ cameraTint | 게임 설정 | 불가 |

실무 포인트: 팩은 수중에서도 계속 동작한다 / 베일은 없앨 수 없다 / 수중에서는 분기할 수 없다 (fogStart / fogEnd / fogColour 는 수중에서도 변하지 않으므로 fogVisibility 로도 검출할 수 없다).

---

# 제7부: 내부 사양의 보충

엔진 구현 해석으로 밝혀진 추가 사양. 모두 현행 정식 빌드의 JavaScript 에서 직접 복원한 것이다.

## 24. 태양과 달의 정체

`bloxdSunDirection()` 의 공급원은 스카이박스 종류가 바뀔 때만 다시 쓰는 태양 방향 버퍼이며, 판단 기준은 「하늘에 태양이 있는가」 가 아니라 **「스카이박스가 earth 타입인가」** 이다.

| 스카이박스 | `bloxdSunDirection()` |
|---|---|
| `default` (절차 하늘) | 0이 아님 (기존값 아래) |
| `gloomy` / `interstellar` / `space_*` (큐브 텍스처) | **항상 (0,0,0)** |

**달은 항상 `-bloxdSunDirection()` 에 있다** (엔진이 달의 위치를 태양의 정반대로 계산하기 때문). 밤낮 판정은 태양 고도로 한다 — `bloxdSunDirection().y < 0` (태양이 지평선 밑) 일 때 달이 위에 있다. 단 기존 월드에서는 태양이 정지해 있으므로 달도 정지해 있으며, 움직이는 달이 의미 있는 것은 낮밤 사이클을 구현한 월드뿐이다.

기존 월드의 태양 방향은 약 `(-0.56, 0.81, -0.18)` (inclination = −0.2 / azimuth = 0.55 에서 계산되는 단위 벡터, 정지). 배포 팩 테스트 때 하이라이트 방향을 미리 예측할 수 있는 실용 기준값이다.

낮밤 사이클은 엔진에 내장되어 있지 않다 — inclination 은 정적인 수치이며, 낮밤이 움직이는 월드는 게임측이 갱신한다. 그 갱신 때마다 `bloxdSunDirection()` 도 다시 쓰이므로 따라간다.

지형의 방향광은 씬 기동시에 만들어지는 2등뿐이며 **방향도 강도도 고정, 낮밤에 변하지 않는다**. 정리하면 **지형 밝기를 정하는 요소는 어느 것도 시간에 의존하지 않는다. 낮밤의 「겉모습」 은 스카이박스와 bloxdSunDirection() 뿐**이며, 밤에 지형을 어둡게 하고 싶은 팩은 bloxdSunDirection() 에서 직접 시간대를 추정할 수밖에 없다 (§19 의 `sunPresent` 수법).

### R-A. 방향성 달빛 — moonDir = −bloxdSunDirection()

달이 위에 있을 때만 푸르스름한 흰 Lambert 와 약한 스페큘러를 더한다. `moonUp` 이 0인 세계 (기존 정지 태양 월드) 에서는 아무 일도 일어나지 않으므로, **낮밤 사이클 있는 월드에서만 발동하는 안전한 달빛**이 된다.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 달은 항상 태양의 정반대. 낮 동안은 moonDir.y < 0 으로 자동 소등된다
    let moonDir = -bloxdSunDirection();
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(bloxdEyePosition() - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. 포그의 내부 사양

포그 계산은 항상 LINEAR 모드 (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1) 이며, `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = 포그 거리 설정. D = 0 일 때만 fogEnd = 5 특례) 이다. **포그 기울기대는 고작 32 블록 폭**이며, `l.fogVisibility` 는 「거리 안개」 라기보다 **「읽힌 월드의 가장자리까지 정규화 거리」** 지표이다. 플레이어마다 읽기 거리가 다르므로, 거리 기반 연출은 직접 `distance(l.position, bloxdEyePosition())` 을 계산해야 한다 (레시피 R-B).

기존 포그색은 `rgb(183, 191, 195)` (엷은 청회색). 월드 작성자는 `fogColourOverride` (hex) 로 바꾼다. 포그 모드 0 (NONE) 일 때 **fogColour 는 검정으로 도착한다**. 표준형 `mix(l.fogColour, col, l.fogVisibility)` 는 fogVisibility 가 1 일 때 안개색을 쓰지 않으므로 안전.

플레이어측 `showFog` 를 끄면 포그는 3200~3328 블록으로 밀려나 사실상 무효가 된다 (`fogVisibility ≈ 1` 이 계속 돌아온다).

### R-B. 읽기 경계 밴드 — fogVisibility 를 「월드 가장자리」 로 쓴다

읽기 경계의 32 블록대만 조용히 냉색으로 조여서, 월드 끝을 눈에 띄지 않게 한다 (또는 연출로 강조한다). 거리를 직접 계산하지 않으므로, 플레이어의 읽기 거리 설정에 자동 추종하는 것이 이점.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = 안쪽 (경계까지 여유 있음), 0 = 경계 밖으로 나갈 직전
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. blockLight / heldLight 의 내부 구조

`aPackedLightLevels` 를 디코딩할 때, 엔진은 각 채널에 **RGB 가장 밝은 채널의 35% 를 하한으로 까는 「35% 채널 바닥」** 을 깐다. 예를 들어 「순수 빨간 광원」 은 정점에서 (1.00, 0.35, 0) 으로 들려서 보간·리프트를 탄다. 횃불 오렌지가 게임 안에서 「빨강이라기보다 하얀 핑크」 로 보이는 것은 이 때문이다. 난색 토치 계열 레시피 (R9.1) 의 채도는 이 기본 동작을 기준으로 조정하면 좋다.

손에 든 빛 (`heldLight`) 의 범위는 가장 밝은 빛색 채널을 따르며 (최대 15 블록), `dist^0.75` 전처리가 들어가고, 같은 35% 채널 바닥이 적용되며, `l.heldLight` 는 앰비언트 부스트 **전** 값이다. 커스텀 아이템에는 `spotlightRange` (사정) 와 원뿔각을 정할 수 있어, 「들고 있는 동안 지향성 빔을 쏜다」 모드가 존재하며 그 원뿔은 카메라를 따라간다. 팩측에서는 빔 방향을 알 방법이 없다.

커스텀 블록에는 `skyLightEmission` (0~15) 이 달릴 수 있어, **blockLight BFS 와는 별개로 skyLight 채널 자체를 주입할 수 있다**. R9.12 같은 「skyLight 임계값으로 낮/그림자를 판별하는」 팩은, 인공광으로 skyLight 가 들려 있는 월드에서는 오판할 수 있다. 배포 팩은 blockLight 와 조합해 판정하는 편이 견고하다.

## 27. 파이프라인 세부

- **surface 훅은 alphaTest 의 「앞」 에서 돈다**: `out.alpha` 가 그대로 discard 판정에 쓰인다. 컷아웃 소재 (풀·잎) 에서는 디더 패턴으로 녹는 듯한 이펙트를 만들 수 있다 (레시피 R-C). 액체 (블렌딩) 에서는 `out.alpha` 가 실제 투명도가 된다 (레시피 R-D). 통상 불투명 지형에서는 alpha 가 끝내 무시된다
- **`l.ambient` 의 내용**은 `material.ambient × sceneAmbient` 로 소재마다 다른 값이다. 씬측은 그래픽 설정 「Ambient Lighting Intensity」 (기존 0.5) 에 직결되어 있으므로, 기존값 때려박기를 하지 않는다
- **`bloxdTime()` 의 정체는 `performance.now()`**: 브라우저 기동 경과 시간을 1시간으로 감은 값이다. 게임 안 낮밤이나 월드 경과 시간과 무관하다. 게임 안 시계와 동기된 애니메이션을 만들고 싶으면, 낮밤 사이클 구현 월드의 `bloxdSunDirection()` 방위각에서 추정하는 것이 현실적이다
- 로딩 때 청크 경계의 미세 체크무늬는 엔진의 화면 공간 Bayer 4×4 디더 청크 페이드이며, 팩 유래 버그가 아니다
- **`mod` 는 예약어**: `pack.wgsl:3 'mod' is a reserved word in WGSL.` 로 거부된다. 나머지는 `%` 연산자로 쓴다

### R-C. Bayer 디더 용해 — out.alpha 가 discard 를 제어한다

엔진이 청크 페이드에 쓰는 것과 **같은 Bayer 4×4 테이블**을 재현해, 낮은 블록부터 순서대로 디더로 「녹는」 cutout 을 만든다. alphaTest 소재 (풀·잎) 에서는 discard 가 돌고, 액체에서는 블렌드 투명도가 된다.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod 는 예약어이므로 % 연산자를 쓴다
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // 낮은 블록부터 녹는다. dissolve 가 높을수록 남는다
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. 물의 카메라 근접 페이드 — 액체의 alpha 로 시야를 확보한다

액체 훅의 `out.alpha` 는 블렌딩에 직결된다. 카메라 바로 아래 수면만 비워서, 잠수·수상 카메라의 시야를 확보하는 레시피.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0~3 블록에서 완전 투명→통상
    #endif
    return out;
}
```

## 28. 팩에 보이는 값을 바꾸는 것 — 테스트 체크리스트

같은 팩도 **월드와 플레이어 설정에 따라** 다르게 보인다. 배포 전에는 적어도 다음 3 환경에서 겉모습을 확인할 것:

1. **통상 월드** (default 스카이박스·오버라이드 없음) — bloxdSunDirection() 있음·기존색
2. **space 계열 스카이박스 월드** — bloxdSunDirection() = 0. `sunPresent` 분기의 겉모습
3. **`visionMinLightColour`·`skyLightColourOverride` 를 정한 커스텀 월드** — 어두운 곳과 색이 들려 있는 경우

주된 변동원: `lightingOverride` (조명 강제) / `skyLightColourOverride`·`ambientLightColourOverride` (hex 교체) / `visionMinLightColour` (하늘과 앰비언트에 대한 「볼 수 있는 가장 어두운 색」 하한. Night Vision 이 쓴다 — 「동굴을 깜깜하게」 계열 팩은예상보다 어두워지지 않는다) / `heldLightColourOverride`·`Range`·`ConeAngle` / `fogChunkDistanceOverride`·`fogColourOverride`·`fogOnSkybox` / `skyBox` (bloxdSunDirection() 유무). `uSkyLightColour` 기존 = (1,1,1) 흰색, `uAmbientLightColour` 기존 = (0.25,0.25,0.30). `l.ambient` 씬측 = 그래픽 설정 「Ambient Lighting Intensity」 (기존 0.5). `l.fogVisibility` 는 플레이어 포그/청크 거리 설정을 따라간다.

## 29. 디버깅 수단

- URL 파라미터 `?renderer=lite` — Lite 렌더러 강제 (`?renderer=webgl2` / `babylon` 도 가능)
- URL 파라미터 `?vconsole` — 화면 안 콘솔 (VConsole) 기동. 모바일 실기 검증에 요긴하다
- 콘솔에는 `noa-engine v0.33.0` 과 `Renderer: lite from <소스>` 가 나온다 — 그리기 경로 오진단 방지에 먼저 이것을 확인할 것
- WebGPU 렌더러는 팩 적용 중 「강제 ON」 으로 잠긴다. 「Disable Block Texture Atlas」 설정도 잠기며 (아틀라스 ON 유지), WebGPU 미대응 환경에서는 애초 팩이 적용되지 않는다. 배포 페이지에 「WebGPU 대응 브라우저가 필요」 라고 쓰는 근거는 여기이다
- 게임 참가 때마다 런타임 재검증 (`checkCompilation`) 이 돌아, 실재하는 전 지형 소재를 브라우저 WebGPU 로 실컴파일한다 (설정 화면의 정적 검증보다 엄격). 여기서 떨어지면 팩은 그 게임에서 제외된다

## 30. 게임별 적용 모드 (`shaderPackPolicy`)

여기서 §7 의 「allow / strict」 가 타이틀 단위 설정임을 확정한다. 게임 정의 측의 `shaderPackPolicy` 이 명시적으로 `"allow"` 인 타이틀만 full 모드 (vertex 훅, `discard`, 지형 `alpha`) 로 움직이고, 지정이 없는 (또는 allow 이외의) 타이틀은 strict 가 된다 — `BLOXD_STRICT` 가 정의되고, 가드 내부의 코드는 자동으로 무효화된다. 이 판정은 팩 측에서 고를 수 없으므로, 어느 타이틀에서 무엇이 움직이는지 아는 것이 배포의 전제가 된다.

- 근거 빌드: `szby6g.main.94a7596c.js` (2026-10-17 시점의 정식 배포). 전체 111 게임 정의를 정적으로 분석한 결과 **allow 26 엔트리 (12 타이틀) / strict 85 엔트리**.
- allow 는 기저 정의의 직서 8 곳과 기저 변수 (`tb` / `kz` / `cb` / `Fb`) 의 4 곳 합계 12 곳에서 선언되고, 베리언트는 스프레드 상속 (`{...tb,...}`) 으로 받는다. 베리언트 단위의 개별 덮어쓰기 (부모 allow·자식 strict 의 역 패턴) 는 현재 제로.

allow 의 12 타이틀 (합계 26 엔트리):

- **Test Gym** — 기본 + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (합계 11 엔트리)
- **Doodle Cube** — 기본 + Solos / Duos (합계 3)
- **Rocket Obby** — 기본 + Sheep / January (합계 3)
- **단독 타이틀 (9)**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

strict 측에서 특히 오해하기 쉬운 점:

- **Superflat Creative (classic_creativeFlat) 은 strict**. 「Creative」 를 이름에 포함하지만, classic 계열에서 allow 인 것은 통상의 Creative (`classic_creative`) 뿐. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns 등도 전부 strict
- **Custom Games (customGames) 은 strict**. 자작 커스텀 게임에서는 vertex 훅 계열의 효과가 발동하지 않는다. 작업용 검증은 Test Gym 을 사용하는 것이 확실
- bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) 계열의 주요 PvP·서버계 타이틀은 전부 strict

한편 strict 타이틀에서도 팩의 로드와 컴파일 자체는 이루어지고, surface / light 등 프래그먼트 측 레시피는 통상대로 움직인다. 제한을 받는 것은 vertex 훅 (`bloxdTerrainVertex` / `bloxdLiquidVertex`) 과 `discard`, 그리고 지형 `alpha` (액체는 항상 존재) 이다.

이 일람은 상기 빌드 시점의 정적 분석 결과이며, 엔진 갱신으로 allow/strict 의 배분은 변할 수 있다. 새판이 나오면 재확인할 것.

# 제8부: API Version 2 마이그레이션 가이드

대상 빌드: `6qxffk.main.5912a15f.js` (2026-10-16 시점의 정식 배포). 이 책의 제1부~제7부는 v2 기준으로 다시 쓴 상태이며, 이 제8부는 v1에서의 이전 포인트와 v2의 새로운 기능을 모은 것이다. 새 기능의 코드 예제는 v2 컴파일러에 의한 8/8 베리언트 검증과 브라우저 WGSL 컴파일러 (Tint) 검증 (§38)을 통과한 것이며, 기존 레시피의 v2 변환은 기계적인 식별자 교체이므로, 배포 전에는 반드시 실기 컴파일로 확인할 것.

## 31. v1 팩의 운명 (먼저 결론)

게임은 manifest의 `apiVersion` 이 **2와 엄밀히 일치할 것**을 요구한다. v1 팩을 읽히면 `This pack is for shader pack API version 1. Bloxd supports version 2.` (i18n 키 `shaderPack:loadWrongApiVersion`) 로 거부된다. v1/v2 **병행 지원은 존재하지 않는다**. 또 엔진은 저장된 팩의 `validation.headerVersion` (헤더 전체의 해시) 을 재검사하므로, 엔진 업데이트 때 저장 팩이 자동으로 「재확인 필요」 가 되는 구조는 v1과 같다.

## 32. 식별자의 전면 개명 (대응표)

v2에서는 언더스코어 명명에서 캐멜케이스로 통일됐다. **구명은 일절 쓸 수 없다.**

| v1 | v2 |
|---|---|
| `bloxd_terrain_vertex` | `bloxdTerrainVertex` |
| `bloxd_terrain_surface` | `bloxdTerrainSurface` |
| `bloxd_terrain_light` | `bloxdTerrainLight` |
| `bloxd_liquid_vertex` | `bloxdLiquidVertex` |
| `bloxd_liquid_surface` | `bloxdLiquidSurface` |
| `bloxd_liquid_light` | `bloxdLiquidLight` |
| `bloxd_defaultVertex` | `bloxdDefaultVertex` |
| `bloxd_defaultSurface` | `bloxdDefaultSurface` |
| `bloxd_defaultLight` | `bloxdDefaultLight` |
| `bloxd_VertexIn` | `BloxdVertexIn` |
| `bloxd_Vertex` | `BloxdVertex` |
| `bloxd_SurfaceIn` | `BloxdSurfaceIn` |
| `bloxd_Surface` | `BloxdSurface` |
| `bloxd_LightIn` | `BloxdLightIn` |
| `bloxd_Light` | `BloxdLight` |
| `bloxd_packInputs` (내부 uniform) | `bloxdPackInputs` (`@group(3) @binding(0)`, 64B) |

훅의 종류 (vertex / surface / light · terrain / liquid 6종) 와 `pack.json` 형식 (`apiVersion` / `name` / `author`) 에는 변경이 없다. 로더 제한도 불변 (zip 32MB / 엔트리 1024 / `.wgsl` 256개 / 합계 256KB / manifest 64KB).

## 33. 삭제 필드의 이식처

v1에서는 `time` / `eyePosition` / `sunDirection` / `originOffset` 이 구조체의 필드였다. v2에서는 **이들 필드는 삭제되고, 대신 엔진 uniform (`bloxdPackInputs`) 을 읽는 헤더 함수**를 쓴다. 함수는 uniform을 직접 읽으므로, **훅 밖의 모듈스코프 함수나 vertex 훅에서도 호출할 수 있다**.

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| `s.position + vec3f(...)` 에 의한 월드 좌표화 | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

## 34. 새 기능 ①: `blockId` (블록 고유 셰이딩)

`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` 3개 구조체 모두에 `blockId: u32` 가 추가됐다. **면이 속한 블록의 ID** (0~65535) 로, 같은 면 안에서는 일정 (`@interpolate(flat)` 으로 전달). 텍스처 색에 의존하지 않는 블록 종류 식별에 쓴다. 단 ID와 블록 종류의 대응표는 엔진 내부에 있어 팩에서는 참조할 수 없으므로, **어느 ID가 무슨 블록인지는 월드 안에서 실측**할 수밖에 없다.

### R-F. blockId에 의한 블록 종류 틴트

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // 예: 돌 계열 (id 상위 비트 패턴) 을 한색으로 기울이기
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

## 35. 새 기능 ②: `BLOXD_SCENE_DEPTH` 와 `bloxdOpaqueBehind()` (본명)

v1에서 구조적으로 불가능했던 깊이 액세스가 **액체 (liquid) 프로그램에 한해** 풀렸다. 색은 얻을 수 없지만, **안쪽 불투명면까지의 거리와 위치라는 기하 정보를 얻을 수 있다**. 전형적인 용법은 물의 두께를 잰 흡수색 계산이다.

사용 규칙:

| 용법 | 결과 |
|---|---|
| `bloxdLiquidSurface` / `bloxdLiquidLight` 안에서 가드 없이 호출 | OK (액체 베리언트에서는 항상 정의) |
| `bloxdTerrainSurface` 안에서 가드 없이 호출 | ERROR. `#ifdef BLOXD_SCENE_DEPTH` 로 감싼다 |
| vertex 훅 안에서 호출 | ERROR (surface / light 훅 한정) |

지형 훅에서도 깊이를 쓰고 싶으면 `#ifdef BLOXD_SCENE_DEPTH` 로 감싼다 (지형 훅은 액체 프로그램에도 함께 쓰이므로, 액체 측에서만 깊이가 유효해진다).

### R-E. 물의 두께 흡수 (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // 물기둥의 길이 = 현재 위치에서 안쪽 불투명면까지
        let thickness = distance(behind.position, surface.position);
        // Beer-Lambert 흡수: 빨강은 빨리 떨어지고, 파랑은 멀리까지 닿는다
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // 안쪽이 하늘 = 깊은 물색으로 기울이기
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

응용: 두께 기반 흡수·산란, `behind.position` 에서의 바닥 월드 좌표에 의한 물결·코스틱풍 무늬 투영, `found=false` 에서의 하늘과 가림 구별에 의한 수면의 하늘 반사, 깊이에 의한 거품과 탁함의 단계 부여. 참고로 깊이 복사 파이프라인 구축에 실패한 경우는 「안쪽에 아무것도 없음」 으로 안전하게 열화된다.

## 36. 그 밖의 v2 변경점

- **훅의 폴백**: 액체 프로그램은 `bloxdLiquidXxx` 가 미정의일 때 지형 훅으로 폴백한다. **지형 훅뿐인 팩은 수면에도 그대로 통한다**. 의도하지 않으면 liquid 측 훅을 명시 정의한다.
- **`BLOXD_LIGHTING` 의 필드 가드는 불필요하게**: 전 베리언트에 `blockLight` 등이 존재하며, 조명off에서는 기본값 (0 / 1 / 흰색 / 0) 이 들어간다. 조명 판정을 하고 싶을 때만 `#ifdef BLOXD_LIGHTING` 을 쓴다. 기존 가드를 남겨도 동작은 바뀌지 않는다.
- **`BLOXD_ALPHA` 의 정의 조건이 변화**: 비 strict 지형 베리언트와 전 액체 베리언트에서 정의되며, strict · terrain에서는 정의되지 않는다. 지형 훅에서 alpha를 쓸 경우는 가드를 남길 것.
- **구조체의 직접 구축은 금지**: `BloxdLight(...)` 등의 생성자 호출은 정적 검증에서 거부된다. 반드시 `bloxdDefault*` 에서 변경하거나, 입력의 복사를 쓴다.
- **`let _ =` 는 `_ =` 로**: WGSL의 파기 대입 `_ = f();` 는 유효하지만 `let _ = f();` 는 거부된다.
- **offInStrict**: vertex 훅의 정의, 또는 surface / light 훅에서 도달 가능한 `discard` 가 있으면, 에러가 아니라 팩 전체가 strict 게임에서 자동 비활성화된다 (설정 UI에 `shaderPack:offInStrict` 표시, allow 게임에서는 동작). vertex 훅과 `discard` 는 `#ifndef BLOXD_STRICT` 로 감싼다.
- **포그의 확장**: 포그 계산에 LINEAR / EXP / EXP2 3가지 모드가 구현됐지만, 게임 측 설정은 종래대로 항상 LINEAR이므로, 기존 포그 사양은 그대로 쓸 수 있다. `fogColour` 의 의미도 공식적으로 명문화됐다 (완전히 포그 없는 씬에서만 흑).
- **바뀌지 않은 것**: 리프트 곡선·35% 채널 바닥·heldLight 감쇠 (`pow(lightDist, 0.75)`) 와 환경광 부스트·태양과 달의 방향 사양·기존 포그색·time 감김 (3600초)·방향광 (최대 4개)·Lite (WebGPU) 전용·저장 구조 (IndexedDB)·`mod` 예약어.

## 37. v1 → v2 이전 체크리스트

1. **pack.json**: `"apiVersion": 1` → `"apiVersion": 2`
2. **식별자**: §32 대응표로 전부 교체 (훅명·구조체명·default 함수명)
3. **삭제 필드의 이식**: §33 표에 따라 헤더 함수로 (`s.time` → `bloxdTime()` 등)
4. **`fogFactor` → `fogVisibility`** 로 개명
5. **구조체 직접 구축을 제거**
6. **`let _ =` 을 `_ =` 로** 수정
7. **vertex 훅과 discard는 `#ifndef BLOXD_STRICT` 로 감싼다**
8. **수면도 지형 훅의 효과를 받음**을 확인하고, 의도하지 않으면 liquid 훅을 명시 정의
9. (임의) `litColour` 를 기점으로 포그를 직접 관리 / `bloxdOpaqueBehind()` 로 물의 두께 흡수를 추가 / `blockId` 로 블록 고유 표현
10. **제2단계 (브라우저 Tint) 도 검증한다** — 특히 `^` `&` `|` `<<` `>>` 를 포함한 식의 괄호. 정적 검증을 통과해도 브라우저에서 거부되는 코드가 존재한다 (§38)

## 38. 제2검증단계 — 브라우저의 WGSL 컴파일러는 내장 파서보다 엄격하다

게임의 팩 검증은 **2단계**가 있다. 제1단계는 정적 검증 (엔진 내장 JS 파서. 훅 서명·금지 구문·sceneDepth 이용 등 팩 고유 규칙을 검사) 이며, 제2단계는 브라우저 검증 (컴파일 결과에 동봉되는 스텁을 진짜 WebGPU 구현으로 컴파일하고, 에러를 팩의 원본 파일 행으로 역매핑해 표시한다. UI의 「Saved, but it won't run until you fix these errors」가 이 단계) 이다. 에러 표시 말미의 `(only in terrain)` 등의 접미사는 「그 에러가 난 베리언트의 program 종」이다.

내장 파서는 WGSL의 연산자 결합 (Binding) 규칙을 구현하지 않아, **정적 검증을 통과해도 브라우저에서 거부된다**. 피해가 나기 쉬운 것은 정수 해시의 정석 패턴이다:

| 연산자 | 결과 |
|---|---|
| `<<` `>>` | 단항 레벨까지만 직접 결합할 수 없다. `a + b << c` 는 에러 |
| `&` `^` `\|` | 단항 레벨까지만 직접 결합할 수 없다. `a * b ^ c` 는 에러 |
| `&&` `\|\|` | 혼합 불가. `a && b \|\| c` 는 에러 |

### 괄호 다는 법 (NG / OK)

```wgsl
// NG — 정적 검증은 통과하지만 브라우저 (Tint) 가 거부:
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — 각 곱셈을 묶는다 (같은 연산자의 연속 A ^ B ^ C 자체는 좌결합으로 합법)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

이 책의 게재 코드는 이 패턴을 포함하지 않는다 (`pack_hash3` 의 `+`/`*` 혼재와 `h ^ (h >> 16u)` 는 괄호 처리되어 있어 사양 적합). 팩을 쓰면 제1단계와 제2단계를 둘 다 통과시킬 것.

## 39. 독립적인 유사 자료에 대하여

내용이 거의 같은 커뮤니티 자료가 존재한다: [GlitchHunterCoder/Bloxd-Essay 의 Shader](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader). 이 가이드보다 먼저 공개되었지만, **이 가이드 내용은 glm 이 Bloxd 의 실제 번들 파일 (webpack 청크 묶음) 을 독자 해석한 것으로 — 베끼기가 아니다**. 둘이 일치하는 것은, 같은 구현을 독자 조사하면 같은 결론에 이르기 때문이다.

---

조사: ltf_ahel (glm 을 사용해 조사)

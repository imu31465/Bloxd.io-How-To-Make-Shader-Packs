# Bloxd.io 셰이더 팩 만드는 법 (완전판)

자급자족형 Bloxd.io 셰이더 팩 (WebGPU 렌더러 전용) 제작·배포 가이드.

> 본서는 비공식 가이드이며 개발사의 공식 입장이 아니다. API는 예고 없이 변경될 수 있다.  
> 본 가이드는 AI의 도움을 받아 작성되었으며 내용의 정확성은 보장되지 않는다. 실제 게임 동작으로 확인할 것.  
> 최종 리뷰: 2026-10-27 (v4 정식 출시 확인 — 빌드 `cnty9`, 프로덕션과 프리프로드 동일; 제10부 참고. 비교 빌드로 v3 정식 출시를 확인했으며, 훅 호출·포그·깊이·blockFlags 내부 구현을 프로덕션 빌드에서 복원 — 제9부 §49–§54). 완전한 레퍼런스 자료가 제11부 (`11-reference.md`)로 내장되어 있다 — 그대로 복원된 엔진 헤더와 905개 사용 가능 텍스처 이름 전체의 실측 카탈로그; 그래도 레시피는 로딩 화면·실기 컴파일로 계속 검증할 것. 그래도 레시피는 로딩 화면·실기 컴파일로 계속 검증할 것.  
> 셰이더 팩 기능 자체는 게임 내 UI에서 불러올 수 있는 공식 기능이며, 팩은 순수 WGSL  
> (JS 실행·통신 불가)이므로 일반적인 코드로는 위험한 일이 일어나지 않는다.

[매뉴얼로 돌아가기](README.md)·[다음 부 →](02-api.md)

# 제1부: 팩 만들기

> 현행 게임은 2026-10-26부터 `apiVersion: 4` 을 요구하며 로드 시 v1/v2/v3 팩을 거부한다 — 아래 내용은 v2 사양에 기반한 기술이다. 배포 전에 [제9부](09-apiv3.md) 와 [제10부](10-apiv4.md) 의 변경 사항을 확인할 것.

## 1. 개요와 전제

- 셰이더 팩은 **WebGPU 렌더러 전용**이다. 팩을 도입한 동안 설정의 WebGPU 렌더러가 강제 온이 된다
- 팩은 **WGSL의 제한된 서브셋**으로 기술한다. 대상은 **지형 (terrain) 과 액체 (liquid)** 의 겉모습뿐이다
- 할 수 있는 것: 색·투명도·발광 변경, 조명 재구축, 투영풍의 그림자 (R9.12), (일부 게임 한정으로) 정점 이동
- 할 수 없는 것: 자체 텍스처 추가, 포스트프로세스 (블룸 등), 태양과 함께 도는 픽셀 정밀도의 그림자 (섀도맵) 와 진짜 반사 (SSR) 의 신설, 하늘이나 엔티티에 적용 (기존 블록 텍스처 아틀라스의 **샘플링은 v4부터 가능** — `bloxdTexel`, [제10부](10-apiv4.md) §57)
- 할 수 있는데 (간과하기 쉬운) 것: **`skyLight` (복셀 하늘 가림) 를 사용한 투영풍의 그림자** — 나무 밑·지붕 밑을 명확히 어둡게 할 수 있다 (R9.12). 블록을 부수면 LightEngine 이 즉시 재계산하므로 그림자도 실시간으로 따라간다
- **대다수의 게임은 strict 모드** (정점 이동·`discard` 금지) 이다. 일반 배포용 팩은 strict 로 동작하게 만들 것

## 2. 최단 순서

1. 폴더를 만들고 `pack.json` 과 `.wgsl` 파일을 둔다
2. 게임 설정 → Shader Pack 에서 zip 또는 폴더를 읽힌다
3. 에러가 나면 고쳐서 다시 읽힌다 ([제5부](05-troubleshooting.md))
4. 대응 게임에서 동작 확인한다
5. 완성되면 zip 으로 굳혀서 배포한다

## 3. 팩의 구성

- **배포 형태**: `.zip` 1개, 또는 폴더 (폴더 읽기는 데스크톱판 브라우저만)
- **내용**: `pack.json` 1개 (팩의 최상위에 배치. 대소문자 구별 없음) + `.wgsl` 파일 1~256개
- 복수의 `.wgsl` 은 연결되어 1 모듈로 취급되므로 분할·디렉터리 나누기는 자유. 파일명에 제약은 없다. 연결은 **경로명의 사전 순**으로 이루어진다 (모듈스코프의 선언은 순서 비의존이므로 보통은 무관하지만, `var` 의 초기화 순서에 의존하는 쓰기 방식을 취한 경우에만 효과가 있다). `.wgsl` 이외의 파일 (README 등) 은 무시된다
- ZIP 묶기 요령: 전 파일이 공통된 1 계층의 루트 폴더에 들어 있으면 그 prefix 가 자동 제거된다 (macOS 「폴더를 압축」 으로 만든 zip 그대로 OK. `__MACOSX` / `._` 로 시작하는 파일 / `.DS_Store` 등의 OS 쓰레기는 자동으로 제외된다). 단 루트 계층에 여분의 파일이 섞이면 최상위 판정을 잃으므로, 확실한 건 폴더 안에 들어가서 `pack.json` 과 `.wgsl` 을 직접 지정해 굳히는 것 (`pack.json` 이 ZIP 직하에 오는 것을 확인할 것)

| 항목 | 상한 |
|---|---|
| zip 크기 / 엔트리 수 | 32MB / 1024 |
| pack.json 크기 | 64KB, UTF-8 |
| .wgsl 합계 크기 | 256KB, UTF-8 |
| zip 형식 | zip64·분할·암호화 불가. 압축은 store / deflate 만, 중복 경로는 불가 |

## 4. pack.json

```json
{
  "apiVersion": 3,
  "name": "My Pack",
  "author": "your name"
}
```

| 필드 | 필수 | 설명 |
|---|---|---|
| `apiVersion` | 필수 | `3` 와 완전 일치시킬 것. `1`/`2` 팩은 로드 시 `shaderPack:loadWrongApiVersion` 으로 거부된다 — 마이그레이션은 [제9부](09-apiv3.md) 참조 |
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
- 미분 (`dpdx` / `dpdy` / `fwidth`) 은 surface/light 훅 (프래그먼트단) 에서만 사용 가능. vertex 불가
- `const` 배열 (컬러 팔레트 LUT 등), 포인터 (`ptr<function, T>`), 행렬 (`mat3x3f` 등) 도 사용 가능
- 플래그 정의 `#define 이름` + `#ifdef` 에 의한 조건 분기

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
2. 스테이터스를 확인한다. 선택 직후는 「Ready. Reload the page to use it.」 이 표시되고, 페이지 재읽기 후 「Ready to use」 이면 성공. 「Saved, but it won't run until you fix these errors...」 의 경우는 에러 일람 (파일:줄 + 베리언트 표기) 을 고쳐서 재읽기
3. 읽힌 후는 페이지의 재읽기로 유효화된다. URL 파라미터나 localStorage 에 렌더러 오버라이드가 남아 있으면 팩의 기동이 거부되므로, 그것들을 제거하고 나서 재읽는다
4. 먼저 제한이 널널한 게임에서 확인하고, 다음에 strict 게임 (대다수는 이쪽) 에서 확인한다. 정점 이동을 쓰는 경우는 allow 게임에서만 동작한다
5. 배포할 때는 `pack.json` 을 루트에 둔 zip 으로 압축한다 (3장의 크기 상한 이내일 것). 팩의 교체는 같은 화면에서 다시 읽힐 수 있지만, 반영에는 페이지 재읽기가 필요하다 (순서 2-3). 삭제는 Remove Pack 으로 한다. 게임 갱신 후의 재검증은 페이지 읽기 때 자동으로 이루어진다

[매뉴얼로 돌아가기](README.md)·[다음 부 →](02-api.md)

[← 이전 부](01-making.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](03-recipes.md)

# 제2부: API 레퍼런스

> 현행 게임은 2026-10-26부터 `apiVersion: 4` 을 요구하며 로드 시 v1/v2/v3 팩을 거부한다 — 아래 내용은 v2 사양에 기반한 기술이다. 배포 전에 [제9부](09-apiv3.md) 와 [제10부](10-apiv4.md) 의 변경 사항을 확인할 것.

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
- `bloxdSunDirection()` 은 태양이 있을 때의 단위 벡터이며, 태양 없는 하늘에서는 제로이다. **달은 항상 `-bloxdSunDirection()` 에 있다** (엔진이 달의 위치를 태양의 정반대로 계산하기 때문). 현행 빌드에서는 낮밤 사이클의 구현이 없고, 태양·달·별은 게임 실행 중에 움직이지 않는다 (표시의 ON/OFF는 `dayNightSunOpacity` 등의 불투명도 설정뿐). 기본 지구 하늘에서는 태양이 거의 `(−0.56, 0.81, −0.18)` (고도 약 54°) 에 정지한다. **영벡터를 `normalize` 에 넘기지 말 것** — `dot(d, d) < 1e-8` 로 태양의 부재를 검사하고, 상수 방향으로 폴백하는 것이 안전 ([제7부](07-internals.md) §28 참조)
- ※보충: 종래 「제로일 때 달의 방향으로 재사용할 수 없다」 고 썼지만, 방향 자체는 `-bloxdSunDirection()` 으로 얻을 수 있다. 외부 배포용 팩은 제로를 전제로 `sunPresent` 로 분기하는 쓰기가 안전하다 (파란 환경광 유사 표현은 R2, 방향성 달빛은 [제7부](07-internals.md) R-A 참조)
- `emission` 은 조명 계산 후에 가산되고, **`fogVisibility` 로 감쇠된다** (defaultLight 구현 `engineColour + emission × fogVisibility`. 완전히 안개에 잠긴 원경에서는 발광도 사라진다)
- **포그 적용 순서**: 프래그먼트 안의 처리 순서는 ① 조명·발광 합성 → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ light 훅 호출 → ⑤ return. 따라서 **engineColour 는 포그된 상태로 도착하며**, **light 훅 반환값이 그대로 최종색** (훅 뒤에 포그는 다시 걸리지 않는다)
- **fogVisibility 의 정의원**: 뷰 공간 거리 (정점 단위로 계산·보간). linear 모드에서는 `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **fogMode == 0 일 때**: `fogColour` 에는 `vec3f(0.0)` (흑) 이 전달된다. fogColour 색감으로 시간대를 추정하는 코드는 주의
- **현행 빌드의 실포그 설정**: **linear 고정**. `fogStart` = 그리기 청크 거리, `fogEnd` = +1 청크 (지평선만). 포그 끄기 설정에서는 100 / 101 청크로 설정되어 사실상 무효. 기본 포그색은 RGB (183, 191, 195)
- `bloxdPackInputs` uniform (`@group(3) @binding(0)`, 64B)은 **헤더 함수 경유로만 쓴다**. 팩에서 직접 참조하지 않는다. stage 가시성이 VERTEX|FRAGMENT이므로, 헤더 함수는 훅 밖의 모듈스코프 함수나 vertex 훅에서도 호출할 수 있다. 깊이 텍스처 (binding 1)는 FRAGMENT 전용이므로, `bloxdOpaqueBehind()` 는 surface / light 훅 한정이다
- **`skyLight` / `blockLight` / `heldLight` 는 「리프트 곡선」 통과 후의 값**으로 도착한다. 헤더 주석의 `tone-mapped` 가 이것을 가리킨다: 엔진은 프래그먼트에 반드시 `y = 1-(1-x/(3-2x))³` (어두운 곳을 들어올리는 S 커브) 를 걸고 나서 팩에 건넨다. 생 voxel 값 (n/15) 이 아니라, 예를 들어 나무 밑 (생값 0.87) 은 **0.97 로 들려서 도착한다**. 부드러운 계조 용도라면 그대로 좋지만, **임계값으로 낮/그림자를 분리하고 싶을 때는 역변환 `c=(1-y)^(1/3); x=3(1-c)/(3-2c)` 로 생값을 복원하고부터 쓴다** (R9.12)
- `skyLight` 의 실체는 「그 장소에서 하늘이 보이는가」 의 복셀 가림 데이터 (= 섀도맵) 이며, 단순한 밝기 파라미터가 아니다 (15장 「그림자의 진실」)
- **`litColour` 를 기점으로 쓸 수 있다**: v1에서는 포그 완료된 `engineColour` 밖에 없었으므로, 독자 대기 표현에서 이중 포그가 되기 쉬웠다. v2에서는 포그 전·emission 전의 `litColour` 에서 시작해, `bloxdApplyFog()` 으로 자신의 페이스로 포그를 다시 걸 수 있다
- **`blockId` 로 블록 종류를 가릴 수 있다**: 텍스처 색에 의존하지 않는 식별. 단 ID와 블록 종류의 대응표는 엔진 내부이므로, 어느 ID가 무슨 블록인지는 월드 안에서 실측하거나, [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data)의 목록을 참고한다 ([제8부](08-apiv2.md) 참조)
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

공식으로 정의되는 기호는 4 종이다 (위 표의 3 종 + `BLOXD_SCENE_DEPTH` — [제8부](08-apiv2.md) §35). 지형 / 액체의 차이는 기호가 아니라 **별 프로그램**이므로, `#ifdef BLOXD_TERRAIN` 식의 분기는 쓸 수 없다. 플래그명의 대조는 대소문자를 구별하지 않는다. `#ifdef` 에 잘못된 이름을 쓰면, 에러 문구가 4 종의 정식 일람을 표시한다. 훅 함수가 주입되는 것도 지형·액체의 2 프로그램뿐이며, 팩은 엔티티나 파티클 등의 다른 그리기에 영향을 줄 수 없다.

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

[← 이전 부](01-making.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](03-recipes.md)

[← 이전 부](02-api.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](04-realism.md)

# 제3부: 레시피집

> 현행 게임은 2026-10-26부터 `apiVersion: 4` 을 요구하며 로드 시 v1/v2/v3 팩을 거부한다 — 아래 내용은 v2 사양에 기반한 기술이다. 배포 전에 [제9부](09-apiv3.md) 와 [제10부](10-apiv4.md) 의 변경 사항을 확인할 것.

- [R1. 색 레시피 (surface)](#r1-색-레시피-surface)
- [R2. 조명 레시피 (light)](#r2-조명-레시피-light)
- [R3. 발광 레시피 (emission)](#r3-발광-레시피-emission)
- [R4. 좌표 레시피 (월드/블록/시선)](#r4-좌표-레시피-월드블록시선)
- [R5. 시간 레시피 (애니메이션)](#r5-시간-레시피-애니메이션)
- [R6. 액체 레시피](#r6-액체-레시피)
- [R7. 정점 레시피 (allow 한정)](#r7-정점-레시피-allow-한정)
- [R8. 수식 잔기술집](#r8-수식-잔기술집)
- [R9. 리얼계 레시피](#r9-리얼계-레시피)

---

모든 조각은 8 베리언트를 통과한다는 전제의 가드와 함께 쓰여 있다. 그대로 복사해 상수를 만지작거리기만 하면 쓸 수 있다. 단 아래 레시피는 개별 예시이며 위에서 전부 연결하는 용도가 아니다. 같은 훅명 (`bloxdTerrainLight` 등) 이나 같은 헬퍼 함수명을 복수 붙이면 동일 모듈 안에서 정의가 중복되어 컴파일에 실패한다. 복수의 효과를 쓸 경우는 훅을 종류마다 1개로 모아 그 함수 안으로 통합한다.

## R1. 색 레시피 (surface)

### 단색 틴트 (가장 기본)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 채도 부스트 / 디새추레이트

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 으로 선명하게 / -1.0 으로 완전 모노크롬
```

### 색온도 (따뜻함 ⇄ 차가움)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = 따뜻함 (빨강 강함), -1.0 = 차가움 (파랑 강함)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### 빈티지 / 세피아

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### 고도 그라데이션 (낮은 땅을 따뜻하게)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 고도 0..50 에서 1..0
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 면의 방향으로 칠하기 (위쪽=밝게, 벽=어둡게)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // 바닥 1 / 벽 0 / 천장 -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // 벽은 다소 어둡게 천장도 어둡게
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 포스터리제이션 (색수를 줄이기)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

## R2. 조명 레시피 (light)

### 콘트라스트 S자 커브

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### 거리 헤이즈 (독자 포그)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 64 블록에서 192 블록으로 0..0.35 의 포그를 직접 더한다
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### 밤 (skyLight 구동의 파랑 시프트 + 등불 보호)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
    #endif
    return out;
}
```

### 동굴을 깜깜하게 (skyLight 없는 곳을 더 어둡게)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    out.colour *= mix(1.0, 0.35, underground * underground);
    #endif
    return out;
}
```

> `skyLight` 는 리프트 후의 값 (10장) 이므로, 옅은 가림 (나무 밑 등. 생값 0.87 → 리프트 후 0.97) 은 이 방법으로는 거의 어두워지지 않는다. 동굴 (생값 0) 에는 통한다. 「숲그늘」 을 또렷하게 하고 싶으면 R9.12 의 리프트 역변환 + 임계값 방식을 쓴다.

### 밤의 파란 환경광 (달의 방향을 쓰지 않는 유사 표현)

> 이 API에서는 태양 없는 하늘의 `bloxdSunDirection()` 은 제로이다. 방향성 달빛이 아니라, 어두운 하늘에 희미한 파란 환경광을 더할 뿐이다. 단 달의 방향 자체는 `-bloxdSunDirection()` 으로 얻을 수 있다 (낮밤 사이클 월드 한정. [제7부](07-internals.md) R-A).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let upward = clamp(l.normal.y, 0.0, 1.0);
    out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
    #endif
    return out;
}
```

### 노을의 따뜻함 (태양 고도로 색을 기울이기)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 지평선에서 1 / 바로 위에서 0
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### 엔진 출력의 완전 교체 (가장 단순한 재조명)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    #ifdef BLOXD_LIGHTING
    // ※ BloxdLight(...) 의 직접 구축은 금지. default 에서 만들어 colour 를 고친다
    var out = bloxdDefaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // engineColour (엔진의 조명 결과) 를 버리고 「소재의 색 × 직접 계산한 밝기」 로 교체한다
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogVisibility);   // engineColour 를 버렸으므로 포그를 다시 거는 것 (필수)
    out.colour = col + s.emission * l.fogVisibility;   // emission 도 직접 더한다 (필수)
    return out;
    #else
    return bloxdDefaultLight(s, l);
    #endif
}
```

## R3. 발광 레시피 (emission)

> `emission` 은 조명 계산 후에 가산되지만, 기존 처리에서는 **`fogVisibility` 가 곱해져 감쇠한다. 즉 완전히 안개에 잠긴 원경에서는 emission 도 사라진다. 원경에서도 빛나게 하고 싶은 성분은 emission 에 더하지 말고, light 훅 안에서 `out.colour += ...` 로 직접 가산한다** (engineColour 는 포그된 상태이므로, 원경에서는 안개색 위에 빛이 얹힌다)

### 등불의 맥동 (횃불이 숨쉰다)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(bloxdTime() * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### 발광 광석 느낌 (밝은 소재를 빛나게)

```wgsl
// surface 측: 소재가 밝을 (흴) 수록 emission 을 얹는다
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### 반딧불 무리 흉내 (시간으로 공간을 떠도는 광점)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // 몇 개의 「빛의 구슬」 이 천천히 이동한다. distance 의 역수로 빛나게 한다
    let t = bloxdTime() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdTime() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. 좌표 레시피 (월드/블록/시선)

### 월드 좌표

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### 블록 좌표 (공식 레시피 — 헤더 주석 유래)

```wgsl
let worldBlock = bloxdFaceBlock(l.position, l.normal);
```

### 체크무늬 (블록 단위)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 또는 1
out.colour *= mix(0.96, 1.04, checker);
```

### 블록 단위의 의사 난수 (해시)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// 용도: 풀색의 베리에이션, 돌의 색얼룩 등
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### 시선 벡터와 림라이트

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### 시선 각도 (프레넬 흉내 — 액체용)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 바로 위에서 1 / 얕은 각도 0
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. 시간 레시피 (애니메이션)

> `bloxdTime()` 은 3600초 (1시간) 에 감긴다. 셰이더 경과 시간이며 게임 안의 태양·낮밤과 동기된다는 보장은 없다. 겉보기 주기 애니메이션에는 쓸 수 있지만 실제 밤 판정에는 `bloxdSunDirection()` 이나 조명 입력을 우선한다.

### 낮밤 사이클 (1시간에 1일)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdTime() * 6.2831853 / 3600.0);   // 0..1 의 1시간 주기. 게임 안의 낮밤과 동기되리라는 보장은 없다
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### 흔들림 (복수 sin 의 겹침)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### 밴드가 흐르는 오로라 / 형광 띠

```wgsl
// XZ 위치와 시간으로 3색을 섞는다
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

## R6. 액체 레시피

### 수면의 잔물결 (색의 명멸)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdOriginOffset().x);
    let worldZ = s.position.z + f32(bloxdOriginOffset().z);
    let ripple = sin(bloxdTime() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid 는 항상 BLOXD_ALPHA — 가드는 습관상
    #endif
    return out;
}
```

### 고도를 사용한 투명도의 유사 변화 (진짜 여울 판정이 아니다)

> v1에서는 씬 깊이나 수중 바닥의 위치를 참조할 수 없어, 이 API만으로는 실제 수심을 계산할 수 없었다. v2에서는 액체 한정으로 `bloxdOpaqueBehind()` 로 안쪽 불투명면까지의 두께를 잴 수 있다 ([제8부](08-apiv2.md) R-E). 아래는 그것을 쓰지 않는 종래의 유사 연출이며, `s.position.y` 는 로컬 좌표이므로 그대로 쓰면 청크 원점의 변화로 효과가 어긋난다. 월드 고도로 알파를 바꿀 뿐인 유사 연출이며, 해안선이나 수중 바닥을 따른 여울 표현이 아니다. `packWaterReferenceY` 는 월드 고도에 맞춰 조정한다.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // 낮은 고도에서는 얇게, 높은 고도에서는 원래 알파에 가깝게. 게임 안에서 방향은 확인할 것.
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### 수중에서 본 수중 안개

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### 액체에만 통하는 팩 (지형 무손상 구성)

```wgsl
// terrain_* 훅을 일절 쓰지 않는다. 그러면:
//  - terrain 베리언트 = 훅 없음 = 지형은 엔진 기존 그대로
//  - liquid 베리언트  = liquid_* 훅만 유효
```

## R7. 정점 레시피 (allow 한정)

> 전부 `#ifndef BLOXD_STRICT` 로 감쌀 것.
> 실행 조건 (allow 타이틀 일람·Custom Games 는 strict) 의 상세는 본편 §30 참조 → [§30 게임별 적용 모드](07-internals.md#30-게임별-적용-모드-shaderpackpolicy)

### 풀잎이 바람에 흔들린다 (위쪽만 움직인다)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdTime() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // 수직면만
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### 액면의 파도 (윗면만)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdTime() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdTime() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### 맥동하는 지형

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdTime() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // 법선 방향으로 미세하게 팽창수축
    return out;
}
#endif
```

### 파도치는 지형 (거대 sin 파)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdTime() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdTime() * 0.7) * 0.3;
    return out;
}
#endif
```

## R8. 수식 잔기술집

```wgsl
// 0..1 을 매끄럽게 단계화 (n 단)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 2단계의 임계값 (툰 그림자)
let shadow = smoothstep(0.35, 0.37, level);   // 임계값±0.02 로 계단을 만든다

// 3단계 툰
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// 루마 (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// 매끄러운 펄스
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// 삼각파 (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// 초 → 「느린 위상」 으로 변환 (3600초 감김을 고려하지 않는 연출용)
let phase = t * 0.15;
```

## R9. 리얼계 레시피

> 「바닐라의 겉모습을 소재에서 다시 짜는」 물리계 레시피집. 전제:
>
> 1. **light 훅은 프래그먼트의 최종단에서 불린다**. 반환한 colour 가 그대로 최종색. **직접 포그를 다시 걸 필요가 있다** (R9.10)  
> 2. **엔진 기존의 조명은 곱셈뿐**. 스페큘러 / 프레넬 / 난색-냉색 분리 / 반구 환경광은 제로에서 만든다  
> 3. `l.engineColour` 는 완성색 (포그 완료). 버리고 `s.colour` (알베도) 에서 다시 짜는 것이 본격파  
> 4. 텍스처는 금지 → 디테일은 전부**절차적** (해시/노이즈) 으로 넣는다 (R9.8)

### R9.1 난색 토치 × 냉색 하늘빛

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // 중간 clamp
    col = mix(l.fogColour, col, l.fogVisibility);                    // 포그 다시 걸기
    out.colour = col + s.emission * l.fogVisibility;                 // emission 재가산
    #endif
    return out;
}
```

### R9.2 태양 스페큘러 (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);          // 하프 벡터
        let ndh = max(dot(n, h), 0.0);
        let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
        let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
        out.colour += spec * vec3f(1.0, 0.97, 0.90);
    }
    #endif
    return out;
}
```

### R9.3 Schlick 프레넬

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // 가장자리의 옅은 밝기
    #endif
    return out;
}
```

### R9.4 반구 환경광 (위=하늘 / 아래=바닥의 튐)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // 아래: 튐
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // 위: 하늘빛
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // 중간 clamp
    col = mix(l.fogColour, col, l.fogVisibility);                           // 포그 다시 걸기
    out.colour = col + s.emission * l.fogVisibility;                        // emission 재가산
    #endif
    return out;
}
```

### R9.5 ACES 필믹 (Narkowicz 근사)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = 노출
    return out;
}
```

### R9.6 대기 원근법 (거리로 채도가 떨어지는 「공기감」)

> 주의: 안개 색에 휘도를 들어올리는 처리 (`normalize` 등) 를 적용하면, 안개가 어두운 씬에서 「밝은 흰 안개」 가 떠 오르고,  
> engineColour (포그 완료) 에 더해 안개색을 가산하면 이중 포그로 하얗게 된다. **공기감은 채도 저하만으로 표현**하는 것이 안전.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // 거리 감쇠 (100blk≈30%/400blk≈75%)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // 채도만 떨어뜨린다 (휘도는 불변)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 파법선 + 태양 글린트 (수면의 「태양의 길」)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // 높이 h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // ∂h/∂x
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // ∂h/∂z
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = bloxdWorldPosition(l.position);
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdTime()), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);
        let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
        out.colour += glint * vec3f(1.0);
    }
    #endif
    return out;
}
```

### R9.8 절차적 마이크로범프 (텍스처 금지의 회피책)

```wgsl
fn pack_hash(p: vec3f) -> f32 {
    return fract(sin(dot(p, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
}
fn pack_bumpNormal(p: vec3f, n: vec3f, strength: f32) -> vec3f {
    let e = 0.15;
    let h0 = pack_hash(p);
    let hx = pack_hash(p + vec3f(e, 0.0, 0.0));
    let hz = pack_hash(p + vec3f(0.0, 0.0, e));
    let tangentX = normalize(cross(vec3f(0.0, 1.0, 0.0), n) + vec3f(0.0001, 0.0, 0.0));
    let tangentZ = normalize(cross(n, tangentX));
    return normalize(n + tangentX * (hx - h0) * strength + tangentZ * (hz - h0) * strength);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // 블록 안 로컬 좌표
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lam = clamp(dot(n, sunDir), 0.0, 1.0);
        let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
        out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
    }
    #endif
    return out;
}
```

### R9.9 동굴의 비선형 암화 + 등불 보호

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let keep = 0.12 + 0.88 * blockInt;          // 등불 있는 곳은 들어올린다
    out.colour *= mix(keep, 1.0, sky * sky);     // 암화는 비선형 (2제곱)
    #endif
    return out;
}
```

### R9.10 포그를 다시 거는 정석 (engineColour 를 버렸을 때 필수)

> `l.fogVisibility` 를 `max(l.fogVisibility, 0.25)` 처럼 하한과 함께 쓰면 「이 이상 짙어지지 않는다」 조정이 된다  
> (0.0 = 엔진 준수 / 0.3~0.5 = 원경 클리어).  
> 참고로 엔진 포그는 지평선 전용 linear 포그 (그리기 거리 부근만) 이며, 중거리 안개는 팩측에서 만들어야 한다.
> 실포그 설정 (구현 대조 완료): linear 고정 / `fogStart` = 그리기 청크 거리 / `fogEnd` = +1 청크 / 포그 끄기에서는 100~101 청크로 사실상 무효 / 기본 포그색은 RGB (183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));  // 포그 재현 (0.15=엷은 하한)
    col += s.emission * l.fogVisibility;            // emission 도 포그 적용으로
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 시네마-grade (그림자는 한색 / 하이라이트는 난색 / 밤은 디새추레이트)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;  // 태양 방향이 제로일 때만 밤 취급. 노을의 연속 변화는 표현하지 않는다
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

### R9.12 투영풍 섀도우 — 리프트 역변환 + 임계값 커트 (결정판)

> **전제 재확인 (10장)**: `l.skyLight` 는 생 voxel 값 (n/15) 이 아니라 엔진이 「리프트 곡선」  
> `y = 1-(1-x/(3-2x))³` (어두운 곳을 들어올리는 S 커브) 를 통과시킨 후의 값.
>
> | 장소 | voxel 생값 | 리프트 후 (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | 열린 하늘 | 1.00 | 1.00 | 1.00 |  
> | 나무 밑 (반경2) | 0.87 | **0.97** | **0.86** ← 거의 무손상 |  
> | 반경3 | 0.80 | **0.92** | 0.66 |  
> | 반경5 | 0.67 | 0.78 | 0.29 |
>
> **이것이 「감마를 올려도 그림자가 짙어지지 않는다」 의 원인** (수치로 증명). 그러나 곡선은 단조이므로 대수적으로 엄밀히 역변환할 수 있다:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. 생값을 복원하면, 후는**임계값 커트** (`smoothstep`) 로 이값화할 뿐.  
> LightEngine 의 BFS 옆확산은 「인접 1 블록 = -1」 이므로, 임계값 `th = 1 - r/15` 는 그대로  
> 「r 블록 이상의 가림을 그림자로 간주」 다이얼이 된다. 블록을 부수면 그림자도 즉시 움직인다 (LightEngine 이 실시간 재계산).  
> 제한: 그림자는 「위쪽 하늘」 기준이므로 태양의 이동으로는 돌지 않는다 (15장 「그림자의 진실」).

```wgsl
// ★엔진의 리프트를 엄밀히 역변환해 생 voxel skyLight (n/15) 를 복원
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // WGSL 에 cbrt 는 없으므로 pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // ★그림자 반경 다이얼: th = 1 - r/15 (0.87→반경2 이상이 그림자)
const shSoft = 0.04;   // 가장자리 부드러움 (0.02=딱딱 / 0.08=소프트)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // ① 생값 복원 (이것을 빼먹으면 영원히 그림자가 안 된다)
    let skyRaw = sh_unlift(l.skyLight);
    // ② 임계값 커트 — 낮=1 / 그림자=0 을 확실히 분리할 수 있다
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // 태양 Lambert (태양 없을 때는 l.directional 로 폴백)
    let sunLen = length(bloxdSunDirection());
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                      sunLen > 0.5);
    // ★투영의 정체: 태양의 직사광은 「하늘이 보이는 장소」 에만 닿는다
    let lit = sunL * sky;
    // 그림자측: 검정이 아니라 하늘색에 물든다 + 최저 환경광
    let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
    var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
    // 토치광은 그림자를 관통한다 (blockLight 도 리프트 후이므로 함께 복원)
    let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                         sh_unlift(l.blockLight.g),
                         sh_unlift(l.blockLight.b));
    let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
    col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
    // 포그를 다시 건다 (engineColour 를 버린 몫)
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));
    out.colour = clamp(col + s.emission * l.fogVisibility, vec3f(0.0), vec3f(1.0));   // emission 도 잊지 말고 (포그된 상태로 가산)
    #endif
    return out;
}
```

> 조정 가이드: **그림자의 면적은 `shTh`만으로 정해진다** — `0.93`=반경1.5 이상 / `0.87`=반경2 / `0.80`=반경3 / `0.67`=반경5.  
> 그림자 가장자리의 딱딱함은 `shSoft` (0.02=딱딱 / 0.08=소프트). 그림자 심의 어둡기는 `0.09` (최저 환경광) 와 `0.16` (하늘 산란광)  
> 의 2점 시프트로 정해진다. 해 질 녘에 그림자를 넓히고 싶으면  
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` 를 더한다 (긴 해 질 녘 그림자의 근사.  
> `sunDir` 은 `bloxdSunDirection() / length(bloxdSunDirection())`). 그림자의 푸름은 `vec3f(0.72, 0.82, 1.05)` 의 B 를 올린다.

[← 이전 부](02-api.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](04-realism.md)

[← 이전 부](03-recipes.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](05-troubleshooting.md)

# 제4부: 리얼화 가이드

> 현행 게임은 2026-10-26부터 `apiVersion: 4` 을 요구하며 로드 시 v1/v2/v3 팩을 거부한다 — 아래 내용은 v2 사양에 기반한 기술이다. 배포 전에 [제9부](09-apiv3.md) 와 [제10부](10-apiv4.md) 의 변경 사항을 확인할 것.

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
4. **태양 방향이 없을 때**: `bloxdSunDirection()` 이 제로면 방향성 스페큘러는 계산하지 않는다. `l.directional` 은 광량의 스칼라지 방향 벡터가 아니므로 하이라이트 방향을 복원하는 용도로는 쓸 수 없다. 필요하면 방향성 없는 약한 환경광으로 전환한다. 단 달의 방향은 `-bloxdSunDirection()` 으로 얻을 수 있다 (낮밤 사이클 월드에서만 움직인다. [제7부](07-internals.md) R-A)

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
| 수중 굴절 | 씬색을 얻을 수 없다. 액체 한정의 깊이 (`bloxdOpaqueBehind()`) 로 두께 흡수·바닥 투영이 가능 ([제8부](08-apiv2.md) R-E) |
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
- 밤인데 비춰진 면만 밝게 남는다 → 그림자만 어둡게 하지 말고 완성색 (`engineColour`) 전체에 야간 감쇠를 건다. 국소광을 남기려면 `blockLight` / `heldLight` 로 감쇠를 약하게 한다 ([제6부](06-implementation.md) 19절)
- `pow(skyLight, γ)` 를 올려도 그림자가 짙어지지 않는다 → `l.skyLight` 는 리프트 후의 값 (10장). R9.12 의 역변환 + 임계값 커트로 전환한다
- 그림자 면적·농도를 조정하고 싶다 → R9.12 의 조정 가이드 참조 (면적=임계값 `shTh` / 가장자리=`shSoft` / 그림자 심의 어둡기는 최저 환경광과 하늘 산란광의 2점 시프트)

[← 이전 부](03-recipes.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](05-troubleshooting.md)

[← 이전 부](04-realism.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](06-implementation.md)

# 제5부: 트러블슈팅·주의

> 현행 게임은 2026-10-26부터 `apiVersion: 4` 을 요구하며 로드 시 v1/v2/v3 팩을 거부한다 — 아래 내용은 v2 사양에 기반한 기술이다. 배포 전에 [제9부](09-apiv3.md) 와 [제10부](10-apiv4.md) 의 변경 사항을 확인할 것.

## 17. 자주 나오는 에러와 고치기

| 증상 | 고치기 |
|---|---|
| strict 게임에서 읽히지 않는다 | vertex 훅을 `#ifndef BLOXD_STRICT` 로 감싼다 |
| `.alpha` 가 미정의라고 나온다 | `#ifdef BLOXD_ALPHA` 로 감싼다 |
| `blockLight` 가 미정의라고 나온다 | `#ifdef BLOXD_LIGHTING` 로 감싼다. 공용 헬퍼 함수는**함수째** 감싼다 (v2에서는 필드가 항상 존재하므로 보통 일어나지 않는다. 판정용 가드는 남긴다) |
| `Packs can't construct BloxdSurface directly` | `bloxdDefaultSurface(s)` 를 기점으로 고친다 |
| `pack.json needs "apiVersion": 3.` | `apiVersion` 이 없거나 `3` 가 아니다. 수치 `3` 를 넣는다 (문자열 `"3"` 는 불가). v1/v2 팩은 `shaderPack:loadWrongApiVersion` 으로 거부된다 |
| `There's no pack.json at the top of the pack.` | ZIP 최상위에 `pack.json` 이 없다. 폴더째 굳히지 않았는지 확인한다 |
| `bloxdTerrainVertex must be declared as: fn ...` | 시그니처 불일치. 표시된 선언대로 다시 쓴다 |
| `bloxdTerrainVertex can't run in strict games...` | vertex 훅을 `#ifndef BLOXD_STRICT` 로 감싼다 |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | `#ifdef BLOXD_LIGHTING` 로 감싼다 (v2에서는 필드가 항상 존재하므로 보통 일어나지 않는다) |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | `#ifndef BLOXD_STRICT` 로 감싼다 |
| `pow(l.skyLight, γ)` 를 올려도 그림자가 짙어지지 않는다 | `l.skyLight` 는 리프트 곡선 통과 후의 값 (생값 0.87 이 0.97 로 도착한다). R9.12 의 리프트 역변환 + 임계값 커트로 전환한다 (10장) |
| `... can only be a function's parameter or return type, ...` | 초기화 없는 `var x: BloxdSurface;` 는 거부된다. `bloxdDefault*` 에서 만든다 |
| `bloxdPackInputs isn't part of the bloxd_ header` | PackInputs uniform 은 팩에서 직접 참조 불가. `bloxdTime()` 등의 헤더 함수 경유로 쓴다 |
| `Packs can't declare bloxd_ names...` | 자신의 식별자에서 `bloxd_` 접두사를 뺀다. 정의할 수 있는 것은 6개 훅명뿐 |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | `bloxdDefaultSurface(s)` 등을 기점으로 고친다. light 훅 첫 파라미터 복사 (`var out = s;`) 에서 시작해도 된다 |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` 는 불가. `_ = f();` 로 쓴다 |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | 지형 훅 안의 `bloxdOpaqueBehind()` 호출을 `#ifdef BLOXD_SCENE_DEPTH` 로 감싼다 |
| `...only surface and light hooks can use.` | vertex 훅 안의 `bloxdOpaqueBehind()` 를 지운다 (surface / light만 가능) |
| `Lite: …reads scene depth on a page that didn't turn it on` | 깊이 읽기 ([제8부](08-apiv2.md) §35) 를 하는 팩이 유효한 상태로 페이지를 재읽어 다시 연다. 깊이 텍스처의 준비는 페이지 생성시에 확정된다 |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | 에러가 아니라 strict 게임에서의 자동 비활성화 (`shaderPack:offInStrict`). vertex 훅과 `discard` 는 `#ifndef BLOXD_STRICT` 로 감싼다 |
| `mixing '*' and '^' requires parenthesis (only in ...)` | 제2단계 (브라우저 Tint) 의 에러. `^` `&` `\|` `<<` `>>` 의 피연산자는 괄호로 묶는다 (§38) |
| `loadDuplicateManifest` (zip 읽기에서) | `pack.json` 이 2개 있다 (대소문자 차이 포함). 1개로 한다 |
| 「needs the new WebGPU renderer, so remove the renderer override...」 | URL 의 `?renderer=` 와 localStorage 의 `bloxdRenderer` 를 빼고 재읽는다 ([제7부](07-internals.md) §29) |
| 원경이 하얗게 흐리다 | 이중 포그가 원인인 경우가 많다. 완성색은 포그 완료 상태이므로 독자 안개는 삼가고 채도만 떨어뜨리는 방식을 검토한다 |
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | 발광 블록이 밀도 높은 영역·영역 건너에서 빛의 시드 큐가 넘쳐 그 청크의 라이트 계산이 도중에 끊겼다는 경고. 팩 유래가 아니지만, **발광 집중부의 라이트 빠짐은 이 사양**이 원인이며, 월드 측에서 광원을 분산시키면 피할 수 있다 |
| 게임 참가시에 팩이 제외된다 | 게임 개시시의 실기 체크에서 실패하고 있다. 가드 누락을 다시 본다 |
| 실기 체크가 끝나지 않아 `This device couldn't check …` 등으로 팩이 빠진다 | 체크에는 60초의 강제 타임아웃이 있다 (초과분은 `skipped` 취급). 저사양 단말·무거운 월드에서 나오기 쉬우므로, 부하가 큰 vertex 처리나 복잡한 루프 구조를 줄여서 재시도한다 |

### 로더 단계의 에러 ID 일람

설정 화면의 에러에는 `shaderPack:load*` 의 ID가 붙는다. 문구 검색의 보조로:

| ID | 의미 |
|---|---|
| `loadZipTooBig` | zip 이 32MB 초과 |
| `loadTooManyZipEntries` | zip 엔트리가 1024개 초과 |
| `loadTooManyWgsl` | `.wgsl` 이 256개 초과 |
| `loadSourceTooBig` | `.wgsl` 합계가 256KB 초과 (파일 단위의 스트리밍 검사) |
| `loadManifestTooBig` | `pack.json` 이 64KB 초과 |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` 이 JSON 이 아니다 / 오브젝트형이 아니다 |
| `loadNoApiVersion` / `loadWrongApiVersion` | `apiVersion` 없음 / `3` 가 아니다 (v1/v2 는 거부) |
| `loadNoName` / `loadAuthorNotString` | `name` 없음 / `author` 가 문자열 이외 |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | 대응 외 압축 방식 / zip64 / 분할 / 암호화 |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | 경로 중복 / UTF-8 이외 / 전개 실패 / zip 손상 |

`loadNoManifest` / `loadDuplicateManifest` (pack.json 의 위치·중복) 는 위 표의 해당 행을 참조.

## 18. 권리·주의

- 셰이더 팩 기능 자체는 게임 내 UI에서 불러올 수 있는 공식 기능이며, 팩 제작은 예정된 행위로 간주된다. 단 공개된 공식 문서는 현재 존재하지 않는다
- 팩은 순수 WGSL이며, JS 실행·네트워크 액세스는 설계상 불가능하다
- 본서는 비공식 안내서이며, 개발사의 공식 입장이 아니다. API는 예고 없이 변경될 수 있다

[← 이전 부](04-realism.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](06-implementation.md)

[← 이전 부](05-troubleshooting.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](07-internals.md)

# 제6부: 구현 시 중요한 보충

> 현행 게임은 2026-10-26부터 `apiVersion: 4` 을 요구하며 로드 시 v1/v2/v3 팩을 거부한다 — 아래 내용은 v2 사양에 기반한 기술이다. 배포 전에 [제9부](09-apiv3.md) 와 [제10부](10-apiv4.md) 의 변경 사항을 확인할 것.

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

이 API에서는 씬색을 샘플링할 수 없으므로, **진짜 반사·굴절이 아니라, 프레넬풍의 색 블렌드와 태양 하이라이트에 의한 유사 표현**이 된다 (수심 계산은 v2의 `bloxdOpaqueBehind()` 로 가능해져, [제8부](08-apiv2.md) R-E에 분리했다). 아래는 색의 베이스를 남기면서, 얕은 시선 각도로 하늘색에 가까운 색을 조금 섞고, 태양이 있을 때만 작은 글린트를 더하는 샘플.

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
- 실제 경치를 비추고 싶다: 이 API 입력에는 화면색이 없으므로, 색을 섞을 뿐 실반사가 안 된다 (깊이는 액체 한정으로 얻을 수 있다. [제8부](08-apiv2.md) R-E).

이 레시피는 기존의 `bloxdLiquidLight` 를**바꾼다**는 것. R9.7 의 동명 파법선 함수나 다른 동명 훅과 중복해 붙이지 않는다.

## 21. 실기 테스트 체크리스트

컴파일 성공과 「보기 좋다」 는 별개이므로, 다음 순서로 확인한다.

1. **읽기:** `pack.json` 이 ZIP 직하에 있을 것. 선택 직후는 `Ready. Reload the page to use it.` 이 표시되고, **페이지 재읽기로 유효화**된다. 재읽기 후 `Ready to use` 가 되는지 확인한다. 한번 저장한 팩은, 엔진측의 사양 헤더가 갱신되면 헤더 내용의 지문 대조에 의해 다음 페이지 읽기 때 자동으로 재검증된다 (합격이면 그대로 유효 / 불합격이면 blocked 표시). 낡은 팩이 망가진 채로 조용히 유효한 채 남는 일은 없다.
2. **8 베리언트:** strict / allow, 조명 on / off, terrain / liquid 각 조건에서 타입 가드 누락이 없을 것. 게임이 일부 조건만 쓰더라도, 배포용 팩은 8가지를 전제한다.
3. **주간:** 풀·돌·모래·목재 등 소재마다 색이 날지 않았는가, 윗면과 측면의 명암차가 부자연스럽지 않은가를 본다.
4. **야간:** 해가 비출 때와 같은 소재, 그림자, 횃불 근처를 비교한다. 밝은 면만 남으면 노출 감쇠, 전부가 어두워지면 국소광 보호를 조정한다.
5. **물:** 바로 위·얕은 시선 각도·기슭·수중·밤을 따로 본다. 알파 거동과 수중 보기는 게임측 합성 방식에 의존하므로, 하나의 시점만으로 판단하지 않는다. 수중은 [제7부](07-internals.md)의 대로 액체 정의색 베일이 최전면에 걸리므로, 팩 유무의 차이는 주로 수면과 베일 너머의 지형에서 확인한다.
6. **경계와 거리:** 청크 / 원점 전환으로 파도나 무늬가 튀지 않는가, 원경에서 이중 포그나 흰 안개가 나오지 않는가를 확인한다.
7. **성능:** 해시·삼각 함수·`pow` 를 남용하는 효과는 필요 최소한으로 한다. 디테일을 조금씩 추가해 FPS를 비교한다.

### 알려진 제약을 전제로 한다

- shader pack 은 terrain / liquid 훅에 한정되며, 하늘·엔티티·UI를 같은 코드로 처리하는 구조가 아니다.
- 섀도맵, 화면 공간 반사, 굴절, 블룸 등을 추가하기 위한 입력은 이 API에 없다 (씬 깊이는 액체 한정으로 `bloxdOpaqueBehind()` 로 풀렸다. [제8부](08-apiv2.md) 참조).
- `bloxdTime()` 은 애니메이션용 시간으로, 게임 안의 낮밤과 연동된다는 보장은 없다.
- `bloxdSunDirection()` 이 제로면 진짜 달의 방향은 알 수 없으며, 파란 환경광을 더하는 처리는 분위기를 만드는 근사. 방향성 달빛은 `-bloxdSunDirection()` 으로 만든다 (낮밤 사이클 월드 한정. [제7부](07-internals.md) R-A).
- `s.position` / `l.position` 은 로컬 좌표이므로, 월드 위치에 의존하는 효과에서는 `bloxdOriginOffset()` 을 더한다. 블록 안 로컬 무늬를 만들 경우는, 의도적으로 로컬 좌표를 쓸 수도 있다.

## 22. 셰이더 단독으로 한계가 있을 경우의 조합

셰이더 팩측에서 텍스처를 추가·샘플링할 수 없다는 제약이 있으므로, 소재 그 자체의 미세한 요철이나 하늘의 화상을 바꾸고 싶으면 셰이더만으로 해결하려 하지 않는다. Bloxd.io용 공개 텍스처팩 리포지토리 [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) 에는 텍스처, skybox, 모델 등을 다루는 별도 방식이 있다. 이것은 셰이더 팩 API의 공식 사양서가 아니라, 별 시스템의 리소스 예로서 참조한다.

참고로, 커뮤니티에서 「cinematic shader」로 유통되는 배포물을 해석한 사례에서는, 내용은 텍스처팩 (128x128 텍스처로 `pack.json` / `.wgsl` 을 포함하지 않음) 이었다. 「그림자 있는 셰이더풍」의 겉모습 대부분은 텍스처 측의 고안이며, 셰이더 팩으로 빛과 그림자를 나눠 만드는 (R9.12) 방침과, 텍스처 측의 보완을 조합하는 것이 현실적이다.

현실적으로는, **셰이더로 빛과 색을 조정하고, 대응하는 별도 리소스팩으로 소재나 하늘을 보완**하는 방침이 좋다. 단, 별도 팩과의 동시 이용 가능 여부나 읽기 순서는 게임측의 구현·설정으로 확인할 것.

텍스처팩 측에도 사양이 있다 (참고): 크기 상한은 base64 변환 후의 JSON 문자열 길이로 25MB이며, PNG의 base64화는 +33% 팽창하므로, 원본 이미지의 합계는 ~18-19MB가 실질 상한이 된다. CSS는 정규식을 이용한 간이 해석으로 처리되므로, 중첩이나 주석은 쓰지 않는다.

## 23. 셰이더 팩과 수중의 실상

수중 겉모습은 3층으로 되어 있다:

| 층 | 내용 | 팩에서 다룰 수 있는가? |
|---|---|---|
| ① 지형/액체 그리기 | 훅으로 다룰 수 있다. light 훅은 수중에서도 평소처럼 불린다 | 가능 (「베일 밑」 에서 통한다) |
| ② 액체 정의색 베일 | 카메라가 들어간 액체 블록 정의 color/alpha 의 emissive 풀스크린 quad 로, 훅 파이프라인 밖 (최전면) 에 그려진다. 게임 설정 `cameraTint` 이 있으면 그쪽이 우선 | 불가 (색도 농도도 바꿀 수 없다) |
| ③ cameraTint | 게임 설정 | 불가 |

실무 포인트: 팩은 수중에서도 계속 동작한다 / 베일은 없앨 수 없다 / 수중에서는 분기할 수 없다 (fogStart / fogEnd / fogColour 는 수중에서도 변하지 않으므로 fogVisibility 로도 검출할 수 없다).

[← 이전 부](05-troubleshooting.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](07-internals.md)

[← 이전 부](06-implementation.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](08-apiv2.md)

# 제7부: 내부 사양의 보충

> 현행 게임은 2026-10-26부터 `apiVersion: 4` 을 요구하며 로드 시 v1/v2/v3 팩을 거부한다 — 아래 내용은 v2 사양에 기반한 기술이다. 배포 전에 [제9부](09-apiv3.md) 와 [제10부](10-apiv4.md) 의 변경 사항을 확인할 것.

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

포그 계산은 항상 LINEAR 모드 (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1) 이며, `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = 포그 거리 설정. D = 0 일 때만 fogEnd = 5 특례) 이다. **포그 기울기대는 고작 32 블록 폭**이며, `l.fogVisibility` 는 「거리 안개」 라기보다 **「읽힌 월드의 가장자리까지 정규화 거리」** 지표이다. 플레이어마다 읽기 거리가 다르므로, 거리 기반 연출은 직접 `distance(l.position, bloxdEyePosition())` 을 계산해야 한다 (레시피 R-B). (v3 참고: 렌더러의 포그 함수는 실제로 **네 가지** 모드 — 끔 / 지수 / 지수 제곱 / 선형 — 를 구현하며, 출하된 타이틀은 선형을 구동한다. 복원한 소스와 견고성 논의는 [제9부](09-apiv3.md) §50에 있다.)

- 기본 포그색은 `rgb(183, 191, 195)` (엷은 청회색). 월드 작성자는 `fogColourOverride` (hex) 로 바꾼다. 포그 모드가 0 (NONE) 인 상태에서는 **fogColour 는 흑으로 도착한다** (`fogColour = select(vec3f(0.0), uniforms.vFogColor, ...)`). 표준형 `mix(l.fogColour, col, l.fogVisibility)` 는 fogVisibility 가 1 일 때 안개색이 쓰이지 않으므로 안전. 스크립트 API 측에는 그 외에 `fogChunkDistanceOverride` 와 `fogOnSkybox` 옵션이 있어, 커스텀 게임은 포그 거리 (D 에 해당하는 값) 와 스카이박스로의 포그 적용을 개별 설정할 수 있다. 기본에서는 스카이박스는 포그의 영향을 받지 않는다 (`fogOnSkybox` 를 유효화한 게임에서만, 스카이박스도 포그색으로 물든다).

플레이어측 `showFog` 를 끄면 포그는 3200~3232 블록으로 밀려나 사실상 무효가 된다 (`fogVisibility ≈ 1` 이 계속 돌아온다).

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

- `blockLight` 는 RGB 3채널의 **색 있는 빛**이다. 광원 블록마다 발광색 `[R, G, B]` (각 0-15) 가 정의되어 있고, 그것이 그대로 빛의 색이 된다 (통상 횃불 = 온백 (14,14,12) / 라바 = 오렌지 (14,8,2) / 비콘 = 시안 (5,14,14) / 흰 횃불 = (15,15,15) 등). 정점단에서는 1개의 float 속성에 r / g / b / sky 의 4 니블로 팩되어 도착한다. light 훅 안에서는 3채널을 따로따로 다루는 것으로 색 있는 국소 조명을 만들 수 있다 — 난색 토치 계열 레시피 (R9.1) 가 기준으로 하는 거동의 실체는 이것이다.

`aPackedLightLevels` 를 디코딩할 때, 엔진은 각 채널에 **RGB 가장 밝은 채널의 35% 를 하한으로 까는 「35% 채널 바닥」** 을 깐다. 예를 들어 「순수 빨간 광원」 은 정점에서 (1.00, 0.35, 0) 으로 들려서 보간·리프트를 탄다. 횃불 오렌지가 게임 안에서 「빨강이라기보다 하얀 핑크」 로 보이는 것은 이 때문이다. 난색 토치 계열 레시피 (R9.1) 의 채도는 이 기본 동작을 기준으로 조정하면 좋다.
- 조명의 합성은 가산이 아니다. 엔진 내부에서는, 35% 바닥을 깐 블록 빛과 `mix(앰비언트색, 스카이색, skyLight)` 로 만든 하늘 빛의 **max** 를 취하고, 손에 든 빛 (앰비언트 부스트 적용 후) 를 더 max 로 얹는다. 이 합성에 쓰이는 채널값은 **리프트 후**의 값이다 — 엔진은 훅 입력에 도착하는 것과 같은, 리프트 곡선을 거친 `terrainLightLevels` 로 합성하며, 이는 v2와 v3 모두 마찬가지다. 따라서 `blockLight` 와 `skyLight` 는 서로 상쇄하지 않고, 어두운 쪽의 기여는 버려진다 — 하늘 빛을 약하게 해도 블록 빛이 지배적인 곳은 거의 어두워지지 않는다. 노출이나 감쇠의 레시피는 이 구조를 전제로 설계한다 ([제6부](06-implementation.md) §19 의 국소광 보호는 이 구조에 대한 보상이다).


손에 든 빛 (`heldLight`) 의 범위는 가장 밝은 빛색 채널을 따르며 (최대 15 블록), `dist^0.75` 전처리가 들어가고, 같은 35% 채널 바닥이 적용되며, `l.heldLight` 는 앰비언트 부스트 **전** 값이다. 원뿔 감쇠는 엔진의 light 모듈에서 복원했다: 빔의 각도 감쇠는 `1 − 0.5 × (smoothstep(0.12, 0.65, t) + smoothstep(0.62, 0.95, t))` 이며, 여기서 `t` 는 원뿔 축에서 잰 정규화 각도다 (0 = 중심, 1 = 가장자리). 도달 거리는 `(rangeOverride > 0 ? rangeOverride : 가장 밝은 채널) × 원뿔 감쇠` 이고, `rangeOverride` 는 held-light 색의 alpha에서 읽는다. 도달 거리 안에서 override는 `(range − dist) / range` 로 감쇠하고, 기본값은 (전처리된) 거리를 채널별로 뺀다. 그다음 35% 바닥, 15로 나누기, 리프트 곡선, 마지막으로 앰비언트 부스트가 이어진다. 커스텀 아이템에는 `spotlightRange` (사정) 와 원뿔각을 정할 수 있어, 「들고 있는 동안 지향성 빔을 쏜다」 모드가 존재하며 그 원뿔은 카메라를 따라간다. 팩측에서는 빔 방향을 알 방법이 없다.

커스텀 블록에는 `skyLightEmission` (0~15) 이 달릴 수 있어, **blockLight BFS 와는 별개로 skyLight 채널 자체를 주입할 수 있다**. R9.12 같은 「skyLight 임계값으로 낮/그림자를 판별하는」 팩은, 인공광으로 skyLight 가 들려 있는 월드에서는 오판할 수 있다. 배포 팩은 blockLight 와 조합해 판정하는 편이 견고하다.

## 27. 파이프라인 세부

- **surface 훅은 alphaTest 의 「앞」 에서 돈다**: `out.alpha` 가 그대로 discard 판정에 쓰인다. 컷아웃 소재 (풀·잎) 에서는 디더 패턴으로 녹는 듯한 이펙트를 만들 수 있다 (레시피 R-C). 액체 (블렌딩) 에서는 `out.alpha` 가 실제 투명도가 된다 (레시피 R-D). 통상 불투명 지형에서는 alpha 가 끝내 무시된다
- **`l.ambient` 의 내용**은 `material.ambient × sceneAmbient` 로 소재마다 다른 값이다. 씬측은 그래픽 설정 「Ambient Lighting Intensity」 (기본 0.5) 에 직결되어 있으므로, 기본값 때려박기를 하지 않는다
- **씬의 방위광은 2등 구성**: 주광 (방향은 스카이 설정의 태양 위치에 유래·강도 1.0) 과 필광 (방향 `[-0.5, -1, -1]`·강도 0.35) 의 Lambert 합이 `l.directional` 로 도착한다. 필광은 방향이 아래를 향하므로 윗면에는 기여하지 않고, 아래를 향한 면 (동굴 천장 등) 을 집는다. 지형이 고려하는 것은 `_initScene` 으로 추가된 등뿐이며, 기동 후에 씬에 추가한 등은 지형·블록 모델에서 무시된다 (공식 경고 문구가 있다)
- **`bloxdTime()` 의 정체는 `performance.now()`**: `time() { return performance.now() / 1e3 % 3600 }` 이며, 브라우저 기동 경과 시간을 1시간으로 감은 값이다. 게임 안 낮밤이나 월드 경과 시간과 무관하다. 게임 안 시계와 동기된 애니메이션을 만들고 싶으면, 낮밤 사이클 구현 월드의 `bloxdSunDirection()` 방위각에서 추정하는 것이 현실적이다
- **헤더 함수는 uniform 하나를 읽는다**: 엔진은 `@group(3) @binding(0)` 에 64바이트 uniform (time / originOffset / sunDirection / eyePosition 의 4슬롯·little-endian) 을 두고 있으며, `bloxdTime()` / `bloxdOriginOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` 은 각 슬롯의 읽기에 해당한다. 팩에서 이 uniform 을 고쳐 쓸 수는 없고, 팩과 엔진의 WGSL은 같은 모듈로 합성되므로, 같은 group/binding 을 자신이 선언할 수도 없다. (v3에서는 두 슬롯의 이름이 바뀌었다 — `seconds` / `renderOffset` 이며 `bloxdSeconds()` / `bloxdRenderOffset()` 으로 노출된다 — 또한 `@group(3) @binding(1)` 에 씬 깊이 텍스처가 추가되었다. [제9부](09-apiv3.md) §41과 §51 참조)
- **정점 데이터는 메셔 (Web Worker) 가 만든다**: 블록의 지형을 1정점 28바이트 (아틀라스 있음은 32바이트) 의 인터리브로 정리하고, 위치 = float32×3 / 법선 = 8bit 신호 정수×4 / 색 = 8bit 준정수×4 (`s.colour` 의 실체 — tint × AO 가 메셔 시점에 8bit 로 구워져, 팩에서 분리·복원은 원리적으로 불가) / UV = float32×2 / atlasIndex = float32. 라이트 레벨만은 독립된 4바이트 정점 버퍼로 운반된다 ([제7부](07-internals.md) §26·[제2부](02-api.md) §11). 정점은 청크 단위의 instancing 으로 그려진다
- 로딩 때 청크 경계의 미세 체크무늬는 엔진의 화면 공간 Bayer 4×4 디더 청크 페이드이며, 팩 유래 버그가 아니다 (그래픽 설정의 `chunkFadeIn` 을 끄면 무효화할 수 있다)
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

1. **통상 월드** (default 스카이박스·오버라이드 없음) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`·기본색
2. **space 계열 스카이박스 월드** — bloxdSunDirection() = 0. `sunPresent` 분기의 겉모습
3. **`visionMinLightColour`·`skyLightColourOverride` 를 정한 커스텀 월드** — 어두운 곳과 색이 들려 있는 경우

- 주된 변동원: `lightingOverride` (조명 강제) / `skyLightColourOverride`·`ambientLightColourOverride` (hex 교체) / `visionMinLightColour` (시인 최암색. 구현은 `uSkyLightColour` 와 `uAmbientLightColour` 쌍방에의 성분별 max 이며, Night Vision 이 사용한다. 「동굴을 깜깜하게」 계열은 예상보다 어두워지지 않고, 하늘색 자체도 바닥 올림이 된다) / `heldLightColourOverride`·`Range`·`ConeAngle` / `fogChunkDistanceOverride`·`fogColourOverride`·`fogOnSkybox` / `skyBox` (bloxdSunDirection() 유무). `uSkyLightColour` 기본 = (1,1,1) 흰색, `uAmbientLightColour` 기본 = (0.25,0.25,0.30). `l.ambient` 의 씬측 = 그래픽 설정 「Ambient Lighting Intensity」 (기본 0.5). `l.fogVisibility` 는 플레이어의 포그/청크 거리 설정을 따라간다. 그 외에 `cameraTint` (화면 전체로의 RGBA 틴트) 와 `proximityFadeDistance`·`proximityFadeMinOpacity` (엔티티의 카메라 근접 페이드) 도 월드 설정 유래의 변동 요인이며, 특히 `cameraTint` 는 팩 출력 위에 얹히는 최종 처리이다. 이것들의 다수는 스크립트 API (`serverOption`) 경유로도 설정할 수 있어, 게임 실행 중에도 갱신될 수 있다.

## 29. 디버깅 수단

- URL 파라미터 `?renderer=lite` — Lite (WebGPU) 렌더러를 강제 (`webgl2` / `babylon` 도 가능. `babylon` 은 webgl2 의 옛 이름 에일리어스). 우선순위는 URL 파라미터 > localStorage 의 `bloxdRenderer` > 설정 화면 > 기본 (webgl2). 무효값은 경고와 함께 무시된다. URL 이나 localStorage 에 오버라이드가 남아 있으면, WebGPU (lite) 가 필요한 국면에서 실패해 「needs the new WebGPU renderer, so remove the renderer override...」 가 나올 수 있다 ([제5부](05-troubleshooting.md) §17)
- URL 파라미터 `?vconsole` — 화면 안 콘솔 (VConsole) 기동. 모바일 실기 검증에 요긴하다
- URL 파라미터 `?drawcalls=1` — 그리기 통계의 디버그 패널이 추가된다. 디버그용 콘솔에서 게임 오브젝트를 고르거나, `drawCalls()`·`why()`·`configureDrawCallWatching()` 를 써서, 팩에 한정되지 않은 대규모 기믹의 중복 그리기 (오버드로) 나 1 도면당 약 6.5만 정점의 상한 도달을 확인해, 성능 부족의 원인을 가를 수 있다
- 콘솔에는 `noa-engine v0.33.0` 과 `Renderer: lite from <소스>` 가 나온다 — 그리기 경로 오진단 방지에 먼저 이것을 확인할 것
- WebGPU 렌더러는 팩 적용 중 「강제 ON」 으로 잠긴다. 「Disable Block Texture Atlas」 설정도 잠기며 (아틀라스 ON 유지), WebGPU 미대응 환경에서는 애초 팩이 적용되지 않는다. 배포 페이지에 「WebGPU 대응 브라우저가 필요」 라고 쓰는 근거는 여기이다
- 블록 텍스처의 실체는 2D 배열 텍스처 (`texture_2d_array`) 로, 지형의 샘플러는 nearest 이며 repeat 로 설정되어 있다. 더 나아가 메셔는 재질·AO·라이트가 일치하는 면을 1개의 구형으로 묶는 (**greedy meshing**) 때문에, 정점의 UV는 병합면 위에서는 타일 폭을 넘을 수 있다 (가장자리에 0.0015 의 인셋). 반복 측은 하드의 repeat 어드레싱이 담당하므로, 병합면은 심 없이 보인다. 단 `vUV` 를 기준으로 절차적 디테일을 얹으면, 병합면의 경계에서 불연속이 될 수 있으므로, 월드 위치 (`s.position` + `bloxdOriginOffset()`) 를 기준으로 설계하는 것이 안전하다
- 게임 참가 때마다 런타임 재검증 (`checkCompilation`) 이 돌아, 실재하는 전 지형 소재를 브라우저 WebGPU 로 실컴파일한다 (설정 화면의 정적 검증보다 엄격). 여기서 떨어지면 팩은 그 게임에서 제외된다

## 30. 게임별 적용 모드 (`shaderPackPolicy`)

여기서 §7 의 「allow / strict」 가 타이틀 단위 설정임을 확정한다. 게임 정의 측의 `shaderPackPolicy` 이 명시적으로 `"allow"` 인 타이틀만 full 모드 (vertex 훅, `discard`, 지형 `alpha`) 로 움직이고, 지정이 없는 (또는 allow 이외의) 타이틀은 strict 가 된다 — `BLOXD_STRICT` 가 정의되고, 가드 내부의 코드는 자동으로 무효화된다. 이 판정은 팩 측에서 고를 수 없으므로, 어느 타이틀에서 무엇이 움직이는지 아는 것이 배포의 전제가 된다.

- 근거 빌드: `szby6g.main.94a7596c.js` (2026-10-17 시점의 정식 배포). 전체 111 게임 정의를 정적으로 분석한 결과 **allow 26 엔트리 (12 타이틀) / strict 85 엔트리**. 같은 12개의 allow 리터럴이 같은 12개 타이틀에서 v3 프로덕션 번들 (`3ymzdd`, 2026-10-20) 에서도 변경 없이 재확인되었다 — 아래 목록은 v3에도 그대로 적용된다.
- `shaderPackPolicy` 보다 상위의 판정으로서 배포 채널 측의 게이트 (`canUseShaderPacks` 상당) 도 있어, 외부 포털 경유의 배포 (Coolmath Games 판 등) 에서는 `shaderPackPolicy` 의 판정에 이르기 전단에서 셰이더 팩 기구 자체가 무효화될 수 있다. 이하의 allow / strict 의 판별은 bloxd.io 본가 Web판의 해석에 근거한다.
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

[← 이전 부](06-implementation.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](08-apiv2.md)

[← 이전 부](07-internals.md)·[매뉴얼로 돌아가기](README.md)

# 제8부: API Version 2 마이그레이션 가이드

> 현행 게임은 2026-10-26부터 `apiVersion: 4` 을 요구하며 로드 시 v1/v2/v3 팩을 거부한다 — 아래 내용은 v2 사양에 기반한 기술이다. 배포 전에 [제9부](09-apiv3.md) 와 [제10부](10-apiv4.md) 의 변경 사항을 확인할 것.

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

`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` 3개 구조체 모두에 `blockId: u32` 가 추가됐다. **면이 속한 블록의 ID** (0~65535) 로, 같은 면 안에서는 일정 (`@interpolate(flat)` 으로 전달). 텍스처 색에 의존하지 않는 블록 종류 식별에 쓴다. 단 ID와 블록 종류의 대응표는 엔진 내부에 있어 팩에서는 참조할 수 없으므로, **어느 ID가 무슨 블록인지는 월드 안에서 실측하거나 아래의 참고 자료로 확인**한다. 내부에서는 이 ID 는 정점색의 α (하위 8bit) 와 법선의 w (상위 8bit) 의 합계 16bit 에 각인되어 운반되며, 상한 65535 는 이 경로 폭에 유래한다. blockId 시스템 자체는 액티브한 셰이더 팩이 존재할 때에만 유효화된다 (팩 없이는 와이어의 목적지는 패딩인 채이지만, 제2부의 구조체 정의상 이 차이는 관측할 수 없다).

**참고**: 필자가 게임 내 엔트리 목록을 [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data)에 공개했다 (`entries.json`: id ↔ 블록 이름 대응표. `Furnace|meta|rot2` 같은 회전/meta 변종도 별개 ID로 수록). 대응은 게임 업데이트로 바뀔 수 있으므로 최종 확정은 실기기에서 확인할 것.

자주 쓰는 블록의 예 (entries.json 에서, 2026-10-18 시점. id 가 낮은 지형계만 발췌):

| ID | 블록 이름 | ID | 블록 이름 |
|---|---|---|---|
| 0 | Air | 15 | Maple Wood Planks |
| 1 | Unloaded | 28 | Stone |
| 2 | Dirt | 29 | Messy Stone |
| 3 | Messy Dirt | 31 | Smooth Stone |
| 4 | Grass Block | 126 | Water |
| 5 | Sand | 128 | Bricks |
| 6 | Clay | 139 | Ice |
| 7 | Gravel | 147 | Bedrock |
| 8 | Snow | 149 | Cactus |
| 9 | Maple Log | 1491 | Lava |

entries.json 에는 도구 등의 비블록 항목도 수록되어 있지만, 지형·액체의 훅에 닿는 것은 블록계 id 이다.

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

### R-G. blockId 의 실측 — 비트 평면 표시 팩

대응표에 실리지 않은 블록의 id 를 월드 안에서 조사하는 디버그 레시피. 선두의 `plane` 을 `0, 1, 2, …` 로 바꿔 가며, 조사하고 싶은 블록의 면 색을 읽는다.

```wgsl
const plane: u32 = 0u;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let d = (s.blockId >> (plane * 3u)) & 7u;
    var palette = array<vec3f, 8>(
        vec3f(0.0, 0.0, 0.0), vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 1.0, 0.0),
        vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 1.0));
    out.colour = palette[d];
    return out;
}
```

면의 색은 blockId 의 3비트를 그대로 RGB 로 나타낸다 (흑 = 0 / 적 = 1 / 녹 = 2 / 황 = 3 / 청 = 4 / 마젠타 = 5 / 시안 = 6 / 백 = 7). 1회의 관찰로 8진수 1자리를 읽을 수 있다. p0 → p3 순으로 3, 2, 7, 2 로 읽혔다면, 위 자리부터 나열한 8진 2723 = 1491 이 id 가 된다 (Lava). id 가 낮은 지형계는 p0 과 p1 의 2회로 족하다. surface 훅만으로 구성되어 있으므로, strict 타이틀에서도 움직인다.

### R-H. 잎만 흔들기 — blockId 에 의한 vertex 훅의 한정

R7 의 바람 레시피 ([제3부](03-recipes.md)) 는 지형 전체를 물결치게 하지만, vertex 훅에서도 `blockId` 를 읽을 수 있으므로, 대상을 잎 블록만으로 한정할 수 있다. id 일람과 WGSL 용 배열은 다음과 같다 (2026-10-18 시점의 실측. Pine / Aspen / Maple / Jungle / Plum / Cedar / Palm / Autumn Maple / Fallen Maple / Pear / Cherry / Fallen Cherry / Spectral / Mango / 과실 변종 / Autumn Aspen 의 22종):

```wgsl
const LEAF_IDS = array<u32, 22>(
    100u, 101u, 102u, 103u, 491u, 492u, 493u, 653u, 655u, 911u,
    1226u, 1227u, 1636u, 1969u, 2019u, 2020u, 2021u, 2022u, 2023u,
    2024u, 2025u, 2085u);

// vertex 훅은 strict 타이틀에서 자동 무효 (§36 참조)
#ifndef BLOXD_STRICT

fn sp_isLeaf(id: u32) -> bool {
    for (var i = 0u; i < 22u; i++) {
        if (LEAF_IDS[i] == id) { return true; }
    }
    return false;
}

fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    if (sp_isLeaf(v.blockId)) {
        let wp   = bloxdWorldPosition(v.position);
        let t    = bloxdTime();
        // 변위는 월드 위치의 매끄러운 함수로 한다. 월드 위의 같은 지점을 가리키는
        // 공유 정점이 같은 값으로 움직이므로, 면이 뜯기지 않는다 ([제3부](03-recipes.md) R7 도 같은 원리)
        let sway = sin(wp.x * 0.9 + t * 1.7) * cos(wp.z * 0.7 + t * 1.1);
        out.position.x += sway * 0.045;
        out.position.z += sway * 0.030;
    }
    return out;
}

#endif
```

- id 일람은 엔진의 갱신으로 늘어난다 (실측에서도 새 빌드로 50종의 블록이 추가됐다). 계속 쓰는 경우는 [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) 나 R-G 의 비트 평면 표시로 추가분을 조사해 배열에 더할 것
- `Fallen Maple Leaves` (655) / `Fallen Cherry Leaves` (1227) 는 지면에 까는 비고체의 깔개 잎이다. 흔들면 지면에서 뜨는 것처럼 보이므로, 배열에서 빼서 제외하는 것도 하나의 선택
- strict 타이틀에서는 vertex 훅이 통째로 무효가 되지만, 위의 가드가 있으면 「흔들림이 멎을 뿐」 이고, 프래그먼트 측의 효과는 계속 산다

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

응용: 두께 기반 흡수·산란, `behind.position` 에서의 바닥 월드 좌표에 의한 물결·코스틱풍 무늬 투영, `found=false` 에서의 하늘과 가림 구별에 의한 수면의 하늘 반사, 깊이에 의한 거품과 탁함의 단계 부여. 참고로 깊이 복사 파이프라인 구축에 실패한 경우는 「안쪽에 아무것도 없음」 으로 안전하게 열화된다. 깊이 텍스처는 페이지의 렌더러 생성시에 「액티브한 팩이 깊이를 읽는가」 로 준비가 확정되므로, **깊이를 읽는 팩을 쓸 때는 반드시 페이지 재읽기를 끼운다**. 팩을 유효화한 채 재읽지 않고 깊이가 요구된 경우, 콘솔에 `…reads scene depth on a page that didn't turn it on` 이라는 경고가 1회만 나오고, 깊이는 1×1 의 대체 텍스처로 바뀌므로 `bloxdOpaqueBehind()` 는 항상 `found = false` 를 반환한다.

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

[← 이전 부](07-internals.md)·[매뉴얼로 돌아가기](README.md)

[← 이전 부](08-apiv2.md)·[매뉴얼로 돌아가기](README.md)

# 제9부: API Version 3 마이그레이션 가이드

> **2026-10-26 대체됨: 현행 API는 버전 4** — v3 팩은 여기서 v2에 대해 서술한 것과 똑같이 로드 시 거부된다. 이 부를 적용한 뒤 [제10부](10-apiv4.md) (v3 → v4: 텍스처 API, `fogAlpha` 개명, `bloxdFragmentBlockPosition`, `hit`) 를 적용할 것.

대상 빌드: `3ymzdd.main.fae4743f.js` — **2026-10-19부터 정식 프로덕션 빌드**. bloxd.io가 프로덕션에서 제공하는 번들은 이 부를 처음 조사할 때 사용한 프리프로드 배포와 바이트 단위로 동일하다 (md5로 확인했으며, 메인 번들과 셰이더 팩 청크 모두 그러하다). 따라서 여기 적힌 내용은 그대로 프로덕션에 적용된다. 팩 모델은 v2 형태를 유지한다 (`pack.json` 필드, 로더 제한, uniform 레이아웃이 모두 같다).

이 가이드의 제1부~제7부는 여전히 v2 기준으로 작성되어 있다. 이 부는 [제8부](08-apiv2.md)와 같은 순서로 v2 → v3 이전 포인트와 v3의 새 기능을 모은다. 변환은 대부분 기계적이지만 (§47), 실제 동작을 바꾸는 변경은 하나뿐이다 — 기본 light가 이제 emission을 포그로 감쇠시킨다 (§43) — 그리고 `blockId`가 `blockFlags`로 전면 교체되었으므로 (§42), 배포 전에는 반드시 게임 내 컴파일로 확인할 것.

이번 개정에서 새로 추가된 **§49–§54**는 이전 자체를 넘어 프로덕션 빌드에서 복원한 엔진 내부로 들어간다 — Lite 렌더러가 실제로 훅을 호출하는 방식, 실제 4모드 포그 함수, `bloxdOpaqueBehind()`의 정확한 구현, 블록 등록에서 훅까지 이어지는 blockFlags의 완전한 전달 경로, 그리고 실측 헤더 해시가 포함된 검증 파이프라인이다. 이는 현재까지 팩 시스템에 관해 공개된 가장 깊은 사실이며, 다른 가이드가 아직 미해결로 남겨 둔 여러 질문에 답한다.

## 40. v2 팩의 운명 (먼저 결론)

**2026-10-19 업데이트: v3가 프리프로드를 떠나 이제 정식 사이트가 제공하는 버전이 되었다.** v2로 배포된 모든 팩을 포함해, 롤아웃 전에 저장된 모든 v2 팩은 아래 설명대로 프로덕션에서 실패한다. 따라서 오늘 팩을 배포하는 사람에게 §47의 이전은 더 이상 선택이 아니다.

이 빌드는 manifest의 `apiVersion`이 **3과 엄밀히 일치**할 것을 요구하며, **v2/v3 병행 지원은 없다**. v2 팩은 로드 시 「API 버전 불일치」 메시지로 거부된다 (i18n 키와 플레이스홀더 텍스트):

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>
> `loadNoApiVersion`: "pack.json needs \"apiVersion\": {{version}}."

저장된 팩은 v2 라이프사이클을 그대로 따른다 ([제8부](08-apiv2.md) §31): 모든 빌드는 엔진 헤더의 해시를 계산하고, 엔진 업데이트는 저장된 팩을 자동으로 「재확인 필요」로 표시하며, `apiVersion`이 현재 버전이 아닌 저장 팩은 오류를 내는 대신 실행되지 않음으로 표시된다 (위 상태 메시지가 대체 팩을 가리킨다).

## 41. pack.json과 uniform 버퍼 (변하지 않는 부분)

- 필수 manifest 필드는 그대로다: `{ apiVersion, name, author }`.
- 로더 제한도 그대로다: 32MB zip / 1024개 항목 / `.wgsl` 파일 256개 / 코드 총량 256KB / manifest 64KB.
- 엔진 uniform 블록의 형태는 그대로다: `@group(3) @binding(0)`, 64 B, 선언 순서대로 시간, 렌더 오프셋, 태양 방향, 눈 위치를 담는다. 레이아웃은 `minBindingSize: 64`로 등록되며, 정확한 필드 배치는 `seconds: f32` @ 바이트 0, `renderOffset: vec3i` @ 16, `sunDirection: vec3f` @ 32, `eyePosition: vec3f` @ 48이다. 내부 필드 이름 두 개가 바뀌었다: `time` → `seconds`, `originOffset` → `renderOffset`. **바이트 레이아웃은 v2와 동일**하며, 팩 코드에는 어차피 영향이 없다. 팩은 이 uniform을 직접 이름 붙일 수 없기 때문이다 (엔진 헤더가 엔진 제공·읽기 전용으로 표시하며, 「팩은 이름을 붙일 수 없다」). 계속 헤더 함수 `bloxdSeconds()` / `bloxdRenderOffset()`을 사용할 것.
- 팩의 group 3에는 문서화된 두 번째 점유자가 생겼다: `@group(3) @binding(1)`은 `bloxdOpaqueBehind()`가 읽는 씬 깊이 텍스처다 (전체 구현은 §51). 64 B uniform은 binding 0에 그대로 있으며, 팩은 여전히 어느 binding도 이름 붙일 수 없다.

## 42. blockId가 blockFlags로: 블록별 머티리얼을 비트 플래그로 (핵심)

세 훅 입력 구조체 모두에서 (`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`) v2 필드 `blockId: u32`가 `blockFlags: u32`로 **교체**되었다. 이 필드에 대한 엔진 설명: *「이 면이 어떤 종류의 블록인지: `bloxdBlockFlag*` 비트이며, 면 전체에서 같다.」* 이제 엔진이 머티리얼 데이터를 직접 제공하므로, 숫자 id 범위로 머티리얼을 추측하거나 월드 내 id 표를 유지하던 v2 방식 ([제8부](08-apiv2.md) §34)은 필요 없다.

비트는 이름 있는 상수로 공개된다:

```wgsl
// (blockFlags & bloxdBlockFlagRock) != 0 으로 검사한다.
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| 값 | 상수 | 의미 (엔진 주석 요약) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | 완전히 불투명 — 나뭇잎과 얼음도 포함. 유리, 물, 용암, 스포너, 고스트·투명 블록은 제외. |
| 2 | `bloxdBlockFlagEmissive` | 네온, 포털, 램프, 용암, 비컨처럼 블록 광을 낸다. 빛나는 광석도 아무리 약해도 포함. |
| 4 | `bloxdBlockFlagVegetation` | 나뭇잎, 그리고 잔디 블록의 잔디 — 잔디 블록은 흙이기도 하다. 선인장, 버섯 블록, 건초는 제외. |
| 8 | `bloxdBlockFlagDirt` | 흙과 토양, 잔디 블록 포함. Rocky Dirt는 암석이기도 하다. |
| 16 | `bloxdBlockFlagSand` | 모래, 붉은 모래, 그리고 모든 사암 — 사암은 암석이기도 하다. |
| 32 | `bloxdBlockFlagRock` | 돌과 그 종류, 안산암, 섬록암, 화강암, 자갈, 광석, 사암, Rocky Dirt, 기반암, 흑요석, 마그마. |

여러 머티리얼로 이루어진 블록은 **각각** 일치하는 플래그를 모두 가진다 (엔진 자신의 예: 사암은 모래이자 암석이므로 둘 다 가진다). 나뭇잎은 vegetation이지만 dirt는 아니고, 잔디 블록은 vegetation과 dirt를 동시에 가진다.

vegetation / dirt / sand / rock 플래그는 블록의 등록된 **표시명**으로부터 부여된다 (opaque / emissive는 대신 엔진 자체의 불투명도·발광 데이터에서 온다): 이름이 `Leaves`로 끝나거나 `Grass Block`인 것은 vegetation; `Dirt` / `Soil` 이름 (그리고 모든 `Grass Block`)은 dirt; 정확히 `Sand`와 `Red Sand`, 그리고 `Sandstone`을 포함하는 모든 이름은 sand; `Stone` / `Andesite` / `Diorite` / `Granite`를 포함하는 이름, 모든 `Ore`, 그리고 Yellowstone, Gravel, Bedrock, Obsidian, Magma, Rocky Dirt (와 사암)는 rock이다.


### 정확한 이름 규칙 (모든 블록의 플래그를 직접 도출하기)

네 머티리얼 비트는 블록의 등록된 표시명에 대한 고정 분류기에서 나온다. 베리언트 이름(`|` 뒤의 모든 것)은 먼저 잘라내므로, 베리언트는 기본 블록의 플래그를 물려받는다. 그다음:

| 비트 | 규칙 (잘라낸 이름에 대해 평가) |
|---|---|
| vegetation | 이름이 ` Leaves`로 **끝나거나**, ` Grass Block`으로 **끝난다** |
| dirt | 이름이 정확히 `Dirt`이거나, ` Dirt` 또는 ` Soil`로 **끝나거나**, ` Grass Block`으로 **끝난다** |
| sand | 이름이 정확히 `Sand` 또는 `Red Sand`이거나, `Sandstone`을 **포함한다** |
| rock | 이름이 정확히 `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt` 중 하나이거나, `Sandstone`을 **포함하거나**, ` Ore`로 **끝나거나**, `Stone` / `Andesite` / `Diorite` / `Granite`를 독립 단어로 포함한다 |

Yellowstone이 명시된 이유는 `Stone`이 `Yellowstone` 안에서 독립 단어가 아니기 때문이다. Opaque와 emissive는 이름에서 오지 **않는다** — 엔진 자체의 불투명도와 블록 광 방출 데이터에서 오므로, 이 규칙으로는 도출할 수 없다.

출처: 엔진의 이름 분류기 (모듈 28537, 번들 `3ymzdd`); 이름이 있는 7,861개 블록 전체에 대해 검증했다, 2026-10-20.

예 — 머티리얼별로 블록에 색을 입힌다:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

v2 레시피에 미치는 영향: R-H의 22개 항목 나뭇잎 id 배열 ([제8부](08-apiv2.md) §34)은 `(blockFlags & bloxdBlockFlagVegetation) != 0`으로 줄어든다. [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data)의 id ↔ 블록 이름 대응표는 셰이더 이외의 용도에는 여전히 유용하지만, 머티리얼 스타일링을 위해 월드 내에서 조회할 필요는 없어졌다.

### 잔디 없는 나뭇잎 (모두가 묻는 질문)

`vegetation`만 사용하면 나뭇잎**과** 잔디 블록의 잔디를 모두 일치시킨다. 잔디 블록은 `dirt`도 가지기 때문이다. dirt를 제외하면 나뭇잎만 흔들 수 있다 — 엔진의 필드 주석이 명시하는 판별식은 다음과 같다:

```wgsl
// 나뭇잎만: dirt가 없는 vegetation. 잔디 블록은 vegetation AND dirt.
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// 잔디 블록만 (지형 표면의 잔디 면):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

실제 레지스트리로 확인했다 (2026-10-20, 번들 `3ymzdd`):
`vegetation && !dirt`는 정확히 45개의 나뭇잎 등록 (22개 기본 타입 —
v2 R-H id 배열이 측정한 것과 같은 22개)과 일치하고, `vegetation && dirt`는 정확히
8개의 잔디 블록과 일치한다. 어느 방향으로도 예외는 없다 — 레지스트리 집계는 해당 빌드 시점 기준이며, 새 블록이 추가되면 규칙은 그대로인 채 숫자만 늘어난다. `vertex.normal`
(위/아래)과 조합하면 면을 고를 수 있다. 예를 들어 잔디 블록의 윗면만 고른다.

## 43. 함수 이름 변경과 의미 변화

| v2 | v3 | 비고 |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | 페이지 로드 후 경과 초 (f32 정밀도 주의는 아래) |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | 같은 양: 렌더 위치 + 이 값 = 월드 위치 |
| `const bloxdTimeWrap: f32 = 3600` | **삭제** | 주기는 팩 쪽에서 직접 정의한다 |
| `engineColour` (`BloxdLightIn` 안) | **삭제** (14 → 13 필드) | `litColour` + 포그로 다시 구성한다 |
| 훅 매개변수 `v` / `s` / `l` | `vertex` / `surface` / `light` | 템플릿 표기이며 시그니처는 그대로 |

- **`bloxdSeconds()`** — 페이지 로드 후 경과 초. f32에서는 처음 4.5시간 동안 1ms보다 작은 단위로, 9~18시간 구간에서는 약 4ms 단위로 증가한다. 헤더는 `bloxdSeconds() % period` 관용구를 권장한다. 이는 0에서 `period`까지 세다가 다시 시작하므로, 삭제된 wrap 상수를 깔끔하게 대체한다.
- **`bloxdRenderOffset()`** — 블록 단위: 「렌더 위치에 이 값을 더하면 월드 위치가 된다.」 플레이어가 이동하면 이 값도 바뀌므로 렌더 위치는 플레이어 가까이에 유지되고, 그만큼 정밀하다. 가이드 전체에서 v2 문장에서 「noa 로컬 오프셋」이라고 부르던 값은 이제 일관되게 **렌더 위치** / 렌더 오프셋이라고 부른다. `bloxdOriginOffset()`이 반환하던 것과 같은 양이다.
- **`bloxdTimeWrap` 삭제** — 3600초에서 시간을 wrap하던 팩은 이제 자체 상수를 선언한다. 예: `const timeWrap: f32 = 3600.0;` 그리고 `% timeWrap`.
- **기본 light의 의미 변화** — v2의 기본값은 `engineColour + emission × fogVisibility`였고, v3의 기본값은 `bloxdApplyFog(litColour + emission, light)`로 구성된다. **이제 기본값 안에서 emission이 포그로 감쇠**되므로, 합성된 출력 전체가 함께 포그 블렌드를 통과한다. 이전 표:

  | v2 식 | v3 이전 |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // v2의 `l.engineColour + s.emission * l.fogVisibility`를 v3로 이전:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **이름과 의미가 그대로인 것**: `bloxdEyePosition()`, `bloxdSunDirection()`, `bloxdFaceBlock()`, `bloxdApplyFog()`, `bloxdWorldPosition()`.

## 44. 새 헤더 상수: `bloxdPi`와 `bloxdTau`

```wgsl
// 반 바퀴와 한 바퀴, 라디안 단위.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

삼각함수 계산에 유용하고, 팩이 더 이상 π를 하드코딩할 필요도 없다. 이름 재사용에 주의할 것: 같은 이름의 팩 로컬 상수는 이제 헤더의 중복 식별자 검사와 충돌한다. 코드에서 `bloxdPi` / `bloxdTau`를 다시 선언한 부분이 있으면 삭제하거나 이름을 바꿀 것.

## 45. 6훅 템플릿 (액체 훅 공식 공개)

빌드와 함께 공개된 기본 팩 텍스트는 이제 **여섯 훅 모두**를 제공한다 — terrain / liquid × vertex / surface / light이며, 각각 엔진 기본값을 반환한다. 엔진 주석이 소개한다: *「모든 훅은 엔진 기본값을 반환한다. 훅을 복사해 출력을 바꾸면 셰이더 팩을 만들 수 있다.」*

```wgsl
// 모든 훅은 엔진 기본값을 반환한다. 훅을 복사해
// 출력을 바꾸면 셰이더 팩을 만들 수 있다.

// strict 게임은 지형을 그대로 둔다. 가드가 없으면 이 훅은
// 그런 게임에서 셰이더 팩 전체를 꺼 버린다.
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// 물은 이 훅들을 사용한다. 삭제하면 물은 대신 terrain 훅을 사용한다.
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdLiquidLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

- 훅 주석이 액체 규칙을 직접 말한다: **물에는 세 훅이 필요하며, 삭제하면 물은 terrain 훅을 재사용한다** (v2에서 알려진 폴백 동작이며, 이제 [제8부](08-apiv2.md) §36의 내용이 템플릿 자체에 적혀 있다).
- `bloxdLiquidVertex`는 `bloxdTerrainVertex`와 같은 `#ifndef BLOXD_STRICT` 가드 안에 있다 — 가드가 없으면 terrain 쪽 vertex 효과와 마찬가지로 strict 게임에서 팩 전체를 꺼 버린다.
- 템플릿 표기는 이제 전체 매개변수 이름 `vertex` / `surface` / `light`를 쓴다 (v2 템플릿은 짧은 `v` / `s` / `l`이었다). 자신의 코드에서 매개변수 이름은 자유이며, 시그니처만 중요하다.

## 46. 베리언트 매트릭스: 프로그램 축과 매크로 변화

베리언트는 **strict × lighting × program** 매트릭스 위에서 생성된다 — v2와 같은 8가지 조합이지만, 이제 terrain / liquid가 매트릭스의 명시적 축이다. 베리언트 이름은 `allow|strict · unlit|lit · terrain|liquid`로 이를 드러내며, UI에서는 ``terrain`` / `liquid`, `strict` / `non-strict`, `lighting on` / `lighting off`로 표시된다 (오류 표시에는 `"(only in {{variants}})"`가 덧붙을 수 있다).

| 매크로 | 정의되는 곳 |
|---|---|
| `BLOXD_STRICT` | strict 베리언트 (두 프로그램 모두) |
| `BLOXD_LIGHTING` | lighting-on 베리언트 (두 프로그램 모두) |
| `BLOXD_ALPHA` | **모든 액체 베리언트**에 더해 non-strict **terrain** 베리언트 |
| `BLOXD_SCENE_DEPTH` | **모든 액체 베리언트** |

v2 규칙 ([제8부](08-apiv2.md) §36)과 비교해 작성자에게 바뀌는 점은 두 가지다:

- **`BLOXD_ALPHA`는 v2에서 그대로다.** 베리언트 생성기는 `"liquid"!==program&&strict||push("BLOXD_ALPHA")`라는 줄을 그대로 담고 있다 — JS 연산자 우선순위상 push를 건너뛰는 경우는 *(terrain **이면서** strict)* 하나뿐이므로, 매크로는 **모든 액체 베리언트 (strict든 non-strict든)와 non-strict terrain**에 정의되고, strict terrain만 이를 생략한다. 액체 쪽 `#ifdef BLOXD_ALPHA` 코드는 예전과 똑같이 컴파일되며, §49의 alpha 되쓰기 (liquid 프로그램이나 non-strict 베리언트에 이어 붙는다)가 이 집합과 정확히 일치한다.
- **`BLOXD_SCENE_DEPTH`는 액체 베리언트에서 항상 정의된다.** 따라서 깊이 사용은 v2와 똑같이 액체 쪽에서 가드 없이 괜찮고 (§35), terrain 훅에서는 계속 `#ifdef BLOXD_SCENE_DEPTH`로 감싸야 한다.

## 47. v2 → v3 마이그레이션 체크리스트

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`**: 세 입력 구조체 모두에서 바꾸고, 머티리얼 스타일링을 `bloxdBlockFlag*` 상수에 대한 비트 검사로 표현한다 (§42). v2의 id 범위 휴리스틱은 버린다.
3. **`bloxdTime()` → `bloxdSeconds()`**: 삭제된 `bloxdTimeWrap` 대신 자체 주기를 선언한다 (`% period`).
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **light 계산을 `engineColour`에서 `litColour` + 포그로 재구성한다**: §43 표에 따라. 기본값이 이제 emission을 포그로 감쇠시킨다는 점에 주의.
6. **액체 훅**: 물을 다르게 처리하려면 `bloxdLiquid*`를 명시적으로 정의한다. 생략하면 terrain 훅으로 폴백한다.
7. **`BLOXD_ALPHA` 점검은 필요 없다** — 베리언트 집합은 v2와 그대로다: 모든 액체 베리언트와 non-strict terrain에 정의되고, strict terrain만 생략한다 (§46)
8. **`bloxdPi` / `bloxdTau` 사용**: 삼각함수 관련 상수를 하드코딩하던 곳에서 사용하고, 이제 헤더와 중복되는 팩 로컬 재선언은 삭제한다.
9. **strict 가드 유지**: vertex 훅과 `discard`는 계속 `#ifndef BLOXD_STRICT`로 감싼다. 템플릿은 `bloxdLiquidVertex`도 terrain 쪽과 같은 방식으로 가드한다.
10. **게임 내 검증**: 셰이더 팩을 지원하는 게임에서 팩을 컴파일하고 테스트한다.

## 48. 기타 v3 변경과 주의사항

- **검증은 여전히 2단계**다 ([제8부](08-apiv2.md) §38): 먼저 정적 검증, 그 다음 훅을 호출하는 생성 스텁 스니펫을 통한 브라우저의 실제 WebGPU 컴파일. 오류는 원본 파일 / 줄로 매핑되고, 진단은 매핑을 통해 엔진 쪽 식별자의 원래 이름을 복원한다.
- **strict 진단은 이유를 말한다**: 지형을 움직이는 vertex 훅은 「… moves terrain, which strict games prevent.」를 보고하고, surface / light 훅의 `discard`는 「discard makes terrain see-through, which strict games prevent.」를 보고한다. 설정 UI는 「wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`.」 안내를 유지한다 (`offInStrict`).
- **로더 메시지**: 오류 종류와 제한은 그대로다. "Zip64 archives aren't supported."는 UI 메시지로 표시된다 (`loadZip64`). 팩 UI 문자열 인벤토리는 총 57개의 `shaderPack:*` 키다. 로드 단계 오류로는 `.wgsl` 파일이 하나도 없는 zip을 뜻하는 `loadNoWgsl`과 zip 종료 시그니처가 없는 파일을 뜻하는 `loadNotZip`이 이 집합을 마무리한다.
- **게임 내 WGSL 에디터는 팩 UI에 포함되지 않는다.** 설정 화면에는 셰이더 코드 에디터가 없다 — 팩은 게임 밖에서 zip 파일로 작성한다. (번들 안에 CodeMirror 에디터가 존재하기는 하지만, 그것은 커스텀 게임 스크립팅 UI의 JavaScript 에디터이며 WGSL 지원도, 팩 시스템과의 연결도 없다.)
- **하드웨어 게이트**: Lite는 `shader-f16` WebGPU 기능을 지원하는 드라이버를 요구한다. 너무 오래된 드라이버는 "Intel driver too old for Lite (no shader-f16)" 같은 메시지로 거부된다.
- **lighting 변경은 저장된 팩을 재검증한다**: 실행 중 lighting 설정이 바뀌면 엔진은 팩 검사를 다시 실행한다 (`changed → recheck`); 리플레이 시청은 같은 훅을 `changed: false`로 호출하고 재검사를 건너뛴다.
- **문구**: 셰이더 팩을 받아들이는 게임에 대한 문장이 이제 「in games that **support** them」으로 표기된다.
- **적용 범위**: 팩이 동작하는 게임의 범위는 이전 빌드와 같다.

## 49. 엔진 내부: Lite 렌더러가 훅을 호출하는 방식

§40–§48은 로더와 헤더가 알려 주는 내용이다. 이 절과 뒤따르는 절들은 엔진이 실행 시 실제로 하는 일을 프로덕션 번들에서 복원해 기록한다 (Lite 렌더러는 175 KB 청크이며, 통합 소스 파일의 실제 이름 `lite/terrainShaderPack.ts`가 오류 문자열 안에 남아 있다). 이 중 어느 것도 작성하는 코드를 바꾸지는 않지만, 훅이 무엇을 받는지에 대한 추측을 없애고, 다른 커뮤니티 가이드가 아직 미해결로 남겨 둔 여러 질문을 정리한다.

렌더러는 JavaScript에서 훅을 「호출」하지 않는다. 팩이 검증을 통과하면 엔진은 셰이더 텍스트의 고정 앵커 줄을 교체해 **훅 호출을 자체 terrain WGSL에 이어 붙인다**. 앵커는 정확히 한 번만 일치해야 한다 — 0회 또는 여러 회 일치하면 `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`로 중단한다.

| 단계 | 엔진 셰이더의 앵커 줄 | 이어 붙는 내용 |
|---|---|---|
| vertex | `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);`부터 `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);`까지의 네 줄 블록 | `BloxdVertexIn`을 만들고 vertex 훅을 호출한 뒤 `worldPos`를 다시 쓴다 — 이어 붙이기는 `let worldPos`를 `var worldPos`로도 바꾼다 |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | `BloxdSurfaceIn`을 만들고 surface 훅을 호출한 뒤 `baseColor` / `alpha`를 다시 쓴다 |
| lit colour | `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` 바로 앞 | `let bloxdSpLitColour = color.rgb;` — 포그 전 색을 캡처한다 |
| light | fragment 셰이더의 마지막 `return color;` 줄 | `BloxdLightIn`을 만들고 light 훅을 호출한 뒤 `color`를 다시 쓴다 — 포그 블렌드 이후 |

출하된 번들에서 복원한, 훅을 이어 붙이는 코드 (엔진 자체 서식이 길어지는 light-level 샘플 식은 축약):

```wgsl
// vertex 단계 — vertex 훅을 가진 non-strict 베리언트
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* your bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// fragment 단계 — surface
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* your surface hook */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // 프로그램이 liquid이거나 베리언트가 non-strict일 때만 이어 붙는다
```

```wgsl
// fragment 단계 — light
{
    let bloxdSpLightIn = BloxdLightIn(
        bloxdSpLitColour,                        // litColour
        fragmentInputs.vTerrainLambert,          // directional
        ambient,                                 // ambient
        /* light-level varying */.rgb,           // blockLight
        /* sky channel of the same varying */,   // skyLight
        uniforms.uAmbientLightColour,            // ambientLightColour
        uniforms.uSkyLightColour,                // skyLightColour
        /* held-light term (see below) */,       // heldLight
        select(vec3f(0.0), uniforms.vFogColor,
               uniforms.vFogInfos.x != 0.0),     // fogColour — 포그가 전혀 없을 때만 검정
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* your light hook */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

이 이어 붙이는 코드에서 곧바로 나오는 네 가지 강제 사실:

- **strict terrain은 surface 훅의 alpha 변경을 무시한다.** `alpha = bloxdSpSurface.alpha` 되쓰기는 liquid 프로그램이나 non-strict 베리언트에만 이어 붙는다 — §46 매크로 표의 구현이다. (strict terrain에서는 `#ifdef BLOXD_ALPHA` 코드가 어차피 컴파일 대상에서 빠지며, 이제 가드 없는 alpha 쓰기도 거기서 버려진다는 점이 확인되었다.)
- **vertex 훅을 선언한 strict 베리언트는 그 훅을 절대 실행하지 않는다** — 엔진은 빌드 시점에 `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`를 보고한다. 공식 템플릿 (§45)이 `bloxdLiquidVertex`를 terrain 쪽과 같은 `#ifndef BLOXD_STRICT`로 감싸는 이유다.
- `bloxdSp*` 식별자 — **총 14개**: `bloxdSpVertexIn`, `bloxdSpVertex`, `bloxdSpSurfaceIn`, `bloxdSpSurface`, `bloxdSpLightIn`, `bloxdSpLight`, `bloxdSpLitColour`, `bloxdSpSceneDepth`, `bloxdSpPixel`, `bloxdSpPositionW`, `bloxdSpZ`, `bloxdSpEye`, `bloxdSpScale`, `bloxdSpBehind` — 는 엔진 쪽 임시 변수다. 작성하는 코드에는 보이지 않지만 진단과 누군가의 리버스 엔지니어링 출력에 나타나므로, 보는 즉시 알아볼 가치가 있다.
- **기본 surface 지름길.** 베리언트의 surface 훅이 문자 그대로 `bloxdDefaultSurface`이면, 엔진은 `baseColor` / `alpha` 되쓰기 줄을 아예 이어 붙이지 않는다 — 기본값이 이미 그 값들을 만들어 내므로 대입은 죽은 코드가 된다. 수정하지 않은 훅 체인은 비용이 들지 않는다.

**`BloxdLightIn`에 실제로 들어가는 값** — 이어 붙는 코드 기준, 필드별:

| 필드 | 엔진 쪽 공급원 |
|---|---|
| `litColour` | 포그 블렌드 직전에 캡처한 프래그먼트 색 (`bloxdSpLitColour` 앵커) — 헤더가 말하는 「emission과 포그 전」 |
| `directional` | `vTerrainLambert` — 씬의 방향광에 대한 `max(0, dot(normal, lightDirection)) × intensity` 합을 vertex에서 보간한 값 (식은 §54); 씬에 방향광이 없으면 0 |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient` — 머티리얼별, 프레임별 |
| `blockLight` | 디코드된 light-level varying의 `.rgb` (디코드는 §54) |
| `skyLight` | 같은 light-level varying의 스카이 채널 — *「Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING」* (헤더 텍스트) |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | light-level varying의 w 채널과 프레임 uniform `uHeldLightPos` / `uHeldLightColour`로 만든 held-light 항 ([제7부](07-internals.md) §26이 감쇠와 채널 하한 동작을 기록한다) |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)` — **포그가 전혀 없는 씬에서만 검정** (모드 0, §50) |
| `fogVisibility` | 클램프된 포그 계수 — §50 함수가 반환하는 정확한 값 |
| `position` / `normal` | `vPositionW` / `vNormalW` varying (normal은 프래그먼트마다 다시 정규화) |
| `blockFlags` | `vBlockFlags` flat varying — §52의 전체 전달 경로 |

오래된 자료를 읽을 때 방향을 잡기 위해: 동일한 이어 붙이기 구조는 v2 렌더러에도 있었고, v3의 통합 차이는 `vBlockId` → `vBlockFlags`와 액체 베리언트 추가뿐이다. 훅 시스템은 v2 → v3 단절을 거쳐도 구조적으로 안정적이다.

## 50. 포그 함수: 네 가지 모드, 하나의 필드

프로덕션 terrain 셰이더에서 그대로 복원:

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // 선형
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // 지수
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // 지수 제곱
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = 포그 꺼짐 (계수는 1.0 유지)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)` — 하나의 vec4가 모든 것을 구동한다.
- **셰이더에는 네 가지 모드가 있다: 0 = 꺼짐, 1 = 지수, 2 = 지수 제곱, 3 = 선형.** 어느 모드가 실행되든 `fogVisibility`는 클램프된 계수다 — 필드는 정확히 하나뿐이고, 모드 플래그는 팩에 노출되지 않는다.
- Bloxd 자체 타이틀은 [제7부](07-internals.md) §25에 설명된 32블록 대역으로 모드 3 (선형)을 구동하므로 (`fogStart = 32 × D`, `fogEnd = 32 × (D + 1)`), 그 부의 「항상 선형」 관찰은 여전히 출하된 게임플레이를 설명한다. 그러나 지수 모드도 실제로 살아 있는 엔진 코드다 — 타이틀은 클라이언트 업데이트 없이 `vFogInfos.x`를 바꿔 램프를 바꿀 수 있다. 거리 기반 레시피에서 `distance(l.position, bloxdEyePosition())`를 직접 계산하는 방식 (레시피 R-B)은 모드 전환에 영향을 받지 않으므로 거리 기반 외형을 쓰는 견고한 방법이다.
- 이로써 「엔진이 실제로 어느 포그 램프를 쓰는가」라는 질문이 소스로 정리된다: 네 가지가 모두 구현되어 있고, 출하된 타이틀은 선형을 쓴다. (같은 함수가 헤더의 fogColour 주석도 설명한다 — 모드 0은 `fogColour`가 검정으로 도착하는 유일한 경우이며, Bloxd 게임은 모드 0을 출하하지 않고 대신 포그를 멀리 밀어낸다, [제7부](07-internals.md) §25.)

## 51. bloxdOpaqueBehind(): 정확한 구현

프로덕션 빌드에서 그대로 복원한 함수 전체:

```wgsl
@group(3) @binding(1) var bloxdSpSceneDepth: texture_2d<f32>;
var<private> bloxdSpPixel: vec2i;
var<private> bloxdSpPositionW: vec3f;

fn bloxdOpaqueBehind() -> BloxdOpaqueBehind {
    let bloxdSpZ = textureLoad(bloxdSpSceneDepth, bloxdSpPixel, 0).r;
    if (bloxdSpZ <= 0.0) {
        return BloxdOpaqueBehind(false, vec3f(0.0), 0.0);
    }
    let bloxdSpEye = bloxdPackInputs.eyePosition;
    let bloxdSpScale = max(bloxdSpZ / (scene.view * vec4f(bloxdSpPositionW, 1.0)).z, 1.0);
    let bloxdSpBehind = bloxdSpEye + (bloxdSpPositionW - bloxdSpEye) * bloxdSpScale;
    return BloxdOpaqueBehind(true, bloxdSpBehind, distance(bloxdSpBehind, bloxdSpEye));
}
```

- **깊이 텍스처는 `@group(3) @binding(1)`에 있다** — group 3은 팩 자신의 그룹이다: binding 0은 64 B `bloxdPackInputs` uniform (§41), binding 1은 이 깊이 텍스처다. 둘 다 엔진이 제공하며 팩 쪽에서는 이름을 붙일 수 없다.
- **깊이 텍스처는 unfilterable-float, fragment 전용 리소스다.** 바인드 그룹 레이아웃은 이를 `texture: { sampleType: "unfilterable-float" }`로 등록하며 가시성은 `GPUShaderStage.FRAGMENT`뿐이다 — `bloxdOpaqueBehind()`가 `textureSample` 대신 `textureLoad` (명시적 텍셀 좌표, 밉 레벨 0)로 구현된 이유가 바로 이것이다: 이 텍스처에는 하드웨어 필터링이 아예 없다.
- `z ≤ 0`은 깊이 샘플이 아무것도 맞히지 못했다는 뜻이다 (원거리 평면 / 하늘): `found = false`이며 `position` / `distance`는 의미가 없다 — 항상 `found`를 먼저 확인할 것.
- 반환되는 위치는 **광선 스케일 교차점**이다: 불투명 표면은 `eye + (fragment − eye) × max(z / viewDepth, 1)`에 놓인다. `distance`는 눈에서 그 점까지의 거리다 — 물 표면 팩에서는 「광선이 단단한 표면에 닿기 전에 물을 얼마나 통과했는가」가 되며, 이것이 두 번째 깊이 버퍼 없이 깊이 틴트 물 레시피를 가능하게 한다.

## 52. blockFlags 전달 경로: 등록에서 훅까지

§42는 비트의 의미를 설명한다. 이 절은 플래그 비트가 블록 등록에서 훅까지 이동하는 완전한 경로다 — 모든 단계는 프로덕션 소스에서 확인했으며, 헤더의 「면 전체에서 같다」가 바이트 수준에서도 성립함을 증명한다.

**1. 등록 (블록 정의 데이터베이스).** 각 블록의 플래그는 등록 시 한 번 계산된다:

```js
flags[id] = nameFlags                     // 표시명 규칙 (§42): vegetation / dirt / sand / rock
          | (definition.opaque === true ? 1 : 0)   // 불투명 비트 — 엔진 불투명도 데이터
          | (anyFaceEmission >= 1       ? 2 : 0);  // 발광 비트 — 블록 광 방출 데이터
```

표시명 규칙은 네 가지 머티리얼 비트만 담당하고, 두 물리 비트는 별도 엔진 데이터에서 온다 — `opaque`는 블록 정의에서 곧바로, `emissive`는 면별 블록 광 방출 배열에서 온다. 헤더의 「빛나는 광석도 아무리 약해도 포함」은 문자 그대로다: 방출이 1 이상인 면이 있으면 비트가 설정된다.

**2. 블록별 → 머티리얼별 (메셔 초기화).** 지형은 블록 id가 아니라 *머티리얼* 단위로 그려지므로, 플래그는 머티리얼 표로 다시 정리된다 (머티리얼 id로 인덱스하는 `Uint16Array`이며, 각 머티리얼은 소유 블록의 첫 면 플래그를 가진다). 이 표는 메싱 Web Worker로 전달되지만 — **팩 파이프라인이 활성화된 구성에서만** 그렇다. 그 외에는 표가 `null`이고 플래그 바이트가 전혀 기록되지 않는다. 팩이 없는 플레이어는 구조적으로 오버헤드가 0이다.

**3. 정점 바이트로 (메셔 워커).** 플래그는 기존 인터리브 정점 데이터의 여유 바이트 두 개를 탄다:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // 하위 8비트 → color 속성의 alpha 바이트
        buffer[o + normalOffset + 3] = flags >> 8;    // 상위 8비트 → normal 속성의 w 바이트
    }
}
```

면의 네 정점 모두 같은 값을 받는다 — 「면 전체에서 같다」의 구현 수준 의미다.

**4. GPU 쪽 디코드 (Lite terrain 셰이더).** 두 바이트는 `blockFlagWords: vec2u` 정점 속성 (location 7, 팩 파이프라인이 켜졌을 때만 존재)으로 이동하고 vertex 단계에서 재조립된다:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags`는 `@interpolate(flat)`으로 선언된다 — 면마다 일정한 값이 fragment 단계까지 이어지므로, §42의 비트 검사가 면 안에서 안정적이고 면 중간 블렌드가 생길 수 없다.

- 파이프라인은 **16비트** 용량을 예약하지만 (위 디코드는 두 바이트 전체를 재조립한다) v3는 6비트만 정의한다 — 향후 플래그가 정점 형식 변경이나 API 범프 없이 등장할 수 있다.
- packed-vertex 모드에서는 같은 두 바이트가 전용 속성 대신 `packed.y`와 color 워드의 상위 바이트 안에 들어간다 — 값은 같고 컨테이너만 다르다.
- 이 플래그에 가장 자주 묻는 나뭇잎 대 잔디 질문은 §42 아래의 [잔디 없는 나뭇잎](#잔디-없는-나뭇잎-모두가-묻는-질문)을 참조.

## 53. 검증 내부: HEADER_VERSION, 서명, 예약 이름

**실측 헤더 해시.** 모든 팩 검증에는 엔진의 `HEADER_VERSION`이 찍힌다. 프로덕션 검증 모듈을 직접 실행하면 (§54 끝의 하네스 주석 참조) 다음과 같이 측정된다:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← 라이브 프로덕션 번들에서 측정
```

FNV-1a-32 해시이며 (`6.` 접두사), 다섯 입력을 해시한다: 베리언트별로 전처리·토큰화한 엔진 헤더 (8개 베리언트 각각 한 항목), 파서의 전체 WGSL 어휘 우주, 네 매크로 이름, 특수 함수 맵, 그리고 `BloxdPackInputs` 선언과 그 `@group(3) @binding(0)` uniform 줄. 작성자에게 중요한 두 가지 결과:

- **엔진 쪽 헤더가 바뀌면 해시도 바뀐다** — 엔진 업데이트 후 저장 팩이 받는 자동 「재확인 필요」 플래그의 메커니즘이다 ([제8부](08-apiv2.md) §31).
- 해시는 *엔진 헤더*를 덮으며 작성하는 코드는 덮지 않는다. 엔진 업데이트를 넘겨 계속 로드되는 팩이 「여전히 유효」한 것은 아니다 — 아직 헤더 변경에 걸리지 않았을 뿐이다. manifest가 참여하는 유일한 버전 검사는 `apiVersion` 게이트다 (§40).

**훅 시그니처 검사: 타입은 토큰 단위로 엄밀, 이름은 자유.** 검증기는 훅 슬롯마다 시그니처 하나를 가진다:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

일치는 **토큰 단위**다: 매개변수 타입 이름이 정확히 일치해야 하고, `->`와 반환 타입도 정확히 일치해야 하며, 매개변수 개수와 쉼표 위치도 검사한다. 매개변수 *이름*은 자유다 — 매개변수 자리에 어떤 식별자든 허용되므로, 템플릿이 `(surface, light)`라고 써도 `fn bloxdTerrainLight(s, l)`이 컴파일된다. light 훅은 정확히 매개변수 두 개를 받는다.

**예약 이름.** 규칙은 정규식 하나다: `/^bloxd/i`. `bloxd`로 시작하는 모든 식별자는 예약된다 — `bloxd*`는 모두 엔진 제공이며, 팩은 그 네임스페이스에 선언할 수 없다 (그래서 §44의 `bloxdPi` / `bloxdTau` 재선언이 충돌한다).

**특수 함수.** v3에는 정확히 하나가 등록되어 있다:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

「특수」는 *매크로에 묶였다*는 뜻이다 — 가용성이 베리언트 심볼에 달린 엔진 함수다. 올바른 사용을 강제하는 가드 진단은 두 가지다:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.` — vertex 훅이 surface/light 전용 함수에 닿은 경우.
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — 예를 들어 `#ifdef BLOXD_SCENE_DEPTH`로 감싸지 않은 terrain 쪽 `bloxdOpaqueBehind()`.

**엔진 헤더 (프렐류드), 고정.** v3 헤더는 `// Engine-provided and read-only, prepended to all packs. apiVersion 3.`로 시작하는 5,637바이트 문자열이다. 엔진 자체 WGSL 전처리기가 베리언트별로 평가하는 `#if` / `#ifdef` 지시문을 담는다 — 엔진은 실제로 `#if` 식 평가를 실행하며, 잘못된 식은 `Cannot evaluate #if ...`로 오류를 낸다. 이 가이드의 모든 구조체, 함수 시그니처, 인용 주석은 이 렌더링된 텍스트에서 나왔으므로, 가이드와 출하 헤더가 어긋날 수 없다. 전문은 §54 끝에 그대로 실린다.

**작성자를 위한 파서 주의사항.**

- 팩 쪽 함수는 엔진 셰이더에 병합될 때 `pack_` 접두사로 이름이 바뀐다 (충돌 회피). 진단은 이를 원래 이름으로 되돌린다 — [제8부](08-apiv2.md) §38이 설명하는 제2 검증 단계와 같은 메커니즘이다.
- 미선언 식별자 메시지는 `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`다. `_ can only be the target of a phony assignment, as in _ = f();`와 `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.`가 새로 확인된 메시지 집합을 이룬다.
- 파서의 어휘 우주에는 **표준 WGSL이 아닌** 식별자도 들어 있다: `bufferView`, `bufferArrayView`, `bufferLength`, `atomicStoreMax`, `atomicStoreMin`. 엔진은 이를 내장으로 알지만, 특정 브라우저의 WGSL 구현이 이를 제공한다고 보장할 수 없다 — 배포용 팩을 이것들에 기대어 만들지 말 것.

## 54. 확인된 상수, 제한, 레이아웃

프로덕션 Lite 렌더러에서 그대로 가져온 terrain 프로그램의 전체 리소스 레이아웃:

| Binding | 내용 |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms` — `viewProjection` mat4x4f, `view` mat4x4f, `vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms` — `uHeldLightColour` / `uHeldLightPos`, `uSkyLightColour`, `uAmbientLightColour`, **`vFogInfos`**, `vFogColor`, `outputHeight`, `sceneAmbient`, **`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: storage `array<vec4f>` — xyz = 렌더 프레임으로의 평행 이동, w = 페이드인 가시성 |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`, `ambientAndCutoff`, `emissiveAndLevel`, `anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs` — 팩 uniform (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth` — 깊이 텍스처 (§51) |

- **방향광은 최대 네 개로 하드 캡된다.** 씬이 더 등록하려 하면 렌더러는 `Terrain supports 4 directional lights, not ${n}`으로 오류를 낸다. `l.directional`은 존재하는 만큼 (0–4개, Bloxd 자체 씬은 2개 사용 — [제7부](07-internals.md) §27)의 Lambert 합이다. terrain은 또한 처리할 수 없는 light에 대해 다음과 같이 경고한다, 그대로 옮기면: 늦게 추가된 light — `Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.`; 색이 입혀진 light — `Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.`; 메시 필터링 light — `Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **terrain 프로그램 이름**: 파이프라인 캐시 키는 `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}`로 읽힌다 — 팩은 `-sp{variant}` 접미사로 나타나며, §46 베리언트마다 프로그램 하나다. 감시자 (`watchPipelineFailures`)는 살아 있는 파이프라인 이름을 `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/`와 대조해 파이프라인 컴파일이 실패하면 일치하는 팩 베리언트를 다시 검사한다; GPU 장치 손실 (`device.lost`)은 검사를 건너뛴다.
- **`BLOXD_TERRAIN_DIRECTIONAL`은 엔진 내부 매크로**다 (dirLightCount > 0일 때 정의). 프렐류드의 네 매크로 중 하나가 아니며 팩 코드에 절대 도달하지 않지만, 엔진 자체 셰이더의 WGSL 덤프에는 나타나므로 알아 두면 혼동을 줄일 수 있다.
- **light-level 디코드**: `aPackedLightLevels` 정점 속성은 니블 네 개를 담은 f32 하나이며, 각각 15로 나뉜다: rgb = 유색 블록 광, a = 스카이 / held 채널. vertex 단계는 이를 `vLightLevels` varying으로 디코드하고, `blockLight`는 `.rgb`를, 스카이 / held 채널은 `.w`를 읽는다. 엔진은 보간 전에 rgb 채널을 가장 밝은 채널의 35%로 바닥 처리한다 — [제7부](07-internals.md) §26이 게임플레이에서 기록한 리프트의 엔진 쪽 기준점이다.
- **`vTerrainLambert`** (`directional`의 공급원, §49)는 활성 방향광에 대한 합으로 생성된다: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`, `BLOXD_TERRAIN_DIRECTIONAL`로 가드된다.
- **인덱스 버퍼는 첫 대형 메시에서 32비트가 된다.** Lite 렌더러는 모든 인덱스 값이 65,534 이하로 유지되는 동안만 `Uint16Array` 인덱스를 고른다 — 어떤 인덱스든 65,535에 도달하는 순간 버퍼는 `Uint32Array`가 된다 (버퍼마다 `is32Bits` 플래그로 추적한다). 실제로는: 정점이 최대 65,535개인 청크 메시는 16비트 인덱스에 들어가고, 정확히 65,536개인 메시는 반드시 인덱스 65,535를 내보내 버퍼 전체가 32비트로 전환된다.
- **manifest 로딩 세부**: `__MACOSX/` 아래 zip 항목, `._` 접두사 파일, `.DS_Store`는 필터링된다 (macOS 아카이브 노이즈). `pack.json`은 소문자 경로 비교로 찾는다 — 0개 일치 → `loadNoManifest`, 2개 이상 → `loadDuplicateManifest`; manifest 읽기는 65,536바이트로 제한된다.
- **이 모든 것을 어떻게 검증했는가**: 프로덕션 번들의 모듈을 복원하고 (165개 청크; 이 번들의 webpack 레지스트리는 4,951개 모듈을 세지만 — 비동기 자식 의존성을 포함하는지에 따라 모듈 수는 몇 개씩 달라지므로 정확한 숫자는 번들별로 다루는 것이 좋다) Node.js의 webpack 호환 하네스에서 실행했다. 측정된 `HEADER_VERSION` (§53), 렌더링된 5,637바이트 헤더, 베리언트 표의 정규 순서, 특수 함수 맵은 모두 문자열을 읽은 것이 아니라 *출하된 코드를 실행*해 얻은 것이다. 같은 하네스는 커뮤니티 `pack_check` v6의 자연스러운 핵심이다 — 엔진 자체 검증기를 팩에 대해 실행하면 판정을 정확히 재현한다.
### v3 엔진 헤더, 그대로

고정된 5,637바이트 (127줄) 텍스트 자체 — 위 §53이 설명한 그 유물이다 — 이 부분이 대상으로 하는 v3 프로덕션 빌드 `3ymzdd`에서 그대로 복원했다. [제11부](11-reference.md) §67의 v4 헤더에 대한 v3 대응물이며, 같은 이유로 전체를 싣는다: v3 팩을 엔진이 실제로 앞에 붙인 바로 그 텍스트 기준으로 디버깅하고, 모든 v3 → v4 차이 ([제10부](10-apiv4.md) §58–§59)를 두 텍스트를 나란히 놓고 직접 읽을 수 있게 하기 위함이다.

```wgsl

// Engine-provided and read-only, prepended to all packs. apiVersion 3.

// Half a turn and a full turn, in radians.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// Per frame: the same for every vertex and fragment of a frame. The functions read bloxdPackInputs, the engine's
// uniforms, which packs can't name. Any function can call them, not only a hook.

// Seconds since the page loaded. In f32, so it counts in steps of under 1 ms for the first 4.5 hours, and of about
// 4 ms from 9 to 18 hours. bloxdSeconds() % period counts from 0 up to period, then starts again.
fn bloxdSeconds() -> f32 {
    return bloxdPackInputs.seconds;
}

// Whole blocks: a render position plus this is a world position. It changes as the player travels, so render positions
// stay close to the player, and so precise.
fn bloxdRenderOffset() -> vec3i {
    return bloxdPackInputs.renderOffset;
}

// The camera's render position.
fn bloxdEyePosition() -> vec3f {
    return bloxdPackInputs.eyePosition;
}

// Unit, towards the sun, in world orientation; zero when the sky has no sun.
fn bloxdSunDirection() -> vec3f {
    return bloxdPackInputs.sunDirection;
}

// A render position's world position. In f32, so it loses fine detail far from the world's origin.
fn bloxdWorldPosition(position: vec3f) -> vec3f {
    return position + vec3f(bloxdRenderOffset());
}

// The world block the face at a fragment's position and normal belongs to, exact anywhere: half a block back inside it.
fn bloxdFaceBlock(position: vec3f, normal: vec3f) -> vec3i {
    return vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset();
}

// Bits of the hook inputs' blockFlags: what a face's block is and what it's made of. A block made of several materials
// has each, as sandstone is sand and rock, so leaves are vegetation and not dirt. Test one with
// (blockFlags & bloxdBlockFlagRock) != 0.
const bloxdBlockFlagOpaque: u32 = 1;     // Fully opaque, leaves and ice included. Not glass, water, lava, spawners, or ghost and invisible blocks.
const bloxdBlockFlagEmissive: u32 = 2;   // Gives off block light, as neon, portals, lamps, Lava and Beacon do. Glowing ores count, however faint.
const bloxdBlockFlagVegetation: u32 = 4; // Leaves, and the grass on grass blocks, which are dirt too. Not cacti, mushroom blocks or hay.
const bloxdBlockFlagDirt: u32 = 8;       // Dirt and soil, grass blocks included. Rocky Dirt is rock too.
const bloxdBlockFlagSand: u32 = 16;      // Sand, Red Sand, and every sandstone, which is rock too.
const bloxdBlockFlagRock: u32 = 32;      // Stone and its kinds, andesite, diorite, granite, gravel, ores, sandstone, Rocky Dirt, bedrock, obsidian and magma.

struct BloxdVertexIn {
    position: vec3f,     // A render position: world minus bloxdRenderOffset().
    normal: vec3f,
    blockFlags: u32,     // What kind of block this face is: bloxdBlockFlag* bits, the same across the face.
}

struct BloxdVertex {
    position: vec3f,     // A render position.
}

struct BloxdSurfaceIn {
    colour: vec3f,       // Texture * vertex colour (tint * AO).
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // A render position; see bloxdWorldPosition and bloxdFaceBlock.
    blockFlags: u32,     // As in BloxdVertexIn.
}

struct BloxdSurface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // Added after lighting, then fogged.
}

struct BloxdLightIn {
    litColour: vec3f,    // The engine's lit result for this fragment, from the surface hook's colour: before emission and fog.
    directional: f32,    // Summed Lambert from the scene's directional lights (0 when off).
    ambient: vec3f,      // Ambient light, added to directional.
    blockLight: vec3f,   // Voxel block light, tone-mapped; 0 without BLOXD_LIGHTING.
    skyLight: f32,       // Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING.
    ambientLightColour: vec3f, // White without BLOXD_LIGHTING.
    skyLightColour: vec3f,     // White without BLOXD_LIGHTING.
    heldLight: vec3f,    // Held light here, tone-mapped like blockLight, before the ambient boost; 0 out of reach
                         // or without BLOXD_LIGHTING.
    fogColour: vec3f,    // The game's fog colour. Bloxd's games always have fog, pushed far out when the player
                         // turns it off; black only in a scene with no fog at all.
    fogVisibility: f32,  // 1 = no fog, 0 = fully fogged.
    position: vec3f,     // As in BloxdSurfaceIn.
    normal: vec3f,
    blockFlags: u32,     // As in BloxdVertexIn.
}

struct BloxdLight {
    colour: vec3f,
}

// Returned by bloxdOpaqueBehind(), which surface and light hooks may call where BLOXD_SCENE_DEPTH is defined.
struct BloxdOpaqueBehind {
    found: bool,         // False where nothing opaque is behind (sky).
    position: vec3f,     // A render position; meaningless when !found.
    distance: f32,       // From the eye; meaningless when !found.
}

fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return BloxdVertex(vertex.position);
}

fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
#ifdef BLOXD_ALPHA
    return BloxdSurface(surface.colour, surface.alpha, vec3f(0.0));
#else
    return BloxdSurface(surface.colour, vec3f(0.0));
#endif
}

// Fogs colour as the engine fogs this fragment.
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(light.fogColour, colour, light.fogVisibility);
}

fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return BloxdLight(bloxdApplyFog(light.litColour + surface.emission, light));
}
```

---

# 제10부: API Version 4 마이그레이션 가이드 (2026-10-26, 요약)

> 이 문서는 이 언어용 간략 요약이다. 모든 세부사항·예제 레시피·복원된 엔진 내부 (§55–§66)를 담은 완전판은 [영어](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md) 와 [일본어](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md) 판에 있다.

대상 빌드: `cnty9.main.669f8081.js` — **2026-10-26부터 프로덕션과 프리프로드에 동시 적용** (양쪽 모두 바이트 동일). 팩 모델은 형태를 유지한다: 같은 `pack.json` 필드, 같은 로더 제한, 같은 64 B uniform, 같은 6개 훅.

## 바뀌는 것

- `pack.json`은 `"apiVersion": 4` 를 요구 (엄격 `===`, 숫자) — v3 팩은 로드 시 거부.
- **새 텍스처 API (핵심):** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` 는 블록 텍스처 아틀라스를 엔진 자신과 정확히 같은 방식으로 샘플링한다 (id 0 = 흰색; 애니메이션 텍스처는 자동으로 현재 프레임 반환), `bloxdTextureSize(mipLevel) -> vec2u`, 그리고 명명 상수 `bloxdTextureId*` (파일명의 CamelCase, 예: `grass_top` → `bloxdTextureIdGrassTop`; 905개 사용 가능 이름 전체의 카탈로그가 제11부 (`11-reference.md`) §68에 내장되어 있다).
- `BloxdSurfaceIn` *과* `BloxdLightIn` 에 **4개的新 입력 필드**: `textureId`, `textureRotation` (시계방향 4분회전, `bloxdTexel` 이 적용), `uv` (블록 단위; `fract(uv)` 가 그려짐), `mipLevel`.
- **의미가 바뀌는 개명:** `fogVisibility` → `fogAlpha`, 의미 **반전** (`0 = 포그 없음, 1 = fogColour 만`; 포팅: `l.fogVisibility` → `1.0 - l.fogAlpha`); `bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (본체 동일); `BloxdOpaqueBehind.found` → `hit`.
- **strict 게임이 번들 내장 검증기로 강제됨:** 가드 없는 버텍스 훅이나 도달 가능한 `discard` 는 `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...` 를 내고 strict 게임에서 **모든** 훅을 비활성화한다. `#ifndef BLOXD_STRICT` 랩을 쓰면 surface/light 는 계속 동작.
- 나머지는 동결: 6 훅, `blockFlags` 비트 (1/2/4/8/16/32), uniform 레이아웃, 로더 제한, 배리언트 행렬, 12개 allow 타이틀 (`cnty9` 에서 2026-10-27 불변 재확인).

## 간단 마이그레이션

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (숫자) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` 또는 `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| 가드 없는 버텍스 훅 | `#ifndef BLOXD_STRICT ... #endif` |

완전한 레퍼런스 자료가 이제 가이드의 일부다: 그대로 복원된 엔진 헤더와 905개 사용 가능 이름 전체를 담은 텍스처 카탈로그가 제11부 (`11-reference.md`)에 있다. 전체 세부사항 — `bloxdTexel` 의 회전 미묘함, 복원된 샘플링 WGSL, 이름 레지스트리, 레지스트리 해시를 포함한 새 `HEADER_VERSION` 구조 — 는 영어·일본어 완전판에 있다.

[← 이전 부](09-apiv3.md)·[매뉴얼로 돌아가기](README.md)

---

# 제11부: 완전 레퍼런스 — 엔진 헤더와 텍스처 카탈로그

대상 빌드: `cnty9.main.669f8081.js` (2026-10-27 측정; 프로덕션과 프리프로드 바이트 동일). 이 부는 두 레퍼런스 자료를 **통째로** 싣어 가이드가 자기완결적이 되게 한다. §67은 엔진이 모든 팩 앞에 붙이는 정확한 헤더 텍스트이고(프로덕션 번들에서 그대로 복원), §68은 텍스처 이름 카탈로그 완전판이다: 측정된 id와 함께 사용 가능한 905개 `bloxdTextureId*` 이름, 57개 회전족, 42개 애니메이션족, 레지스트리 드리프트 측정치.

이 카탈로그는 근사값이 아니다: 엔진 **자신의** 레지스트리 빌더 모듈(module 28833 — 검증 시점에 `bloxdTextureId*`를 해석하는 같은 코드)을 라이브 빌드의 데이터(`textureNameToIndex`, `animDataPerTex`) 위에서 실행해 그 출력을 기록했다. 이름이 API다 — id는 한 빌드의 스냅샷이고 드리프트한다(§68.5).

두 절의 상세 설명은 제11부의 영어·일본어 완전판에 있으며, 여기의 데이터는 완전하다.


## 67. 완전한 v4 엔진 헤더, 그대로

엔진이 모든 팩 앞에 붙이는 6,021바이트(150줄) 헤더 — 첫 줄은 `// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.` 미포함: 렌더러 구성마다 생성되는 `bloxdTexel`/`bloxdTextureSize` 쌍(§63.1)과 27개 `bloxdSp*` 심볼(§63.4). `#ifdef BLOXD_ALPHA` 게이트는 엔진 프리프로세서가 변형별로 해석한다.


```wgsl

// The Bloxd shader pack API, apiVersion 4. Read-only, prepended to all packs.

const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// These functions return 1 value per frame, the same for every call site.

// The camera's render position.
fn bloxdEyePosition() -> vec3f {
    return bloxdPackInputs.eyePosition;
}

// Changes as the player travels, so render positions stay close to 0,0,0.
// Integer distance, in blocks. Render position + this offset = world position.
// See bloxdWorldPosition for how this can be used.
fn bloxdRenderOffset() -> vec3i {
    return bloxdPackInputs.renderOffset;
}

// This unit vector points towards the sun, in world orientation; 0 when no sun.
fn bloxdSunDirection() -> vec3f {
    return bloxdPackInputs.sunDirection;
}

// Seconds since the page loaded. As an f32, it has sub-millisecond precision
// for the first 4.5 hours. Get a recurring timer using bloxdSeconds() % period.
fn bloxdSeconds() -> f32 {
    return bloxdPackInputs.seconds;
}

// Each bit of the binary representation of blockFlags is a flag corresponding
// to a collection of blocks. The collections overlap, so blocks can be in 0-2+.
// (blockFlags & bloxdBlockFlagRock) != 0 // The block has this flag.
// (blockFlags & bloxdBlockFlagRock) == 0 // The block doesn't have this flag.

// Opaque blocks, leaves and ice included. Not glass, water, spawners, etc.
const bloxdBlockFlagOpaque: u32 = 1;

// These blocks emit light, e.g. neon, portals, lamps, lava, and glowing ores.
const bloxdBlockFlagEmissive: u32 = 2;

// 'Leafy', e.g. leaves, and grass blocks. Not cacti, mushroom blocks or hay.
const bloxdBlockFlagVegetation: u32 = 4;

// Dirt and soil, grass blocks included. Rocky Dirt is both dirt and rock.
const bloxdBlockFlagDirt: u32 = 8;

// Sand, Red Sand, and every sandstone, which is rock too.
const bloxdBlockFlagSand: u32 = 16;

// Stone variants, and more, e.g. gravel, ores, sandstone, magma and obsidian.
const bloxdBlockFlagRock: u32 = 32;

// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f {
    return position + vec3f(bloxdRenderOffset());
}

// Using a fragment's position and normal, identify the block's world position.
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i {
    return vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset();
}

struct BloxdVertexIn {
    position: vec3f, // Render position.
    normal: vec3f,   // Unit vector direction pointing away from the face.
    blockFlags: u32, // What kind of block. See bloxdBlockFlag*.
}

struct BloxdVertex {
    position: vec3f, // The render position output.
}

struct BloxdSurfaceIn {
    colour: vec3f,   // RGB colour = texture * tint * ambient occlusion.
    alpha: f32,      // Opacity.
    normal: vec3f,   // Unit vector direction pointing away from the face.
    position: vec3f, // Render position.
    blockFlags: u32, // What kind of block. See bloxdBlockFlag*.

    // These are 0 if the face has no texture.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // Texture coordinates in blocks; fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}

struct BloxdSurface {
    colour: vec3f,   // RGB colour output.
#ifdef BLOXD_ALPHA
    alpha: f32,      // Opacity output.
#endif
    emission: vec3f, // Emissive RGB output, added after lighting, before fog.
}

// blockLight, skyLight and heldLight are 0-1, from the 0-15 light levels on an
// ease-out curve, e.g. 6->0.45, 12->0.92. They all exclude ambientLightColour.
struct BloxdLightIn {
    litColour: vec3f,  // RGB surface colour, lit, before emission and fog.
    directional: f32,  // Summed Lambert from directional lights; 0 when off.
    ambient: vec3f,    // RGB ambient colour, added to directional light.
    blockLight: vec3f, // RGB block light; 0 without BLOXD_LIGHTING.
    skyLight: f32,     // Sky light; 1 without BLOXD_LIGHTING.
    ambientLightColour: vec3f, // Minimum RGB light; 1 without BLOXD_LIGHTING.
    skyLightColour: vec3f, // RGB colour of skyLight; 1 without BLOXD_LIGHTING.
    heldLight: vec3f,  // 0 without BLOXD_LIGHTING. 0 with no light source held.
    fogColour: vec3f,  // The game's RGB fog colour. 0 when the game has no fog.
    fogAlpha: f32,     // 0 = no fog, 1 = only fogColour.
    position: vec3f,   // Render position.
    normal: vec3f,     // Unit vector direction pointing away from the face.
    blockFlags: u32,   // What kind of block. See bloxdBlockFlag*.

    // These are 0 if the face has no texture.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // Texture coordinates in blocks; fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}

struct BloxdLight {
    colour: vec3f, // RGB colour output.
}

struct BloxdOpaqueBehind {
    hit: bool,       // False where nothing opaque is behind (sky).
    position: vec3f, // The render position; 0 when !hit.
    distance: f32,   // From the camera; 0 when !hit.
}

fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return BloxdVertex(vertex.position);
}

fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
#ifdef BLOXD_ALPHA
    return BloxdSurface(surface.colour, surface.alpha, vec3f(0.0));
#else
    return BloxdSurface(surface.colour, vec3f(0.0));
#endif
}

// Applies this fragment's fog to colour, as the engine does.
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}

fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return BloxdLight(bloxdApplyFog(light.litColour + surface.emission, light));
}
```

## 68. 완전한 텍스처 카탈로그 (905개 이름, 측정됨)

### 68.1 읽는 법

**이름**이 레지스트리 핸들이며, 상수는 CamelCase로 만든다(§57.3): `grass_top` → `bloxdTextureIdGrassTop`. **id**는 그 상수가 비교되는 값(아틀라스 층 + 1, `cnty9`에서 측정)이다 — 디버깅용이지 하드코딩용이 아니다. **비고** 열은 애니메이션족(현재 프레임 자동)과 회전족(루트를 참조하면 `bloxdTexel`이 회전을 재적용)을 표시한다.

여기 없는 것: 416개의 알려진 별칭 표기(프레임 188, 회전 228) — 상수가 아니며 각각 전용 에러 메시지가 나온다(§57.3).


### 68.2 카탈로그

사용 가능한 모든 이름, 알파벳 순. id는 `cnty9` 스냅샷이다 — 이름은 검증기가 로드 시 다시 해석하므로 레지스트리 드리프트를 surviving한다.

| 이름 | id (cnty9) | 비고 |
|---|---|---|
| `alloy_kiln_back` | 1091 |  |
| `alloy_kiln_front` | 1085 |  |
| `alloy_kiln_side` | 1086 |  |
| `alloy_kiln_side_running` | 33 | animated (4 frames) |
| `alloy_kiln_top` | 1087 | turned (4 rotated copies) |
| `andesite_brick` | 465 |  |
| `apple_block_bottom` | 441 |  |
| `apple_block_side` | 439 |  |
| `apple_block_top` | 440 |  |
| `armour_lucky_block` | 995 |  |
| `armour_lucky_block_rare` | 997 |  |
| `armour_lucky_block_super` | 999 |  |
| `artisan_table_side` | 367 |  |
| `artisan_table_top` | 368 |  |
| `ash` | 1031 |  |
| `auto_bench_back` | 1106 |  |
| `auto_bench_front` | 1100 |  |
| `auto_bench_side` | 1101 |  |
| `auto_bench_side_running` | 35 | animated (4 frames) |
| `auto_bench_top` | 1102 | turned (4 rotated copies) |
| `autocrafter_bottom` | 962 |  |
| `autocrafter_lunite_bottom` | 973 |  |
| `autocrafter_lunite_side` | 972 |  |
| `autocrafter_side` | 961 |  |
| `banana_block_side` | 899 |  |
| `banana_block_top` | 900 |  |
| `beacon` | 330 |  |
| `bedrock` | 334 |  |
| `beetroot_block_bottom` | 925 |  |
| `beetroot_block_side` | 923 |  |
| `beetroot_block_top` | 924 |  |
| `belt_drop_side` | 1185 |  |
| `belt_drop_top` | 1184 |  |
| `belt_lift_side` | 1183 |  |
| `belt_lift_top` | 1182 |  |
| `belt_loader_slab_front` | 1110 |  |
| `belt_loader_top` | 1109 |  |
| `belt_tunnel_back` | 1199 |  |
| `belt_tunnel_exit_top` | 1200 | turned (4 rotated copies) |
| `belt_tunnel_mouth` | 1193 |  |
| `belt_tunnel_side` | 1194 |  |
| `belt_tunnel_top` | 1195 | turned (4 rotated copies) |
| `black_concrete` | 273 |  |
| `black_glazed_terracotta` | 429 | turned (4 rotated copies) |
| `black_planks` | 366 |  |
| `black_portal` | 2 | animated (4 frames) |
| `black_spawn_block_side` | 760 |  |
| `black_spawn_block_top` | 756 | turned (4 rotated copies) |
| `block_destroyer_tnt_side` | 1017 |  |
| `block_destroyer_tnt_top` | 1018 |  |
| `blue_concrete` | 274 |  |
| `blue_gen_spawn_coal` | 774 |  |
| `blue_gen_spawn_iron` | 775 |  |
| `blue_gen_spawn_top` | 773 |  |
| `blue_glazed_terracotta` | 413 | turned (4 rotated copies) |
| `blue_lucky_block` | 994 |  |
| `blue_lucky_block_rare` | 996 |  |
| `blue_lucky_block_super` | 998 |  |
| `blue_planks` | 362 |  |
| `blue_portal` | 3 | animated (4 frames) |
| `blue_spawn_block_side` | 755 |  |
| `blue_spawn_block_top` | 751 | turned (4 rotated copies) |
| `bone_block_side` | 818 |  |
| `bone_block_top` | 819 |  |
| `bookshelf` | 564 |  |
| `bookshelf_1` | 566 |  |
| `bookshelf_2` | 567 |  |
| `bookshelf_3` | 568 |  |
| `bookshelf_4` | 569 |  |
| `bookshelf_5` | 570 |  |
| `bookshelf_empty` | 565 |  |
| `bouncy_bomb_block` | 591 |  |
| `bowling_alley_floor` | 978 |  |
| `bread_block_back` | 435 |  |
| `bread_block_front` | 434 |  |
| `bread_block_side` | 436 |  |
| `bread_block_top` | 437 |  |
| `brick` | 315 |  |
| `brown_concrete` | 275 |  |
| `brown_glazed_terracotta` | 417 | turned (4 rotated copies) |
| `brown_mushroom_block` | 536 |  |
| `brown_planks` | 363 |  |
| `brown_portal` | 4 | animated (4 frames) |
| `brown_spawn_block_side` | 750 |  |
| `brown_spawn_block_top` | 746 | turned (4 rotated copies) |
| `building_lucky_block` | 989 |  |
| `building_lucky_block_rare` | 991 |  |
| `building_lucky_block_super` | 993 |  |
| `burner_drill_back` | 1048 |  |
| `burner_drill_bottom` | 1047 |  |
| `burner_drill_front` | 1041 |  |
| `burner_drill_side` | 1042 |  |
| `burner_drill_side_running` | 27 | animated (4 frames) |
| `burner_drill_top` | 1043 | turned (4 rotated copies) |
| `cactus_dry` | 350 |  |
| `cactus_top` | 349 |  |
| `carrot_block_bottom` | 921 |  |
| `carrot_block_side` | 919 |  |
| `carrot_block_top` | 920 |  |
| `carved_messy_stone` | 827 |  |
| `carved_pumpkin` | 543 |  |
| `chalk` | 839 |  |
| `chalk_black` | 855 |  |
| `chalk_blue` | 854 |  |
| `chalk_bricks_black` | 871 |  |
| `chalk_bricks_blue` | 870 |  |
| `chalk_bricks_brown` | 869 |  |
| `chalk_bricks_cyan` | 868 |  |
| `chalk_bricks_gray` | 867 |  |
| `chalk_bricks_green` | 866 |  |
| `chalk_bricks_light_blue` | 865 |  |
| `chalk_bricks_light_gray` | 864 |  |
| `chalk_bricks_lime` | 863 |  |
| `chalk_bricks_magenta` | 862 |  |
| `chalk_bricks_orange` | 861 |  |
| `chalk_bricks_pink` | 860 |  |
| `chalk_bricks_purple` | 859 |  |
| `chalk_bricks_red` | 858 |  |
| `chalk_bricks_slab_side_black` | 887 |  |
| `chalk_bricks_slab_side_blue` | 886 |  |
| `chalk_bricks_slab_side_brown` | 885 |  |
| `chalk_bricks_slab_side_cyan` | 884 |  |
| `chalk_bricks_slab_side_gray` | 883 |  |
| `chalk_bricks_slab_side_green` | 882 |  |
| `chalk_bricks_slab_side_light_blue` | 881 |  |
| `chalk_bricks_slab_side_light_gray` | 880 |  |
| `chalk_bricks_slab_side_lime` | 879 |  |
| `chalk_bricks_slab_side_magenta` | 878 |  |
| `chalk_bricks_slab_side_orange` | 877 |  |
| `chalk_bricks_slab_side_pink` | 876 |  |
| `chalk_bricks_slab_side_purple` | 875 |  |
| `chalk_bricks_slab_side_red` | 874 |  |
| `chalk_bricks_slab_side_white` | 873 |  |
| `chalk_bricks_slab_side_yellow` | 872 |  |
| `chalk_bricks_white` | 857 |  |
| `chalk_bricks_yellow` | 856 |  |
| `chalk_brown` | 853 |  |
| `chalk_cyan` | 852 |  |
| `chalk_gray` | 851 |  |
| `chalk_green` | 850 |  |
| `chalk_light_blue` | 849 |  |
| `chalk_light_gray` | 848 |  |
| `chalk_lime` | 847 |  |
| `chalk_magenta` | 846 |  |
| `chalk_orange` | 845 |  |
| `chalk_pink` | 844 |  |
| `chalk_purple` | 843 |  |
| `chalk_red` | 842 |  |
| `chalk_white` | 841 |  |
| `chalk_yellow` | 840 |  |
| `charge_vault_side` | 1114 |  |
| `charge_vault_top` | 1113 |  |
| `charging_pad_side` | 1159 |  |
| `charging_pad_top` | 1158 |  |
| `checkpoint_block` | 761 | turned (4 rotated copies) |
| `cherry_block_bottom` | 590 |  |
| `cherry_block_side` | 588 |  |
| `cherry_block_top` | 589 |  |
| `chest_back` | 347 |  |
| `chest_double_back_hi` | 1219 |  |
| `chest_double_back_lo` | 1218 |  |
| `chest_double_front_hi` | 1213 |  |
| `chest_double_front_lo` | 1212 |  |
| `chest_double_top_1_hi` | 1215 |  |
| `chest_double_top_1_lo` | 1214 |  |
| `chest_double_top_2_hi` | 1217 |  |
| `chest_double_top_2_lo` | 1216 |  |
| `chest_front` | 341 |  |
| `chest_side` | 342 |  |
| `chest_top` | 343 | turned (4 rotated copies) |
| `chili_pepper_block_bottom` | 678 |  |
| `chili_pepper_block_side` | 676 |  |
| `chili_pepper_block_top` | 677 |  |
| `chiseled_red_sandstone` | 456 |  |
| `chiseled_sandstone` | 325 |  |
| `clay` | 195 |  |
| `coal_block` | 233 |  |
| `coal_deposit` | 1032 |  |
| `coal_ore` | 227 |  |
| `coarse_dirt` | 191 |  |
| `coconut_block_bottom` | 522 |  |
| `coconut_block_side` | 520 |  |
| `coconut_block_top` | 521 |  |
| `code_block` | 679 |  |
| `comet_heart` | 1170 |  |
| `comet_ore` | 1169 |  |
| `compressed_messy_stone` | 530 |  |
| `conveyor_belt_bottom` | 1081 |  |
| `conveyor_belt_slab_side` | 1080 |  |
| `conveyor_belt_top` | 1079 |  |
| `conveyor_belt_turn_left` | 1171 |  |
| `conveyor_belt_turn_right` | 1172 |  |
| `copper_deposit` | 1035 |  |
| `copper_ore` | 1040 |  |
| `corn_block_bottom` | 594 |  |
| `corn_block_side` | 592 |  |
| `corn_block_top` | 593 |  |
| `crafting_table_side` | 338 |  |
| `crafting_table_top` | 339 |  |
| `crate` | 918 |  |
| `crop_harvester_back` | 1192 |  |
| `crop_harvester_back_running` | 45 | animated (4 frames) |
| `crop_harvester_front` | 1186 |  |
| `crop_harvester_side` | 1187 |  |
| `crop_harvester_side_running` | 44 | animated (4 frames) |
| `crop_harvester_top` | 1188 | turned (4 rotated copies) |
| `crusher_back` | 1055 |  |
| `crusher_front` | 1049 |  |
| `crusher_side` | 1050 |  |
| `crusher_side_running` | 28 | animated (4 frames) |
| `crusher_top` | 1051 | turned (4 rotated copies) |
| `crystal_block` | 1029 |  |
| `crystal_vat_back` | 1166 |  |
| `crystal_vat_front` | 1160 |  |
| `crystal_vat_side` | 1161 |  |
| `crystal_vat_side_running` | 42 | animated (4 frames) |
| `crystal_vat_top` | 1162 | turned (4 rotated copies) |
| `custom_lobby_block_side` | 769 |  |
| `custom_lobby_block_top` | 765 | turned (4 rotated copies) |
| `cut_red_sandstone` | 457 |  |
| `cut_sandstone` | 453 |  |
| `cyan_concrete` | 276 |  |
| `cyan_gen_spawn_coal` | 783 |  |
| `cyan_gen_spawn_iron` | 784 |  |
| `cyan_gen_spawn_top` | 782 |  |
| `cyan_glazed_terracotta` | 405 | turned (4 rotated copies) |
| `cyan_planks` | 360 |  |
| `cyan_portal` | 5 | animated (4 frames) |
| `cyan_spawn_block_side` | 745 |  |
| `cyan_spawn_block_top` | 741 | turned (4 rotated copies) |
| `dark_green_bricks` | 460 |  |
| `darkstone` | 1206 |  |
| `darkstone_bricks` | 1207 |  |
| `darkstone_bricks_cracked` | 1208 |  |
| `darkstone_bricks_lava` | 1209 |  |
| `darkstone_engraved` | 1210 |  |
| `darkstone_smooth` | 1211 |  |
| `deep_drill_back` | 1140 |  |
| `deep_drill_bottom` | 1139 |  |
| `deep_drill_front` | 1133 |  |
| `deep_drill_side` | 1134 |  |
| `deep_drill_side_running` | 39 | animated (4 frames) |
| `deep_drill_top` | 1135 | turned (4 rotated copies) |
| `diamond_block` | 340 |  |
| `diamond_gen_spawn_side` | 807 |  |
| `diamond_gen_spawn_top` | 806 |  |
| `diamond_ore` | 232 |  |
| `diorite_brick` | 463 |  |
| `dirt` | 190 |  |
| `drop_location_block_side` | 814 |  |
| `drop_location_block_top` | 813 |  |
| `drop_pad` | 1038 |  |
| `dry_grass_block` | 980 |  |
| `dry_grass_block_side` | 979 |  |
| `electric_drill_back` | 1099 |  |
| `electric_drill_bottom` | 1098 |  |
| `electric_drill_front` | 1092 |  |
| `electric_drill_side` | 1093 |  |
| `electric_drill_side_running` | 34 | animated (4 frames) |
| `electric_drill_top` | 1094 | turned (4 rotated copies) |
| `emerald_block` | 237 |  |
| `emerald_ore` | 231 |  |
| `end_stone` | 226 |  |
| `engraved_andesite` | 464 |  |
| `engraved_diorite` | 462 |  |
| `engraved_granite` | 466 |  |
| `evil_lucky_block` | 1022 |  |
| `evil_lucky_block_face` | 1023 |  |
| `explosive_paint_black_side` | 626 |  |
| `explosive_paint_black_top` | 627 |  |
| `explosive_paint_blue_side` | 624 |  |
| `explosive_paint_blue_top` | 625 |  |
| `explosive_paint_brown_side` | 622 |  |
| `explosive_paint_brown_top` | 623 |  |
| `explosive_paint_cyan_side` | 620 |  |
| `explosive_paint_cyan_top` | 621 |  |
| `explosive_paint_gray_side` | 618 |  |
| `explosive_paint_gray_top` | 619 |  |
| `explosive_paint_green_side` | 616 |  |
| `explosive_paint_green_top` | 617 |  |
| `explosive_paint_light_blue_side` | 614 |  |
| `explosive_paint_light_blue_top` | 615 |  |
| `explosive_paint_light_gray_side` | 612 |  |
| `explosive_paint_light_gray_top` | 613 |  |
| `explosive_paint_lime_side` | 610 |  |
| `explosive_paint_lime_top` | 611 |  |
| `explosive_paint_magenta_side` | 608 |  |
| `explosive_paint_magenta_top` | 609 |  |
| `explosive_paint_orange_side` | 606 |  |
| `explosive_paint_orange_top` | 607 |  |
| `explosive_paint_pink_side` | 604 |  |
| `explosive_paint_pink_top` | 605 |  |
| `explosive_paint_purple_side` | 602 |  |
| `explosive_paint_purple_top` | 603 |  |
| `explosive_paint_quick_black` | 643 |  |
| `explosive_paint_quick_blue` | 642 |  |
| `explosive_paint_quick_brown` | 641 |  |
| `explosive_paint_quick_cyan` | 640 |  |
| `explosive_paint_quick_gray` | 639 |  |
| `explosive_paint_quick_green` | 638 |  |
| `explosive_paint_quick_light_blue` | 637 |  |
| `explosive_paint_quick_light_gray` | 636 |  |
| `explosive_paint_quick_lime` | 635 |  |
| `explosive_paint_quick_magenta` | 634 |  |
| `explosive_paint_quick_orange` | 633 |  |
| `explosive_paint_quick_pink` | 632 |  |
| `explosive_paint_quick_purple` | 631 |  |
| `explosive_paint_quick_red` | 630 |  |
| `explosive_paint_quick_white` | 629 |  |
| `explosive_paint_quick_yellow` | 628 |  |
| `explosive_paint_red_side` | 600 |  |
| `explosive_paint_red_top` | 601 |  |
| `explosive_paint_seeking_black` | 659 |  |
| `explosive_paint_seeking_blue` | 658 |  |
| `explosive_paint_seeking_brown` | 657 |  |
| `explosive_paint_seeking_cyan` | 656 |  |
| `explosive_paint_seeking_gray` | 655 |  |
| `explosive_paint_seeking_green` | 654 |  |
| `explosive_paint_seeking_light_blue` | 653 |  |
| `explosive_paint_seeking_light_gray` | 652 |  |
| `explosive_paint_seeking_lime` | 651 |  |
| `explosive_paint_seeking_magenta` | 650 |  |
| `explosive_paint_seeking_orange` | 649 |  |
| `explosive_paint_seeking_pink` | 648 |  |
| `explosive_paint_seeking_purple` | 647 |  |
| `explosive_paint_seeking_red` | 646 |  |
| `explosive_paint_seeking_white` | 645 |  |
| `explosive_paint_seeking_yellow` | 644 |  |
| `explosive_paint_sticky_black` | 675 |  |
| `explosive_paint_sticky_blue` | 674 |  |
| `explosive_paint_sticky_brown` | 673 |  |
| `explosive_paint_sticky_cyan` | 672 |  |
| `explosive_paint_sticky_gray` | 671 |  |
| `explosive_paint_sticky_green` | 670 |  |
| `explosive_paint_sticky_light_blue` | 669 |  |
| `explosive_paint_sticky_light_gray` | 668 |  |
| `explosive_paint_sticky_lime` | 667 |  |
| `explosive_paint_sticky_magenta` | 666 |  |
| `explosive_paint_sticky_orange` | 665 |  |
| `explosive_paint_sticky_pink` | 664 |  |
| `explosive_paint_sticky_purple` | 663 |  |
| `explosive_paint_sticky_red` | 662 |  |
| `explosive_paint_sticky_white` | 661 |  |
| `explosive_paint_sticky_yellow` | 660 |  |
| `explosive_paint_white_side` | 598 |  |
| `explosive_paint_white_top` | 599 |  |
| `explosive_paint_yellow_side` | 596 |  |
| `explosive_paint_yellow_top` | 597 |  |
| `extra_compressed_messy_stone` | 531 |  |
| `fallen_cherry_leaves_side` | 586 |  |
| `fallen_maple_leaves_side` | 478 |  |
| `farmland` | 433 |  |
| `fast_belt_slab_side` | 1157 |  |
| `fast_belt_top` | 1156 |  |
| `fast_belt_turn_left` | 1173 |  |
| `fast_belt_turn_right` | 1174 |  |
| `fertilised_soil` | 926 |  |
| `finish_block` | 812 |  |
| `fireball_block` | 539 |  |
| `food_lucky_block` | 1007 |  |
| `food_lucky_block_rare` | 1009 |  |
| `food_lucky_block_super` | 1011 |  |
| `forge_hopper_top` | 1168 |  |
| `furnace_front` | 335 |  |
| `furnace_side` | 336 |  |
| `furnace_top` | 337 |  |
| `generator_side` | 1063 |  |
| `generator_side_running` | 30 | animated (4 frames) |
| `generator_top` | 1064 |  |
| `ghost_chest_back` | 956 |  |
| `ghost_chest_front` | 953 |  |
| `ghost_chest_side` | 954 |  |
| `ghost_chest_top` | 955 |  |
| `ghost_lucky_block` | 957 |  |
| `ghost_mystery_block` | 958 |  |
| `glass` | 294 |  |
| `glass_black` | 295 |  |
| `glass_blue` | 296 |  |
| `glass_brown` | 297 |  |
| `glass_cyan` | 298 |  |
| `glass_gray` | 299 |  |
| `glass_green` | 301 |  |
| `glass_light_blue` | 302 |  |
| `glass_light_gray` | 300 |  |
| `glass_lime` | 303 |  |
| `glass_magenta` | 304 |  |
| `glass_orange` | 305 |  |
| `glass_pink` | 306 |  |
| `glass_purple` | 307 |  |
| `glass_red` | 308 |  |
| `glass_silver` | 311 |  |
| `glass_white` | 309 |  |
| `glass_yellow` | 310 |  |
| `glowstone` | 331 |  |
| `gold_block` | 235 |  |
| `gold_deposit` | 1036 |  |
| `gold_ore` | 229 |  |
| `granite_brick` | 467 |  |
| `grass_block_side` | 192 |  |
| `grass_top` | 193 |  |
| `gravel` | 196 |  |
| `gray_concrete` | 271 |  |
| `gray_gen_spawn_coal` | 792 |  |
| `gray_gen_spawn_iron` | 793 |  |
| `gray_gen_spawn_top` | 791 |  |
| `gray_glazed_terracotta` | 397 | turned (4 rotated copies) |
| `gray_planks` | 358 |  |
| `gray_portal` | 6 | animated (4 frames) |
| `gray_spawn_block_side` | 740 |  |
| `gray_spawn_block_top` | 736 | turned (4 rotated copies) |
| `green_bricks` | 459 |  |
| `green_concrete` | 285 |  |
| `green_glazed_terracotta` | 421 | turned (4 rotated copies) |
| `green_lucky_block` | 1006 |  |
| `green_lucky_block_rare` | 1008 |  |
| `green_lucky_block_super` | 1010 |  |
| `green_planks` | 364 |  |
| `green_portal` | 7 | animated (4 frames) |
| `green_spawn_block_side` | 735 |  |
| `green_spawn_block_top` | 731 | turned (4 rotated copies) |
| `green_stone` | 458 |  |
| `grenade_block` | 581 |  |
| `grey_portal` | 8 | animated (4 frames) |
| `gun_lucky_block` | 952 |  |
| `hardened_clay` | 254 |  |
| `hardened_clay_stained_black` | 270 |  |
| `hardened_clay_stained_blue` | 266 |  |
| `hardened_clay_stained_brown` | 267 |  |
| `hardened_clay_stained_cyan` | 264 |  |
| `hardened_clay_stained_gray` | 262 |  |
| `hardened_clay_stained_green` | 268 |  |
| `hardened_clay_stained_light_blue` | 258 |  |
| `hardened_clay_stained_lime` | 260 |  |
| `hardened_clay_stained_magenta` | 257 |  |
| `hardened_clay_stained_orange` | 256 |  |
| `hardened_clay_stained_pink` | 261 |  |
| `hardened_clay_stained_purple` | 265 |  |
| `hardened_clay_stained_red` | 269 |  |
| `hardened_clay_stained_silver` | 263 |  |
| `hardened_clay_stained_white` | 255 |  |
| `hardened_clay_stained_yellow` | 259 |  |
| `harvester_bottom` | 969 |  |
| `harvester_lunite_bottom` | 977 |  |
| `harvester_lunite_side_0` | 974 |  |
| `harvester_lunite_side_1` | 975 |  |
| `harvester_lunite_top` | 976 |  |
| `harvester_side0` | 966 |  |
| `harvester_side1` | 967 |  |
| `harvester_top` | 968 |  |
| `hay_block_side` | 328 |  |
| `homestead_core` | 1037 |  |
| `homestead_core_cap` | 1122 |  |
| `homestead_core_crown` | 1121 |  |
| `homestead_core_mid` | 26 | animated (4 frames) |
| `hyper_compressed_messy_stone` | 533 |  |
| `ice` | 326 |  |
| `ice_brick` | 468 |  |
| `iceball_block` | 540 |  |
| `invisible_solid` | 314 |  |
| `iron_block` | 234 |  |
| `iron_chest_back` | 917 |  |
| `iron_chest_front` | 911 |  |
| `iron_chest_side` | 912 |  |
| `iron_chest_top` | 913 | turned (4 rotated copies) |
| `iron_deposit` | 1033 |  |
| `iron_ore` | 228 |  |
| `iron_watermelon_side` | 546 |  |
| `iron_watermelon_top` | 547 |  |
| `jungle_grass_block` | 889 |  |
| `jungle_grass_block_side` | 888 |  |
| `lapis_block` | 236 |  |
| `lapis_ore` | 230 |  |
| `lava` | 1 | animated (8 frames) |
| `leather_block_side` | 908 |  |
| `leather_block_top` | 909 |  |
| `leaves_aspen` | 288 |  |
| `leaves_aspen_autumn` | 910 |  |
| `leaves_cedar` | 470 |  |
| `leaves_cherry` | 585 |  |
| `leaves_cherry_fruity` | 906 |  |
| `leaves_jungle` | 290 |  |
| `leaves_mango` | 894 |  |
| `leaves_mango_fruity` | 907 |  |
| `leaves_maple` | 289 |  |
| `leaves_maple_autumn` | 477 |  |
| `leaves_maple_fruity` | 901 |  |
| `leaves_palm` | 471 |  |
| `leaves_palm_fruity` | 904 |  |
| `leaves_pear` | 525 |  |
| `leaves_pear_fruity` | 905 |  |
| `leaves_pine` | 287 |  |
| `leaves_pine_cone` | 902 |  |
| `leaves_plum` | 469 |  |
| `leaves_plum_fruity` | 903 |  |
| `leaves_spectral` | 831 |  |
| `light_blue_concrete` | 277 |  |
| `light_blue_glazed_terracotta` | 381 | turned (4 rotated copies) |
| `light_blue_lucky_block` | 933 |  |
| `light_blue_planks` | 354 |  |
| `light_blue_spawn_block_side` | 730 |  |
| `light_blue_spawn_block_top` | 726 | turned (4 rotated copies) |
| `light_gray_concrete` | 272 |  |
| `light_gray_glazed_terracotta` | 401 | turned (4 rotated copies) |
| `light_gray_planks` | 359 |  |
| `light_gray_spawn_block_side` | 725 |  |
| `light_gray_spawn_block_top` | 721 | turned (4 rotated copies) |
| `lightblue_portal` | 9 | animated (4 frames) |
| `lightgray_portal` | 10 | animated (4 frames) |
| `lime_concrete` | 278 |  |
| `lime_gen_spawn_coal` | 777 |  |
| `lime_gen_spawn_iron` | 778 |  |
| `lime_gen_spawn_top` | 776 |  |
| `lime_glazed_terracotta` | 389 | turned (4 rotated copies) |
| `lime_planks` | 356 |  |
| `lime_portal` | 11 | animated (4 frames) |
| `lime_spawn_block_side` | 720 |  |
| `lime_spawn_block_top` | 716 | turned (4 rotated copies) |
| `log_ancient_maple` | 1021 |  |
| `log_aspen` | 202 |  |
| `log_cedar` | 201 |  |
| `log_cherry` | 582 |  |
| `log_jungle` | 203 |  |
| `log_mango` | 891 |  |
| `log_maple` | 198 |  |
| `log_palm` | 472 |  |
| `log_pear` | 523 |  |
| `log_pine` | 199 |  |
| `log_plum` | 200 |  |
| `log_spectral` | 828 |  |
| `lucky_block_pink_question` | 959 |  |
| `lucky_block_pink_question_rare` | 1013 |  |
| `lucky_block_pink_question_super` | 1015 |  |
| `lunite_block` | 971 |  |
| `lunite_ore` | 970 |  |
| `machine_bench_side` | 1115 |  |
| `machine_bench_top` | 1116 |  |
| `machine_side` | 1039 |  |
| `magenta_concrete` | 279 |  |
| `magenta_glazed_terracotta` | 377 | turned (4 rotated copies) |
| `magenta_planks` | 353 |  |
| `magenta_portal` | 12 | animated (4 frames) |
| `magenta_spawn_block_side` | 715 |  |
| `magenta_spawn_block_top` | 711 | turned (4 rotated copies) |
| `magma` | 451 |  |
| `mailbox_front` | 571 |  |
| `mailbox_front_full` | 573 |  |
| `mailbox_side` | 572 |  |
| `mango_block_bottom` | 898 |  |
| `mango_block_side` | 896 |  |
| `mango_block_top` | 897 |  |
| `mega_compressed_messy_stone` | 535 |  |
| `melon_side` | 544 |  |
| `melon_top` | 545 |  |
| `melting_ice` | 595 |  |
| `messy_stone` | 216 |  |
| `mob_spawner_block_empty_side` | 823 |  |
| `mob_spawner_block_top` | 821 |  |
| `mob_spawner_hostile_block_side` | 822 |  |
| `mob_spawner_neutral_block_side` | 838 |  |
| `mob_spawner_passive_block_side` | 820 |  |
| `moonstone_block` | 450 |  |
| `moonstone_chest_back` | 449 |  |
| `moonstone_chest_front` | 443 |  |
| `moonstone_chest_side` | 444 |  |
| `moonstone_chest_top` | 445 | turned (4 rotated copies) |
| `moonstone_explosive_side` | 332 |  |
| `moonstone_explosive_top` | 333 |  |
| `moonstone_gen_spawn_side` | 809 |  |
| `moonstone_gen_spawn_top` | 808 |  |
| `moonstone_ore` | 442 |  |
| `mossy_cobblestone` | 438 |  |
| `mushroom_stem` | 538 |  |
| `mystery_block` | 578 |  |
| `neon_black` | 951 |  |
| `neon_blue` | 950 |  |
| `neon_brown` | 949 |  |
| `neon_cyan` | 948 |  |
| `neon_gray` | 947 |  |
| `neon_green` | 946 |  |
| `neon_light_blue` | 945 |  |
| `neon_light_gray` | 944 |  |
| `neon_lime` | 943 |  |
| `neon_magenta` | 942 |  |
| `neon_orange` | 941 |  |
| `neon_pink` | 940 |  |
| `neon_purple` | 939 |  |
| `neon_red` | 938 |  |
| `neon_white` | 937 |  |
| `neon_yellow` | 936 |  |
| `nether_brick` | 317 |  |
| `netherrack` | 318 |  |
| `obby_absorb_block` | 816 |  |
| `obby_absorb_death_block` | 817 |  |
| `obby_death_block` | 815 |  |
| `obsidian` | 327 |  |
| `orange_concrete` | 280 |  |
| `orange_glazed_terracotta` | 373 | turned (4 rotated copies) |
| `orange_lucky_block` | 1000 |  |
| `orange_lucky_block_rare` | 1002 |  |
| `orange_lucky_block_super` | 1004 |  |
| `orange_planks` | 352 |  |
| `orange_portal` | 13 | animated (4 frames) |
| `orange_spawn_block_side` | 710 |  |
| `orange_spawn_block_top` | 706 | turned (4 rotated copies) |
| `ore_gen_spawn_side` | 811 |  |
| `ore_gen_spawn_top` | 810 |  |
| `packed_snow` | 826 |  |
| `parts_bench_side` | 1117 |  |
| `parts_bench_top` | 1118 |  |
| `patterned_glass_black` | 548 |  |
| `patterned_glass_blue` | 549 |  |
| `patterned_glass_brown` | 550 |  |
| `patterned_glass_cyan` | 551 |  |
| `patterned_glass_gray` | 552 |  |
| `patterned_glass_green` | 554 |  |
| `patterned_glass_light_blue` | 555 |  |
| `patterned_glass_light_gray` | 553 |  |
| `patterned_glass_lime` | 556 |  |
| `patterned_glass_magenta` | 557 |  |
| `patterned_glass_orange` | 558 |  |
| `patterned_glass_pink` | 559 |  |
| `patterned_glass_purple` | 560 |  |
| `patterned_glass_red` | 561 |  |
| `patterned_glass_white` | 562 |  |
| `patterned_glass_yellow` | 563 |  |
| `pear_block_bottom` | 529 |  |
| `pear_block_side` | 527 |  |
| `pear_block_top` | 528 |  |
| `pet_lucky_block` | 960 |  |
| `pine_cone_block_side` | 836 |  |
| `pine_cone_block_top` | 837 |  |
| `pine_grass_block` | 834 |  |
| `pine_grass_block_side` | 833 |  |
| `pink_concrete` | 281 |  |
| `pink_gen_spawn_coal` | 789 |  |
| `pink_gen_spawn_iron` | 790 |  |
| `pink_gen_spawn_top` | 788 |  |
| `pink_glazed_terracotta` | 393 | turned (4 rotated copies) |
| `pink_planks` | 357 |  |
| `pink_portal` | 14 | animated (4 frames) |
| `pink_spawn_block_side` | 705 |  |
| `pink_spawn_block_top` | 701 | turned (4 rotated copies) |
| `planks_aspen` | 205 |  |
| `planks_cedar` | 209 |  |
| `planks_cherry` | 584 |  |
| `planks_jungle` | 207 |  |
| `planks_mango` | 893 |  |
| `planks_maple` | 204 |  |
| `planks_palm` | 473 |  |
| `planks_pear` | 524 |  |
| `planks_pine` | 208 |  |
| `planks_plum` | 206 |  |
| `planks_spectral` | 830 |  |
| `plum_block_bottom` | 519 |  |
| `plum_block_side` | 517 |  |
| `plum_block_top` | 518 |  |
| `podzol_top` | 452 |  |
| `potato_block` | 922 |  |
| `potion_lucky_block` | 1012 |  |
| `potion_lucky_block_rare` | 1014 |  |
| `potion_lucky_block_super` | 1016 |  |
| `press_back` | 1071 |  |
| `press_front` | 1065 |  |
| `press_side` | 1066 |  |
| `press_side_running` | 31 | animated (4 frames) |
| `press_top` | 1067 | turned (4 rotated copies) |
| `protector` | 348 |  |
| `protector_faction` | 575 |  |
| `protector_tribe` | 574 |  |
| `pumpkin_face_on` | 291 |  |
| `pumpkin_side` | 541 |  |
| `pumpkin_top` | 542 |  |
| `pure_coal_ore` | 1024 |  |
| `pure_copper_ore` | 1204 |  |
| `pure_diamond_ore` | 1027 |  |
| `pure_gold_ore` | 1026 |  |
| `pure_iron_ore` | 1025 |  |
| `pure_moonstone_ore` | 1028 |  |
| `pure_voltite_ore` | 1205 |  |
| `purple_concrete` | 282 |  |
| `purple_glazed_terracotta` | 409 | turned (4 rotated copies) |
| `purple_lucky_block` | 988 |  |
| `purple_lucky_block_rare` | 990 |  |
| `purple_lucky_block_super` | 992 |  |
| `purple_planks` | 361 |  |
| `purple_portal` | 15 | animated (4 frames) |
| `purple_spawn_block_side` | 700 |  |
| `purple_spawn_block_top` | 696 | turned (4 rotated copies) |
| `quartz_block_chiseled` | 320 |  |
| `quartz_block_side` | 319 |  |
| `radar_bottom` | 929 |  |
| `radar_screen` | 19 | animated (4 frames) · turned (4 rotated copies) |
| `radar_side_active` | 927 |  |
| `radar_side_inactive` | 930 |  |
| `radar_top_active` | 928 |  |
| `radar_top_inactive` | 931 |  |
| `recycler_back` | 1181 |  |
| `recycler_front` | 1175 |  |
| `recycler_side` | 1176 |  |
| `recycler_side_running` | 43 | animated (4 frames) |
| `recycler_top` | 1177 | turned (4 rotated copies) |
| `red_concrete` | 283 |  |
| `red_gen_spawn_coal` | 771 |  |
| `red_gen_spawn_iron` | 772 |  |
| `red_gen_spawn_top` | 770 |  |
| `red_glazed_terracotta` | 425 | turned (4 rotated copies) |
| `red_lucky_block` | 934 |  |
| `red_lucky_block_rare` | 984 |  |
| `red_lucky_block_super` | 986 |  |
| `red_mushroom_block` | 537 |  |
| `red_planks` | 365 |  |
| `red_portal` | 16 | animated (4 frames) |
| `red_sand` | 474 |  |
| `red_sandstone` | 454 |  |
| `red_sandstone_brick` | 475 |  |
| `red_sandstone_top` | 455 |  |
| `red_spawn_block_side` | 695 |  |
| `red_spawn_block_top` | 691 | turned (4 rotated copies) |
| `redstone_lamp_off` | 313 |  |
| `redstone_lamp_on` | 312 |  |
| `rocket_block` | 579 |  |
| `rocky_dirt` | 476 |  |
| `rope_block` | 1030 |  |
| `sand` | 194 |  |
| `sandstone_brick` | 461 |  |
| `sandstone_normal` | 225 |  |
| `sandstone_top` | 324 |  |
| `shatter_mill_back` | 1147 |  |
| `shatter_mill_front` | 1141 |  |
| `shatter_mill_side` | 1142 |  |
| `shatter_mill_side_running` | 40 | animated (4 frames) |
| `shatter_mill_top` | 1143 | turned (4 rotated copies) |
| `shop_trader_spawn_face` | 799 |  |
| `shop_trader_spawn_side` | 798 |  |
| `shop_trader_spawn_top` | 794 | turned (4 rotated copies) |
| `shop_wizard_spawn_face` | 805 |  |
| `shop_wizard_spawn_side` | 804 |  |
| `shop_wizard_spawn_top` | 800 | turned (4 rotated copies) |
| `sky_tap_back` | 1155 |  |
| `sky_tap_bottom` | 1154 |  |
| `sky_tap_front` | 1148 |  |
| `sky_tap_side` | 1149 |  |
| `sky_tap_side_running` | 41 | animated (4 frames) |
| `sky_tap_top` | 1150 | turned (4 rotated copies) |
| `slab_andesite_brick_side` | 498 |  |
| `slab_aspen_side` | 483 |  |
| `slab_brick_side` | 515 |  |
| `slab_cedar_side` | 482 |  |
| `slab_cherry_side` | 587 |  |
| `slab_chiseled_red_sandstone_side` | 512 |  |
| `slab_chiseled_sandstone_side` | 508 |  |
| `slab_cobblestone_side` | 488 |  |
| `slab_cut_red_sandstone_side` | 513 |  |
| `slab_cut_sandstone_side` | 509 |  |
| `slab_diorite_brick_side` | 502 |  |
| `slab_dirt_side` | 486 |  |
| `slab_dry_grass_top_side` | 981 |  |
| `slab_engraved_andesite_side` | 497 |  |
| `slab_engraved_diorite_side` | 501 |  |
| `slab_engraved_granite_side` | 505 |  |
| `slab_granite_brick_side` | 506 |  |
| `slab_grass_top_side` | 487 |  |
| `slab_ice_brick_side` | 516 |  |
| `slab_jungle_grass_top_side` | 890 |  |
| `slab_jungle_side` | 484 |  |
| `slab_mango_side` | 895 |  |
| `slab_maple_side` | 479 |  |
| `slab_mossy_cobblestone_side` | 493 |  |
| `slab_palm_side` | 485 |  |
| `slab_pear_side` | 526 |  |
| `slab_pine_grass_top_side` | 835 |  |
| `slab_pine_side` | 480 |  |
| `slab_plum_side` | 481 |  |
| `slab_red_sandstone_brick_side` | 514 |  |
| `slab_red_sandstone_side` | 511 |  |
| `slab_sandstone_brick_side` | 510 |  |
| `slab_sandstone_normal_side` | 507 |  |
| `slab_smooth_stone_side` | 490 |  |
| `slab_spectral_side` | 832 |  |
| `slab_stone_andesite_side` | 495 |  |
| `slab_stone_andesite_smooth_side` | 496 |  |
| `slab_stone_diorite_side` | 499 |  |
| `slab_stone_diorite_smooth_side` | 500 |  |
| `slab_stone_granite_side` | 503 |  |
| `slab_stone_granite_smooth_side` | 504 |  |
| `slab_stone_side` | 489 |  |
| `slab_stonebrick_carved_side` | 491 |  |
| `slab_stonebrick_mossy_side` | 494 |  |
| `slab_stonebrick_side` | 492 |  |
| `smelter_back` | 1062 |  |
| `smelter_front` | 1056 |  |
| `smelter_side` | 1057 |  |
| `smelter_side_running` | 29 | animated (4 frames) |
| `smelter_top` | 1058 | turned (4 rotated copies) |
| `smoke` | 23 | animated (4 frames) |
| `smooth_stone` | 218 |  |
| `snow` | 197 |  |
| `snowy_messy_stone` | 824 |  |
| `snowy_messy_stone_side` | 825 |  |
| `solar_panel_bottom` | 965 |  |
| `solar_panel_side` | 963 |  |
| `solar_panel_top` | 964 |  |
| `sorting_gate_slab_side` | 1108 |  |
| `sorting_gate_top` | 1107 |  |
| `splitter_slab_side` | 1083 |  |
| `splitter_top` | 1082 |  |
| `sponge` | 329 |  |
| `starframe` | 1167 |  |
| `stone` | 217 |  |
| `stone_andesite` | 221 |  |
| `stone_andesite_smooth` | 222 |  |
| `stone_deposit` | 1034 |  |
| `stone_diorite` | 219 |  |
| `stone_diorite_smooth` | 220 |  |
| `stone_granite` | 223 |  |
| `stone_granite_smooth` | 224 |  |
| `stonebrick` | 316 |  |
| `stonebrick_carved` | 321 |  |
| `stonebrick_cracked` | 323 |  |
| `stonebrick_mossy` | 322 |  |
| `storage_silo_side` | 1112 |  |
| `storage_silo_top` | 1111 |  |
| `stripped_aspen_log` | 211 |  |
| `stripped_cedar_log` | 215 |  |
| `stripped_cherry_log` | 583 |  |
| `stripped_jungle_log` | 213 |  |
| `stripped_mango_log` | 892 |  |
| `stripped_maple_log` | 210 |  |
| `stripped_palm_log` | 576 |  |
| `stripped_pear_log` | 577 |  |
| `stripped_pine_log` | 214 |  |
| `stripped_plum_log` | 212 |  |
| `stripped_spectral_log` | 829 |  |
| `super_compressed_messy_stone` | 532 |  |
| `super_rocket_block` | 580 |  |
| `tool_bench_side` | 1119 |  |
| `tool_bench_top` | 1120 |  |
| `tools_lucky_block` | 1001 |  |
| `tools_lucky_block_rare` | 1003 |  |
| `tools_lucky_block_super` | 1005 |  |
| `toxic_waste` | 25 | animated (8 frames) |
| `toxic_waste_barrel_bottom` | 1020 |  |
| `toxic_waste_barrel_side` | 1019 |  |
| `toxic_waste_barrel_top` | 24 | animated (4 frames) |
| `toxin_ball_block` | 680 |  |
| `tree_cutter_back` | 1129 |  |
| `tree_cutter_back_running` | 37 | animated (4 frames) |
| `tree_cutter_front` | 1123 |  |
| `tree_cutter_side` | 1124 |  |
| `tree_cutter_side_running` | 36 | animated (4 frames) |
| `tree_cutter_top` | 1125 | turned (4 rotated copies) |
| `ultra_compressed_messy_stone` | 534 |  |
| `unloaded` | 189 |  |
| `volt_engine_side` | 1131 |  |
| `volt_engine_side_running` | 38 | animated (4 frames) |
| `volt_engine_top` | 1132 |  |
| `voltite_deposit` | 1130 |  |
| `voltite_ore` | 1084 |  |
| `watermelon_side` | 292 |  |
| `watermelon_top` | 293 |  |
| `weapon_lucky_block` | 935 |  |
| `weapon_lucky_block_rare` | 985 |  |
| `weapon_lucky_block_super` | 987 |  |
| `white_concrete` | 284 |  |
| `white_gen_spawn_coal` | 786 |  |
| `white_gen_spawn_iron` | 787 |  |
| `white_gen_spawn_top` | 785 |  |
| `white_glazed_terracotta` | 369 | turned (4 rotated copies) |
| `white_planks` | 351 |  |
| `white_portal` | 17 | animated (4 frames) |
| `white_spawn_block_side` | 690 |  |
| `white_spawn_block_top` | 686 | turned (4 rotated copies) |
| `wire_mill_back` | 1078 |  |
| `wire_mill_front` | 1072 |  |
| `wire_mill_side` | 1073 |  |
| `wire_mill_side_running` | 32 | animated (4 frames) |
| `wire_mill_top` | 1074 | turned (4 rotated copies) |
| `wool_colored_black` | 253 |  |
| `wool_colored_blue` | 249 |  |
| `wool_colored_brown` | 250 |  |
| `wool_colored_cyan` | 247 |  |
| `wool_colored_gray` | 245 |  |
| `wool_colored_green` | 251 |  |
| `wool_colored_light_blue` | 241 |  |
| `wool_colored_light_grey` | 246 |  |
| `wool_colored_lime` | 243 |  |
| `wool_colored_magenta` | 240 |  |
| `wool_colored_orange` | 239 |  |
| `wool_colored_pink` | 244 |  |
| `wool_colored_purple` | 248 |  |
| `wool_colored_red` | 252 |  |
| `wool_colored_white` | 238 |  |
| `wool_colored_yellow` | 242 |  |
| `yellow_concrete` | 286 |  |
| `yellow_gen_spawn_coal` | 780 |  |
| `yellow_gen_spawn_iron` | 781 |  |
| `yellow_gen_spawn_top` | 779 |  |
| `yellow_glazed_terracotta` | 385 | turned (4 rotated copies) |
| `yellow_lucky_block` | 932 |  |
| `yellow_lucky_block_rare` | 982 |  |
| `yellow_lucky_block_super` | 983 |  |
| `yellow_planks` | 355 |  |
| `yellow_portal` | 18 | animated (4 frames) |
| `yellow_spawn_block_side` | 685 |  |
| `yellow_spawn_block_top` | 681 | turned (4 rotated copies) |

### 68.3 회전족 (57개 루트)

이 텍스처들은 미리 회전된 복사본(`name[rot[1..4`)으로만 존재한다; 레지스트리는 루트로 접고 `bloxdTexel`이 회전을 재적용한다(§57.4).

- `alloy_kiln_top` (id 1087)
- `auto_bench_top` (id 1102)
- `belt_tunnel_exit_top` (id 1200)
- `belt_tunnel_top` (id 1195)
- `black_glazed_terracotta` (id 429)
- `black_spawn_block_top` (id 756)
- `blue_glazed_terracotta` (id 413)
- `blue_spawn_block_top` (id 751)
- `brown_glazed_terracotta` (id 417)
- `brown_spawn_block_top` (id 746)
- `burner_drill_top` (id 1043)
- `checkpoint_block` (id 761)
- `chest_top` (id 343)
- `crop_harvester_top` (id 1188)
- `crusher_top` (id 1051)
- `crystal_vat_top` (id 1162)
- `custom_lobby_block_top` (id 765)
- `cyan_glazed_terracotta` (id 405)
- `cyan_spawn_block_top` (id 741)
- `deep_drill_top` (id 1135)
- `electric_drill_top` (id 1094)
- `gray_glazed_terracotta` (id 397)
- `gray_spawn_block_top` (id 736)
- `green_glazed_terracotta` (id 421)
- `green_spawn_block_top` (id 731)
- `iron_chest_top` (id 913)
- `light_blue_glazed_terracotta` (id 381)
- `light_blue_spawn_block_top` (id 726)
- `light_gray_glazed_terracotta` (id 401)
- `light_gray_spawn_block_top` (id 721)
- `lime_glazed_terracotta` (id 389)
- `lime_spawn_block_top` (id 716)
- `magenta_glazed_terracotta` (id 377)
- `magenta_spawn_block_top` (id 711)
- `moonstone_chest_top` (id 445)
- `orange_glazed_terracotta` (id 373)
- `orange_spawn_block_top` (id 706)
- `pink_glazed_terracotta` (id 393)
- `pink_spawn_block_top` (id 701)
- `press_top` (id 1067)
- `purple_glazed_terracotta` (id 409)
- `purple_spawn_block_top` (id 696)
- `radar_screen0` (id 19) · also animated
- `recycler_top` (id 1177)
- `red_glazed_terracotta` (id 425)
- `red_spawn_block_top` (id 691)
- `shatter_mill_top` (id 1143)
- `shop_trader_spawn_top` (id 794)
- `shop_wizard_spawn_top` (id 800)
- `sky_tap_top` (id 1150)
- `smelter_top` (id 1058)
- `tree_cutter_top` (id 1125)
- `white_glazed_terracotta` (id 369)
- `white_spawn_block_top` (id 686)
- `wire_mill_top` (id 1074)
- `yellow_glazed_terracotta` (id 385)
- `yellow_spawn_block_top` (id 681)

### 68.4 애니메이션족 (42개 이름)

이 이름들을 샘플링하면 현재 애니메이션 프레임이 자동으로 반환된다(§63.3) — 프레임 접미사는 에러다.

간격은 족별로 고정되어 있고 `cnty9`에서 실측했다 — 값은 세 가지뿐: **200 ms** (`lava`, `toxic_waste`, `radar_screen`), **250 ms** (`smoke`, `homestead_core_mid`, 모든 기계 `*_running` 족), **300 ms** (열일곱 포털과 `toxic_waste_barrel_top`); «간격» 열을 참조할 것. 참고로 아틀라스는 42가 아니라 45개 애니메이션 루트를 담는다: `radar_screen`의 네 미리 회전된 복사본이 각자 자신의 4-프레임 사다리를 진행한다.

| 이름 | 프레임 | 간격 | 레지스트리 베이스 |
|---|---|---|---|
| `lava` | 8 | 200 ms | `lava0` |
| `toxic_waste` | 8 | 200 ms | `toxic_waste0` |
| `alloy_kiln_side_running` | 4 | 250 ms | `alloy_kiln_side_running0` |
| `auto_bench_side_running` | 4 | 250 ms | `auto_bench_side_running0` |
| `black_portal` | 4 | 300 ms | `black_portal0` |
| `blue_portal` | 4 | 300 ms | `blue_portal0` |
| `brown_portal` | 4 | 300 ms | `brown_portal0` |
| `burner_drill_side_running` | 4 | 250 ms | `burner_drill_side_running0` |
| `crop_harvester_back_running` | 4 | 250 ms | `crop_harvester_back_running0` |
| `crop_harvester_side_running` | 4 | 250 ms | `crop_harvester_side_running0` |
| `crusher_side_running` | 4 | 250 ms | `crusher_side_running0` |
| `crystal_vat_side_running` | 4 | 250 ms | `crystal_vat_side_running0` |
| `cyan_portal` | 4 | 300 ms | `cyan_portal0` |
| `deep_drill_side_running` | 4 | 250 ms | `deep_drill_side_running0` |
| `electric_drill_side_running` | 4 | 250 ms | `electric_drill_side_running0` |
| `generator_side_running` | 4 | 250 ms | `generator_side_running0` |
| `gray_portal` | 4 | 300 ms | `gray_portal0` |
| `green_portal` | 4 | 300 ms | `green_portal0` |
| `grey_portal` | 4 | 300 ms | `grey_portal0` |
| `homestead_core_mid` | 4 | 250 ms | `homestead_core_mid0` |
| `lightblue_portal` | 4 | 300 ms | `lightblue_portal0` |
| `lightgray_portal` | 4 | 300 ms | `lightgray_portal0` |
| `lime_portal` | 4 | 300 ms | `lime_portal0` |
| `magenta_portal` | 4 | 300 ms | `magenta_portal0` |
| `orange_portal` | 4 | 300 ms | `orange_portal0` |
| `pink_portal` | 4 | 300 ms | `pink_portal0` |
| `press_side_running` | 4 | 250 ms | `press_side_running0` |
| `purple_portal` | 4 | 300 ms | `purple_portal0` |
| `radar_screen` | 4 | 200 ms | `radar_screen0[rot[1` |
| `recycler_side_running` | 4 | 250 ms | `recycler_side_running0` |
| `red_portal` | 4 | 300 ms | `red_portal0` |
| `shatter_mill_side_running` | 4 | 250 ms | `shatter_mill_side_running0` |
| `sky_tap_side_running` | 4 | 250 ms | `sky_tap_side_running0` |
| `smelter_side_running` | 4 | 250 ms | `smelter_side_running0` |
| `smoke` | 4 | 250 ms | `smoke0` |
| `toxic_waste_barrel_top` | 4 | 300 ms | `toxic_waste_barrel_top0` |
| `tree_cutter_back_running` | 4 | 250 ms | `tree_cutter_back_running0` |
| `tree_cutter_side_running` | 4 | 250 ms | `tree_cutter_side_running0` |
| `volt_engine_side_running` | 4 | 250 ms | `volt_engine_side_running0` |
| `white_portal` | 4 | 300 ms | `white_portal0` |
| `wire_mill_side_running` | 4 | 250 ms | `wire_mill_side_running0` |
| `yellow_portal` | 4 | 300 ms | `yellow_portal0` |

### 68.5 레지스트리 드리프트 측정 (sjr0p7 → cnty9)

10월에 측정된 두 빌드, 열흘 간격:

- Entries: 1,200 → 1,219 (98 added, 79 removed)
- Names that kept their spelling: 1,121 — of which **779 changed id** (69%)
- A naming convention migrated mid-month: 68 `_rot1..4` suffix names became `[rot[1..4` slots, and the double-chest textures (`chest_double_*`, 8 entries) appeared with them
- The usable-name count moved 900 → 905, and the registry hash in `HEADER_VERSION` (§65.1) re-invalidated every saved pack that had baked ids

Write `bloxdTextureIdLava`, not `19` — a name-constant survives every one of those bullets unchanged.

### 68.6 드리프트 전체 목록 (98개 추가, 79개 제거)

§68.5의 수치를 이름별로 전부 적은 것이다 — 10월에 만든 텍스처 팩을 갱신하는 이는 어떤 파일명이 더 이상 일치하지 않는지 정확히 알아야 하기 때문이다. 비교 대상은 *철자* 층(텍스처 팩이 쓰는 파일명)이며, §64의 접기 규칙이 그 철자들을 §68.2의 사용 가능 상수로 바꾼다.

**회전 접기 이행 — 기계 상판 17종 (철자 68개 제거, 슬롯 68개 추가).** `alloy_kiln_top`, `auto_bench_top`, `belt_tunnel_exit_top`, `belt_tunnel_top`, `burner_drill_top`, `crop_harvester_top`, `crusher_top`, `crystal_vat_top`, `deep_drill_top`, `electric_drill_top`, `press_top`, `recycler_top`, `shatter_mill_top`, `sky_tap_top`, `smelter_top`, `tree_cutter_top`, `wire_mill_top` 은(는) `_rot1..4` 변형 철자에서 `[rot[1..4` 미리 회전된 슬롯으로 옮겨졌다; 접힌 루트가 사용 가능한 이름이므로 텍스처 팩은 이제 `X_top_rotN.png` 네 개 대신 `X_top.png` 하나를 담으면 된다.

**상자 상판 접기 — 3족 (철자 6개 제거, 슬롯 12개 추가).** `chest_top_1`/`chest_top_2` → `chest_top`, `iron_chest_top_1`/`_2` → `iron_chest_top`, `moonstone_chest_top_1`/`_2` → `moonstone_chest_top`: 두-변형 철자가 루트 아래 미리 회전된 슬롯이 되었다 — PNG 파일명도 그에 맞게 바꿀 것.

**새 텍스처 — 17개 이름.** 더블 상자 (`chest_double_back_hi`/`_lo`, `chest_double_front_hi`/`_lo`, `chest_double_top_1_hi`/`_lo`, `chest_double_top_2_hi`/`_lo`), 다크스톤 족 (`darkstone`, `darkstone_bricks`, `darkstone_bricks_cracked`, `darkstone_bricks_lava`, `darkstone_engraved`, `darkstone_smooth`), `pure_copper_ore`, `pure_voltite_ore`, 그리고 `forge_hopper_top`.

**단순 접기 1건.** `ghost_chest_top_1`/`ghost_chest_top_2` 가 단일 `ghost_chest_top` 로 접혔다.

**완전 제거 — 3개 이름.** `shaft_hopper_top`, `sun_panel_side`, `sun_panel_top` 은 새 레지스트리에 후계 철자가 없다 — 이 콘텐츠는 이 빌드와 함께 게임을 떠났다. `forge_hopper_top` 은 실제로 새 텍스처이지 검증된 개명이 아니다.

검증용 원시 철자 diff:

```text
+ 98 added (cnty9):
alloy_kiln_top[rot[1, alloy_kiln_top[rot[2, alloy_kiln_top[rot[3, alloy_kiln_top[rot[4, auto_bench_top[rot[1, auto_bench_top[rot[2
auto_bench_top[rot[3, auto_bench_top[rot[4, belt_tunnel_exit_top[rot[1, belt_tunnel_exit_top[rot[2, belt_tunnel_exit_top[rot[3, belt_tunnel_exit_top[rot[4
belt_tunnel_top[rot[1, belt_tunnel_top[rot[2, belt_tunnel_top[rot[3, belt_tunnel_top[rot[4, burner_drill_top[rot[1, burner_drill_top[rot[2
burner_drill_top[rot[3, burner_drill_top[rot[4, chest_double_back_hi, chest_double_back_lo, chest_double_front_hi, chest_double_front_lo
chest_double_top_1_hi, chest_double_top_1_lo, chest_double_top_2_hi, chest_double_top_2_lo, chest_top[rot[1, chest_top[rot[2
chest_top[rot[3, chest_top[rot[4, crop_harvester_top[rot[1, crop_harvester_top[rot[2, crop_harvester_top[rot[3, crop_harvester_top[rot[4
crusher_top[rot[1, crusher_top[rot[2, crusher_top[rot[3, crusher_top[rot[4, crystal_vat_top[rot[1, crystal_vat_top[rot[2
crystal_vat_top[rot[3, crystal_vat_top[rot[4, darkstone, darkstone_bricks, darkstone_bricks_cracked, darkstone_bricks_lava
darkstone_engraved, darkstone_smooth, deep_drill_top[rot[1, deep_drill_top[rot[2, deep_drill_top[rot[3, deep_drill_top[rot[4
electric_drill_top[rot[1, electric_drill_top[rot[2, electric_drill_top[rot[3, electric_drill_top[rot[4, forge_hopper_top, ghost_chest_top
iron_chest_top[rot[1, iron_chest_top[rot[2, iron_chest_top[rot[3, iron_chest_top[rot[4, moonstone_chest_top[rot[1, moonstone_chest_top[rot[2
moonstone_chest_top[rot[3, moonstone_chest_top[rot[4, press_top[rot[1, press_top[rot[2, press_top[rot[3, press_top[rot[4
pure_copper_ore, pure_voltite_ore, recycler_top[rot[1, recycler_top[rot[2, recycler_top[rot[3, recycler_top[rot[4
shatter_mill_top[rot[1, shatter_mill_top[rot[2, shatter_mill_top[rot[3, shatter_mill_top[rot[4, sky_tap_top[rot[1, sky_tap_top[rot[2
sky_tap_top[rot[3, sky_tap_top[rot[4, smelter_top[rot[1, smelter_top[rot[2, smelter_top[rot[3, smelter_top[rot[4
tree_cutter_top[rot[1, tree_cutter_top[rot[2, tree_cutter_top[rot[3, tree_cutter_top[rot[4, wire_mill_top[rot[1, wire_mill_top[rot[2
wire_mill_top[rot[3, wire_mill_top[rot[4

- 79 removed (sjr0p7):
alloy_kiln_top_rot1, alloy_kiln_top_rot2, alloy_kiln_top_rot3, alloy_kiln_top_rot4, auto_bench_top_rot1, auto_bench_top_rot2
auto_bench_top_rot3, auto_bench_top_rot4, belt_tunnel_exit_top_rot1, belt_tunnel_exit_top_rot2, belt_tunnel_exit_top_rot3, belt_tunnel_exit_top_rot4
belt_tunnel_top_rot1, belt_tunnel_top_rot2, belt_tunnel_top_rot3, belt_tunnel_top_rot4, burner_drill_top_rot1, burner_drill_top_rot2
burner_drill_top_rot3, burner_drill_top_rot4, chest_top_1, chest_top_2, crop_harvester_top_rot1, crop_harvester_top_rot2
crop_harvester_top_rot3, crop_harvester_top_rot4, crusher_top_rot1, crusher_top_rot2, crusher_top_rot3, crusher_top_rot4
crystal_vat_top_rot1, crystal_vat_top_rot2, crystal_vat_top_rot3, crystal_vat_top_rot4, deep_drill_top_rot1, deep_drill_top_rot2
deep_drill_top_rot3, deep_drill_top_rot4, electric_drill_top_rot1, electric_drill_top_rot2, electric_drill_top_rot3, electric_drill_top_rot4
ghost_chest_top_1, ghost_chest_top_2, iron_chest_top_1, iron_chest_top_2, moonstone_chest_top_1, moonstone_chest_top_2
press_top_rot1, press_top_rot2, press_top_rot3, press_top_rot4, recycler_top_rot1, recycler_top_rot2
recycler_top_rot3, recycler_top_rot4, shaft_hopper_top, shatter_mill_top_rot1, shatter_mill_top_rot2, shatter_mill_top_rot3
shatter_mill_top_rot4, sky_tap_top_rot1, sky_tap_top_rot2, sky_tap_top_rot3, sky_tap_top_rot4, smelter_top_rot1
smelter_top_rot2, smelter_top_rot3, smelter_top_rot4, sun_panel_side, sun_panel_top, tree_cutter_top_rot1
tree_cutter_top_rot2, tree_cutter_top_rot3, tree_cutter_top_rot4, wire_mill_top_rot1, wire_mill_top_rot2, wire_mill_top_rot3
wire_mill_top_rot4
```


[← Previous part](10-apiv4.md)·[Back to the manual](README.md)

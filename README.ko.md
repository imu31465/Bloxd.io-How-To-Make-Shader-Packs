# Bloxd.io 셰이더 팩 만드는 법 (완전판)

자급자족형 Bloxd.io 셰이더 팩 (WebGPU 렌더러 전용) 제작·배포 가이드.
`apiVersion: 1` 시점의 사양에 근거한다. 레시피집과 API 레퍼런스를 포함하므로 이 파일 하나로 처음부터 배포까지 가능하다.

> 본서는 비공식 가이드이며 개발사의 공식 입장이 아니다. API는 예고 없이 변경될 수 있다.
> 최종 리뷰: 2026-10-15. 공개된 공식 WGSL API 레퍼런스를 확인하지 못했으므로 API 설명과 레시피는 로딩 화면·실기 컴파일로 계속 검증할 것.
> 셰이더 팩 기능 자체는 게임 내 UI에서 불러올 수 있는 공식 기능이며, 팩은 순수 WGSL
> (JS 실행·통신 불가)이므로 일반적인 코드로는 위험한 일이 일어나지 않는다.
> 본 가이드는 AI의 도움을 받아 작성되었으며 내용의 정확성은 보장되지 않는다. 실제 게임 동작으로 확인할 것.

## 목차

- [제1부: 팩 만들기](#제1부-팩-만들기)
- [제2부: API 레퍼런스](#제2부-api-레퍼런스)
- [제3부: 레시피집](#제3부-레시피집)
- [제4부: 리얼화 가이드](#제4부-리얼화-가이드)
- [제5부: 트러블슈팅·주의](#제5부-트러블슈팅주의)
- [제6부: 구현 시 중요한 보충](#제6부-구현-시-중요한-보충)

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
  "apiVersion": 1,
  "name": "My Pack",
  "author": "your name"
}
```

| 필드 | 필수 | 설명 |
|---|---|---|
| `apiVersion` | 필수 | `1` 과 완전 일치시킬 것 |
| `name` | 필수 | 빈 문자열 불가. 설정 UI 에 표시된다 |
| `author` | 임의 | 생략 가능. 문자열 이외 (수치 등) 는 에러 |

그 외의 필드는 무시된다.

## 5. 최소 템플릿

`pack.json` (4장) 과 아래 `pack.wgsl` 만으로 동작하는 팩이 된다:

```wgsl
// 은은히 따뜻한 최소 팩
const packWarmth = 0.18;

fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

지킬 작법:

- 출력 구조체는 **직접 구축하지 않는다** (`bloxd_Surface(...)` 는 에러). 반드시 `bloxd_defaultSurface(s)` / `bloxd_defaultLight(s, l)` / `bloxd_defaultVertex(v)` 에서 시작해 필드를 고친다
- 훅의 파라미터는 **읽기 전용**이다. 고치고 싶으면 `var sv = s;` 처럼 복사하고 나서
- 자신의 식별자에 `bloxd_` 접두사는 쓸 수 없다 (6개 훅명 제외)
- 상수는 `const` 로 쓴다 (`#define` 에 값은 쓸 수 없다)

## 6. 6개 훅

전부 임의. 시그니처는 타입까지 정확히 일치시킬 것 (파라미터명은 자유).

| 훅 | 역할 |
|---|---|
| `fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex` | 지형 정점 이동. **strict 에서는 사용 불가** |
| `fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface` | 지형의 색·투명도·발광. `s.colour` 는 텍스처×정점색 |
| `fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light` | 지형의 최종색. **프래그먼트의 최종단**에서 불리며 반환값이 그대로 최종색이 된다 |
| `fn bloxd_liquid_vertex / _surface / _light` (동형) | 액체판. `alpha` 는 액체의 투과율로 작용한다 |

폴백 규칙:

- liquid 훅이 미정의면 **terrain 의 동명 훅이 쓰인다** (역은 없음). surface 만 써도 액체에 같은 효과가 걸린다
- light 훅이 미정의면 기존 동작 (`engineColour + emission × fogFactor`) 이 쓰인다
- `engineColour` 을 버리고 소재색에서 다시 짜면, 직접 포그를 다시 건다: `mix(l.fogColour, col, l.fogFactor)`. emission 을 더할 때는 `fogFactor` 를 곱하고 나서

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
- 좌표계는 noa 로컬. 월드 좌표로 하려면 `originOffset` 을 더한다. 블록 좌표는 `vec3i(floor(position - normal * 0.5)) + originOffset`

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
// Engine-provided and read-only to packs. apiVersion 1.
struct bloxd_VertexIn {
    position: vec3f,     // noa-local world space (world minus originOffset)
    normal: vec3f,
    originOffset: vec3i, // whole blocks
    time: f32,           // seconds, wrapped every 3600 s (part of the API)
}

#ifndef BLOXD_STRICT
struct bloxd_Vertex {
    position: vec3f,     // noa-local
}
#endif

struct bloxd_SurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher in v1)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    originOffset: vec3i, // a face's world block is vec3i(floor(position - normal * 0.5)) + originOffset
    eyePosition: vec3f,  // noa-local
    time: f32,
    sunDirection: vec3f, // unit, towards the sun, in world orientation; zero when the sky has no sun
}

struct bloxd_Surface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct bloxd_LightIn {
    engineColour: vec3f, // the engine's result for this fragment, from the surface hook's colour
    directional: f32,    // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,      // the material's ambient times the scene's
#ifdef BLOXD_LIGHTING
    blockLight: vec3f,   // voxel block light, tone-mapped
    skyLight: f32,       // voxel sky light, tone-mapped
    ambientLightColour: vec3f,
    skyLightColour: vec3f,
    heldLight: vec3f,    // held light here, tone-mapped like blockLight, before the ambient boost; 0 out of reach
#endif
    fogColour: vec3f,
    fogFactor: f32,      // 1 = no fog, 0 = fully fogged
    position: vec3f,     // as in bloxd_SurfaceIn
    normal: vec3f,
    originOffset: vec3i,
    eyePosition: vec3f,
    time: f32,
    sunDirection: vec3f,
}

struct bloxd_Light {
    colour: vec3f,
}

#ifndef BLOXD_STRICT
fn bloxd_defaultVertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    return bloxd_Vertex(v.position);
}
#endif

fn bloxd_defaultSurface(s: bloxd_SurfaceIn) -> bloxd_Surface {
#ifdef BLOXD_ALPHA
    return bloxd_Surface(s.colour, s.alpha, vec3f(0.0));
#else
    return bloxd_Surface(s.colour, vec3f(0.0));
#endif
}

fn bloxd_defaultLight(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    return bloxd_Light(l.engineColour + s.emission * l.fogFactor);
}
```

해석 포인트:

- `time` 은 3600초에 감기는 경과 시간이다. 게임 안의 낮밤 시계와 동기된다는 보장은 없다.
- `sunDirection` 은 태양이 있을 때의 단위 벡터이며, 태양 없는 하늘에서는 제로이다. 달의 방향 데이터는 이 API 입력에 포함되지 않으므로, 제로일 때 달의 방향으로 재사용할 수 없다.
- `emission` 은 조명 계산 후에 가산되고, 그 후 포그가 걸린다
- `bloxd_packInputs` 라는 uniform 은 엔진 내부에 존재하지만, **팩 코드에서 직접 참조할 수 없다**. 값은 훅 입력의 필드 (`s.time` 등) 경유로 쓴다
- **`skyLight` / `blockLight` / `heldLight` 는 「리프트 곡선」 통과 후의 값**으로 도착한다. 헤더 주석의 `tone-mapped` 가 이것을 가리킨다: 엔진은 프래그먼트에 반드시 `y = 1-(1-x/(3-2x))³` (어두운 곳을 들어올리는 S 커브) 를 걸고 나서 팩에 건넨다. 생 voxel 값 (n/15) 이 아니라, 예를 들어 나무 밑 (생값 0.87) 은 **0.97 로 들려서 도착한다**
- `skyLight` 의 실체는 「그 장소에서 하늘이 보이는가」 의 복셀 가림 데이터 (= 섀도맵) 이며, 단순한 밝기 파라미터가 아니다 (15장 「그림자의 진실」)

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

베리언트마다 헤더 구조체의 모양도 달라진다 (strict 에서는 `bloxd_Vertex` 자체가 없음, 조명off 에서는 `blockLight` 등이 없음, strict 지형에서는 `alpha` 가 없음).

## 12. 골격 치트시트

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);          // 직접 구축은 금지. 반드시 default 에서
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // terrain 에서는 allow 일 때만 alpha 가 있다
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);         // engineColour + emission*fogFactor
    #ifdef BLOXD_LIGHTING                       // 조명 on 전용 입력은 가드한다
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex 는 반드시 이 가드와 함께
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    out.position.y += sin(v.time) * 0.05;
    return out;
}
#endif
```

항상 의식할 5점: 8 베리언트 전부에서 통할 것 / strict 게임이 대다수일 것 / 텍스처 불가 / 훅 파라미터는 읽기 전용일 것 / `let` 은 모듈스코프에 두지 않을 것.

---

# 제3부: 레시피집

모든 조각은 8 베리언트를 통과한다는 전제의 가드와 함께 쓰여 있다. 그대로 복사해 상수를 만지작거리기만 하면 쓸 수 있다. 단 아래 레시피는 개별 예시이며 위에서 전부 연결하는 용도가 아니다. 같은 훅명 (`bloxd_terrain_light` 등) 이나 같은 헬퍼 함수명을 복수 붙이면 동일 모듈 안에서 정의가 중복되어 컴파일에 실패한다. 복수의 효과를 쓸 경우는 훅을 종류마다 1개로 모아 그 함수 안으로 통합한다.

## R1. 색 레시피 (surface)

### 단색 틴트 (가장 기본)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
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
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldY = s.position.y + f32(s.originOffset.y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 고도 0..50 에서 1..0
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### 면의 방향으로 칠하기 (위쪽=밝게, 벽=어둡게)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
    // 64 블록에서 192 블록으로 0..0.35 의 포그를 직접 더한다
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### 밤 (skyLight 구동의 파랑 시프트 + 등불 보호)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
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

> 이 API에서는 태양 없는 하늘의 `sunDirection` 은 제로이며, 달의 방향 데이터도 없으므로 달을 향한 면을 특정할 수 없다. 방향성 달빛이 아니라, 어두운 하늘에 희미한 파란 환경광을 더할 뿐이다.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 지평선에서 1 / 바로 위에서 0
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### 엔진 출력의 완전 교체 (가장 단순한 재조명)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    #ifdef BLOXD_LIGHTING
    // ※ bloxd_Light(...) 의 직접 구축은 금지. default 에서 만들어 colour 를 고친다
    var out = bloxd_defaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // engineColour (엔진의 조명 결과) 를 버리고 「소재의 색 × 직접 계산한 밝기」 로 교체한다
    out.colour = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    return out;
    #else
    return bloxd_defaultLight(s, l);
    #endif
}
```

## R3. 발광 레시피 (emission)

> `emission` 은 조명 계산 후에 가산되고, 그 후 포그가 걸린다. 원경에서도 빛나게 하고 싶은 성분에는 `fogFactor` 를 직접 곱한다.

### 등불의 맥동 (횃불이 숨쉰다)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(l.time * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### 발광 광석 느낌 (밝은 소재를 빛나게)

```wgsl
// surface 측: 소재가 밝을 (흴) 수록 emission 을 얹는다
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### 반딧불 무리 흉내 (시간으로 공간을 떠도는 광점)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let world = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    // 몇 개의 「빛의 구슬」 이 천천히 이동한다. distance 의 역수로 빛나게 한다
    let t = l.time * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(l.time * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. 좌표 레시피 (월드/블록/시선)

### 월드 좌표

```wgsl
let worldPos = s.position + vec3f(f32(s.originOffset.x), f32(s.originOffset.y), f32(s.originOffset.z));
```

### 블록 좌표 (공식 레시피 — 헤더 주석 유래)

```wgsl
let worldBlock = vec3i(floor(l.position - l.normal * 0.5)) + l.originOffset;
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
let viewDir = normalize(l.eyePosition - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### 시선 각도 (프레넬 흉내 — 액체용)

```wgsl
let viewDir = normalize(s.eyePosition - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 바로 위에서 1 / 얕은 각도 0
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. 시간 레시피 (애니메이션)

> `time` 은 3600초 (1시간) 에 감긴다. 「1일의 낮밤 사이클」 을 만들려면 3600초를 1주기로 다룬다. 단 셰이더 경과 시간이며 게임 안의 태양·낮밤과 동기된다는 보장은 없다. 겉보기 주기 애니메이션에는 쓸 수 있지만 실제 밤 판정에는 `sunDirection` 이나 조명 입력을 우선한다.

### 낮밤 사이클 (1시간에 1일)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let day = 0.5 + 0.5 * sin(l.time * 6.2831853 / 3600.0);   // 0..1 의 1시간 주기. 게임 안의 낮밤과 동기되리라는 보장은 없다
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
fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldX = s.position.x + f32(s.originOffset.x);
    let worldZ = s.position.z + f32(s.originOffset.z);
    let ripple = sin(s.time * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid 는 항상 BLOXD_ALPHA — 가드는 습관상
    #endif
    return out;
}
```

### 고도를 사용한 투명도의 유사 변화 (진짜 여울 판정이 아니다)

> 씬 깊이나 수중 바닥의 위치를 참조할 수 없으므로, 이 API만으로는 실제 수심을 계산할 수 없다. `s.position.y` 는 로컬 좌표이므로 그대로 쓰면 청크 원점의 변화로 효과가 어긋난다. 아래는 월드 고도로 알파를 바꿀 뿐인 유사 연출이며, 해안선이나 수중 바닥을 따른 여울 표현이 아니다. `packWaterReferenceY` 는 월드 고도에 맞춰 조정한다.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldY = s.position.y + f32(s.originOffset.y);
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
fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
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

### 풀잎이 바람에 흔들린다 (위쪽만 움직인다)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let sway = sin(v.time * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // 수직면만
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### 액면의 파도 (윗면만)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_liquid_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + v.time * 1.6) * 0.5
              + sin(v.position.z * 1.2 + v.time * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### 맥동하는 지형

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let pulse = sin(v.time * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // 법선 방향으로 미세하게 팽창수축
    return out;
}
#endif
```

### 파도치는 지형 (거대 sin 파)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + v.time * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - v.time * 0.7) * 0.3;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    out.colour = s.colour * voxel;
    #endif
    return out;
}
```

### R9.2 태양 스페큘러 (Blinn-Phong)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // 가장자리의 옅은 밝기
    #endif
    return out;
}
```

### R9.4 반구 환경광 (위=하늘 / 아래=바닥의 튐)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // 아래: 튐
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // 위: 하늘빛
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    out.colour = s.colour * voxel * hemi;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = 노출
    return out;
}
```

### R9.6 대기 원근법 (거리로 채도가 떨어지는 「공기감」)

> 포그 (색으로 교체) 와는 별개로 「거리로 디새추레이트」 를 얹으면
> 원경이 훨씬 리얼해진다.
> 주의: 공기감은 채도만 떨어뜨리는 것이 안전. 휘도는 건드리지 않는다.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
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
fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, l.time), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(l.eyePosition - l.position);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // 블록 안 로컬 좌표
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
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

> `l.fogFactor` 를 `max(l.fogFactor, 0.25)` 처럼 하한과 함께 쓰면 「이 이상 짙어지지 않는다」 조정이 된다
> (0.0 = 엔진 준수 / 0.3~0.5 = 원경 클리어).
> 참고로 엔진 포그는 지평선 전용 linear 포그 (그리기 거리 부근만) 이며, 중거리 안개는 팩측에서 만들어야 한다.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogFactor, 0.15));  // 포그 재현 (0.15=엷은 하한)
    col += s.emission * l.fogFactor;            // emission 도 포그 적용으로
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 시네마-grade (그림자는 한색 / 하이라이트는 난색 / 밤은 디새추레이트)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // ① 생값 복원 (이것을 빼먹으면 영원히 그림자가 안 된다)
    let skyRaw = sh_unlift(l.skyLight);
    // ② 임계값 커트 — 낮=1 / 그림자=0 을 확실히 분리할 수 있다
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // 태양 Lambert (태양 없을 때는 l.directional 로 폴백)
    let sunLen = length(l.sunDirection);
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), l.sunDirection / sunLen), 0.0, 1.0),
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
    col = mix(l.fogColour, col, max(l.fogFactor, 0.15));
    out.colour = clamp(col, vec3f(0.0), vec3f(1.0));
    #endif
    return out;
}
```

> 조정 가이드: **그림자의 면적은 `shTh`만으로 정해진다** — `0.93`=반경1.5 이상 / `0.87`=반경2 / `0.80`=반경3 / `0.67`=반경5.
> 그림자 가장자리의 딱딱함은 `shSoft` (0.02=딱딱 / 0.08=소프트). 그림자 심의 어둡기는 `0.09` (최저 환경광) 와 `0.16` (하늘 산란광)
> 의 2점 시프트로 정해진다. 해 질 녘에 그림자를 넓히고 싶으면
> `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` 를 더한다 (긴 해 질 녘 그림자의 근사.
> `sunDir` 은 `l.sunDirection / length(l.sunDirection)`). 그림자의 푸름은 `vec3f(0.72, 0.82, 1.05)` 의 B 를 올린다.
>
> ⚠️ 「`pow(skyLight, γ)` 로 콘트라스트를 깊게」 는**리프트 후의 값에 gamma 를 걸고 있었기** 때문에
> 나무 밑 (0.97) 에는 통하지 않았다. 이 방법은 비추천.

---

# 제4부: 리얼화 가이드

## 13. 엔진 기존 조명과 리얼화의 여지

엔진 기존의 조명은 곱셈뿐이며, 스페큘러·프레넬·난색-냉색 분리·반구 환경광은 존재하지 않는다. 아래가 재구축 가능한 범위이다:

| 기능 | 기존 | 팩으로 가능? |
|---|---|---|
| 확산 (Lambert) | 방향광의 스칼라 총합뿐 | ◎ `sunDirection` 으로 직접 구현 (랩광원 등) |
| 스페큘러 (경면 반사) | 전무 | ◎ Blinn-Phong (R9.2) |
| 프레넬 | 전무 | ◎ Schlick 근사 (R9.3) |
| 난색 토치 / 냉색 하늘빛 분리 | 무색 | ◎ (R9.1) |
| 반구 환경광 | 무방향 | ◎ 위=하늘색 / 아래=바닥 튐 (R9.4) |
| 톤맵 | 없음 (clamp 뿐) | ◎ ACES 필믹 (R9.5) |
| 대기 원근법 | 포그 (색 교체) 뿐 | ◎ 거리 디새추레이트 (R9.6) |
| 표면 디테일 | 텍스처 해상도뿐 | △ 해시 노이즈 절차적 마이크로범프 (R9.8) |
| 정점파 (수면) | 전무 (평면) | ◎ allow 한정 (R7) |
| 파법선 / 태양 글린트 | 전무 | ◎ (R9.7) |
| 밤의 달빛 처리 | 하늘색이 어두워질 뿐 | △ 달 방향 입력이 없으므로 방향성 달빛은 불가. 파란 환경광이나 디새추레이트의 유사 표현뿐 (R2 밤의 파란 환경광 / R9.11) |
| 그림자 (하늘 가림) | `mix(환경색, 하늘색, skyLight)` 로 살짝 섞을 뿐 | ◎ 리프트 역변환 + 임계값 커트 + 태양 게이트 (R9.12). 나무 그늘·처마 밑이 명확히 떨어지고 블록 편집에 실시간 추종 |

## 14. 리얼화의 구현 유파 — 2가지

**유파 A: 가산 수정 (defaultLight 기점)** — `engineColour` (완성색) 를 바탕으로, 난색 글로우나 림을 더한다. 간편하고 안전하지만 조명 모델 자체는 기존 그대로.

**유파 B: 완전 리라이팅 (s.colour 기점)** — `l.engineColour` 을 버리고 `s.colour` (알베도) 와 LightIn 생소재에서 조명을 다시 짠다. 리얼화의 본명. 지킬 4점:

1. **포그를 다시 건다**: light 훅은 최종단 (포그 뒤) 에서 불리므로 `mix(l.fogColour, col, l.fogFactor)` 를 직접 적용한다 (R9.10). 짙을 때는 `max(l.fogFactor, 0.3)` 으로 하한을 깐다. 반대로 engineColour 기점 팩에 포그색을 더 섞으면 이중 포그로 원경이 하얗게 뜬다
2. **조명off 베리언트 폴백**: `#ifdef BLOXD_LIGHTING` 밖에서는 `defaultLight` 로 그대로 통과시킨다
3. **공용 함수째 가드한다**: `bloxd_LightIn` 을 인수로 취하는 공용 함수는 fn째 `#ifdef BLOXD_LIGHTING` 로 감싼다 (호출측만으로는 불충분)
4. **태양 방향이 없을 때**: `sunDirection` 이 제로면 방향성 스페큘러는 계산하지 않는다. `l.directional` 은 광량의 스칼라지 방향 벡터가 아니므로 하이라이트 방향을 복원하는 용도로는 쓸 수 없다. 필요하면 방향성 없는 약한 환경광으로 전환한다

## 15. 도달할 수 없는 표현 (리얼화의 「천장」)

| 표현 | 이유 |
|---|---|
| 픽셀 정밀 섀도맵 (태양과 함께 도는 그림자·반음영) | 깊이 텍스처 참조 불가. 광선 가림 판정도 훅에 입력되지 않는다 |
| SSAO | 씬 깊이에 접근 불가 (메셔 구운 정점 AO 뿐) |
| SSR (반사) | 마찬가지. 프레넬로 하늘색을 얹는 유사뿐 |
| 블룸 / 글레어 | 포스트프로세스에 훅이 존재하지 않는다 |
| 피사계 심도·색수차·그레인 | 풀스크린 후처리가 필요 |
| 체적광 (god rays) | 마찬가지 |
| PBR 텍스처 | 텍스처 참조 금지. 색의 휘도에서 유사 추정뿐 |
| 수중 굴절 | 씬 깊이 입력이 없다 |
| 수중 검출·수중 베일 제거 | 카메라가 수중인지 나타내는 필드가 없고, 파란 베일은 훅 파이프라인 밖 (풀스크린 quad + 수중 스카이박스) 이므로 검출도 제거도 불가 |

### 그림자의 진실 — 「나무 그림자」 는 만들 수 있다

위 표에서 불가능한 것은 **태양과 함께 도는 픽셀 정밀 섀도맵** 뿐이다. 엔진은 처음부터 「그림자」 를 계산하고 있으며, 그것이 `skyLight` 이다. 메시측 LightEngine 은 마인크래프트식 알고리즘으로 돈다:

1. **종열 스캔**: 각 (x,z) 열을 위에서 아래로 훑는다. 하늘에서 오는 빛은 15 로 시작해, **불투명 블록에서 0** 이 되며, `lightFilter` (공기 1 / 물 3 / 불투명 15) 로 감광하면서 내려간다
2. **BFS 플러드필**: 6근방으로 옆 확산 (1 블록에 -1) — 이것이 그림자 가장자리를 부드럽게 하는 정체. 반경 r 가림물 밑의 생값은 (15-r)/15 가 된다
3. blockLight (횃불 등) 는 RGB 3채널 (4bit 팩) 의 별도 BFS

즉 `l.skyLight` 는 단순한 밝기 파라미터가 아니라 **「그 장소에서 하늘이 보이는가」 의 복셀 분해능 가림 데이터 = 섀도맵** 이다. 나무 밑·처마 밑·실내는 수치로 이미 낮으며, 정점 보간으로 매끄럽게 도착한다. 블록을 두거나 부수면 LightEngine 이 즉시 재계산한다 = **실시간 추종 그림자** 이다. 바닐라는 이것을 `mix(환경색, 하늘색, skyLight)` 로 살짝 쓸 뿐이다.

올바른 도구는 R9.12 의 2단계 (**리프트 역변환으로 생값 복원 → 임계값 `smoothstep` 으로 이값화**. `th = 1 - r/15` 가 직접 「그림자로 간주하는 가림 반경」 다이얼) 에, **태양 직사광을 sky 로 게이트** (태양은 하늘이 보이는 장소에만 닿는다 = 투영의 정체) 를 더해, 낮=난색 / 그림자=냉색으로 물들이는 구성이다.

**솔직한 제한**: 이 그림자는 「위쪽 하늘」 기준이므로, **태양이 시간으로 움직여도 그림자는 돌지 않는다**. 분해능은 블록 단위 (부드러운 가장자리는 BFS 확산에 의한 것). 참고로 엔진 조명 템플릿에는 `var shadow: f32 = 1.;` 라는 섀도맵용 마개가 닫힌 채 남아 있으며 (항상 1.0 = 무효), 픽셀 정밀 회전 그림자는 「장래 구현 예정」 의 흔적으로 해석된다. 픽셀 정밀 회전 그림자가 왜 필요하면, API 밖 수단 (userscript GLSL 주입 등) 을 검토할 수밖에 없다.

## 16. 디버깅 요령

- 동굴이 너무 밝다 → `skyLight` 의 비선형 커브가 부족하다 (R2 동굴 레시피 / R9.9)
- 낮이 하얗게 날린다 → ACES 앞의 노출을 낮춘다
- 밤이 어두워서 아무것도 안 보인다 → 최소 환경광을 확보한다 (밤의 `skyLightColour` 는 거의 흑이 되는 것이 전제)
- 원경이 너무 흐리다 → 대기 계수를 낮춘다
- 횃불 주위가 오렌지투성이 → 난색 블렌드 비율을 낮춘다 (생 날색광을 남긴다)
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
| `blockLight` 가 미정의라고 나온다 | `#ifdef BLOXD_LIGHTING` 로 감싼다. 공용 헬퍼 함수는**함수째** 감싼다 |
| `Packs can't construct bloxd_Surface directly` | `bloxd_defaultSurface(s)` 를 기점으로 고친다 |
| `bloxd_Vertex only exists when BLOXD_STRICT isn't defined` | `#ifndef BLOXD_STRICT` 로 감싼다 |
| 원경이 하얗게 흐리다 | 이중 포그가 원인인 경우가 많다. 완성색은 포그 완료 상태이므로 독자 안개는 삼가고 채도만 떨어뜨리는 방식을 검토한다 |
| 게임 참가시에 팩이 제외된다 | 게임 개시시의 실기 체크에서 실패하고 있다. 가드 누락을 다시 본다 |
| `pack.json needs "apiVersion": 1.` | `apiVersion` 이 없다. 수치 `1` 을 추가한다 (문자열 `"1"` 은 불가) |
| `There's no pack.json at the top of the pack.` | ZIP 최상위에 `pack.json` 이 없다. 폴더째 굳히지 않았는지 확인한다 |
| `bloxd_terrain_vertex must be declared as: fn ...` | 시그니처 불일치. 표시된 선언대로 다시 쓴다 |
| `bloxd_terrain_vertex can't run in strict games...` | vertex 훅을 `#ifndef BLOXD_STRICT` 로 감싼다 |
| `bloxd_LightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | `#ifdef BLOXD_LIGHTING` 로 감싼다 |
| `pow(l.skyLight, γ)` 를 올려도 그림자가 짙어지지 않는다 | `l.skyLight` 는 리프트 곡선 통과 후의 값 (생값 0.87 이 0.97 로 도착한다). R9.12 의 리프트 역변환 + 임계값 커트로 전환한다 (10장) |

## 18. 권리·주의

- 셰이더 팩 기능 자체는 게임 내 UI에서 불러올 수 있는 공식 기능이며, 팩 제작은 예정된 행위로 간주된다. 단 공개된 공식 문서는 현재 존재하지 않는다
- 팩은 순수 WGSL이며, JS 실행·네트워크 액세스는 설계상 불가능하다
- 본서는 비공식 안내서이며, 개발사의 공식 입장이 아니다. API는 예고 없이 변경될 수 있다

---

# 제6부: 구현 시 중요한 보충

## 19. 야간에 「그림자는 어두운데 표면만 밝다」 를 고친다

그림자만 어둡게 하면, 태양 없을 때 엔진 완성색 (`engineColour`) 이 밝은 채 남아, 면과 그림자의 차이가 부자연스러워질 수 있다. 그림자의 색조가 아니라 완성색 전체에 감쇠를 걸 필요가 있다.

다음 예는 `sunDirection` 이 제로면 밤측, 방향이 있으면 낮측으로 보고, 어두운 시간은 지형의 완성색을 감쇠시킨다. 조명 대응 베리언트에서는 `blockLight` 와 `heldLight` 가 강한 장소일수록 감쇠를 약하게 해, 횃불 등의 근거리광을 가급적 남긴다. `0.52` 는 조정값으로, 더 어둡게 하고 싶으면 작게 한다.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
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
    out.colour = l.engineColour * scale + s.emission * l.fogFactor;
    return out;
}
```

**이 처리의 한계:** `sunDirection` 의 동작이 「태양 있음=단위 방향, 태양 없음=제로」 의 두 값이라면, 낮과 밤의 구별은 되어도 노을·박명을 연속적으로 추정할 수 없다. 또 완성색을 감쇠시키므로, 엔진측의 주광·환경광을 함께 약하게 하는 방식이며, 시간대를 완전히 재현하는 것은 아니다. 액체에도 같은 처리를 적용하고 싶으면 액체 훅의 폴백 관계를 확인할 것.

## 20. 물을 자연스럽게 보이게 하는 통합 레시피

이 API에서는 씬색·깊이·수중 바닥의 깊이를 샘플링할 수 없으므로, **진짜 반사·굴절·수심 계산이 아니라, 프레넬풍의 색 블렌드와 태양 하이라이트에 의한 유사 표현**이 된다. 아래는 색의 베이스를 남기면서, 얕은 시선 각도로 하늘색에 가까운 색을 조금 섞고, 태양이 있을 때만 작은 글린트를 더하는 샘플.

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, l.time), topness));
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
- 실제 경치를 비추고 싶다: 이 API 입력에는 화면색이나 씬 깊이가 없으므로, 색을 섞을 뿐 실반사가 안 된다.

이 레시피는 기존의 `bloxd_liquid_light` 를**바꾼다**는 것. R9.7 의 동명 파법선 함수나 다른 동명 훅과 중복해 붙이지 않는다.

## 21. 실기 테스트 체크리스트

컴파일 성공과 「보기 좋다」 는 별개이므로, 다음 순서로 확인한다.

1. **읽기:** `pack.json` 이 ZIP 직하에 있을 것, 설정 화면에서 `Ready to use` 가 될 것.
2. **8 베리언트:** strict / allow, 조명 on / off, terrain / liquid 각 조건에서 타입 가드 누락이 없을 것. 게임이 일부 조건만 쓰더라도, 배포용 팩은 8가지를 전제한다.
3. **주간:** 풀·돌·모래·목재 등 소재마다 색이 날지 않았는가, 윗면과 측면의 명암차가 부자연스럽지 않은가를 본다.
4. **야간:** 해가 비출 때와 같은 소재, 그림자, 횃불 근처를 비교한다. 밝은 면만 남으면 노출 감쇠, 전부가 어두워지면 국소광 보호를 조정한다.
5. **물:** 바로 위·얕은 시선 각도·기슭·수중·밤을 따로 본다. 알파 거동과 수중 보기는 게임측 합성 방식에 의존하므로 하나의 시점에서만 판단하지 않는다.
6. **경계와 거리:** 청크 / 원점 전환으로 파도나 무늬가 튀지 않는가, 원경에서 이중 포그나 흰 안개가 나오지 않는가를 확인한다.
7. **성능:** 해시·삼각 함수·`pow` 를 남용하는 효과는 필요 최소한으로 한다. 디테일을 조금씩 추가해 FPS를 비교한다.

### 알려진 제약을 전제로 한다

- shader pack 은 terrain / liquid 훅에 한정되며, 하늘·엔티티·UI를 같은 코드로 처리하는 구조가 아니다.
- 섀도맵, 화면 공간 반사, 씬 깊이, 굴절, 블룸 등을 추가하기 위한 입력은 이 API에 없다.
- `time` 은 애니메이션용 시간으로, 게임 안의 낮밤과 연동된다는 보장은 없다.
- `sunDirection` 이 제로면 달의 방향을 특정할 수 없다. 파란 환경광을 더하는 처리는 「달빛의 물리 재현」 이 아니라 분위기를 만드는 근사.
- `s.position` / `l.position` 은 로컬 좌표이므로, 월드 위치에 의존하는 효과에서는 `originOffset` 을 더한다. 블록 안 로컬 무늬를 만들 경우는, 의도적으로 로컬 좌표를 쓸 수도 있다.

## 22. 셰이더 단독으로 한계가 있을 경우의 조합

셰이더 팩측에서 텍스처를 추가·샘플링할 수 없다는 제약이 있으므로, 소재 그 자체의 미세한 요철이나 하늘의 화상을 바꾸고 싶으면 셰이더만으로 해결하려 하지 않는다. Bloxd.io용 공개 텍스처팩 리포지토리 [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) 에는 텍스처, skybox, 모델 등을 다루는 별도 방식이 있다.

현실적으로는, **셰이더로 빛과 색을 조정하고, 대응하는 별도 리소스팩으로 소재나 하늘을 보완**하는 방침이 좋다. 단, 별도 팩과의 동시 이용 가능 여부나 읽기 순서는 게임측의 구현·설정으로 확인할 것.

---

조사: ltf_ahel (glm 을 사용해 조사)

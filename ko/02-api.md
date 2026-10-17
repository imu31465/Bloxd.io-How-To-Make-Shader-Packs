[← 이전 부](01-making.md)·[매뉴얼로 돌아가기](README.md)·[다음 부 →](03-recipes.md)

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
- `bloxdSunDirection()` 은 태양이 있을 때의 단위 벡터이며, 태양 없는 하늘에서는 제로이다. **달은 항상 `-bloxdSunDirection()` 에 있다** (엔진이 달의 위치를 태양의 정반대로 계산하기 때문). 단 기존 월드에서는 태양이 정지해 있으므로 달도 정지해 있으며, 움직이는 달이 의미 있는 것은 낮밤 사이클을 구현한 월드뿐이다 ([제7부](07-internals.md) 24절)
- ※보충: 종래 「제로일 때 달의 방향으로 재사용할 수 없다」 고 썼지만, 방향 자체는 `-bloxdSunDirection()` 으로 얻을 수 있다. 외부 배포용 팩은 제로를 전제로 `sunPresent` 로 분기하는 쓰기가 안전하다 (파란 환경광 유사 표현은 R2, 방향성 달빛은 [제7부](07-internals.md) R-A 참조)
- `emission` 은 조명 계산 후에 가산되고, **`fogVisibility` 로 감쇠된다** (defaultLight 구현 `engineColour + emission × fogVisibility`. 완전히 안개에 잠긴 원경에서는 발광도 사라진다)
- **포그 적용 순서**: 프래그먼트 안의 처리 순서는 ① 조명·발광 합성 → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ light 훅 호출 → ⑤ return. 따라서 **engineColour 는 포그된 상태로 도착하며**, **light 훅 반환값이 그대로 최종색** (훅 뒤에 포그는 다시 걸리지 않는다)
- **fogVisibility 의 정의원**: 뷰 공간 거리 (정점 단위로 계산·보간). linear 모드에서는 `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **fogMode == 0 일 때**: `fogColour` 에는 `vec3f(0.0)` (흑) 이 전달된다. fogColour 색감으로 시간대를 추정하는 코드는 주의
- **현행 빌드의 실포그 설정**: **linear 고정**. `fogStart` = 그리기 청크 거리, `fogEnd` = +1 청크 (지평선만). 포그 끄기 설정에서는 100 / 101 청크로 설정되어 사실상 무효. 기본 포그색은 RGB(183, 191, 195)
- `bloxdPackInputs` uniform (`@group(3) @binding(0)`, 64B)은 **헤더 함수 경유로만 쓴다**. 팩에서 직접 참조하지 않는다. stage 가시성이 VERTEX|FRAGMENT이므로, 헤더 함수는 훅 밖의 모듈스코프 함수나 vertex 훅에서도 호출할 수 있다. 깊이 텍스처 (binding 1)는 FRAGMENT 전용이므로, `bloxdOpaqueBehind()` 는 surface / light 훅 한정이다
- **`skyLight` / `blockLight` / `heldLight` 는 「리프트 곡선」 통과 후의 값**으로 도착한다. 헤더 주석의 `tone-mapped` 가 이것을 가리킨다: 엔진은 프래그먼트에 반드시 `y = 1-(1-x/(3-2x))³` (어두운 곳을 들어올리는 S 커브) 를 걸고 나서 팩에 건넨다. 생 voxel 값 (n/15) 이 아니라, 예를 들어 나무 밑 (생값 0.87) 은 **0.97 로 들려서 도착한다**
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

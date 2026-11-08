# 입출력 구조체

> 대상 API: 5 · 대상 빌드: `v98qt8` · 상태: Analyzed (라이브 헤더에서 그대로 복원)

7개의 구조체를 팩이 읽고 쓸 수 있다. 모든 필드를 아래에 실었다 (`#ifdef` 필드는 조건부). 헤더 전문은 [엔진 내부와 연구](../internals/engine-header.md) 에 있다.

## BloxdVertexIn (버텍스 훅 입력)

```wgsl
struct BloxdVertexIn {
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
}
```

| 필드 | 형 | 설명 |
|---|---|---|
| `position` | `vec3f` | 렌더 공간 위치 (월드 좌표는 `bloxdWorldPosition()` 로) |
| `normal` | `vec3f` | 면에서 바깥쪽을 향하는 단위 벡터 |
| `localPosition` | `vec3f` | 모델 로컬 좌표. **지형·액체에서는 `vec3f(0.0)`**. 플레이어 팔, 손에 든 검, 풍차 날개 등에서는 모델과 함께 회전한다 |
| `flags` | `BloxdFlags` | 면의 종류 ([플래그](flags.md)) |

## BloxdVertex (버텍스 훅 출력)

```wgsl
struct BloxdVertex {
    position: vec3f,      // The render position output.
}
```

## BloxdSurfaceIn (서피스 훅 입력)

```wgsl
struct BloxdSurfaceIn {
    colour: vec3f,        // RGB colour = texture * tint * ambient occlusion.
    alpha: f32,           // Opacity.

    // Enchanted items and armour only, all 0 for anything else.
    enchantTier: u32,     // 1-5 for Tier 1-5.
    enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
    enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.

    // Players and mobs only, 0 for anything else: RGB overlay colour, e.g. the
    // red flash when hurt, and its alpha. bloxdLitColour mixes it into colour.
    overlayColour: vec4f,

    // These mean the same as in BloxdVertexIn, after the vertex hook.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.

    // These are all 0 if the face has no texture. Most models use textureId 0.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

| 필드 | 형 | 설명 |
|---|---|---|
| `colour` | `vec3f` | RGB = 텍스처 × tint × AO, 메셔가 굽는다 |
| `alpha` | `f32` | 불투명도 |
| `enchantTier` | `u32` | 인챈트 티어 1–5. 인챈트되지 않은 것은 0 |
| `enchantColour` | `vec4f` | 인챈트 RGB 와 **애니메이션되는** alpha (`.a`) — 프래그먼트마다 `.a` 를 읽으면 움직이는 무늬를 공짜로 얻는다. 인챈트 없는 면에서는 전부 0 |
| `enchantSpeed` | `f32` | 인챈트 무늬 속도 («faster at higher tiers») |
| `overlayColour` | `vec4f` | 엔티티 오버레이 (피격 플래시 등) RGB + alpha. 플레이어/몹 외에서는 0. 라이팅 전에 `bloxdLitColour` 이 섞는다 |
| `position` / `normal` / `localPosition` / `flags` | — | `BloxdVertexIn` 과 같은 의미. 단 **버텍스 훅 적용 후** (움직인 정점을 따라간다) |
| `textureId` | `u32` | 이 면의 텍스처. `bloxdTextureId*` 와 비교한다. **면에 텍스처가 없으면 0** — 대부분의 모델은 textureId 0 (모델 자체 텍스처, 플레이어 스킨) |
| `textureRotation` | `u32` | 시계방향 4분회전 (0–3), `bloxdTexel` 이 적용한다 |
| `uv` | `vec2f` | 텍스처가 0–1 을 덮는다. `fract(uv)` 가 그려진다 (정수 스텝이 타일링된다) |
| `mipLevel` | `f32` | 밉맵 레벨: 0 = 풀사이즈, 1 = 절반… |

## BloxdSurface (서피스 훅 출력)

```wgsl
struct BloxdSurface {
    colour: vec3f,        // RGB colour output.
#ifdef BLOXD_ALPHA
    alpha: f32,           // Opacity output.
#endif
    emission: vec3f,      // Emissive RGB, added after lighting, before fog.
    enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
    overlayColour: vec4f, // Overlay output, mixed in by bloxdLitColour.
}
```

| 필드 | 형 | 조건 | 설명 |
|---|---|---|---|
| `colour` | `vec3f` | 항상 | RGB 출력 |
| `alpha` | `f32` | `#ifdef BLOXD_ALPHA` (모든 액체 + 비strict 지형/모델) | 불투명도 출력 |
| `emission` | `vec3f` | 항상 | 발광 RGB — **라이팅 후, 포그 전에 가산** |
| `enchantColour` | `vec4f` | 항상 | 인챈트 출력, `bloxdLitColour` 이 섞는다 |
| `overlayColour` | `vec4f` | 항상 | 오버레이 출력, `bloxdLitColour` 이 섞는다 |

`bloxdDefaultSurface` 은 `enchantColour` / `overlayColour` 를 그대로 통과시키므로, 기본 외관은 v4 의 엔진 내부 동작과 일치한다. 커스텀 라이팅에서 글린트를 없애려면 `out.enchantColour` 을 0 으로, 피격 플래시를 강조하려면 `out.overlayColour.a` 를 증폭하면 된다.

## BloxdLightIn (light 훅 입력)

```wgsl
struct BloxdLightIn {
    litColour: vec3f,  // Lit and enchanted RGB colour, before emission and fog.
    directional: f32,  // Summed Lambert from directional lights; 0 if none.
    diffuse: vec3f,    // The material's RGB response to directional light.
    emissive: vec3f,   // The material's RGB glow, added to directional light.
    ambient: vec3f,    // RGB ambient colour, added to directional light.
    blockLight: vec3f, // RGB block light; 0 when !bloxdLit().
    skyLight: f32,     // Sky light; 1 when !bloxdLit().
    ambientLightColour: vec3f, // Minimum RGB light; 1 when !bloxdLit().
    skyLightColour: vec3f, // RGB colour of skyLight; 1 when !bloxdLit().
    heldLight: vec3f,  // RGB held light; 0 when !bloxdLit() or no light held.
    fogColour: vec3f,  // The game's RGB fog colour; 0 when the game has no fog.
    fogAlpha: f32,     // 0 = no fog, 1 = only fogColour.

    // These are the same as in BloxdSurfaceIn.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

필드별 의미와 라이팅 수식에서의 역할: [라이팅](lighting.md) 을 보라.

**구버전 API 와의 대비**: `fogVisibility` (v2–v4) 는 의미가 반전된 `fogAlpha` (0 = 포그 없음) 이 되었고, `engineColour` 는 `litColour` 로, 라이트 레벨 표기는 «0 when !bloxdLit()» 로 바뀌었다. 버전별 필드 변화 전체: [버전 히스토리](../history/).

## BloxdLight (light 훅 출력)

```wgsl
struct BloxdLight {
    colour: vec3f, // RGB colour output.
}
```

## BloxdOpaqueBehind (특수 함수 반환값)

```wgsl
struct BloxdOpaqueBehind {
    hit: bool,       // False where nothing opaque is behind (sky).
    position: vec3f, // The render position; 0 when !hit.
    distance: f32,   // From the camera; 0 when !hit.
}
```

`bloxdOpaqueBehind()` 의 반환값이다. 액체 베리언트에서 `#ifdef BLOXD_SCENE_DEPTH` 가드 안에 쓴다 (v2 에서는 이 필드가 `found: bool` 이었다).

## 조건부 필드 ↔ 매크로

| 필드 | 존재 조건 | 비고 |
|---|---|---|
| `BloxdSurface.alpha` | `#ifdef BLOXD_ALPHA` | 모든 액체 베리언트 + 비strict 지형/모델 |
| `bloxdOpaqueBehind()` 호출 | `#ifdef BLOXD_SCENE_DEPTH` | 모든 액체 베리언트 |

`BLOXD_STRICT` 가 지배하는 것은 **훅의 존재** (버텍스 훅) 이지 구조체의 모양이 아니다. [전처리기](preprocessor.md) 를 보라.

## 작성 규칙 (재정리)

- 출력 구조체를 직접 생성하지 마라 — `bloxdDefault*` 에서 시작한다. light 훅에서는 `var out = s;` 도 통한다
- bare `var x: BloxdSurface;` 는 검증 오류이다
- 훅 파라미터는 읽기 전용 — 바꾸려면 먼저 복사한다

## 관련 문서

- [라이팅](lighting.md) · [플래그](flags.md) · [텍스처 API](texture-api.md)

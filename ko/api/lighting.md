# 라이팅

> 대상 API: 5 · 대상 빌드: `v98qt8` · 상태: Analyzed (라이브 헤더에서 그대로 복원)

v5 는 라이팅 API 를 공개했다. 엔진이 내부에서 하던 일 (`litColour` 를 만드는 것) 을 이제 팩에서 호출할 수 있다. 이 페이지는 라이팅의 입력·함수·처리 순서를 하나의 체계로 다룬다.

## 전체 파이프라인

light 단계의 기본 구현 (`bloxdDefaultLight`) 이 보여주는, 색의 완전한 연쇄:

```
surface.colour
    │  overlayColour 를 혼합 (mix(colour, overlay.rgb, overlay.a))
    ▼
overlaid
    │  bloxdShading(light) 를 곱한다 — 머티리얼과 각도의 응답
    ▼
shaded
    │  enchantColour 를 혼합 (mix(shaded, enchant.rgb, enchant.a))
    ▼
enchanted
    │  bloxdWorldLight(light) 를 곱한다 — 월드 라이트 (block/sky/held 중 최광)
    ▼
lit = bloxdLitColour(surface, light)   ← emission 과 포그의 「앞」 색
    │  + surface.emission               ← emission 은 라이팅 후에 가산
    ▼
    │  bloxdApplyFog(colour, light)      ← mix(colour, fogColour, fogAlpha)
    ▼
BloxdLight.colour (최종색)
```

`bloxdLitColour()` 의 순서 (헤더 요약: *"mixed with overlayColour, then bloxdShading, then mixed with enchantColour, then bloxdWorldLight"*):

1. `overlayColour` 적용
2. `bloxdShading()` 로 셰이딩
3. `enchantColour` 적용
4. `bloxdWorldLight()` 로 월드 라이트 적용

emission 과 포그의 순서: **emission 은 라이팅 후·포그 전에 더해지며**, 포그는 emission 도 함께 가라앉힌다 (`bloxdDefaultLight` = `bloxdApplyFog(lit + emission, light)`).

## 함수

### bloxdLit() — 게이트

```wgsl
fn bloxdLit() -> bool
```

블록·하늘 라이팅이 켜져 있는지 여부. **꺼져 있을 때의 보증**:

| 필드 | 꺼져 있을 때의 값 |
|---|---|
| `blockLight` / `heldLight` | `0` |
| `skyLight` | `1` |
| `ambientLightColour` / `skyLightColour` | `1` (흰색) |

v4 의 `#ifdef BLOXD_LIGHTING` 은 없어졌다. `if (!bloxdLit()) { return bloxdDefaultLight(...); }` 로 대체하라.

### bloxdShading() — 머티리얼과 각도의 응답

```wgsl
fn bloxdShading(light: BloxdLightIn) -> vec3f {
    let diffuse = light.directional * light.diffuse;
    return saturate(diffuse + light.emissive + light.ambient);
}
```

- `directional` (합산 Lambert) 에 `diffuse` (머티리얼 RGB 응답) 를 곱하고, `emissive` (머티리얼 발광) 와 `ambient` (RGB 앰비언트) 를 더해 0–1 로 클램프한다
- **v5 신규 입력 `diffuse` / `emissive`** 덕분에, 엔진의 머티리얼 응답은 그대로 두고 Lambert 항만 갈아끼울 수 있다

### bloxdWorldLight() — 월드의 빛

```wgsl
fn bloxdWorldLight(light: BloxdLightIn) -> vec3f {
    let ambientLight = light.ambientLightColour;
    let blockLight = ambientLight + light.blockLight * (1.0 - ambientLight);
    let skyLight = mix(ambientLight, light.skyLightColour, light.skyLight);
    let heldLight = ambientLight + light.heldLight * (1.0 - ambientLight);
    return max(max(blockLight, skyLight), heldLight);
}
```

- 세 채널 (block / sky / held) 각각을 `ambientLightColour` 를 바닥으로 성형한 뒤, **가장 밝은 것**을 취한다
- `skyLight` 은 하늘빛 양만큼 `ambientLightColour` 에서 `skyLightColour` 로 보간된다

### bloxdLitColour() — 엔진 레시피

```wgsl
fn bloxdLitColour(surface: BloxdSurface, light: BloxdLightIn) -> vec3f {
    let overlay = surface.overlayColour;
    let overlaid = mix(surface.colour, overlay.rgb, overlay.a);
    let shaded = bloxdShading(light) * overlaid;
    let enchant = surface.enchantColour;
    let enchanted = mix(shaded, enchant.rgb, enchant.a);
    return max(enchanted * bloxdWorldLight(light), vec3f(0.0));
}
```

### bloxdApplyFog() — 포그

```wgsl
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}
```

- `fogAlpha`: **0 = 포그 없음, 1 = fogColour 뿐** (v4 의 `fogVisibility` 와 반전)
- `fogColour` 은 게임의 포그 RGB. **게임에 포그가 없으면 `vec3f(0.0)`**

### bloxdDefaultLight() — 기본 전체

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## 입력 필드 (BloxdLightIn)

| 필드 | 형 | 의미 | 비고 |
|---|---|---|---|
| `litColour` | `vec3f` | 라이팅·인챈트가 끝난 RGB (emission·포그 이전) | 원천이 아니라 결과값 |
| `directional` | `f32` | 방향광의 합산 Lambert | 방향광이 없으면 0 |
| `diffuse` | `vec3f` | 방향광에 대한 머티리얼 RGB 응답 | `bloxdShading()` 이 머티리얼 응답을 재구성하게 한다 |
| `emissive` | `vec3f` | 머티리얼 RGB 발광 (directional 에 가산) | |
| `ambient` | `vec3f` | RGB 앰비언트 (directional 에 가산) | |
| `blockLight` | `vec3f` | RGB 블록 라이트 | `!bloxdLit()` 이면 0 |
| `skyLight` | `f32` | 하늘빛 | `!bloxdLit()` 이면 1 |
| `ambientLightColour` | `vec3f` | 최저 RGB 라이트 (바닥) | `!bloxdLit()` 이면 1 |
| `skyLightColour` | `vec3f` | skyLight 의 RGB 색 | `!bloxdLit()` 이면 1 |
| `heldLight` | `vec3f` | RGB 손에 든 빛 | `!bloxdLit()` 이거나 빈 손이면 0 |
| `fogColour` | `vec3f` | 게임 포그 RGB | 포그 없으면 0 |
| `fogAlpha` | `f32` | 0 = 포그 없음, 1 = fogColour 뿐 | v4 `fogVisibility` 와 반전 |

## 라이트 레벨의 물리 (배경, 생략 가능)

- **`blockLight` / `skyLight` / `heldLight` 는 0–1 로 매핑되어 도착한다**: 0–15 레벨을 이즈아웃 곡선에 통과시킨 것 (예: `6 → 0.45`, `12 → 0.92`). 셋 모두 `ambientLightColour` 를 제외한 값이다
- **리프트 곡선**: `skyLight` 의 실체는 「이 장소에서 하늘이 보이는가」 — 복셀 가림 데이터, 즉 섀도맵이다. 임계값 기반의 양지/음지 분리에는 역변환이 필요할 수 있다 ([리얼화 가이드](../guides/realism.md) 참조)
- **포그 내부**: 선형 모드에서 `fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)` (0..1 클램프), 뷰 공간에서 정점별로 계산된다. 현행 빌드는 선형뿐이다 (상세는 [엔진 내부와 연구: 포그의 내부](../internals/fog-internals.md))

## 레시피

### 커스텀 셰이딩 + 엔진의 월드 라이트

v4 작가가 `litColour` 스케일링으로 근사하던 것을 이제 정확히 쓸 수 있다:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let nDotL = light.directional; // already summed Lambert
    let wrapped = nDotL * 0.5 + 0.5;
    let shaded = saturate(wrapped * light.diffuse + light.emissive + light.ambient);
    let colour = max(shaded * bloxdWorldLight(light), vec3f(0.0));
    return BloxdLight(bloxdApplyFog(colour + surface.emission, light));
}
```

### 엔진의 월드 라이트는 유지, emission 만 증폭

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission * 2.0, light));
}
```

### 밤의 파란 시프트 (skyLight 구동)

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    let night = 1.0 - light.skyLight;
    out.colour = mix(out.colour, out.colour * vec3f(0.75, 0.82, 1.15), night * 0.6);
    return out;
}
```

## 관련 문서

- [함수](functions.md) · [가이드: 라이팅](../guides/lighting.md) · [엔진 내부와 연구: 라이팅의 내부](../internals/lighting-internals.md)

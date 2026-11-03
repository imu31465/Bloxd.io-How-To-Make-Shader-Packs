# 인챈트 효과

> 대상 API: 5 · 대상 빌드: `ab90qa` (2026-11-03, 프로덕션 확인) · 상태: Analyzed (라이브 헤더에서 복원)

v5 는 인챈트 파이프라인을 입력과 출력 양쪽으로 열었다. 엔진의 수식을 보존하면서 인챈트 아이템과 방어구의 글린트를 제어하는 레시피.

## 입력과 출력

**입력** (`BloxdSurfaceIn` / `BloxdLightIn` — 인챈트 아이템과 방어구에만. 그 외에는 전부 0):

```wgsl
enchantTier: u32,     // 1-5 for Tier 1-5.
enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.
```

**출력** (`BloxdSurface`):

```wgsl
enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
```

엔진은 [`bloxdLitColour()`](../api/lighting.md) 안에서 — 셰이딩 직후, 월드 라이트 전 — 섞는다. `bloxdDefaultSurface` 은 입력을 그대로 통과시키므로, **기본 외관은 v4 의 엔진 내부 동작과 일치한다**.

## 기본값 이해

입력 `enchantColour.a` 는 **애니메이션되는** alpha 다 — 엔진이 글린트 스윕을 움직이므로, 프래그먼트마다 `.a` 를 읽으면 움직이는 무늬가 공짜로 얻어진다. `enchantTier` 와 `enchantSpeed` 는 구성상 일관된다 («faster at higher tiers»).

인챈트 없는 면은 `enchantTier == 0`, `enchantColour == vec4f(0.0)`, `enchantSpeed == 0.0` 을 실는다.

## 레시피 1: 무글린트 리얼 (두 줄)

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.enchantColour = vec4f(0.0);
    return out;
}
```

## 레시피 2: 티어별 강한 글린트

`enchantTier` 로 색을 파싱하지 않고도 고전적인 「티어 스케일 글린트」를 얻는다:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        let tierBoost = 1.0 + f32(surface.enchantTier) * 0.12;
        out.enchantColour.a = clamp(surface.enchantColour.a * tierBoost, 0.0, 1.0);
        out.enchantColour.rgb = surface.enchantColour.rgb;
    }
    return out;
}
```

## 레시피 3: 글린트 재색

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        var e = surface.enchantColour;
        e.rgb = mix(vec3f(0.35, 0.8, 1.0), vec3f(0.9, 0.5, 1.0),
                    f32(surface.enchantTier) / 5.0);   // low tiers blue, high purple
        out.enchantColour = e;
    }
    return out;
}
```

## 레시피 4: enchantSpeed 구동 스윕

`enchantSpeed` 를 위상으로 바꿔 커스텀 스윕을 만든다:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        let band = 0.5 + 0.5 * sin(surface.localPosition.y * 6.0
                                   - bloxdSeconds() * surface.enchantSpeed * 2.0);
        var e = surface.enchantColour;
        e.a = clamp(e.a * (0.4 + 0.6 * band), 0.0, 1.0);
        out.enchantColour = e;
    }
    return out;
}
```

## 레시피 5: 피격 플래시 증폭 (overlayColour)

`overlayColour` (플레이어/몹만. 피격 플래시 등) 은 `bloxdLitColour` 에서 라이팅 전에 섞인다:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.overlayColour.a = clamp(surface.overlayColour.a * 1.6, 0.0, 1.0);
    return out;
}
```

비엔티티에서는 무해하다 (`overlayColour` 이 거기서는 0).

## 커스텀 라이팅과의 조합

`bloxdLitColour()` 를 쓰면 인챈트/오버레이 혼합이 자동으로 유지된다:

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## 비고

- 인챈트 입력은 **인챈트된 아이템과 방어구에만** 도착한다 — 지형, 물, 인챈트 없는 면에서는 전부 0
- `enchantColour` 출력을 바꿔도 `colour` 에 직접 손대는 일은 없다 — 혼합은 `bloxdLitColour` / `bloxdDefaultLight` 안에서 일어난다
- 모델 파이프라인 밖에서 인챈트 입력은 항상 0 이다

## 관련 문서

- [라이팅](../api/lighting.md) · [구조체](../api/structures.md) · [모델 셰이더 레시피](model-shaders.md)

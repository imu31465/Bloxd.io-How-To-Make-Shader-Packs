# Shadows

> Target API: 5 · Type: technical reference

Two eras of shadow-making: the classic `skyLight` recipe (works on every build since v4), and the **real sun/moon shadows** the API v5 added to the API (`bloxdShadow()`). For a new pack on a current build, prefer the real thing.

## Can / cannot (on API v5)

| Effect | Possible? | How |
|---|---|---|
| Real sun-following shadows (blocks, players, mobs, items) | ◎ | `bloxdShadow()` — [the real shadow API](#the-real-shadow-api-API v5) |
| Light shafts / god rays through the air | ◎ | `bloxdAirShadow(t)` sampled along the view ray |
| Sun-accurate shading direction for your own math | ◎ | `bloxdShadowDirection()` |
| The old blob shadows under players kept alongside real shadows | ◎ | `pack.json` → `"keepCircleShadows": true` |
| Darken under trees/roofs without the shadow API (older builds) | ◎ | `skyLight` lift inversion + threshold cut (below) |
| Shadows follow block edits in real time | ◎ | both systems recalculate immediately — automatic |
| Color shadows cool / sunlit warm | ◎ | two-color shift mixed by `bloxdShadow()` |
| Shadow-map depth access / custom shadow casting | ✕ | the engine's shadow volume is not a pack input; only the final 0-1 factor is |
| Physical penumbra | △ | block-shadow blur is whole-block; the sky-voxel route is BFS-capped |

## The real shadow API (API v5)

Three additions turned "shadows" from a lighting trick into a first-class input:

- **`bloxdShadow() -> f32`** — sunlight or moonlight reaching this fragment: 0 in shadow, 1 lit. Blocks, players, mobs and items cast these shadows (the first-person held item is excluded on purpose). Fades to 0 as the sun/moon sets or the face turns away; 1 on `flags.emissive` faces.
- **`bloxdAirShadow(t: f32) -> f32`** — the same light, sampled at a point between the camera (t = 0) and this fragment (t = 1). Only blocks cast (blurred to whole blocks) — built for light shafts.
- **`bloxdShadowDirection() -> vec3f`** — the travel direction of the light casting them (sun by day, moon by night, the default sky's sun otherwise; `y` never above 0). The uniform grew to 80 bytes for it ([Pack format](../api/pack-format.md)).

The minimal daylight recipe:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    // 0 in shadow, 1 lit — mix your own two colors
    let sun = mix(vec3f(0.62, 0.66, 0.78), vec3f(1.0), bloxdShadow());
    out.colour *= sun;
    return out;
}
```

Light shafts: sample `bloxdAirShadow` at a few points along the view ray and accumulate the lit fraction, then scatter it into the fog:

```wgsl
// in a light hook — cheap 4-tap shaft
var shaft = 0.0;
for (var i = 1u; i <= 4u; i++) {
    shaft += bloxdAirShadow(f32(i) / 4.0);
}
let rays = shaft / 4.0;   // 0..1 how open the air is between you and this fragment
out.colour += rayColour * rays * rayStrength;
```

**`keepCircleShadows`**: when a game casts entity sun shadows and your pack's shaders reach `bloxdShadow()`, the engine drops the old circular blob shadows under players and mobs by default (they would double up with the real ones). Set `"keepCircleShadows": true` in `pack.json` to keep both.

## skyLight is a voxel shadow map (the classic recipe)

`l.skyLight` is not just a brightness parameter. The mesher's LightEngine computes Minecraft-style **"can this position see the sky" voxel occlusion data — a shadow map**:

1. **Column scan**: each (x,z) column top-down; sky light starts at 15, hits 0 at opaque blocks, attenuates by `lightFilter` (air 1 / water 3 / opaque 15)
2. **BFS flood fill**: spreads horizontally to 6 neighbors (-1 per block) — this softens shadow edges. Under an occluder of radius r the raw value is (15-r)/15
3. blockLight (torches) is a separate RGB 3-channel (4-bit packed) BFS

Under trees, roofs and inside buildings the value is already low and interpolates smoothly per-vertex. Placing or breaking a block recalculates immediately — **real-time-following shadows**.

## The lift-curve trap

`l.skyLight` arrives **post-lift-curve** (`y = 1-(1-x/(3-2x))³`, an S-curve that lifts dark values):

| Place | Raw voxel | Lifted (= l.skyLight) | pow(·, 5.0) |
|---|---|---|---|
| open sky | 1.00 | 1.00 | 1.00 |
| under tree (radius 2) | 0.87 | **0.97** | **0.86** ← nearly kept |
| radius 3 | 0.80 | **0.92** | 0.66 |
| radius 5 | 0.67 | 0.78 | 0.29 |

**This is the proven root cause of "gamma doesn't darken shadows"** — even γ=5 only takes under-tree 0.97 down to 0.86.

## The fix: lift inversion + threshold cut

The curve is monotonic and inverts exactly: `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Restore the raw value, then binarize with a **`smoothstep` threshold**. LightEngine's BFS spread is "-1 per adjacent block", so `th = 1 - r/15` is directly the "occlusion radius counted as shadow" dial.

The complete implementation (sun gating + warm/cool split + blockLight passthrough) is in [realism recipes](../recipes/realism.md). Key steps:

```wgsl
// 1. restore the raw value (skipping this means shadows never appear)
let skyRaw = sh_unlift(l.skyLight);
// 2. threshold-cut — sunlit 1 / shadow 0
let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
// the essence of projection: direct sun only reaches places that see the sky
let lit = sunL * sky;
```

Dials: **area** = `shTh` (0.93→radius 1.5 / 0.87→2 / 0.80→3 / 0.67→5); **edge softness** = `shSoft`; **core darkness** = the minimum ambient and sky-scatter two-point shift; long evening shadows ≈ `thEff = shTh + 0.10 * (1 - clamp(sunDir.y, 0.0, 1.0))`.

**On current builds you can gate this whole recipe with `bloxdShadow()`** instead of the threshold cut — the sky-voxel route stays useful for stylized half-tone shadows or as a fallback when you want one code path for every build.

## Honest limits

- The sky-voxel route references the **upward sky**, so it **does not rotate with the sun** (soft edges come from BFS spread) — `bloxdShadow()` is the API that does
- The engine's shadow volume is not exposed — packs consume the final 0-1 factor, never the shadow map itself
- Pixel-accurate penumbra stays out of reach: `bloxdAirShadow` blurs to whole blocks, and the sky-voxel route is capped by BFS spread

## Related

- [Functions: shadow functions](../api/functions.md) · [realism recipes](../recipes/realism.md) (the classic projected-shadow recipe) · [Lighting Internals](../internals/lighting-internals.md) · [Debugging tips](debugging.md)

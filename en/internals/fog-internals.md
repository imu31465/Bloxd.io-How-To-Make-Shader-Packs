# Fog internals

> Target API: 5 · Target build: `xkg8x` (2026-11-04, production) · Status: Analyzed (production-bundle JavaScript analysis)
Fog computation is always LINEAR mode (equivalent to `fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), with `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = fog distance setting; only D = 0 is special with fogEnd = 5). **The fog gradient band is only 32 blocks wide**, and `l.fogAlpha` is less "distance haze" than a **normalized distance to the edge of the loaded world**. It varies per player with load distance, so distance-based effects should compute `distance(l.position, bloxdEyePosition())` themselves (the "Load-border band" section below). (the renderer's fog function actually implements **four** modes — off / exponential / exponential-squared / linear — with shipped titles driving the linear one; the restored source and the robustness argument are preserved in [Version History: v3](../history/v3.md).)

Default fog color is `rgb(183, 191, 195)` (pale blue-gray). World creators can change it via `fogColourOverride` (hex). With fog mode 0 (NONE), **fogColour arrives black**. The standard `bloxdApplyFog(col, l)` form is safe since fog color is unused when fogAlpha is 0. The script API has two more options, `fogChunkDistanceOverride` and `fogOnSkybox`: custom games can set the fog distance (the D value) and fog application to the skybox independently. By default the skybox is not affected by fog (only in games enabling `fogOnSkybox` does the skybox get tinted by the fog color as well).

Setting player-side `showFog` to false pushes fog to 3200–3232 blocks, effectively disabling it (`fogAlpha ≈ 0` keeps coming back).

## Load-border band — fogAlpha as "world edge"

Quietly cools just the 32-block load-border band to de-emphasize the world edge (or emphasize it as an effect). No self-computed distance, so it auto-follows player load-distance settings.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogAlpha: 0 = inside (margin to border), 1 = about to exit the border
    let edge = l.fogAlpha;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

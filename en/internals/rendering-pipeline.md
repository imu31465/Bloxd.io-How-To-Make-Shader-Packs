# Rendering pipeline

> Target API: 5 · Target build: `ab90qa` (2026-11-03, production) · Status: Analyzed (production-bundle JavaScript analysis)
- **Surface hooks run "before" alphaTest**: `out.alpha` feeds the discard test directly. Cutout materials (grass, leaves) allow dissolve-style dither effects (recipe R-C). For liquids (blended) `out.alpha` is the real transparency (recipe R-D). No effect on normal opaque terrain — don't misunderstand
- **`l.ambient` content** is `material.ambient × sceneAmbient`, differing per material. The scene side ties to the graphics setting "Ambient Lighting Intensity" (default 0.5) — never hardcode defaults
- **The scene's directional lights are a 2-light setup**: the Lambert sum of the main light (direction from the sky setting's sun position, intensity 1.0) and the fill light (direction `[-0.5, -1, -1]`, intensity 0.35) reaches `l.directional`. The fill light points downward, so it contributes nothing to top faces and picks up downward-facing surfaces (cave ceilings etc.). Terrain considers only lights added in `_initScene`; lights added to the scene after startup are ignored by terrain and block models (an official warning message says so)
- **`bloxdSeconds()` is really `performance.now()`**: the browser's uptime wrapped at 1 hour. Unrelated to in-game day/night and world elapsed time. To animate synced to a game clock, estimate time from the `bloxdSunDirection()` azimuth in day/night-cycle worlds
- **Header functions read one uniform**: the engine places a 64-byte uniform at `@group(3) @binding(0)` (4 slots — time / originOffset / sunDirection / eyePosition, little-endian), and `bloxdSeconds()` / `bloxdRenderOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` correspond to reading those slots. `originOffset` is always `[0, 0, 0]` in the current build (a reserved slot for floating-point world coordinates). Packs cannot write this uniform, and since pack and engine WGSL merge into a single module, declaring the same group/binding yourself is also impossible. (the uniform's history — the `seconds` / `renderOffset` slots, and the scene-depth texture at `@group(3) @binding(1)` — is preserved in [Version History: v3](../history/v3.md))
- **Vertex data is built by the mesher (Web Worker)**: block terrain is interleaved at 28 bytes per vertex (32 bytes when the atlas is on) — position = float32×3 / normal = 8-bit signed integer×4 / colour = 8-bit normalized integer×4 (the substance of `s.colour` — tint × AO is baked into 8-bit at the mesher stage, so separating or restoring it pack-side is impossible in principle) / UV = float32×2 / atlasIndex = float32. Only the light levels travel in a separate 4-byte vertex buffer (measured values: [Engine data ledger](engine-data.md)). Vertices are drawn with per-chunk instancing
- Fine checker patterns at chunk borders during loading are the engine's screen-space Bayer 4×4 dither chunk fade, not pack bugs (disable via the graphics setting `chunkFadeIn`)
- **`mod` is a reserved word**: rejected with `pack.wgsl:3 'mod' is a reserved word in WGSL.` Write remainders with the `%` operator

## R-C. Bayer dither dissolve — out.alpha drives discard

Reproduces the **same Bayer 4×4 table** the engine uses for chunk fades, dissolving cutouts from low blocks upward. discard fires on alphaTest materials (grass, leaves); in liquids it becomes blend transparency.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod is reserved, so use the % operator
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
    // dissolve from low blocks upward; higher dissolve persists
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

## R-D. Near-camera water fade — liquid alpha keeps sightlines

Liquid-hook `out.alpha` feeds blending directly. Fades just the water surface under the camera to keep diving/above-water camera sightlines.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // fully transparent → normal over 0–3 blocks
    #endif
    return out;
}
```

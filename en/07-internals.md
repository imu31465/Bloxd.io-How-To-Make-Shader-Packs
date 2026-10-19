[← Previous part](06-implementation.md)·[Back to the manual](README.md)·[Next part →](08-apiv2.md)

# Part VII: Internals supplement

Extra specs found by engine-implementation analysis. All restored directly from current production-build JavaScript.

## 24. Sun and moon identity

The `bloxdSunDirection()` source is a sun-direction buffer rewritten only when the skybox type changes — the criterion is not "whether the sky has a sun" but **"whether the skybox is the earth type"**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (procedural sky) | Non-zero (defaults below) |
| `gloomy` / `interstellar` / `space_*` (cube textures) | **Always (0,0,0)** |

**The moon is always `-bloxdSunDirection()`** (the engine computes the moon position as the exact opposite of the sun). Night is judged by sun elevation — the moon is up when `bloxdSunDirection().y < 0` (sun below horizon). But in default worlds the sun is static, so the moon is static too; only worlds implementing a day/night cycle see it move.

The default-world sun direction is about `(-0.56, 0.81, -0.18)` (unit vector computed from inclination = −0.2 / azimuth = 0.55, static). A practical reference for predicting highlight directions on paper when testing distribution packs.

Day/night cycles are not built into the engine — inclination is a static number, and worlds with moving day/night update it game-side. `bloxdSunDirection()` follows each update.

Terrain directional lights are just 2 lamps created at scene start with **fixed direction and intensity, unchanging day and night**. In short, **no terrain-brightness factor depends on time. Day/night "looks" come only from the skybox and bloxdSunDirection()**, so packs darkening terrain at night must estimate the time band from bloxdSunDirection() themselves (the §19 `sunPresent` technique).

### R-A. Directional moonlight — moonDir = −bloxdSunDirection()

Adds bluish-white Lambert and weak specular only while the moon is up. `moonUp` is 0 in static-sun default worlds, so nothing happens there — **moonlight that only fires in day/night-cycle worlds, hence safe**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // the moon is always exactly opposite the sun; auto-off in daytime via moonDir.y < 0
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

## 25. Fog internals

Fog computation is always LINEAR mode (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), with `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = fog distance setting; only D = 0 is special with fogEnd = 5). **The fog gradient band is only 32 blocks wide**, and `l.fogVisibility` is less "distance haze" than a **normalized distance to the edge of the loaded world**. It varies per player with load distance, so distance-based effects should compute `distance(l.position, bloxdEyePosition())` themselves (recipe R-B).

Default fog color is `rgb(181, 191, 195)` (pale blue-gray). World creators can change it via `fogColourOverride` (hex). With fog mode 0 (NONE), **fogColour arrives black**. The standard `mix(l.fogColour, col, l.fogVisibility)` form is safe since fog color is unused at fogVisibility 1. The script API has two more options, `fogChunkDistanceOverride` and `fogOnSkybox`: custom games can set the fog distance (the D value) and fog application to the skybox independently. By default the skybox is not affected by fog (only in games enabling `fogOnSkybox` does the skybox get tinted by the fog color as well).

Setting player-side `showFog` to false pushes fog to 3200–3232 blocks, effectively disabling it (`fogVisibility ≈ 1` keeps coming back).

### R-B. Load-border band — fogVisibility as "world edge"

Quietly cools just the 32-block load-border band to de-emphasize the world edge (or emphasize it as an effect). No self-computed distance, so it auto-follows player load-distance settings.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = inside (margin to border), 0 = about to exit the border
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. blockLight / heldLight internals

`blockLight` is **colored light** with three RGB channels. Each light-emitting block defines an emission color `[R, G, B]` (0–15 each) that becomes the light color as-is (regular torch = warm white (14,14,12) / lava = orange (14,8,2) / beacon = cyan (5,14,14) / white torch = (15,15,15), etc.). At the vertex stage it arrives packed as 4 nibbles — r / g / b / sky — in one float attribute. Handling the three channels separately inside the light hook enables colored local lighting — the warm-torch recipe (R9.1) is calibrated against this behavior.

When decoding `aPackedLightLevels`, the engine floors each channel at **35% of the brightest RGB channel**. E.g. a "pure red light" is lifted to (1.00, 0.35, 0) at vertices before interpolation and lift. Torch orange looking "whitish-pink rather than red" in game comes from this — tune warm-torch recipe (R9.1) saturation against this default.

Light composition is not additive. Internally the engine takes the **max** of block light (after the 35% floor) and sky light built as `mix(ambient colour, sky colour, skyLight)`, then takes max again with held light (after ambient boost). The channel values in this composition are raw values (pre-lift), separate from the post-lift values reaching hook inputs. Therefore `blockLight` and `skyLight` never cancel each other out — the darker side's contribution is simply discarded — so weakening sky light barely darkens spots dominated by block light. Design exposure/decay recipes around this structure (the local-light protection in [Part VI](06-implementation.md) §19 exists to compensate for it).

Handheld light (`heldLight`) range follows the brightest light-color channel (max 15 blocks) with `dist^0.75` preprocessing, the same 35% channel floor, and `l.heldLight` is the pre-ambient-boost value. Custom items can set `spotlightRange` and cone angle — a "beam while held" mode whose cone position follows the camera. Packs cannot know beam direction.

Custom blocks may carry `skyLightEmission` (0–15), which **injects into the skyLight channel itself, separately from blockLight BFS**. R9.12-style packs judging sun/shadow by skyLight threshold can misjudge in worlds where artificial lights lift skyLight. Distribution packs should judge combined with blockLight to stay robust.

## 27. Pipeline details

- **Surface hooks run "before" alphaTest**: `out.alpha` feeds the discard test directly. Cutout materials (grass, leaves) allow dissolve-style dither effects (recipe R-C). For liquids (blended) `out.alpha` is the real transparency (recipe R-D). No effect on normal opaque terrain — don't misunderstand
- **`l.ambient` content** is `material.ambient × sceneAmbient`, differing per material. The scene side ties to the graphics setting "Ambient Lighting Intensity" (default 0.5) — never hardcode defaults
- **The scene's directional lights are a 2-light setup**: the Lambert sum of the main light (direction from the sky setting's sun position, intensity 1.0) and the fill light (direction `[-0.5, -1, -1]`, intensity 0.35) reaches `l.directional`. The fill light points downward, so it contributes nothing to top faces and picks up downward-facing surfaces (cave ceilings etc.). Terrain considers only lights added in `_initScene`; lights added to the scene after startup are ignored by terrain and block models (an official warning message says so)
- **`bloxdTime()` is really `performance.now()`**: the browser's uptime wrapped at 1 hour. Unrelated to in-game day/night and world elapsed time. To animate synced to a game clock, estimate time from the `bloxdSunDirection()` azimuth in day/night-cycle worlds
- **Header functions read one uniform**: the engine places a 64-byte uniform at `@group(3) @binding(0)` (4 slots — time / originOffset / sunDirection / eyePosition, little-endian), and `bloxdTime()` / `bloxdOriginOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` correspond to reading those slots. `originOffset` is always `[0, 0, 0]` in the current build (a reserved slot for floating-point world coordinates). Packs cannot write this uniform, and since pack and engine WGSL merge into a single module, declaring the same group/binding yourself is also impossible
- **Vertex data is built by the mesher (Web Worker)**: block terrain is interleaved at 28 bytes per vertex (32 bytes when the atlas is on) — position = float32×3 / normal = 8-bit signed integer×4 / colour = 8-bit normalized integer×4 (the substance of `s.colour` — tint × AO is baked into 8-bit at the mesher stage, so separating or restoring it pack-side is impossible in principle) / UV = float32×2 / atlasIndex = float32. Only the light levels travel in a separate 4-byte vertex buffer ([Part VII](07-internals.md) §26, [Part II](02-api.md) §11). Vertices are drawn with per-chunk instancing
- Fine checker patterns at chunk borders during loading are the engine's screen-space Bayer 4×4 dither chunk fade, not pack bugs (disable via the graphics setting `chunkFadeIn`)
- **`mod` is a reserved word**: rejected with `pack.wgsl:3 'mod' is a reserved word in WGSL.` Write remainders with the `%` operator

### R-C. Bayer dither dissolve — out.alpha drives discard

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
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. Near-camera water fade — liquid alpha keeps sightlines

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

## 28. What changes pack-visible values — test checklist

The same pack renders differently across **world and player settings**. Check at least these 3 environments before distribution:

1. **Normal world** (default skybox, no overrides) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, default colors
2. **Space-skybox world** — bloxdSunDirection() = 0. The `sunPresent` branch look
3. **Custom world with `visionMinLightColour` / `skyLightColourOverride`** — lifted darks and colors

Main variance sources: `lightingOverride` (forced lighting) / `skyLightColourOverride`, `ambientLightColourOverride` (hex swaps) / `visionMinLightColour` ("darkest visible color". Implemented as a per-component max against both `uSkyLightColour` and `uAmbientLightColour`; Night Vision uses it — "pitch-dark cave" packs won't get as dark as intended, and the sky color itself is lifted) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (bloxdSunDirection() presence). `uSkyLightColour` default = (1,1,1) white, `uAmbientLightColour` default = (0.25,0.25,0.30). `l.ambient` scene component = graphics setting "Ambient Lighting Intensity" (default 0.5). `l.fogVisibility` follows player fog/chunk distance settings. Also `cameraTint` (RGBA tint over the whole screen) and `proximityFadeDistance` / `proximityFadeMinOpacity` (camera proximity fade for entities) are world-setting variance factors — `cameraTint` in particular is a final pass composited **over** pack output. Many of these can also be set via the script API (`serverOption`) and updated while the game runs.

## 29. Debug means

- URL parameter `?renderer=lite` — force the Lite (WebGPU) renderer (`webgl2` / `babylon` also work; `babylon` is the old name for webgl2). Priority: URL parameter > localStorage `bloxdRenderer` > settings screen > default (webgl2). Invalid values are ignored with a warning. Overrides left in the URL or localStorage can break scenes that need WebGPU (lite) with "needs the new WebGPU renderer, so remove the renderer override..." ([Part V](05-troubleshooting.md) §17)
- URL parameter `?vconsole` — on-screen console (VConsole). Handy for mobile device verification
- URL parameter `?drawcalls=1` — adds a draw-statistics debug panel. Pick game objects from the debug console, or use `drawCalls()` / `why()` / `configureDrawCallWatching()`, to inspect overdrawing by large mechanisms (pack and otherwise) and approaches to the ~65,000-vertex limit per draw call — useful for isolating performance bottlenecks
- Console shows `noa-engine v0.33.0` and `Renderer: lite from <source>` — check these first to avoid render-path misdiagnosis
- The WebGPU renderer locks "forced ON" while a pack applies. The "Disable Block Texture Atlas" setting also locks (atlas stays ON), and packs can't apply at all on WebGPU-less devices. The basis for writing "needs a WebGPU browser" on distribution pages
- Block textures are a 2D array texture (`texture_2d_array`), and the terrain sampler is nearest + repeat. The mesher also merges faces with matching material / AO / light into one rectangle (**greedy meshing**), so a merged face's UV can exceed one tile width (edges inset by 0.0015). Hardware repeat addressing handles the tiling, so merged faces look seamless. Note that procedural detail keyed to `vUV` can break at merged-face boundaries — key it to world position (`s.position` + `bloxdOriginOffset()`) instead
- Per-game-join runtime re-validation (`checkCompilation`) compiles real terrain materials in browser WebGPU (stricter than settings-screen static validation). Packs failing here are excluded from that game

## 30. Per-game apply modes (`shaderPackPolicy`)

This section pins down what `allow / strict` means at the title level (cf. §7). Only titles whose game definition explicitly carries `shaderPackPolicy: "allow"` run in full mode (vertex hooks, `discard`, terrain `alpha`); titles with no setting (or any non-allow value) are strict — `BLOXD_STRICT` is defined and guarded code is disabled automatically. The pack side cannot choose this, so knowing which titles run what is a prerequisite for distribution.

- Reference build: `szby6g.main.94a7596c.js` (production deploy as of 2026-10-17). Statically enumerating all 111 game definitions gives **26 allow entries (12 titles) / 85 strict entries**.
- Above `shaderPackPolicy` there is a delivery-channel gate (roughly `canUseShaderPacks`): through external portals (e.g. Coolmath Games builds) the shader pack system itself can be disabled before `shaderPackPolicy` is ever consulted. The allow/strict analysis below is based on the bloxd.io main web build.
- allow is declared in 12 places: 8 direct literals in game definitions and 4 base variables (`tb` / `kz` / `cb` / `Fb`); variants inherit it via spread (`{...tb,...}`). There are currently no per-variant overrides (no parent-allow / child-strict pattern either).

The 12 allow titles (26 entries in total):

- **Test Gym** — base + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (11 entries)
- **Doodle Cube** — base + Solos / Duos (3)
- **Rocket Obby** — base + Sheep / January (3)
- **9 single titles**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

The most misleading strict-side cases:

- **Superflat Creative (classic_creativeFlat) is strict.** The name contains "Creative", but within the classic family only regular Creative (`classic_creative`) is allow. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns etc. are all strict
- **Custom Games (customGames) is strict.** Vertex-hook effects do not fire in user-created custom games. Test Gym is the safe choice for verification work
- Major PvP / server titles such as bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) are all strict

Note that in strict titles the pack itself is still loaded and compiled, and fragment-side recipes such as surface / light run as usual. What is constrained: the vertex hooks (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard`, and terrain `alpha` (liquids always have it).

This list reflects the static analysis of the build above; engine updates can change the allow/strict split. Re-check when a new version ships.

[← Previous part](06-implementation.md)·[Back to the manual](README.md)·[Next part →](08-apiv2.md)

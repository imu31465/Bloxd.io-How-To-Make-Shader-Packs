# Functions

> Target API: 5 · Type: technical reference

Every header function. The texture API (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`) is covered in [Texture API](texture-api.md), along with `bloxdOpaqueBehind`.

## Frame functions (same value for the entire frame)

Header note: *"These functions return the same value for the entire frame."* They read the `bloxdPackInputs` uniform, so they are callable from vertex hooks and module-scope functions too.

### bloxdEyePosition

```wgsl
fn bloxdEyePosition() -> vec3f
```

- **Returns**: the camera's render position
- **Callable from**: all 9 hooks + module scope
- **Uses**: view vectors (`normalize(l.position - bloxdEyePosition())`), rim light, distances

### bloxdRenderOffset

```wgsl
fn bloxdRenderOffset() -> vec3i
```

- **Returns**: integer block offset; **render position + this offset = world position**
- Changes as the player travels (keeps render positions near 0,0,0)
- Used internally by `bloxdWorldPosition()`

### bloxdSunDirection

```wgsl
// The unit vector towards the sun, in world orientation; 0 when there's no sun.
// At night the sun is below the horizon (y < 0). A zero vector means no sun direction is available.
fn bloxdSunDirection() -> vec3f
```
- **Returns**: unit vector toward the sun in world orientation; **zero when the world has no sun**.
- **Facts**:
  - When this function returns a nonzero vector, the moon's direction is `-bloxdSunDirection()`. A zero return does not reveal the moon's actual direction.
  - **Never pass a zero vector to `normalize`**. Check `dot(d, d) < 1e-8` and use a constant fallback direction.
  - The engine does not provide an automatic day/night cycle. The default Earth sky keeps the sun near `(−0.56, 0.81, −0.18)` (elevation ≈ 54°); a world can implement its own cycle by updating `inclination`, which changes the sun and moon directions.
- **Uses**: color temperature, light direction, sun gating, and ambient moonlight effects.

### bloxdShadowDirection

```wgsl
// The unit vector the light that casts bloxdShadow's shadows travels along,
// in world orientation: from the sun by day, the moon by night, and the
// default sky's sun when there's no sun. Its y is never above 0 (0 when the
// sun is on the horizon).
fn bloxdShadowDirection() -> vec3f
```

- **Returns**: the travel direction of the light that casts `bloxdShadow()`'s shadows — **new in the API v5** (the uniform's sixth member, `shadowDirection` @ 64)
- **Facts**:
  - **not the same as `bloxdSunDirection()`**: the shadow light falls back to the moon at night and to the default sky's sun when the world has no sun, so shadows exist under a sunless sky too
  - its `y` is never above 0 (0 when the sun is on the horizon) — the light always comes down
- **Uses**: aligning your own light shafts / god rays with the engine's shadows, shading slanted surfaces consistently with `bloxdShadow()`

### bloxdSeconds

```wgsl
fn bloxdSeconds() -> f32
```

- **Returns**: seconds since the page loaded (no wrap — f32 keeps sub-millisecond precision for the first 4.5 hours)
- **Uses**: animation; recurring timers via `bloxdSeconds() % period`
- **Note**: unlike v2's `bloxdTime()` (which wrapped at 3600s), it does not wrap

### bloxdLit

```wgsl
// Whether block and sky lighting is on. When it's off, BloxdLightIn's
// blockLight and heldLight are 0, and its skyLight and light colours are 1.
fn bloxdLit() -> bool
```

- **Returns**: whether block & sky lighting is enabled
- **New in v5**: replaces v4's `#ifdef BLOXD_LIGHTING` compile-time branch with a runtime check
- **Guarantees when off** (header note): `blockLight` and `heldLight` are 0; `skyLight` and the light colors (`ambientLightColour` / `skyLightColour`) are 1
- **Use**: gate lighting-dependent code:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    // ... lighting-enabled processing
    return out;
}
```

Using `BLOXD_LIGHTING` produces *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## Coordinate conversion

### bloxdWorldPosition

```wgsl
// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f
```

- **Returns**: `position + vec3f(bloxdRenderOffset())`
- **Note**: f32 precision limits mean far coordinates can be inexact (header: *"with possible f32 inaccuracy"*)

### `bloxdFragmentBlockPosition`

```wgsl
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i
```

This function is **no longer part of the documented header** (it was in v4's), but the engine still accepts and defines it:

- **Validator**: still listed in the live signature table, so calls pass name validation in every hook (including vertex hooks)
- **Runtime**: the code generator still injects a definition into the terrain/liquid module and into both model programs — terrain/liquid use `vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset()`; model pipelines use a 1/64-block offset, snapping to the model's cell for placed block models
- **Caveat**: as an undocumented internal it can disappear in a future version without notice — prefer `bloxdWorldPosition()` for continuous positions and `flags` for "which block is this" (see [Version History: v5](../history/v5.md) for the removal from the header)

Packs written for v4 that call it keep working; new packs should not adopt it.

## Default functions (engine behavior)

### bloxdDefaultVertex

```wgsl
fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex
// impl: return BloxdVertex(vertex.position);
```

### bloxdDefaultSurface

```wgsl
fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface
```

Passes `colour` through, passes `enchantColour` / `overlayColour` unchanged, zeroes `emission` (and passes `alpha` in `BLOXD_ALPHA` variants). **Output structs can only be built via this function.**

### bloxdDefaultLight

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight
// impl:
//   let lit = bloxdLitColour(surface, light);
//   return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
```

Literally "apply the engine's recipe, then fog the emission-added result".

## Lighting recipe functions

The engine's own lighting recipe, documented as callable WGSL — compose or override the stages individually. Explanations and the flow diagram: [Lighting](lighting.md).

| Function | Signature | Role |
|---|---|---|
| `bloxdShading` | `(light: BloxdLightIn) -> vec3f` | how the face's material & angle light it (Lambert × diffuse + emissive + ambient, clamped 0–1) |
| `bloxdWorldLight` | `(light: BloxdLightIn) -> vec3f` | the world's light here (brightest of block/sky/held, floored by `ambientLightColour`) |
| `bloxdLitColour` | `(surface: BloxdSurface, light: BloxdLightIn) -> vec3f` | the surface's color lit as the engine does (before emission and fog) |
| `bloxdApplyFog` | `(colour: vec3f, light: BloxdLightIn) -> vec3f` | apply this fragment's fog (`mix(colour, fogColour, fogAlpha)`) |

## Shadow functions

The API v5 added the engine's real sun/moon shadow system to the pack API — projected, sun-following shadows cast by blocks, players, mobs and items. These three functions are **injected into every pack's compiled module** (like `bloxdFragmentBlockPosition`) and documented in the validator's function table, but are not part of the readable header text.

### bloxdShadow

```wgsl
fn bloxdShadow() -> f32
```

- **Returns**: sunlight or moonlight reaching this fragment — **0 in shadow, 1 lit** — *new in API v5*
- What casts them: **blocks, players, mobs and items** (the engine also excludes the first-person held item — the body you're in would shade it as you turn)
- Behavior (verbatim from the validator's description):
  - fades to 0 as the sun or moon sets, or as the face turns away from the light
  - **1 on `flags.emissive` faces** (a face lit by its own light has no shadow)
  - the light travels along `bloxdShadowDirection()`, so shadows show under a sky with no sun too
- **Callable from**: surface / light hooks
- Recipe: `let sun = mix(shadowColour, litColour, bloxdShadow());` — see [Shadows](../guides/shadows.md)

### bloxdAirShadow

```wgsl
fn bloxdAirShadow(t: f32) -> f32
```

- **Returns**: like `bloxdShadow()`, but at a point **between the camera (t = 0) and this fragment (t = 1)** — *new in API v5* — for light shafts and volumetric rays
- **Facts** (verbatim from the validator's description):
  - **only blocks cast these shadows** (players and mobs do not), **blurred to whole blocks**
  - `t` is clamped to 0–1
- Recipe: sample several `t` values along the view ray and accumulate — [Shadows](../guides/shadows.md)

### bloxdShadowDirection

See [Frame functions](#bloxdshadowdirection) above — it belongs with the shadow functions conceptually, but lives in the readable header.

## Special functions

### bloxdOpaqueBehind

```wgsl
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind
```

- **Returns**: `BloxdOpaqueBehind` (`hit: bool`, `position: vec3f`, `distance: f32`)
- **Callable from**: surface / light hooks only (the depth texture is FRAGMENT-only)
- **Guard**: `#ifdef BLOXD_SCENE_DEPTH` (defined in liquid variants)
- **Meaning**: the opaque face behind this fragment (terrain seen through water); `hit == false` for sky
- **Rename from v2**: `found` → `hit`
- **Deep dive**: [Version History: v3](../history/v3.md) and [Engine Internals](../internals/rendering-pipeline.md)

## Related

- [Lighting](lighting.md) · [Texture API](texture-api.md) · [Pack format](pack-format.md) · [Shadows](../guides/shadows.md)

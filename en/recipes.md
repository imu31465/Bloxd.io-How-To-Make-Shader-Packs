> [← Back to the manual](../README.en.md)

# Part III: Recipe collection

- [R1. Color recipes (surface)](#r1-color-recipes-surface)
- [R2. Lighting recipes (light)](#r2-lighting-recipes-light)
- [R3. Emission recipes](#r3-emission-recipes)
- [R4. Coordinate recipes (world / block / view)](#r4-coordinate-recipes-world--block--view)
- [R5. Time recipes (animation)](#r5-time-recipes-animation)
- [R6. Liquid recipes](#r6-liquid-recipes)
- [R7. Vertex recipes (allow only)](#r7-vertex-recipes-allow-only)
- [R8. Math tricks](#r8-math-tricks)
- [R9. Realistic recipes](#r9-realistic-recipes)

---

> **Important:** the recipes below are individual examples, not meant to be concatenated top to bottom. Pasting multiple definitions of the same hook name (`bloxdTerrainLight` etc.) or the same helper function name causes duplicate definitions in one module and fails compilation. To combine effects, merge them into one function per hook type.

## R1. Color recipes (surface)

### Single tint (most basic)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Saturation boost / desaturate

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 for vivid / -1.0 for full monochrome
```

### Color temperature (warm ⇄ cool)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = warm (strong red), -1.0 = cold (strong blue)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### Vintage / sepia

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### Altitude gradient (warm lowlands)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 1..0 over height 0..50
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Paint by face direction (up = bright, walls = dark)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // floor 1 / wall 0 / ceiling -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // walls and ceilings slightly darker
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Posterize (fewer colors)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

## R2. Lighting recipes (light)

### Contrast S-curve

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### Distance haze (custom fog)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // add 0..0.35 of custom fog from 64 to 192 blocks
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### Night (skyLight-driven blue shift + lamp protection)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
    #endif
    return out;
}
```

### Pitch-dark caves (darken skyless areas further)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    out.colour *= mix(1.0, 0.35, underground * underground);
    #endif
    return out;
}
```

> `skyLight` arrives post-lift (section 10), so shallow occlusion (e.g. under trees: raw 0.87 → lifted 0.97) barely darkens with this method. It works for caves (raw 0). To sharpen "tree shade", use the lift-inversion + threshold method in R9.12.

### Blue night ambience (pseudo look without moon direction)

> In this API, `bloxdSunDirection()` is zero when the sky has no sun. The following is not directional moonlight, just a faint blue ambient added when the sky is dark. Moon direction itself is available via `-bloxdSunDirection()` (day/night-cycle worlds only. Part VII R-A).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let upward = clamp(l.normal.y, 0.0, 1.0);
    out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
    #endif
    return out;
}
```

### Sunset warmth (tint by sun elevation)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 1 at horizon / 0 overhead
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### Full engine-output replacement (simplest relighting)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    #ifdef BLOXD_LIGHTING
    // NOTE: direct BloxdLight(...) construction is prohibited; rewrite colour from default
    var out = bloxdDefaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // discard engineColour (the engine lighting result) and use "base color × self-computed brightness"
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogVisibility);   // discarded engineColour, so fog redo is required
    out.colour = col + s.emission * l.fogVisibility;   // add emission yourself too (required)
    return out;
    #else
    return bloxdDefaultLight(s, l);
    #endif
}
```

## R3. Emission recipes

> `emission` is added after the lighting calculation, but the default process **attenuates it with `fogVisibility`. In fully fogged distance, emission disappears too. To keep glowing at distance, don't add to emission — add directly as `out.colour += ...` inside the light hook** (engineColour is already fogged, so light lands on top of fog color at distance)

### Pulsing lamps (breathing torches)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(bloxdTime() * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### Glowing-ore look (bright materials emit)

```wgsl
// surface side: the brighter (whiter) the material, the more emission
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### Firefly-swarm look (drifting light points over time)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // a few "light orbs" drifting slowly; glow by inverse distance
    let t = bloxdTime() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdTime() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. Coordinate recipes (world / block / view)

### World coordinates

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### Block coordinates

```wgsl
let worldBlock = bloxdFaceBlock(l.position, l.normal);
```

### Checkerboard (per block)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 or 1
out.colour *= mix(0.96, 1.04, checker);
```

### Per-block pseudo random (hash)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// uses: grass color variation, stone mottling, etc.
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### View vector and rim light

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### View angle (fresnel look — for liquids)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 head-on / 0 grazing
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. Time recipes (animation)

> `bloxdTime()` wraps every 3600 seconds (1 hour). Note this is shader elapsed time and is not guaranteed to sync with the in-game sun/day-night. Use it for visual periodic animation, but prefer `bloxdSunDirection()` and lighting inputs for actual night detection.

### Day-night cycle (1 day per hour)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdTime() * 6.2831853 / 3600.0);   // 0..1 one-hour period; not necessarily synced with in-game day/night
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### Wobble (layered sines)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### Flowing aurora bands / fluorescent stripes

```wgsl
// blend 3 colors by XZ position and time
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

## R6. Liquid recipes

### Rippling surface (color shimmer)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdOriginOffset().x);
    let worldZ = s.position.z + f32(bloxdOriginOffset().z);
    let ripple = sin(bloxdTime() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid always has BLOXD_ALPHA — guard kept as habit
    #endif
    return out;
}
```

### Pseudo depth-based transparency by height (not a real shallows test)

> In v1, scene depth and the water bottom position could not be referenced, so true water depth could not be computed with that API alone. In v2, liquid-only `bloxdOpaqueBehind()` measures the thickness to the opaque face behind (Part VIII R-E). The following is the old pseudo styling without it: `s.position.y` is a local coordinate, so using it raw shifts the effect as the chunk origin changes. Convert with `bloxdWorldPosition()` for world height. The following only varies alpha by world height — a pseudo effect, not shoreline/bottom-aware shallows. Adjust `packWaterReferenceY` to your world height.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // thinner at low altitude, closer to base alpha up high; verify direction in game
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### Underwater murk from inside

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### Liquids-only pack (terrain untouched)

```wgsl
// write no terrain_* hooks at all. Then:
//  - terrain variants = no hooks = engine defaults for terrain
//  - liquid variants  = only liquid_* hooks take effect
```

## R7. Vertex recipes (allow only)

> Wrap everything in `#ifndef BLOXD_STRICT`.

### Grass swaying in wind (move only the tops)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdTime() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // vertical faces only
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### Liquid surface waves (top faces only)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdTime() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdTime() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### Breathing terrain

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdTime() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // slight expand/contract along normals
    return out;
}
#endif
```

### Rolling terrain (giant sine waves)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdTime() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdTime() * 0.7) * 0.3;
    return out;
}
#endif
```

## R8. Math tricks

```wgsl
// smooth quantization of 0..1 (n steps)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 2-level threshold (toon shadow)
let shadow = smoothstep(0.35, 0.37, level);   // ±0.02 around the threshold makes steps

// 3-level toon
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// luma (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// smooth pulse
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// triangle wave (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// seconds → "slow phase" (for effects that ignore the 3600 s wrap)
let phase = t * 0.15;
```

## R9. Realistic recipes

> Physical recipes for "rebuilding vanilla's look from materials". Read these premises first:
>
> 1. **The light hook is called at the final fragment stage**. Its returned colour becomes the final colour as-is. **You must re-apply fog yourself** (R9.10)  
> 2. **The engine's default lighting is multiplication only**. Specular / fresnel / warm-cool separation / hemisphere ambient can all be built from zero  
> 3. `l.engineColour` is the finished color (already fogged). Rebuilding from `s.colour` (albedo) is the full-fledged approach  
> 4. Textures are prohibited → all detail must be **procedural** (hash/noise) (R9.8)

### R9.1 Warm torches × cool skylight

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // intermediate clamp
    col = mix(l.fogColour, col, l.fogVisibility);                    // fog redo
    out.colour = col + s.emission * l.fogVisibility;                 // emission re-add
    #endif
    return out;
}
```

### R9.2 Sun specular (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);          // half vector
        let ndh = max(dot(n, h), 0.0);
        let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
        let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
        out.colour += spec * vec3f(1.0, 0.97, 0.90);
    }
    #endif
    return out;
}
```

### R9.3 Schlick fresnel

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // faint edge brightness
    #endif
    return out;
}
```

### R9.4 Hemisphere ambient (sky above / ground bounce below)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // below: bounce
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // above: skylight
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // intermediate clamp
    col = mix(l.fogColour, col, l.fogVisibility);                           // fog redo
    out.colour = col + s.emission * l.fogVisibility;                        // emission re-add
    #endif
    return out;
}
```

### R9.5 ACES filmic (Narkowicz approximation)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = exposure
    return out;
}
```

### R9.6 Aerial perspective ("atmosphere" via distance desaturation)

> Unlike fog (color replacement), layering "distance desaturation" makes distant views much more realistic.  
> Caution: only reduce saturation — never touch luminance.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // falloff (~30% at 100blk / ~75% at 400blk)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // reduce saturation only (luminance unchanged)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 Wave normals + sun glitter ("sun road" on water)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // height h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // dh/dx
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // dh/dz
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = bloxdWorldPosition(l.position);
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdTime()), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);
        let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
        out.colour += glint * vec3f(1.0);
    }
    #endif
    return out;
}
```

### R9.8 Procedural micro-bump (texture-ban workaround)

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
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // in-block local coords
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lam = clamp(dot(n, sunDir), 0.0, 1.0);
        let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
        out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
    }
    #endif
    return out;
}
```

### R9.9 Nonlinear cave darkening + lamp protection

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let keep = 0.12 + 0.88 * blockInt;          // lift lamp-lit spots
    out.colour *= mix(keep, 1.0, sky * sky);     // nonlinear (squared) darkening
    #endif
    return out;
}
```

### R9.10 Re-applying fog (required when discarding engineColour)

> Setting a floor like `max(l.fogVisibility, 0.25)` caps "no denser than this"
> (0.0 = engine-accurate / 0.3–0.5 = clearer distance).
> Note the engine fog is a horizon-only linear fog (near render distance only); mid-distance haze must be built pack-side.
> Real fog settings (implementation-verified): linear fixed / `fogStart` = chunk render distance / `fogEnd` = +1 chunk / effectively disabled at 100–101 chunks when fog is off / default color RGB(183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));  // fog redo (0.15 = light floor)
    col += s.emission * l.fogVisibility;            // emission also fogged
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 Cinema grade (cool shadows / warm highlights / night desaturation)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;  // night only when sun direction is zero; no dusk gradient
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

### R9.12 Projected shadows — lift inversion + threshold cut (definitive)

> **Premise recheck (section 10)**: `l.skyLight` is not the raw voxel value (n/15) but the value after the engine's "lift curve"  
> `y = 1-(1-x/(3-2x))³` (an S-curve lifting dark areas).
>
> | Place | raw voxel | lifted (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | open sky | 1.00 | 1.00 | 1.00 |  
> | under tree (radius 2) | 0.87 | **0.97** | **0.86** ← nearly untouched |  
> | radius 3 | 0.80 | **0.92** | 0.66 |  
> | radius 5 | 0.67 | 0.78 | 0.29 |
>
> **This is the proven root cause of "shadows won't deepen no matter the gamma"**. But the curve is monotonic, so it can be inverted algebraically:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. After restoring raw values, just binarize with a threshold cut (`smoothstep`).  
> LightEngine's BFS lateral spread is "1 block = -1", so the threshold `th = 1 - r/15` directly dials  
> "occlusion of radius r or more counts as shadow". Breaking blocks moves shadows instantly (LightEngine recalculates in real time).  
> Limitation: shadows are "upward sky" based, so they don't rotate with the sun (section 15, "The truth about shadows").

```wgsl
// Invert the engine lift exactly to restore raw voxel skyLight (n/15)
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // no cbrt in WGSL, use pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // shadow radius dial: th = 1 - r/15 (0.87 = radius 2+ is shadow)
const shSoft = 0.04;   // edge softness (0.02 = hard / 0.08 = soft)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. restore raw values (skipping this never yields shadows)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. threshold cut — cleanly separates sunlit=1 / shadow=0
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // sun Lambert (fall back to l.directional when there is no sun)
    let sunLen = length(bloxdSunDirection());
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                      sunLen > 0.5);
    // the essence of projection: direct sun only reaches where sky is visible
    let lit = sunL * sky;
    // shadow side: tinted sky blue, not black + minimum ambient
    let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
    var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
    // torch light pierces shadows (blockLight is also lifted, restore together)
    let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                         sh_unlift(l.blockLight.g),
                         sh_unlift(l.blockLight.b));
    let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
    col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
    // re-apply fog (discarded engineColour's share)
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));
    out.colour = clamp(col + s.emission * l.fogVisibility, vec3f(0.0), vec3f(1.0));   // don't forget emission (fogged)
    #endif
    return out;
}
```

> Tuning guide: **shadow area is set by `shTh` alone** — `0.93` = radius 1.5+ / `0.87` = radius 2 / `0.80` = radius 3 / `0.67` = radius 5.  
> Edge hardness is `shSoft` (0.02 = hard / 0.08 = soft). Shadow core darkness is the two-point shift of `0.09` (minimum ambient) and `0.16` (sky scatter).  
> To widen shadows at dusk, add `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (long-dusk-shadow approximation.  
> `sunDir` is `bloxdSunDirection() / length(bloxdSunDirection())`). For bluer shadows raise the B of `vec3f(0.72, 0.82, 1.05)`.
>
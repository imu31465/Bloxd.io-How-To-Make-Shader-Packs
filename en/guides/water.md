# Making water look natural

> Target API: 5 · Target build: `xkg8x` (2026-11-04, production) · Status: Verified (ported to the current API — on-device re-check recommended)
This API cannot sample scene color, so this is **pseudo styling with fresnel-style color blending and sun highlights, not real reflection/refraction** (depth math uses the liquid-only `bloxdOpaqueBehind()` — the thickness-absorption recipe is further below in this page). The sample below keeps the base color, blends slightly toward a sky-like color at grazing view angles, and adds a small glint only when the sun exists.

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    if (bloxdLit()) {
        let worldPos = bloxdWorldPosition(l.position);
        let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
        let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdSeconds()), topness));
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let halfDir = normalize(viewDir + sunDir);
            let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
            out.colour += vec3f(1.0, 0.97, 0.90) * glint;
        }
}
    return out;
}
```

Tuning pointers:

- Water looks white/washed: lower `0.38` in `fresnel * 0.38` and the glint `0.55`.
- Water looks too dark: blend a bit more `fakeSkyReflection`. Too much looks plasticky.
- Lines or regular stripes on water: lower wave frequencies and glint strength. This code has no mesh vertex displacement.
- Want real scenery reflections: this API's inputs have no screen color, so blending colors never becomes real reflection (depth is liquid-only — see [Functions: bloxdOpaqueBehind](../api/functions.md)).

This recipe **replaces** an existing `bloxdLiquidLight`. Don't paste it alongside R9.7's same-named wave function or other same-named hooks.


## Underwater reality with shader packs



Underwater looks consist of 3 layers:

| Layer | Content | Operable from packs? |
|---|---|---|
| ① Terrain/liquid rendering | Hook-processable. Light hooks are called normally underwater | Yes (works "under the veil") |
| ② Liquid-definition veil | Emissive fullscreen quad from the liquid block definition color/alpha at the camera position, drawn frontmost. The game setting `cameraTint` wins if set | No (neither color nor density changeable) |
| ③ cameraTint | Game setting | No |

Practical points: packs keep working underwater / the veil cannot be removed / underwater cannot be branched on (fogStart / fogEnd / fogColour don't change underwater, so fogAlpha can't detect it either).

# Designing night looks

> Target API: 5 · Target build: `bbb6l5` (2026-11-20, production and preprod) · Status: Verified (ported to the current API — on-device re-check recommended)
Darkening only the shadows leaves the engine's finished color (`engineColour`) bright even when the sun is absent. This makes the contrast between lit faces and shadowed areas look unnatural. Instead, reduce the intensity of the entire finished color.

The example treats a zero `bloxdSunDirection()` vector as night and a non-zero vector as day, reducing the terrain's finished color during dark hours. Where `blockLight` or `heldLight` is strong, the reduction is eased to preserve nearby light sources such as torches. The value `0.52` is adjustable; lower it for darker nights.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    if (bloxdLit()) {
        let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
        let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
        let protectLocalLight = smoothstep(0.03, 0.35, localLight);
        scale = mix(nightDim, 1.0, protectLocalLight);
    }
    // decay the finished color; add material emission through fog as default
    out.colour = l.engineColour * scale + s.emission * (1.0 - l.fogAlpha);
    return out;
}
```

**Limitations:** if `bloxdSunDirection()` is either a unit direction when the sun is present or zero when it is absent, this method can distinguish day from night but cannot estimate dusk or twilight smoothly. Because it reduces the finished color, it also dims the engine's daylight and ambient lighting together; it does not reproduce the full progression of time. To apply the same approach to liquids, check the liquid hooks' fallback behavior.

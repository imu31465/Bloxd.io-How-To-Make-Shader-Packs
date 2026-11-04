# Designing night looks

> Target API: 5 · Target build: `xkg8x` (2026-11-04, production) · Status: Verified (ported to the current API — on-device re-check recommended)
Darkening only shadows leaves the engine finished color (`engineColour`) bright when there is no sun, making the face/shadow gap unnatural. Decay the whole finished color instead.

The example below treats zero `bloxdSunDirection()` as night and directional sun as day, decaying terrain finished colors at dark hours. Where `blockLight` and `heldLight` are strong, decay weakens to preserve nearby lamps like torches. `0.52` is a tuning value — lower it for darker nights.

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

**Limits of this fix:** if `bloxdSunDirection()` behaves as "unit direction with sun, zero without", day/night can be told apart but dusk/twilight cannot be smoothly estimated. And since it decays the finished color, it weakens engine daylight and ambient together — not a full time-of-day reproduction. To apply the same to liquids, check the liquid hook fallback relationship.

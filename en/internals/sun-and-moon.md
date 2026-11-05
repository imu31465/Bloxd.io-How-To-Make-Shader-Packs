# The sun and the moon

> Target API: 5 · Target build: `bny9u` (2026-11-05, production) · Status: Analyzed (production-bundle JavaScript analysis)
The `bloxdSunDirection()` source is a sun-direction buffer rewritten only when the skybox type changes — the criterion is not "whether the sky has a sun" but **"whether the skybox is the earth type"**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (procedural sky) | Non-zero (defaults below) |
| `gloomy` / `interstellar` / `space_*` (cube textures) | **Always (0,0,0)** |

**The moon is always `-bloxdSunDirection()`** (the engine computes the moon position as the exact opposite of the sun). Night is judged by sun elevation — the moon is up when `bloxdSunDirection().y < 0` (sun below horizon). But in default worlds the sun is static, so the moon is static too; only worlds implementing a day/night cycle see it move.

The default-world sun direction is about `(-0.56, 0.81, -0.18)` (unit vector computed from inclination = −0.2 / azimuth = 0.55, static). A practical reference for predicting highlight directions on paper when testing distribution packs.

Day/night cycles are not built into the engine — inclination is a static number, and worlds with moving day/night update it game-side. `bloxdSunDirection()` follows each update.

Terrain directional lights are just 2 lamps created at scene start with **fixed direction and intensity, unchanging day and night**. In short, **no terrain-brightness factor depends on time. Day/night "looks" come only from the skybox and bloxdSunDirection()**, so packs darkening terrain at night must estimate the time band from bloxdSunDirection() themselves (the `sunPresent` technique in [Designing night looks](../guides/night.md)).

## R-A. Directional moonlight — moonDir = −bloxdSunDirection()

Adds bluish-white Lambert and weak specular only while the moon is up. `moonUp` is 0 in static-sun default worlds, so nothing happens there — **moonlight that only fires in day/night-cycle worlds, hence safe**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
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
}
    return out;
}
```

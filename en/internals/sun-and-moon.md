# The sun and the moon

> Target API: 5 · Type: technical reference
`bloxdSunDirection()` reads a sun-direction buffer that is rewritten only when the skybox type changes. The deciding condition is not whether the sky visibly contains a sun, but **whether the skybox is of the `earth` type**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (procedural sky) | Non-zero (defaults below) |
| `gloomy` / `interstellar` / `space_*` (cube textures) | **Always (0,0,0)** |

When `bloxdSunDirection()` returns a nonzero vector, the moon's direction is `-bloxdSunDirection()` (the engine places it directly opposite the sun). If it returns zero, this function does not reveal the moon's actual direction. Night is judged by the sun's elevation: the moon is above the horizon when `bloxdSunDirection().y < 0` (the sun is below the horizon). In default worlds the sun is static, so the moon is static too; only worlds implementing a day/night cycle see it move.

The default-world sun direction is about `(-0.56, 0.81, -0.18)` (unit vector computed from inclination = −0.2 / azimuth = 0.55, static). Use this value as a reference when estimating highlight directions while testing packs.

The engine does not provide a built-in day/night cycle. The inclination remains static; worlds that implement a moving cycle update it in game logic, and `bloxdSunDirection()` reflects each update.


Terrain uses only two directional lights, both created when the scene starts. Their **direction and intensity stay fixed throughout the day and night**. In other words, terrain brightness does not vary with time; the day/night appearance comes only from the skybox and `bloxdSunDirection()`. Packs that darken terrain at night must estimate the time of day themselves from `bloxdSunDirection()`, as in the `sunPresent` technique in [Designing night looks](../guides/night.md).

## R-A. Directional moonlight

Adds bluish-white Lambert and weak specular only while the moon is up. `moonUp` is 0 in static-sun default worlds, so nothing happens there — **moonlight that only fires in day/night-cycle worlds, hence safe**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // The moon is opposite the sun only when the sun direction is nonzero.
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

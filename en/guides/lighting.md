# How lighting works

> Target API: 5 · Target build: `bny9u` (2026-11-05, production) · Status: Verified (ported to the current API — on-device re-check recommended)
Engine default lighting is "multiplication only" — no specular, fresnel, warm/cool separation, or hemisphere ambient exists. The following can be rebuilt:

| Feature | Default | Buildable in packs? |
|---|---|---|
| Diffuse (Lambert) | Scalar sum of directional lights only | ◎ Custom with `bloxdSunDirection()` (wrapped falloff etc.) |
| Specular | None | ◎ Blinn-Phong (R9.2) |
| Fresnel | None | ◎ Schlick approximation (R9.3) |
| Warm-torch / cool-sky separation | Uncolored | ◎ (R9.1) |
| Hemisphere ambient | Directionless only | ◎ Sky above / ground below (R9.4) |
| Tone mapping | None (clamp only) | ◎ ACES filmic (R9.5) |
| Aerial perspective | Fog (color replacement) only | ◎ Distance desaturation (R9.6) |
| Surface detail | Texture resolution only | △ Procedural hash-noise micro-bump (R9.8) |
| Vertex waves (water) | None (flat) | ◎ Allow only (R7) |
| Wave normals / sun glitter | None | ◎ (R9.7) |
| Night moonlight | Sky color just darkens | △ No moon direction input, so only pseudo looks (blue ambient in R2 / desaturation in R9.11) |
| Shadows (sky-occlusion) | Gently blended via `mix(ambient, sky, skyLight)` only | ◎ Lift inversion + threshold cut + sun gate (R9.12). Tree shade and under-roof areas drop clearly, following block edits in real time |

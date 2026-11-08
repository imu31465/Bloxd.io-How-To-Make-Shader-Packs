# Debugging tips

> Target API: 5 · Target build: `v98qt8` (2026-11-08, production and preprod) · Status: Verified (ported to the current API — on-device re-check recommended)
- Caves too bright → missing nonlinear `skyLight` curve (R2 cave recipe / R9.9)
- Blown-out days → lower pre-ACES exposure
- Nights too dark to see → secure minimum ambient (night `skyLightColour` is nearly black by premise)
- Over-hazed distance → lower aerial coefficients
- Torch surroundings all orange → lower the warm blend ratio (keep some raw tinted light)
- Blocks almost all white → light hook output total exceeds 1.0 (no clamp downstream). End with `clamp(col, vec3f(0.0), vec3f(1.0))`
- White without additions → un-fog inversion via fog division. Drop un-fog; rebuild from `s.colour` and `mix` fog once at the end
- Emissive blocks don't glow → missing emission re-add in rebuild recipes. Add `+ s.emission * (1.0 - l.fogAlpha)`
- Night looks wrong only on lit faces → don't darken just shadow colors; decay the whole engine finished color (`engineColour`) at night. To keep local lamps, weaken decay with `blockLight` / `heldLight` ([Designing night looks](night.md))
- Shade won't deepen no matter the `pow(skyLight, γ)` → `l.skyLight` is post-lift (section 10). Switch to R9.12 inversion + threshold cut
- Tuning shadow area/density → see the R9.12 tuning guide (area = threshold `shTh` / edge = `shSoft` / core darkness = two-point shift of minimum ambient and sky scatter)

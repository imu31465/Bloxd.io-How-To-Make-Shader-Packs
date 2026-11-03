# In-game test checklist



Compile success and "good looks" are different things. Check in this order:

1. **Loading:** `pack.json` sits at the ZIP root. Right after selecting, `Ready. Reload the page to use it.` is shown and the pack becomes active **on page reload**; confirm `Ready to use` afterwards. Saved packs are re-validated automatically on the next page load: whenever the engine-side spec header updates, the header content is fingerprint-checked (pass = stays as-is / fail = shown as blocked), so a broken old pack never stays silently active.
2. **6 variants:** no type-guard omissions across strict / allow, lighting on / off, terrain / liquid. Even if a game only uses some conditions, distribution packs should assume all 8.
3. **Daytime:** no blown colors per material (grass, stone, sand, wood); natural bright/dark split between tops and sides.
4. **Night:** compare same materials in former daylight, shadows, and near torches. If only lit faces remain, tune exposure decay; if everything is dark, tune local-light protection.
5. **Water:** look from above, grazing angles, shores, underwater, and night separately. Alpha behavior and underwater looks depend on the game's compositing — never judge from one viewpoint. Underwater, the liquid-definition veil covers frontmost per [Part VII](../internals/) discussion, so pack differences show mainly on the surface and terrain through the veil.
6. **Borders and distance:** no popping waves/patterns at chunk / origin transitions; no double fog or white haze in the distance.
7. **Performance:** effects heavy on per-fragment hash/trig/`pow` calls should be minimal. Add detail gradually and compare FPS.

## Known constraints as premises

- Shader packs are limited to terrain / liquid hooks — no same-code handling of sky, entities, or UI.
- No inputs exist for adding shadow maps, screen-space reflections, refraction, bloom, etc. (scene depth is unlocked liquid-only as `bloxdOpaqueBehind()`. See [Part VIII](../history/v2.md)).
- `bloxdSeconds()` is animation time with no guaranteed link to in-game day/night.
- Zero `bloxdSunDirection()` means true moon direction is unknown, not "moonlight physics" but a mood approximation. Directional moonlight can be built from `-bloxdSunDirection()` (day/night-cycle worlds only. [Part VII](../internals/) R-A).
- `s.position` / `l.position` are local coordinates, so add `bloxdRenderOffset()` for world-dependent effects. For in-block-local patterns, local coordinates are intentionally the tool.

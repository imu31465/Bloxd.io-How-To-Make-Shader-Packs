# Engine data ledger

> Target API: 5 · Target build: `bbb6l5` (2026-11-20; production and preprod serve the same build) · Status: Verified

The documentation's measurement ledger — every confirmed value, all measured on the current target build `bbb6l5`.

## The ledger

| Item | Value |
|---|---|
| `apiVersion` | `5` (strict `===`, number) — unchanged through the whole v5 era |
| engine header | 216 lines decoded (208 at the v5 launch). First line `// The Bloxd shader pack API, apiVersion 5. Read-only, prepended to all packs.` — full text in [Engine header](engine-header.md) |
| hooks | 9 (terrain/liquid/model × vertex/surface/light). Names unchanged; the default template bundles all 9 |
| variants | 6 (strict × program). Names `strict\|allow.terrain\|liquid\|model` — the lighting axis is gone |
| macros | `BLOXD_STRICT` (strict) · `BLOXD_ALPHA` (all liquid + non-strict terrain/model) · `BLOXD_SCENE_DEPTH` (all liquid) · ~~`BLOXD_LIGHTING`~~ **removed** |
| pack uniform | `@group(3) @binding(0)`, **80 B**: seconds@0, lit@4 (u32, new in v5), renderOffset@16, sunDirection@32, eyePosition@48, **shadowDirection@64 (new on `bbb6l5`)** |
| pack bindings | group 3: 0 uniform · 1 scene depth (liquid) · 2 `bloxdSpTextureLayers` storage; `minBindingSize` 80 |
| shadow API | **new on `bbb6l5`**: `bloxdShadow()` / `bloxdAirShadow(t)` / `bloxdShadowDirection()` ([Functions](../api/functions.md), [Shadows](../guides/shadows.md)) |
| flags | the `BloxdFlags` struct, 14 bools; v4's bit values retired |
| loader limits | 256 `.wgsl` / 256 KB source / 64 KB `pack.json` / 32 MB zip / 1,024 entries; UTF-8; one manifest; unique paths — all unchanged. `pack.json` gains the optional `keepCircleShadows` boolean |
| texture registry | 1,210 entries at the v5 launch → 896 usable names → `xkg8x` (2026-11-04): 1,220 / 906 → `bny9u` (2026-11-05): 1,232 / 911 → `v98qt8` (2026-11-08): 1,227 / 906 (folding regression) → `bbb6l5` (2026-11-20): **1,650 / 1,017 usable names** — +423/−0 (Atomic Age content + transition slots), 863 id changes, **folding regression fixed** ([Texture registry](texture-registry.md)) |
| light curve | 0–15 levels → 0–1, ease-out (`6 → 0.45`, `12 → 0.92`) — in the header, unchanged |
| lift curve | `1 - (1 - x / (3 - 2x))^3` — unchanged |
| directional cone | `0.12 / 0.65 / 0.62 / 0.95` — unchanged |
| fog color | `vec3f(183/255, 191/255, 195/255)` — unchanged |
| reserved names | `/^bloxd/i` (case-insensitive) + the `bloxdSp*` engine symbols — 46 at the v5 launch, **88 on `bbb6l5`** ([Reserved identifiers](reserved-identifiers.md)) |
| HEADER_VERSION | `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` at launch — `9.<hash>` on `bbb6l5` (the registry fingerprint folds in at the page level) |
| strict titles | everything except the 12 allow titles in [Policy](policy.md) (re-enumerated on `bbb6l5`: 119 game definitions, 28 allow entries — same 12 titles, 91 strict) |
| header/registry builders | engine-internal (bundle internals are not part of the documented API) |
| default pack template | 1,633 B — byte-identical since `bny9u` |

## Past ledgers

- v4 (cnty9, 2026-10-27) → [Version History: v4](../history/v4.md)
- v3 (3ymzdd, 2026-10-19) → [Version History: v3](../history/v3.md)

## Related

- [Research log](research-log.md) · [Engine header](engine-header.md) · [Policy](policy.md)

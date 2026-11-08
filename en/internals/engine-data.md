# Engine data ledger

> Target API: 5 · Target build: `v98qt8` (2026-11-08; production and preprod serve the same byte-identical bundle) · Status: Verified

The documentation's measurement ledger — every confirmed value, all measured on the current target build `v98qt8`.

## The ledger

| Item | Value |
|---|---|
| `apiVersion` | `5` (strict `===`, number) |
| engine header | 8,954 B decoded / 208 lines (9,125 B as shipped, 6 interpolations). First line `// The Bloxd shader pack API, apiVersion 5. Read-only, prepended to all packs.` — full text in [Engine header](engine-header.md) |
| hooks | 9 (terrain/liquid/model × vertex/surface/light). Names unchanged; the default template bundles all 9 |
| variants | 6 (strict × program). Names `strict\|allow.terrain\|liquid\|model` — the lighting axis is gone |
| macros | `BLOXD_STRICT` (strict) · `BLOXD_ALPHA` (all liquid + non-strict terrain/model) · `BLOXD_SCENE_DEPTH` (all liquid) · ~~`BLOXD_LIGHTING`~~ **removed** |
| pack uniform | `@group(3) @binding(0)`, 64 B: seconds@0, **lit@4 (u32, new)**, renderOffset@16, sunDirection@32, eyePosition@48 |
| pack bindings | group 3: 0 uniform · 1 scene depth (liquid) · 2 `bloxdSpTextureLayers` storage |
| flags | the `BloxdFlags` struct, 14 bools; v4's bit values retired |
| loader limits | 256 `.wgsl` / 256 KB source / 64 KB `pack.json` / 32 MB zip / 1,024 entries; UTF-8; one manifest; unique paths — all unchanged |
| texture registry | 1,210 entries → **896 usable names**; drift vs cnty9 +1/−10 ([Texture registry](texture-registry.md)) → `xkg8x` (2026-11-04): 1,220 / **906** → `bny9u` (2026-11-05): 1,232 / **911** → `v98qt8` (2026-11-08): 1,227 / **906 usable names** — +1 `hay_block_top`, −6 model-converted block textures (Furnace, Workbench, Artisan Bench), 716 id changes; **folding regression** — the engine resolves 1,047 unfolded names ([Texture registry](texture-registry.md#the-v98qt8-folding-regression)) |
| light curve | 0–15 levels → 0–1, ease-out (`6 → 0.45`, `12 → 0.92`) — in the header, unchanged |
| lift curve | `1 - (1 - x / (3 - 2x))^3` — unchanged (currently chunk c9) |
| directional cone | `0.12 / 0.65 / 0.62 / 0.95` — unchanged (chunk c9) |
| fog color | `vec3f(183/255, 191/255, 195/255)` — unchanged |
| reserved names | `/^bloxd/i` (case-insensitive) + the 46 `bloxdSp*` engine symbols ([Reserved identifiers](reserved-identifiers.md)) |
| HEADER_VERSION | `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` |
| strict titles | everything except the 12 allow titles in [Policy](policy.md) (re-enumerated on `v98qt8`: 116 game definitions, 28 allow entries — same 12 titles, 88 strict) |
| header/registry builders | header module 30052 in chunk c63 (classifier 30048 in c59/c60/c61/c9); atlas/registry builder module 28312 in chunk c49, data module 1351 in main; on `bny9u` the header was 29815 in c56 and the builder 29812 in c52–c54 (30093 + 1391 on `xkg8x`) |
| default pack template | chunk c131 (c122 on `bny9u`, c116 on `xkg8x`, c124 on v4), 1,633 B — byte-identical to `bny9u`'s |

## Bundle layout (for re-surveyors)

The shader-pipeline cluster on `v98qt8`: loader (zip/manifest/limits, module 33165) and atlas/registry builder (28312) in c49, header/apiVersion module 30052 in c63, classifier 30048 in c59/c60/c61/c9, validator/compile modules across c61–c63, default pack template **c131**, fog c9. On `bny9u` it was: loader 32942 and registry builder c52–c54, validator/header c56, WebGPU/codegen c57.

Chunk-format note: every chunk is an ES module (`export const modules = {...}`) — several chunks carry shared module sets (c59/c60/c61 all embed the classifier) — so plain-text search of the bundle remains meaningful (the data module `1351` lives in *main*'s sparse module array, in no chunk).

The main bundle is 3,583,101 bytes (3.58 MB, md5 `7458fd47ff88331d9f451d1456ff48ac` — byte-identical on production and preprod); the chunk map grew to 212 ids (c0–c212; c0–c7 are dead map entries, 404 on the server, 205 chunks emitted).

## Past ledgers

- v4 (cnty9, 2026-10-27) → [Version History: v4](../history/v4.md)
- v3 (3ymzdd, 2026-10-19) → [Version History: v3](../history/v3.md)

## Related

- [Research log](research-log.md) · [Engine header](engine-header.md) · [Policy](policy.md)

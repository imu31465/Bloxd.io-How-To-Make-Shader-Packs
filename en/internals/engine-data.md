# Engine data ledger

> Target API: 5 · Target build: `bny9u` (2026-11-05; production and preprod serve the same byte-identical bundle) · Status: Verified

The documentation's measurement ledger — every confirmed value, all measured on the current target build `bny9u`.

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
| texture registry | 1,210 entries → **896 usable names**; drift vs cnty9 +1/−10 ([Texture registry](texture-registry.md)) → `xkg8x` (2026-11-04): 1,220 / **906** → `bny9u` (2026-11-05): 1,232 / **911 usable names** — +5 (Trading Terminal ×3, Stone Generator ×2), 864 id changes |
| light curve | 0–15 levels → 0–1, ease-out (`6 → 0.45`, `12 → 0.92`) — in the header, unchanged |
| lift curve | `1 - (1 - x / (3 - 2x))^3` — unchanged (currently chunk c9) |
| directional cone | `0.12 / 0.65 / 0.62 / 0.95` — unchanged (chunk c9) |
| fog color | `vec3f(183/255, 191/255, 195/255)` — unchanged |
| reserved names | `/^bloxd/i` (case-insensitive) + the 46 `bloxdSp*` engine symbols ([Reserved identifiers](reserved-identifiers.md)) |
| HEADER_VERSION | `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` |
| strict titles | everything except the 12 allow titles in [Policy](policy.md) (re-enumerated on bny9u: 115 game definitions, 28 allow entries — same 12 titles) |
| header/registry builders | header module 29815 in chunk c56 (renumbered from c55); on `bny9u` the registry builder is module 29812 (chunks c52/c53/c54, data module 1351; on `xkg8x` it was 30093 + 1391) |
| default pack template | chunk c122 (c116 on `xkg8x`, c124 on v4), 1,633 B |

## Bundle layout (for re-surveyors)

The shader-pipeline cluster: loader (zip/manifest/limits, module 32942) and registry builder c52–c54, validator/header c56, WebGPU/codegen c57, fog c9. **The default pack template is c122** (c116 on `xkg8x`, c124 in v4).

Chunk-format note: every chunk is an ES module (`export const modules = {...}`) — c53 carries both c52's and c53's modules — so plain-text search of the bundle remains meaningful (the data module `1351` lives in *main*'s sparse module array, in no chunk).

The main bundle is 3,362,913 bytes (3.36 MB); the chunk map grew to 201 IDs (c0–c201; 7 named chunks c0–c6).

## Past ledgers

- v4 (cnty9, 2026-10-27) → [Version History: v4](../history/v4.md)
- v3 (3ymzdd, 2026-10-19) → [Version History: v3](../history/v3.md)

## Related

- [Research log](research-log.md) · [Engine header](engine-header.md) · [Policy](policy.md)

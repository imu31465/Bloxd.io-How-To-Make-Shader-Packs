# Research log

> Status: Verified — how this documentation's measurements were obtained

The technical statements here rest not on official developer documentation but on **production-bundle analysis**. This page records methodology and evidence so future builds can be re-verified.

## Core principles

1. **Direct production-bundle retrieval** — raw main.js and chunks fetched from both production and preprod, identity verified by md5
2. **Verbatim respect** — headers, error messages and i18n strings are **quoted as-is**, never paraphrased
3. **Reproduced measurement** — derived values like the registry are recomputed by running the engine's own modules in a harness (real output, not a lookalike re-implementation)
4. **Named builds** — every measurement carries a build id and date

## Build history referenced by this documentation

| Build | API | Date | Note |
|---|---|---|---|
| `szby6g` | v3-era | 2026-10-17 | first allow/strict static analysis (111 game definitions) |
| `3ymzdd` | v3 | 2026-10-20 | the v3 guide's evidence build |
| `sjr0p7` | v3-era | 2026-10-17 | drift-comparison baseline |
| `cnty9` | v4 | 2026-10-27 | v4 guide & 905-name catalog evidence |
| `6pf78` / `tcwczu` | v4 | 2026-10-31 | v4 freeze confirmation (Halloween event + Skyblock rework) |
| `ab90qa` | **v5** | 2026-11-03 | v5 launch build; original v5 baseline. prod = preprod (md5 `fc3322212d15be2445c0e8dfc9733fcc`) |
| `xkg8x` | **v5** | 2026-11-04 | registry drift (+10 names); preprod `2lcqcl` measured identical on every shader-pack surface |
| `bny9u` | **v5** | 2026-11-05 | registry drift (+5 names); prod = preprod (md5 `60eea80ec48253b7ac6cc45604dc8273` on the main bundle, live-fetched from both hosts) |
| `v98qt8` | **v5** | 2026-11-08 | **current**; this documentation's baseline. prod = preprod (md5 `7458fd47ff88331d9f451d1456ff48ac`). Registry drift (−5 net), games 115 → 116, and the **texture-constant folding regression** ([Texture registry](texture-registry.md#the-v98qt8-folding-regression)) |

## Key methodology

### Engine-header restoration

Rendering the c55 header template with its live interpolations (`${vC}` = apiVersion, the 5 uniform reads via `${Gq.j}`) — 6 interpolations on v5 ([Engine header](engine-header.md)).

### Texture-registry recomputation

Running the engine's registry-building machinery against the shipped block registry's texture data (data module 1351 in the main bundle) in a mini webpack harness; recording the output (named 906 / aliases 424 / atlas 1,227 on the current build `v98qt8`, 2026-11-08 — computed with the intended slot-keyed input, plus the as-shipped name-keyed run that exposes the folding regression: 1,047 / 240 / 1,227; 911 / 424 / 1,232 on `bny9u` via its classifier module; 906 / 416 / 1,220 on `xkg8x`; 896 at the v5 launch) ([Texture registry](texture-registry.md)).

Animation intervals come from the `animDataPerTex`-style table (per-layer `numAnimStates` / `animationInterval`) — only three interval values exist: 200 / 250 / 300 ms ([the catalog](../api/texture-catalog.md#animation-families-43-names)).

### Error-message capture

Loader messages verbatim from the live i18n dictionary; validator messages from the validation module's string literals.

### allow / strict static analysis

Statically analyzing all 111 game definitions (szby6g-era): `shaderPackPolicy` `"allow"` literals — 8 direct + 4 base-variable = 12 titles (26 entries), spread-inheritance (`{...tb,...}`) tracked too. On the current build the games module (513) is evaluated in a harness instead: 116 definitions, 28 allow entries — same 12 titles ([Policy](policy.md)).

### Uniform / pipeline restoration

The `BloxdPackInputs` field layout from the uniform-layout module (29838); the texture 3-variant codegen from the WebGPU generator (c56) ([Texture sampling](texture-sampling.md)).

## Drift observations

| Comparison | Period | Result |
|---|---|---|
| sjr0p7 → cnty9 | 10 days | 98 added, 79 removed; 779/1121 names changed id (69%) |
| cnty9 → ab90qa | 7 days | +1 (scorpion_eggs), −10 (double chest ×8, spawner sides ×2); 334/905 names changed id |
| ab90qa → xkg8x | 1 day | +10 (all v5-launch removals returned: double chest ×8, spawner sides ×2); 376/896 names changed id; none removed |
| xkg8x → bny9u | 1 day | +5 (Trading Terminal ×3, Stone Generator ×2); 864/906 names changed id (95%); none removed; anim families 42 → 43 |
| bny9u → v98qt8 | 3 days | +1 `hay_block_top`, −6 (Furnace/Workbench/Artisan Bench became models); 716/905 names changed id (79%); families unchanged; **folding regression** — engine resolves 1,047 unfolded names |

## Unverified / speculative

- Pixel-accurate shadow maps as "future plans" is an **interpretation** (inferred from the unused `var shadow: f32 = 1.;` in the lighting template)
- The allow/strict split can change per build (12-title identity re-confirmed on ab90qa and xkg8x; future games unknown)
- `bloxdFragmentBlockPosition` (out of the v5 header): signature-table entry and runtime injection both confirmed live — calls validate and compile; whether the engine team intends to keep it is unknown

## When to re-verify

On detecting a game update (a new main.js hash): re-check the header (8,954 decoded bytes), the apiVersion constant, recompute the registry, and re-confirm the allow/strict list. Detailed monitoring methodology is outside this documentation's scope, but the module locations above are the starting points — on `v98qt8`: header/apiVersion module 30052 and validator modules in chunk c63, classifier module 30048 in c59/c60/c61/c9, loader (zip/manifest/limits) module 33165 in chunk c61, atlas/registry builder 28312 in chunk c49 (data module 1351 in main), default pack template in chunk c131, games/policy module 513 in the main bundle.

## Related

- [Engine data](engine-data.md) · [Texture registry](texture-registry.md) · [Version History](../history/)

# Research log

> Status: Verified — how this documentation's measurements were obtained

The technical statements here rest not on official developer documentation but on **production-bundle analysis**. This page records methodology and evidence so future builds can be re-verified.

## Core principles

1. **Direct production-build retrieval** — raw main.js and chunks fetched from both production and preprod, identity verified by hash
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
| `ab90qa` | **v5** | 2026-11-03 | v5 launch build; original v5 baseline. prod = preprod |
| `xkg8x` | **v5** | 2026-11-04 | registry drift (+10 names); preprod `2lcqcl` measured identical on every shader-pack surface |
| `bny9u` | **v5** | 2026-11-05 | registry drift (+5 names); prod = preprod |
| `v98qt8` | **v5** | 2026-11-08 | registry drift (−5 net), games 115 → 116, and the **texture-constant folding regression** ([Texture registry](texture-registry.md#the-v98qt8-folding-regression)) |
| `bbb6l5` | **v5** | 2026-11-20 | **current**; this documentation's baseline. prod = preprod. **The first v5-era API surface change**: the shadow API (`bloxdShadow()` / `bloxdAirShadow()` / `bloxdShadowDirection()`), the 80 B uniform, `keepCircleShadows`, the folding regression fixed, and the registry's largest step (+423/−0, Atomic Age content + transition slots). Fingerprint match-verified against the shipped pre-built atlas |

## Key methodology

### Engine-header restoration

Rendering the header template from the live build's validator with its live interpolations (`apiVersion`, the uniform reads via `bloxdPackInputs`) ([Engine header](engine-header.md)).

### Texture-registry recomputation

Running the engine's registry-building machinery against the shipped block registry's texture data in a mini webpack harness; recording the output (named 1,017 / aliases 776 / atlas 1,650 on the current build `bbb6l5`, 2026-11-20 — the engine's own folding, fingerprint `32451195` match-verified against the shipped pre-built atlas; 1,227 / 906-intended / 1,047-as-shipped on `v98qt8`; 1,232 / 911 on `bny9u`; 1,220 / 906 on `xkg8x`; 1,210 / 896 at the v5 launch) ([Texture registry](texture-registry.md)).

Animation intervals come from the animation table (per-layer `numAnimStates` / `animationInterval`) — three interval values exist: 200 / 250 / 300 ms, and the new transition spellings carry their own (`lava0~lava1~50`) ([the catalog](../api/texture-catalog.md#animation-families)).

### Error-message capture

Loader messages verbatim from the live i18n dictionary; validator messages from the validation module's string literals.

### allow / strict static analysis

Statically analyzing all 111 game definitions (szby6g-era): `shaderPackPolicy` `"allow"` literals — 8 direct + 4 base-variable = 12 titles (26 entries), spread-inheritance (`{...tb,...}`) tracked too. On the current build the games registry is evaluated in a harness instead: 119 definitions, 28 allow entries — same 12 titles ([Policy](policy.md)).

### Uniform / pipeline restoration

The `BloxdPackInputs` field layout from the live uniform-layout module; the texture 3-variant codegen from the WebGPU generator ([Texture sampling](texture-sampling.md)).

## Drift observations

| Comparison | Period | Result |
|---|---|---|
| sjr0p7 → cnty9 | 10 days | 98 added, 79 removed; 779/1121 names changed id (69%) |
| cnty9 → ab90qa | 7 days | +1 (scorpion_eggs), −10 (double chest ×8, spawner sides ×2); 334/905 names changed id |
| ab90qa → xkg8x | 1 day | +10 (all v5-launch removals returned: double chest ×8, spawner sides ×2); 376/896 names changed id; none removed |
| xkg8x → bny9u | 1 day | +5 (Trading Terminal ×3, Stone Generator ×2); 864/906 names changed id (95%); none removed; anim families 42 → 43 |
| bny9u → v98qt8 | 3 days | +1 `hay_block_top`, −6 (Furnace/Workbench/Artisan Bench became models); 716/905 names changed id (79%); families unchanged; **folding regression** — engine resolves 1,047 unfolded names |
| v98qt8 → bbb6l5 | 12 days | +423 (111 usable: Atomic Age content; 204 transition spellings), −0; 863/906 names changed id (95%); rotation families 57 → 64, anim families 43 → 71; **folding regression fixed**; the shadow API arrived |

## Unverified / speculative

- Pixel-accurate shadow maps as "future plans" is no longer speculative — `bbb6l5` shipped the real shadow system (`bloxdShadow()`); the old interpretation (inferred from the unused `var shadow: f32 = 1.;` in the lighting template) turned out correct
- The allow/strict split can change per build (12-title identity re-confirmed through `bbb6l5` — 28 allow entries over the same 12 titles; future games unknown)
- `bloxdFragmentBlockPosition` (out of the v5 header): signature-table entry and runtime injection both confirmed live — calls validate and compile; whether the engine team intends to keep it is unknown

## When to re-verify

On detecting a game update (a new build id): re-check the header, the `apiVersion` constant, recompute the registry, and re-confirm the allow/strict list. Detailed monitoring methodology is outside this documentation's scope; the pack-visible surfaces (header text, loader messages, registry fingerprint, allow titles) are the re-verification anchors.

## Related

- [Engine data](engine-data.md) · [Texture registry](texture-registry.md) · [Version History](../history/)

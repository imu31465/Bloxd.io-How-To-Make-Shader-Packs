[← Previous part](04-realism.md)·[Back to the manual](README.md)·[Next part →](06-implementation.md)

# Part V: Troubleshooting & notes

> The live game has required `apiVersion: 3` since 2026-10-19 and rejects v1/v2 packs at load — the content below is written against the v2 specification; see [Part IX](09-apiv3.md) for migration before you distribute anything.

## 17. Common errors and fixes

| Symptom | Fix |
|---|---|
| Won't load in strict games | Wrap the vertex hook in `#ifndef BLOXD_STRICT` |
| `.alpha` reported undefined | Wrap in `#ifdef BLOXD_ALPHA` |
| `blockLight` reported undefined | Wrap in `#ifdef BLOXD_LIGHTING`. Wrap shared helper functions **as whole functions** (fields exist in all variants in v2, so this normally does not happen. Keep guards used for detection) |
| `Packs can't construct BloxdSurface directly` | Start from `bloxdDefaultSurface(s)` |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | Wrap in `#ifndef BLOXD_STRICT` |
| White hazy distance | Often double fogging. The finished color is already fogged, so keep custom haze subtle and prefer saturation-only reduction |
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | Warning that the light seed queue overflowed in high-density emitter regions or across region boundaries, so that chunk's light computation was cut short. Not pack-derived, but **light gaps around emitter concentrations come from this spec** — spreading light sources in the world avoids it |
| Pack excluded when joining a game | Failing the in-game live compile check. Re-check guard omissions |
| The live check never terminates and the pack drops with `This device couldn't check …` etc. | The check has a forced 60-second timeout (excess counts as `skipped`). Common on weak devices / heavy worlds — reduce heavy vertex work and complex loops and retry |
| `pack.json needs "apiVersion": 3.` | Missing `apiVersion` or not `3`. Use numeric `3` (string `"3"` is rejected). v1/v2 packs are rejected with `shaderPack:loadWrongApiVersion` |
| `There's no pack.json at the top of the pack.` | No `pack.json` at the ZIP root. Check you didn't zip the folder itself |
| `bloxdTerrainVertex must be declared as: fn ...` | Signature mismatch. Rewrite exactly as shown |
| `bloxdTerrainVertex can't run in strict games...` | Wrap the vertex hook in `#ifndef BLOXD_STRICT` |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | Wrap in `#ifdef BLOXD_LIGHTING` (fields exist in all variants in v2, so this normally does not happen) |
| Raising `pow(l.skyLight, γ)` never deepens shadows | `skyLight` is a post-lift-curve value (raw 0.87 arrives as 0.97). Switch to R9.12 lift inversion + threshold cut (section 10) |
| `... can only be a function's parameter or return type, ...` | Uninitialized `var x: BloxdSurface;` is rejected. Build from `bloxdDefault*` |
| `bloxdPackInputs isn't part of the bloxd_ header` | The PackInputs uniform cannot be referenced from packs directly. Use it via header functions like `bloxdTime()` |
| `Packs can't declare bloxd_ names...` | Strip the `bloxd_` prefix from your identifiers. Only the 6 hook names may be defined |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` is rejected. Write `_ = f();` |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | Wrap `bloxdOpaqueBehind()` calls in terrain hooks with `#ifdef BLOXD_SCENE_DEPTH` |
| `...only surface and light hooks can use.` | Remove `bloxdOpaqueBehind()` from vertex hooks (surface / light only) |
| `Lite: …reads scene depth on a page that didn't turn it on` | Reload the page and reopen it with the depth-reading pack ([Part VIII](08-apiv2.md) §35) enabled. The depth texture's availability is fixed at page generation |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Not an error but auto-disable in strict games (`shaderPack:offInStrict`). Wrap vertex hooks and `discard` with `#ifndef BLOXD_STRICT` |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Second-stage (browser Tint) error. Parenthesise operands of `^` `&` `\|` `<<` `>>` (§38) |
| `loadDuplicateManifest` on zip load | Two `pack.json` files (including case variants). Keep one |
| 「needs the new WebGPU renderer, so remove the renderer override...」 | Remove the URL `?renderer=` and localStorage `bloxdRenderer`, then reload ([Part VII](07-internals.md) §29) |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Rewrite from `bloxdDefaultSurface(s)`. Starting from a copy of the light hook's first parameter (`var out = s;`) also works |

### Loader-stage error IDs

Errors from the settings screen carry `shaderPack:load*` IDs. As a message-lookup aid:

| ID | Meaning |
|---|---|
| `loadZipTooBig` | zip over 32MB |
| `loadTooManyZipEntries` | zip entries over 1024 |
| `loadTooManyWgsl` | `.wgsl` over 256 |
| `loadSourceTooBig` | total `.wgsl` over 256KB (streaming check per file) |
| `loadManifestTooBig` | `pack.json` over 64KB |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` is not JSON / not an object |
| `loadNoApiVersion` / `loadWrongApiVersion` | no `apiVersion` / not `3` (v1/v2 packs rejected) |
| `loadNoName` / `loadAuthorNotString` | no `name` / `author` is not a string |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | unsupported compression / zip64 / split / encrypted |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | duplicate paths / non-UTF-8 / decompression failure / zip damaged |

`loadNoManifest` / `loadDuplicateManifest` (pack.json position / duplicates) — see the matching rows in the table above.

## 18. Rights and notes

- The shader pack feature itself is an official feature loadable from the in-game UI, and creating packs is considered intended use. But no public official documentation has been confirmed
- Packs are pure WGSL — JS execution and network access are impossible by design
- This is an unofficial guide, not the developers' official position. The API may change without notice

[← Previous part](04-realism.md)·[Back to the manual](README.md)·[Next part →](06-implementation.md)

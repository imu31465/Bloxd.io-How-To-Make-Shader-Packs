[← Previous part](04-realism.md)·[Back to the manual](README.md)·[Next part →](06-implementation.md)

# Part V: Troubleshooting & notes

## 17. Common errors and fixes

| Symptom | Fix |
|---|---|
| Won't load in strict games | Wrap the vertex hook in `#ifndef BLOXD_STRICT` |
| `.alpha` reported undefined | Wrap in `#ifdef BLOXD_ALPHA` |
| `blockLight` reported undefined | Wrap in `#ifdef BLOXD_LIGHTING`. Wrap shared helper functions **as whole functions** (fields exist in all variants in v2, so this normally does not happen. Keep guards used for detection) |
| `Packs can't construct BloxdSurface directly` | Start from `bloxdDefaultSurface(s)` |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | Wrap in `#ifndef BLOXD_STRICT` |
| White hazy distance | Often double fogging. The finished color is already fogged, so keep custom haze subtle and prefer saturation-only reduction |
| Pack excluded when joining a game | Failing the in-game live compile check. Re-check guard omissions |
| `pack.json needs "apiVersion": 2.` | Missing `apiVersion` or not `2`. Use numeric `2` (string `"2"` is rejected). v1 packs are rejected with `shaderPack:loadWrongApiVersion` |
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
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Not an error but auto-disable in strict games (`shaderPack:offInStrict`). Wrap vertex hooks and `discard` with `#ifndef BLOXD_STRICT` |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Second-stage (browser Tint) error. Parenthesise operands of `^` `&` `\|` `<<` `>>` (§38) |
| `loadDuplicateManifest` on zip load | Two `pack.json` files (including case variants). Keep one |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Rewrite from `bloxdDefaultSurface(s)`. Starting from a copy of the light hook's first parameter (`var out = s;`) also works |

## 18. Rights and notes

- The shader pack feature itself is an official feature loadable from the in-game UI, and creating packs is considered intended use. But no public official documentation has been confirmed
- Packs are pure WGSL — JS execution and network access are impossible by design
- This is an unofficial guide, not the developers' official position. The API may change without notice

# API version errors

> Target API: 5 · Target build: `bny9u` (verified in production 2026-11-05) · Status: Verified (verbatim from the live i18n dictionary)

Errors around `apiVersion`. The current game accepts **only `5`**.

## "pack.json needs "apiVersion": {{version}}."

- **Symptom**: this message right after load (`loadNoApiVersion`)
- **Cause**: the `apiVersion` key is missing entirely
- **Fix**: add `"apiVersion": 5` — a **number** (the string `"5"` fails)
- **Prevention**: start from the [pack.json](../getting-started/manifest.md) template

## "This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}."

- **Symptom**: `loadWrongApiVersion`
- **Cause**: `apiVersion` exists but isn't 5 (a v1–v4 pack)
- **Fix**: apply the matching migration ([Version History](../history/)):
  - v4 → v5: [the v5 guide](../history/v5.md) — mostly mechanical (flags · `bloxdLit()` · the `bloxdFragmentBlockPosition` caveat)
  - v3 → v5: apply [v4](../history/v4.md) first
  - v2 or earlier → v5: step through v3 → v4 → v5
- **Prevention**: after any API update, check [Compatibility](../api/compatibility.md) and the matching migration guide

## The string "5" is rejected

- **Cause**: the loader compares `manifest.apiVersion !== 5` **strictly** (`===`); a JSON string `"5"` is not the number 5
- **Fix**: `"apiVersion": 5` (unquoted)

## A saved old pack silently stopped working

- **Symptom**: a previously-working v1–v4 pack is unresponsive, with no exception
- **Cause**: saved packs resolve to `{kind: "none", reason: "otherApiVersion"}` and become **silently inactive**
- **Check**: the settings-tab status line: `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`
- **Fix**: load a migrated replacement from the same screen
- **Prevention**: after API updates, re-release a bumped version and announce it ([Distribution](../getting-started/distribution.md))

## A migrated v4 pack fails validation

The three typical patterns (full steps in the [v5 migration guide](../history/v5.md)):

| Validation message | Cause | Fix |
|---|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | `#ifdef BLOXD_LIGHTING` usage | rewrite as `if (bloxdLit()) { ... } else { return bloxdDefaultLight(s, l); }` |
| `bloxdBlockFlagRock isn't part of the shader pack API...` (reserved-name diagnostic) | leftover bit-constant references | use `surface.flags.rock` etc. (1:1 table in [Flags](../api/flags.md)) |
| `bloxdFragmentBlockPosition` missing | out of the documented header since v5 (still injected and accepted — see [Functions](../api/functions.md)) | not an error to fix: it compiles; prefer `flags` / `bloxdWorldPosition()` in new code |

## Related

- [Compatibility](../api/compatibility.md) · [Version History](../history/) · [pack.json](../getting-started/manifest.md)

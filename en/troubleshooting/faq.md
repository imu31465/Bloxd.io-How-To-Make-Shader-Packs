# FAQ & legal notes

> Target API: 5 · Target build: `xkg8x` (2026-11-04, production) · Status: Verified

## Frequently asked questions

### Q. Are shader packs an official feature?

The shader-pack feature is accessible from the in-game UI and pack-making appears to be an intended activity. No public official documentation has been found, though — this guide is an unofficial, analysis-based document.

### Q. Can packs do anything dangerous?

Packs are pure WGSL — **JS execution and network access are impossible by design**. Only code that passes validation and compilation runs ([Restrictions](../api/restrictions.md)).

### Q. Which games do packs work in?

Most games run in strict mode (no vertex animation, no `discard`). Vertex animation works only in allow-listed games. The per-title list is in [Engine Internals: policy](../internals/policy.md).

### Q. Do packs work on mobile?

Only on WebGPU-capable environments ([Requirements](../getting-started/requirements.md)).

### Q. Can I ship my own textures?

Not in a shader pack (the atlas is read-only). That is the texture-pack system's job ([combinations](../guides/combinations.md)).

### Q. Can I keep using an old-version pack?

The current game accepts only `apiVersion: 5`; older packs are silently deactivated ([Compatibility](../api/compatibility.md)). Migrate via [Version History](../history/).

### Q. Will the API change again?

Engine internals may change with updates — every page names its target build. Saved packs re-validate automatically when the header or registry changes ([Compatibility](../api/compatibility.md#saved-pack-re-validation-needs-re-check)).

### Q. What about "cinematic shader" distributions?

A community "cinematic shader" distribution we analyzed turned out to be a texture pack (128×128 textures, no `pack.json` / `.wgsl`). Most "shadowy shader-like" looks are texture-side craft ([combinations](../guides/combinations.md)).

## Legal & notes

- This is an unofficial guide and does not represent the developers' views. The API may change without notice
- Created with AI assistance; accuracy is not guaranteed. Verify against actual in-game behavior
- Measured values (texture ids etc.) are snapshots of specific builds and change between builds ([names are the API](../api/texture-catalog.md#measured-drift-cnty9--ab90qa))

## Related

- [Documentation entry](../) · [Version History](../history/)

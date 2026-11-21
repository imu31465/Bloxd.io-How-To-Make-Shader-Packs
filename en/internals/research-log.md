# Research log

> Status: Analyzed

This page describes how to read the technical notes about the game's implementation. Internal behavior is not a public API contract and may change as the game is updated.

## Research principles

1. **Check observable behavior** — compare documentation with in-game validation and runtime behavior.
2. **Separate implementation from API** — distinguish features available to shader packs from mechanisms used only inside the engine.
3. **Describe how findings were obtained** — when a value or behavior is documented, identify the relevant engine operation.
4. **Do not present inference as fact** — keep observed facts, interpretations, and unresolved questions separate.
5. **Do not infer rollout time from an observation time** — a check performed during an investigation does not establish when a feature was deployed.

## Reference pages

| Page | Contents |
|---|---|
| [Engine header](engine-header.md) | Types, functions, and constants added to packs |
| [Shader validation](shader-validation.md) | Pack validation rules |
| [WGSL compilation](wgsl-compilation.md) | Compilation behavior |
| [Texture registry](texture-registry.md) | Texture-name resolution and sampling |
| [Game policies](policy.md) | Per-game restrictions |
| [Engine data ledger](engine-data.md) | API surface visible to packs |

## Limitations

- Internal functions and data structures are not guaranteed to remain available.
- Bundle layout and internal identifiers are not part of the API specification.
- Prefer documented pack APIs over dependencies on private implementation details.


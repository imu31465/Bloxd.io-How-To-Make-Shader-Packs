# How to Make Bloxd.io Shader Packs (Complete Guide)

A self-contained guide to creating and distributing shader packs for Bloxd.io (WebGPU renderer only).
Based on the spec at `apiVersion: 2`. The guide is split into one file per part (this README is the table of contents; the recipe collection lives in `03-recipes.md`). v1 packs cannot be loaded by the current game (v1 `apiVersion` values and old identifiers are rejected). For migrating from v1, see Part VIII (`08-apiv2.md`).

> This is an unofficial guide and does not represent the views of the developers. The API may change without notice.  
> This guide was created with AI assistance; accuracy is not guaranteed. Verify against actual in-game behavior.  
> Last reviewed: 2026-10-15 (fog application order, real fog settings, and underwater rendering verified against renderer implementation). Since no public official WGSL API reference could be found, keep verifying API descriptions and recipes against the loader screen and in-game compilation.  
> The shader pack feature itself is an official feature accessible from the in-game UI, and packs are pure WGSL  
> (no JS execution or networking), so nothing dangerous happens with normal code.

## Contents

- [Part I: Making packs](01-making.md)
- [Part II: API reference](02-api.md)
- [Part III: Recipe collection](03-recipes.md)
- [Part IV: Realism guide](04-realism.md)
- [Part V: Troubleshooting & notes](05-troubleshooting.md)
- [Part VI: Important implementation notes](06-implementation.md)
- [Part VII: Internals supplement](07-internals.md)
- [Part VIII: API Version 2 migration guide](08-apiv2.md)

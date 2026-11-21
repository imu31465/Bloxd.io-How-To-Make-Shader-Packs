# Overview & prerequisites

> API: 5 · Status: Verified

## What a shader pack is

A Bloxd.io shader pack changes the look of the game's **WebGPU renderer only**. Packs are written in a **restricted subset of WGSL** and loaded from the in-game settings → Shader Pack screen as a zip or folder. While a pack is installed, the WebGPU renderer is force-enabled in settings.

Pack code is validated and compiled as WGSL. WGSL pack code cannot execute JavaScript or make network requests.

## What you can change

A pack plugs into the renderer's **3-stage per-face pipeline**. The render targets split into three programs with a total of **9 hooks**:

| Target | Hooks (Vertex / Surface / Light) | What is drawn |
|---|---|---|
| **Terrain** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | All blocks except water and block models |
| **Liquid** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | Water |
| **Model** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | Block models (slabs, stairs, plants), items, players, mobs, NPCs, armour, cosmetics |

- **Can do**: change colors, transparency and emission; adjust lighting (the [Lighting API](../api/lighting.md)); sample textures with `bloxdTexel`; create per-model effects using `flags`; animate vertices (allow games only)
- **Cannot do**: add custom textures; create post-processing effects such as bloom; generate a custom shadow map or access its depth data; create true reflections (SSR); or shade the sky, clouds, or sun disc themselves
- **Shadows**: `bloxdShadow()` provides the sun/moon shadow factor calculated by the engine, and `bloxdShadowDirection()` gives the direction travelled by the shadow-casting light. `bloxdAirShadow(t)` evaluates a point between the camera and the fragment. The older voxel sky-occlusion method using `skyLight` is also available ([Shadow guide](../guides/shadows.md))

## strict and allow modes

Every game has a shader-pack policy (`shaderPackPolicy`), and **most games run in strict mode** (no vertex animation, no `discard`). Packs for general distribution must work in strict mode. See [Variants](variants.md) and the [policy reference](../internals/policy.md).

## Assumptions in this documentation

- The current game only accepts `apiVersion: 5` packs; v1–v4 packs are rejected at load (saved packs become silently inactive — [Compatibility](../api/compatibility.md))
- Migrating a pack written for an older version? See [Version History](../history/)
- Treat engine-internals explanations as reference material; consult the API reference for the supported API contract

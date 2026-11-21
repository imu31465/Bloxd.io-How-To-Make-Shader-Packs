# Overview & prerequisites

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

- **Can do**: change colors, transparency and emission; rebuild lighting ([Lighting API](../api/lighting.md)); use engine-provided sun/moon shadows (`bloxdShadow()`, `bloxdAirShadow(t)`, `bloxdShadowDirection()`); use voxel sky occlusion (`skyLight`); sample textures (`bloxdTexel`); create per-model effects (`flags`); animate vertices in allow games
- **Cannot do**: add custom textures (use the texture-pack system); post-process the finished frame (bloom, etc.); access shadow-map depth data or generate a custom shadow map; add true reflections (SSR); affect the sky, clouds, or sun disc themselves
- **Choosing a shadow method**: use `bloxdShadow()` for engine-provided shadows that follow the sun and moon. `skyLight` is an older way to darken areas under trees and roofs; it does not follow the sun or moon. See [Shadows](../guides/shadows.md).

## strict and allow modes

Every game has a shader-pack policy (`shaderPackPolicy`), and **most games run in strict mode** (no vertex animation, no `discard`). Packs for general distribution must work in strict mode. See [Variants](variants.md) and the [policy reference](../internals/policy.md).

## Assumptions in this documentation

- The current game only accepts `apiVersion: 5` packs; v1–v4 packs are rejected at load (saved packs become silently inactive — [Compatibility](../api/compatibility.md))
- Migrating a pack written for an older version? See [Version History](../history/)

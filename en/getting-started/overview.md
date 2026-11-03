# Overview & prerequisites

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Verified

## What a shader pack is

A Bloxd.io shader pack changes the look of the game's **WebGPU renderer only**. Packs are written in a **restricted subset of WGSL** and loaded from the in-game settings → Shader Pack screen as a zip or folder. While a pack is installed, the WebGPU renderer is force-enabled in settings.

Packs are validated and compiled as pure WGSL — no JavaScript execution, no networking. Nothing dangerous can happen with normal code.

## What you can change

A pack plugs into the renderer's **3-stage per-face pipeline**. The render targets split into three programs with a total of **9 hooks**:

| Target | Hooks (Vertex / Surface / Light) | What is drawn |
|---|---|---|
| **Terrain** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | All blocks except water and block models |
| **Liquid** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | Water |
| **Model** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | Block models (slabs, stairs, plants), items, players, mobs, NPCs, armour, cosmetics |

- **Can do**: change colors, transparency and emission; rebuild lighting (the [Lighting API](../api/lighting.md)); projected-style shadows (via `skyLight`); sample textures (`bloxdTexel` — reading the existing block-texture atlas); per-model effects (`flags` tell you "this is a held item", "this is a player"); vertex animation (allow games only)
- **Cannot do**: add your own textures (that is the texture-pack system's job); post-processing (bloom etc.); shadow-map shadows that rotate with the sun; true reflections (SSR); affect the sky, clouds or the sun disc itself
- **Easy to miss but powerful**: **projected-style shadows using `skyLight` (voxel sky occlusion)** — clearly darken areas under trees and roofs. Breaking blocks makes LightEngine recalculate immediately, so shadows follow in real time

## strict and allow modes

Every game has a shader-pack policy (`shaderPackPolicy`), and **most games run in strict mode** (no vertex animation, no `discard`). Packs for general distribution must work in strict mode. See [Variants](variants.md) and the [policy reference](../internals/policy.md).

## Assumptions in this documentation

- The current game only accepts `apiVersion: 5` packs; v1–v4 packs are rejected at load (saved packs become silently inactive — [Compatibility](../api/compatibility.md))
- Migrating a pack written for an older version? See [Version History](../history/)
- Engine internals may change with updates, so every page names its target build

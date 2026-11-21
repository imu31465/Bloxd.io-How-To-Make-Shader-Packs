# Guides

This section explains how shader packs work and the ideas behind them. For a quick overview of what packs can and cannot do, see [What shader packs can and cannot do](constraints.md). Goal-based code examples are collected in [Recipes](../recipes/).

## Map

| Page | Contents |
|---|---|
| [How lighting works](lighting.md) | what the engine's default lighting does, and how far you can rebuild it |
| [Shadows](shadows.md) | skyLight as a voxel shadow map; the lift inversion |
| [Making water look natural](water.md) | the integrated water recipe and the 3-layer underwater reality |
| [Designing night looks](night.md) | the "dark shadows but bright surfaces" problem |
| [Models and textures](models.md) | what the Model program draws and reads |
| [Realism: two schools](realism.md) | the additive and full-re-lighting schools |
| [What shader packs can and cannot do](constraints.md) | the capability map: reachable, unreachable, conditional, and why |
| [Performance](performance.md) | cost table and practical guidance |
| [In-game test checklist](testing.md) | the pre-release checklist |
| [Combining with texture packs](combinations.md) | pairing with texture packs |
| [Debugging tips](debugging.md) | symptom → cause diagnostics |

> Target API: 5 · Target build: `bbb6l5` (verified in production and preprod 2026-11-20)

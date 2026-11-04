# Bloxd.io Shader Pack Documentation

An unofficial guide to shader packs for the Bloxd.io WebGPU renderer — from creating, implementing, validating and distributing packs to the API specification and engine-internals research.

## Current spec

- Current API: **5** (`pack.json` must declare `apiVersion: 5`)
- Target: WebGPU renderer
- Last verified: 2026-11-04
- Target build: `xkg8x.main.641a7732.js` (production, verified 2026-11-04; preprod `2lcqcl` measured identical on every shader-pack surface — registry, header, hooks, limits)
- Shader hooks: 9 (Terrain / Liquid / Model × Vertex / Surface / Light)

New to shader packs? Start with [Getting Started](getting-started/). Looking up the API? Start with [API Reference](api/).

> This documentation is not an official resource from the game's developers. Engine internals may change with updates — check the target build and verification status noted on each page.
>
> This guide was created with AI assistance; accuracy is not guaranteed. Verify against actual in-game behavior. Keep verifying recipes against the loader screen and in-game compilation.
>
> The shader pack feature itself is an official feature accessible from the in-game UI, and packs are pure WGSL (no JS execution, no networking), so nothing dangerous happens with normal code.

## Entry points by goal

| Goal | Category | Audience |
|---|---|---|
| Make your first shader pack | [Getting Started](getting-started/) | First-time pack authors |
| Look up API functions & fields | [API Reference](api/) | Authors mid-implementation |
| Implement an effect (light, water, models…) | [Guides](guides/) · [Recipes](recipes/) | Anyone building a look |
| Fix an error | [Troubleshooting](troubleshooting/) | Anyone with a broken pack |
| Research engine internals | [Engine Internals & Research](internals/) | Engine analysts |
| Look up older versions (v1–v5) | [Version History](history/) | Migrating legacy packs |

## Documentation map

- **[Getting Started](getting-started/)** — overview, quick start, pack structure, pack.json, the 9 hooks, variants, validation, distribution. A single-track tutorial to your first pack.
- **[API Reference](api/)** — the systematic v5 specification: hooks, flags, input/output structures, all functions, lighting, texture API, constants, preprocessor, restrictions, compatibility, and the 896-name texture catalog.
- **[Guides](guides/)** — how lighting works, shadows, water, night, model rendering, performance, realism concepts.
- **[Recipes](recipes/)** — goal-oriented code examples: colors, lighting, emission, coordinates, animation, liquids, vertices, math, realism, model shaders, enchant effects.
- **[Troubleshooting](troubleshooting/)** — symptom-driven error resolution: loading, API version, compilation, validation, variants, visual, texture, lighting, model, performance.
- **[Engine Internals & Research](internals/)** — rendering pipeline, hook invocation, engine header, validation & compilation internals, reserved identifiers, lighting/fog internals, texture sampling & registry, model rendering, measured data.
- **[Version History](history/)** — v1 through v5: changes per version, migration steps, removed APIs.

## Verification status labels

Each page notes its target API version, build, last-verified date and status.

| Label | Meaning |
|---|---|
| Verified | Verified on-device / on the target build |
| Analyzed | Confirmed by analyzing the internal implementation |
| Partially Verified | Only partially confirmed |
| Experimental | Experimental / unsettled |
| Historical | Material for a past version |

Raw engine-extracted data (header, registry, measurements) lives in [Engine Internals](internals/); the methodology and logs behind it are tracked in the [research log](internals/research-log.md).

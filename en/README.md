# Bloxd.io Shader Pack Documentation

An unofficial guide to shader packs for Bloxd.io’s WebGPU renderer. It covers the full workflow—from creating and testing packs to the API reference and engine internals.

## Current spec

- Current API: **5** (`pack.json` must declare `apiVersion: 5`)
- Target: WebGPU renderer
- Shader hooks: 9 (Terrain / Liquid / Model × Vertex / Surface / Light)

New to shader packs? Start with [Getting Started](getting-started/). Looking up the API? Start with [API Reference](api/).

> This documentation is not an official resource from the game's developers. Engine internals are implementation details and may change with updates; consult the API reference for supported behavior.
>
> AI assistance was used to prepare this guide. Confirm behavior in-game, as implementation details may change.
>
> Packs are written in WGSL; they do not execute JavaScript or make network requests.

## Entry points by goal

| Goal | Category | Audience |
|---|---|---|
| Make your first shader pack | [Getting Started](getting-started/) | First-time pack authors |
| Look up API functions & fields | [API Reference](api/) | Authors mid-implementation |
| Implement an effect (light, water, models…) | [Guides](guides/) · [Recipes](recipes/) | Anyone building a look |
| Fix an error | [Troubleshooting](troubleshooting/) | Anyone with a broken pack |
| Understand engine internals | [Engine Internals](internals/) | Technical readers |
| Look up older versions (v1–v5) | [Version History](history/) | Migrating legacy packs |

## Documentation map

- **[Getting Started](getting-started/)** — overview, quick start, pack structure, pack.json, the 9 hooks, variants, validation, distribution.
- **[API Reference](api/)** — the systematic v5 specification: hooks, flags, input/output structures, all functions, lighting, texture API, constants, preprocessor, restrictions, compatibility, and the 1,017-name texture catalog.
- **[Guides](guides/)** — how lighting works, shadows, water, night, model rendering, performance, realism concepts.
- **[Recipes](recipes/)** — goal-oriented code examples: colors, lighting, emission, coordinates, animation, liquids, vertices, math, realism, model shaders, enchant effects.
- **[Troubleshooting](troubleshooting/)** — symptom-driven error resolution: loading, API version, compilation, validation, variants, visual, texture, lighting, model, performance.
- **[Engine Internals](internals/)** — rendering pipeline, hook invocation, engine header, validation & compilation internals, reserved identifiers, lighting/fog internals, texture sampling & registry, model rendering, measured data.
- **[Version History](history/)** — v1 through v5: changes per version, migration steps, removed APIs.

## Verification status labels

Each page notes the API version it covers and the status of its supporting information.

| Label | Meaning |
|---|---|
| Verified | Verified in-game |
| Analyzed | Confirmed by analyzing the internal implementation |
| Partially Verified | Only partially confirmed |
| Experimental | Experimental / unsettled |
| Historical | Material for a past version |

Engine data (headers, registries, and measurements) is documented in [Engine Internals](internals/); the methodology and supporting records are in the [research log](internals/research-log.md).

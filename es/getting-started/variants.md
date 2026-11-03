# Variants and guards

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Analyzed

## 6 variants

You write one body of code, but it must compile in all **6 variants**: `{strict, allow} × {terrain, liquid, model}`. The loader validates all six at load time.

The v4-and-earlier "lighting on/off" axis is gone (v4 had 8 variants). Lighting state is now a runtime question for [`bloxdLit()`](../api/lighting.md), not a compile-time branch.

| Variant | Example | Macros defined |
|---|---|---|
| `allow.terrain` | terrain in an allow game | `BLOXD_ALPHA` |
| `allow.liquid` | water in an allow game | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | models in an allow game | `BLOXD_ALPHA` |
| `strict.terrain` | terrain in a strict game | — |
| `strict.liquid` | water in a strict game | `BLOXD_SCENE_DEPTH` |
| `strict.model` | models in a strict game | — |

## Conditionals

Only `#define NAME` (no value) / `#ifdef` / `#ifndef` / `#else` / `#endif` are available. The `#` goes at the start of a line (inside functions is fine).

| Guard | Meaning | Typical use |
|---|---|---|
| `#ifndef BLOXD_STRICT` | non-strict (allow) variants only | wrap whole vertex hooks, wrap `discard` |
| `#ifdef BLOXD_ALPHA` | variants where `alpha` exists (all liquid + non-strict terrain/model) | wrap alpha-touching code |
| `#ifdef BLOXD_SCENE_DEPTH` | all liquid variants | wrap `bloxdOpaqueBehind()` calls |

`BLOXD_LIGHTING` was **removed in v5**. Using it fails validation with: *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## The strict-games contract

Most games are strict (no vertex animation, no `discard`). An unguarded vertex hook reports `<hook> moves terrain, which strict games prevent.` and a reachable `discard` reports `discard makes terrain see-through, which strict games prevent.` — both disable **all hooks** in that strict game. Always wrap vertex hooks in `#ifndef BLOXD_STRICT`.

For per-game policy internals, see [Engine Internals: policy](../internals/policy.md).

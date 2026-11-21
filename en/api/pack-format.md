# Pack format

The whole pack model on one page — manifest, loader limits, per-frame uniform. For the step-by-step version see [Getting Started](../getting-started/manifest.md).

## pack.json

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `apiVersion` | number | required | **must strictly equal `5`** (`===`). A string `"5"` fails and is reported with its JSON spelling |
| `name` | string | required | non-empty after trimming; shown in settings |
| `author` | string | optional | must be a string if present |
| `keepCircleShadows` | boolean | optional | **new in the `` build** — keep the old circular blob shadows under players and mobs when your pack's shaders also use the real sun-shadow API ([Shadows](../guides/shadows.md)). Default `false`; any other type is rejected with a dedicated load message |

Everything else in the manifest is ignored. `pack.json` must be exactly one JSON object at the zip root.

## Loader limits (re-measured on the live loader)

| Limit | Value | Message when exceeded |
|---|---|---|
| `.wgsl` files per pack | 256 | `The pack has more than 256 .wgsl files.` |
| total `.wgsl` source | 256 KB | `The pack's .wgsl files are over 256 KB in total.` |
| `pack.json` size | 64 KB | `pack.json is over 64 KB.` |
| zip size | 32 MB | `The zip is over 32 MB.` |
| zip entries | 1,024 | `The zip has more than 1024 entries.` |
| zip shape | — | split zip / zip64 / encrypted / unsupported compression each rejected with its own message; all files valid UTF-8; exactly one `pack.json`; no duplicate paths |

## API-version check

The loader compares `manifest.apiVersion !== 5` with JavaScript strict `!==`. The version constant `5` and the header it validates against ship together in the game's validator, so the check and the header move together. Mismatch messages: see [Compatibility](compatibility.md).

## Per-frame uniform: bloxdPackInputs

`@group(3) @binding(0) var<uniform> bloxdPackInputs: BloxdPackInputs` — **80 bytes** as of the `` build (64 before it), from the live uniform-layout module:

| Offset | Field | Type | Note |
|---|---|---|---|
| 0 | `seconds` | `f32` | backs `bloxdSeconds()` |
| 4 | `lit` | `u32` | 1 when block/sky lighting is on; backs `bloxdLit()` |
| 16 | `renderOffset` | `vec3i` | backs `bloxdRenderOffset()` |
| 32 | `sunDirection` | `vec3f` | backs `bloxdSunDirection()` |
| 48 | `eyePosition` | `vec3f` | backs `bloxdEyePosition()` |
| 64 | `shadowDirection` | `vec3f` | **new in ``** — the direction the shadow-casting light travels; backs `bloxdShadowDirection()` |

`shadowDirection` slots into the padding after `eyePosition` (a `vec3f` spans 12 bytes, so offsets 60–63 were alignment slack; `shadowDirection` lands at 64, a 16-byte boundary, keeping the struct at exactly 80 bytes). The engine writes it as three `setFloat32` writes — it is a unit vector (from the sun by day, the moon by night, and the default sky's sun when there is no sun), never above the horizon. Its arrival grew the uniform from 64 to 80 bytes and bumped the pack bind-group's `minBindingSize` to 80.

`lit` still fits into the padding v4 had between `seconds` and `renderOffset` (offsets 4–15 were alignment gaps; `vec3i` needs 16-byte alignment so `renderOffset` stays at 16).

**Never reference the uniform directly from a pack.** Use it through the header functions (`bloxdSeconds()` etc.). Stage visibility is VERTEX|FRAGMENT, so header functions work from module-scope functions and vertex hooks too.

## Bind-group layout

| binding | Contents |
|---|---|
| 0 | `bloxdPackInputs` uniform (80 B) |
| 1 | scene-depth texture (liquid variants) |
| 2 | `bloxdSpTextureLayers` storage buffer |

`minBindingSize` is 80 (it grew with the uniform). The depth texture (binding 1) is FRAGMENT-only, which is why `bloxdOpaqueBehind()` is surface/light-hook only.

## wgsl concatenation

Multiple `.wgsl` files are concatenated into one module in **dictionary order by path name**. Module-scope declarations are order-independent; only `var` initialization order can matter. Non-`.wgsl` files are ignored.

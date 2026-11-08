# Quick start

> Target API: 5 · Target build: `v98qt8` (verified in production and preprod 2026-11-08) · Status: Verified

Your first pack in five minutes.

## 1. Create the files

Make a folder with `pack.json` and `pack.wgsl`:

**`pack.json`**:

```json
{
  "apiVersion": 5,
  "name": "My First Pack",
  "author": "your name"
}
```

**`pack.wgsl`** — a minimal warm-tint pack:

```wgsl
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    return out;
}
```

> The engine header (constants, structures, functions) is prepended to every pack automatically at load — you never write it yourself. The full header is reproduced in [Engine Internals](../internals/engine-header.md).

## 2. Load it in the game

1. Open settings → Shader Pack and load the zip or folder (folder loading is desktop browsers only)
2. Check the status: right after selecting it you'll see "Ready. Reload the page to use it." — after a **page reload**, "Ready to use" means success
3. If you see "Saved, but it won't run until you fix these errors...", fix the listed errors (file:line + variant) and reload

## 3. Verify

1. Test in a permissive game first
2. Then in a strict-mode game (most games are strict)
3. Vertex animation only works in games marked allow

## 4. Distribute

Zip it up — see [Distribution](distribution.md).

## Stuck?

- What errors mean → [Troubleshooting](../troubleshooting/)
- How to write hooks → [Shader hooks](hooks.md)
- The full 9-hook template is in the next page, [Shader hooks](hooks.md)

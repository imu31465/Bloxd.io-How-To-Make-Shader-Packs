# Model shaders

> Target API: 5 · Target build: `ab90qa` (verified in production 2026-11-03) · Status: Analyzed (written against the v5 header spec)

Recipes using the v5 Model hooks and new flags for **"what am I looking at" selections that were impossible before v5**. Basics: [Models and textures](../guides/models.md).

## Held-item glow

What first-person shader authors wanted since v1, in two lines:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## Splitting the world from the hand

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;
    }
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## Glowing blade tips (localPosition)

`localPosition` rotates with the model — "where on the model am I" without world-space guesswork:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        let tipness = clamp(surface.localPosition.y * 0.5 + 0.5, 0.0, 1.0);
        out.emission += vec3f(0.3, 0.4, 0.6) * tipness * tipness * 0.6;
    }
    return out;
}
```

Note: actual `localPosition` ranges vary per model — verify on-device and `clamp` defensively.

## Highlighting dropped items

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.dropped) {
        let pulse = 0.5 + 0.5 * sin(bloxdSeconds() * 2.0
            + surface.localPosition.x * 3.0);
        out.emission += vec3f(0.08, 0.10, 0.06) * pulse;
    }
    return out;
}
```

## Cool rim on player skins (lifeform)

Most models use `textureId: 0` (skins); `surface.colour` already has skin × tint:

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.flags.lifeform) {
        let viewDir = normalize(bloxdEyePosition() - light.position);
        let rim = pow(1.0 - clamp(dot(viewDir, normalize(light.normal)), 0.0, 1.0), 2.5);
        out.colour += vec3f(0.4, 0.5, 0.7) * rim * 0.25;
    }
    return out;
}
```

## Swaying plants in the wind (allow only)

Plants (`flags.flat`) are drawn as models — sway via the vertex hook:

```wgsl
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(vertex);
    if (vertex.flags.flat) {
        let sway = sin(bloxdSeconds() * 1.8
            + bloxdWorldPosition(vertex.position).x * 0.7);
        let tipness = clamp(vertex.localPosition.y + 0.5, 0.0, 1.0);
        out.position.x += sway * 0.08 * tipness;
    }
    return out;
}
#endif
```

(Vegetation is also `flags.vegetation`: `flat` = "drawn as a crossed plane", `vegetation` = "is a plant" — grass and flowers are both.)

## Atlas-textured model faces only

Block-model faces (slabs, stairs…) carry atlas `textureId`s; select with `textureId != 0u`:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

`textureId: 0` faces (skins) sample as white — no error ([model-owned textures](../api/texture-api.md#model-owned-textures-textureid-0)).

## Armour vs the rest

`flags.lifeform` includes armour and cosmetics ([Flags](../api/flags.md)). No finer-grained input exists; combine `localPosition` (placement) or `overlayColour` presence as practical approximations.

## Sharing with terrain

Uniform grading across full blocks and block models:

```wgsl
fn applyGrade(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02, 1.0, 0.98);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}
```

The shared-function pattern is what the default pack template itself recommends ([hooks](../getting-started/hooks.md#fallbacks-and-code-sharing)).

## Related

- [Models and textures](../guides/models.md) · [Enchant effects](enchant-effects.md) · [Flags](../api/flags.md) · [Structures](../api/structures.md)

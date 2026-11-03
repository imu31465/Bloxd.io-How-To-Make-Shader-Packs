# WGSL compilation internals

> Target API: 5 · Target build: `ab90qa` · Status: Analyzed (restored from the live bundle)

The second validation stage — real compilation through the browser's WGSL compiler — and v5's validation stubs.

## Why two stages

Static validation's type-checking is incomplete, so some mistakes only surface here (e.g. WGSL operator-precedence requirements like `mixing '*' and '^' requires parenthesis`). Errors surface in-game with the variant name ([Compilation errors](../troubleshooting/compilation.md)).

## Validation-stub generation

The engine synthesizes stubs for code that passed static validation (restored from module 29866):

- the type-stub table:

| Type | Stub value |
|---|---|
| `bool` | `p.x > 0.0` |
| `f32` | `p.x` |
| `vec2f` | `p.xy` |
| `vec3f` | `p.xyz` |
| `vec4f` | `p` |
| `i32` / `vec2i` / `vec3i` / `vec4i` | `i32(p.x)` etc. |
| `u32` / `vec2u` / `vec3u` / `vec4u` | `u32(p.x)` etc. |

- structs build recursively — each field filled with stub values (nested structs recurse)
- the synthesized entry points:

```wgsl
var<private> bloxdValidationP: vec4f;

fn <special fn>(<params>) -> <returns> {
    let p = bloxdValidationP;
    return <stub value>;
}

@vertex
fn bloxdValidateVertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    let p = vec4f(f32(i));
    let o = <vertexHook>(BloxdVertexIn(<stubs>));
    return vec4f(o.position, 1.0);
}

@fragment
fn bloxdValidateFragment(@builtin(position) p: vec4f) -> @location(0) vec4f {
    bloxdValidationP = p;
    let s = <surfaceHook or bloxdDefaultSurface>(BloxdSurfaceIn(<stubs>));
    let o = <lightHook or bloxdDefaultLight>(s, BloxdLightIn(<stubs>));
    return vec4f(o.colour, 1.0);
}
```

Validation literally compiles "WGSL that calls your hooks with stub inputs" in the browser, surfacing syntax, type and language-feature violations.

## Error-message name restoration

When splicing hook calls the engine keeps an identifier mapping (`originalNames`). Identifiers in browser errors are mapped **back to your original names**, and `sourceOf(lineNum)` maps spliced line numbers back to (file, line) — you read errors against your own code, not the transformed text.

## Runtime re-validation on join

`checkCompilation` runs per game join and actually compiles every existing terrain material (stricter than the settings-screen check). Failing drops the pack for that game. The check has a 60-second forced timeout ([Performance](../troubleshooting/performance.md)).

## Related

- [Compilation errors](../troubleshooting/compilation.md) · [Shader validation](shader-validation.md) · [Getting Started: Validation](../getting-started/validation.md)

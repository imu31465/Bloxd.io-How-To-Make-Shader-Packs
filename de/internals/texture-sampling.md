# Textur-Sampling-Interna

> Ziel-API: 5 · Ziel-Build: `ab90qa` · Status: Analyzed (aus dem Live-Generator restauriert, c56)

Wie `bloxdTexel` / `bloxdTextureSize` tatsächlich kompilieren — der 3-Varianten-Textur-Codegen. Die Nutzerseite: [Textur-API](../api/texture-api.md).

## Die drei Varianten

### Variante 1 — Texturpack inaktiv (Stubs)

```wgsl
fn bloxdTextureSize(bloxdSpMipLevel: f32) -> vec2u {
        return vec2u(1u);
}
fn bloxdTexel(bloxdSpTextureId: u32, bloxdSpUv: vec2f, bloxdSpMipLevel: f32) -> vec4f {
        return vec4f(1.0);
}
```

Code, der für den echten Atlas geschrieben ist, kompiliert und läuft auch hier — er sieht nur weiße Texel und die Größe 1×1.

### Variante 2 — der Atlas-Pfad (der Spiel-Standard)

`bloxdTextureSize` liefert `textureDimensions(textureAtlas0, u32(clamp(round(bloxdSpMipLevel), 0.0, f32(textureNumLevels(textureAtlas0) - 1u))))`. `bloxdTexel` wendet die Vierteldrehung der Fläche vor dem Load an — die Rotationsfalle, geschrieben als generierte `bloxdSpTurned`-if-Kette:

```wgsl
        // Each quarter turn clockwise the face shows its texture at reads the unturned texture at (v, 1 - u)
        var bloxdSpTurned = bloxdSpUv;
        if (bloxdSpTextureRotation == 1u) {
                bloxdSpTurned = vec2f(bloxdSpUv.y, 1.0 - bloxdSpUv.x);
        } else if (bloxdSpTextureRotation == 2u) {
                bloxdSpTurned = 1.0 - bloxdSpUv;
        } else if (bloxdSpTextureRotation == 3u) {
                bloxdSpTurned = vec2f(1.0 - bloxdSpUv.y, bloxdSpUv.x);
        }
```

(`bloxdSpTextureRotation` ist die eigene Ablage der Engine für das Eingabefeld `textureRotation`.)

### Variante 3 — eigene Texturpack-Texturen

`textureLoad(<atlas>, min(bloxdSpCellAt * bloxdSpSize + bloxdSpAt, <dims> - 1u), bloxdSpLevel)` sampelt die pro-Textur-Zelle des geschichteten Atlas; die eigenen Texel des Packs gehen über den `bloxdSpOwnTexel`-Pfad.

## Die Animationsrahmen-Leiter

Animierte Texturen (42 Familien) rücken in festen pro-Familie-Intervallen (200 / 250 / 300 ms — die Intervall-Spalte im [Texturkatalog](../api/texture-catalog.md#animationsfamilien-42-namen)). Eine Animationsfamilien-id an `bloxdTexel` zu übergeben sampelt den aktuellen Rahmen.

## Sampler-Einstellungen

Die Blocktexturen sind ein `texture_2d_array`; der Terrain-Sampler ist Nearest + Repeat.

## Greedy Meshing & UV

Der Mesher verschmilzt Flächen mit gleichem Material/AO/Licht zu einzelnen Rechtecken (**Greedy Meshing**), daher können Vertex-UVs auf verschmolzenen Flächen eine Kachelbreite überschreiten (0.0015 eingerückt an Kanten). Die Hardware-Repeat-Adressierung übernimmt die Kachelung, verschmolzene Flächen wirken also nahtlos — aber an `uv` gekoppeltes prozedurales Detail kann an Verschmelzungsgrenzen Diskontinuitäten zeigen; weltabhängige Effekte stattdessen an `bloxdWorldPosition(position)` koppeln.

## Verwandte Seiten

- [Textur-API](../api/texture-api.md) · [Textur-Registry](texture-registry.md) · [Rendering-Pipeline](rendering-pipeline.md)

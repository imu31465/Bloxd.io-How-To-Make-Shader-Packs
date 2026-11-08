# Constantes

> API cible : 5 · Build cible : `v98qt8` · État : Analyzed (restauré mot à mot depuis l'en-tête en production)

L'en-tête fournit trois constantes (les constantes de noms de textures `bloxdTextureId*` sont couvertes dans [API de textures](texture-api.md)).

```wgsl
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// Blocks along each side of a chunk.
const bloxdChunkSize: i32 = 32;
```

| Constante | Type | Valeur | Description |
|---|---|---|---|
| `bloxdPi` | `f32` | 3.1415926535898 | pi |
| `bloxdTau` | `f32` | 6.2831853071796 | 2π (pratique pour les périodes) |
| `bloxdChunkSize` | `i32` | 32 | blocs le long de chaque côté d'un chunk |

## Utilisation

### bloxdPi / bloxdTau

Déclarées pour vous — inutile de définir votre propre pi. `bloxdTau` est pratique pour l'animation périodique :

```wgsl
fn sway(worldPos: vec3f, time: f32) -> f32 {
    let phase = dot(worldPos, vec3f(1.0, 0.5, 0.8));
    return sin(time * bloxdTau / 3.0 + phase);
}
```

### bloxdChunkSize

Le nombre de blocs le long de chaque côté d'un chunk, en constante nommée sur laquelle vous pouvez brancher. Utile pour les effets périodiques par chunk (damiers, accents de bordure de chunk) :

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    let p = bloxdWorldPosition(light.position);
    let chunk = floor(p / f32(bloxdChunkSize));
    let parity = (chunk.x + chunk.z) % 2.0;
    out.colour *= mix(1.0, 0.96, parity);
    return out;
}
```

Note : `bloxdChunkSize` est `i32` — convertissez avec `f32(bloxdChunkSize)` quand vous la mélangez à des flottants.

## Voir aussi

- [Fonctions](functions.md) · [Historique des versions : v3](../history/v3.md) (où `bloxdPi` / `bloxdTau` sont apparues)

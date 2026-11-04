# Liquides

> API cible : 5 · Build cible : `xkg8x` (2026-11-04, production) · État : Verified (porté à l'API actuelle — revérification sur appareil recommandée)
## Surface ridée (scintillement de couleur)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdRenderOffset().x);
    let worldZ = s.position.z + f32(bloxdRenderOffset().z);
    let ripple = sin(bloxdSeconds() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid a toujours BLOXD_ALPHA — garde par habitude
    #endif
    return out;
}
```

## Transparence pseudo par profondeur selon la hauteur (pas un vrai test de bas-fond)

> La vraie profondeur de l'eau exige le `bloxdOpaqueBehind()` réservé aux liquides, qui mesure l'épaisseur jusqu'à la face opaque derrière (la recette complète : [Rendre l'eau naturelle](../guides/water.md)). Ce qui suit est un pseudo style plus simple sans lui : `s.position.y` est une coordonnée locale, donc l'utiliser brute déplace l'effet quand l'origine du chunk change. Convertissez avec `bloxdWorldPosition()` pour la hauteur monde. Ce qui suit ne fait varier que l'alpha par hauteur monde — un effet pseudo, pas des bas-fonds sensibles au rivage ou au fond. Ajustez `packWaterReferenceY` à votre hauteur monde.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // plus fin en basse altitude, plus proche de l'alpha de base en haut ; vérifiez le sens en jeu
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

## Trouble sous-marin vu de l'intérieur

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

## Pack liquides seuls (terrain intact)

```wgsl
// n'écrivez aucun hook terrain_* du tout. Alors :
//  - variantes terrain = sans hooks = défauts moteur pour le terrain
//  - variantes liquid  = seuls les hooks liquid_* agissent
```

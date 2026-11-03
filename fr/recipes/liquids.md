# Recettes de liquides



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

## Transparence pseudo par hauteur (pas un vrai test de bas-fond)

> En v1, profondeur de scène et position du fond inconsultables : la vraie profondeur ne se calculait pas avec cette seule API. En v2, `bloxdOpaqueBehind()` mesure l'épaisseur jusqu'à la face opaque derrière, en liquides seuls ([partie VIII](../history/v2.md) R-E). Ci-dessous l'ancien pseudo-effet sans cela : `s.position.y` est une coordonnée locale et l'utiliser brute déplace l'effet avec l'origine du chunk. Il ne fait varier alpha que par hauteur monde — pseudo effet, pas une vraie représentation de bas-fond suivant le littoral ou le fond. Ajustez `packWaterReferenceY` à votre hauteur monde.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // plus fin en bas, plus proche de l'alpha de base en haut ; vérifiez le sens en jeu
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
// n'écrivez aucun hook terrain_*. Alors :
//  - variantes terrain = sans hooks = défauts moteur
//  - variantes liquid  = seuls les hooks liquid_* agissent
```

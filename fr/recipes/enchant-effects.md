# Effets d'enchantement

> API cible : 5 · Build cible : `xkg8x` (vérifié en production le 2026-11-04) · État : Analyzed (restauré depuis l'en-tête en production)

v5 a ouvert le pipeline d'enchantement, côté entrées comme côté sorties. Des recettes pour contrôler le scintillement des objets et armures enchantés tout en préservant les calculs du moteur.

## Entrées et sorties

**Entrées** (`BloxdSurfaceIn` / `BloxdLightIn` — objets et armures enchantés uniquement, tout à 0 sinon) :

```wgsl
enchantTier: u32,     // 1-5 for Tier 1-5.
enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.
```

**Sortie** (`BloxdSurface`) :

```wgsl
enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
```

Le moteur effectue ce mélange à l'intérieur de [`bloxdLitColour()`](../api/lighting.md) — juste après le shading, avant la lumière du monde. `bloxdDefaultSurface` transmet l'entrée sans modification, donc **le look par défaut correspond au comportement interne du moteur en v4**.

## Comprendre les valeurs par défaut

L'entrée `enchantColour.a` est un alpha **animé** — le moteur anime le balayage du scintillement, si bien que lire `.a` à chaque fragment donne gratuitement un motif en mouvement. `enchantTier` et `enchantSpeed` sont cohérents par construction (« faster at higher tiers »).

Les faces non enchantées portent `enchantTier == 0`, `enchantColour == vec4f(0.0)`, `enchantSpeed == 0.0`.

## Recette 1 : réalisme sans scintillement (deux lignes)

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.enchantColour = vec4f(0.0);
    return out;
}
```

## Recette 2 : scintillement plus fort par niveau

`enchantTier` donne le classique « scintillement gradué par niveau » sans analyser les couleurs :

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        let tierBoost = 1.0 + f32(surface.enchantTier) * 0.12;
        out.enchantColour.a = clamp(surface.enchantColour.a * tierBoost, 0.0, 1.0);
        out.enchantColour.rgb = surface.enchantColour.rgb;
    }
    return out;
}
```

## Recette 3 : recolorer le scintillement

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        var e = surface.enchantColour;
        e.rgb = mix(vec3f(0.35, 0.8, 1.0), vec3f(0.9, 0.5, 1.0),
                    f32(surface.enchantTier) / 5.0);   // niveaux bas bleus, hauts violets
        out.enchantColour = e;
    }
    return out;
}
```

## Recette 4 : balayage piloté par enchantSpeed

Transformez `enchantSpeed` en phase pour un balayage personnalisé :

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.enchantTier > 0u) {
        let band = 0.5 + 0.5 * sin(surface.localPosition.y * 6.0
                                   - bloxdSeconds() * surface.enchantSpeed * 2.0);
        var e = surface.enchantColour;
        e.a = clamp(e.a * (0.4 + 0.6 * band), 0.0, 1.0);
        out.enchantColour = e;
    }
    return out;
}
```

## Recette 5 : amplifier le flash de dégâts (overlayColour)

`overlayColour` (joueurs/mobs uniquement ; flash de dégâts, etc.) se mélange avant l'éclairage dans `bloxdLitColour` :

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    out.overlayColour.a = clamp(surface.overlayColour.a * 1.6, 0.0, 1.0);
    return out;
}
```

Inoffensif sur les non-entités (`overlayColour` y vaut 0).

## Combiner avec un éclairage personnalisé

Utiliser `bloxdLitColour()` garde le mélange enchantement/superposition automatique :

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## Remarques

- Les entrées d'enchantement n'arrivent **que sur les objets et armures enchantés** — tout à 0 sur le terrain, l'eau et les faces non enchantées
- Changer la sortie `enchantColour` ne touche jamais `colour` directement — le mélange se produit dans `bloxdLitColour` / `bloxdDefaultLight`
- Hors du pipeline de modèle, les entrées d'enchantement valent toujours 0

## Voir aussi

- [Éclairage](../api/lighting.md) · [Structures](../api/structures.md) · [Recettes de shaders de modèle](model-shaders.md)

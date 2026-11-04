# Éclairage

> API cible : 5 · Build cible : `xkg8x` · État : Analyzed (restauré mot à mot depuis l'en-tête en production)

v5 a rendu publique l'API d'éclairage. Ce que le moteur faisait en interne (construire `litColour`) est désormais appelable depuis les packs. Cette page couvre les entrées d'éclairage, les fonctions et l'ordre de traitement comme un système.

## Le pipeline complet

La chaîne de couleurs complète, telle que la montre l'implémentation par défaut de l'étage de lumière (`bloxdDefaultLight`) :

```
surface.colour
    │  mélange avec overlayColour (mix(colour, overlay.rgb, overlay.a))
    ▼
overlaid
    │  multiplication par bloxdShading(light) — réponse matériau et angle
    ▼
shaded
    │  mélange avec enchantColour (mix(shaded, enchant.rgb, enchant.a))
    ▼
enchanted
    │  multiplication par bloxdWorldLight(light) — lumière du monde (la plus brillante de bloc/ciel/main)
    ▼
lit = bloxdLitColour(surface, light)   ← la couleur « avant émission et brouillard »
    │  + surface.emission               ← émission ajoutée après l'éclairage
    ▼
    │  bloxdApplyFog(colour, light)      ← mix(colour, fogColour, fogAlpha)
    ▼
BloxdLight.colour (couleur finale)
```

Ordre de `bloxdLitColour()` (résumé de l'en-tête : *« mixed with overlayColour, then bloxdShading, then mixed with enchantColour, then bloxdWorldLight »*) :

1. appliquer `overlayColour`
2. ombrer avec `bloxdShading()`
3. appliquer `enchantColour`
4. appliquer la lumière du monde avec `bloxdWorldLight()`

Ordre d'émission et de brouillard : **l'émission est ajoutée après l'éclairage et avant le brouillard**, et le brouillard engloutit aussi l'émission (`bloxdDefaultLight` = `bloxdApplyFog(lit + emission, light)`).

## Fonctions

### bloxdLit() — la porte

```wgsl
fn bloxdLit() -> bool
```

Si l'éclairage de bloc et de ciel est activé. **Garanties quand c'est coupé** :

| Champ | Valeur quand c'est coupé |
|---|---|
| `blockLight` / `heldLight` | `0` |
| `skyLight` | `1` |
| `ambientLightColour` / `skyLightColour` | `1` (blanc) |

Le `#ifdef BLOXD_LIGHTING` de v4 a disparu. Remplacez-le par `if (!bloxdLit()) { return bloxdDefaultLight(...); }`.

### bloxdShading() — réponse matériau et angle

```wgsl
fn bloxdShading(light: BloxdLightIn) -> vec3f {
    let diffuse = light.directional * light.diffuse;
    return saturate(diffuse + light.emissive + light.ambient);
}
```

- multiplie `directional` (Lambert sommé) par `diffuse` (réponse RVB du matériau), ajoute `emissive` (lueur du matériau) et `ambient` (ambiant RVB), et clampe à 0–1
- **les nouvelles entrées v5 `diffuse` / `emissive`** permettent de ne remplacer que le terme de Lambert tout en gardant la réponse matériau du moteur

### bloxdWorldLight() — la lumière du monde

```wgsl
fn bloxdWorldLight(light: BloxdLightIn) -> vec3f {
    let ambientLight = light.ambientLightColour;
    let blockLight = ambientLight + light.blockLight * (1.0 - ambientLight);
    let skyLight = mix(ambientLight, light.skyLightColour, light.skyLight);
    let heldLight = ambientLight + light.heldLight * (1.0 - ambientLight);
    return max(max(blockLight, skyLight), heldLight);
}
```

- met en forme chacun des trois canaux (bloc / ciel / main) avec `ambientLightColour` comme plancher, puis prend le **plus brillant**
- `skyLight` interpole de `ambientLightColour` vers `skyLightColour` selon la quantité de lumière du ciel

### bloxdLitColour() — la recette du moteur

```wgsl
fn bloxdLitColour(surface: BloxdSurface, light: BloxdLightIn) -> vec3f {
    let overlay = surface.overlayColour;
    let overlaid = mix(surface.colour, overlay.rgb, overlay.a);
    let shaded = bloxdShading(light) * overlaid;
    let enchant = surface.enchantColour;
    let enchanted = mix(shaded, enchant.rgb, enchant.a);
    return max(enchanted * bloxdWorldLight(light), vec3f(0.0));
}
```

### bloxdApplyFog() — le brouillard

```wgsl
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(colour, light.fogColour, light.fogAlpha);
}
```

- `fogAlpha` : **0 = pas de brouillard, 1 = seulement fogColour** (inversé par rapport au `fogVisibility` de v4)
- `fogColour` est le RVB du brouillard du jeu ; **`vec3f(0.0)` quand le jeu n'a pas de brouillard**

### bloxdDefaultLight() — tout le comportement par défaut

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
}
```

## Champs d'entrée (BloxdLightIn)

| Champ | Type | Signification | Note |
|---|---|---|---|
| `litColour` | `vec3f` | RVB éclairé et enchanté (avant émission et brouillard) | une valeur de résultat, pas une source |
| `directional` | `f32` | Lambert sommé des lumières directionnelles | 0 quand il n'y a pas de lumières directionnelles |
| `diffuse` | `vec3f` | réponse RVB du matériau à la lumière directionnelle | permet à `bloxdShading()` de reconstruire la réponse matériau |
| `emissive` | `vec3f` | lueur RVB du matériau (ajoutée à la directionnelle) | |
| `ambient` | `vec3f` | ambiant RVB (ajouté à la directionnelle) | |
| `blockLight` | `vec3f` | lumière de bloc RVB | 0 quand `!bloxdLit()` |
| `skyLight` | `f32` | lumière du ciel | 1 quand `!bloxdLit()` |
| `ambientLightColour` | `vec3f` | lumière RVB minimale (plancher) | 1 quand `!bloxdLit()` |
| `skyLightColour` | `vec3f` | couleur RVB de skyLight | 1 quand `!bloxdLit()` |
| `heldLight` | `vec3f` | lumière tenue RVB | 0 quand `!bloxdLit()` ou rien de tenu |
| `fogColour` | `vec3f` | RVB du brouillard du jeu | 0 sans brouillard |
| `fogAlpha` | `f32` | 0 = pas de brouillard, 1 = seulement fogColour | inversé du `fogVisibility` de v4 |

## Physique des niveaux de lumière (contexte, facultatif)

- **`blockLight` / `skyLight` / `heldLight` arrivent déjà ramenés sur 0–1** : les niveaux 0–15 à travers une courbe d'ease-out (p. ex. `6 → 0.45`, `12 → 0.92`). Tous excluent `ambientLightColour`
- **Courbe de lift** : `skyLight` est en réalité « cette position voit-elle le ciel » — des données d'occlusion par voxel, autrement dit une shadow map. Une séparation soleil/ombre par seuil peut nécessiter la transformation inverse (voir le [guide de réalisme](../guides/realism.md))
- **Internes du brouillard** : en mode linéaire `fogAlpha = 1 - (fogEnd - dist) / (fogEnd - fogStart)` (clampé 0..1), calculé par sommet en espace de vue. Le build actuel est linéaire uniquement (détails dans [Intérieurs du moteur : intérieurs du brouillard](../internals/fog-internals.md))

## Recettes

### Ombrage personnalisé + la lumière du monde du moteur

Ce que les auteurs v4 approximaient en mettant `litColour` à l'échelle peut désormais s'écrire exactement :

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let nDotL = light.directional; // déjà le Lambert sommé
    let wrapped = nDotL * 0.5 + 0.5;
    let shaded = saturate(wrapped * light.diffuse + light.emissive + light.ambient);
    let colour = max(shaded * bloxdWorldLight(light), vec3f(0.0));
    return BloxdLight(bloxdApplyFog(colour + surface.emission, light));
}
```

### Garder la lumière du monde du moteur, ne booster que l'émission

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    let lit = bloxdLitColour(surface, light);
    return BloxdLight(bloxdApplyFog(lit + surface.emission * 2.0, light));
}
```

### Virage bleu de nuit (piloté par skyLight)

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    let night = 1.0 - light.skyLight;
    out.colour = mix(out.colour, out.colour * vec3f(0.75, 0.82, 1.15), night * 0.6);
    return out;
}
```

## Voir aussi

- [Fonctions](functions.md) · [Guides : éclairage](../guides/lighting.md) · [Intérieurs du moteur : intérieurs de l'éclairage](../internals/lighting-internals.md)

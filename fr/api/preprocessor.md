# Préprocesseur

> API cible : 5 · Build cible : `bny9u` · État : Analyzed (restauré depuis le validateur en production)

La compilation conditionnelle ne prend en charge que `#define NAME` (sans valeur) / `#ifdef` / `#ifndef` / `#else` / `#endif`. Le `#` se place en début de ligne (à l'intérieur des fonctions, c'est permis). La correspondance des noms de flags ne distingue pas la casse ; un nom erroné dans un `#ifdef` fait que le message d'erreur liste l'ensemble officiel.

## Macros définies (3)

| Macro | Définie dans | Usage typique |
|---|---|---|
| `BLOXD_STRICT` | variantes de jeu strict (strict.terrain / strict.liquid / strict.model) | `#ifndef BLOXD_STRICT` autour des hooks de vertex entiers et de `discard` |
| `BLOXD_ALPHA` | variantes où `BloxdSurface.alpha` existe — tout liquide + terrain/modèle non strict | encadrer le code qui touche à alpha |
| `BLOXD_SCENE_DEPTH` | toutes les variantes de liquide | encadrer les appels à `bloxdOpaqueBehind()` |

## Matrice macros × variantes

| Variante | `BLOXD_STRICT` | `BLOXD_ALPHA` | `BLOXD_SCENE_DEPTH` |
|---|---|---|---|
| `allow.terrain` | – | ✓ | – |
| `allow.liquid` | – | ✓ | ✓ |
| `allow.model` | – | ✓ | – |
| `strict.terrain` | ✓ | – | – |
| `strict.liquid` | ✓ | ✓ | ✓ |
| `strict.model` | ✓ | – | – |

Les différences terrain / liquide / modèle sont des **programmes séparés, pas des macros** — `#ifdef BLOXD_TERRAIN` n'existe pas.

## Macros supprimées

- **`BLOXD_LIGHTING`** — supprimée en v5. L'état de l'éclairage est une question d'exécution pour [`bloxdLit()`](lighting.md#bloxdlit--la-porte), pas une branche de compilation. L'utiliser fait échouer la validation avec :

> *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

Motif de migration v4 :

```wgsl
// v4 (échoue à la validation sur v5)
#ifdef BLOXD_LIGHTING
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight { ... }
#endif

// v5 (migré)
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    // ... traitement avec éclairage activé
}
```

## Exemple

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // le terrain n'a d'alpha qu'en allow
    out.alpha = s.alpha;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // les hooks de vertex exigent toujours cette garde
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdSeconds()) * 0.05;
    return out;
}
#endif
```

## Les macros façonnent les structures

- `BloxdSurface.alpha` n'existe qu'à l'intérieur de `#ifdef BLOXD_ALPHA`
- `bloxdOpaqueBehind()` n'est appelable qu'à l'intérieur de `#ifdef BLOXD_SCENE_DEPTH`

Voir [Structures](structures.md#champs-conditionnels--macros).

## Voir aussi

- [Premiers pas : Variantes](../getting-started/variants.md) · [Intérieurs du moteur : Validation des shaders](../internals/shader-validation.md)

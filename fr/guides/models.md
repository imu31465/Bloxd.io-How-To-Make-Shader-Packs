# Modèles et textures

> API cible : 5 · Build cible : `v98qt8` (vérifié en production 2026-11-08) · État : Analyzed (restauré depuis l'en-tête et le validateur)

Ce que dessinent et lisent les nouveaux hooks Model de la v5.

## Ce que le programme Model dessine

- **Modèles de blocs** : demi-blocs (`slab`), escaliers (`stairs`), plantes en plans croisés — herbes hautes, fleurs, cultures, toiles d'araignée (`flat`)
- **Objets** : tenus (`held`), lâchés (`dropped`), lancés (`thrown` — boules de neige, flèches, fusées)
- **Entités** : joueurs, mobs, PNJ (`lifeform`) — **armures et cosmétiques compris**

Le Terrain (blocs pleins) et les Liquides (eau) n'entrent jamais dans ce programme.

## Ce qui se lit différemment

Les faces de modèles portent trois choses que les faces de terrain n'ont jamais :

| Information | Champ | Valeur sur terrain |
|---|---|---|
| coordonnées locales au modèle | `localPosition: vec3f` | `vec3f(0.0)` (pas de modèle) |
| état d'enchantement | `enchantTier` / `enchantColour` / `enchantSpeed` | tous à 0 |
| superposition d'entité | `overlayColour` | 0 |

Et **les textures signifient autre chose** : les faces de terrain portent des `textureId` d'atlas, mais **la plupart des modèles utilisent `textureId: 0`** (« pas de texture ») — les skins de joueurs et les textures de mobs ne sont pas dans l'espace de noms de l'atlas. `surface.colour` contient déjà skin × teinte, donc partez de lui ([textures propres aux modèles](../api/texture-api.md#textures-possédées-par-le-modèle-textureid-0)).

Les `held` / `dropped` / `thrown` / `lifeform` / `placed` de `flags` n'ont de sens que sur les faces de modèles ([Flags](../api/flags.md)).

## localPosition

La position locale à l'instance de modèle, **avant** placement dans le monde ; `vec3f(0.0)` pour le terrain/les liquides.

- Pour un bras de joueur, une épée tenue ou des pales de moulin, elle tourne avec le modèle
- **L'animation et les effets de flexion indexés par partie** deviennent une écriture à un seul champ — « à quelle hauteur sur la lame suis-je » est directement `localPosition.y`
- Dans les structures de light, c'est la valeur **post-hook de vertex** (en-tête : *"the same as in BloxdVertexIn, after the vertex hook"*)

## Motifs de sélection

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;   // relève les entités du monde, exclut la main
    }
    if (surface.flags.held) {
        out.colour *= 1.15;   // éclaircit les objets tenus par le joueur local
    }
    return out;
}
```

Exemples complets : [recettes de shaders pour modèles](../recipes/model-shaders.md) et [effets d'enchantement](../recipes/enchant-effects.md).

## Aide-mémoire Terrain / Liquid / Model

| Vous voulez affecter | Hooks | Champs de sélection |
|---|---|---|
| le look des blocs pleins | `bloxdTerrain*` | flags de matériau (`opaque` / `rock`…) |
| l'eau | `bloxdLiquid*` | toujours Liquid (pas de hooks Liquid = eau intacte) |
| plantes, demi-blocs, escaliers | `bloxdModel*` | `flags.flat` / `slab` / `stairs` |
| objets tenus | `bloxdModel*` | `flags.held` |
| objets lâchés | `bloxdModel*` | `flags.dropped` |
| objets lancés | `bloxdModel*` | `flags.thrown` |
| joueurs et mobs | `bloxdModel*` | `flags.lifeform` |

## Éclairage

`bloxdModelLight` prend les mêmes `BloxdSurface` / `BloxdLightIn` et fonctionne avec `bloxdDefaultLight` / `bloxdLitColour()`. L'éclat d'enchantement (`enchantColour`) et le flash de dégâts (`overlayColour`) se mélangent dans `bloxdLitColour`, donc **les valeurs par défaut préservent automatiquement les deux looks** ; pour les contrôler, voir [effets d'enchantement](../recipes/enchant-effects.md).

## En interne

Comment les modèles sont rendus et comment circulent les entrées flags/enchantement : [Internes du moteur : rendu des modèles](../internals/model-rendering.md) ; les symboles générés comme `bloxdSpItemLocalPosition` et `bloxdSpEnchant` sont listés dans [les restrictions](../api/restrictions.md).

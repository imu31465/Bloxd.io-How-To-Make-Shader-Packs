# Problèmes de modèles

> API cible : 5 · Build cible : `bny9u` · État : Analyzed (nouveau territoire de la v5)

Problèmes autour des nouveaux hooks Model de la v5.

## Joueurs/mobs non affectés

- **Cause** : les entités (joueurs, mobs, PNJ, armures, cosmétiques) sont dessinées par le **programme Model** — les hooks terrain n'y touchent pas
- **Correction** : ajoutez des hooks Model ([le guide des modèles](../guides/models.md))

## Dalles, escaliers, plantes non affectés

- **Cause** : les modèles de blocs (`slab` / `stairs` / `flat`) sont aussi de la géométrie du programme Model, jamais du terrain
- **Correction** : utilisez des hooks Model avec `flags.slab` / `flags.stairs` / `flags.flat` ([Flags](../api/flags.md))

## L'eau non affectée

- **Cause** : l'eau ne passe que par les hooks Liquid ; **sans hooks Liquid, aucun hook Terrain ne s'exécute non plus sur l'eau** (changement de la v5)
- **Correction** : définissez `bloxdLiquidSurface` / `bloxdLiquidLight` ([Problèmes propres aux variantes](variants.md))

## Vouloir ne changer que les objets tenus mais tout change

- **Correction** : sélectionnez avec `surface.flags.held` ([recettes de shaders de modèle](../recipes/model-shaders.md))

## Les vérifications de flags se comportent mal

- **Causes probables** :
  1. **traiter les flags comme une énumération à choix unique** — ils se combinent librement («sandstone is sand and rock», «possibly even none») ([Flags](../api/flags.md#les-flags-se-combinent-librement))
  2. lire `else` comme « tout le reste » — le else de `flags.rock` est simplement « pas de roche », possiblement encore du sable
- **Correction** : combinez les flags de matériau (`opaque`…) indépendamment des flags de forme/état (`slab`/`held`…)

## Éclat d'enchantement disparu

- **Correction** : faites passer `enchantColour` ou utilisez `bloxdLitColour()` ([Effets d'enchantement](../recipes/enchant-effects.md))

## Flash de dégâts disparu / trop fort

- **Correction** : faites passer `overlayColour` ou ajustez `out.overlayColour.a` ([Effets d'enchantement](../recipes/enchant-effects.md))

## localPosition lit toujours 0

- **Comportement voulu** : `localPosition` vaut `vec3f(0.0)` sur les faces terrain et liquide — **aucun modèle là**
- **Correction** : lisez-la dans les hooks Model ([recettes de modèle](../recipes/model-shaders.md))

## bloxdTexel renvoie du blanc sur les modèles

- **Comportement voulu** : `textureId: 0` (skins) échantillonne en blanc
- **Correction** : sélectionnez avec `surface.textureId != 0u` ou travaillez depuis `surface.colour` ([Problèmes de textures](textures.md))

## Vouloir des changements limités à l'armure / aux cosmétiques

- **Limite** : aucun flag ne dit « armure » ; `flags.lifeform` inclut armure et cosmétiques
- **Approximation** : combinez avec `localPosition` (placement) ou la présence de `overlayColour` ([recettes de modèle](../recipes/model-shaders.md))

## Voir aussi

- [Guide des modèles](../guides/models.md) · [Recettes de shaders de modèle](../recipes/model-shaders.md) · [Flags](../api/flags.md)

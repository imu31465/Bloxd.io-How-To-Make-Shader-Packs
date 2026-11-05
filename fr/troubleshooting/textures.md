# Problèmes de textures

> API cible : 5 · Build cible : `bny9u` · État : Verified (messages relevés verbatim depuis le validateur en production)

Problèmes autour de `bloxdTextureId*` / `bloxdTexel`. Cherchez parmi les 896 noms dans le [catalogue de textures](../api/texture-catalog.md).

## "There's no texture called X. Did you mean bloxdTextureIdY?"

- **Cause** : une faute d'orthographe ; le validateur fait des **suggestions de Levenshtein** (seuil `max(2, floor(len/4)) + 1`)
- **Correction** : acceptez la suggestion ; recoupez avec le [catalogue](../api/texture-catalog.md)
- **Prévention** : copier-coller les noms depuis le catalogue

## "...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates."

- **Cause** : écrire un **numéro d'image** sur une texture animée (`lava0` etc.)
- **Correction** : utilisez le nom de base — l'échantillonnage renvoie automatiquement l'image courante
- **Prévention** : n'écrivez jamais de suffixes d'image pour les 43 familles d'animation ([nommage](../api/texture-api.md#règles-dorthographe-et-liberté-de-nommage))

## "...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, ..."

- **Cause** : écrire l'orthographe d'une copie tournée de la famille rotation (`[rot[N`)
- **Correction** : utilisez le nom racine — `bloxdTexel` réapplique la rotation

## "...could name X and Y, which differ only by case or underscores, so it can't be used."

- **Cause** : le repli insensible à la casse/aux tirets bas a laissé le nom **ambigu**
- **Correction** : désambiguïsez l'orthographe

## "bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?"

- **Cause** : préfixe mal orthographié (p. ex. `bloxdTextureID`, `bloxdtextureid`)
- **Correction** : commencez les noms par exactement `bloxdTextureId`

## "Case and underscores are not distinguished" — comment les deux règles coexistent-elles ?

La résolution de noms replie la casse et les `_`, donc `bloxdTextureId_grass_top` et `bloxdTextureIdGrassTop` se résolvent en la **même** constante. Ce n'est que lorsque le repli laisse plusieurs candidats que l'erreur dédiée d'ambiguïté se déclenche ([règles de nommage](../api/texture-api.md#règles-dorthographe-et-liberté-de-nommage)).

## bloxdTexel renvoie toujours du blanc sur les modèles

- **Comportement voulu** : la plupart des modèles utilisent `textureId: 0` (pas de texture — skins de joueurs etc.) ; `bloxdTexel(0, ...)` renvoie `vec4f(1.0)`
- **Correction** : sélectionnez avec `surface.textureId != 0u` ([textures possédées par le modèle](../api/texture-api.md#textures-possédées-par-le-modèle-textureid-0))

## Vouloir ajouter des textures

- **Limite** : l'API de shader pack ne fait que **lire** l'atlas ; ajouter des textures est le travail du système de texture pack ([combinaisons](../guides/combinations.md))

## "Packs can't use X: the engine binds every texture and sampler..."

- **Cause** : déclarer directement des types `texture_*` / `sampler`
- **Correction** : passez par `bloxdTexel()` ([Restrictions](../api/restrictions.md))

## Des ids bruts ont cassé après une mise à jour du jeu

- **Cause** : **les ids sont des instantanés** — mesuré, 334 des 905 noms survivants ont changé d'id entre deux builds
- **Correction** : écrivez `bloxdTextureIdLava`, pas `19` ([les noms sont l'API](../api/texture-catalog.md#dérive-mesurée-cnty9--ab90qa))

## Voir aussi

- [API de textures](../api/texture-api.md) · [Catalogue de textures](../api/texture-catalog.md) · [Internals du registre de textures](../internals/texture-registry.md)

# Intérieurs des identifiants réservés

> API cible : 5 · Build cible : `xkg8x` · État : Analyzed (restauré depuis les générateurs du bundle en production)

L'espace de noms `bloxdSp*` — des symboles que les générateurs peuvent injecter et que les packs ne peuvent donc pas redéclarer. Le résumé pour auteurs de packs : [Restrictions](../api/restrictions.md).

## Les 46 symboles

Passé de 27 en v4 à **46** (20 ajoutés, 1 retiré — `bloxdSpLitColour`, promu en la fonction publique `bloxdLitColour()`) :

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

## Nouveaux noms ↔ fonctionnalités v5

- `bloxdSpFlags` — la livraison de la struct `BloxdFlags`
- `bloxdSpEnchant` / `bloxdSpItemLocalPosition` — les nouvelles entrées (enchant, position locale au modèle)
- `bloxdSpAcross` / `bloxdSpAt` / `bloxdSpCell` / `bloxdSpCellAt` / `bloxdSpCellIndex` / `bloxdSpSize` / `bloxdSpLevel` / `bloxdSpOwnTexel` — le chemin d'échantillonnage par cellules des texture packs
- `bloxdSpQuarterTurns` — la chaîne de rotation ([Échantillonnage des textures](texture-sampling.md))
- `bloxdSpNormal` / `bloxdSpPosition` / `bloxdSpColour` / `bloxdSpOut` / `bloxdSpWord` / `bloxdSpIndex` / `bloxdSpDown` / `bloxdSpInside` — les variables locales des hooks étendus

## La règle au niveau pack

Plus large que cet espace de noms : **tout ce qui correspond à `/^bloxd/i` (insensible à la casse)**. Seuls les 9 noms de fonctions hook peuvent être déclarés ([Erreurs de validation](../troubleshooting/validation.md)).

Les identifiants préfixés par `bloxdTextureId` se résolvent en noms de textures avec leur famille d'erreurs dédiée ([Problèmes de textures](../troubleshooting/textures.md)).

## Voir aussi

- [Restrictions](../api/restrictions.md) · [Échantillonnage des textures](texture-sampling.md) · [Historique des versions : v5](../history/v5.md)

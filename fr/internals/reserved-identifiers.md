# Intérieurs des identifiants réservés

> API cible : 5 · Type : référence technique

L'espace de noms `bloxdSp*` — des symboles que les générateurs peuvent injecter et que les packs ne peuvent donc pas redéclarer. Le résumé pour les auteurs de packs : [Restrictions](../api/restrictions.md).

## Les 88 symboles


`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCasterBlocks` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellFull` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpCrossed` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEntityLight` · `bloxdSpEntityRow` · `bloxdSpExitBox` · `bloxdSpEye` · `bloxdSpFacing` · `bloxdSpFacingDot` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLit` · `bloxdSpLod` · `bloxdSpMarch` · `bloxdSpMaskBit` · `bloxdSpMaskEdge` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpNormalCode` · `bloxdSpOrigin` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpOwnTexture` · `bloxdSpPixel` · `bloxdSpPlaneTolerance` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpRayFresh` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpShadowDz` · `bloxdSpShadowEmissive` · `bloxdSpShadowEntities` · `bloxdSpShadowEntityGrids` · `bloxdSpShadowFirstPerson` · `bloxdSpShadowLight` · `bloxdSpShadowMarch` · `bloxdSpShadowMask` · `bloxdSpShadowNormal` · `bloxdSpShadowPixel` · `bloxdSpShadowPosition` · `bloxdSpShadowSpecial` · `bloxdSpShadowVolume` · `bloxdSpShadowVolumeSampler` · `bloxdSpShadowVoxels` · `bloxdSpShadowZ` · `bloxdSpSize` · `bloxdSpSunShadow` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpT` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpVolumeAt` · `bloxdSpVolumeOpenLit` · `bloxdSpVolumeOut` · `bloxdSpVolumeTexel` · `bloxdSpVolumeWork` · `bloxdSpWindowHas` · `bloxdSpWindowSlot` · `bloxdSpWord` · `bloxdSpZ`


Les 42 nouveaux symboles proviennent de l'implémentation des ombres soleil/lune du moteur, qui soutient `bloxdShadow()` / `bloxdAirShadow()` :

- `bloxdSpSunShadow` / `bloxdSpShadowVolume` / `bloxdSpShadowVolumeSampler` / `bloxdSpShadowVoxels` — le volume d'ombre solaire (une texture 3D remplie par le moteur autour du joueur) et son sampler
- `bloxdSpShadowMarch` / `bloxdSpMarch` / `bloxdSpOrigin` / `bloxdSpRayFresh` / `bloxdSpExitBox` — le ray march qui résout un rayon d'ombre (64 pas, test de fraîcheur stale-box)
- `bloxdSpShadowMask` / `bloxdSpShadowPixel` / `bloxdSpMaskBit` / `bloxdSpMaskEdge` — le chemin de texture de masque (échantillonnage sensible au bord)
- `bloxdSpEntityLight` / `bloxdSpShadowEntities` / `bloxdSpShadowEntityGrids` / `bloxdSpEntityRow` / `bloxdSpCasterBlocks` — projection d'ombres d'entités (joueurs, mobs, objets)
- `bloxdSpShadowPosition` / `bloxdSpShadowNormal` / `bloxdSpShadowEmissive` / `bloxdSpShadowFirstPerson` / `bloxdSpShadowLight` / `bloxdSpShadowDz` / `bloxdSpShadowZ` / `bloxdSpShadowSpecial` — contexte d'ombre par fragment (les exclusions emissive et première personne)
- `bloxdSpVolumeAt` / `bloxdSpVolumeOpenLit` / `bloxdSpVolumeTexel` / `bloxdSpVolumeOut` / `bloxdSpVolumeWork` — consultations de volume (le chemin de `bloxdAirShadow` : blocs seulement, flouté au bloc entier)
- `bloxdSpLit` / `bloxdSpFacing` / `bloxdSpFacingDot` / `bloxdSpT` / `bloxdSpCrossed` / `bloxdSpNormalCode` / `bloxdSpCellFull` / `bloxdSpWindowHas` / `bloxdSpWindowSlot` / `bloxdSpOwnTexture` / `bloxdSpPlaneTolerance` — locaux de support du codegen d'ombres et d'échantillonnage

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

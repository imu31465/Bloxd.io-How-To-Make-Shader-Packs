# Problèmes visuels

> API cible : 5 · État : Verified

Compile bien mais rend mal.

## Le lointain devient blanc/brumeux

- **Cause** : brouillard double. La sortie par défaut du hook de lumière est **déjà brumeuse** (`bloxdApplyFog(lit + emission, light)`), donc mélanger davantage de couleur de brouillard par-dessus la double
- **Correction** : gardez le brouillard personnalisé subtil ; envisagez la perspective aérienne par saturation seule ([recettes de réalisme](../recipes/realism.md))
- **Prévention** : comprenez la sémantique de `fogAlpha` (0 = pas de brouillard, 1 = seulement fogColour) et le [pipeline](../api/lighting.md#le-pipeline-complet) avant d'écrire du brouillard

## pow(l.skyLight, γ) n'assombrit jamais les ombres

- **Cause** : `skyLight` arrive après la courbe de lift (un 0.87 brut arrive comme 0.97) ; le gamma ne peut mathématiquement pas rivaliser
- **Correction** : passez à l'inversion du lift + seuil ([Ombres](../guides/shadows.md))

## Les blocs deviennent presque tout blancs

- **Cause** : la sortie du hook de lumière dépasse 1.0 (aucun clamp n'existe en aval de la sortie)
- **Correction** : ajoutez `clamp(col, vec3f(0.0), vec3f(1.0))`

## Blanc sans addition

- **Cause** : inversion du un-fog par division
- **Correction** : abandonnez le un-fog ; reconstruisez depuis `s.colour` et appliquez le brouillard exactement une fois à la fin (ou via `bloxdApplyFog`)

## Les blocs lumineux ne brillent pas (packs qui reconstruisent)

- **Cause** : ré-ajout d'emission manquant — abandonner la sortie par défaut signifie ajouter l'emission vous-même
- **Correction** : ajoutez `+ s.emission * (1.0 - l.fogAlpha)` ; en v5 la composition `bloxdLitColour()` + emission + `bloxdApplyFog` est la plus sûre ([Éclairage](../api/lighting.md))

## Vagues/motifs coupés aux changements de chunk ou d'origine

- **Cause** : usage direct de positions en espace de rendu — l'origine se déplace avec le joueur
- **Correction** : utilisez `bloxdWorldPosition(position)` pour les effets dépendant du monde ([Coordonnées](../recipes/coordinates.md)) ; notez les limites de précision de f32 loin de l'origine

## Motifs de surface de l'eau désalignés sur les faces tournées

- **Cause** : `bloxdTexel` applique la `textureRotation` propre du fragment à votre uv ([la subtilité de la rotation](../api/texture-api.md#la-subtilité-de-rotation--un-échantillonneur-neutre))
- **Correction** : pré-tournez avec l'assistant `texelNeutral`

## Éclat d'enchantement / flash de dégâts disparu

- **Cause** : éclairage personnalisé reconstruit sans faire passer `enchantColour` / `overlayColour`
- **Correction** : faites-les passer ou utilisez `bloxdLitColour()` ([Effets d'enchantement](../recipes/enchant-effects.md))
- **v5** : `bloxdDefaultSurface` fait passer les deux sans changement, donc les valeurs par défaut ne les perdent jamais

## Ciel, nuages ou disque solaire non affectés

- **Comportement voulu** : les hooks ne couvrent que terrain / liquide / modèle ([Looks inatteignables](../guides/constraints.md))

## Voir aussi

- [Problèmes d'éclairage](lighting.md) · [Astuces de débogage](../guides/debugging.md) · [Intérieurs du brouillard](../internals/fog-internals.md)

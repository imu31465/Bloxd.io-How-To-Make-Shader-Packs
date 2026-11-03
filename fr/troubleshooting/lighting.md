# Problèmes d'éclairage

> API cible : 5 · État : Verified

Problèmes de luminosité, d'ombres et de brouillard.

## Grottes trop claires

- **Cause** : non-linéarité insuffisante sur `skyLight`
- **Correction** : les recettes d'assombrissement des grottes dans [recettes d'éclairage](../recipes/lighting.md) et [recettes de réalisme](../recipes/realism.md)

## Faces éclairées trop claires la nuit

- **Cause** : seules les couleurs d'ombre ont été assombries — la couleur terminée garde sa luminosité diurne
- **Correction** : atténuez toute la couleur terminée la nuit et relâchez seulement la lumière locale (`blockLight` / `heldLight`) — [le guide de nuit](../guides/night.md)

## Nuit trop sombre

- **Correction** : garantissez un ambiant minimum ; avec un `bloxdSunDirection()` nul, la vraie direction de la lune est inconnue, donc utilisez un ambiant bleu pseudo ([la recette de nuit](../recipes/lighting.md)). La direction de la lune elle-même est `-bloxdSunDirection()` (mondes avec cycle jour-nuit uniquement)

## Jours cramés

- **Correction** : baissez l'exposition avant ACES ([ACES](../recipes/realism.md))

## Alentours des torches saturés d'orange

- **Correction** : baissez la proportion de mélange chaud ([torche chaude × ciel froid](../recipes/realism.md))

## Vouloir conserver exactement la lumière de monde du moteur

- **Solution v5** : appelez `bloxdWorldLight(light)` — des maths identiques à celles du moteur, « la plus brillante de bloc/ciel/objet tenu, avec un plancher à ambientLightColour » ([Éclairage](../api/lighting.md#bloxdworldlight--la-lumière-du-monde))
- **Note** : `blockLight` / `heldLight` valent 0 et les champs liés au ciel valent 1 quand `!bloxdLit()` (garantie de l'en-tête)

## Rendu incorrect dans les jeux sans éclairage

- **Cause** : entrées propres à l'éclairage (`blockLight` etc.) utilisées sans garde. La v5 n'a pas de `#ifdef BLOXD_LIGHTING` — branchez sur **`bloxdLit()` à l'exécution**
- **Correction** : retour anticipé `if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }` ([Éclairage](../api/lighting.md#bloxdlit--la-porte))

## "LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk"

- **Cause** : les régions denses de blocs lumineux font déborder la file de graines de lumière et le calcul de lumière du chunk est écourté. **Non causé par le pack**, mais les trous de lumière près des clusters lumineux remontent à cela
- **Correction** : espacez les sources de lumière dans le monde

## Vous voulez la théorie ?

- Ombres : [Ombres](../guides/shadows.md) (skyLight = carte d'ombres par voxels)
- Brouillard : [Engine Internals : Intérieurs du brouillard](../internals/fog-internals.md)

## Voir aussi

- [Éclairage](../api/lighting.md) · [Problèmes visuels](visual.md) · [Internals d'éclairage](../internals/lighting-internals.md)

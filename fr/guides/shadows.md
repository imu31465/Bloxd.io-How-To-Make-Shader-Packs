# Ombres

> API cible : 5 · Build cible : `xkg8x` · État : Verified (comportement du LightEngine inchangé depuis la mesure en v4)

Les trois façons de faire des « ombres » dans un pack de shaders, et leurs limites.

## Possible / impossible

| Effet | Possible ? | Comment |
|---|---|---|
| Assombrir nettement sous les arbres/toits (style projeté) | ◎ | inversion du lift de `skyLight` + coupe par seuil (ci-dessous) |
| Les ombres suivent les éditions de blocs en temps réel | ◎ | le LightEngine recalcule immédiatement — automatique |
| Ombres teintées froid / zones ensoleillées chaud | ◎ | décalage bicolore |
| Ombres tournant avec le soleil (shadow map) | ✕ | la profondeur est en liquides seuls ; l'occlusion des rayons lumineux n'est pas une entrée |
| Pénombre physique | ✕ | plafonnée par la dispersion BFS à résolution voxel |
| AO en temps réel (SSAO) | ✕ | seule l'AO cuite dans les couleurs de sommets |

## skyLight est une carte d'ombres par voxel

`l.skyLight` n'est pas qu'un paramètre de luminosité. Le LightEngine du mesher calcule à la façon Minecraft des **données d'occlusion voxel « cette position voit-elle le ciel » — une carte d'ombres** :

1. **Balayage de colonnes** : chaque colonne (x,z) de haut en bas ; la lumière du ciel part de 15, tombe à 0 aux blocs opaques, s'atténue par `lightFilter` (air 1 / eau 3 / opaque 15)
2. **Remplissage BFS** : s'étend horizontalement vers 6 voisins (-1 par bloc) — ceci adoucit les bords d'ombre. Sous une occlusion de rayon r, la valeur brute est (15-r)/15
3. blockLight (torches) est un BFS séparé à 3 canaux RGB (empaqueté 4 bits)

Sous les arbres, sous les toits et à l'intérieur des bâtiments, la valeur est déjà basse et s'interpole en douceur par sommet. Poser ou casser un bloc recalcule immédiatement — **des ombres qui suivent en temps réel**.

## Le piège de la courbe de lift

`l.skyLight` arrive **après la courbe de lift** (`y = 1-(1-x/(3-2x))³`, une courbe en S qui relève les valeurs sombres) :

| Endroit | Voxel brut | Lifté (= l.skyLight) | pow(·, 5.0) |
|---|---|---|---|
| ciel ouvert | 1.00 | 1.00 | 1.00 |
| sous un arbre (rayon 2) | 0.87 | **0.97** | **0.86** ← quasi conservée |
| rayon 3 | 0.80 | **0.92** | 0.66 |
| rayon 5 | 0.67 | 0.78 | 0.29 |

**C'est la cause racine démontrée de « le gamma n'assombrit pas les ombres »** — même γ=5 ne fait descendre le 0.97 sous arbre qu'à 0.86.

## Le correctif : inversion du lift + coupe par seuil

La courbe est monotone et s'inverse exactement : `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Restaurez la valeur brute, puis binarisez avec un **seuil `smoothstep`**. La dispersion BFS du LightEngine est à « -1 par bloc adjacent », donc `th = 1 - r/15` est directement la manette du « rayon d'occlusion compté comme ombre ».

L'implémentation complète (porte solaire + séparation chaud/froid + passage du blockLight) est dans [les recettes réalisme](../recipes/realism.md). Étapes clés :

```wgsl
// 1. restaurer la valeur brute (sauter cette étape et les ombres n'apparaissent jamais)
let skyRaw = sh_unlift(l.skyLight);
// 2. coupe par seuil — ensoleillé 1 / ombre 0
let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
// l'essence de la projection : le soleil direct n'atteint que les endroits qui voient le ciel
let lit = sunL * sky;
```

Manettes : **étendue** = `shTh` (0.93→rayon 1.5 / 0.87→2 / 0.80→3 / 0.67→5) ; **douceur des bords** = `shSoft` ; **obscurité du cœur** = l'ambiant minimum et le décalage à deux points de la diffusion du ciel ; ombres longues du soir ≈ `thEff = shTh + 0.10 * (1 - clamp(sunDir.y, 0.0, 1.0))`.

## Limites honnêtes

- Les ombres se réfèrent au **ciel vers le haut**, donc elles **ne tournent pas avec le soleil** (résolution voxel ; les bords doux viennent de la dispersion BFS)
- Le gabarit d'éclairage du moteur conserve un `var shadow: f32 = 1.;` inutilisé (toujours 1.0 = désactivé) — une trace plausible de « plans futurs » pour des ombres rotatives précises au pixel
- Les ombres rotatives précises au pixel sont hors de portée de l'API actuelle ([Effets inatteignables](constraints.md))

## Voir aussi

- [recettes réalisme](../recipes/realism.md) (la recette complète des ombres projetées) · [Internes de l'éclairage](../internals/lighting-internals.md) · [Astuces de débogage](debugging.md)

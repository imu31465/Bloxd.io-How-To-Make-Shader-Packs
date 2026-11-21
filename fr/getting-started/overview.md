# Vue d'ensemble et prérequis

> API : 5 · État : Verified

## Ce qu'est un pack de shaders

Un pack de shaders Bloxd.io change l'apparence du jeu **pour le seul renderer WebGPU**. Les packs s'écrivent dans un **sous-ensemble restreint de WGSL** et se chargent depuis l'écran Réglages → Shader Pack du jeu, sous forme de zip ou de dossier. Tant qu'un pack est installé, le renderer WebGPU est activé de force dans les réglages.

Le code du pack est validé et compilé en WGSL. Le WGSL d'un pack ne peut ni exécuter de JavaScript ni effectuer de requêtes réseau.

## Ce que vous pouvez changer

Un pack s’intègre au **pipeline de rendu de chaque face, composé de trois étapes**. Les cibles de rendu sont réparties entre trois programmes qui totalisent **9 hooks** :

| Cible | Hooks (Vertex / Surface / Light) | Ce qui est dessiné |
|---|---|---|
| **Terrain** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | Tous les blocs sauf l'eau et les modèles de blocs |
| **Liquid** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | L'eau |
| **Model** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | Modèles de blocs (dalles, escaliers, plantes), objets, joueurs, mobs, PNJ, armures, cosmétiques |

- **Possible** : modifier les couleurs, la transparence et l’émission ; ajuster l’éclairage (voir l’[API d’éclairage](../api/lighting.md)) ; échantillonner les textures avec `bloxdTexel` ; créer des effets par modèle avec `flags` ; animer les sommets (uniquement dans les jeux en mode allow)
- **Impossible** : ajouter des textures personnalisées ; créer des effets de post-traitement comme le bloom ; générer une carte d’ombre personnalisée ou accéder à ses données de profondeur ; créer de véritables reflets (SSR) ; ou appliquer des shaders au ciel, aux nuages et au disque solaire lui-même
- **Ombres** : `bloxdShadow()` fournit le facteur d’ombre solaire/lunaire calculé par le moteur, et `bloxdShadowDirection()` indique la direction de déplacement de la lumière qui projette l’ombre. `bloxdAirShadow(t)` évalue un point entre la caméra et le fragment. L’ancienne méthode d’occlusion voxel du ciel avec `skyLight` reste également disponible ([Guide des ombres](../guides/shadows.md))

## Modes strict et allow

Chaque jeu possède une politique de packs de shaders (`shaderPackPolicy`), et **la plupart des jeux fonctionnent en mode strict** (pas d'animation de sommets, pas de `discard`). Les packs destinés à la distribution générale doivent fonctionner en mode strict. Voir [Variantes](variants.md) et la [référence de politique](../internals/policy.md).

## Hypothèses de cette documentation

- Le jeu actuel n'accepte que les packs `apiVersion: 5` ; les packs v1–v4 sont rejetés au chargement (les packs enregistrés deviennent silencieusement inactifs — [Compatibilité](../api/compatibility.md))
- Vous migrez un pack écrit pour une ancienne version ? Voir l'[Historique des versions](../history/)
- Les explications sur les mécanismes internes du moteur sont des informations de référence ; consultez la référence de l’API pour connaître les fonctionnalités prises en charge

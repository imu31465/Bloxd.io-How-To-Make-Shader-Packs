# Vue d'ensemble et prérequis

## Ce qu'est un pack de shaders

Un pack de shaders Bloxd.io change l'apparence du jeu **pour le seul renderer WebGPU**. Les packs s'écrivent dans un **sous-ensemble restreint de WGSL** et se chargent depuis l'écran Réglages → Shader Pack du jeu, sous forme de zip ou de dossier. Tant qu'un pack est installé, le renderer WebGPU est activé de force dans les réglages.

Le code du pack est validé et compilé en WGSL. Le WGSL d'un pack ne peut ni exécuter de JavaScript ni effectuer de requêtes réseau.

## Ce que vous pouvez changer

Un pack se branche sur le **pipeline en 3 étapes par face** du renderer. Les cibles de rendu se répartissent en trois programmes comptant **9 hooks** au total :

| Cible | Hooks (Vertex / Surface / Light) | Ce qui est dessiné |
|---|---|---|
| **Terrain** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | Tous les blocs sauf l'eau et les modèles de blocs |
| **Liquid** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | L'eau |
| **Model** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | Modèles de blocs (dalles, escaliers, plantes), objets, joueurs, mobs, PNJ, armures, cosmétiques |

- **Possible** : modifier les couleurs, la transparence et l'émission ; reconstruire l'éclairage ([API d'éclairage](../api/lighting.md)) ; utiliser les ombres du soleil et de la lune calculées par le moteur (`bloxdShadow()`, `bloxdAirShadow(t)`, `bloxdShadowDirection()`) ; utiliser l'occlusion voxel du ciel (`skyLight`) ; échantillonner les textures avec `bloxdTexel` ; créer des effets par modèle avec `flags` ; animer les sommets dans les jeux allow
- **Impossible** : ajouter des textures personnalisées (c'est le rôle du système de packs de textures) ; appliquer un post-traitement à l'image finale (bloom, etc.) ; accéder aux données de profondeur de la shadow map ou générer sa propre shadow map ; ajouter de véritables reflets (SSR) ; modifier le ciel, les nuages ou le disque solaire lui-même
- **Choisir une méthode d'ombre** : utilisez `bloxdShadow()` pour les ombres du moteur qui suivent le soleil et la lune. `skyLight` est une ancienne méthode pour assombrir les zones sous les arbres et les toits ; elle ne suit pas le soleil ni la lune. Voir [Ombres](../guides/shadows.md).

## Modes strict et allow

Chaque jeu possède une politique de packs de shaders (`shaderPackPolicy`), et **la plupart des jeux tournent en mode strict** (pas d'animation de sommets, pas de `discard`). Les packs destinés à la distribution générale doivent fonctionner en mode strict. Voir [Variantes](variants.md) et la [référence de politique](../internals/policy.md).

## Hypothèses de cette documentation

- Le jeu actuel n'accepte que les packs `apiVersion: 5` ; les packs v1–v4 sont rejetés au chargement (les packs enregistrés deviennent silencieusement inactifs — [Compatibilité](../api/compatibility.md))
- Vous migrez un pack écrit pour une ancienne version ? Voir l'[Historique des versions](../history/)

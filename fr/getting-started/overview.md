# Vue d'ensemble et prérequis

> API cible : 5 · Build cible : `v98qt8` (vérifié en production le 2026-11-08) · État : Verified

## Ce qu'est un pack de shaders

Un pack de shaders Bloxd.io change l'apparence du jeu **pour le seul renderer WebGPU**. Les packs s'écrivent dans un **sous-ensemble restreint de WGSL** et se chargent depuis l'écran Réglages → Shader Pack du jeu, sous forme de zip ou de dossier. Tant qu'un pack est installé, le renderer WebGPU est activé de force dans les réglages.

Les packs sont validés et compilés en WGSL pur — pas d'exécution de JavaScript, pas de réseau. Rien de dangereux ne peut arriver avec du code normal.

## Ce que vous pouvez changer

Un pack se branche sur le **pipeline en 3 étapes par face** du renderer. Les cibles de rendu se répartissent en trois programmes comptant **9 hooks** au total :

| Cible | Hooks (Vertex / Surface / Light) | Ce qui est dessiné |
|---|---|---|
| **Terrain** | `bloxdTerrainVertex` · `bloxdTerrainSurface` · `bloxdTerrainLight` | Tous les blocs sauf l'eau et les modèles de blocs |
| **Liquid** | `bloxdLiquidVertex` · `bloxdLiquidSurface` · `bloxdLiquidLight` | L'eau |
| **Model** | `bloxdModelVertex` · `bloxdModelSurface` · `bloxdModelLight` | Modèles de blocs (dalles, escaliers, plantes), objets, joueurs, mobs, PNJ, armures, cosmétiques |

- **Possible** : changer les couleurs, la transparence et l'émission ; reconstruire l'éclairage (l'[API d'éclairage](../api/lighting.md)) ; les ombres de style projection (via `skyLight`) ; échantillonner des textures (`bloxdTexel` — lire l'atlas de textures de blocs existant) ; les effets par modèle (`flags` vous dit « c'est un objet tenu », « c'est un joueur ») ; l'animation de sommets (jeux allow uniquement)
- **Impossible** : ajouter vos propres textures (c'est le travail du système de packs de textures) ; le post-traitement (bloom etc.) ; les ombres par shadow map qui tournent avec le soleil ; les vrais reflets (SSR) ; agir sur le ciel, les nuages ou le disque solaire lui-même
- **Facile à manquer mais puissant** : **les ombres de style projection via `skyLight` (occlusion voxel du ciel)** — assombrissent nettement les zones sous les arbres et les toits. Casser des blocs fait recalculer LightEngine immédiatement, de sorte que les ombres suivent en temps réel

## Modes strict et allow

Chaque jeu possède une politique de packs de shaders (`shaderPackPolicy`), et **la plupart des jeux tournent en mode strict** (pas d'animation de sommets, pas de `discard`). Les packs destinés à la distribution générale doivent fonctionner en mode strict. Voir [Variantes](variants.md) et la [référence de politique](../internals/policy.md).

## Hypothèses de cette documentation

- Le jeu actuel n'accepte que les packs `apiVersion: 5` ; les packs v1–v4 sont rejetés au chargement (les packs enregistrés deviennent silencieusement inactifs — [Compatibilité](../api/compatibility.md))
- Vous migrez un pack écrit pour une ancienne version ? Voir l'[Historique des versions](../history/)
- Les internals du moteur peuvent changer avec les mises à jour ; chaque page indique donc son build cible

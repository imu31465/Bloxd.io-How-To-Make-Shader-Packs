# Documentation des shader packs de Bloxd.io

Un guide non officiel sur les shader packs du renderer WebGPU de Bloxd.io — de la création, l'implémentation, la validation et la distribution jusqu'à la spécification de l'API et la recherche sur les intérieurs du moteur.

## Spécification actuelle

- API actuelle : **5** (`pack.json` doit déclarer `apiVersion: 5`)
- Cible : renderer WebGPU
- Dernière vérification : 2026-11-03
- Build cible : `ab90qa.main.6188124c.js` (production et preprod exécutent le bundle identique — vérifié par md5 `fc3322212d15be2445c0e8dfc9733fcc`)
- Hooks de shader : 9 (Terrain / Liquid / Model × Vertex / Surface / Light)

Nouveau avec les shader packs ? Commencez par [Premiers pas](getting-started/). Cherchez-vous une fonction de l'API ? Voir la [Référence API](api/).

> Cette documentation n'est pas une ressource officielle des développeurs du jeu. Les intérieurs du moteur peuvent changer avec les mises à jour — vérifiez le build cible et le statut de vérification indiqués sur chaque page.
>
> Ce guide a été créé avec l'assistance d'une IA ; l'exactitude n'est pas garantie. Vérifiez par rapport au comportement réel en jeu. Continuez à vérifier les recettes face à l'écran du chargeur et à la compilation en jeu.
>
> La fonctionnalité shader pack elle-même est une fonctionnalité officielle accessible depuis l'interface du jeu, et les packs sont du WGSL pur (pas d'exécution JS, pas de réseau), donc rien de dangereux ne se produit avec du code normal.

## Entrées par objectif

| Objectif | Catégorie | Public |
|---|---|---|
| Créer son premier shader pack | [Premiers pas](getting-started/) | auteurs de packs débutants |
| Chercher fonctions et champs de l'API | [Référence API](api/) | auteurs en pleine implémentation |
| Réaliser un effet (lumière, eau, modèles…) | [Guides](guides/) · [Recettes](recipes/) | toute personne construisant un rendu |
| Corriger une erreur | [Dépannage](troubleshooting/) | toute personne avec un pack cassé |
| Explorer les intérieurs du moteur | [Intérieurs du moteur et recherche](internals/) | analystes du moteur |
| Consulter les anciennes versions (v1–v5) | [Historique des versions](history/) | migrations d'anciens packs |

## Carte de la documentation

- **[Premiers pas](getting-started/)** — vue d'ensemble, démarrage rapide, structure du pack, pack.json, les 9 hooks, variantes, validation, distribution. Un tutoriel en voie unique jusqu'à votre premier pack.
- **[Référence API](api/)** — la spécification systématique de la v5 : hooks, flags, structures d'entrée/sortie, toutes les fonctions, éclairage, API de textures, constantes, préprocesseur, restrictions, compatibilité, et le catalogue de 896 noms de textures.
- **[Guides](guides/)** — comment fonctionne l'éclairage, les ombres, l'eau, la nuit, le rendu des modèles, les performances, les concepts de réalisme.
- **[Recettes](recipes/)** — exemples de code orientés objectif : couleurs, éclairage, émission, coordonnées, animation, liquides, sommets, maths, réalisme, shaders de modèle, effets d'enchantement.
- **[Dépannage](troubleshooting/)** — résolution d'erreurs par symptôme : chargement, version d'API, compilation, validation, variantes, visuel, textures, éclairage, modèles, performances.
- **[Intérieurs du moteur et recherche](internals/)** — pipeline de rendu, invocation des hooks, en-tête du moteur, intérieurs de validation et de compilation, identifiants réservés, intérieurs d'éclairage/brouillard, échantillonnage et registre des textures, rendu des modèles, données mesurées.
- **[Historique des versions](history/)** — de v1 à v5 : changements par version, étapes de migration, API retirées.

## Libellés de statut de vérification

Chaque page indique sa version d'API cible, son build, sa date de dernière vérification et son statut.

| Libellé | Signification |
|---|---|
| Verified | vérifié sur appareil / sur le build cible |
| Analyzed | confirmé en analysant l'implémentation interne |
| Partially Verified | confirmé seulement partiellement |
| Experimental | expérimental / non consolidé |
| Historical | matériel d'une version passée |

Les données brutes extraites du moteur (en-tête, registre, mesures) vivent dans les [Intérieurs du moteur](internals/) ; la méthodologie et les journaux qui les sous-tendent se suivent dans le [journal de recherche](internals/research-log.md).

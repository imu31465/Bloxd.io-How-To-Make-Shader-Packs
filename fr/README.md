# Documentation des shader packs de Bloxd.io

Guide non officiel consacré aux shader packs du moteur de rendu WebGPU de Bloxd.io. Il couvre toutes les étapes, de la création et des tests à la référence de l’API et à l’analyse du fonctionnement interne du moteur.

## Spécification actuelle

- API actuelle : **5** (`pack.json` doit déclarer `apiVersion: 5`)
- Cible : renderer WebGPU
- Hooks de shader : 9 (Terrain / Liquid / Model × Vertex / Surface / Light)

Vous débutez avec les shader packs ? Commencez par [Premiers pas](getting-started/). Vous cherchez une fonction ou un champ ? Consultez la [Référence de l’API](api/).

> Cette documentation n’est pas une ressource officielle des développeurs du jeu. Les détails internes du moteur peuvent changer avec les mises à jour ; consultez la référence de l’API pour connaître les fonctionnalités prises en charge.
>
> Ce guide a été préparé avec l’aide de l’IA. Vérifiez le comportement en jeu, car les détails d’implémentation peuvent évoluer.
>
> Les packs sont écrits uniquement en WGSL : ils n'exécutent pas de JavaScript et n'effectuent aucune requête réseau.

## Entrées par objectif

| Objectif | Catégorie | Public |
|---|---|---|
| Créer son premier shader pack | [Premiers pas](getting-started/) | auteurs de packs débutants |
| Chercher fonctions et champs de l'API | [Référence API](api/) | auteurs en pleine implémentation |
| Réaliser un effet (lumière, eau, modèles…) | [Guides](guides/) · [Recettes](recipes/) | toute personne construisant un rendu |
| Corriger une erreur | [Dépannage](troubleshooting/) | toute personne avec un pack cassé |
| Comprendre le fonctionnement interne du moteur | [Fonctionnement interne du moteur](internals/) | lecteurs techniques |
| Consulter les anciennes versions (v1–v5) | [Historique des versions](history/) | migrations d'anciens packs |

## Carte de la documentation

- **[Premiers pas](getting-started/)** — vue d'ensemble, démarrage rapide, structure du pack, pack.json, les 9 hooks, variantes, validation, distribution.
- **[Référence de l’API](api/)** — la spécification systématique de la v5 : hooks, flags, structures d'entrée/sortie, toutes les fonctions, éclairage, API de textures, constantes, préprocesseur, restrictions, compatibilité, et le catalogue de 1 017 identifiants de texture.
- **[Guides](guides/)** — comment fonctionne l'éclairage, les ombres, l'eau, la nuit, le rendu des modèles, les performances, les concepts de réalisme.
- **[Recettes](recipes/)** — exemples de code orientés objectif : couleurs, éclairage, émission, coordonnées, animation, liquides, sommets, maths, réalisme, shaders de modèle, effets d'enchantement.
- **[Dépannage](troubleshooting/)** — résolution d'erreurs par symptôme : chargement, version d'API, compilation, validation, variantes, visuel, textures, éclairage, modèles, performances.
- **[Fonctionnement interne du moteur](internals/)** — pipeline de rendu, invocation des hooks, en-tête du moteur, mécanismes internes du validateur et du compilateur, identifiants réservés, mécanismes internes d’éclairage et de brouillard, échantillonnage et registre des textures, rendu des modèles, données mesurées.
- **[Historique des versions](history/)** — de v1 à v5 : changements par version, étapes de migration, API retirées.

## Libellés de statut de vérification

Chaque page indique la version de l’API qu’elle couvre et l’état de vérification de son contenu.

| Libellé | Signification |
|---|---|
| Verified | vérifié dans le jeu |
| Analyzed | confirmé en analysant l'implémentation interne |
| Partially Verified | confirmé seulement partiellement |
| Experimental | expérimental / non consolidé |
| Historical | matériel d'une version passée |

Les données extraites du moteur (en-tête, registre et mesures) sont présentées dans [Fonctionnement interne du moteur](internals/) ; la méthode et les relevés correspondants figurent dans le [journal de recherche](internals/research-log.md).

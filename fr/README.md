# Documentation des shader packs Bloxd.io

Un guide non officiel sur les shader packs du renderer WebGPU de Bloxd.io — de la création, l'implémentation, la validation et la distribution jusqu'à la spécification de l'API et la recherche sur les entrailles du moteur.

## Spécification actuelle

- API actuelle : **5** (`pack.json` doit déclarer `apiVersion: 5`)
- Cible : renderer WebGPU
- Dernière vérification : 2026-11-03
- Build cible : `ab90qa.main.6188124c.js` (production et preprod identiques — vérifié par md5 `fc3322212d15be2445c0e8dfc9733fcc`)
- Hooks de shader : 9 (Terrain / Liquid / Model × Vertex / Surface / Light)

Nouveau avec les shader packs ? Commencez par [Getting Started](getting-started/) (en anglais). Référence API ? Voir [API Reference](api/) (en anglais).

> Cette documentation n'est pas une ressource officielle des développeurs. Les entrailles du moteur peuvent changer avec les mises à jour — vérifiez le build cible et le statut de vérification indiqués sur chaque page.
>
> Ce guide a été créé avec l'assistance d'une IA ; l'exactitude n'est pas garantie. Vérifiez par rapport au comportement réel en jeu.
>
> La fonctionnalité shader pack est une fonctionnalité officielle accessible depuis l'UI du jeu, et les packs sont du WGSL pur (pas d'exécution JS, pas de réseau) — rien de dangereux avec du code normal.

## Entrées par objectif

| Objectif | Catégorie | Public |
|---|---|---|
| Créer son premier pack | [Getting Started](getting-started/) | débutants |
| Chercher fonctions et champs de l'API | [API Reference](api/) | auteurs en pleine implémentation |
| Réaliser un effet (lumière, eau, modèles…) | [Guides & Recipes](guides/) | toute personne construisant un rendu |
| Corriger une erreur | [Troubleshooting](troubleshooting/) | toute personne avec un pack cassé |
| Explorer les entrailles du moteur | [Engine Internals & Research](internals/) | analystes du moteur |
| Consulter les anciennes versions (v1–v5) | [Version History](history/) | migrations d'anciens packs |

## Structure de la documentation

- **[Getting Started](getting-started/)** — vue d'ensemble, démarrage rapide, structure du pack, pack.json, les 9 hooks, variantes, validation, distribution.
- **[API Reference](api/)** — la spécification systématique de la v5 : hooks, flags, structures d'entrée/sortie, toutes les fonctions, éclairage, API de textures, constantes, préprocesseur, restrictions, compatibilité et le catalogue de 896 noms.
- **[Guides](guides/)** · **[Recipes](recipes/)** · **[Troubleshooting](troubleshooting/)** · **[Engine Internals & Research](internals/)** · **[Version History](history/)**

> Remarque : Getting Started / API Reference / Troubleshooting et les nouvelles pages v5 de Guides, Recipes et Internals sont actuellement proposés **en anglais** (même structure que les pages traduites de cette édition). Le contenu déjà traduit est intégralement conservé.

## Statuts de vérification

| Étiquette | Signification |
|---|---|
| Verified | vérifié sur le build cible |
| Analyzed | confirmé par analyse de l'implémentation interne |
| Partially Verified | confirmé partiellement seulement |
| Experimental | expérimental / non consolidé |
| Historical | document d'une version passée |

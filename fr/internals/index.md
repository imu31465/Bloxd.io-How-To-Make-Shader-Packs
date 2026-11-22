# Fonctionnement interne du moteur

Cette catégorie décrit le fonctionnement du moteur afin de mieux comprendre comment les shader packs sont exécutés. Ces détails d'implémentation peuvent évoluer ; pour les règles d'utilisation stables et les API disponibles, consultez la [Référence de l'API](../api/).

## Contenu

| Page | Contenu |
|---|---|
| [Pipeline de rendu](rendering-pipeline.md) | position d'alphaTest, setup à 2 lumières, réalité de l'uniform, greedy meshing |
| [Invocation des hooks](hook-invocation.md) | comment les hooks sont greffés dans le WGSL du moteur |
| [En-tête du moteur](engine-header.md) | Déclarations WGSL ajoutées aux shader packs |
| [Validation des shaders](shader-validation.md) | le fonctionnement interne de l'analyseur, la table des signatures, HEADER_VERSION |
| [Compilation WGSL](wgsl-compilation.md) | la vraie compilation de l'étape 2 et les stubs de validation |
| [Identifiants réservés](reserved-identifiers.md) | les 46 symboles `bloxdSp*` |
| [Fonctionnement interne de l'éclairage](lighting-internals.md) | structure de blockLight / heldLight |
| [Fonctionnement interne du brouillard](fog-internals.md) | linéaire uniquement, la zone d'atténuation de 32 blocs |
| [Échantillonnage des textures](texture-sampling.md) | la génération du code des textures à 3 variantes |
| [Registre de textures](texture-registry.md) | Résolution des noms et identifiants d'animation et d'orientation |
| [Rendu des modèles](model-rendering.md) | le programme Model v5 |
| [Données du moteur](engine-data.md) | Fonctions de l'API v5 et limites des packs |
| [Facteurs de test](testing-factors.md) | quels réglages monde/joueur changent les valeurs visibles des packs |
| [Politique](policy.md) | shaderPackPolicy — les 12 titres allow |
| [Soleil et lune](sun-and-moon.md) | ce qui alimente bloxdSunDirection |
| [Débogage](debugging.md) | paramètres URL, panneaux de statistiques |


Les détails internes ne constituent pas un contrat d'API stable. Lors de la création de packs, privilégiez la [Référence de l'API](../api/).

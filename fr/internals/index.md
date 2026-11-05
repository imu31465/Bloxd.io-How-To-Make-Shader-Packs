# Intérieurs du moteur et recherche

Spécifications internes restaurées en analysant l'implémentation du moteur. Tout ce qui est ici a été récupéré directement depuis le JavaScript du build de production actuel (`bny9u`). Séparé de la documentation d'API publique ([Référence API](../api/)) pour préserver le comportement interne exact et les résultats d'analyse.

## Plan

| Page | Contenu |
|---|---|
| [Pipeline de rendu](rendering-pipeline.md) | position d'alphaTest, setup à 2 lumières, réalité de l'uniform, greedy meshing |
| [Invocation des hooks](hook-invocation.md) | comment les hooks sont greffés dans le WGSL du moteur |
| [En-tête du moteur](engine-header.md) | l'en-tête v5 complet (verbatim, 8,954B) |
| [Validation des shaders](shader-validation.md) | les intérieurs de l'analyseur, la table des signatures, HEADER_VERSION |
| [Compilation WGSL](wgsl-compilation.md) | la vraie compilation de l'étape 2 et les stubs de validation |
| [Identifiants réservés](reserved-identifiers.md) | les 46 symboles `bloxdSp*` |
| [Intérieurs de l'éclairage](lighting-internals.md) | structure de blockLight / heldLight |
| [Intérieurs du brouillard](fog-internals.md) | linéaire uniquement, la bande de dégradé de 32 blocs |
| [Échantillonnage des textures](texture-sampling.md) | le codegen de textures à 3 variantes |
| [Registre des textures](texture-registry.md) | résolution nom→id, 896 noms, dérive mesurée |
| [Rendu des modèles](model-rendering.md) | le programme Model v5 |
| [Données du moteur](engine-data.md) | le relevé v5 des constantes/limites/layouts |
| [Facteurs de test](testing-factors.md) | quels réglages monde/joueur changent les valeurs visibles des packs |
| [Politique](policy.md) | shaderPackPolicy — les 12 titres allow |
| [Soleil et lune](sun-and-moon.md) | ce qui alimente bloxdSunDirection |
| [Débogage](debugging.md) | paramètres URL, panneaux de statistiques |
| [Journal de recherche](research-log.md) | méthodologie, historique des builds, éléments non vérifiés |

> API cible : 5 · Build cible : `bny9u` (vérifié en production le 2026-11-05)

Les intérieurs ne sont pas un contrat d'API stable — ils peuvent changer avec les mises à jour du moteur, et chaque page nomme son build de preuve ([journal de recherche](research-log.md)).

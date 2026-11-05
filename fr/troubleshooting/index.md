# Dépannage

Erreurs et problèmes visuels, repérables **par symptôme**. Les pages suivent la structure : symptôme → cause → comment vérifier → correction → prévention.

## Index des symptômes

| Symptôme | Page |
|---|---|
| Le pack ne charge pas / erreurs zip et pack.json | [Erreurs de chargement](loading.md) |
| Messages `apiVersion` / anciens packs qui ne fonctionnent plus | [Erreurs de version d'API](api-version.md) |
| Ne compile pas / `must be declared as` / syntaxe WGSL | [Erreurs de compilation](compilation.md) |
| Erreurs de validation (noms réservés, contrat strict, `reaches`) | [Erreurs de validation](validation.md) |
| Échoue seulement dans certaines variantes / écarté dans les jeux stricts | [Problèmes propres aux variantes](variants.md) |
| Rendu incorrect (voile blanc, pas d'ombres, nuit étrange) | [Problèmes visuels](visual.md) |
| Erreurs de noms de texture / `did you mean` | [Problèmes de textures](textures.md) |
| Problèmes de luminosité / d'ombres / de brouillard | [Problèmes d'éclairage](lighting.md) |
| Problèmes de modèles / d'entités / d'enchantement | [Problèmes de modèles](models.md) |
| Lent / écarté par le contrôle sur appareil | [Performance](performance.md) |
| Légal, sécurité, questions courantes | [FAQ](faq.md) |

> API cible : 5 · Build cible : `bny9u` (vérifié en production le 2026-11-05) · État : Verified (messages relevés verbatim depuis le validateur et le chargeur en production)

## Où apparaissent les erreurs

1. **Réglages → ligne d'état Shader Pack** — erreurs de l'étape du chargeur (les ids sont `shaderPack:load*`)
2. **La liste d'erreurs de l'écran de chargement** — validation et compilation (fichier:ligne + variante)
3. **La console devtools du navigateur** — erreurs d'exécution et d'étape 2 (compilateur WGSL du navigateur)

Le contrôle de chargement en 3 étapes est détaillé dans [Premiers pas : Validation](../getting-started/validation.md).

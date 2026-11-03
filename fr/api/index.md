# Référence API

La spécification systématique de l'API v5 actuelle. Tout ce qui figure ici est mesuré sur le build cible `ab90qa` (2026-11-03 ; production et preprod identiques). L'en-tête du moteur préfixé à chaque pack (reproduit dans [Internals du moteur](../internals/engine-header.md)) est la source principale.

## Plan

| Page | Contenu |
|---|---|
| [Format du pack](pack-format.md) | tous les champs de `pack.json`, limites du chargeur, disposition de l'uniform |
| [Hooks de shader](hooks.md) | comparatif des 9 hooks : signatures, cibles, conditions d'exécution |
| [Flags](flags.md) | les 14 champs de `BloxdFlags` |
| [Structures](structures.md) | chaque champ de chaque structure (y compris les champs conditionnels) |
| [Fonctions](functions.md) | toutes les signatures des fonctions par frame, par défaut et spéciales |
| [Éclairage](lighting.md) | l'API d'éclairage et l'ordre de traitement |
| [API de textures](texture-api.md) | `bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*` et le nommage |
| [Constantes](constants.md) | `bloxdPi` / `bloxdTau` / `bloxdChunkSize` |
| [Préprocesseur](preprocessor.md) | `BLOXD_STRICT` / `BLOXD_ALPHA` / `BLOXD_SCENE_DEPTH` |
| [Restrictions](restrictions.md) | limites du langage, identifiants réservés |
| [Compatibilité](compatibility.md) | packs d'anciennes versions, revalidation des packs enregistrés |
| [Catalogue de textures](texture-catalog.md) | les 896 noms utilisables (recherchables) |

> API cible : 5 · Build cible : `ab90qa` (vérifié en production le 2026-11-03) · État : Analyzed (restauré mot à mot depuis l'en-tête et le validateur)

Vous migrez depuis la v4 ? Voir [Historique des versions : v5](../history/v5.md).

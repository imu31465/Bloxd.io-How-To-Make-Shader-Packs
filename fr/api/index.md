# Référence API

Cette page présente la référence de l’API v5 actuelle. La source principale des définitions est l’en-tête que le moteur ajoute automatiquement au début de chaque pack (voir [Internals du moteur](../internals/engine-header.md) pour l’en-tête complet).

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
| [Catalogue de textures](texture-catalog.md) | 1 017 constantes nommées disponibles (recherchables) |

> API : 5 · État : Analyzed (reconstitué à partir de l’en-tête du moteur et du validateur)

Vous migrez depuis la v4 ? Voir [Historique des versions : v5](../history/v5.md).

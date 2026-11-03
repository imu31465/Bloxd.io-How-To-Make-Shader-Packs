# Historique des versions

> État : Historical — relevés version par version ; chaque guide indique son propre build visé

Changements, étapes de migration et API supprimées, de la v1 à la v5. Pour migrer les packs anciens et pour les spécifications conservées de chaque époque.

## Chronologie

| Version | En production depuis | Guide | L'essentiel |
|---|---|---|---|
| v1 | (initiale) | [v1](v1.md) | première API de packs de shaders. 6 hooks (terrain/liquide × vertex/surface) ; le vocabulaire `bloxdTime` / `bloxdOriginOffset` / `bloxdFaceBlock` / `engineColour` / `fogFactor` |
| v2 | — | [v2](v2.md) | renommage complet des identifiants, `blockId`, `BLOXD_SCENE_DEPTH` et `bloxdOpaqueBehind()` |
| v3 | 2026-10-19 | [v3](v3.md) | `blockId` → `blockFlags` (bits), `bloxdPi` / `bloxdTau`, hooks liquides officiels, internals de l'invocation des hooks |
| v4 | 2026-10-26 | [v4](v4.md) | API de textures (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`), le contrat strict, analyse de l'en-tête du moteur et du registre |
| **v5** | **2026-11-03** | [v5](v5.md) | **actuelle** — structure `BloxdFlags` (14 booléens), hooks Model (9 au total), l'API d'éclairage `bloxdLit()` / `bloxdLitColour()`, `localPosition`, entrées et sorties d'enchantement/superposition, 6 variantes |

## La préface commune

Le jeu actuel n'accepte que `apiVersion: 5` et **les packs d'anciennes versions échouent à l'instant même du chargement** (les packs enregistrés sont silencieusement désactivés — [Compatibilité](../api/compatibility.md)). Chaque guide couvre « précédent → suivant ». Vous traversez plusieurs versions ? Appliquez-les de la plus ancienne à la plus récente.

## Chemin rapide vers une checklist

- pack v4 → [guide v5](v5.md) §77 (pour l'essentiel mécanique)
- pack v3 → [v4](v4.md) §61 → [v5](v5.md) §77
- pack v2 → [v3](v3.md) §47 → v4 → v5
- pack v1 → commencez par [v2](v2.md) §37

> Pour la spécification actuelle elle-même, voir la [Référence API](../api/) ; pour les internals du build actuel, voir les [Internes du moteur](../internals/).

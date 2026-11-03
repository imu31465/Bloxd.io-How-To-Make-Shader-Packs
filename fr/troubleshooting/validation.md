# Erreurs de validation

> API cible : 5 · État : Verified (messages relevés verbatim depuis le validateur en production)

Erreurs de validation statique (analyseur, étape 1) — surtout des noms réservés, le contrat des jeux stricts et les restrictions d'appels entre hooks.

## "Packs can't construct BloxdSurface directly" / "Packs can't construct BloxdLight directly, since header structs gain fields; ..."

- **Cause** : appeler des constructeurs comme `BloxdSurface(...)`
- **Correction** : partez de `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` et modifiez les champs (`var out = s;` fonctionne dans les hooks de lumière)

## "Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"

- **Cause** : un identifiant commençant par `bloxd` (sans distinction de casse)
- **Correction** : renommez (p. ex. `packTint`). Seuls les 9 noms de hooks sont autorisés
- **Prévention** : préfixez vos propres noms avec `pack` / `my` etc.

## "bloxdPackInputs isn't part of the bloxd_ header"

- **Cause** : référencer l'uniforme directement
- **Correction** : utilisez-le via les fonctions de l'en-tête ([Format du pack](../api/pack-format.md#uniform-par-frame--bloxdpackinputs))

## "... reaches bloxdTexel, which only surface and light hooks can use."

- **Cause** : appelé depuis un hook vertex (ou depuis une fonction atteignable depuis un) — « reaches » désigne **le chemin d'appel**
- **Correction** : déplacez l'appel vers un hook surface / light

## "... reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and <program> doesn't define it; ..."

- **Cause** : `bloxdOpaqueBehind()` a besoin de `BLOXD_SCENE_DEPTH`, définie uniquement dans les variantes tout-liquide ; partager l'appel depuis du code de hook terrain/modèle crée des variantes incompilables
- **Correction** : encadrez l'appel dans `#ifdef BLOXD_SCENE_DEPTH`
- **Prévention** : isolez les lectures de profondeur en traitement propre au liquide

## Le contrat des jeux stricts

| Message | Signification |
|---|---|
| `<hook> moves terrain, which strict games prevent.` | hook vertex sans garde |
| `discard makes terrain see-through, which strict games prevent.` | `discard` atteignable |

- **Important** : ce ne sont pas des erreurs de compilation — les jeux stricts **désactivent automatiquement tout le pack** (`shaderPack:offInStrict`)
- **Correction** : encadrez les hooks vertex et `discard` dans `#ifndef BLOXD_STRICT` ([Variantes et gardes](../getting-started/variants.md))

## Messages de la version actuelle

| Message | Action |
|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | migrez `#ifdef BLOXD_LIGHTING` → `if (bloxdLit())` ([Éclairage](../api/lighting.md#bloxdlit--la-porte)) |
| `bloxdBlockFlagRock isn't part of the shader pack API...` | constante de bits restante → `flags.rock` ([Flags](../api/flags.md)) |
| `bloxdSpLitColour isn't part of the shader pack API...` | symbole interne de la v4 → utilisez la fonction publique `bloxdLitColour()` |

L'analyseur donne des **messages dédiés** aux packs qui continuent de lire `blockFlags` ou d'encadrer les hooks de lumière dans `#ifdef BLOXD_LIGHTING`, donc rien ne dysfonctionne en silence (les étapes de migration : [migration v5](../history/v5.md)).

Les erreurs de résolution de noms de texture (suggestions d'orthographe, orthographes d'image/de rotation) se trouvent dans [Problèmes de textures](textures.md).

## Voir aussi

- [Restrictions & noms réservés](../api/restrictions.md) · [Engine Internals : validation des shaders](../internals/shader-validation.md) · [Problèmes propres aux variantes](variants.md)

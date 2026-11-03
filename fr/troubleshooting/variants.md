# Problèmes propres aux variantes

> API cible : 5 · État : Verified

Problèmes qui n'apparaissent que dans certaines des 6 variantes (`strict|allow` × `terrain|liquid|model`). La v5 a supprimé l'axe éclairage (l'ancien `BLOXD_LIGHTING`) et le chargeur valide **les 6 variantes d'un coup** au chargement.

## Ne charge que dans les jeux non stricts / écarté en strict

- **Cause** : un hook vertex sans garde ou un `discard` atteignable ; les jeux stricts interdisent les deux et infraction = **désactivation automatique de tout le pack** (`shaderPack:offInStrict`)
- **Vérification** : l'écran de chargement affiche `<hook> moves terrain, which strict games prevent.` / `discard makes terrain see-through, which strict games prevent.`
- **Correction** : encadrez les hooks vertex et `discard` dans `#ifndef BLOXD_STRICT`
- **Prévention** : partez toujours du modèle avec garde pour les hooks vertex ([Variantes et gardes](../getting-started/variants.md))

## ".alpha is undefined"

- **Cause** : `alpha` n'existe que derrière `#ifdef BLOXD_ALPHA` (tout liquide + terrain/modèle non strict)
- **Correction** : encadrez le code qui touche à alpha dans `#ifdef BLOXD_ALPHA` ([Préprocesseur](../api/preprocessor.md#matrice-macros--variantes))

## "BloxdVertex only exists when BLOXD_STRICT isn't defined"

- **Cause** : les variantes strictes n'ont pas de hooks vertex du tout, donc pas de `BloxdVertex` non plus ; le code vertex est atteignable depuis les variantes strictes
- **Correction** : protégez le hook vertex

## bloxdOpaqueBehind échoue seulement dans certaines variantes

- **Cause** : `BLOXD_SCENE_DEPTH` n'est définie que dans les variantes tout-liquide
- **Correction** : `#ifdef BLOXD_SCENE_DEPTH` ([Erreurs de validation](validation.md))

## L'eau ignore le pack (Liquid)

- **Symptôme** : des hooks terrain écrits, l'eau inchangée
- **Cause** : **en v5, si un pack ne définit aucun hook Liquid, aucun hook Terrain ne s'exécute non plus sur l'eau** (le comportement d'avant v4 « le liquide retombe sur le terrain » a disparu)
- **Correction** : écrivez des hooks Liquid ([répartition des hooks](../api/hooks.md#ce-que-dessine-chaque-programme))

## Modèles (entités, modèles de blocs) non affectés

- **Cause** : hors de portée avant la v5 ; nécessite désormais des hooks `bloxdModel*`
- **Correction** : définissez `bloxdModelSurface` / `bloxdModelLight` ([guide des modèles](../guides/models.md))

## À propos de la validation des 6 variantes

Le chargeur valide **les 6 variantes d'un coup** au chargement (l'axe éclairage n'est plus compilé à part). Même si un jeu n'utilise que certaines conditions, les packs distribués doivent anticiper les six.

| Variante | Macros définies |
|---|---|
| `allow.terrain` | `BLOXD_ALPHA` |
| `allow.liquid` | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | `BLOXD_ALPHA` |
| `strict.terrain` | — |
| `strict.liquid` | `BLOXD_SCENE_DEPTH` |
| `strict.model` | — |

## Voir aussi

- [Variantes et gardes](../getting-started/variants.md) · [Préprocesseur](../api/preprocessor.md) · [Politique par jeu](../internals/policy.md)

# Erreurs de version d'API

> API cible : 5 · Build cible : `v98qt8` (vérifié en production le 2026-11-08) · État : Verified (verbatim du dictionnaire i18n en production)

Erreurs autour de `apiVersion`. Le jeu actuel n'accepte **que `5`**.

## "pack.json needs "apiVersion": {{version}}."

- **Symptôme** : ce message juste après le chargement (`loadNoApiVersion`)
- **Cause** : la clé `apiVersion` est entièrement absente
- **Correction** : ajoutez `"apiVersion": 5` — un **nombre** (la chaîne `"5"` échoue)
- **Prévention** : partez du modèle [pack.json](../getting-started/manifest.md)

## "This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}."

- **Symptôme** : `loadWrongApiVersion`
- **Cause** : `apiVersion` existe mais ne vaut pas 5 (un pack v1–v4)
- **Correction** : appliquez la migration correspondante ([Historique des versions](../history/)) :
  - v4 → v5 : [le guide v5](../history/v5.md) — pour l'essentiel mécanique (flags · `bloxdLit()` · la mise en garde `bloxdFragmentBlockPosition`)
  - v3 → v5 : appliquez d'abord [v4](../history/v4.md)
  - v2 ou antérieur → v5 : passez par v3 → v4 → v5
- **Prévention** : après toute mise à jour de l'API, consultez [Compatibilité](../api/compatibility.md) et le guide de migration correspondant

## La chaîne "5" est rejetée

- **Cause** : le chargeur compare `manifest.apiVersion !== 5` **strictement** (`===`) ; une chaîne JSON `"5"` n'est pas le nombre 5
- **Correction** : `"apiVersion": 5` (sans guillemets)

## Un ancien pack sauvegardé a silencieusement cessé de fonctionner

- **Symptôme** : un pack v1–v4 qui fonctionnait auparavant ne répond plus, sans exception
- **Cause** : les packs sauvegardés se résolvent en `{kind: "none", reason: "otherApiVersion"}` et deviennent **silencieusement inactifs**
- **Vérification** : la ligne d'état de l'onglet des réglages : `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`
- **Correction** : chargez un remplaçant migré depuis le même écran
- **Prévention** : après les mises à jour de l'API, republiez une version incrémentée et annoncez-la ([Distribution](../getting-started/distribution.md))

## Un pack v4 migré échoue à la validation

Les trois motifs typiques (étapes complètes dans [le guide de migration vers v5](../history/v5.md)) :

| Message de validation | Cause | Correction |
|---|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | usage de `#ifdef BLOXD_LIGHTING` | réécrivez en `if (bloxdLit()) { ... } else { return bloxdDefaultLight(s, l); }` |
| `bloxdBlockFlagRock isn't part of the shader pack API...` (diagnostic de nom réservé) | références restantes aux constantes de bits | utilisez `surface.flags.rock` etc. (table 1:1 dans [Flags](../api/flags.md)) |
| `bloxdFragmentBlockPosition` manquant | absent de l'en-tête documenté depuis la v5 (toujours injecté et accepté — voir [Fonctions](../api/functions.md)) | pas une erreur à corriger : cela compile ; préférez `flags` / `bloxdWorldPosition()` dans le nouveau code |

## Voir aussi

- [Compatibilité](../api/compatibility.md) · [Historique des versions](../history/) · [pack.json](../getting-started/manifest.md)

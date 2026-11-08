# Variantes et gardes

> API cible : 5 · Build cible : `v98qt8` (vérifié en production le 2026-11-08) · État : Analyzed

## 6 variantes

Vous écrivez un seul corps de code, mais il doit compiler dans les **6 variantes** : `{strict, allow} × {terrain, liquid, model}`. Le chargeur valide les six au moment du chargement.

L'axe « éclairage activé/désactivé » de la v4 et des versions antérieures a disparu (la v4 comptait 8 variantes). L'état d'éclairage est désormais une question d'exécution pour [`bloxdLit()`](../api/lighting.md), et non plus une branche à la compilation.

| Variante | Exemple | Macros définies |
|---|---|---|
| `allow.terrain` | terrain dans un jeu allow | `BLOXD_ALPHA` |
| `allow.liquid` | eau dans un jeu allow | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | modèles dans un jeu allow | `BLOXD_ALPHA` |
| `strict.terrain` | terrain dans un jeu strict | — |
| `strict.liquid` | eau dans un jeu strict | `BLOXD_SCENE_DEPTH` |
| `strict.model` | modèles dans un jeu strict | — |

## Directives conditionnelles

Seuls `#define NAME` (sans valeur) / `#ifdef` / `#ifndef` / `#else` / `#endif` sont disponibles. Le `#` se place en début de ligne (à l'intérieur des fonctions, c'est permis).

| Garde | Signification | Usage typique |
|---|---|---|
| `#ifndef BLOXD_STRICT` | variantes non strictes (allow) uniquement | englober des hooks vertex entiers, englober `discard` |
| `#ifdef BLOXD_ALPHA` | variantes où `alpha` existe (tout liquide + terrain/modèle non strict) | englober le code qui touche à alpha |
| `#ifdef BLOXD_SCENE_DEPTH` | toutes les variantes liquides | englober les appels à `bloxdOpaqueBehind()` |

`BLOXD_LIGHTING` a été **supprimé en v5**. L'utiliser fait échouer la validation avec : *« BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead. »*

## Le contrat des jeux stricts

La plupart des jeux sont stricts (pas d'animation de sommets, pas de `discard`). Un hook vertex sans garde signale `<hook> moves terrain, which strict games prevent.` et un `discard` atteignable signale `discard makes terrain see-through, which strict games prevent.` — les deux désactivent **tous les hooks** dans ce jeu strict. Englobez toujours les hooks vertex dans `#ifndef BLOXD_STRICT`.

Pour les internals de la politique par jeu, voir [Engine Internals : policy](../internals/policy.md).

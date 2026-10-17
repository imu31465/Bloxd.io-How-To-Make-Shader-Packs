[← Partie précédente](04-realism.md)·[Retour au manuel](README.md)·[Partie suivante →](06-implementation.md)

# Partie V : Dépannage et notes

## 17. Erreurs courantes et solutions

| Symptôme | Solution |
|---|---|
| Ne charge pas en jeux stricts | Entourez le hook vertex de `#ifndef BLOXD_STRICT` |
| `.alpha` signalé indéfini | Entourez de `#ifdef BLOXD_ALPHA` |
| `blockLight` signalé indéfini | Entourez de `#ifdef BLOXD_LIGHTING`. Entourez les fonctions auxiliaires partagées **en fonctions entières** (en v2 le champ est toujours présent : en pratique plus d'erreur ; gardez la garde pour les usages de décision) |
| `Packs can't construct BloxdSurface directly` | Partez de `bloxdDefaultSurface(s)` |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | Entourez de `#ifndef BLOXD_STRICT` |
| Lointain blanc et laiteux | Souvent double brouillard. La couleur terminée porte déjà le brouillard : gardez subtile la brume maison et préférez ne baisser que la saturation |
| Pack exclu en rejoignant le jeu | Échec du contrôle en direct du jeu. Revoyez les oublis de gardes |
| `pack.json needs "apiVersion": 2.` | `apiVersion` manquant ou différent de `2`. Mettez le nombre `2` (la chaîne `"2"` est rejetée). Les packs v1 sont refusés avec `shaderPack:loadWrongApiVersion` |
| `There's no pack.json at the top of the pack.` | Pas de `pack.json` à la racine du ZIP. Vérifiez de ne pas avoir zippé le dossier lui-même |
| `bloxdTerrainVertex must be declared as: fn ...` | Signature différente. Réécrivez exactement comme affiché |
| `bloxdTerrainVertex can't run in strict games...` | Entourez le hook vertex de `#ifndef BLOXD_STRICT` |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | Entourez de `#ifdef BLOXD_LIGHTING` (en v2 le champ est toujours présent : normalement plus d'erreur) |
| Monter `pow(l.skyLight, γ)` ne creuse jamais les ombres | `skyLight` est une valeur post-courbe (brut 0,87 arrive en 0,97). Passez à inversion + seuil de R9.12 (section 10) |
| `... can only be a function's parameter or return type, ...` | `var x: BloxdSurface;` sans initialiser est rejeté. Construisez depuis `bloxdDefault*` |
| `bloxdPackInputs isn't part of the bloxd_ header` | L'uniform PackInputs ne peut se référencer directement depuis les packs. Passez par les fonctions d'en-tête comme `bloxdTime()` |
| `Packs can't declare bloxd_ names...` | Retirez le préfixe `bloxd_` de vos identifiants. Seuls les 6 noms de hooks peuvent se définir |
| `loadDuplicateManifest` au chargement zip | Deux `pack.json` (variantes de casse incluses). Gardez-en un |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Réécrivez depuis `bloxdDefaultSurface(s)`. Partir d'une copie du premier paramètre du hook light (`var out = s;`) vaut aussi |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` est rejeté. Écrivez `_ = f();` |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | Entourez l'appel `bloxdOpaqueBehind()` en hooks terrain avec `#ifdef BLOXD_SCENE_DEPTH` |
| `...only surface and light hooks can use.` | Retirez `bloxdOpaqueBehind()` des hooks vertex (surface / light seuls) |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Pas une erreur mais une désactivation auto en jeux stricts (`shaderPack:offInStrict`). Entourez vertex et `discard` avec `#ifndef BLOXD_STRICT` |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Erreur de 2ᵉ étape (Tint du navigateur). Parenthéser les opérandes de `^` `&` `\|` `<<` `>>` (§38) |

## 18. Droits et notes

- La fonction de packs de shaders est une fonction officielle chargeable depuis l'interface du jeu, et créer des packs est considéré comme un usage prévu. Mais aucune documentation officielle publique n'a été confirmée
- Les packs sont du WGSL pur — exécution JS et accès réseau impossibles par conception
- Ceci est un guide non officiel, pas la position officielle des développeurs. L'API peut changer sans avis

[← Partie précédente](04-realism.md)·[Retour au manuel](README.md)·[Partie suivante →](06-implementation.md)

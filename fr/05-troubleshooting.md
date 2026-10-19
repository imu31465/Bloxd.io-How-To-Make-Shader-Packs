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
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | Avertissement : la file de graines de lumière a débordé dans les régions à forte densité d'émetteurs ou à travers les frontières de régions, et le calcul de lumière de ce chunk a été écourté. Pas d'origine « pack », mais **les trous de lumière autour des concentrations d'émetteurs viennent de cette limite** — disperser les sources de lumière dans le monde l'évite |
| Pack exclu en rejoignant le jeu | Échec du contrôle en direct du jeu. Revoyez les oublis de gardes |
| Le contrôle en direct ne se termine jamais et le pack tombe avec `This device couldn't check …` etc. | Le contrôle a un délai forcé de 60 secondes (le dépassement compte comme `skipped`). Fréquent sur appareils faibles / mondes lourds — allégez le travail vertex lourd et les boucles complexes, puis réessayez |
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
| `needs the new WebGPU renderer, so remove the renderer override...` | Retirez le paramètre URL `?renderer=` et le `bloxdRenderer` du localStorage, puis rechargez ([Partie VII](07-internals.md) §29) |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Réécrivez depuis `bloxdDefaultSurface(s)`. Partir d'une copie du premier paramètre du hook light (`var out = s;`) vaut aussi |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` est rejeté. Écrivez `_ = f();` |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | Entourez l'appel `bloxdOpaqueBehind()` en hooks terrain avec `#ifdef BLOXD_SCENE_DEPTH` |
| `...only surface and light hooks can use.` | Retirez `bloxdOpaqueBehind()` des hooks vertex (surface / light seuls) |
| `Lite: …reads scene depth on a page that didn't turn it on` | Rechargez la page et rouvrez-la avec le pack qui lit la profondeur activé ([partie VIII](08-apiv2.md) §35). La disponibilité de la texture de profondeur est fixée à la génération de la page |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Pas une erreur mais une désactivation auto en jeux stricts (`shaderPack:offInStrict`). Entourez vertex et `discard` avec `#ifndef BLOXD_STRICT` |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Erreur de 2ᵉ étape (Tint du navigateur). Parenthéser les opérandes de `^` `&` `\|` `<<` `>>` (§38) |

### IDs d'erreurs de la phase de chargement

Les erreurs de l'écran de réglages portent des IDs `shaderPack:load*`. Comme aide-mémoire pour retrouver un message :

| ID | Signification |
|---|---|
| `loadZipTooBig` | zip au-delà de 32 Mo |
| `loadTooManyZipEntries` | plus de 1024 entrées de zip |
| `loadTooManyWgsl` | plus de 256 fichiers `.wgsl` |
| `loadSourceTooBig` | total `.wgsl` au-delà de 256 Ko (contrôle en flux fichier par fichier) |
| `loadManifestTooBig` | `pack.json` au-delà de 64 Ko |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` n'est pas du JSON / pas un objet |
| `loadNoApiVersion` / `loadWrongApiVersion` | `apiVersion` absent / ≠ `2` (packs v1 refusés) |
| `loadNoName` / `loadAuthorNotString` | `name` absent / `author` n'est pas une chaîne |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | compression non prise en charge / zip64 / découpé / chiffré |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | chemins dupliqués / non-UTF-8 / échec de décompression / zip endommagé |

`loadNoManifest` / `loadDuplicateManifest` (position / doublons de `pack.json`) — voir les lignes correspondantes du tableau ci-dessus.

## 18. Droits et notes

- La fonction de packs de shaders est une fonction officielle chargeable depuis l'interface du jeu, et créer des packs est considéré comme un usage prévu. Mais aucune documentation officielle publique n'a été confirmée
- Les packs sont du WGSL pur — exécution JS et accès réseau impossibles par conception
- Ceci est un guide non officiel, pas la position officielle des développeurs. L'API peut changer sans avis

[← Partie précédente](04-realism.md)·[Retour au manuel](README.md)·[Partie suivante →](06-implementation.md)

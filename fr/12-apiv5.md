[← Partie précédente](11-reference.md)·[Retour au manuel](README.md)

# Partie XII : Guide de migration vers l'API version 5 (2026-11-03, résumé)

> Ce texte est le résumé court pour cette langue. La version complète, avec tous les détails, recettes d'exemple, l'en-tête v5 restauré intégralement et les internals du moteur (§69–§82), est disponible en [anglais](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/12-apiv5.md) et en [japonais](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/12-apiv5.md).

Build cible : `ab90qa.main.6188124c.js` — **en production et en preprod simultanément (mesuré le 2026-11-03)**, les deux bundles identiques octet par octet (md5 vérifié). C'est la plus grosse révision de l'API depuis v3 : l'en-tête du moteur passe de 6 021 à **8 954 octets décodés** et presque chaque structure gagne des champs.

## Ce qui change

- `pack.json` exige `"apiVersion": 5` (strict `===`, nombre) — les packs v4 sont rejetés au chargement ; les packs v4 stockés deviennent silencieusement inactifs.
- **`blockFlags` est remplacé par une structure (le grand chantier) :** les six constantes de bits `bloxdBlockFlag*` disparaissent ; place à **`flags: BloxdFlags`** avec 14 champs bool nommés — six sont les anciens bits renommés, huit sont nouveaux : **`slab` `stairs` `flat` `placed` `held` `dropped` `thrown` `lifeform`**. Modèles, objets tenus et créatures sont désormais distinguables du terrain.
- **`#ifdef BLOXD_LIGHTING` disparaît :** l'aiguillage à la compilation cède la place au test à l'exécution via la nouvelle fonction **`bloxdLit()`** ; l'uniform gagne `lit: u32` (offset 4, toujours 64 octets au total). La matrice de variantes passe de 8 à 6 (`strict|allow` × `terrain|liquid|model`).
- **La recette d'éclairage du moteur devient publique :** trois nouvelles fonctions — **`bloxdShading(light)`**, **`bloxdWorldLight(light)`**, **`bloxdLitColour(surface, light)`** — plus deux nouvelles entrées de `BloxdLightIn` (`diffuse`, `emissive`).
- **Nouvelles entrées :** `localPosition: vec3f` (coordonnées modèle, 0 pour le terrain) partout ; `enchantTier` / `enchantColour` / `enchantSpeed` / `overlayColour` (enchantement et flash de dégâts) sur Surface/Light ; **nouvelles sorties** `enchantColour` / `overlayColour` sur `BloxdSurface`, mélangées par `bloxdLitColour`.
- **Supprimé :** `bloxdFragmentBlockPosition()` (sans remplacement), les constantes `bloxdBlockFlag*`, `bloxdSpLitColour`.
- **Le gabarit de pack par défaut embarque désormais les 9 hooks** (hooks de lumière inclus, 1 122 → 1 683 octets) et son commentaire documente la suppression : *« If you delete a hook, the default is used instead. »*
- Nouvelle constante d'en-tête : `const bloxdChunkSize: i32 = 32;`. Les dérivées Y sont automatiquement niées : `dpdy`/`dpdyCoarse`/`dpdyFine` sont réécrites en `(-dpdy(...))`. `HEADER_VERSION` passe à `9.<hash>.<hash>`.
- L'espace `bloxdSp*` passe de 27 à **46 symboles** ; le registre de textures mesure désormais **896 noms utilisables** (+1 `scorpion_eggs`, −10, dont la famille `chest_double_*` et `mob_spawner_*_block_side`) — les noms sont l'API, les ids ne sont qu'un instantané.
- Tout le reste reste figé : limites du chargeur (256 `.wgsl` / 256 Ko / 64 Ko / 32 Mo / 1 024 entrées), noms des hooks, contrat strict (12 titres allow), bindings du groupe 3.

## Migration en bref

| v4 | v5 |
|---|---|
| `"apiVersion": 4` | `"apiVersion": 5` (nombre) |
| `(s.blockFlags & bloxdBlockFlagVegetation) != 0u` | `s.flags.vegetation` |
| `#ifdef BLOXD_LIGHTING … #endif` | `if (bloxdLit()) { … } else { return bloxdDefaultLight(s, l); }` |
| `bloxdFragmentBlockPosition(p, n)` | supprimé — utiliser `bloxdWorldPosition()` / `flags` |
| (inexistant) | `s.flags.held`, `s.flags.lifeform`, `s.localPosition`, `s.enchantTier` … |

L'en-tête v5 complet restauré (8 954 octets, mot à mot) et la liste intégrale de la dérive des noms de textures figurent dans les versions complètes anglaise et japonaise (§82 et §80).

[← Partie précédente](11-reference.md)·[Retour au manuel](README.md)

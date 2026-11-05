# Intérieurs du registre des textures

> API cible : 5 · Build cible : `bny9u` (vérifié en production le 2026-11-05) · État : Verified (extrait en réexécutant le propre constructeur de registre du moteur)

La mécanique de résolution nom→id et la dérive mesurée du registre. Le catalogue côté utilisateur : [Catalogue de textures](../api/texture-catalog.md).

## Méthodologie

Nous avons exécuté le propre module de construction du registre du moteur (29812 sur ce build, porté par les chunks 52/53/54) sur les données de textures du registre de blocs livré (module de données 1351 dans le bundle principal) sur les données de textures du registre de blocs livré, dans un harnais webpack minimal, et enregistré sa sortie — ces chiffres sont **le calcul propre du bundle de production**, pas une réimplémentation.

## Structure de sortie

| Sortie | mesuré en v5 | Signification |
|---|---|---|
| `named` | **911** | noms référençables comme `bloxdTextureId<Name>` |
| `aliases` | 424 | orthographes repliées — 196 alias d'image (`lava0`…) et 228 alias de rotation (`chest_top[rot[1`…) |
| `layers` | 1,232 | la table de couches complète de l'atlas — 911 racines nommées, 150 images d'animation supplémentaires, 171 emplacements pré-rotés |

## Règles de pliage

- **familles d'animation** (43) : les orthographes d'image (`lava0`–`lava7`) se replient vers le nom de base (`lava`) ; `bloxdTexel` renvoie l'image courante au moment de l'échantillonnage
- **familles de rotation** (57) : les emplacements tournés (`[rot[1..4`) se replient vers le nom racine ; `bloxdTexel` réapplique le `textureRotation` par face
- `radar_screen` est le seul nom appartenant aux deux familles à la fois (ses quatre copies pré-rotées portent chacune leur propre échelle de 4 images — d'où 46 racines d'animation dans l'atlas, et non 42)

## Dérive (cnty9 → ab90qa)

| Mesure | cnty9 (v4) | ab90qa (v5) |
|---|---|---|
| entrées d'atlas | 1,219 | **1,210** |
| familles de rotation (orthographes tournées) | 57 (228) | **57 (228) — inchangé** |
| familles d'animation (orthographes d'image) | 42 (188) | **42 (188) — inchangé** |
| constantes nommées utilisables | 905 | **896** |
| changements d'id parmi les noms survivants | — | **334 sur 905** |

La dérive complète (11 noms) : ajouté (1) `scorpion_eggs` ; retirés (10) les huit textures de coffre double plus `mob_spawner_hostile_block_side` / `mob_spawner_neutral_block_side` (le coffre double a quitté les données du jeu ; les générateurs conservent `mob_spawner_block_top`).

## Dérive (ab90qa → xkg8x)

| Mesure | ab90qa (lancement v5) | xkg8x (v5, actuel) |
|---|---|---|
| entrées d'atlas | 1,210 | **1,220** |
| familles de rotation (orthographes tournées) | 57 (228) | **57 (228) — inchangé** |
| familles d'animation (orthographes d'image) | 42 (188) | **42 (188) — inchangé** |
| constantes nommées utilisables | 896 | **906** |
| changements d'id parmi les survivants | — | **376 sur 896** |

La dérive complète (10 noms) : ajoutés (10) les huit textures du coffre double plus `mob_spawner_hostile_block_side` / `mob_spawner_neutral_block_side` — chaque nom retiré au lancement de la v5 est revenu (le coffre double est retourné dans les données du jeu ; les variantes latérales du générateur avec lui). Rien n'a été retiré.

5 novembre (xkg8x → bny9u, 1 jour) : entrées 1,220 → 1,232 (+5 : les textures Terminal d'Échange ×3 et Générateur de Pierre ×2) ; 864 noms sur 906 ont changé d'id (95 %) ; aucun retrait ; familles de rotation inchangées, familles d'animation 42 → 43 (`trading_terminal_front`, 8 images à 250 ms). Production et preprod servent le même bundle identique octet par octet.

## Dérive (xkg8x → bny9u)

| Mesure | xkg8x (v5) | bny9u (v5, actuel) |
|---|---|---|
| entrées d'atlas | 1,220 | **1,232** |
| familles de rotation (orthographes tournées) | 57 (228) | **57 (228) — inchangé** |
| familles d'animation (orthographes d'image) | 42 (188) | **43 (196)** |
| constantes nommées utilisables | 906 | **911** |
| changements d'id parmi les survivants | — | **864 sur 906** |

La dérive complète (5 noms) : ajoutés (5) `trading_terminal_front` (anim, 8 images) / `trading_terminal_side` / `trading_terminal_top` / `stone_generator_side` / `stone_generator_top` — deux nouveaux blocs (Terminal d'Échange, Générateur de Pierre) ont rejoint les données du jeu. Rien n'a été retiré ; le brassage des id est quasi total (95 % des survivants).


## Effet sur HEADER_VERSION

Le suffixe de hachage du registre enregistre les ids en dur, donc cette dérive marque **chaque pack sauvegardé « à revérifier »** (revalidé automatiquement au chargement de la page). Les packs écrits avec des noms survivent à la re-résolution ; les packs à ids bruts cassent ([Compatibilité](../api/compatibility.md)).

## Anciens relevés de dérive

La comparaison d'octobre entre deux builds (sjr0p7 → cnty9, 10 jours) : entrées 1200 → 1219 (98 ajoutées, 79 retirées) ; 779 des 1121 noms inchangés ont changé d'id (69 %) ; une migration de convention de nommage (suffixes `_rot1..4` → emplacements `[rot[1..4`) ; l'apparition du coffre double. Le relevé complet se trouve dans [Historique des versions : v4](../history/v4.md).

4 novembre (ab90qa → xkg8x, 1 jour) : entrées 1,210 → 1,220 (+10, toutes des retours — les retraits du lancement de la v5 se sont inversés) ; 376 noms sur 896 ont changé d'id (42 %) ; aucun retrait ; les deux familles de pliage inchangées. Le coffre double est de retour.

## Voir aussi

- [Catalogue de textures](../api/texture-catalog.md) · [Validation des shaders](shader-validation.md) · [Journal de recherche](research-log.md)

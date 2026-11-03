# Intérieurs du registre des textures

> API cible : 5 · Build cible : `ab90qa` (vérifié en production le 2026-11-03) · État : Verified (extrait en réexécutant le propre constructeur de registre du moteur)

La mécanique de résolution nom→id et la dérive mesurée du registre. Le catalogue côté utilisateur : [Catalogue de textures](../api/texture-catalog.md).

## Méthodologie

Nous avons exécuté le propre module de construction du registre du moteur (29833 sur ce build, coordonnant les modules 1371 / 1391 / 1384 / 219) sur les données de textures du registre de blocs livré, dans un harnais webpack minimal, et enregistré sa sortie — ces chiffres sont **le calcul propre du bundle de production**, pas une réimplémentation.

## Structure de sortie

| Sortie | mesuré en v5 | Signification |
|---|---|---|
| `named` | **896** | noms référençables comme `bloxdTextureId<Name>` |
| `aliases` | 416 | orthographes repliées — 188 alias d'image (`lava0`…) et 228 alias de rotation (`chest_top[rot[1`…) |
| `layers` | 228 | la table de couches — dont 171 emplacements pré-rotés (57 racines × 4 rotations) |

## Règles de pliage

- **familles d'animation** (42) : les orthographes d'image (`lava0`–`lava7`) se replient vers le nom de base (`lava`) ; `bloxdTexel` renvoie l'image courante au moment de l'échantillonnage
- **familles de rotation** (57) : les emplacements tournés (`[rot[1..4`) se replient vers le nom racine ; `bloxdTexel` réapplique le `textureRotation` par face
- `radar_screen` est le seul nom appartenant aux deux familles à la fois (ses quatre copies pré-rotées portent chacune leur propre échelle de 4 images — d'où 45 racines d'animation dans l'atlas, et non 42)

## Dérive (cnty9 → ab90qa)

| Mesure | cnty9 (v4) | ab90qa (v5) |
|---|---|---|
| entrées d'atlas | 1,219 | **1,210** |
| familles de rotation (orthographes tournées) | 57 (228) | **57 (228) — inchangé** |
| familles d'animation (orthographes d'image) | 42 (188) | **42 (188) — inchangé** |
| constantes nommées utilisables | 905 | **896** |
| changements d'id parmi les noms survivants | — | **334 sur 905** |

La dérive complète (11 noms) : ajouté (1) `scorpion_eggs` ; retirés (10) les huit textures de coffre double plus `mob_spawner_hostile_block_side` / `mob_spawner_neutral_block_side` (le coffre double a quitté les données du jeu ; les générateurs conservent `mob_spawner_block_top`).

## Effet sur HEADER_VERSION

Le suffixe de hachage du registre enregistre les ids en dur, donc cette dérive marque **chaque pack sauvegardé « à revérifier »** (revalidé automatiquement au chargement de la page). Les packs écrits avec des noms survivent à la re-résolution ; les packs à ids bruts cassent ([Compatibilité](../api/compatibility.md)).

## Anciens relevés de dérive

La comparaison d'octobre entre deux builds (sjr0p7 → cnty9, 10 jours) : entrées 1200 → 1219 (98 ajoutées, 79 retirées) ; 779 des 1121 noms inchangés ont changé d'id (69 %) ; une migration de convention de nommage (suffixes `_rot1..4` → emplacements `[rot[1..4`) ; l'apparition du coffre double. Le relevé complet se trouve dans [Historique des versions : v4](../history/v4.md).

## Voir aussi

- [Catalogue de textures](../api/texture-catalog.md) · [Validation des shaders](shader-validation.md) · [Journal de recherche](research-log.md)

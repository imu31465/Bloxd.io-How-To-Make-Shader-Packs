# Intérieurs du registre des textures

> API cible : 5 · Build cible : `bbb6l5` (vérifié en production et preprod le 2026-11-20) · État : Verified

Cette page explique comment les noms de texture sont associés à des ID et résume l'évolution du registre entre les builds. La liste actuelle destinée aux auteurs de packs figure dans le [Catalogue des textures](../api/texture-catalog.md).

## Méthode de mesure

Nous avons recalculé le registre en exécutant le constructeur du build de production sur les données de texture livrées avec le jeu. L'empreinte obtenue, `32451195`, correspond à l'atlas préconstruit fourni avec `bbb6l5`. Il s'agit des résultats du moteur lui-même, pas d'une réimplémentation.

## Registre actuel

| Sortie | `bbb6l5` | Signification |
|---|---:|---|
| `named` | **1 017** | Noms disponibles sous forme de constantes `bloxdTextureId<Name>` |
| `aliases` | **776** | Autres graphies résolues vers un nom de base |
| `layers` | **1 650** | Nombre total de couches de l'atlas |
| Bandes de l'atlas | **7** | Six bandes complètes et une bande partielle |
| Familles de rotation | **64** | Noms possédant des variantes de rotation par face |
| Familles d'animation | **71** | Noms possédant des images animées |

Les alias d'animation comprennent les graphies habituelles des images et les graphies de transition qui mélangent deux images consécutives. `radar_screen` appartient aux deux familles, rotation et animation.

## Regroupement des noms

- **Animation :** les noms d'image comme `lava0`–`lava7` sont ramenés au nom de base `lava`. `bloxdTexel` choisit l'image courante lors de l'échantillonnage.
- **Rotation :** les emplacements comme `[rot[1`–`[rot[4` sont ramenés au nom de base. `bloxdTexel` applique le `textureRotation` de la face.
- **Transitions :** `frameA~frameB~interval` désigne un emplacement de l'atlas qui mélange deux images consécutives.

En WGSL, utilisez les constantes nommées. Ne figez pas les ID numériques : ils peuvent changer d'un build à l'autre même si le nom reste disponible.

## Évolution entre les builds

| Comparaison | Couches de l'atlas | Noms disponibles | Changement principal |
|---|---:|---:|---|
| `sjr0p7` → `cnty9` | 1 200 → 1 219 | — | 98 ajouts, 79 suppressions ; la convention de nommage des textures pivotées change |
| `cnty9` → `ab90qa` | 1 219 → 1 210 | 905 → 896 | Un nom ajouté et dix supprimés |
| `ab90qa` → `xkg8x` | 1 210 → 1 220 | 896 → 906 | Les dix noms supprimés au lancement de v5 sont rétablis |
| `xkg8x` → `bny9u` | 1 220 → 1 232 | 906 → 911 | Cinq noms ajoutés pour le Trading Terminal et le Stone Generator |
| `bny9u` → `v98qt8` | 1 232 → 1 227 | 911 → 906 | Un nom ajouté ; six textures quittent le registre lorsque leurs blocs deviennent des modèles |
| `v98qt8` → `bbb6l5` | 1 227 → 1 650 | 906 → 1 017 | 423 couches ajoutées ; familles de rotation et d'animation étendues ; régression corrigée |

De nombreux noms ont reçu de nouveaux ID à chaque mise à jour. Les constantes nommées évitent de dépendre de ces changements numériques.

## Régression de pliage de v98qt8 (corrigée)

Dans `v98qt8`, la table des textures animées utilisait des clés textuelles alors que la logique de pliage attendait des indices d'emplacement. Les noms de base des textures animées échouaient donc à la validation, et les noms de chaque image apparaissaient comme des constantes séparées, sans animation.

Le problème a été corrigé dans `bbb6l5` : la table utilise de nouveau des indices d'emplacement, les noms de base des animations passent la validation et l'empreinte du registre correspond à l'atlas livré. Cette section est conservée comme historique ; elle ne décrit pas le build actuel.

## Effet sur HEADER_VERSION

L'empreinte du registre entre dans `HEADER_VERSION`. Une modification du registre peut donc déclencher une nouvelle validation des packs. Les packs qui utilisent les noms sont résolus avec les nouveaux ID ; ceux qui codent les ID numériques en dur peuvent cesser de fonctionner. Voir [Compatibilité](../api/compatibility.md).

## Voir aussi

- [Catalogue des textures](../api/texture-catalog.md) — noms disponibles pour les packs
- [Internes de l'échantillonnage des textures](texture-sampling.md) — fonctionnement de l'échantillonnage
- [Journal de recherche](research-log.md) — méthode de mesure et historique des builds

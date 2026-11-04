# Journal de recherche

> État : Verified — comment les mesures de cette documentation ont été obtenues

Les énoncés techniques d'ici ne reposent pas sur la documentation officielle des développeurs, mais sur **l'analyse du bundle de production**. Cette page consigne la méthodologie et les preuves pour que les builds futurs puissent être revérifiés.

## Principes fondamentaux

1. **Récupération directe du bundle de production** — main.js et chunks bruts rapatriés depuis la production et la preprod, identité vérifiée par md5
2. **Respect du verbatim** — en-têtes, messages d'erreur et chaînes i18n **cités tels quels**, jamais paraphrasés
3. **Mesure reproduite** — les valeurs dérivées comme le registre sont recalculées en exécutant les propres modules du moteur dans un harnais (sortie réelle, pas une réimplémentation approximative)
4. **Builds nommés** — chaque mesure porte un id de build et une date

## Historique des builds référencés par cette documentation

| Build | API | Date | Note |
|---|---|---|---|
| `szby6g` | ère v3 | 2026-10-17 | première analyse statique allow/strict (111 définitions de jeu) |
| `3ymzdd` | v3 | 2026-10-20 | le build de preuve du guide v3 |
| `sjr0p7` | ère v3 | 2026-10-17 | base de comparaison de dérive |
| `cnty9` | v4 | 2026-10-27 | preuve du guide v4 & du catalogue à 905 noms |
| `6pf78` / `tcwczu` | v4 | 2026-10-31 | confirmation du gel de la v4 (événement Halloween + refonte de Skyblock) |
| `ab90qa` | **v5** | 2026-11-03 | build de lancement de la v5 ; base de référence d'origine de la v5. prod = preprod (md5 `fc3322212d15be2445c0e8dfc9733fcc`) |
| `xkg8x` | **v5** | 2026-11-04 | **actuel** ; référence de cette documentation. main de prod ≠ main de preprod (`2lcqcl`), mais chaque surface de shader pack mesurée identique |

## Méthodologie clé

### Restauration de l'en-tête du moteur

Évaluation du template d'en-tête c55 avec ses interpolations réelles (`${vC}` = apiVersion, les 5 lectures d'uniform via `${Gq.j}`) — 6 interpolations en v5 ([En-tête du moteur](engine-header.md)).

### Recalcul du registre de textures

Exécution des modules de construction du registre du moteur (29833 + 1371 + 1391 + 1384 + 219) sur les données de textures du registre de blocs livré, dans un harnais webpack minimal ; enregistrement de la sortie (named 906 / aliases 416 / layers 228 sur le build actuel `xkg8x`, 2026-11-04 — modules 30093 + 1391 ; 896 au lancement de la v5) ([Registre des textures](texture-registry.md)).

Les intervalles d'animation viennent de la table façon `animDataPerTex` (`numAnimStates` / `animationInterval` par couche) — seules trois valeurs d'intervalle existent : 200 / 250 / 300 ms ([le catalogue](../api/texture-catalog.md#familles-danimation-42-noms)).

### Capture des messages d'erreur

Messages du chargeur verbatim depuis le dictionnaire i18n en production ; messages du validateur depuis les littéraux de chaînes du module de validation.

### Analyse statique allow / strict

Analyse statique de toutes les 111 définitions de jeu : littéraux `"allow"` de `shaderPackPolicy` — 8 directs + 4 par variable de base = 12 titres (26 entrées), l'héritage par spread (`{...tb,...}`) étant aussi suivi ([Politique](policy.md)).

### Restauration de l'uniform / du pipeline

L'agencement des champs de `BloxdPackInputs` depuis le module d'agencement d'uniform (29838) ; le codegen des textures à 3 variantes depuis le générateur WebGPU (c56) ([Échantillonnage des textures](texture-sampling.md)).

## Observations de dérive

| Comparaison | Période | Résultat |
|---|---|---|
| sjr0p7 → cnty9 | 10 jours | 98 ajoutés, 79 retirés ; 779/1121 noms ont changé d'id (69 %) |
| cnty9 → ab90qa | 7 jours | +1 (scorpion_eggs), −10 (coffre double ×8, côtés de spawner ×2) ; 334/905 noms ont changé d'id |
| ab90qa → xkg8x | 1 jour | +10 (tous les retraits du lancement de v5 sont revenus : coffre double ×8, côtés de spawner ×2) ; 376/896 noms ont changé d'id ; aucun retiré |

## Non vérifié / spéculatif

- Présenter les cartes d'ombres au pixel près comme « plans futurs » est une **interprétation** (déduite de la `var shadow: f32 = 1.;` inutilisée dans le template d'éclairage)
- La répartition allow/strict peut changer à chaque build (identité des 12 titres reconfirmée sur ab90qa et xkg8x ; jeux futurs inconnus)
- `bloxdFragmentBlockPosition` (absent de l'en-tête v5) : entrée dans la table des signatures et injection à l'exécution toutes deux confirmées en production — les appels valident et compilent ; on ne sait pas si l'équipe moteur a l'intention de le garder

## Quand revérifier

À la détection d'une mise à jour du jeu (un nouveau hash de main.js) : revérifier l'en-tête (9 125 o), la constante apiVersion, recalculer le registre et reconfirmer la liste allow/strict. La méthodologie de surveillance détaillée sort du périmètre de cette documentation, mais les emplacements de modules ci-dessus (c55 / c116 / c56) sont les points de départ.

## Voir aussi

- [Relevé des données du moteur](engine-data.md) · [Registre des textures](texture-registry.md) · [Historique des versions](../history/)

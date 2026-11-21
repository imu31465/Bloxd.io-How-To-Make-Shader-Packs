# Relevé des données du moteur

> API cible : 5 · Build cible : `bbb6l5` (vérifié en production et preprod le 2026-11-20) · État : Verified

Ce relevé rassemble les valeurs confirmées de l'API visible par les shader packs sur le build actuel. Les détails internes du bundle, tels que les ID de modules et de chunks, ne font pas partie de la spécification et sont donc omis.

## Spécification actuelle

| Élément | Valeur |
|---|---|
| `apiVersion` | `5` (comparaison stricte avec un nombre) |
| En-tête du moteur | 216 lignes ; texte intégral dans [En-tête du moteur](engine-header.md) |
| Hooks | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| Variantes | 6 (strict × terrain / liquid / model) |
| Macros | `BLOXD_STRICT`, `BLOXD_ALPHA`, `BLOXD_SCENE_DEPTH` ; `BLOXD_LIGHTING` a été supprimée en v5 |
| Uniform du pack | 80 octets : `seconds` @0, `lit` @4, `renderOffset` @16, `sunDirection` @32, `eyePosition` @48, `shadowDirection` @64 |
| Binding du pack | `@group(3) @binding(0)` ; `minBindingSize` 80 |
| Flags | structure `BloxdFlags` avec 14 champs booléens |
| Atlas de textures | 1 650 couches ; 1 017 noms ; 776 alias |
| Familles de textures | 64 familles de rotation et 71 d'animation |
| Identifiants réservés | noms correspondant à `/^bloxd/i` et 88 symboles internes `bloxdSp*` |
| Définitions de jeux | 119 |
| Politique des shader packs | 12 titres autorisés, 28 entrées ; voir la [Politique par jeu](policy.md) |
| Modèle de pack par défaut | 1 633 octets |
| Limites du chargeur | 256 fichiers WGSL / 256 Ko de code / 64 Ko pour `pack.json` / ZIP de 32 Mo / 1 024 entrées |

## Changements de bbb6l5

`bbb6l5` conserve `apiVersion: 5`, mais étend l'API visible par les packs :

- `bloxdShadow()`, `bloxdAirShadow(t)` et `bloxdShadowDirection()` exposent le système d'ombres du soleil et de la lune calculé par le moteur.
- L'uniform reçoit `shadowDirection: vec3f` à l'offset 64 et passe de 64 à 80 octets.
- `pack.json` accepte le booléen facultatif `keepCircleShadows` pour conserver les anciennes ombres circulaires.
- L'atlas passe de 1 227 à 1 650 couches et de 906 à 1 017 noms disponibles.
- La régression de pliage des constantes de texture introduite dans `v98qt8` est corrigée.

Les détails et les preuves de ces mesures figurent dans le [Journal de recherche](research-log.md) et les [Intérieurs du registre des textures](texture-registry.md).

## Versions antérieures

- [Historique des versions](../history/) — changements et migrations des anciennes API
- [Journal de recherche](research-log.md) — méthode et références des mesures

## Voir aussi

- [En-tête du moteur](engine-header.md) — texte intégral de l'en-tête
- [Politique par jeu](policy.md) — titres soumis aux politiques allow / strict
- [Registre des textures](texture-registry.md) — noms et attribution des ID

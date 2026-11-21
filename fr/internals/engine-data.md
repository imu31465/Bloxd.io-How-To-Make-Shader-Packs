# Relevé des données du moteur

> API cible : 5 · État : Analyzed

Cette page résume l'API disponible pour les shader packs. Consultez la [Référence API](../api/) pour les détails d'utilisation.

## Surface de l'API

| Élément | Spécification |
|---|---|
| Version de l'API | `5` |
| En-tête du moteur | 216 lignes ; voir l'[en-tête du moteur](engine-header.md) |
| Hooks | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| Variantes | 6 (strict × terrain / liquid / model) |
| Macros | `BLOXD_STRICT`, `BLOXD_ALPHA`, `BLOXD_SCENE_DEPTH` |
| Uniform du pack | 80 octets ; voir le [format du pack](../api/pack-format.md) |
| Champs de l'uniform | `seconds` @0, `lit` @4, `renderOffset` @16, `sunDirection` @32, `eyePosition` @48, `shadowDirection` @64 |
| Noms de textures | Les constantes utilisables figurent dans le [catalogue de textures](../api/texture-catalog.md) |

## API des ombres

- `bloxdShadow()` renvoie le facteur d'ombre solaire/lunaire calculé par le moteur.
- `bloxdAirShadow(t)` évalue l'ombre en un point entre la caméra et le fragment.
- `bloxdShadowDirection()` renvoie la direction de la lumière qui produit l'ombre.
- `keepCircleShadows` est un champ booléen facultatif de `pack.json` qui conserve les anciennes ombres circulaires.

## Pages associées

- [Référence API](../api/) — API accessible aux packs
- [Format du pack](../api/pack-format.md) — manifeste, uniform et limites du chargeur
- [Politique par jeu](policy.md) — restrictions propres à chaque jeu

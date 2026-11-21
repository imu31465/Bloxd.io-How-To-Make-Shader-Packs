# Données du moteur

> API cible : 5 · Usage : résumé des spécifications

Cette page résume l'API accessible aux shader packs et les limites importantes lors de la création d'un pack. Consultez les références correspondantes pour les définitions et les exemples.

## Vue d'ensemble de l'API

| Élément | Spécification |
|---|---|
| Version de l'API | `5` |
| Hooks | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| Variantes | 6 (allow / strict × terrain / liquid / model) |
| Macros | `BLOXD_STRICT`, `BLOXD_ALPHA` et `BLOXD_SCENE_DEPTH`. `BLOXD_LIGHTING` n'est pas disponible |
| Uniform du pack | 80 octets. Voir [Format du pack](../api/pack-format.md) pour les offsets |
| Textures | Utilisez les constantes nommées au format `bloxdTextureId<Name>`. Ne figez jamais les ID numériques |
| Noms réservés | Les identifiants commençant par `bloxd` sont réservés au moteur |

## Limites du pack

| Élément | Limite |
|---|---:|
| Fichiers WGSL | 256 |
| Total des sources WGSL | 256 KB |
| `pack.json` | 64 KB |
| Archive ZIP | 32 MB |
| Entrées ZIP | 1 024 |

Placez un seul manifeste à la racine du ZIP et enregistrez les fichiers en UTF-8. Les chemins dupliqués et les formats ZIP non pris en charge sont refusés. Voir [Format du pack](../api/pack-format.md) pour plus de détails.

## Principales fonctions de l'API v5

- `bloxdShadow()` et `bloxdAirShadow(t)` exposent les informations d'ombre du soleil et de la lune.
- `bloxdShadowDirection()` renvoie la direction de la lumière qui projette l'ombre.
- Définissez le champ facultatif `keepCircleShadows` de `pack.json` sur `true` pour conserver les ombres circulaires traditionnelles tout en utilisant l'API d'ombre.
- Vérifiez l'éclairage à l'exécution avec `bloxdLit()` ; la macro `BLOXD_LIGHTING` n'est pas prise en charge.

## Voir aussi

- [Référence de l'API](../api/) — fonctions, structures et constantes
- [Format du pack](../api/pack-format.md) — manifeste, uniform et limites du chargeur
- [Catalogue de textures](../api/texture-catalog.md) — noms de textures disponibles
- [Politique par jeu](policy.md) — couverture allow / strict
- [Guide de migration de l'API v4](../history/v4.md) — migration depuis la version précédente

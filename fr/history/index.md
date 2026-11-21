# Historique des versions

> Type : historique · Guides de migration des API v1 à v5

Cette section conserve les changements, les étapes de migration et les API supprimées des versions v1 à v5. Elle se concentre sur le comportement des API et les chemins de migration, pas sur les identifiants de build ni les dates de vérification.

## Versions

| Version | Guide de migration | Principaux changements |
|---|---|---|
| v1 | [v1](v1.md) | API initiale des shader packs |
| v2 | [v2](v2.md) | Renommage des identifiants, `blockId` et accès à la profondeur de scène |
| v3 | [v3](v3.md) | `blockFlags`, `bloxdPi` / `bloxdTau` et hooks Liquid |
| v4 | [v4](v4.md) | API de textures et restrictions des jeux strict |
| **v5** | [v5](v5.md) | **Actuelle** — `BloxdFlags`, hooks Model et API d'éclairage et d'ombre |

## Traitement des anciennes versions

Le jeu actuel n'accepte que les packs avec `apiVersion: 5`. Les anciens packs ne peuvent pas être chargés sans modification. Pour migrer entre plusieurs versions, appliquez les guides dans l'ordre, en commençant par la version la plus ancienne.

## Parcours de migration

- Pack v4 → [guide de migration v5](v5.md)
- Pack v3 → [v4](v4.md) → [v5](v5.md)
- Pack v2 → [v3](v3.md) → [v4](v4.md) → [v5](v5.md)
- Pack v1 → [v2](v2.md) → [v3](v3.md) → [v4](v4.md) → [v5](v5.md)

Pour consulter l'API actuelle, voir la [Référence de l'API](../api/).

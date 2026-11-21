# Internes du registre de textures

> API cible : 5 · État : Analyzed

Cette page explique comment les noms de textures sont résolus et référencés par les shader packs. Pour connaître les noms disponibles pour les auteurs de packs, consultez le [catalogue de textures](../api/texture-catalog.md).

## Constantes nommées

Les packs doivent utiliser les constantes nommées au format `bloxdTextureId*`. Les noms de textures sont résolus dans le registre au chargement du pack ; il n'est donc pas nécessaire de coder en dur des ID numériques.

**Considérez les noms comme l'API et ne dépendez pas des ID numériques.** L'organisation de l'atlas et les ID sont des détails d'implémentation susceptibles de changer.

## Textures animées

Référencez les textures animées par le nom de base de leur famille, pas par un numéro d'image. Le moteur sélectionne l'image actuelle lors de l'échantillonnage ; le pack n'a donc pas à faire avancer les images lui-même.

Les écritures correspondant aux images ne sont pas des constantes nommées indépendantes destinées à l'usage général. Utilisez les noms de base du catalogue.

## Textures tournées

La rotation propre à chaque face est appliquée lors de l'échantillonnage. Les packs n'ont pas besoin de sélectionner directement les emplacements internes de l'atlas déjà tournés.

## Conseils d'échantillonnage

- Choisissez les noms dans le [catalogue de textures](../api/texture-catalog.md).
- Évitez de dépendre des ID numériques ou de l'organisation interne de l'atlas.
- En règle générale, laissez le moteur gérer l'animation et la rotation des faces lors de l'échantillonnage.

## Pages associées

- [API de textures](../api/texture-api.md) — `bloxdTexel` et constantes nommées
- [Catalogue de textures](../api/texture-catalog.md) — noms de textures utilisables
- [Journal de recherche](research-log.md) — lire les notes d'enquête

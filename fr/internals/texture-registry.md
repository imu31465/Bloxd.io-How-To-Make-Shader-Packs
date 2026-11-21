# Fonctionnement du registre de textures

> API cible : 5 · Usage : références aux textures par nom

Les shader packs référencent les textures à l'aide de constantes nommées, et non d'ID numériques. Les constantes utilisent le format `bloxdTextureId<Name>`. Consultez le [Catalogue de textures](../api/texture-catalog.md) pour connaître les noms disponibles.

## Résolution des noms

Lors du chargement d'un pack, le chargeur résout chaque constante nommée à partir des noms de texture disponibles. Si l'organisation interne change mais que le nom reste disponible, le pack peut continuer à référencer cette texture par son nom.

**N'inscrivez pas directement d'ID numériques de texture dans le WGSL.** Les ID internes et les positions dans l'atlas peuvent changer lorsque le contenu du jeu est mis à jour. Les constantes nommées rendent le code du pack indépendant de ces positions internes.

## Animation et rotation

- **Animation :** utilisez le nom de base, comme `lava`, plutôt que les noms d'image tels que `lava0`–`lava7`. L'échantillonnage sélectionne l'image courante.
- **Rotation :** utilisez le nom de base indiqué dans le catalogue plutôt que les emplacements de rotation internes. L'échantillonnage applique la rotation de la face.
- **Transitions entre images :** le moteur possède des emplacements internes pour interpoler entre deux images d'animation adjacentes. Les packs doivent continuer à utiliser les constantes nommées habituelles.

## Voir aussi

- [Catalogue de textures](../api/texture-catalog.md) — noms et constantes disponibles
- [API de textures](../api/texture-api.md) — recherche et échantillonnage des textures
- [Internes de l'échantillonnage des textures](texture-sampling.md) — fonctionnement de l'échantillonnage

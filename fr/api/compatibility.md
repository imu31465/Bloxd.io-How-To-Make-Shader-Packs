# Compatibilité

> API cible : 5 · Type : référence de l'API

Cette page explique les versions de l'API des shader packs acceptées par le jeu actuel et le traitement des packs enregistrés pour les versions antérieures.

## Version d'API acceptée

Le jeu actuel accepte uniquement les packs dont le manifeste contient la valeur numérique `5` dans `apiVersion`. La chaîne `"5"` n'est pas acceptée. Les packs créés pour les API v1 à v4 doivent être migrés avant de pouvoir être chargés.

## Messages au chargement

- `pack.json needs "apiVersion": {{version}}.` — la clé `apiVersion` est absente
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — la version indiquée ne correspond pas à la version actuelle

## Packs enregistrés pour les versions précédentes

Un pack enregistré pour une ancienne version de l'API ne s'exécutera pas dans le jeu actuel. L'écran des paramètres des shader packs indique que le pack utilise une version non prise en charge. Mettez-le à jour en suivant le guide de migration correspondant.

## Revalidation des packs enregistrés

Les packs enregistrés sont revalidés lorsque les en-têtes fournis par le moteur ou les définitions des noms de texture changent. Cette revalidation s'effectue automatiquement au chargement du jeu. Dans le code du pack, référencez les textures à l'aide de constantes nommées plutôt que d'ID numériques susceptibles de changer.

## Compatibilité de l'environnement

- **WebGPU :** les shader packs nécessitent un moteur de rendu compatible avec WebGPU.
- **Mobile :** les shader packs ne sont pas disponibles dans les environnements sans prise en charge de WebGPU ([Prérequis](../getting-started/requirements.md)).
- **Accès aux textures :** dans les configurations de rendu qui n'utilisent pas l'atlas, `bloxdTexel` et `bloxdTextureSize` ne donnent pas accès normalement aux textures de l'atlas ([API de textures](texture-api.md)).

## Prise en charge des versions de l'API

| Version de l'API | Prise en charge par le jeu actuel |
|---|---|
| v1 | Refusée au chargement |
| v2 | Refusée au chargement |
| v3 | Refusée au chargement |
| v4 | Refusée au chargement |
| **v5** | **Actuelle** |

## Voir aussi

- [Migration de v4 vers v5](../history/v5.md)
- [Historique des versions](../history/)

# Compatibilité

> API cible : 5 · Build cible : `bny9u` (vérifié en production le 2026-11-05) · État : Verified

Comment le jeu actuel et les packs d'anciennes versions interopèrent.

## Versions acceptées

**Uniquement `apiVersion: 5`.** Le chargeur compare `manifest.apiVersion !== 5` strictement et les packs v1/v2/v3/v4 **échouent à l'instant même du chargement**. Il n'existe aucune acceptation multi-versions.

## Messages au moment du chargement (verbatim du dictionnaire i18n en production)

- `pack.json needs "apiVersion": {{version}}.` — la clé `apiVersion` est manquante
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — la clé existe mais ne vaut pas 5

## Anciens packs sauvegardés (sans exception — désactivation silencieuse)

Les packs v1–v4 sauvegardés auparavant ne lèvent pas d'erreur. Le résultat du pack sauvegardé se résout en :

```
{kind: "none", reason: "otherApiVersion"}
```

et le pack devient **silencieusement inactif**. Seul l'onglet des réglages de shader packs explique pourquoi :

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

## La nature de la conversion v4 → v5

La conversion est pour l'essentiel mécanique (liste complète dans [le guide de migration vers v5](../history/v5.md)) :

- `blockFlags & bloxdBlockFlagX != 0u` → `flags.x` (un renommage 1:1)
- `#ifdef BLOXD_LIGHTING` → `if (bloxdLit()) { ... } else { return bloxdDefaultLight(...); }`
- les points d'appel à `bloxdFragmentBlockPosition` compilent toujours (le moteur l'injecte), mais il n'est plus documenté désormais — en migrer est le choix sûr ([Fonctions](functions.md#bloxdfragmentblockposition--non-documentée-mais-toujours-injectée))
- passez `pack.json` à `"apiVersion": 5`

Le piège silencieux cette fois : les packs qui continuent de lire `blockFlags` ou d'encadrer les hooks de lumière dans `#ifdef BLOXD_LIGHTING` **échouent à la validation avec des messages dédiés** (l'analyseur explique désormais les deux cas), donc rien ne dysfonctionne en silence — ils restent simplement refusés jusqu'à leur migration.

## Revalidation des packs sauvegardés (« à revérifier »)

`HEADER_VERSION` vaut `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` (l'entier initial est passé du 8 de v4 à 9). Quand l'en-tête du moteur ou le registre de textures change (fréquent avec les mises à jour du jeu), les packs sauvegardés sont marqués « à revérifier » et se revalident automatiquement au chargement de la page.

Un exemple mesuré du mouvement du registre (deux builds, à 10 jours d'écart) : entrées 1200 → 1219 (98 ajoutées, 79 retirées), et parmi les noms ayant conservé leur orthographe, **779 sur 1121 ont changé d'id**. Autrement dit :

- **les packs écrits avec des noms (`bloxdTextureIdLava`) survivent à la dérive** (le chargeur les résout de nouveau contre le registre en production)
- **les packs écrits avec des ids bruts (`19`) cassent à la revalidation**

Détails : [Intérieurs du moteur : Registre de textures](../internals/texture-registry.md).

## Environnements d'exécution

- **Renderer WebGPU uniquement** : installer un pack force l'activation du renderer WebGPU
- **Mobile** : les environnements à WebGPU limité ne peuvent pas du tout exécuter de packs ([Prérequis](../getting-started/requirements.md))
- **Configurations de renderer sans atlas** : `bloxdTexel` / `bloxdTextureSize` se dégradent en stubs (texels blancs, 1×1) ; le code compile et s'exécute toujours ([API de textures](texture-api.md#là-où-lapi-de-textures-ne-peut-pas-aller))

## Récapitulatif de la prise en charge des versions

| Version d'API | En production depuis | Traitement par le jeu actuel |
|---|---|---|
| v1 | — | rejeté au chargement (migrer via [v2](../history/v2.md)) |
| v2 | — | rejeté au chargement |
| v3 | 2026-10-19 | rejeté au chargement |
| v4 | 2026-10-26 | rejeté au chargement |
| **v5** | **2026-11-03** | **actuelle** |

## Voir aussi

- [Checklist de migration vers v5](../history/v5.md) · [Historique des versions](../history/)

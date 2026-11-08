# FAQ et notes légales

> API cible : 5 · Build cible : `v98qt8` (2026-11-08, production et preprod) · État : Verified

## Questions fréquentes

### Q. Les shader packs sont-ils une fonctionnalité officielle ?

La fonctionnalité de shader pack est accessible depuis l'interface du jeu et la création de packs semble être une activité prévue. Aucune documentation officielle publique n'a toutefois été trouvée — ce guide est un document non officiel, fondé sur l'analyse.

### Q. Les packs peuvent-ils faire quelque chose de dangereux ?

Les packs sont du WGSL pur — **l'exécution de JS et l'accès réseau sont impossibles par conception**. Seul le code qui passe la validation et la compilation s'exécute ([Restrictions](../api/restrictions.md)).

### Q. Dans quels jeux les packs fonctionnent-ils ?

La plupart des jeux tournent en mode strict (pas d'animation de sommets, pas de `discard`). L'animation de sommets ne fonctionne que dans les jeux de la liste allow. La liste par titre est dans [Engine Internals : policy](../internals/policy.md).

### Q. Les packs fonctionnent-ils sur mobile ?

Uniquement sur les environnements capables de WebGPU ([Prérequis](../getting-started/requirements.md)).

### Q. Puis-je livrer mes propres textures ?

Pas dans un shader pack (l'atlas est en lecture seule). C'est le travail du système de texture pack ([combinaisons](../guides/combinations.md)).

### Q. Puis-je continuer à utiliser un pack d'une ancienne version ?

Le jeu actuel n'accepte que `apiVersion: 5` ; les packs plus anciens sont désactivés silencieusement ([Compatibilité](../api/compatibility.md)). Migrez via l'[Historique des versions](../history/).

### Q. L'API changera-t-elle encore ?

Les internals du moteur peuvent changer avec les mises à jour — chaque page nomme son build cible. Les packs sauvegardés se revalident automatiquement quand l'en-tête ou le registre change ([Compatibilité](../api/compatibility.md#revalidation-des-packs-sauvegardés--à-revérifier-)).

### Q. Qu'en est-il des distributions « cinematic shader » ?

Une distribution communautaire « cinematic shader » que nous avons analysée s'est révélée être un texture pack (textures 128×128, sans `pack.json` / `.wgsl`). La plupart des looks « ombrés façon shader » sont de l'artisanat côté textures ([combinaisons](../guides/combinations.md)).

## Légal et notes

- Ceci est un guide non officiel et ne représente pas l'opinion des développeurs. L'API peut changer sans préavis
- Créé avec l'aide d'une IA ; l'exactitude n'est pas garantie. Vérifiez par rapport au comportement réel en jeu
- Les valeurs mesurées (ids de texture etc.) sont des instantanés de builds précis et changent entre builds ([les noms sont l'API](../api/texture-catalog.md#dérive-mesurée-cnty9--ab90qa))

## Voir aussi

- [Entrée de la documentation](../) · [Historique des versions](../history/)

# Validation des shaders

> API cible : 5 · Build cible : `bny9u` · État : Analyzed (restauré depuis le validateur en production)

La validation statique (l'analyseur, étape 1 du contrôle de chargement). Les correctifs côté utilisateur : [Erreurs de validation](../troubleshooting/validation.md).

## Les étapes

1. **Limites du chargeur** (zip / forme du pack.json) → [Format du pack](../api/pack-format.md)
2. **Validation statique (analyseur)** — cette page ; syntaxe, types, noms réservés, contrats de hooks à travers les 6 variantes
3. **Compilation réelle dans le navigateur** → [Compilation WGSL](wgsl-compilation.md)
4. **Revalidation à l'exécution à l'entrée en jeu** — compile réellement chaque matériau de terrain existant (plus stricte que le contrôle de l'écran de réglages) ; son échec exclut le pack de ce jeu

## La table de signatures des fonctions spéciales

Le validateur tient une table dans le module 29849 et vérifie les restrictions d'appel entre hooks :

```js
const Jq = new Map([
  ["bloxdFragmentBlockPosition", { params: "position: vec3f, normal: vec3f", returns: "vec3i", symbol: null, vertex: true }],
  ["bloxdOpaqueBehind", { params: "", returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }],
  ["bloxdTexel", { params: "textureId: u32, uv: vec2f, mipLevel: f32", returns: "vec4f", symbol: null }],
  ["bloxdTextureSize", { params: "mipLevel: f32", returns: "vec2u", symbol: null }],
]);
```

Logique restaurée :

- appeler une fonction spéciale non `vertex: true` depuis un hook de vertex → *« X reaches Y, which only surface and light hooks can use. »*
- une fonction dotée d'un `symbol` (`bloxdOpaqueBehind` → `BLOXD_SCENE_DEPTH`) atteinte depuis une variante qui ne définit pas cette macro → *« X reaches Y, which needs BLOXD_SCENE_DEPTH, and Z doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH. »*

Note : `bloxdFragmentBlockPosition` a disparu de la génération de l'en-tête, mais son entrée demeure dans cette table en production — et c'est cette table que le contrôle des identifiants consulte, donc les appels passent toujours la validation. Le générateur de code continue également d'injecter la définition (terrain/liquide et les deux programmes de modèle), donc la fonction reste appelable en pratique. Considérée comme dépréciée : non documentée, et susceptible d'être retirée dans n'importe quelle version future.

## Diagnostics des noms réservés

- **la règle générale `/^bloxd/i`** : *« Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light> »*
- **les déclarations directes de texture/sampler** : *« Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel. »*

## Résolution des noms de textures & diagnostics

La résolution `bloxdTextureId*` possède un chemin dédié ([les messages](../api/texture-api.md#erreurs-de-résolution-de-noms-verbatim-depuis-le-validateur)) :

- **pliage** : découpage sur les non-alphanumériques, CamelCase, préfixe `bloxdTextureId` ; la correspondance inverse est insensible à la casse et aux underscores
- **suggestions d'orthographe** (nouveau en v5) : les noms sans correspondance reçoivent des propositions Levenshtein au seuil `max(2, floor(len/4)) + 1`
- messages dédiés pour les orthographes d'image et les orthographes de copie tournée
- les noms ambigus après pliage sont inutilisables

## Les nouveaux diagnostics de la v5

- *« BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead. »* — nomme la macro retirée
- les packs lisant `blockFlags` ou référençant `bloxdBlockFlag*` échouent au diagnostic des noms réservés — **aucun pack ne dysfonctionne silencieusement**

## La réécriture des dérivées en Y

La passe de réécriture de jetons de l'analyseur réécrit chaque appel `dpdy` / `dpdyCoarse` / `dpdyFine` en `(-dpdy(...))` (la famille dpdy est explicitement énumérée comme l'ensemble d'inversion). `dpdx` et `fwidth` restent intouchés ([Restrictions](../api/restrictions.md#réécritures-automatiques)).

## Génération de l'en-tête & des constantes de textures

- l'en-tête est préfixé en lecture seule ([En-tête du moteur](engine-header.md))
- le bloc `bloxdTextureId*` est généré **par pack** à partir des noms référencés

## HEADER_VERSION

`HEADER_VERSION` vaut `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` (entier de tête passé de 8 à 9 depuis la v4). Les deux suffixes fnv1a32 prennent l'empreinte du matériau d'en-tête et du registre nom-id trié. La revalidation des packs sauvegardés utilise cette empreinte pour décider « à revérifier » ([Compatibilité](../api/compatibility.md#revalidation-des-packs-sauvegardés--à-revérifier-)).

## Stubs de validation

Le code qui passe la validation statique reçoit du code stub synthétisé avant le vrai contrôle WGSL du navigateur : `var<private> bloxdValidationP: vec4f` plus `bloxdValidateVertex` / `bloxdValidateFragment` — la table de stubs de types (`bool` → `p.x > 0.0`, `vec3f` → `p.xyz`, …) construit les structs d'entrée et invoque les hooks. Détails : [Compilation WGSL](wgsl-compilation.md).

## Voir aussi

- [Erreurs de validation](../troubleshooting/validation.md) · [Compilation WGSL](wgsl-compilation.md) · [Registre des textures](texture-registry.md) · [Relevé des données du moteur](engine-data.md)

# Restrictions & noms réservés

> API cible : 5 · Build cible : `ab90qa` · État : Verified (limites de v4 reconfirmées identiques octet par octet sur v5)

Ce que les packs ont le droit d'écrire, et les règles complètes de réservation de noms.

## Autorisé

- les fonctions intégrées WGSL (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select`, …)
- vos propres `fn` / `struct` / `const` / `alias` / `var<private>`, les `let` dans les fonctions et le contrôle de flux (if/for/while/switch…)
- les dérivées (`dpdx` / `dpdy` / `fwidth`) uniquement dans les hooks surface/light (étape de fragment) — pas dans les hooks de vertex
- les tableaux `const` (LUT de couleurs etc.), les pointeurs (`ptr<function, T>`), les matrices (`mat3x3f` etc.)
- les définitions de flags `#define NAME` (sans valeur) + les conditionnels `#ifdef`

## Interdit / mises en garde

- **Pas de textures directes** : impossible de déclarer des types `texture_*` / `sampler` ; les lectures de l'atlas passent uniquement par [`bloxdTexel`](texture-api.md). *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*
- **`discard` est interdit en strict** — à encadrer dans `#ifndef BLOXD_STRICT`
- `@attributes` / `enable` / `requires` / `override` sont interdits — pas de `enable f16;`, donc **pas de types f16**
- pas de `@builtin`, donc `fragCoord` / `vertex_index` sont inaccessibles
- **pas de `let` à portée de module** — utilisez `const` ou `var`
- pas d'`atomic`
- **ne construisez jamais les structures de sortie directement** : `BloxdLight(...)` échoue à la validation statique ; partez des `bloxdDefault*`
- un simple `var x: BloxdSurface;` est une erreur de validation
- les paramètres des hooks sont en lecture seule — copiez-les avant de les modifier
- `#define` ne prend pas de valeur (des noms uniquement)

## Noms réservés

### Le préfixe bloxd (règle générale)

**Tout identifiant correspondant à `/^bloxd/i` (sans distinction de casse) est réservé.** Les seules exceptions sont les 9 noms de fonctions hook.

Formulation du validateur, mot pour mot :

> *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*

### L'espace de noms bloxdSp* (46 symboles)

Les 46 symboles que le générateur de code peut injecter et qui ne peuvent donc pas être redéclarés :

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

Ils couvrent la livraison de la structure de flags (`bloxdSpFlags`), les entrées d'enchantement et locales au modèle (`bloxdSpEnchant` / `bloxdSpItemLocalPosition`), le chemin de pack de textures à échantillonnage par cellule, la chaîne de rotation et les variables locales des hooks étendus. **La règle de réservation au niveau du pack est plus large que cette liste** (tout ce qui correspond à `/^bloxd/i`), donc inutile de la mémoriser — ne commencez simplement jamais vos propres noms par `bloxd`.

### Noms de texture

Les identifiants commençant par `bloxdTextureId` sont résolus comme des constantes de nom de texture ([API de textures](texture-api.md#bloxdtextureid--constantes-de-noms-de-textures)).

## Réécritures automatiques

- **Inversion du signe de la dérivée en Y** : l'analyseur réécrit tout appel à `dpdy`, `dpdyCoarse` et `dpdyFine` en `(-dpdy(...))` (la famille dpdy est explicitement énumérée comme ensemble d'inversion dans la passe de réécriture de jetons du validateur). Le y en espace écran pointe vers le bas, donc cette inversion fait correspondre « taux de variation vers le haut » avec l'intuition. Écrivez `dpdy(h)` avec l'intention « comment h varie quand je monte » et le code émis porte l'inversion. `dpdx` et la famille `fwidth` restent inchangés

## Diagnostics que vous verrez vraiment

- *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*
- *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*
- *"X reaches bloxdTexel, which only surface and light hooks can use."*
- *"X reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and Y doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH."*
- *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## Voir aussi

- [Dépannage : compilation](../troubleshooting/compilation.md) · [Intérieurs du moteur : Validation des shaders](../internals/shader-validation.md)

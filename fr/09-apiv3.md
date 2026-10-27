[← Partie précédente](08-apiv2.md)·[Retour au manuel](README.md)

# Partie IX : Guide de migration vers API Version 3

> **Remplacée le 2026-10-26 : l'API actuelle est la version 4** — les packs v3 sont refusés au chargement exactement comme décrit ici pour la v2. Appliquez cette partie *puis* la [partie X](10-apiv4.md) (v3 → v4 : API de textures, renommage `fogAlpha`, `bloxdFragmentBlockPosition`, `hit`).

Build visé : `3ymzdd.main.fae4743f.js` — **le build de production en ligne depuis le 2026-10-19**. Le bundle servi par bloxd.io en production est identique octet pour octet (vérifié par md5, bundle principal et chunks de packs de shaders compris) au déploiement de préprod sur lequel cette partie a été étudiée à l'origine ; tout ce qui suit s'applique donc tel quel à la production. Le modèle de pack conserve sa forme v2 (mêmes champs `pack.json`, mêmes limites du chargeur, même disposition des uniforms).

Les parties I à VII de ce guide restent écrites sur la base v2. Cette partie rassemble, dans le même ordre que la [partie VIII](08-apiv2.md), les points de migration v2 → v3 et les nouveautés v3. La conversion est surtout mécanique (§47), mais un seul changement modifie réellement le comportement — la lumière par défaut atténue désormais l'émission avec le brouillard (§43) — et `blockId` est entièrement remplacé par `blockFlags` (§42) : vérifiez donc toujours par une compilation en jeu avant distribution.

Nouveau dans cette révision : les sections **§49 à §54** dépassent la migration elle-même pour décrire des rouages du moteur restaurés depuis le build de production — la façon dont le rendu Lite appelle réellement vos hooks, la vraie fonction de brouillard à quatre modes, l'implémentation exacte de `bloxdOpaqueBehind()`, le trajet complet de `blockFlags` depuis l'enregistrement du bloc jusqu'à votre hook, et la chaîne de validation avec son hash d'en-tête mesuré. Ce sont les faits publics les plus profonds documentés à ce jour sur le système de packs, et ils tranchent plusieurs questions que d'autres guides listent encore comme ouvertes.

## 40. Le sort des packs v2 (d'abord la conclusion)

**Mise à jour du 2026-10-19 : la v3 a quitté la préprod et c'est désormais elle que sert le site en ligne.** Tous les packs v2 enregistrés avant le déploiement — y compris tous les packs distribués en v2 — échouent maintenant en production exactement comme décrit ci-dessous ; la migration du §47 n'est donc plus facultative pour quiconque distribue des packs aujourd'hui.

Le build exige que l'`apiVersion` du manifeste **corresponde exactement à 3**, et il n'existe **aucun support parallèle v2/v3**. Un pack v2 est rejeté au chargement avec les messages « mauvaise version d'API » (clés i18n, texte à substituer) :

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>
> `loadNoApiVersion`: "pack.json needs \"apiVersion\": {{version}}."

Les packs enregistrés conservent le cycle de vie v2 ([partie VIII](08-apiv2.md) §31) : chaque build hache son en-tête moteur, les mises à jour du moteur marquent automatiquement les packs enregistrés « à revérifier », et un pack enregistré dont l'`apiVersion` diffère de la version courante est signalé comme ne pouvant pas s'exécuter (avec le message de statut ci-dessus pointant vers le remplacement) au lieu de provoquer une erreur.

## 41. pack.json et le buffer d'uniformes (ce qui ne change pas)

- Les champs obligatoires du manifeste sont inchangés : `{ apiVersion, name, author }`.
- Les limites du chargeur sont inchangées : zip de 32 Mo / 1024 entrées / 256 fichiers `.wgsl` / 256 Ko de code au total / manifeste de 64 Ko.
- Le bloc d'uniformes du moteur garde la même forme : `@group(3) @binding(0)`, 64 o, contenant — dans l'ordre de déclaration — le temps, l'offset de rendu, la direction du soleil et la position des yeux. Deux noms de champs internes ont changé : `time` → `seconds`, `originOffset` → `renderOffset`. La **disposition des octets est identique à celle de la v2** : la disposition est enregistrée avec `minBindingSize: 64`, et la disposition exacte des champs est `seconds: f32` @ octet 0, `renderOffset: vec3i` @ 16, `sunDirection: vec3f` @ 32, `eyePosition: vec3f` @ 48. Rien ne change pour le code du pack de toute façon, car les packs n'ont pas le droit de nommer l'uniform directement (l'en-tête du moteur le marque comme fourni par le moteur et en lecture seule, "which packs can't name") ; continuez à passer par les fonctions d'en-tête `bloxdSeconds()` / `bloxdRenderOffset()`.
- Le groupe 3 du pack a gagné un second occupant documenté : `@group(3) @binding(1)` est la texture de profondeur de scène que lit `bloxdOpaqueBehind()` (implémentation complète au §51). L'uniform de 64 o reste au binding 0 ; les packs ne peuvent toujours nommer ni l'un ni l'autre.

## 42. blockId devient blockFlags : des matériaux par bloc sous forme de bits (le changement majeur)

Dans les trois structures d'entrée de hook (`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`), le champ v2 `blockId: u32` est **remplacé** par `blockFlags: u32`. Texte du moteur sur ce champ : *"What kind of block this face is: `bloxdBlockFlag*` bits, the same across the face."* Le moteur fournit désormais directement les données de matériau ; la méthode v2 consistant à deviner les matériaux à partir de plages d'identifiants numériques ou à tenir des tables d'IDs en jeu ([partie VIII](08-apiv2.md) §34) n'est donc plus nécessaire.

Les bits sont exposés sous forme de constantes nommées :

```wgsl
// Testez-en un avec (blockFlags & bloxdBlockFlagRock) != 0.
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| Valeur | Constante | Signification (notes du moteur, condensées) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | Entièrement opaque — feuilles et glace comprises. Ni le verre, ni l'eau, ni la lave, ni les générateurs (spawners), ni les blocs fantômes ou invisibles. |
| 2 | `bloxdBlockFlagEmissive` | Émet de la lumière de bloc, comme les néons, portails, lampes, la Lave et le Beacon. Les minerais luisants comptent, même faiblement. |
| 4 | `bloxdBlockFlagVegetation` | Les feuilles, ainsi que l'herbe des blocs d'herbe — qui comptent aussi comme terre. Ni les cactus, ni les blocs de champignon, ni le foin. |
| 8 | `bloxdBlockFlagDirt` | La terre et le sol, blocs d'herbe compris. La Terre rocheuse est aussi de la roche. |
| 16 | `bloxdBlockFlagSand` | Le sable, le Sable rouge et tous les grès — qui sont aussi de la roche. |
| 32 | `bloxdBlockFlagRock` | La pierre et ses variétés, l'andésite, la diorite, le granite, le gravier, les minerais, le grès, la Terre rocheuse, le bedrock, l'obsidienne et le magma. |

Un bloc composé de plusieurs matériaux porte **chaque** flag correspondant (l'exemple du moteur lui-même : le grès est sable et roche, il reçoit donc les deux). Les feuilles relèvent de la végétation, mais pas de la terre ; les blocs d'herbe sont à la fois végétation et terre.

Les flags végétation / terre / sable / roche sont attribués à partir du **nom d'affichage** enregistré du bloc (opaque / émissif viennent plutôt des données d'opacité et d'émission du moteur) : les noms se terminant par `Leaves`, ou `Grass Block`, sont de la végétation ; les noms `Dirt` / `Soil` (et tout `Grass Block`) sont de la terre ; exactement `Sand` et `Red Sand`, plus tout nom contenant `Sandstone`, sont du sable ; les noms contenant `Stone` / `Andesite` / `Diorite` / `Granite`, tout `Ore`, plus Yellowstone, Gravel, Bedrock, Obsidian, Magma, Rocky Dirt (et le grès) sont de la roche.

### Les règles exactes sur les noms (dériver soi-même les flags d'un bloc)

Les quatre bits de matériau viennent d'un classifieur fixe appliqué au nom d'affichage enregistré du bloc. Les noms de variante (tout ce qui suit `|`) sont d'abord retirés, si bien que les variantes héritent des flags du bloc de base. Ensuite :

| Bit | Règle (évaluée sur le nom sans variante) |
|---|---|
| végétation | le nom **se termine par** ` Leaves` ou **se termine par** ` Grass Block` |
| terre | le nom **vaut exactement** `Dirt`, **se termine par** ` Dirt` ou ` Soil`, ou **se termine par** ` Grass Block` |
| sable | le nom **vaut exactement** `Sand` ou `Red Sand`, ou **contient** `Sandstone` |
| roche | le nom **vaut exactement** l'un de `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt`, **contient** `Sandstone`, **se termine par** ` Ore`, ou contient `Stone` / `Andesite` / `Diorite` / `Granite` comme mot autonome |

Yellowstone est listé explicitement parce que `Stone` n'est pas un mot autonome dans `Yellowstone`. Opaque et émissif ne viennent **pas** du nom — ils viennent des données d'opacité et d'émission de lumière de bloc du moteur, et ne peuvent donc pas être dérivés avec ces règles.

Source : le classifieur de noms du moteur (module 28537, bundle `3ymzdd`) ; vérifié sur les 7 861 blocs nommés, le 2026-10-20.

Exemple — teinte par bloc selon le matériau :

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

Effet sur les recettes v2 : le tableau de 22 IDs de feuilles de la R-H ([partie VIII](08-apiv2.md) §34) se réduit à `(blockFlags & bloxdBlockFlagVegetation) != 0`. La référence ID ↔ nom de bloc sur [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) reste utile à des fins autres que les shaders, mais ne nécessite plus de recherche en jeu pour styliser les matériaux.

### Les feuilles sans l'herbe (la question que tout le monde pose)

`vegetation` seul correspond aux feuilles **et** à l'herbe sur les blocs d'herbe, qui
portent aussi `dirt`. Excluez la terre pour ne balancer que les feuilles — le
discriminant que les notes du moteur sur ce champ explicitent :

```wgsl
// Feuilles seules : végétation sans terre. Les blocs d'herbe sont végétation ET terre.
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// Blocs d'herbe seuls (les faces herbeuses de la surface du terrain) :
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

Vérifié contre le registre en ligne (2026-10-20, bundle `3ymzdd`) :
`vegetation && !dirt` correspond exactement aux 45 enregistrements de feuilles (22 types de base —
les mêmes 22 que le tableau d'IDs de la R-H v2 mesurait) ; `vegetation && dirt` correspond exactement
aux 8 blocs d'herbe. Aucune exception dans un sens ou dans l'autre — ces chiffres du registre valent pour ce build ; de nouveaux blocs augmentent les nombres sans changer la règle. Combinez avec `vertex.normal`
(haut/bas) pour choisir les faces, par exemple les dessus des blocs d'herbe uniquement.

## 43. Renommages de fonctions et changements sémantiques

| v2 | v3 | Notes |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | Secondes depuis le chargement de la page (note sur la précision f32 ci-dessous) |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | Même grandeur : position de rendu + ceci = position monde |
| `const bloxdTimeWrap: f32 = 3600` | **supprimée** | Définissez les périodes vous-même côté pack |
| `engineColour` (dans `BloxdLightIn`) | **supprimé** (14 → 13 champs) | À reconstruire depuis `litColour` + brouillard |
| paramètres de hook `v` / `s` / `l` | `vertex` / `surface` / `light` | Orthographe du modèle ; signatures inchangées |

- **`bloxdSeconds()`** — secondes depuis le chargement de la page. En f32, il compte par pas inférieurs à 1 ms pendant les 4,5 premières heures, puis d'environ 4 ms entre 9 et 18 heures. L'en-tête recommande l'idiome `bloxdSeconds() % period`, qui compte de 0 jusqu'à `period`, puis recommence — un remplacement propre de la constante de wrap supprimée.
- **`bloxdRenderOffset()`** — blocs entiers : "a render position plus this is a world position." Il change à mesure que le joueur se déplace, ce qui garde les positions de rendu proches du joueur — et donc précises. Dans tout le guide, ce que le texte v2 appelait l'offset noa-local s'appelle désormais systématiquement la **position de rendu** / l'offset de rendu ; c'est la même grandeur que renvoyait `bloxdOriginOffset()`.
- **`bloxdTimeWrap` supprimée** — un pack qui bouclait le temps toutes les 3600 s déclare maintenant sa propre constante, par exemple `const timeWrap: f32 = 3600.0;` et `% timeWrap`.
- **Sémantique de la lumière par défaut** — le défaut v2 était `engineColour + emission × fogVisibility` ; le défaut v3 le compose comme `bloxdApplyFog(litColour + emission, light)` — **l'émission est désormais atténuée par le brouillard à l'intérieur du défaut**, si bien que la sortie combinée traverse le mélange de brouillard d'un seul tenant. Tableau de conversion :

  | expression v2 | conversion v3 |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // conversion v3 de la lecture v2 `l.engineColour + s.emission * l.fogVisibility` :
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **Inchangées par le nom et le sens** : `bloxdEyePosition()`, `bloxdSunDirection()`, `bloxdFaceBlock()`, `bloxdApplyFog()`, `bloxdWorldPosition()`.

## 44. Nouvelles constantes d'en-tête : `bloxdPi` et `bloxdTau`

```wgsl
// Un demi-tour et un tour complet, en radians.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

Utiles à la fois pour les astuces trigonométriques et parce que les packs n'ont plus besoin de coder π en dur. Attention à la réutilisation de noms : une constante locale au pack portant le même nom entre désormais en collision avec la vérification des identifiants dupliqués de l'en-tête — supprimez ou renommez toute redéclaration de `bloxdPi` / `bloxdTau` dans votre code.

## 45. Le modèle à six hooks (hooks liquides officiellement affichés)

Le texte de pack par défaut fourni avec le build livre désormais **les six hooks** — terrain / liquide × vertex / surface / light — chacun renvoyant son défaut moteur. Les commentaires du moteur le présentent : *"Every hook returns its engine default. Copy a hook and change its output to start a shader pack."*

```wgsl
// Chaque hook renvoie son défaut moteur. Copiez un hook et modifiez sa
// sortie pour commencer un pack de shaders.

// Les jeux strict gardent le terrain en place : sans garde, ce hook
// désactiverait tout le pack de shaders là-bas.
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// L'eau passe par ces hooks. Si vous les supprimez, elle retombe sur vos hooks de terrain.
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdLiquidLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

- Les commentaires des hooks énoncent directement les règles des liquides : **l'eau a besoin du trio ; supprimez-le et l'eau réutilise vos hooks de terrain** (le comportement de repli connu depuis la v2, [partie VIII](08-apiv2.md) §36, désormais écrit dans le modèle lui-même).
- `bloxdLiquidVertex` se trouve dans la même garde `#ifndef BLOXD_STRICT` que `bloxdTerrainVertex` — sans garde, il désactiverait tout le pack dans les jeux strict, exactement comme les effets vertex côté terrain.
- Les orthographes du modèle sont désormais les noms complets de paramètres `vertex` / `surface` / `light` (le modèle v2 utilisait les formes courtes `v` / `s` / `l`). Les noms de paramètres de votre propre code sont libres — seules les signatures comptent.

## 46. Matrice des variantes : l'axe programme et les changements de macros

Les variantes sont générées sur une matrice **strict × éclairage × programme** — les mêmes 8 combinaisons qu'en v2, mais avec terrain / liquide désormais comme axe explicite de la matrice. Les noms de variantes l'explicitent sous la forme `allow|strict · unlit|lit · terrain|liquid`, exposée dans l'interface comme ``terrain`` / `liquid`, `strict` / `non-strict`, `lighting on` / `lighting off` (et les affichages d'erreur peuvent ajouter "(only in {{variants}})").

| Macro | Définie dans |
|---|---|
| `BLOXD_STRICT` | variantes strict (les deux programmes) |
| `BLOXD_LIGHTING` | variantes éclairage activé (les deux programmes) |
| `BLOXD_ALPHA` | **toutes les variantes liquides** plus les variantes **terrain** non strict |
| `BLOXD_SCENE_DEPTH` | **toutes les variantes liquides** |

Deux choses changent pour les auteurs par rapport aux règles v2 ([partie VIII](08-apiv2.md) §36) :

- **`BLOXD_ALPHA` est inchangé par rapport à la v2.** Le générateur de variantes contient la ligne littérale `"liquid"!==program&&strict||push("BLOXD_ALPHA")` — la précédence des opérateurs JS fait de *(terrain **et** strict)* le seul cas qui saute le push, si bien que la macro est définie dans **toutes les variantes liquides (strict ou non) et dans le terrain non strict** ; seul le terrain strict l'omet. Le code `#ifdef BLOXD_ALPHA` côté liquide est donc compilé exactement comme avant, et l'écriture de retour d'alpha du §49 (insérée pour les programmes liquides ou les variantes non strict) correspond précisément à cet ensemble.
- **`BLOXD_SCENE_DEPTH` est toujours défini dans les variantes liquides**, donc l'usage de la profondeur y reste acceptable sans garde, exactement comme en v2 (§35) ; dans les hooks de terrain, il continue d'exiger l'enveloppe `#ifdef BLOXD_SCENE_DEPTH`.

## 47. Liste de migration v2 vers v3

1. **pack.json** : `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`** dans les trois structures d'entrée ; exprimez le style des matériaux par des tests de bits contre les constantes `bloxdBlockFlag*` (§42) ; abandonnez les heuristiques de plages d'IDs de la v2
3. **`bloxdTime()` → `bloxdSeconds()`** ; déclarez votre propre période au lieu de la `bloxdTimeWrap` supprimée (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **Reconstruisez le calcul de lumière depuis `engineColour` vers `litColour` + brouillard** selon le tableau du §43 ; notez que le défaut atténue désormais l'émission avec le brouillard
6. **Hooks liquides** : définissez explicitement les `bloxdLiquid*` quand vous voulez traiter l'eau différemment ; omettez-les pour revenir à vos hooks de terrain
7. **Aucun audit `BLOXD_ALPHA` nécessaire** — son ensemble de variantes est inchangé par rapport à la v2 : toutes les variantes liquides plus le terrain non strict le définissent, seul le terrain strict l'omet (§46)
8. **Utilisez `bloxdPi` / `bloxdTau`** là où des constantes trigonométriques étaient codées en dur ; supprimez les redéclarations locales au pack qui dupliquent désormais l'en-tête
9. **Gardez les gardes strict** : les hooks vertex et `discard` restent enveloppés dans `#ifndef BLOXD_STRICT` ; le modèle protège `bloxdLiquidVertex` de la même façon que son homologue terrain
10. **Validez en jeu** — compilez et testez le pack dans un jeu qui prend en charge les packs de shaders

## 48. Autres changements et notes de la v3

- **La validation reste en deux étapes** ([partie VIII](08-apiv2.md) §38) : d'abord la validation statique, puis la vraie compilation WebGPU du navigateur par des extraits stub générés qui appellent vos hooks, avec les erreurs ramenées aux fichiers / lignes source, et des diagnostics qui restaurent les noms d'origine des identifiants côté moteur via un mappage.
- **Les diagnostics strict nomment la raison** : un hook vertex qui déplace le terrain signale "… moves terrain, which strict games prevent." et un `discard` dans les hooks surface / light signale "discard makes terrain see-through, which strict games prevent." ; l'interface des réglages conserve l'indication « entourez chacun de ceux listés ci-dessous avec `#ifndef BLOXD_STRICT ... #endif` » (`offInStrict`).
- **Messages du chargeur** : les types d'erreur et les limites sont inchangés ; "Zip64 archives aren't supported." est affiché comme message d'interface (`loadZip64`). L'inventaire des chaînes de l'interface des packs compte 57 clés `shaderPack:*` ; parmi les erreurs de chargement, `loadNoWgsl` (un zip sans aucun fichier `.wgsl`) et `loadNotZip` (un fichier sans signature de fin d'archive zip) complètent l'ensemble.
- **Aucun éditeur WGSL en jeu n'est fourni avec l'interface des packs.** L'écran de réglages ne propose aucun éditeur de code de shader — les packs s'écrivent sous forme de fichiers zip en dehors du jeu. (Un éditeur CodeMirror existe bien dans le bundle, mais c'est l'éditeur JavaScript de l'interface de script des jeux personnalisés ; il ne prend pas en charge le WGSL et n'a aucun lien avec le système de packs.)
- **Condition matérielle** : Lite exige un pilote prenant en charge la fonctionnalité WebGPU `shader-f16` ; les pilotes trop anciens sont rejetés avec un message du type "Intel driver too old for Lite (no shader-f16)".
- **Les changements d'éclairage revalident les packs enregistrés** : quand le réglage d'éclairage change à l'exécution, le moteur relance la vérification du pack (`changed → recheck`) ; la visualisation de replays appelle le même hook avec `changed: false` et saute la revérification.
- **Formulation** : les textes sur les jeux qui acceptent les packs de shaders disent désormais « dans les jeux qui les **prennent en charge** ».
- **Périmètre des titres** : l'ensemble des jeux où les packs s'exécutent est inchangé par rapport au build précédent.

## 49. Intérieurs du moteur : comment le rendu Lite appelle vos hooks

Tout ce qui précède, dans les §40 à §48, est ce que le chargeur et l'en-tête vous disent. Cette section et les sections suivantes documentent ce que le moteur fait réellement à l'exécution, restauré depuis le bundle de production (le rendu Lite — un chunk de 175 Ko ; le vrai nom du fichier d'intégration `lite/terrainShaderPack.ts` survit dans ses chaînes d'erreur). Rien de tout cela ne change ce que vous écrivez, mais cela élimine les suppositions sur ce que vos hooks reçoivent — et tranche plusieurs questions que d'autres guides communautaires listent encore comme ouvertes.

Le rendu n'appelle pas vos hooks depuis JavaScript au sens habituel. Quand un pack passe la validation, le moteur **insère les appels de vos hooks dans son propre WGSL de terrain** en remplaçant des lignes d'ancrage fixes dans le texte du shader. Une ancre doit correspondre exactement une fois — zéro ou plusieurs correspondances provoquent l'abandon avec `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Étape | Ligne d'ancrage dans le shader du moteur | Ce qui est inséré |
|---|---|---|
| vertex | un bloc de quatre lignes, de `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` à `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);` | construit `BloxdVertexIn`, appelle votre hook vertex, réécrit `worldPos` — l'insertion remplace aussi `let worldPos` par `var worldPos` |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | construit `BloxdSurfaceIn`, appelle votre hook surface, réécrit `baseColor` / `alpha` |
| couleur éclairée | juste avant `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` | `let bloxdSpLitColour = color.rgb;` — capture la couleur avant brouillard |
| lumière | la ligne finale `return color;` du fragment shader | construit `BloxdLightIn`, appelle votre hook lumière, réécrit `color` — après le mélange de brouillard |

Le code inséré, restauré depuis le bundle distribué (les exemples d'expressions de niveau de lumière sont abrégés là où le formatage du moteur s'allonge) :

```wgsl
// étape vertex — variantes non strict portant un hook vertex
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* votre bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// étape fragment — surface
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* votre hook surface */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // inséré uniquement quand le programme est liquide ou la variante non strict
```

```wgsl
// étape fragment — light
{
    let bloxdSpLightIn = BloxdLightIn(
        bloxdSpLitColour,                        // litColour
        fragmentInputs.vTerrainLambert,          // directionnel
        ambient,                                 // ambiant
        /* varying de niveau de lumière */.rgb,  // blockLight
        /* canal ciel du même varying */,        // skyLight
        uniforms.uAmbientLightColour,            // ambientLightColour
        uniforms.uSkyLightColour,                // skyLightColour
        /* terme de lumière tenue (voir ci-dessous) */, // heldLight
        select(vec3f(0.0), uniforms.vFogColor,
               uniforms.vFogInfos.x != 0.0),     // fogColour — noir uniquement sans aucun brouillard
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* votre hook light */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

Quatre faits sur l'application des règles découlent directement de cette insertion :

- **Le terrain strict ignore les changements d'alpha du hook surface.** L'écriture de retour `alpha = bloxdSpSurface.alpha` n'est insérée que pour les programmes liquides ou les variantes non strict — l'implémentation derrière le tableau de macros du §46. (En terrain strict, votre code `#ifdef BLOXD_ALPHA` n'est de toute façon pas compilé ; il est désormais aussi confirmé que les écritures d'alpha sans garde y sont écartées.)
- **Une variante strict qui déclare quand même un hook vertex ne l'exécute jamais** — le moteur le signale à la compilation : `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. C'est pourquoi le modèle officiel (§45) enveloppe `bloxdLiquidVertex` dans la même garde `#ifndef BLOXD_STRICT` que son homologue terrain.
- Les identifiants `bloxdSp*` — **14 au total** : `bloxdSpVertexIn`, `bloxdSpVertex`, `bloxdSpSurfaceIn`, `bloxdSpSurface`, `bloxdSpLightIn`, `bloxdSpLight`, `bloxdSpLitColour`, `bloxdSpSceneDepth`, `bloxdSpPixel`, `bloxdSpPositionW`, `bloxdSpZ`, `bloxdSpEye`, `bloxdSpScale`, `bloxdSpBehind` — sont des temporaires côté moteur. Votre code ne les voit jamais, mais ils apparaissent dans les diagnostics et dans toute sortie de rétro-ingénierie, donc il vaut la peine de les reconnaître au premier coup d'œil.
- **Le raccourci de la surface par défaut.** Quand le hook surface d'une variante est littéralement `bloxdDefaultSurface`, le moteur saute entièrement l'insertion des lignes de réécriture `baseColor` / `alpha` — la valeur par défaut produit déjà ces valeurs, donc l'affectation serait du code mort. Les chaînes de hooks non modifiées ne coûtent rien.

**Ce qui alimente réellement `BloxdLightIn`** — champ par champ, d'après le code inséré :

| Champ | Source côté moteur |
|---|---|
| `litColour` | la couleur du fragment capturée juste avant le mélange de brouillard (l'ancre `bloxdSpLitColour`) — "before emission and fog", comme le dit l'en-tête |
| `directional` | `vTerrainLambert` — une somme interpolée par sommet de `max(0, dot(normal, lightDirection)) × intensity` sur les lumières directionnelles de la scène (formule au §54) ; 0 quand la scène n'en a aucune |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient` — par matériau, par image |
| `blockLight` | le `.rgb` du varying décodé de niveau de lumière (décodage au §54) |
| `skyLight` | le canal ciel de ce même varying de niveau de lumière — *"Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING"* (texte de l'en-tête) |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | le terme de lumière tenue, construit à partir du canal w du varying de niveau de lumière avec les uniforms d'image `uHeldLightPos` / `uHeldLightColour` ([partie VII](07-internals.md) §26 documente l'atténuation et le comportement de plancher des canaux) |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)` — **noir uniquement dans une scène totalement sans brouillard** (mode 0, §50) |
| `fogVisibility` | le coefficient de brouillard limité — la valeur exacte que renvoie la fonction du §50 |
| `position` / `normal` | les varyings `vPositionW` / `vNormalW` (normale renormalisée par fragment) |
| `blockFlags` | le varying plat `vBlockFlags` — trajet complet au §52 |

Pour s'orienter en lisant des documents plus anciens : l'architecture d'insertion identique existait dans le rendu v2, et les seules différences d'intégration de la v3 sont `vBlockId` → `vBlockFlags` et l'ajout des variantes liquides. Le système de hooks est architecturalement stable à travers la rupture v2 → v3.

## 50. La fonction de brouillard : quatre modes, un champ

Restaurée telle quelle depuis le shader de terrain de production :

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // linéaire
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // exponentiel
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // exponentiel au carré
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = brouillard désactivé (le coefficient reste 1.0)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)` — un seul vec4 pilote tout.
- **Quatre modes existent dans le shader : 0 = désactivé, 1 = exponentiel, 2 = exponentiel au carré, 3 = linéaire.** `fogVisibility` est le coefficient limité quel que soit le mode exécuté — il existe exactement un champ, et aucun indicateur de mode n'est exposé aux packs.
- Les titres de Bloxd eux-mêmes utilisent le mode 3 (linéaire) avec la bande de 32 blocs décrite dans la [partie VII](07-internals.md) §25 (`fogStart = 32 × D`, `fogEnd = 32 × (D + 1)`), donc l'observation « toujours linéaire » de cette partie décrit encore le jeu distribué. Les modes exponentiels sont toutefois du code moteur réel et actif — un titre peut changer `vFogInfos.x` et modifier la rampe sans aucune mise à jour client. Les recettes de distance qui calculent elles-mêmes `distance(l.position, bloxdEyePosition())` (recette R-B) sont la façon robuste d'écrire des rendus guidés par la distance, puisqu'un changement de mode ne peut pas les déplacer.
- Cela tranche la question « quelle rampe de brouillard le moteur utilise réellement » à partir du code source : les quatre sont implémentées ; les titres distribués utilisent la linéaire. (La même fonction explique aussi le commentaire de fogColour de l'en-tête — le mode 0 est le seul cas où `fogColour` arrive en noir, et les jeux de Bloxd ne distribuent jamais le mode 0 ; ils repoussent le brouillard au loin, [partie VII](07-internals.md) §25.)

## 51. bloxdOpaqueBehind() : l'implémentation exacte

La fonction entière, restaurée telle quelle depuis le build de production :

```wgsl
@group(3) @binding(1) var bloxdSpSceneDepth: texture_2d<f32>;
var<private> bloxdSpPixel: vec2i;
var<private> bloxdSpPositionW: vec3f;

fn bloxdOpaqueBehind() -> BloxdOpaqueBehind {
    let bloxdSpZ = textureLoad(bloxdSpSceneDepth, bloxdSpPixel, 0).r;
    if (bloxdSpZ <= 0.0) {
        return BloxdOpaqueBehind(false, vec3f(0.0), 0.0);
    }
    let bloxdSpEye = bloxdPackInputs.eyePosition;
    let bloxdSpScale = max(bloxdSpZ / (scene.view * vec4f(bloxdSpPositionW, 1.0)).z, 1.0);
    let bloxdSpBehind = bloxdSpEye + (bloxdSpPositionW - bloxdSpEye) * bloxdSpScale;
    return BloxdOpaqueBehind(true, bloxdSpBehind, distance(bloxdSpBehind, bloxdSpEye));
}
```

- **La texture de profondeur se trouve à `@group(3) @binding(1)`** — le groupe 3 est le groupe du pack lui-même : le binding 0 est l'uniform de 64 o `bloxdPackInputs` (§41), le binding 1 est cette texture de profondeur. Les deux sont fournis par le moteur et impossibles à déclarer de votre côté.
- **La texture de profondeur est une ressource unfilterable-float, réservée au fragment.** La disposition du bind group l'enregistre comme `texture: { sampleType: "unfilterable-float" }` avec la seule visibilité `GPUShaderStage.FRAGMENT` — c'est précisément pourquoi `bloxdOpaqueBehind()` repose sur `textureLoad` (coordonnées de texel explicites, niveau de mip 0) plutôt que sur `textureSample` : le filtrage matériel n'est tout simplement pas disponible sur cette texture.
- `z ≤ 0` signifie que l'échantillon de profondeur n'a touché rien (plan lointain / ciel) : `found = false`, et `position` / `distance` n'ont aucun sens — vérifiez toujours `found` en premier.
- La position renvoyée est une **intersection par mise à l'échelle du rayon** : la surface opaque est placée à `eye + (fragment − eye) × max(z / viewDepth, 1)`. `distance` est mesurée de l'œil à ce point — pour les packs de surface d'eau, c'est en pratique « quelle épaisseur d'eau le rayon a traversée avant de toucher quelque chose de solide », ce qui fait fonctionner les recettes d'eau teintée par profondeur sans second buffer de profondeur.

## 52. blockFlags de bout en bout : de l'enregistrement à votre hook

Le §42 explique ce que signifient les bits. Cette section décrit le trajet complet d'un bit de flag depuis l'enregistrement du bloc jusqu'à votre hook — chaque étape confirmée dans la source de production, ce qui prouve aussi le "the same across the face" de l'en-tête jusqu'au niveau de l'octet.

**1. Enregistrement (base de définitions de blocs).** Les flags de chaque bloc sont calculés une fois, à l'enregistrement :

```js
flags[id] = nameFlags                     // règles sur le nom d'affichage (§42) : végétation / terre / sable / roche
          | (definition.opaque === true ? 1 : 0)   // bit opaque — données d'opacité du moteur
          | (anyFaceEmission >= 1       ? 2 : 0);  // bit émissif — données d'émission de lumière de bloc
```

Les règles de nom d'affichage ne couvrent que les quatre bits de matériau ; les deux bits physiques viennent de données moteur séparées — `opaque` directement de la définition du bloc, `emissive` du tableau d'émission de lumière de bloc par face. Le « Glowing ores count, however faint » de l'en-tête est littéral : toute face avec une émission ≥ 1 active le bit.

**2. Par bloc → par matériau (initialisation du mailleur).** Le terrain est dessiné par *matériau*, pas par ID de bloc, donc les flags sont retabulés dans une table de matériaux (un `Uint16Array` indexé par ID de matériau, chaque matériau prenant les flags de la première face de son bloc propriétaire). La table est envoyée au Web Worker de maillage — mais **uniquement dans les configurations où le pipeline de packs est activé** ; sinon la table vaut `null` et aucun octet de flag n'est jamais écrit. Les joueurs sans packs ne paient aucun surcoût, par construction.

**3. Dans les octets de sommet (worker de maillage).** Les flags voyagent dans deux octets libres des données de sommet entrelacées existantes :

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // 8 bits de poids faible → octet alpha de l'attribut couleur
        buffer[o + normalOffset + 3] = flags >> 8;    // 8 bits de poids fort → octet w de l'attribut normale
    }
}
```

Les quatre sommets d'une face reçoivent la même valeur — le sens, au niveau de l'implémentation, de "the same across the face".

**4. Décodage côté GPU (shader de terrain Lite).** Les deux octets voyagent comme attribut de sommet `blockFlagWords: vec2u` (location 7, présent uniquement quand le pipeline de packs est actif) et sont réassemblés à l'étape vertex :

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags` est déclaré `@interpolate(flat)` — constant par face jusqu'à l'étape fragment, ce qui explique pourquoi les tests de bits du §42 sont stables dans une face et ne peuvent jamais produire de mélange au milieu d'une face.

- Le pipeline réserve **16 bits** de capacité (ce décodage réassemble deux octets complets) alors que la v3 n'en définit que 6 — de futurs flags peuvent apparaître sans autre changement de format de sommet ni saut d'API.
- En mode sommet empaqueté, les mêmes deux octets voyagent dans `packed.y` et l'octet supérieur du mot de couleur au lieu d'un attribut dédié — mêmes valeurs, conteneur différent.
- Pour la question feuilles-contre-herbe sur laquelle ces flags sont le plus souvent interrogés, voir [Les feuilles sans l'herbe](#les-feuilles-sans-lherbe-la-question-que-tout-le-monde-pose) au §42.

## 53. Intérieurs de la validation : HEADER_VERSION, signatures, noms réservés

**Le hash d'en-tête mesuré.** Chaque validation de pack est estampillée avec le `HEADER_VERSION` du moteur. Exécuter directement le module de validation de production (voir la note sur le harness à la fin du §54) le mesure :

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← mesuré à partir du bundle de production en ligne
```

C'est un hash FNV-1a-32 (préfixé par `6.`) sur cinq entrées : l'en-tête du moteur préprocessé et tokenisé **par variante** (une entrée pour chacune des 8 variantes), l'univers lexical WGSL complet de l'analyseur, les quatre noms de macros, la table des fonctions spéciales, et la déclaration `BloxdPackInputs` avec sa ligne d'uniform `@group(3) @binding(0)`. Deux conséquences pour les auteurs :

- **Toute modification de l'en-tête côté moteur recalcule le hash** — c'est le mécanisme derrière le marquage automatique « à revérifier » que reçoivent les packs enregistrés après une mise à jour du moteur ([partie VIII](08-apiv2.md) §31).
- Le hash couvre l'*en-tête du moteur*, pas votre code. Un pack qui continue à se charger après une mise à jour du moteur n'est pas « encore valide » — il n'a simplement pas encore déclenché de changement d'en-tête. La seule vérification de version à laquelle votre manifeste participe est le contrôle `apiVersion` (§40).

**Vérification des signatures de hooks : exacte token par token pour les types, libre pour les noms.** Le validateur conserve une signature par emplacement de hook :

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

La correspondance se fait **token par token** : les noms de types des paramètres doivent correspondre exactement, `->` et le type de retour doivent correspondre exactement, et le nombre de paramètres ainsi que le placement des virgules sont vérifiés. Les *noms* des paramètres sont libres — tout identifiant à la position de paramètre est accepté, ce qui explique pourquoi votre `fn bloxdTerrainLight(s, l)` compile même si le modèle écrit `(surface, light)`. Le hook light prend exactement deux paramètres.

**Noms réservés.** La règle est une seule regex : `/^bloxd/i`. Tout identifiant commençant par `bloxd` est réservé — tout ce qui est `bloxd*` est fourni par le moteur, et un pack ne peut pas déclarer dans cet espace de noms (c'est aussi pourquoi les redéclarations de `bloxdPi` / `bloxdTau` du §44 entrent en collision).

**Fonctions spéciales.** Exactement une est enregistrée en v3 :

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

« Spéciale » signifie *liée à une macro* — une fonction du moteur dont la disponibilité dépend d'un symbole de variante. Deux diagnostics de garde imposent un usage correct :

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.` — un hook vertex atteint une fonction réservée aux hooks surface / light.
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — par exemple un `bloxdOpaqueBehind()` côté terrain sans enveloppe `#ifdef BLOXD_SCENE_DEPTH`.

**L'en-tête du moteur (prélude), figé.** L'en-tête v3 est une chaîne de 5 637 octets commençant par `// Engine-provided and read-only, prepended to all packs. apiVersion 3.` Il porte des directives `#if` / `#ifdef` que le préprocesseur WGSL du moteur évalue lui-même par variante — le moteur exécute réellement l'évaluation d'expressions `#if`, et une expression mal formée échoue avec `Cannot evaluate #if ...`. Chaque structure, signature de fonction et commentaire cité dans ce guide vient de ce texte rendu, donc le guide et l'en-tête distribué ne peuvent pas diverger. Le texte complet suit, verbatim, à la fin de §54.

**Notes d'analyseur pour les auteurs.**

- Les fonctions du côté pack sont renommées avec un préfixe `pack_` lors de leur fusion dans le shader du moteur (évitement de collisions) ; les diagnostics les ramènent à vos noms d'origine — le même mécanisme que la [partie VIII](08-apiv2.md) §38 décrit pour la seconde étape de validation.
- Le message d'identifiant non déclaré dit `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.` ; `_ can only be the target of a phony assignment, as in _ = f();` et `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.` complètent l'ensemble récemment confirmé.
- L'univers lexical de l'analyseur inclut des identifiants qui **ne sont pas du WGSL standard** : `bufferView`, `bufferArrayView`, `bufferLength`, `atomicStoreMax`, `atomicStoreMin`. Le moteur les connaît comme built-ins, mais rien ne garantit que l'implémentation WGSL d'un navigateur donné les fournisse : ne construisez jamais un pack de distribution dessus.

## 54. Constantes, limites et dispositions confirmées

La disposition complète des ressources du programme terrain, directement depuis le rendu Lite de production :

| Binding | Contenu |
|---|---|
| `@group(0) @binding(0)` | `scene` : `LiteSceneUniforms` — `viewProjection` mat4x4f, `view` mat4x4f, `vEyePosition` |
| `@group(1) @binding(0)` | `uniforms` : `TerrainFrameUniforms` — `uHeldLightColour` / `uHeldLightPos`, `uSkyLightColour`, `uAmbientLightColour`, **`vFogInfos`**, `vFogColor`, `outputHeight`, `sceneAmbient`, **`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks` : stockage `array<vec4f>` — xyz = translation dans la frame de rendu, w = visibilité d'apparition |
| `@group(2) @binding(0)` | `material` : `vDiffuseColor`, `ambientAndCutoff`, `emissiveAndLevel`, `anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs` — l'uniform du pack (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth` — la texture de profondeur (§51) |

- **Les lumières directionnelles sont plafonnées à quatre.** Le rendu échoue avec `Terrain supports 4 directional lights, not ${n}` si une scène tente d'en enregistrer davantage. `l.directional` est la somme de Lambert sur celles qui existent (0–4 ; les scènes de Bloxd elles-mêmes en utilisent 2 — [partie VII](07-internals.md) §27). Le terrain avertit aussi au sujet des lumières qu'il ne peut pas honorer, mot pour mot : une lumière ajoutée tardivement — `Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.` ; une lumière teintée — `Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.` ; et une lumière filtrant les maillages — `Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **Nommage du programme terrain** : les clés de cache de pipeline sont `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}` — un pack apparaît comme le suffixe `-sp{variant}`, un programme par variante du §46. Un watcher (`watchPipelineFailures`) compare les noms de pipeline en direct à `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/` et revérifie la variante de pack correspondante quand la compilation d'un pipeline échoue ; la perte du périphérique GPU (`device.lost`) saute la vérification.
- **`BLOXD_TERRAIN_DIRECTIONAL` est une macro interne du moteur** (définie quand dirLightCount > 0). Elle ne fait *pas* partie des quatre du prélude et n'atteint jamais le code du pack — mais elle apparaît dans les dumps WGSL des shaders du moteur lui-même, donc la reconnaître évite des confusions.
- **Décodage du niveau de lumière** : l'attribut de sommet `aPackedLightLevels` est un f32 empaquetant quatre nibbles, chacun divisé par 15 : rgb = la lumière de bloc colorée, a = le canal ciel / lumière tenue. L'étape vertex le décode dans le varying `vLightLevels` ; `blockLight` lit `.rgb`, le canal ciel / lumière tenue lit `.w`. Le moteur applique un plancher de 35 % du canal le plus lumineux aux canaux rgb avant interpolation — l'ancre côté moteur du relèvement que la [partie VII](07-internals.md) §26 documente depuis le jeu.
- **`vTerrainLambert`** (la source de `directional`, §49) est générée comme une somme sur les lumières directionnelles actives : `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`, protégée par `BLOXD_TERRAIN_DIRECTIONAL`.
- **Les index passent en 32 bits au premier grand maillage.** Le rendu Lite ne choisit des indices `Uint16Array` que tant que chaque valeur d'index reste ≤ 65 534 ; dès qu'un index atteint 65 535, le buffer devient un `Uint32Array` (suivi par buffer avec un flag `is32Bits`). En pratique : un maillage de chunk avec au plus 65 535 sommets tient dans des indices 16 bits ; un maillage avec exactement 65 536 sommets émet nécessairement un index 65 535 et bascule tout le buffer en 32 bits.
- **Détails du chargement du manifeste** : les entrées zip sous `__MACOSX/`, les fichiers préfixés `._` et `.DS_Store` sont filtrés (bruit d'archive macOS) ; `pack.json` est localisé par comparaison de chemins en minuscules — zéro correspondance → `loadNoManifest`, deux ou plus → `loadDuplicateManifest` ; la lecture du manifeste est plafonnée à 65 536 octets.
- **Comment tout cela a été vérifié** : les modules du bundle de production ont été restaurés (165 chunks ; le registre webpack de ce bundle compte 4 951 modules — le nombre varie de quelques unités selon que les dépendances enfants asynchrones sont incluses ou non, donc traitez cette valeur comme propre à ce bundle) et exécutés dans un harness compatible webpack sous Node.js. Le `HEADER_VERSION` mesuré (§53), l'en-tête rendu de 5 637 octets, l'ordre canonique de la table des variantes et la table des fonctions spéciales viennent tous de *l'exécution du code distribué*, pas de la lecture de chaînes. Le même harness est le noyau naturel d'un `pack_check` v6 communautaire — exécuter le validateur du moteur lui-même contre un pack reproduit exactement ses verdicts.
### L’en-tête du moteur v3, verbatim

Le texte figé de 5 637 octets (127 lignes) lui-même — l’artefact que §53 ci-dessus décrit — restauré verbatim du build `3ymzdd`, le build de production v3 visé par cette partie. C’est le pendant v3 de l’en-tête v4 de la [Partie XI](11-reference.md) §67, intégré en entier pour la même raison : un pack v3 peut être débogué contre exactement ce que le moteur lui préfixait, et chaque différence v3 → v4 ([Partie X](10-apiv4.md) §58–§59) se lit directement en mettant les deux textes côte à côte.

```wgsl

// Engine-provided and read-only, prepended to all packs. apiVersion 3.

// Half a turn and a full turn, in radians.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;

// Per frame: the same for every vertex and fragment of a frame. The functions read bloxdPackInputs, the engine's
// uniforms, which packs can't name. Any function can call them, not only a hook.

// Seconds since the page loaded. In f32, so it counts in steps of under 1 ms for the first 4.5 hours, and of about
// 4 ms from 9 to 18 hours. bloxdSeconds() % period counts from 0 up to period, then starts again.
fn bloxdSeconds() -> f32 {
    return bloxdPackInputs.seconds;
}

// Whole blocks: a render position plus this is a world position. It changes as the player travels, so render positions
// stay close to the player, and so precise.
fn bloxdRenderOffset() -> vec3i {
    return bloxdPackInputs.renderOffset;
}

// The camera's render position.
fn bloxdEyePosition() -> vec3f {
    return bloxdPackInputs.eyePosition;
}

// Unit, towards the sun, in world orientation; zero when the sky has no sun.
fn bloxdSunDirection() -> vec3f {
    return bloxdPackInputs.sunDirection;
}

// A render position's world position. In f32, so it loses fine detail far from the world's origin.
fn bloxdWorldPosition(position: vec3f) -> vec3f {
    return position + vec3f(bloxdRenderOffset());
}

// The world block the face at a fragment's position and normal belongs to, exact anywhere: half a block back inside it.
fn bloxdFaceBlock(position: vec3f, normal: vec3f) -> vec3i {
    return vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset();
}

// Bits of the hook inputs' blockFlags: what a face's block is and what it's made of. A block made of several materials
// has each, as sandstone is sand and rock, so leaves are vegetation and not dirt. Test one with
// (blockFlags & bloxdBlockFlagRock) != 0.
const bloxdBlockFlagOpaque: u32 = 1;     // Fully opaque, leaves and ice included. Not glass, water, lava, spawners, or ghost and invisible blocks.
const bloxdBlockFlagEmissive: u32 = 2;   // Gives off block light, as neon, portals, lamps, Lava and Beacon do. Glowing ores count, however faint.
const bloxdBlockFlagVegetation: u32 = 4; // Leaves, and the grass on grass blocks, which are dirt too. Not cacti, mushroom blocks or hay.
const bloxdBlockFlagDirt: u32 = 8;       // Dirt and soil, grass blocks included. Rocky Dirt is rock too.
const bloxdBlockFlagSand: u32 = 16;      // Sand, Red Sand, and every sandstone, which is rock too.
const bloxdBlockFlagRock: u32 = 32;      // Stone and its kinds, andesite, diorite, granite, gravel, ores, sandstone, Rocky Dirt, bedrock, obsidian and magma.

struct BloxdVertexIn {
    position: vec3f,     // A render position: world minus bloxdRenderOffset().
    normal: vec3f,
    blockFlags: u32,     // What kind of block this face is: bloxdBlockFlag* bits, the same across the face.
}

struct BloxdVertex {
    position: vec3f,     // A render position.
}

struct BloxdSurfaceIn {
    colour: vec3f,       // Texture * vertex colour (tint * AO).
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // A render position; see bloxdWorldPosition and bloxdFaceBlock.
    blockFlags: u32,     // As in BloxdVertexIn.
}

struct BloxdSurface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // Added after lighting, then fogged.
}

struct BloxdLightIn {
    litColour: vec3f,    // The engine's lit result for this fragment, from the surface hook's colour: before emission and fog.
    directional: f32,    // Summed Lambert from the scene's directional lights (0 when off).
    ambient: vec3f,      // Ambient light, added to directional.
    blockLight: vec3f,   // Voxel block light, tone-mapped; 0 without BLOXD_LIGHTING.
    skyLight: f32,       // Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING.
    ambientLightColour: vec3f, // White without BLOXD_LIGHTING.
    skyLightColour: vec3f,     // White without BLOXD_LIGHTING.
    heldLight: vec3f,    // Held light here, tone-mapped like blockLight, before the ambient boost; 0 out of reach
                         // or without BLOXD_LIGHTING.
    fogColour: vec3f,    // The game's fog colour. Bloxd's games always have fog, pushed far out when the player
                         // turns it off; black only in a scene with no fog at all.
    fogVisibility: f32,  // 1 = no fog, 0 = fully fogged.
    position: vec3f,     // As in BloxdSurfaceIn.
    normal: vec3f,
    blockFlags: u32,     // As in BloxdVertexIn.
}

struct BloxdLight {
    colour: vec3f,
}

// Returned by bloxdOpaqueBehind(), which surface and light hooks may call where BLOXD_SCENE_DEPTH is defined.
struct BloxdOpaqueBehind {
    found: bool,         // False where nothing opaque is behind (sky).
    position: vec3f,     // A render position; meaningless when !found.
    distance: f32,       // From the eye; meaningless when !found.
}

fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return BloxdVertex(vertex.position);
}

fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
#ifdef BLOXD_ALPHA
    return BloxdSurface(surface.colour, surface.alpha, vec3f(0.0));
#else
    return BloxdSurface(surface.colour, vec3f(0.0));
#endif
}

// Fogs colour as the engine fogs this fragment.
fn bloxdApplyFog(colour: vec3f, light: BloxdLightIn) -> vec3f {
    return mix(light.fogColour, colour, light.fogVisibility);
}

fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return BloxdLight(bloxdApplyFog(light.litColour + surface.emission, light));
}
```

---

Recherches de ltf_ahel (menées avec glm)

[← Partie précédente](08-apiv2.md)·[Retour au manuel](README.md)

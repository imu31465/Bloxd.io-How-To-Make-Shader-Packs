# Créer des packs de shaders pour Bloxd.io (Guide complet)

Guide autonome pour créer et distribuer des packs de shaders pour Bloxd.io (moteur WebGPU uniquement).

> Ce guide est non officiel et ne représente pas la position des développeurs. L'API peut changer sans préavis.  
> Dernière révision : 2026-10-20 (déploiement v3 en production confirmé par comparaison de bundles ; invocation des hooks, brouillard, profondeur et internes de `blockFlags` restaurés depuis le build de production — partie IX §49 à §54). Aucune référence officielle publique de l'API WGSL n'ayant été trouvée, continuez à vérifier descriptions et recettes face à l'écran de chargement et à la compilation en jeu.  
> La fonction de packs de shaders est une fonction officielle accessible depuis l'interface du jeu, et les packs sont du WGSL pur  
> (ni exécution JS ni réseau) : rien de dangereux ne se produit avec du code normal.  
> Ce guide a été créé avec l'assistance de l'IA ; l'exactitude n'est pas garantie. Vérifiez avec le comportement réel en jeu.

[Retour au manuel](README.md)·[Partie suivante →](02-api.md)

# Partie I : Créer des packs

> Le jeu actuel exige `apiVersion: 3` depuis le 2026-10-19 et refuse les packs v1/v2 au chargement — le contenu ci-dessous est écrit sur la spécification v2. Consultez la [partie IX](09-apiv3.md) pour migrer avant de distribuer.

## 1. Aperçu et prérequis

- Les packs de shaders sont **réservés au moteur WebGPU**. Tant qu'un pack est installé, le moteur WebGPU est activé de force dans les réglages
- Les packs s'écrivent dans un **sous-ensemble restreint de WGSL**. Ils n'affectent que l'aspect du **terrain et des liquides**
- Ce que vous pouvez faire : changer couleurs, transparence et émission ; reconstruire l'éclairage ; ombres façon projection (R9.12) ; animation de sommets (certains jeux seulement)
- Ce que vous ne pouvez pas faire : ajouter/échantillonner des textures, post-traitement (bloom etc.), ombres pixellisées tournant avec le soleil (shadow maps) ni reflets réels (SSR), ni toucher le ciel ou les entités
- Ce que vous pouvez faire (mais souvent oublié) : **ombres façon projection avec `skyLight` (occlusion du ciel par voxels)** — assombrir nettement sous les arbres et les toits (R9.12). Casser des blocs fait recalculer LightEngine aussitôt : les ombres suivent en temps réel
- **La plupart des jeux sont en mode strict** (ni animation de sommets, ni `discard`). Concevez les packs grand public pour le mode strict

## 2. Démarrage rapide

1. Créez un dossier avec `pack.json` et des fichiers `.wgsl`
2. Chargez le zip ou le dossier via réglages du jeu → Shader Pack
3. Corrigez les erreurs et rechargez (voir [Partie V](05-troubleshooting.md))
4. Testez dans des jeux compatibles
5. Zippez quand c'est fini et distribuez

## 3. Structure du pack

- **Format de distribution** : un seul `.zip`, ou un dossier (le chargement de dossier est réservé aux navigateurs de bureau)
- **Contenu** : un `pack.json` (à la racine du pack ; insensible à la casse) + 1 à 256 fichiers `.wgsl`
- Les `.wgsl` multiples sont concaténés et traités comme un module : découpage et sous-dossiers libres. Aucune contrainte de noms. La concaténation se fait en **ordre alphabétique par nom d'entrée (chemin)** (les déclarations de portée module ne dépendent pas de l'ordre, donc en général sans effet — cela ne mord que sur du code dépendant de l'ordre d'initialisation des `var`). Les fichiers non `.wgsl` (READMEs etc.) sont ignorés
- Astuce de compression : si un zip range tout sous un dossier racine commun, ce préfixe est retiré automatiquement (les zips "Compresser" de macOS passent tels quels ; les déchets d'OS comme `__MACOSX`, les fichiers préfixés `._` et `.DS_Store` sont exclus automatiquement). Mais des fichiers parasites à la racine cassent la détection du niveau supérieur ; le plus sûr est d'entrer dans le dossier et de compresser `pack.json` et les `.wgsl` directement (vérifiez que `pack.json` est à la racine du ZIP)

| Élément | Limite |
|---|---|
| taille du zip / nb d'entrées | 32 Mo / 1024 |
| taille de pack.json | 64 Ko, UTF-8 |
| taille totale .wgsl | 256 Ko, UTF-8 |
| format zip | zip64, découpés et chiffrés refusés. Compression : store / deflate uniquement. Chemins dupliqués interdits |

## 4. pack.json

```json
{
  "apiVersion": 3,
  "name": "My Pack",
  "author": "your name"
}
```

| Champ | Requis | Description |
|---|---|---|
| `apiVersion` | requis | Doit correspondre exactement à `3`. Les packs `1`/`2` sont refusés au chargement avec `shaderPack:loadWrongApiVersion` — voir la [partie IX](09-apiv3.md) pour migrer |
| `name` | requis | Non vide. Affiché dans l'interface des réglages |
| `author` | optionnel | Omissible. Les valeurs non-chaînes (nombres etc.) sont des erreurs |

Les autres champs sont ignorés.

## 5. Modèle minimal

Un pack fonctionnel avec juste `pack.json` (section 4) et ce `pack.wgsl` :

```wgsl
// Pack minimal à légère teinte chaude
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

Règles à suivre :

- Ne **construisez jamais les structs de sortie directement** (`BloxdSurface(...)` est une erreur). Partez toujours de `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` et modifiez les champs. Exception : le premier paramètre du hook light (`s: BloxdSurface`) a le type de sortie : `var out = s;` vaut aussi
- `var x: BloxdSurface;` sans initialiser (annotation de type seule) est aussi une erreur
- Les paramètres des hooks sont en **lecture seule**. Pour les changer, copiez d'abord, p. ex. `var sv = s;`
- Interdit d'utiliser le préfixe `bloxd_` dans vos identifiants (sauf les 6 noms de hooks)
- Écrivez les constantes avec `const` (`#define` n'accepte pas de valeurs)

## 6. Les 6 hooks

Tous optionnels. Les signatures doivent correspondre exactement en types (noms de paramètres libres).

| Hook | Rôle |
|---|---|
| `fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex` | Animation des sommets du terrain. **Indisponible en mode strict** |
| `fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface` | Couleur, transparence et émission du terrain. `s.colour` = texture × couleur de sommet |
| `fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight` | Couleur finale du terrain. Appelé à **l'étape finale du fragment** : sa valeur de retour devient la couleur finale telle quelle |
| `fn bloxdLiquidVertex / bloxdLiquidSurface / bloxdLiquidLight` (mêmes formes) | Versions liquides. `alpha` agit comme transparence du liquide |

Règles de repli :

- Sans hook liquide, **le hook terrain de même nom est utilisé** (jamais l'inverse). Écrire seulement surface applique le même effet aux liquides
- Sans hook light, le comportement par défaut s'applique (`engineColour + emission × fogVisibility`)
- Si vous écartez `engineColour` pour reconstruire depuis la couleur de base, réappliquez le brouillard vous-même : `mix(l.fogColour, col, l.fogVisibility)`. En ajoutant de l'émission, multipliez-la d'abord par `fogVisibility`

## 7. 8 variantes et gardes

Vous écrivez un seul code, mais il doit compiler dans les **8 combinaisons {strict, allow} × {éclairage on, éclairage off} × {terrain, liquide}**.
Seuls `#define` (drapeau seul, sans valeurs) / `#ifdef` / `#ifndef` / `#else` / `#endif` existent. `#` doit ouvrir sa ligne (y compris dans les fonctions).

| Garde | Sens | Usage |
|---|---|---|
| `#ifndef BLOXD_STRICT` | Hors strict (allow) uniquement | Entoure tout le hook vertex et `discard` |
| `#ifdef BLOXD_LIGHTING` | Éclairage activé uniquement | Entoure le code touchant `blockLight`, `skyLight`, `ambientLightColour`, etc. **Entourez les fonctions auxiliaires partagées (fn de portée module) comme fonctions entières** (protéger seul le site d'appel ne suffit pas) |
| `#ifdef BLOXD_ALPHA` | Quand le champ `alpha` existe (toujours en liquides, terrain en allow seulement) | Entoure le code touchant `alpha` |

## 8. Fonctionnalités du langage et interdictions

Disponible :

- Fonctions intégrées WGSL (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select`, etc.)
- Vos propres `fn` / `struct` / `const` / `alias` / `var<private>`, plus `let` et contrôle de flux (if/for/while/switch etc.) dans les fonctions
- Dérivées (`dpdx` / `dpdy` / `fwidth`) uniquement en hooks surface/light (étape fragment). Pas en vertex
- Tableaux `const` (ex. LUTs de palette), pointeurs (`ptr<function, T>`), matrices (`mat3x3f` etc.)
- Définitions de drapeaux `#define NOM` + branchement `#ifdef`

Interdit / prudence :

- **Pas de textures** : types `texture_*` / `sampler` inutilisables. Construisez le détail en procédural (bruit de hachage etc.)
- **`discard` interdit en mode strict** (entourez avec `#ifndef BLOXD_STRICT`)
- `@attribute` / `enable` / `requires` / `override` interdits. Comme `enable f16;` ne peut s'écrire, **les types f16 sont de fait inutilisables**
- Les attributs `@builtin` sont aussi interdits : `fragCoord` (coordonnées écran) et `vertex_index` illisibles
- **Pas de `let` en portée module** (utilisez `const` ou `var`)
- `atomic` inutilisable
- Les coordonnées sont en local-noa. Ajoutez `bloxdOriginOffset()` pour le monde. Coordonnées de bloc : `bloxdFaceBlock(position, normal)`

## 9. Validation, tests et distribution

Le chargement exécute ces contrôles dans l'ordre :

1. Contrôles de limites du chargeur (plafonds de la section 3)
2. Compilation statique (les 8 variantes)
3. Compilation réelle dans le WebGPU du navigateur (la validation statique ne vérifie pas tous les types ; certains codes n'échouent qu'ici — évitez les pièges de la section 8)

Étapes :

1. Chargez le zip / dossier via réglages → Shader Pack
2. Vérifiez le statut. Juste après la sélection apparaît "Ready. Reload the page to use it." — après rechargement de la page, "Ready to use" signifie le succès. Face à "Saved, but it won't run until you fix these errors...", corrigez les erreurs listées (fichier:ligne + variante) et rechargez
3. Rechargez la page pour activer. Supprimez avant tout forçage de moteur (renderer override) en paramètres URL ou localStorage, sinon le pack refusera de démarrer
4. Testez d'abord en jeux permissifs puis en jeux stricts (la majorité). L'animation de sommets ne marche qu'en jeux allow
5. Pour distribuer, zippez avec `pack.json` au sommet (dans les limites de la section 3). Le pack peut être remplacé sur le même écran, mais ne prend effet qu'après un rechargement de la page (étapes 2–3). Remove Pack le supprime. La revalidation après mises à jour du jeu tourne seule au chargement de page

[Retour au manuel](README.md)·[Partie suivante →](02-api.md)

[← Partie précédente](01-making.md)·[Retour au manuel](README.md)·[Partie suivante →](03-recipes.md)

# Partie II : Référence API

> Le jeu actuel exige `apiVersion: 3` depuis le 2026-10-19 et refuse les packs v1/v2 au chargement — le contenu ci-dessous est écrit sur la spécification v2. Consultez la [partie IX](09-apiv3.md) pour migrer avant de distribuer.

## 10. En-tête moteur (préfixé automatiquement au code du pack)

Le moteur insère automatiquement le code ci-dessous devant le code du pack (les packs ne peuvent le redéclarer). Les sections en `#ifdef` varient selon la variante.

```wgsl
// Engine-provided and read-only to packs. apiVersion 2.
const bloxdTimeWrap: f32 = 3600.0;   // seconds until time wraps to 0

fn bloxdTime() -> f32;               // seconds. wraps to 0 every 3600 s
fn bloxdOriginOffset() -> vec3i;     // whole blocks. noa-local + this = world coords
fn bloxdEyePosition() -> vec3f;      // camera position (noa-local)
fn bloxdSunDirection() -> vec3f;     // sun direction (unit vector, non-zero only with earth skybox)
fn bloxdWorldPosition(position: vec3f) -> vec3f;  // noa-local -> world coords
fn bloxdFaceBlock(position: vec3f, normal: vec3f) -> vec3i;  // world block coords of this face
fn bloxdApplyFog(colour: vec3f, l: BloxdLightIn) -> vec3f;   // mix(l.fogColour, colour, l.fogVisibility)

struct BloxdVertexIn {
    position: vec3f,   // noa-local world space (world minus bloxdOriginOffset())
    normal: vec3f,
    blockId: u32,      // owning block id (flat-interpolated, uniform across the face)
}

#ifndef BLOXD_STRICT
struct BloxdVertex {
    position: vec3f,     // noa-local
}
#endif

struct BloxdSurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    blockId: u32,        // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdSurface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct BloxdLightIn {
    litColour: vec3f,          // engine lighting result (before emission and fog)
    engineColour: vec3f,       // post-fog = bloxdApplyFog(litColour, l). excludes emission
    directional: f32,          // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,            // the material's ambient times the scene's
    blockLight: vec3f,         // voxel block light, tone-mapped (all variants; 0 when unlit)
    skyLight: f32,             // voxel sky light, tone-mapped (all variants; 1 when unlit)
    ambientLightColour: vec3f, // present in all variants (white when unlit)
    skyLightColour: vec3f,     // present in all variants (white when unlit)
    heldLight: vec3f,          // held light here (all variants; 0 when unlit/out of range)
    fogColour: vec3f,
    fogVisibility: f32,        // 1 = no fog, 0 = fully fogged (renamed from v1 fogFactor)
    position: vec3f,           // as in BloxdSurfaceIn
    normal: vec3f,
    blockId: u32,              // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdLight {
    colour: vec3f,
}

// liquid variants, surface / light hooks only
struct BloxdOpaqueBehind {
    found: bool,       // false when no opaque face behind (sky)
    position: vec3f,   // opaque face position behind (noa-local)
    distance: f32,     // distance from the eye
}
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind;

#ifndef BLOXD_STRICT
fn bloxdDefaultVertex(v: BloxdVertexIn) -> BloxdVertex;
#endif

fn bloxdDefaultSurface(s: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdDefaultLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight;
```

Points clés :

- `bloxdTime()` est un temps écoulé bouclant toutes les 3600 secondes (`bloxdTimeWrap`). Aucune garantie de synchro avec l'horloge jour/nuit du jeu. La visibilité de stage du bind group étant VERTEX|FRAGMENT, **appelable aussi depuis les hooks vertex**
- `bloxdSunDirection()` est un vecteur unitaire tant qu'un soleil existe ; zéro quand le ciel n'a pas de soleil. **La lune est toujours en `-bloxdSunDirection()`** (le moteur calcule la position lunaire comme l'opposé exact du soleil). Les builds actuels n'ont pas de cycle jour/nuit : soleil, lune et étoiles ne bougent jamais en cours de partie (seules des opacités basculent, comme `dayNightSunOpacity`). Dans le ciel terrestre par défaut, le soleil est fixe à ≈ `(−0.56, 0.81, −0.18)` (élévation ~54°). **Ne passez jamais un vecteur zéro à `normalize`** — testez l'absence de soleil avec `dot(d, d) < 1e-8` et repliez-vous sur une direction constante (voir [Partie VII](07-internals.md) §28)
- ※Note : écrit avant comme « non réutilisable comme direction lunaire à zéro ». La direction elle-même est disponible via `-bloxdSunDirection()`, mais les packs de distribution doivent brancher sur `sunPresent` sur prémisse zéro (voir R2 pour le pseudo look bleu, [Partie VII](07-internals.md) R-A pour le clair de lune directionnel)
- `emission` s'ajoute après le calcul d'éclairage, atténuée par **`fogVisibility`** (l'implémentation defaultLight `engineColour + emission × fogVisibility`. L'émission disparaît aussi au loin totalement brumeux)
- **Ordre d'application du brouillard** : le fragment traite ① composition éclairage/émission → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ appel au hook light → ⑤ return. Donc **engineColour arrive déjà brumé**, et **la valeur rendue du hook light devient la couleur finale telle quelle** (après le hook, le brouillard n'est pas réappliqué)
- **Source de fogVisibility** : distance en espace de vue (calculée par sommet, interpolée). En mode linear `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **Quand fogMode == 0** : `fogColour` arrive en `vec3f(0.0)` (noir). Le code estimant des plages horaires par la teinte de fogColour doit faire attention
- **Réglages réels du brouillard dans les builds actuels** : **linear fixe**. `fogStart` = distance de chunks, `fogEnd` = +1 chunk (horizon seul). Avec brouillard off, fixé à 100 / 101 chunks, de fait désactivé. Couleur de brouillard par défaut RGB(183, 191, 195)
- L'uniform `bloxdPackInputs` (`@group(3) @binding(0)`, 64 o) **ne s'utilise que via les fonctions d'en-tête**. Ne le référencez jamais directement depuis les packs. La visibilité de stage étant VERTEX|FRAGMENT, les fonctions d'en-tête s'appellent aussi depuis les fonctions de portée module hors hooks et depuis les hooks vertex. La texture de profondeur (binding 1) étant réservée au FRAGMENT, `bloxdOpaqueBehind()` est limité aux hooks surface / light
- **`skyLight` / `blockLight` / `heldLight` arrivent après une "courbe de lift"**. Le `tone-mapped` des commentaires d'en-tête désigne ceci : le moteur applique toujours `y = 1-(1-x/(3-2x))³` (courbe S relevant les zones sombres) aux fragments avant de les remettre aux packs. Ni valeurs voxel brutes (n/15) : sous un arbre (brut 0,87) arrive relevé à **0,97**
- `skyLight` est pour l'essentiel la donnée d'occlusion voxel de "le ciel est-il visible d'ici" (= une carte d'ombres), pas un simple paramètre de luminosité (voir section 15, « La vérité sur les ombres »)
- **`litColour` comme point de départ** : en v1, seule `engineColour` (déjà brumée) existait, et les rendus d'atmosphère maison finissaient souvent en double brouillard. En v2, partez de `litColour` (avant brouillard, avant emission) et réappliquez le brouillard à votre rythme avec `bloxdApplyFog()`
- **Distinguer les blocs avec `blockId`** : identification indépendante de la couleur de texture. Mais la table ID ↔ type de bloc est interne au moteur : mesurez en monde quel ID vaut quel bloc ; une table toute prête est disponible sur [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (voir [partie VIII](08-apiv2.md))
- **Construction directe de structs interdite** : les appels constructeurs comme `BloxdLight(...)` sont rejetés par la validation statique. Partez toujours de `bloxdDefault*` ou copiez l'entrée

## 11. Tableau des variantes

| Variante | BLOXD_STRICT | BLOXD_LIGHTING | BLOXD_ALPHA |
|---|---|---|---|
| allow + unlit + terrain | – | – | ✓ |
| allow + unlit + liquide | – | – | ✓ |
| allow + lit + terrain | – | ✓ | ✓ |
| allow + lit + liquide | – | ✓ | ✓ |
| strict + unlit + terrain | ✓ | – | – |
| strict + unlit + liquide | ✓ | – | ✓ |
| strict + lit + terrain | ✓ | ✓ | – |
| strict + lit + liquide | ✓ | ✓ | ✓ |

Les formes des structs d'en-tête changent aussi par variante (pas de `BloxdVertex` en strict, pas de `blockLight` etc. en unlit, pas d'`alpha` en terrain strict).

Les symboles officiellement définis ne sont que 4 (les 3 ci-dessus + `BLOXD_SCENE_DEPTH` — [partie VIII](08-apiv2.md) §35). Terrain vs liquide n'est pas un symbole mais un **programme séparé** : des branches comme `#ifdef BLOXD_TERRAIN` sont impossibles. La correspondance des noms de drapeaux est insensible à la casse ; un nom erroné dans `#ifdef` fait lister par le message d'erreur les 4 noms valides. Les fonctions de hook ne sont injectées que dans les programmes terrain et liquide — les packs ne peuvent pas affecter les entités, les particules ni aucun autre rendu.

## 12. Antisèche de squelette

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);          // construction directe interdite ; toujours partir de default
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // le terrain n'a alpha qu'en allow
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);         // engineColour + emission*fogVisibility
    #ifdef BLOXD_LIGHTING                       // protégez les entrées éclairage seul
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex toujours avec cette garde
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdTime()) * 0.05;
    return out;
}
#endif
```

Cinq points à garder en tête : compiler propre dans les 8 variantes / les jeux stricts sont la majorité / pas de textures / paramètres de hooks en lecture seule / pas de `let` en portée module.

[← Partie précédente](01-making.md)·[Retour au manuel](README.md)·[Partie suivante →](03-recipes.md)

[← Partie précédente](02-api.md)·[Retour au manuel](README.md)·[Partie suivante →](04-realism.md)

# Partie III : Recettes

> Le jeu actuel exige `apiVersion: 3` depuis le 2026-10-19 et refuse les packs v1/v2 au chargement — le contenu ci-dessous est écrit sur la spécification v2. Consultez la [partie IX](09-apiv3.md) pour migrer avant de distribuer.

- [R1. Recettes de couleur (surface)](#r1-recettes-de-couleur-surface)
- [R2. Recettes d'éclairage (light)](#r2-recettes-déclairage-light)
- [R3. Recettes d'émission](#r3-recettes-démission)
- [R4. Recettes de coordonnées (monde / bloc / vue)](#r4-recettes-de-coordonnées-monde--bloc--vue)
- [R5. Recettes de temps (animation)](#r5-recettes-de-temps-animation)
- [R6. Recettes de liquides](#r6-recettes-de-liquides)
- [R7. Recettes de sommets (allow seul)](#r7-recettes-de-sommets-allow-seul)
- [R8. Astuces math](#r8-astuces-math)
- [R9. Recettes réalistes](#r9-recettes-réalistes)

---

> **Important :** les recettes ci-dessous sont des exemples individuels, pas à concaténer de haut en bas. Coller plusieurs définitions du même nom de hook (`bloxdTerrainLight` etc.) ou du même nom de fonction auxiliaire duplique les définitions dans un module et échoue la compilation. Pour combiner des effets, fusionnez-les en une fonction par type de hook.

## R1. Recettes de couleur (surface)

### Teinte unique (le plus basique)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Booster / couper la saturation

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount : +0,3 vif / -1,0 monochrome total
```

### Température de couleur (chaud ⇄ froid)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth : +1,0 = chaud (rouge fort), -1,0 = froid (bleu fort)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### Vintage / sépia

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### Dégradé d'altitude (plaines chaudes)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 1..0 sur hauteur 0..50
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Peindre par orientation (haut = clair, murs = sombres)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // sol 1 / mur 0 / plafond -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // murs et plafonds un peu plus sombres
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Postérisation (moins de couleurs)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

## R2. Recettes d'éclairage (light)

### Courbe en S de contraste

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### Brume de distance (brouillard maison)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 0..0,35 de brouillard maison de 64 à 192 blocs
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### Nuit (virage bleu par skyLight + protection des lampes)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
    #endif
    return out;
}
```

### Grottes bien noires (assombrir où il n'y a pas de skyLight)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    out.colour *= mix(1.0, 0.35, underground * underground);
    #endif
    return out;
}
```

> `skyLight` arrive post-lift (section 10) : l'occlusion légère (sous arbres : brut 0,87 → lifté 0,97) s'assombrit à peine avec cette méthode. Efficace pour les grottes (brut 0). Pour marquer « l'ombre des arbres », utilisez inversion + seuil de R9.12.

### Bleu nocturne ambiant (pseudo look sans direction lunaire)

> Dans cette API, `bloxdSunDirection()` vaut zéro quand le ciel n'a pas de soleil. Ce qui suit n'est pas un clair de lune directionnel, juste un faible ambiant bleu quand le ciel est sombre. La direction lunaire elle-même est disponible via `-bloxdSunDirection()` (mondes à cycle jour/nuit seuls. [Partie VII](07-internals.md) R-A).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let upward = clamp(l.normal.y, 0.0, 1.0);
    out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
    #endif
    return out;
}
```

### Chaleur de couchant (teinte par hauteur du soleil)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 1 à l'horizon / 0 au zénith
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### Remplacement total de la sortie moteur (rééclairage simple)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    #ifdef BLOXD_LIGHTING
    // NOTE : construction directe de BloxdLight(...) interdite ; réécrire colour depuis default
    var out = bloxdDefaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // écarte engineColour (le résultat d'éclairage du moteur) et utilise « couleur de base × luminosité calculée »
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogVisibility);   // engineColour écarté : refaire brouillard obligatoire
    out.colour = col + s.emission * l.fogVisibility;   // ajoutez emission vous-même aussi (obligatoire)
    return out;
    #else
    return bloxdDefaultLight(s, l);
    #endif
}
```

## R3. Recettes d'émission

> `emission` s'ajoute après le calcul d'éclairage, mais le traitement par défaut **l'atténue avec `fogVisibility`. Au loin totalement brumeux, l'émission disparaît aussi. Pour garder de l'éclat au loin, n'ajoutez pas à emission — ajoutez directement en `out.colour += ...` dans le hook light** (engineColour porte déjà le brouillard : au loin, la lumière tombe sur la couleur de brouillard)

### Lampes pulsantes (torches qui respirent)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(bloxdTime() * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### Allure de minerai lumineux (les matériaux clairs émettent)

```wgsl
// côté surface : plus le matériau est clair (blanc), plus d'émission
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### Nuée de lucioles (points de lumière à la dérive)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // quelques « orbes de lumière » à la dérive lente ; éclat par inverse de distance
    let t = bloxdTime() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdTime() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. Recettes de coordonnées (monde / bloc / vue)

### Coordonnées monde

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### Coordonnées de bloc

```wgsl
let worldBlock = bloxdFaceBlock(l.position, l.normal);
```

### Damier (par bloc)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 ou 1
out.colour *= mix(0.96, 1.04, checker);
```

### Pseudo-aléatoire par bloc (hachage)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// usages : variation d'herbe, mouchetage de pierre, etc.
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### Vecteur de vue et rim light

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### Angle de vue (fresnel maison — pour liquides)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 de face / 0 rasant
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. Recettes de temps (animation)

> `bloxdTime()` boucle toutes les 3600 secondes (1 heure). C'est le temps écoulé du shader, sans garantie de synchro avec le jour/nuit du jeu. Pour l'animation périodique visuelle OK, mais préférez `bloxdSunDirection()` et les entrées d'éclairage pour détecter la vraie nuit.

### Cycle jour-nuit (1 jour par heure)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdTime() * 6.2831853 / 3600.0);   // 0..1 période d'une heure ; pas forcément synchro avec le jour/nuit du jeu
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### Oscillation (sinus superposés)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### Bandes d'aurore / franges fluorescentes

```wgsl
// mélange 3 couleurs par position XZ et temps
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

## R6. Recettes de liquides

### Surface ridée (scintillement de couleur)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdOriginOffset().x);
    let worldZ = s.position.z + f32(bloxdOriginOffset().z);
    let ripple = sin(bloxdTime() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid a toujours BLOXD_ALPHA — garde par habitude
    #endif
    return out;
}
```

### Transparence pseudo par hauteur (pas un vrai test de bas-fond)

> En v1, profondeur de scène et position du fond inconsultables : la vraie profondeur ne se calculait pas avec cette seule API. En v2, `bloxdOpaqueBehind()` mesure l'épaisseur jusqu'à la face opaque derrière, en liquides seuls ([partie VIII](08-apiv2.md) R-E). Ci-dessous l'ancien pseudo-effet sans cela : `s.position.y` est une coordonnée locale et l'utiliser brute déplace l'effet avec l'origine du chunk. Il ne fait varier alpha que par hauteur monde — pseudo effet, pas une vraie représentation de bas-fond suivant le littoral ou le fond. Ajustez `packWaterReferenceY` à votre hauteur monde.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // plus fin en bas, plus proche de l'alpha de base en haut ; vérifiez le sens en jeu
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### Trouble sous-marin vu de l'intérieur

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### Pack liquides seuls (terrain intact)

```wgsl
// n'écrivez aucun hook terrain_*. Alors :
//  - variantes terrain = sans hooks = défauts moteur
//  - variantes liquid  = seuls les hooks liquid_* agissent
```

## R7. Recettes de sommets (allow seul)

> Tout entourer de `#ifndef BLOXD_STRICT`.
> Pour les conditions exactes (liste des titres allow ; Custom Games est strict) voir §30 : [§30 Modes d'application par jeu](07-internals.md#30-modes-dapplication-par-jeu-shaderpackpolicy)

### Herbe au vent (ne bouger que les pointes)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdTime() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // faces verticales seules
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### Vagues en liquide (faces du dessus seules)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdTime() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdTime() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### Terrain pulsant

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdTime() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // légère expansion/contraction le long des normales
    return out;
}
#endif
```

### Terrain ondulant (vagues sinus géantes)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdTime() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdTime() * 0.7) * 0.3;
    return out;
}
#endif
```

## R8. Astuces math

```wgsl
// quantification douce de 0..1 (n paliers)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// seuil 2 niveaux (ombre toon)
let shadow = smoothstep(0.35, 0.37, level);   // ±0,02 autour du seuil crée des marches

// toon 3 niveaux
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// luma (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// pulsation douce
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// onde triangulaire (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// secondes → « phase lente » (pour effets ignorant le cycle de 3600 s)
let phase = t * 0.15;
```

## R9. Recettes réalistes

> Recettes physiques pour « reconstruire le look vanille depuis les matériaux ». Lisez ces prémisses d'abord :
>
> 1. **Le hook light est appelé à l'étape finale du fragment**. Sa couleur rendue devient la couleur finale telle quelle. **Vous devez réappliquer le brouillard** (R9.10)  
> 2. **L'éclairage par défaut du moteur n'est que multiplication**. Specular / fresnel / séparation chaud-froid / ambiant hémisphérique se construisent de zéro  
> 3. `l.engineColour` est la couleur terminée (déjà brumée). Reconstruire depuis `s.colour` (albedo) est l'approche complète  
> 4. Textures interdites → tout détail doit être **procédural** (hash/bruit) (R9.8)

### R9.1 Torches chaudes × ciel froid

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // clamp intermédiaire
    col = mix(l.fogColour, col, l.fogVisibility);                    // refaire brouillard
    out.colour = col + s.emission * l.fogVisibility;                 // re-ajouter emission
    #endif
    return out;
}
```

### R9.2 Specular solaire (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);          // vecteur médian
        let ndh = max(dot(n, h), 0.0);
        let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
        let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
        out.colour += spec * vec3f(1.0, 0.97, 0.90);
    }
    #endif
    return out;
}
```

### R9.3 Fresnel de Schlick

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // fin éclat de bord
    #endif
    return out;
}
```

### R9.4 Ambiant hémisphérique (ciel dessus / rebond du sol dessous)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // dessous : rebond
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // dessus : lumière du ciel
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // clamp intermédiaire
    col = mix(l.fogColour, col, l.fogVisibility);                           // refaire brouillard
    out.colour = col + s.emission * l.fogVisibility;                        // re-ajouter emission
    #endif
    return out;
}
```

### R9.5 ACES filmique (approximation de Narkowicz)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1,2 = exposition
    return out;
}
```

### R9.6 Perspective aérienne (« atmosphère » par désaturation à distance)

> Contrairement au brouillard (remplacement de couleur), superposer « désaturation à distance » rend les lointains bien plus réalistes.  
> Prudence : ne baissez que la saturation — jamais la luminance.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // chute (~30 % à 100blk / ~75 % à 400blk)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // ne baisse que la saturation (luminance intacte)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 Normales de vague + scintillement solaire (« route du soleil » sur l'eau)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // hauteur h = 0,50 sin(px+1,6t) + 0,35 sin(1,35pz+1,28t) + 0,15 sin(0,7(px+pz)-1,76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // dh/dx
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // dh/dz
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = bloxdWorldPosition(l.position);
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdTime()), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);
        let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
        out.colour += glint * vec3f(1.0);
    }
    #endif
    return out;
}
```

### R9.8 Micro-relief procédural (astuce contre l'interdit textures)

```wgsl
fn pack_hash(p: vec3f) -> f32 {
    return fract(sin(dot(p, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
}
fn pack_bumpNormal(p: vec3f, n: vec3f, strength: f32) -> vec3f {
    let e = 0.15;
    let h0 = pack_hash(p);
    let hx = pack_hash(p + vec3f(e, 0.0, 0.0));
    let hz = pack_hash(p + vec3f(0.0, 0.0, e));
    let tangentX = normalize(cross(vec3f(0.0, 1.0, 0.0), n) + vec3f(0.0001, 0.0, 0.0));
    let tangentZ = normalize(cross(n, tangentX));
    return normalize(n + tangentX * (hx - h0) * strength + tangentZ * (hz - h0) * strength);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // coords locales du bloc
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lam = clamp(dot(n, sunDir), 0.0, 1.0);
        let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
        out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
    }
    #endif
    return out;
}
```

### R9.9 Assombrissement non linéaire des grottes + protection des lampes

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let keep = 0.12 + 0.88 * blockInt;          // relève les foyers à lampes
    out.colour *= mix(keep, 1.0, sky * sky);     // assombrissement non linéaire (au carré)
    #endif
    return out;
}
```

### R9.10 Réappliquer le brouillard (obligatoire en écartant engineColour)

> Un plancher comme `max(l.fogVisibility, 0.25)` limite « pas plus dense que ceci »  
> (0,0 = fidèle au moteur / 0,3–0,5 = lointain plus clair).  
> Note : le brouillard moteur est linéaire d'horizon seul (près de la distance de dessin) ; la brume moyenne doit être construite côté pack.
> Réglages réels du brouillard (vérifiés en implémentation) : linear fixe / `fogStart` = distance de chunks / `fogEnd` = +1 chunk / de fait désactivé à 100–101 chunks avec brouillard off / couleur par défaut RGB(183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));  // refaire brouillard (0,15 = plancher léger)
    col += s.emission * l.fogVisibility;            // émission aussi brumée
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 Grade cinéma (ombres froides / hautes chaudes / désaturation nocturne)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;  // nuit seulement quand la direction solaire est zéro ; sans dégradé de couchant
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

### R9.12 Ombres projetées — inversion du lift + coupe par seuil (définitif)

> **Rappel de prémisse (section 10)** : `l.skyLight` n'est pas la valeur voxel brute (n/15) mais la valeur après la « courbe de lift » du moteur  
> `y = 1-(1-x/(3-2x))³` (courbe S relevant les zones sombres).
>
> | Lieu | voxel brut | lifté (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | ciel ouvert | 1,00 | 1,00 | 1,00 |  
> | sous arbre (rayon 2) | 0,87 | **0,97** | **0,86** ← presque intact |  
> | rayon 3 | 0,80 | **0,92** | 0,66 |  
> | rayon 5 | 0,67 | 0,78 | 0,29 |
>
> **C'est la cause démontrée de « les ombres ne se creusent pas avec gamma »**. Mais la courbe est monotone et inversible algébriquement :  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Après restauration des valeurs brutes, il suffit de binariser par coupe de seuil (`smoothstep`).  
> La dispersion BFS de LightEngine vaut « 1 bloc = -1 » : le seuil `th = 1 - r/15` règle donc directement  
> « l'occlusion de rayon r ou plus compte comme ombre ». Casser des blocs déplace les ombres aussitôt (LightEngine recalcule en temps réel).  
> Limite : les ombres partent du « ciel vers le haut » et ne tournent donc pas avec le soleil (section 15, « La vérité sur les ombres »).

```wgsl
// Inverse exactement le lift moteur pour restaurer le skyLight voxel brut (n/15)
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // pas de cbrt en WGSL, utiliser pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // cadran de rayon d'ombre : th = 1 - r/15 (0,87 = rayon 2+ en ombre)
const shSoft = 0.04;   // douceur de bord (0,02 = dur / 0,08 = doux)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. restaure valeurs brutes (le sauter ne donne jamais d'ombres)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. coupe par seuil — sépare proprement soleil=1 / ombre=0
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // Lambert solaire (repli sur l.directional sans soleil)
    let sunLen = length(bloxdSunDirection());
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                      sunLen > 0.5);
    // l'essence de la projection : le soleil direct n'atteint que le ciel visible
    let lit = sunL * sky;
    // côté ombre : teinté bleu ciel, pas noir + ambiant minimum
    let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
    var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
    // la lumière de torche perce les ombres (blockLight aussi lifté : restaurer ensemble)
    let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                         sh_unlift(l.blockLight.g),
                         sh_unlift(l.blockLight.b));
    let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
    col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
    // réapplique le brouillard (la part d'engineColour écartée)
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));
    out.colour = clamp(col + s.emission * l.fogVisibility, vec3f(0.0), vec3f(1.0));   // n'oubliez pas emission (brumée)
    #endif
    return out;
}
```

> Guide de réglage : **la surface d'ombre tient au seul `shTh`** — `0,93` = rayon 1,5+ / `0,87` = rayon 2 / `0,80` = rayon 3 / `0,67` = rayon 5.  
> La dureté du bord, c'est `shSoft` (0,02 = dur / 0,08 = doux). L'obscurité du cœur, c'est le double réglage de `0,09` (ambiant minimum) et `0,16` (lumière dispersée du ciel).  
> Pour élargir les ombres au couchant, ajoutez `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (approximation des longues ombres du soir.  
> `sunDir` vaut `bloxdSunDirection() / length(bloxdSunDirection())`). Pour des ombres plus bleues, montez le B de `vec3f(0.72, 0.82, 1.05)`.
>

[← Partie précédente](02-api.md)·[Retour au manuel](README.md)·[Partie suivante →](04-realism.md)

[← Partie précédente](03-recipes.md)·[Retour au manuel](README.md)·[Partie suivante →](05-troubleshooting.md)

# Partie IV : Guide du réalisme

> Le jeu actuel exige `apiVersion: 3` depuis le 2026-10-19 et refuse les packs v1/v2 au chargement — le contenu ci-dessous est écrit sur la spécification v2. Consultez la [partie IX](09-apiv3.md) pour migrer avant de distribuer.

## 13. Éclairage moteur par défaut et marge de réalisme

L'éclairage moteur par défaut n'est « que multiplication » — ni specular, fresnel, séparation chaud/froid, ni ambiant hémisphérique n'existent. Voici ce qui se reconstruit :

| Fonction | Par défaut | Reconstructible en packs ? |
|---|---|---|
| Diffus (Lambert) | Somme scalaire des directionnelles seules | ◎ Maison avec `bloxdSunDirection()` (sources enveloppées etc.) |
| Specular | Néant | ◎ Blinn-Phong (R9.2) |
| Fresnel | Néant | ◎ Approximation de Schlick (R9.3) |
| Séparation torche chaude / ciel froid | Sans couleur | ◎ (R9.1) |
| Ambiant hémisphérique | Sans direction | ◎ Ciel dessus / sol dessous (R9.4) |
| Mappage de tons | Néant (clamp seul) | ◎ ACES filmique (R9.5) |
| Perspective aérienne | Brouillard seul (remplacement de couleur) | ◎ Désaturation à distance (R9.6) |
| Détail de surface | Résolution de texture seule | △ Micro-relief procédural au hachage (R9.8) |
| Ondes de sommets (eau) | Néant (plan) | ◎ Allow seul (R7) |
| Normales de vague / scintillement solaire | Néant | ◎ (R9.7) |
| Clair de lune nocturne | La couleur du ciel s'assombrit seulement | △ La direction lunaire est en `-bloxdSunDirection()` : pseudo looks (ambiant bleu en R2 / désaturation en R9.11) plus clair de lune directionnel (R-A, cycle jour/nuit seul) |
| Ombres (occlusion du ciel) | Doux mélange via `mix(ambiant, ciel, skyLight)` seul | ◎ Inversion du lift + coupe par seuil + porte solaire (R9.12). L'ombre des arbres et sous les toits chute nettement, suivant les éditions de blocs en temps réel |

## 14. Deux écoles d'implémentation

**École A : retouches additives (depuis defaultLight)** — utilise `engineColour` (couleur terminée) comme base et ajoute éclat chaud ou rim. Facile et sûr, mais le modèle d'éclairage reste celui par défaut.

**École B : rééclairage total (depuis s.colour)** — écarte `l.engineColour` et reconstruit l'éclairage depuis `s.colour` (albedo) et les matériaux LightIn bruts. La vraie voie du réalisme. Quatre règles :

1. **Réappliquez le brouillard** : le hook light tourne post-brouillard ; appliquez `mix(l.fogColour, col, l.fogVisibility)` vous-même (R9.10). Par brouillard dense, posez un plancher avec `max(l.fogVisibility, 0.3)`. Et à l'inverse : mélanger plus de couleur de brouillard dans des packs basés sur engineColour produit un double brouillard blanc
2. **Repli unlit** : passez à `defaultLight` hors `#ifdef BLOXD_LIGHTING`
3. **Protégez des fonctions partagées entières** : entourez en `#ifdef BLOXD_LIGHTING` en fonctions complètes les fonctions partagées prenant `BloxdLightIn` (protéger seuls les appels ne suffit pas)
4. **Sans direction solaire** : si `bloxdSunDirection()` est zéro, ne calculez pas de specular directionnel. `l.directional` est un scalaire de quantité de lumière, pas un vecteur de direction : il ne restaure pas la direction du reflet. Basculez sur un ambiant faible sans direction si besoin. La direction lunaire est disponible via `-bloxdSunDirection()` (ne bouge que dans les mondes à cycle jour/nuit. [Partie VII](07-internals.md) R-A)

## 15. Looks inatteignables (le « plafond » du réalisme)

| Look | Motif |
|---|---|
| Shadow maps pixellisées (ombres tournant avec le soleil, pénombre) | Textures de profondeur non référençables (`bloxdOpaqueBehind()`, en liquides seuls, n'est que de l'info géométrique : inutilisable en shadow maps). L'occlusion de rayons n'arrive pas aux hooks |
| SSAO | Sans accès à la profondeur de scène (seule l'AO de sommets du mesher ; la profondeur en liquides seuls ne sert pas au SSAO) |
| SSR (reflets) | Couleur de scène inaccessible. Pseudo looks seuls mêlant la couleur du ciel via fresnel |
| Bloom / glare | Sans hook au post-traitement |
| Profondeur de champ, aberration chromatique, grain | Post-traitement plein écran requis |
| Lumière volumétrique (god rays) | Idem |
| Textures PBR | Lectures de textures interdites. Pseudo estimation seule depuis la luminance de couleur |
| Réfraction sous-marine | Couleur de scène inaccessible. Mais la profondeur en liquides seuls (`bloxdOpaqueBehind()`) permet absorption par épaisseur et projection du fond ([partie VIII](08-apiv2.md) R-E) |
| Voile sous-marin (teinte bleue) : retirer / changer | Le voile est un quad emissive plein écran généré depuis la couleur/alpha de définition du bloc liquide de la caméra, dessiné hors des pipelines de hooks (tout devant) : le pack ne peut en changer ni couleur ni densité |
| Détection sous-marine directe | Aucune entrée n'indique la submersion de caméra, et fogStart / fogEnd / fogColour ne changent pas sous l'eau : il n'existe pas non plus de moyen fiable de l'estimer depuis fogVisibility etc. |

### La vérité sur les ombres — les « ombres d'arbres » se font

Seuls les **shadow maps pixellisées tournant avec le soleil** sont impossibles dans le tableau. Le moteur calcule déjà des « ombres » depuis le début, et c'est `skyLight`. Le LightEngine côté maille utilise un algorithme façon Minecraft :

1. **Balayage de colonnes** : parcourt chaque colonne (x,z) de haut en bas. La lumière du ciel part de 15, devient **0 aux blocs opaques**, en s'atténuant à la descente avec `lightFilter` (air 1 / eau 3 / opaque 15)
2. **Remplissage BFS** : s'étend latéralement vers 6 voisins (-1 par bloc) — ceci adoucit les bords d'ombre. La valeur brute sous occlusion de rayon r vaut (15-r)/15
3. blockLight (torches etc.) est un BFS séparé à 3 canaux RVB (empaqueté 4bit)

Donc `l.skyLight` n'est pas un simple paramètre de luminosité mais **la donnée d'occlusion voxel de « le ciel est-il visible d'ici » = une carte d'ombres**. Sous les arbres, sous les toits et à l'intérieur, elle est déjà numériquement basse, arrivant lissée par interpolation de sommets. Poser/casser des blocs recalcule aussitôt = **des ombres qui suivent en temps réel**. Vanilla ne l'utilise que « doucement » via `mix(ambiant, ciel, skyLight)`.

Les bons outils sont les deux étapes de R9.12 (**restaurer les valeurs brutes via inversion du lift → binariser par seuil `smoothstep`**. `th = 1 - r/15` règle directement le « rayon d'occlusion traité comme ombre ») plus **ouvrir le soleil direct avec sky** (le soleil n'atteint que le ciel visible = l'essence de la projection), avec teinte chaude au soleil / froide à l'ombre.

**Limites honnêtes** : ces ombres partent du « ciel vers le haut » et **ne tournent donc pas quand le soleil bouge**. La résolution est par bloc (les bords doux viennent de la dispersion BFS). Le gabarit d'éclairage contient encore un stub fermé `var shadow: f32 = 1.;` pour les shadow maps (toujours 1.0 = désactivé) — interprété comme trace d'ombres rotatives pixellisées « planifiées ». Si ces ombres sont indispensables, seules des voies hors API restent (p. ex. injection GLSL par userscript, avec risque de politique).

### La réalité sous-marine

Les looks sous-marins constent de 3 couches :

| Couche | Contenu | Opérable depuis les packs ? |
|---|---|---|
| ① Rendu terrain/liquide | Traitable par hooks. Les hooks light s'appellent normalement sous l'eau | Oui (fonctionne « sous le voile ») |
| ② Voile de définition liquide | Quad emissive plein écran depuis la couleur/alpha de définition du bloc liquide de la caméra, dessiné tout devant. Le réglage `cameraTint` gagne s'il existe | Non (ni couleur ni densité changeables) |
| ③ cameraTint | Réglage du jeu | Non |

Points pratiques : les packs continuent sous l'eau / le voile ne se retire pas / sous l'eau on ne branche pas (fogStart / fogEnd / fogColour ne changent pas sous l'eau : fogVisibility ne le détecte pas non plus).

## 16. Astuces de débogage

- Grottes trop claires → manque de courbe non linéaire de `skyLight` (recette de grottes R2 / R9.9)
- Jours cramés → baissez l'exposition pré-ACES
- Nuits trop noires → assurez un ambiant minimum (le `skyLightColour` nocturne est presque noir par prémisse)
- Lointain trop brumeux → baissez les coefficients aériens
- Tout orange autour des torches → baissez la proportion chaude (conservez de la lumière brute teintée)
- Blocs presque tout blancs → le total de sortie du hook light dépasse 1.0 (sans clamp en aval). Terminez avec `clamp(col, vec3f(0.0), vec3f(1.0))`
- Blanc sans additions → inversion un-fog par division avec fogVisibility. Retirez un-fog ; reconstruisez depuis `s.colour` et `mix` de brouillard une seule fois à la fin
- Blocs émissifs qui ne brillent pas → manque de re-ajout d'emission en recettes de reconstruction. Ajoutez `+ s.emission * l.fogVisibility`
- La nuit, seules restent des faces éclairées → n'assombrissez pas que les ombres ; atténuez toute la couleur terminée (`engineColour`) de nuit. Pour conserver les lampes locales, atténuez moins avec `blockLight` / `heldLight` ([Partie VI](06-implementation.md), section 19)
- L'ombre ne se creuse pas avec `pow(skyLight, γ)` → `l.skyLight` est post-courbe (section 10). Passez à inversion + seuil de R9.12
- Régler surface/densité d'ombre → guide de réglage de R9.12 (surface = seuil `shTh` / bord = `shSoft` / obscurité du cœur = double réglage d'ambiant minimum et de dispersion du ciel)

[← Partie précédente](03-recipes.md)·[Retour au manuel](README.md)·[Partie suivante →](05-troubleshooting.md)

[← Partie précédente](04-realism.md)·[Retour au manuel](README.md)·[Partie suivante →](06-implementation.md)

# Partie V : Dépannage et notes

> Le jeu actuel exige `apiVersion: 3` depuis le 2026-10-19 et refuse les packs v1/v2 au chargement — le contenu ci-dessous est écrit sur la spécification v2. Consultez la [partie IX](09-apiv3.md) pour migrer avant de distribuer.

## 17. Erreurs courantes et solutions

| Symptôme | Solution |
|---|---|
| Ne charge pas en jeux stricts | Entourez le hook vertex de `#ifndef BLOXD_STRICT` |
| `.alpha` signalé indéfini | Entourez de `#ifdef BLOXD_ALPHA` |
| `blockLight` signalé indéfini | Entourez de `#ifdef BLOXD_LIGHTING`. Entourez les fonctions auxiliaires partagées **en fonctions entières** (en v2 le champ est toujours présent : en pratique plus d'erreur ; gardez la garde pour les usages de décision) |
| `Packs can't construct BloxdSurface directly` | Partez de `bloxdDefaultSurface(s)` |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | Entourez de `#ifndef BLOXD_STRICT` |
| Lointain blanc et laiteux | Souvent double brouillard. La couleur terminée porte déjà le brouillard : gardez subtile la brume maison et préférez ne baisser que la saturation |
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | Avertissement : la file de graines de lumière a débordé dans les régions à forte densité d'émetteurs ou à travers les frontières de régions, et le calcul de lumière de ce chunk a été écourté. Pas d'origine « pack », mais **les trous de lumière autour des concentrations d'émetteurs viennent de cette limite** — disperser les sources de lumière dans le monde l'évite |
| Pack exclu en rejoignant le jeu | Échec du contrôle en direct du jeu. Revoyez les oublis de gardes |
| Le contrôle en direct ne se termine jamais et le pack tombe avec `This device couldn't check …` etc. | Le contrôle a un délai forcé de 60 secondes (le dépassement compte comme `skipped`). Fréquent sur appareils faibles / mondes lourds — allégez le travail vertex lourd et les boucles complexes, puis réessayez |
| `pack.json needs "apiVersion": 3.` | `apiVersion` manquant ou différent de `3`. Mettez le nombre `3` (la chaîne `"3"` est rejetée). Les packs v1/v2 sont refusés avec `shaderPack:loadWrongApiVersion` |
| `There's no pack.json at the top of the pack.` | Pas de `pack.json` à la racine du ZIP. Vérifiez de ne pas avoir zippé le dossier lui-même |
| `bloxdTerrainVertex must be declared as: fn ...` | Signature différente. Réécrivez exactement comme affiché |
| `bloxdTerrainVertex can't run in strict games...` | Entourez le hook vertex de `#ifndef BLOXD_STRICT` |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | Entourez de `#ifdef BLOXD_LIGHTING` (en v2 le champ est toujours présent : normalement plus d'erreur) |
| Monter `pow(l.skyLight, γ)` ne creuse jamais les ombres | `skyLight` est une valeur post-courbe (brut 0,87 arrive en 0,97). Passez à inversion + seuil de R9.12 (section 10) |
| `... can only be a function's parameter or return type, ...` | `var x: BloxdSurface;` sans initialiser est rejeté. Construisez depuis `bloxdDefault*` |
| `bloxdPackInputs isn't part of the bloxd_ header` | L'uniform PackInputs ne peut se référencer directement depuis les packs. Passez par les fonctions d'en-tête comme `bloxdTime()` |
| `Packs can't declare bloxd_ names...` | Retirez le préfixe `bloxd_` de vos identifiants. Seuls les 6 noms de hooks peuvent se définir |
| `loadDuplicateManifest` au chargement zip | Deux `pack.json` (variantes de casse incluses). Gardez-en un |
| `needs the new WebGPU renderer, so remove the renderer override...` | Retirez le paramètre URL `?renderer=` et le `bloxdRenderer` du localStorage, puis rechargez ([Partie VII](07-internals.md) §29) |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Réécrivez depuis `bloxdDefaultSurface(s)`. Partir d'une copie du premier paramètre du hook light (`var out = s;`) vaut aussi |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` est rejeté. Écrivez `_ = f();` |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | Entourez l'appel `bloxdOpaqueBehind()` en hooks terrain avec `#ifdef BLOXD_SCENE_DEPTH` |
| `...only surface and light hooks can use.` | Retirez `bloxdOpaqueBehind()` des hooks vertex (surface / light seuls) |
| `Lite: …reads scene depth on a page that didn't turn it on` | Rechargez la page et rouvrez-la avec le pack qui lit la profondeur activé ([partie VIII](08-apiv2.md) §35). La disponibilité de la texture de profondeur est fixée à la génération de la page |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Pas une erreur mais une désactivation auto en jeux stricts (`shaderPack:offInStrict`). Entourez vertex et `discard` avec `#ifndef BLOXD_STRICT` |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Erreur de 2ᵉ étape (Tint du navigateur). Parenthéser les opérandes de `^` `&` `\|` `<<` `>>` (§38) |

### IDs d'erreurs de la phase de chargement

Les erreurs de l'écran de réglages portent des IDs `shaderPack:load*`. Comme aide-mémoire pour retrouver un message :

| ID | Signification |
|---|---|
| `loadZipTooBig` | zip au-delà de 32 Mo |
| `loadTooManyZipEntries` | plus de 1024 entrées de zip |
| `loadTooManyWgsl` | plus de 256 fichiers `.wgsl` |
| `loadSourceTooBig` | total `.wgsl` au-delà de 256 Ko (contrôle en flux fichier par fichier) |
| `loadManifestTooBig` | `pack.json` au-delà de 64 Ko |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` n'est pas du JSON / pas un objet |
| `loadNoApiVersion` / `loadWrongApiVersion` | `apiVersion` absent / ≠ `3` (packs v1/v2 refusés) |
| `loadNoName` / `loadAuthorNotString` | `name` absent / `author` n'est pas une chaîne |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | compression non prise en charge / zip64 / découpé / chiffré |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | chemins dupliqués / non-UTF-8 / échec de décompression / zip endommagé |

`loadNoManifest` / `loadDuplicateManifest` (position / doublons de `pack.json`) — voir les lignes correspondantes du tableau ci-dessus.

## 18. Droits et notes

- La fonction de packs de shaders est une fonction officielle chargeable depuis l'interface du jeu, et créer des packs est considéré comme un usage prévu. Mais aucune documentation officielle publique n'a été confirmée
- Les packs sont du WGSL pur — exécution JS et accès réseau impossibles par conception
- Ceci est un guide non officiel, pas la position officielle des développeurs. L'API peut changer sans avis

[← Partie précédente](04-realism.md)·[Retour au manuel](README.md)·[Partie suivante →](06-implementation.md)

[← Partie précédente](05-troubleshooting.md)·[Retour au manuel](README.md)·[Partie suivante →](07-internals.md)

# Partie VI : Notes d'implémentation importantes

> Le jeu actuel exige `apiVersion: 3` depuis le 2026-10-19 et refuse les packs v1/v2 au chargement — le contenu ci-dessous est écrit sur la spécification v2. Consultez la [partie IX](09-apiv3.md) pour migrer avant de distribuer.

## 19. Corriger « ombres sombres mais surfaces brillantes » la nuit

Assombrir seules les ombres laisse la couleur terminée (`engineColour`) brillante sans soleil, et l'écart face/ombre devient contre-nature. Atténuez toute la couleur terminée.

L'exemple traite `bloxdSunDirection()` zéro comme nuit et le soleil directionnel comme jour, atténuant les couleurs terminées du terrain aux heures sombres. Où `blockLight` et `heldLight` sont forts, l'atténuation faiblit pour préserver les lampes proches comme les torches. `0.52` est une valeur de réglage — baissez pour des nuits plus noires.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    #ifdef BLOXD_LIGHTING
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
    let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
    let protectLocalLight = smoothstep(0.03, 0.35, localLight);
    scale = mix(nightDim, 1.0, protectLocalLight);
    #endif
    // atténue la couleur terminée ; ajoute l'émission du matériau avec brouillard par défaut
    out.colour = l.engineColour * scale + s.emission * l.fogVisibility;
    return out;
}
```

**Limites de cette correction :** si `bloxdSunDirection()` se comporte en « direction unitaire avec soleil, zéro sans », jour/nuit se distinguent mais le couchant ne s'estime pas en douceur. Et comme elle atténue la couleur terminée, elle affaiblit ensemble lumière diurne et ambiant du moteur — pas une reproduction totale de l'horaire. Pour l'appliquer aux liquides, revoyez la relation de repli des hooks liquide.

## 20. Recette intégrée pour une eau d'aspect naturel

Cette API ne peut échantillonner la couleur de scène : c'est du **pseudo-rendu par mélange façon fresnel et reflets solaires, pas de vraie réflexion/réfraction**. Le calcul de profondeur est devenu possible en v2 avec `bloxdOpaqueBehind()` (détaillé en [partie VIII](08-apiv2.md) R-E). L'échantillon conserve la couleur de base, mélange un peu vers une couleur de ciel aux angles rasants et n'ajoute un petit reflet qu'avec soleil.

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = bloxdWorldPosition(l.position);
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdTime()), topness));
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let halfDir = normalize(viewDir + sunDir);
        let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
        out.colour += vec3f(1.0, 0.97, 0.90) * glint;
    }
    #endif
    return out;
}
```

Pistes de réglage :

- Eau blanche/lavée : baissez `0.38` dans `fresnel * 0.38` et le reflet `0.55`.
- Eau trop sombre : mélangez un peu plus de `fakeSkyReflection`. En excès, aspect plastique.
- Lignes ou rayures régulières sur l'eau : baissez fréquences de vague et force de reflet. Ce code ne déplace pas de sommets de maille.
- Reflets réels du paysage : les entrées de cette API n'ont pas de couleur d'écran : mélanger des couleurs n'est jamais un vrai reflet (la profondeur est accessible en liquides seuls. [Partie VIII](08-apiv2.md) R-E).

Cette recette **remplace** un `bloxdLiquidLight` existant. Ne la collez pas avec la fonction d'onde homonyme de R9.7 ni d'autres hooks homonymes.

## 21. Liste de tests en jeu

Succès de compilation et « bel aspect » sont deux choses différentes. Vérifiez dans cet ordre :

1. **Chargement :** `pack.json` à la racine du ZIP. Juste après la sélection s'affiche `Ready. Reload the page to use it.` et le pack devient actif **au rechargement de la page** ; confirmez `Ready to use` ensuite. Les packs sauvegardés sont revalidés automatiquement au prochain chargement de page : à chaque mise à jour de l'en-tête de spec côté moteur, le contenu de l'en-tête est vérifié par empreinte (succès = reste tel quel / échec = affiché bloqué), donc un ancien pack cassé ne reste jamais silencieusement actif.
2. **8 variantes :** sans oublis de gardes de types en strict / allow, éclairage on / off, terrain / liquide. Même si un jeu n'use que de certaines conditions, les packs de distribution doivent assumer les 8.
3. **Jour :** couleurs sans cramage par matériau (herbe, pierre, sable, bois) ; saut clair/sombre naturel entre dessus et côtés.
4. **Nuit :** comparez les mêmes matériaux en pleine lumière passée, ombres et près des torches. Si seules restent des faces éclairées, réglez l'atténuation d'exposition ; si tout s'assombrit, réglez la protection de lumière locale.
5. **Eau :** regardez depuis dessus, angles rasants, rives, sous l'eau et de nuit séparément. Comportement alpha et aspect sous-marin dépendent du compositing du jeu — ne jugez jamais d'un seul point de vue. Sous l'eau, le voile de définition liquide couvre devant (comme décrit dans [Partie VII](07-internals.md)) : les différences du pack se voient surtout en surface et sur le terrain derrière le voile.
6. **Bords et distance :** sans sauts de vagues/motifs aux transitions de chunk / origine ; sans double brouillard ni brume blanche au loin.
7. **Performance :** effets lourds en hash/trig/`pow` par fragment au minimum. Ajoutez le détail peu à peu et comparez les FPS.

### Contraintes connues comme prémisses

- Les packs se limitent aux hooks terrain / liquide — sans traitement du ciel, des entités ou de l'UI avec le même code.
- Aucune entrée pour ajouter shadow maps, reflets en espace écran, réfraction, bloom, etc. (la profondeur de scène est débloquée en liquides seuls via `bloxdOpaqueBehind()`. Voir [partie VIII](08-apiv2.md)).
- `bloxdTime()` est un temps d'animation sans lien garanti avec le jour/nuit du jeu.
- Avec `bloxdSunDirection()` zéro, la vraie direction lunaire est inconnue, pas de la « physique de clair de lune » mais une approximation d'ambiance. Le clair de lune directionnel se construit depuis `-bloxdSunDirection()` (mondes à cycle jour/nuit seuls. [Partie VII](07-internals.md) R-A).
- `s.position` / `l.position` sont des coordonnées locales : ajoutez `bloxdOriginOffset()` pour les effets dépendants du monde. Pour les motifs locaux du bloc, les coordonnées locales sont l'outil voulu.

## 22. Combiner avec d'autres packs quand le shader seul touche sa limite

Comme les packs ne peuvent ni ajouter ni échantillonner de textures, n'essayez pas de résoudre les fins reliefs de matériau ou les images du ciel par shaders seuls. Le dépôt public de packs de textures pour Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) gère textures, skybox, modèles, etc. par une autre voie.

Pour référence, des distributions communautaires « cinematic shader » analysées dans un cas se sont révélées être des packs de textures (textures 128x128 sans `pack.json` / `.wgsl`).

En pratique, **réglez lumière et couleur avec les shaders et couvrez matériaux et ciel avec un pack de ressources assorti**. Mais vérifiez co-usage et ordre de chargement selon l'implémentation et les réglages du jeu.

Les packs de textures ont leur propre spécification (pour référence) : la limite de taille est 25 Mo mesurée comme longueur de la chaîne JSON encodée en base64 ; encoder un PNG en base64 gonfle de +33 %, le plafond pratique pour les images brutes est donc ~18–19 Mo. Le CSS est traité par un simple analyseur regex — évitez l'imbrication et les commentaires.

## 23. La réalité sous-marine avec les packs de shaders

Les looks sous-marins se composent de 3 couches :

| Couche | Contenu | Opérable depuis les packs ? |
|---|---|---|
| ① Rendu terrain/liquide | Traitable par hooks. Les hooks light s'appellent normalement sous l'eau | Oui (fonctionne « sous le voile ») |
| ② Voile de définition liquide | Quad emissive plein écran depuis la couleur/alpha de définition du bloc liquide de la caméra, dessiné tout devant. Le réglage `cameraTint` gagne s'il existe | Non (ni couleur ni densité changeables) |
| ③ cameraTint | Réglage du jeu | Non |

Points pratiques : les packs continuent sous l'eau / le voile ne se retire pas / sous l'eau on ne branche pas (fogStart / fogEnd / fogColour ne changent pas sous l'eau : fogVisibility ne le détecte pas non plus).

[← Partie précédente](05-troubleshooting.md)·[Retour au manuel](README.md)·[Partie suivante →](07-internals.md)

[← Partie précédente](06-implementation.md)·[Retour au manuel](README.md)·[Partie suivante →](08-apiv2.md)

# Partie VII : Supplément d'intérieurs

> Le jeu actuel exige `apiVersion: 3` depuis le 2026-10-19 et refuse les packs v1/v2 au chargement — le contenu ci-dessous est écrit sur la spécification v2. Consultez la [partie IX](09-apiv3.md) pour migrer avant de distribuer.

Spécifications extra trouvées par analyse d'implémentation du moteur. Tout restauré directement du JavaScript du build de production actuel.

## 24. Identité du soleil et de la lune

La source de `bloxdSunDirection()` est un tampon de direction solaire réécrit seulement quand change le type de skybox — le critère n'est pas « si le ciel a un soleil » mais **« si le skybox est de type terre »**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (ciel procédural) | Non zéro (défauts ci-dessous) |
| `gloomy` / `interstellar` / `space_*` (textures cubiques) | **Toujours (0,0,0)** |

**La lune est toujours en `-bloxdSunDirection()`** (le moteur calcule la position lunaire comme l'opposé exact du soleil). La nuit se juge par hauteur solaire — il y a lune en haut quand `bloxdSunDirection().y < 0` (soleil sous l'horizon). Mais dans les mondes par défaut le soleil est statique, la lune aussi — seuls les mondes à cycle jour/nuit la voient bouger.

La direction solaire par défaut tourne autour de `(-0.56, 0.81, -0.18)` (vecteur unitaire d'inclination = −0.2 / azimuth = 0.55, statique). Référence pratique pour prédire les directions de reflet en testant des packs de distribution.

Les cycles jour/nuit ne sont pas intégrés au moteur — inclination est un nombre statique que les mondes à jour mobile actualisent côté jeu. `bloxdSunDirection()` suit chaque mise à jour.

Les lumières directionnelles du terrain ne sont que 2 lampes créées au démarrage de scène, de **direction et intensité fixes, sans changement jour/nuit**. En bref : **aucun facteur de brillance du terrain ne dépend du temps. Les « looks » jour/nuit viennent seulement de la skybox et de bloxdSunDirection()** : les packs assombrissant de nuit doivent donc estimer la tranche horaire depuis bloxdSunDirection() (la technique `sunPresent` de §19).

### R-A. Clair de lune directionnel — moonDir = −bloxdSunDirection()

Ajoute du Lambert blanc-bleuté et un faible specular tant que la lune est en haut. `moonUp` vaut 0 dans les mondes à soleil statique par défaut : rien ne s'y passe — **clair de lune qui ne se déclenche qu'en mondes à cycle jour/nuit, donc sûr**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // la lune est toujours exactement opposée au soleil ; auto-off diurne via moonDir.y < 0
    let moonDir = -bloxdSunDirection();
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(bloxdEyePosition() - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. Intérieurs du brouillard

Le calcul du brouillard est toujours en mode LINEAR (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), avec `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = réglage de brouillard ; seul D = 0 est spécial avec fogEnd = 5). **La bande de dégradé ne fait que 32 blocs**, et `l.fogVisibility` est moins « brume de distance » que **distance normalisée au bord du monde chargé**. Elle varie par joueur avec la distance de chargement : les effets par distance doivent calculer `distance(l.position, bloxdEyePosition())` eux-mêmes (recette R-B). (Note v3 : la fonction de brouillard du moteur implémente en réalité **quatre** modes — désactivé / exponentiel / exponentiel au carré / linéaire — et les titres livrés avec le jeu pilotent le mode linéaire ; le code restauré et l'argument de robustesse se trouvent dans la [Partie IX](09-apiv3.md) §50.)

Couleur de brouillard par défaut `rgb(183, 191, 195)` (gris bleu pâle). Les créateurs de mondes la changent via `fogColourOverride` (hex). Avec mode brouillard 0 (NONE), **fogColour arrive noir**. La forme standard `mix(l.fogColour, col, l.fogVisibility)` est sûre car la couleur de brouillard ne sert pas à fogVisibility 1. L'API script propose deux options de plus, `fogChunkDistanceOverride` et `fogOnSkybox` : les Custom Games peuvent régler indépendamment la distance de brouillard (la valeur D) et l'application du brouillard à la skybox. Par défaut la skybox n'est pas affectée par le brouillard (seuls les jeux activant `fogOnSkybox` teintent aussi la skybox avec la couleur de brouillard).

Régler `showFog` à false pousse le brouillard à 3200–3232 blocs, le désactivant de fait (`fogVisibility ≈ 1` continue à venir).

### R-B. Bande de bord de chargement — fogVisibility en « bord du monde »

Refroidit en silence juste la bande de 32 blocs du bord de chargement pour estomper la fin du monde (ou l'accentuer en effet). Sans distance autocalculée : suit auto les réglages de distance de chargement du joueur.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility : 1 = dedans (marge au bord), 0 = sur le point de sortir du bord
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. Intérieurs de blockLight / heldLight

`blockLight` est une **lumière colorée** à trois canaux RVB. Chaque bloc émetteur définit une couleur d'émission `[R, G, B]` (0–15 chacun) reprise telle quelle comme couleur de lumière (torche normale = blanc chaud (14,14,12) / lave = orange (14,8,2) / beacon = cyan (5,14,14) / torche blanche = (15,15,15), etc.). En étage vertex elle arrive empaquetée en 4 nibbles — r / g / b / sky — dans un attribut flottant. Traiter les trois canaux séparément dans le hook light ouvre l'éclairage local coloré — la recette de torche chaude (R9.1) est calibrée sur ce comportement.

En décodant `aPackedLightLevels`, le moteur met à chaque canal un **plancher de 35 % du canal RVB le plus brillant**. P. ex. une « lumière rouge pure » monte à (1,00, 0,35, 0) en sommets avant interpolation et lift. L'orange de torche paraissant « rose blanchâtre plutôt que rouge » vient d'ici — réglez la saturation des recettes de torche chaude (R9.1) contre ce défaut.

La composition de lumière n'est pas additive. En interne le moteur prend le **max** entre la lumière de bloc (après le plancher de 35 %) et la lumière de ciel construite en `mix(couleur ambiante, couleur de ciel, skyLight)`, puis prend encore le max avec la lumière de main (après boost d'ambiant). Les valeurs de canal dans cette composition sont les valeurs **post-lift** — le moteur compose à partir des mêmes niveaux de lumière relevés que ceux qui arrivent aux entrées des hooks (`terrainLightLevels` après la courbe de lift), tant en v2 qu'en v3. Donc `blockLight` et `skyLight` ne s'annulent jamais l'un l'autre — la contribution du côté le plus sombre est simplement jetée — affaiblir la lumière de ciel n'assombrit donc guère les zones dominées par blockLight. Concevez les recettes d'exposition / d'atténuation autour de cette structure (la protection de lumière locale en [Partie VI](06-implementation.md) §19 existe pour compenser cela).

La lumière de main (`heldLight`) a une portée selon le canal le plus brillant (max 15 blocs) avec prétraitement `dist^0.75`, le même plancher 35 %, et `l.heldLight` est la valeur **pré**-boost d'ambiant. L'atténuation du cône, restaurée depuis le module de lumière du moteur : l'atténuation angulaire du faisceau vaut `1 − 0.5 × (smoothstep(0.12, 0.65, t) + smoothstep(0.62, 0.95, t))`, où `t` est l'angle normalisé par rapport à l'axe du cône (0 = centre, 1 = bord) ; la portée est `(rangeOverride > 0 ? rangeOverride : canal le plus brillant) × atténuation du cône`, `rangeOverride` étant lu dans le canal alpha de la couleur de lumière tenue ; dans la portée, une surcharge atténue par `(range − dist) / range` tandis que le défaut soustrait la distance (prétraitée) canal par canal ; viennent ensuite le plancher de 35 %, la division par 15, la courbe de lift, et enfin le boost d'ambiant. Les objets personnalisés peuvent fixer `spotlightRange` et angle de cône — un mode « faisceau tenu en main » dont le cône suit la caméra. Les packs ne peuvent connaître la direction du faisceau.

Les blocs personnalisés peuvent porter `skyLightEmission` (0–15), qui **injecte dans le propre canal skyLight, à part du BFS de blockLight**. Les packs style R9.12 jugeant soleil/ombre par seuil skyLight peuvent faillir en mondes à skyLight relevé par lumières artificielles. Les packs de distribution jugent plus robuste combiné avec blockLight.

## 27. Détails de pipeline

- **Les hooks surface tournent « avant » alphaTest** : `out.alpha` alimente le test d'écart directement. Les matériaux cutout (herbe, feuilles) permettent des effets de dissolution type dither (recette R-C). En liquides (mélange) `out.alpha` est la transparence réelle (recette R-D). Sans effet en terrain opaque normal — ne pas confondre
- **Contenu de `l.ambient`** : `material.ambient × sceneAmbient`, distinct par matériau. Le côté scène attache au réglage graphique « Ambient Lighting Intensity » (défaut 0.5) — ne programmez jamais de défauts fixes
- **Les lumières directionnelles de la scène forment un rig à 2 lumières** : la somme Lambert de la lumière principale (direction issue de la position du soleil réglée dans la skybox, intensité 1.0) et de la lumière de remplissage (direction `[-0.5, -1, -1]`, intensité 0.35) arrive dans `l.directional`. La lumière de remplissage pointe vers le bas : elle n'ajoute rien aux faces vers le haut et rattrape les surfaces tournées vers le bas (plafonds de grottes etc.). Le terrain ne considère que les lumières ajoutées dans `_initScene` ; celles ajoutées après le démarrage sont ignorées du terrain et des modèles de blocs (un message d'avertissement officiel le dit)
- **`bloxdTime()` est vraiment `performance.now()`** : l'uptime du navigateur enroulé à 1 heure. Sans rapport avec le jour/nuit du jeu ni le temps de monde écoulé. Pour animer synchronisé à une horloge de jeu, estimez l'heure depuis l'azimut `bloxdSunDirection()` en mondes à cycle jour/nuit
- **Les fonctions d'en-tête lisent un seul uniform** : le moteur place un uniform de 64 octets à `@group(3) @binding(0)` (4 slots — time / originOffset / sunDirection / eyePosition, little-endian), et `bloxdTime()` / `bloxdOriginOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` correspondent à la lecture de ces slots. `originOffset` vaut toujours `[0, 0, 0]` dans le build actuel (slot réservé pour les coordonnées monde en virgule flottante). Un pack ne peut pas écrire cet uniform, et comme le WGSL du pack et celui du moteur fusionnent en un seul module, déclarer soi-même le même group/binding est également impossible. (La v3 renomme les deux slots — `seconds` / `renderOffset`, exposés sous les noms `bloxdSeconds()` / `bloxdRenderOffset()` — et ajoute la texture de profondeur de scène à `@group(3) @binding(1)` ; voir [Partie IX](09-apiv3.md) §41 et §51.)
- **Les données vertex sont construites par le mesher (Web Worker)** : le terrain de blocs est entrelacé à 28 octets par vertex (32 octets quand l'atlas est actif) — position = float32×3 / normale = entier signé 8 bits×4 / couleur = entier normalisé 8 bits×4 (la substance de `s.colour` — teinte × AO est cuite en 8 bits à l'étape mesher, la séparer ou la restaurer côté pack est donc impossible par principe) / UV = float32×2 / atlasIndex = float32. Seuls les niveaux de lumière voyagent dans un buffer vertex séparé de 4 octets ([Partie VII](07-internals.md) §26, [Partie II](02-api.md) §11). Les vertices sont dessinés en instanciation par chunk
- Les fins damiers aux bords de chunk au chargement sont le fondu de chunk par dither Bayer 4×4 en espace écran du moteur, pas des bugs du pack (désactivable via le réglage graphique `chunkFadeIn`)
- **`mod` est un mot réservé** : rejeté avec `pack.wgsl:3 'mod' is a reserved word in WGSL.` Écrivez les restes avec l'opérateur `%`

### R-C. Dissolution par dither Bayer — out.alpha contrôle discard

Reproduit la **même table Bayer 4×4** que le moteur utilise en fondus de chunk, dissolvant les cutouts depuis les blocs bas. discard se déclenche en matériaux alphaTest (herbe, feuilles) ; en liquides c'est de la transparence de mélange.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod est réservé : utilisez l'opérateur %
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // se dissout depuis les blocs bas ; plus dissolve persiste
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. Fondu d'eau proche caméra — l'alpha liquide dégage la vue

L'`out.alpha` du hook liquide alimente le mélange directement. Dégage juste la surface sous la caméra pour assurer la vue en plongée ou caméra sur l'eau.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 blocs de transparent total à normal
    #endif
    return out;
}
```

## 28. Ce qui change les valeurs visibles du pack — liste de tests

Le même pack rend différemment selon **monde et réglages joueur**. Revoyez au moins ces 3 environnements avant de distribuer :

1. **Monde normal** (skybox default, sans overrides) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, couleurs par défaut
2. **Monde à skybox spatiale** — bloxdSunDirection() = 0. Le look de la branche `sunPresent`
3. **Monde personnalisé avec `visionMinLightColour` / `skyLightColourOverride`** — sombres relevés et couleurs

Sources principales de variation : `lightingOverride` (éclairage forcé) / `skyLightColourOverride`, `ambientLightColourOverride` (changes hex) / `visionMinLightColour` (« couleur la plus sombre visible ». Implémenté comme un max par composante contre `uSkyLightColour` et `uAmbientLightColour` à la fois ; Night Vision l'utilise — les packs « grotte bien noire » n'assombrissent pas comme prévu, et la couleur de ciel elle-même est relevée) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (présence de bloxdSunDirection()). `uSkyLightColour` par défaut = (1,1,1) blanc, `uAmbientLightColour` par défaut = (0.25,0.25,0.30). `l.ambient` côté scène = réglage graphique « Ambient Lighting Intensity » (défaut 0.5). `l.fogVisibility` suit les réglages de brouillard/distance de chunks du joueur. Autres facteurs de variation par monde : `cameraTint` (teinte RGBA sur tout l'écran) et `proximityFadeDistance` / `proximityFadeMinOpacity` (fondu de proximité caméra pour les entités) — `cameraTint` en particulier est une passe finale composée **par-dessus** la sortie du pack. Beaucoup de ces réglages passent aussi par l'API script (`serverOption`) et se mettent à jour en cours de partie.

## 29. Moyens de débogage

- Paramètre URL `?renderer=lite` — force le moteur Lite (`?renderer=webgl2` / `babylon` valent aussi ; `babylon` = ancien nom de webgl2). La priorité : paramètre URL > localStorage `bloxdRenderer` > écran de réglages > défaut (webgl2). Les valeurs invalides sont ignorées avec un avertissement. Des overrides restants dans l'URL ou le localStorage peuvent casser des scènes nécessitant WebGPU (lite) avec `needs the new WebGPU renderer, so remove the renderer override...` ([Partie V](05-troubleshooting.md) §17)
- Paramètre URL `?vconsole` — console à l'écran (VConsole). Utile en vérification mobile réelle
- Paramètre URL `?drawcalls=1` — ajoute un panneau de debug des statistiques de draw. Sélectionnez des objets de jeu dans la console de debug, ou utilisez `drawCalls()` / `why()` / `configureDrawCallWatching()`, pour inspecter le surdessin des gros mécanismes (pack ou autres) et l'approche du plafond de ~65 000 sommets par draw — utile pour isoler les goulots de performance
- La console affiche `noa-engine v0.33.0` et `Renderer: lite from <source>` — revoyez-les d'abord pour ne pas mal diagnostiquer la voie de rendu
- Le moteur WebGPU se verrouille « forcé ON » avec pack appliqué. Le réglage « Disable Block Texture Atlas » se verrouille aussi (l'atlas reste ON), et sans WebGPU le pack n'applique même pas. Base pour écrire « navigateur WebGPU requis » en pages de distribution
- Les textures de blocs sont une texture tableau 2D (`texture_2d_array`), et le sampler du terrain est nearest + repeat. Le mesher fusionne aussi les faces aux material / AO / lumière identiques en un rectangle (**greedy meshing**), si bien qu'une face fusionnée peut avoir une UV dépassant la largeur d'une tuile (bords rentrés de 0.0015). L'adressage repeat matériel gère le raccord, donc les faces fusionnées paraissent sans couture. Notez qu'un détail procédural accroché à `vUV` peut casser aux frontières de fusion — accrochez-le plutôt à la position monde (`s.position` + `bloxdOriginOffset()`)
- La revalidation runtime par partie (`checkCompilation`) compile des matériaux de terrain réels en WebGPU du navigateur (plus stricte que la validation statique de réglages). Les packs qui échouent ici s'excluent de ce jeu

## 30. Modes d'application par jeu (`shaderPackPolicy`)

Cette section fixe ce que signifie `allow / strict` au niveau du titre (cf. §7). Seuls les titres dont la définition du jeu porte explicitement `shaderPackPolicy: "allow"` fonctionnent en mode complet (hooks vertex, `discard`, `alpha` de terrain) ; les titres sans valeur (ou avec une valeur autre que allow) sont stricts : `BLOXD_STRICT` est défini et le code entouré de gardes est désactivé automatiquement. Le paquet ne peut pas choisir cela — savoir quels titres exécutent quoi est un prérequis de la distribution.

- Build de référence : `szby6g.main.94a7596c.js` (déploiement en production au 2026-10-17). L'énumération statique des 111 définitions de jeu donne **26 entrées allow (12 titres) / 85 entrées strictes**. Les mêmes 12 littéraux allow, sur les mêmes 12 titres, ont été reconfirmés inchangés sur le bundle de production v3 (`3ymzdd`, 2026-10-20) — la liste ci-dessous se transpose telle quelle en v3.
- Au-dessus de `shaderPackPolicy` existe un verrou de canal de distribution (en gros `canUseShaderPacks`) : via des portails externes (par ex. les builds Coolmath Games), le système de packs de shaders lui-même peut être désactivé avant même que `shaderPackPolicy` soit consulté. L'analyse allow/strict ci-dessous porte sur le build web principal de bloxd.io.
- allow est déclaré en 12 endroits : 8 littéraux directs dans les définitions de jeu et 4 variables de base (`tb` / `kz` / `cb` / `Fb`) ; les variantes l'héritent par spread (`{...tb,...}`). Aucune surcharge par variante n'existe à ce jour (pas non plus de motif inverse parent-allow / enfant-strict).

Les 12 titres allow (26 entrées au total) :

- **Test Gym** — base + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (11 entrées)
- **Doodle Cube** — base + Solos / Duos (3)
- **Rocket Obby** — base + Sheep / January (3)
- **9 titres isolés** : Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

Côté strict, les points les plus trompeurs :

- **Superflat Creative (classic_creativeFlat) est strict.** Le nom contient « Creative », mais dans la famille classic seul le Creative habituel (`classic_creative`) est allow. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns etc. sont tous stricts
- **Custom Games (customGames) est strict.** Les effets de hooks vertex ne se déclenchent pas dans les jeux personnalisés créés par l'utilisateur. Pour le travail de vérification, Test Gym est le choix sûr
- Les titres majeurs PvP / serveur comme bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) sont tous stricts

Notez qu'en titres stricts le paquet reste chargé et compilé, et que les recettes côté fragment comme surface / light fonctionnent normalement. Ce qui est limité : les hooks vertex (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard`, et la `alpha` de terrain (en liquides elle existe toujours).

Cette liste reflète l'analyse statique du build cité ; des mises à jour du moteur peuvent modifier la répartition allow/strict. À revérifier à chaque nouvelle version.

[← Partie précédente](06-implementation.md)·[Retour au manuel](README.md)·[Partie suivante →](08-apiv2.md)

[← Partie précédente](07-internals.md)·[Retour au manuel](README.md)

# Partie VIII : Guide de migration vers API Version 2

> Le jeu actuel exige `apiVersion: 3` depuis le 2026-10-19 et refuse les packs v1/v2 au chargement — le contenu ci-dessous est écrit sur la spécification v2. Consultez la [partie IX](09-apiv3.md) pour migrer avant de distribuer.

Build visé : `6qxffk.main.5912a15f.js` (déploiement de production au 2026-10-16). Les parties I à VII de ce guide sont déjà réécrites au standard v2 ; cette partie VIII résume les points de migration depuis la v1 et les nouveautés v2. Les exemples de code des nouveautés ont passé la validation 8/8 variantes du compilateur v2 et la validation du compilateur WGSL du navigateur (Tint) (§38), et la conversion v2 des recettes existantes n'est qu'un remplacement mécanique d'identifiants : vérifiez toujours par compilation en jeu avant de distribuer.

## 31. Le sort des packs v1 (d'abord la conclusion)

Le jeu exige que l'`apiVersion` du manifest corresponde **strictement à 2**. Charger un pack v1 est refusé avec `This pack is for shader pack API version 1. Bloxd supports version 2.` (clé i18n `shaderPack:loadWrongApiVersion`). Il n'existe **aucun support parallèle v1/v2**. Par ailleurs, le moteur réinspecte le `validation.headerVersion` des packs sauvegardés (hash de l'en-tête entier) : le mécanisme rendant les packs sauvegardés automatiquement « à revérifier » lors des mises à jour moteur est le même qu'en v1.

## 32. Renommage complet des identifiants (table de correspondance)

En v2, la nomenclature underscore est unifiée en camelCase. **Les anciens noms sont totalement inutilisables**.

| v1 | v2 |
|---|---|
| `bloxd_terrain_vertex` | `bloxdTerrainVertex` |
| `bloxd_terrain_surface` | `bloxdTerrainSurface` |
| `bloxd_terrain_light` | `bloxdTerrainLight` |
| `bloxd_liquid_vertex` | `bloxdLiquidVertex` |
| `bloxd_liquid_surface` | `bloxdLiquidSurface` |
| `bloxd_liquid_light` | `bloxdLiquidLight` |
| `bloxd_defaultVertex` | `bloxdDefaultVertex` |
| `bloxd_defaultSurface` | `bloxdDefaultSurface` |
| `bloxd_defaultLight` | `bloxdDefaultLight` |
| `bloxd_VertexIn` | `BloxdVertexIn` |
| `bloxd_Vertex` | `BloxdVertex` |
| `bloxd_SurfaceIn` | `BloxdSurfaceIn` |
| `bloxd_Surface` | `BloxdSurface` |
| `bloxd_LightIn` | `BloxdLightIn` |
| `bloxd_Light` | `BloxdLight` |
| `bloxd_packInputs` (uniform interne) | `bloxdPackInputs` (`@group(3) @binding(0)`, 64 o) |

Les sortes de hooks (vertex / surface / light × terrain / liquide, 6 au total) et le format de `pack.json` (`apiVersion` / `name` / `author`) ne changent pas. Les limites du chargeur non plus (zip 32 Mo / 1024 entrées / 256 fichiers `.wgsl` / 256 Ko au total / manifest 64 Ko).

## 33. Où portent les champs supprimés

En v1, `time` / `eyePosition` / `sunDirection` / `originOffset` étaient des champs de structs. En v2, **ces champs sont supprimés et remplacés par des fonctions d'en-tête** lisant l'uniform moteur (`bloxdPackInputs`). Comme les fonctions lisent l'uniform directement, elles s'appellent **même depuis les fonctions de portée module hors hooks et depuis les hooks vertex**.

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| Mise en coordonnées monde par `s.position + vec3f(...)` | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

## 34. Nouveauté ① : `blockId` (shading par bloc)

Les 3 structs `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` gagnent toutes `blockId: u32`. C'est l'**ID du bloc possédant la face** (0 à 65535), constant sur toute une face (passé en `@interpolate(flat)`). Il sert à identifier les types de blocs sans dépendre de la couleur de texture. Mais la table ID ↔ type de bloc est interne au moteur et invisible des packs : **on mesure en monde quel ID vaut quel bloc, ou l'on consulte la référence ci-dessous**. En interne cet ID est cuit dans l'alpha de la couleur de sommet (8 bits bas) et le w de la normale (8 bits hauts) — 16 bits au total, d'où le plafond de 65535. Le système blockId lui-même ne s'active que tant qu'un pack de shaders actif existe (sans pack le câblage garde ses cibles de remplissage, mais dans les définitions de structs de la partie II cette différence est inobservable).

**Référence** : l'auteur publie une liste des entrées du jeu sur [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (`entries.json` : table id ↔ nom de bloc ; les variantes de rotation/meta comme `Furnace|meta|rot2` y figurent comme IDs séparés). Ces correspondances peuvent changer à chaque mise à jour du jeu — validez en jeu réel ce qui doit être définitif.

Exemples de blocs courants (d'après entries.json au 2026-10-18 ; seules les familles de terrain à ID bas sont listées) :

| ID | Nom de bloc | ID | Nom de bloc |
|---|---|---|---|
| 0 | Air | 15 | Maple Wood Planks |
| 1 | Unloaded | 28 | Stone |
| 2 | Dirt | 29 | Messy Stone |
| 3 | Messy Dirt | 31 | Smooth Stone |
| 4 | Grass Block | 126 | Water |
| 5 | Sand | 128 | Bricks |
| 6 | Clay | 139 | Ice |
| 7 | Gravel | 147 | Bedrock |
| 8 | Snow | 149 | Cactus |
| 9 | Maple Log | 1491 | Lava |

entries.json liste aussi des entrées non-bloc (outils etc.), mais seuls les IDs des familles de blocs atteignent les hooks terrain / liquide.

### R-F. Teinte par type de bloc avec blockId

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // ex. : teinte froide pour la famille pierre (motif de bits hauts de l'id)
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

### R-G. Mesurer blockId en monde — le pack d'affichage en plans de bits

Recette de debug pour identifier en monde les IDs des blocs absents de la table de correspondance. Changez la valeur de la constante `plane` en tête (`0, 1, 2, …`) en lisant la couleur de la face du bloc à identifier.

```wgsl
const plane: u32 = 0u;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let d = (s.blockId >> (plane * 3u)) & 7u;
    var palette = array<vec3f, 8>(
        vec3f(0.0, 0.0, 0.0), vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 1.0, 0.0),
        vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 1.0));
    out.colour = palette[d];
    return out;
}
```

La couleur de la face encode directement 3 bits de blockId en RVB (noir = 0 / rouge = 1 / vert = 2 / jaune = 3 / bleu = 4 / magenta = 5 / cyan = 6 / blanc = 7). Une observation lit un chiffre octal. Si p0 → p3 lisent successivement 3, 2, 7, 2, l'octal 2723 = 1491 lu sur le chiffre du haut est l'ID (Lava). Les familles de terrain à ID bas se contentent de 2 observations (p0, p1). Le pack n'utilise que le hook surface, donc tourne aussi en titres stricts.

### R-H. Ne balancer que les feuilles — limiter le hook vertex par blockId

La recette au vent R7 ([Partie III](03-recipes.md)) fait onduler tout le terrain, mais le hook vertex peut aussi lire `blockId` — on peut donc ne balancer que les feuilles. La liste d'IDs et le tableau WGSL (mesurés au 2026-10-18 ; 22 sortes — Pine / Aspen / Maple / Jungle / Plum / Cedar / Palm / Autumn Maple / Fallen Maple / Pear / Cherry / Fallen Cherry / Spectral / Mango / variantes fruitières / Autumn Aspen) :

```wgsl
const LEAF_IDS = array<u32, 22>(
    100u, 101u, 102u, 103u, 491u, 492u, 493u, 653u, 655u, 911u,
    1226u, 1227u, 1636u, 1969u, 2019u, 2020u, 2021u, 2022u, 2023u,
    2024u, 2025u, 2085u);

// les hooks vertex sont auto-désactivés en titres stricts (voir §36)
#ifndef BLOXD_STRICT

fn sp_isLeaf(id: u32) -> bool {
    for (var i = 0u; i < 22u; i++) {
        if (LEAF_IDS[i] == id) { return true; }
    }
    return false;
}

fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    if (sp_isLeaf(v.blockId)) {
        let wp   = bloxdWorldPosition(v.position);
        let t    = bloxdTime();
        // le déplacement est une fonction lisse de la position monde. Les sommets partagés
        // pointant vers le même point monde bougent identiquement, donc les faces ne se déchirent jamais ([Partie III](03-recipes.md) R7 suit le même principe)
        let sway = sin(wp.x * 0.9 + t * 1.7) * cos(wp.z * 0.7 + t * 1.1);
        out.position.x += sway * 0.045;
        out.position.z += sway * 0.030;
    }
    return out;
}

#endif
```

- La liste d'IDs grandit avec les mises à jour du moteur (rien que pendant la mesure, 50 types de blocs ont été ajoutés dans un nouveau build). Pour continuer à l'utiliser, retrouvez les ajouts via [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) ou en mesurant avec l'affichage en plans de bits de R-G, puis étendez le tableau
- `Fallen Maple Leaves` (655) / `Fallen Cherry Leaves` (1227) sont des tapis de feuilles non solides au sol. Les balancer leur donne l'air de décoller du sol ; les exclure du tableau est une option
- En titres stricts le hook vertex est désactivé en bloc, mais avec la garde ci-dessus le pack « cesse simplement de balancer » — les effets côté fragment continuent de fonctionner

## 35. Nouveauté ② : `BLOXD_SCENE_DEPTH` et `bloxdOpaqueBehind()` (la principale)

L'accès à la profondeur, structurellement impossible en v1, est débloqué **pour les seuls programmes liquides (liquid)**. Pas de couleur, mais **l'info géométrique de distance et position de la face opaque derrière**. L'usage typique : calculer une couleur d'absorption depuis l'épaisseur d'eau mesurée.

Règles d'usage :

| Usage | Résultat |
|---|---|
| Appel sans garde dans `bloxdLiquidSurface` / `bloxdLiquidLight` | OK (toujours défini en variantes liquides) |
| Appel sans garde dans `bloxdTerrainSurface` | ERREUR. Entourer avec `#ifdef BLOXD_SCENE_DEPTH` |
| Appel dans un hook vertex | ERREUR (hooks surface / light seuls) |

Pour user de la profondeur en hooks terrain aussi, entourez avec `#ifdef BLOXD_SCENE_DEPTH` (les hooks terrain étant réutilisés par les programmes liquides, la profondeur n'y est valide que côté liquide).

### R-E. Absorption par épaisseur d'eau (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // longueur de la colonne d'eau = de la position actuelle à la face opaque derrière
        let thickness = distance(behind.position, surface.position);
        // absorption Beer-Lambert : le rouge chute vite, le bleu porte loin
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // derrière = ciel : tirer vers un bleu profond
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

Applications : absorption/diffusion par épaisseur, projection de motifs façon rides/caustiques depuis les coordonnées monde du fond via `behind.position`, reflet du ciel en surface distinguant ciel et occlusion avec `found=false`, gradation d'écume et de trouble par profondeur. Si la construction du pipeline de copie de profondeur échoue, dégradation sûre vers « rien derrière ». La disponibilité de la texture de profondeur est fixée une seule fois, à la génération du renderer de la page — le critère étant « le pack actif lit-il la profondeur ». **En utilisant un pack qui lit la profondeur, rechargez donc toujours la page**. Si la profondeur est demandée alors qu'un pack est actif mais que la page n'a pas été rechargée, la console affiche une seule fois un avertissement `…reads scene depth on a page that didn't turn it on`, et la texture de profondeur est remplacée par un repli 1×1, si bien que `bloxdOpaqueBehind()` renvoie toujours `found = false`.

## 36. Autres changements v2

- **Repli des hooks** : sans `bloxdLiquidXxx` défini, les programmes liquides replient sur le hook terrain. **Un pack à hooks terrain seuls agit tel quel sur l'eau aussi**. Si indésiré, définissez explicitement les hooks côté liquide.
- **Gardes de champs `BLOXD_LIGHTING` devenues inutiles** : `blockLight` etc. existent dans toutes les variantes, avec des défauts en unlit (0 / 1 / blanc / 0). N'utilisez `#ifdef BLOXD_LIGHTING` que pour tester la lumière. Garder les gardes existantes ne change rien.
- **Condition de définition de `BLOXD_ALPHA` changée** : défini en variantes terrain non strict et toutes variantes liquides, pas en strict × terrain. Gardez la garde pour écrire alpha en hooks terrain.
- **Construction directe de structs interdite** : les appels constructeurs comme `BloxdLight(...)` sont rejetés par la validation statique. Partez toujours de `bloxdDefault*` ou copiez l'entrée.
- **`let _ =` devient `_ =`** : l'affectation de rejet WGSL `_ = f();` est valide mais `let _ = f();` est rejeté.
- **offInStrict** : définir un hook vertex, ou un `discard` atteignable depuis des hooks surface / light, ne fait pas erreur mais auto-désactive tout le pack en jeux stricts (l'UI de réglages affiche `shaderPack:offInStrict`, et ça marche en jeux allow). Entourez vertex et `discard` avec `#ifndef BLOXD_STRICT`. Notez que le message de l'UI de réglages lui-même demande d'englober ce qui reste avec `#ifndef BLOXD_STRICT` — c'est une recommandation officielle, pas une simple convention.
- **Brouillard étendu** : trois modes LINEAR / EXP / EXP2 sont implémentés côté calcul, mais le réglage jeu restant toujours LINEAR comme avant, la spec de brouillard existante s'utilise telle quelle. Le sens de `fogColour` est aussi officialisé par écrit (noir seulement en scènes totalement sans brouillard).
- **Inchangés** : courbe de lift, plancher 35 %, atténuation heldLight (`pow(lightDist, 0.75)`) et boost d'ambiant, spec de directions soleil/lune, couleur de brouillard par défaut, wrap de temps (3600 s), lumières directionnelles (4 max), Lite (WebGPU) seul, mécanisme de sauvegarde (IndexedDB), mot réservé `mod`.

## 37. Liste de migration v1 → v2

1. **pack.json** : `"apiVersion": 1` → `"apiVersion": 2`
2. **Identifiants** : tout remplacer via la table §32 (noms de hooks, noms de structs, fonctions default)
3. **Porter les champs supprimés** : vers les fonctions d'en-tête via la table §33 (`s.time` → `bloxdTime()` etc.)
4. Renommer **`fogFactor` → `fogVisibility`**
5. **Retirer les constructions directes de structs**
6. Corriger **`let _ =` en `_ =`**
7. **Entourer hooks vertex et discard avec `#ifndef BLOXD_STRICT`**
8. Vérifier que **l'eau subit aussi les hooks terrain** ; sinon définir explicitement les hooks liquid
9. (Optionnel) Gérer le brouillard depuis `litColour` / ajouter l'absorption par épaisseur avec `bloxdOpaqueBehind()` / expressions par bloc avec `blockId`
10. **Validez aussi la 2ᵉ étape (Tint du navigateur)** — en particulier les parenthèses des expressions contenant `^` `&` `|` `<<` `>>`. Du code passant la validation statique peut être refusé par le navigateur (§38)

## 38. Deuxième étape de validation — le compilateur WGSL du navigateur est plus strict que le parseur intégré

La validation des packs de jeu se fait en **2 étapes**. La 1ʳᵉ étape est la validation statique (parseur JS intégré au moteur — signatures de hooks, syntaxes interdites, règles propres aux packs comme l'usage de sceneDepth), et la 2ᵉ étape est la validation navigateur (les stubs joints au résultat de compilation sont compilés avec la vraie implémentation WebGPU, et les erreurs sont affichées remappées vers les lignes des fichiers d'origine du pack. Le « Saved, but it won't run until you fix these errors » de l'interface, c'est cette étape). Le suffixe comme `(only in terrain)` en fin d'affichage d'erreur désigne « l'espèce de program de la variante où l'erreur est apparue ».

Le parseur intégré n'implémente pas les règles de liaison (Binding) des opérateurs WGSL, et **du code passant la validation statique peut être refusé par le navigateur**. Le motif classique qui en pâtit souvent, c'est le hachage d'entiers :

| Opérateur | Conséquence |
|---|---|
| `<<` `>>` | Ne se combinent directement qu'au niveau unaire. `a + b << c` est une erreur |
| `&` `^` `\|` | Ne se combinent directement qu'au niveau unaire. `a * b ^ c` est une erreur |
| `&&` `\|\|` | Mélange interdit. `a && b \|\| c` est une erreur |

### Parenthésage (NG / OK)

```wgsl
// NG — passe la validation statique mais est refusé par le navigateur (Tint) :
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — parenthéser chaque multiplication (une chaîne du même opérateur A ^ B ^ C est légale par associativité à gauche)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

Aucun code publié dans ce guide ne contient ce motif (les mélanges `+`/`*` de `pack_hash3` et `h ^ (h >> 16u)` sont déjà parenthésés, donc conformes). Après avoir écrit un pack, faites passer les 1ʳᵉ et 2ᵉ étapes toutes les deux.

## 39. Sur des matériaux indépendamment similaires

Il existe un matériau communautaire au contenu presque pareil : [Shader de GlitchHunterCoder/Bloxd-Essay](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader). Publié avant ce guide, mais **le contenu de ce guide vient de l'analyse propre de glm sur les vrais fichiers bundle de Bloxd (jeu de chunks webpack) — pas du copier-coller**. Les deux coïncident parce qu'enquêter indépendamment sur la même implémentation mène aux mêmes conclusions.

---

Recherché par ltf_ahel (recherché avec glm)

[← Partie précédente](07-internals.md)·[Retour au manuel](README.md)

[← Partie précédente](08-apiv2.md)·[Retour au manuel](README.md)

# Partie IX : Guide de migration vers API Version 3

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

**L'en-tête du moteur (prélude), figé.** L'en-tête v3 est une chaîne de 5 637 octets commençant par `// Engine-provided and read-only, prepended to all packs. apiVersion 3.` Il porte des directives `#if` / `#ifdef` que le préprocesseur WGSL du moteur évalue lui-même par variante — le moteur exécute réellement l'évaluation d'expressions `#if`, et une expression mal formée échoue avec `Cannot evaluate #if ...`. Chaque structure, signature de fonction et commentaire cité dans ce guide vient de ce texte rendu, donc le guide et l'en-tête distribué ne peuvent pas diverger.

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

---

Recherches de ltf_ahel (menées avec glm)

[← Partie précédente](08-apiv2.md)·[Retour au manuel](README.md)


# Créer des packs de shaders pour Bloxd.io (Guide complet)

Guide autonome pour créer et distribuer des packs de shaders pour Bloxd.io (moteur WebGPU uniquement).
Basé sur la spécification `apiVersion: 2`. Inclut recettes et référence API : avec ce seul fichier, vous passez de zéro à la distribution. Les packs v1 ne chargent pas dans le jeu actuel (la valeur `apiVersion` v1 et les anciens identifiants sont refusés). Pour migrer depuis la v1, voir la partie VIII.

> Ce guide est non officiel et ne représente pas la position des développeurs. L'API peut changer sans préavis.  
> Dernière révision : 2026-10-15 (ordre d'application du brouillard, réglages réels du brouillard et rendu sous-marin vérifiés contre l'implémentation du moteur). Aucune référence officielle publique de l'API WGSL n'ayant été trouvée, continuez à vérifier descriptions et recettes face à l'écran de chargement et à la compilation en jeu.  
> La fonction de packs de shaders est une fonction officielle accessible depuis l'interface du jeu, et les packs sont du WGSL pur  
> (ni exécution JS ni réseau) : rien de dangereux ne se produit avec du code normal.  
> Ce guide a été créé avec l'assistance de l'IA ; l'exactitude n'est pas garantie. Vérifiez avec le comportement réel en jeu.

## Sommaire

- [Partie I : Créer des packs](#partie-i--créer-des-packs)
- [Partie II : Référence API](#partie-ii--référence-api)
- [Partie III : Recettes](fr/recipes.md)
- [Partie IV : Guide du réalisme](#partie-iv--guide-du-réalisme)
- [Partie V : Dépannage et notes](#partie-v--dépannage-et-notes)
- [Partie VI : Notes d'implémentation importantes](#partie-vi--notes-dimplémentation-importantes)
- [Partie VII : Supplément d'intérieurs](#partie-vii--supplément-dintérieurs)
- [Partie VIII : Guide de migration vers API Version 2](#partie-viii--guide-de-migration-vers-api-version-2)

---

# Partie I : Créer des packs

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
3. Corrigez les erreurs et rechargez (voir Partie V)
4. Testez dans des jeux compatibles
5. Zippez quand c'est fini et distribuez

## 3. Structure du pack

- **Format de distribution** : un seul `.zip`, ou un dossier (le chargement de dossier est réservé aux navigateurs de bureau)
- **Contenu** : un `pack.json` (à la racine du pack ; insensible à la casse) + 1 à 256 fichiers `.wgsl`
- Les `.wgsl` multiples sont concaténés et traités comme un module : découpage et sous-dossiers libres. Aucune contrainte de noms. Les fichiers non `.wgsl` (READMEs etc.) sont ignorés
- Astuce de compression : si un zip range tout sous un dossier racine commun, ce préfixe est retiré automatiquement (les zips "Compresser" de macOS passent tels quels). Mais des fichiers parasites à la racine cassent la détection du niveau supérieur ; le plus sûr est d'entrer dans le dossier et de compresser `pack.json` et les `.wgsl` directement (vérifiez que `pack.json` est à la racine du ZIP)

| Élément | Limite |
|---|---|
| taille du zip / nb d'entrées | 32 Mo / 1024 |
| taille de pack.json | 64 Ko, UTF-8 |
| taille totale .wgsl | 256 Ko, UTF-8 |
| format zip | zip64, découpés et chiffrés refusés |

## 4. pack.json

```json
{
  "apiVersion": 2,
  "name": "My Pack",
  "author": "your name"
}
```

| Champ | Requis | Description |
|---|---|---|
| `apiVersion` | requis | Doit correspondre exactement à `2`. Les packs `1` sont refusés avec `shaderPack:loadWrongApiVersion` |
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
2. Vérifiez le statut. Le succès, c'est "Ready to use". Face à "Saved, but it won't run until you fix these errors...", corrigez les erreurs listées (fichier:ligne + variante) et rechargez
3. Rechargez la page pour activer. Supprimez avant tout forçage de moteur (renderer override) en paramètres URL ou localStorage, sinon le pack refusera de démarrer
4. Testez d'abord en jeux permissifs puis en jeux stricts (la majorité). L'animation de sommets ne marche qu'en jeux allow
5. Pour distribuer, zippez avec `pack.json` au sommet (dans les limites de la section 3). Recharger le même écran remplace le pack ; Remove Pack le supprime. La revalidation après mises à jour du jeu tourne seule au chargement de page

# Partie II : Référence API

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
- `bloxdSunDirection()` est un vecteur unitaire tant qu'un soleil existe ; zéro quand le ciel n'a pas de soleil. **La lune est toujours en `-bloxdSunDirection()`** (le moteur calcule la position lunaire comme l'opposé exact du soleil). Mais dans les mondes par défaut le soleil est statique, la lune aussi — une lune en mouvement n'importe que dans les mondes à cycle jour/nuit (voir Partie VII, section 24)
- ※Note : écrit avant comme « non réutilisable comme direction lunaire à zéro ». La direction elle-même est disponible via `-bloxdSunDirection()`, mais les packs de distribution doivent brancher sur `sunPresent` sur prémisse zéro (voir R2 pour le pseudo look bleu, Partie VII R-A pour le clair de lune directionnel)
- `emission` s'ajoute après le calcul d'éclairage, atténuée par **`fogVisibility`** (l'implémentation defaultLight `engineColour + emission × fogVisibility`. L'émission disparaît aussi au loin totalement brumeux)
- **Ordre d'application du brouillard** : le fragment traite ① composition éclairage/émission → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ appel au hook light → ⑤ return. Donc **engineColour arrive déjà brumé**, et **la valeur rendue du hook light devient la couleur finale telle quelle** (après le hook, le brouillard n'est pas réappliqué)
- **Source de fogVisibility** : distance en espace de vue (calculée par sommet, interpolée). En mode linear `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **Quand fogMode == 0** : `fogColour` arrive en `vec3f(0.0)` (noir). Le code estimant des plages horaires par la teinte de fogColour doit faire attention
- **Réglages réels du brouillard dans les builds actuels** : **linear fixe**. `fogStart` = distance de chunks, `fogEnd` = +1 chunk (horizon seul). Avec brouillard off, fixé à 100 / 101 chunks, de fait désactivé. Couleur de brouillard par défaut RGB(183, 191, 195)
- L'uniform `bloxdPackInputs` (`@group(3) @binding(0)`, 64 o) **ne s'utilise que via les fonctions d'en-tête**. Ne le référencez jamais directement depuis les packs. La visibilité de stage étant VERTEX|FRAGMENT, les fonctions d'en-tête s'appellent aussi depuis les fonctions de portée module hors hooks et depuis les hooks vertex. La texture de profondeur (binding 1) étant réservée au FRAGMENT, `bloxdOpaqueBehind()` est limité aux hooks surface / light
- **`skyLight` / `blockLight` / `heldLight` arrivent après une "courbe de lift"**. Le `tone-mapped` des commentaires d'en-tête désigne ceci : le moteur applique toujours `y = 1-(1-x/(3-2x))³` (courbe S relevant les zones sombres) aux fragments avant de les remettre aux packs. Ni valeurs voxel brutes (n/15) : sous un arbre (brut 0,87) arrive relevé à **0,97**
- `skyLight` est pour l'essentiel la donnée d'occlusion voxel de "le ciel est-il visible d'ici" (= une carte d'ombres), pas un simple paramètre de luminosité (voir section 15, « La vérité sur les ombres »)
- **`litColour` comme point de départ** : en v1, seule `engineColour` (déjà brumée) existait, et les rendus d'atmosphère maison finissaient souvent en double brouillard. En v2, partez de `litColour` (avant brouillard, avant emission) et réappliquez le brouillard à votre rythme avec `bloxdApplyFog()`
- **Distinguer les blocs avec `blockId`** : identification indépendante de la couleur de texture. Mais la table ID ↔ type de bloc est interne au moteur : mesurez en monde quel ID vaut quel bloc (voir partie VIII)
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

---

# Partie IV : Guide du réalisme

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
4. **Sans direction solaire** : si `bloxdSunDirection()` est zéro, ne calculez pas de specular directionnel. `l.directional` est un scalaire de quantité de lumière, pas un vecteur de direction : il ne restaure pas la direction du reflet. Basculez sur un ambiant faible sans direction si besoin. La direction lunaire est disponible via `-bloxdSunDirection()` (ne bouge que dans les mondes à cycle jour/nuit. Partie VII R-A)

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
| Réfraction sous-marine | Couleur de scène inaccessible. Mais la profondeur en liquides seuls (`bloxdOpaqueBehind()`) permet absorption par épaisseur et projection du fond (partie VIII R-E) |
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
- La nuit, seules restent des faces éclairées → n'assombrissez pas que les ombres ; atténuez toute la couleur terminée (`engineColour`) de nuit. Pour conserver les lampes locales, atténuez moins avec `blockLight` / `heldLight` (Partie VI, section 19)
- L'ombre ne se creuse pas avec `pow(skyLight, γ)` → `l.skyLight` est post-courbe (section 10). Passez à inversion + seuil de R9.12
- Régler surface/densité d'ombre → guide de réglage de R9.12 (surface = seuil `shTh` / bord = `shSoft` / obscurité du cœur = double réglage d'ambiant minimum et de dispersion du ciel)

---

# Partie V : Dépannage et notes

## 17. Erreurs courantes et solutions

| Symptôme | Solution |
|---|---|
| Ne charge pas en jeux stricts | Entourez le hook vertex de `#ifndef BLOXD_STRICT` |
| `.alpha` signalé indéfini | Entourez de `#ifdef BLOXD_ALPHA` |
| `blockLight` signalé indéfini | Entourez de `#ifdef BLOXD_LIGHTING`. Entourez les fonctions auxiliaires partagées **en fonctions entières** (en v2 le champ est toujours présent : en pratique plus d'erreur ; gardez la garde pour les usages de décision) |
| `Packs can't construct BloxdSurface directly` | Partez de `bloxdDefaultSurface(s)` |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | Entourez de `#ifndef BLOXD_STRICT` |
| Lointain blanc et laiteux | Souvent double brouillard. La couleur terminée porte déjà le brouillard : gardez subtile la brume maison et préférez ne baisser que la saturation |
| Pack exclu en rejoignant le jeu | Échec du contrôle en direct du jeu. Revoyez les oublis de gardes |
| `pack.json needs "apiVersion": 2.` | `apiVersion` manquant ou différent de `2`. Mettez le nombre `2` (la chaîne `"2"` est rejetée). Les packs v1 sont refusés avec `shaderPack:loadWrongApiVersion` |
| `There's no pack.json at the top of the pack.` | Pas de `pack.json` à la racine du ZIP. Vérifiez de ne pas avoir zippé le dossier lui-même |
| `bloxdTerrainVertex must be declared as: fn ...` | Signature différente. Réécrivez exactement comme affiché |
| `bloxdTerrainVertex can't run in strict games...` | Entourez le hook vertex de `#ifndef BLOXD_STRICT` |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | Entourez de `#ifdef BLOXD_LIGHTING` (en v2 le champ est toujours présent : normalement plus d'erreur) |
| Monter `pow(l.skyLight, γ)` ne creuse jamais les ombres | `skyLight` est une valeur post-courbe (brut 0,87 arrive en 0,97). Passez à inversion + seuil de R9.12 (section 10) |
| `... can only be a function's parameter or return type, ...` | `var x: BloxdSurface;` sans initialiser est rejeté. Construisez depuis `bloxdDefault*` |
| `bloxdPackInputs isn't part of the bloxd_ header` | L'uniform PackInputs ne peut se référencer directement depuis les packs. Passez par les fonctions d'en-tête comme `bloxdTime()` |
| `Packs can't declare bloxd_ names...` | Retirez le préfixe `bloxd_` de vos identifiants. Seuls les 6 noms de hooks peuvent se définir |
| `loadDuplicateManifest` au chargement zip | Deux `pack.json` (variantes de casse incluses). Gardez-en un |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Réécrivez depuis `bloxdDefaultSurface(s)`. Partir d'une copie du premier paramètre du hook light (`var out = s;`) vaut aussi |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` est rejeté. Écrivez `_ = f();` |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | Entourez l'appel `bloxdOpaqueBehind()` en hooks terrain avec `#ifdef BLOXD_SCENE_DEPTH` |
| `...only surface and light hooks can use.` | Retirez `bloxdOpaqueBehind()` des hooks vertex (surface / light seuls) |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Pas une erreur mais une désactivation auto en jeux stricts (`shaderPack:offInStrict`). Entourez vertex et `discard` avec `#ifndef BLOXD_STRICT` |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Erreur de 2ᵉ étape (Tint du navigateur). Parenthéser les opérandes de `^` `&` `\|` `<<` `>>` (§38) |

## 18. Droits et notes

- La fonction de packs de shaders est une fonction officielle chargeable depuis l'interface du jeu, et créer des packs est considéré comme un usage prévu. Mais aucune documentation officielle publique n'a été confirmée
- Les packs sont du WGSL pur — exécution JS et accès réseau impossibles par conception
- Ceci est un guide non officiel, pas la position officielle des développeurs. L'API peut changer sans avis

---

# Partie VI : Notes d'implémentation importantes

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

Cette API ne peut échantillonner la couleur de scène : c'est du **pseudo-rendu par mélange façon fresnel et reflets solaires, pas de vraie réflexion/réfraction**. Le calcul de profondeur est devenu possible en v2 avec `bloxdOpaqueBehind()` (détaillé en partie VIII R-E). L'échantillon conserve la couleur de base, mélange un peu vers une couleur de ciel aux angles rasants et n'ajoute un petit reflet qu'avec soleil.

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
- Reflets réels du paysage : les entrées de cette API n'ont pas de couleur d'écran : mélanger des couleurs n'est jamais un vrai reflet (la profondeur est accessible en liquides seuls. Partie VIII R-E).

Cette recette **remplace** un `bloxdLiquidLight` existant. Ne la collez pas avec la fonction d'onde homonyme de R9.7 ni d'autres hooks homonymes.

## 21. Liste de tests en jeu

Succès de compilation et « bel aspect » sont deux choses différentes. Vérifiez dans cet ordre :

1. **Chargement :** `pack.json` à la racine du ZIP ; les réglages affichent `Ready to use`.
2. **8 variantes :** sans oublis de gardes de types en strict / allow, éclairage on / off, terrain / liquide. Même si un jeu n'use que de certaines conditions, les packs de distribution doivent assumer les 8.
3. **Jour :** couleurs sans cramage par matériau (herbe, pierre, sable, bois) ; saut clair/sombre naturel entre dessus et côtés.
4. **Nuit :** comparez les mêmes matériaux en pleine lumière passée, ombres et près des torches. Si seules restent des faces éclairées, réglez l'atténuation d'exposition ; si tout s'assombrit, réglez la protection de lumière locale.
5. **Eau :** regardez depuis dessus, angles rasants, rives, sous l'eau et de nuit séparément. Comportement alpha et aspect sous-marin dépendent du compositing du jeu — ne jugez jamais d'un seul point de vue. Sous l'eau, le voile de définition liquide couvre devant selon ci-dessus : les différences du pack se voient surtout en surface et sur le terrain derrière le voile.
6. **Bords et distance :** sans sauts de vagues/motifs aux transitions de chunk / origine ; sans double brouillard ni brume blanche au loin.
7. **Performance :** effets lourds en hash/trig/`pow` par fragment au minimum. Ajoutez le détail peu à peu et comparez les FPS.

### Contraintes connues comme prémisses

- Les packs se limitent aux hooks terrain / liquide — sans traitement du ciel, des entités ou de l'UI avec le même code.
- Aucune entrée pour ajouter shadow maps, reflets en espace écran, réfraction, bloom, etc. (la profondeur de scène est débloquée en liquides seuls via `bloxdOpaqueBehind()`. Voir partie VIII).
- `bloxdTime()` est un temps d'animation sans lien garanti avec le jour/nuit du jeu.
- Avec `bloxdSunDirection()` zéro, la vraie direction lunaire est inconnue, pas de la « physique de clair de lune » mais une approximation d'ambiance. Le clair de lune directionnel se construit depuis `-bloxdSunDirection()` (mondes à cycle jour/nuit seuls. Partie VII R-A).
- `s.position` / `l.position` sont des coordonnées locales : ajoutez `bloxdOriginOffset()` pour les effets dépendants du monde. Pour les motifs locaux du bloc, les coordonnées locales sont l'outil voulu.

## 22. Combiner avec d'autres packs quand le shader seul touche sa limite

Comme les packs ne peuvent ni ajouter ni échantillonner de textures, n'essayez pas de résoudre les fins reliefs de matériau ou les images du ciel par shaders seuls. Le dépôt public de packs de textures pour Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) gère textures, skybox, modèles, etc. par une autre voie.

Pour référence, des distributions communautaires « cinematic shader » analysées dans un cas se sont révélées être des packs de textures (textures 128x128 sans `pack.json` / `.wgsl`).

En pratique, **réglez lumière et couleur avec les shaders et couvrez matériaux et ciel avec un pack de ressources assorti**. Mais vérifiez co-usage et ordre de chargement selon l'implémentation et les réglages du jeu.

En pratique, **réglez lumière et couleur avec les shaders et couvrez matériaux et ciel avec un pack de ressources assorti**. Mais vérifiez co-usage et ordre de chargement selon l'implémentation et les réglages du jeu.

## 23. La réalité sous-marine avec les packs de shaders

Les looks sous-marins constent de 3 couches :

| Couche | Contenu | Opérable depuis les packs ? |
|---|---|---|
| ① Rendu terrain/liquide | Traitable par hooks. Les hooks light s'appellent normalement sous l'eau | Oui (fonctionne « sous le voile ») |
| ② Voile de définition liquide | Quad emissive plein écran depuis la couleur/alpha de définition du bloc liquide de la caméra, dessiné tout devant. Le réglage `cameraTint` gagne s'il existe | Non (ni couleur ni densité changeables) |
| ③ cameraTint | Réglage du jeu | Non |

Points pratiques : les packs continuent sous l'eau / le voile ne se retire pas / sous l'eau on ne branche pas (fogStart / fogEnd / fogColour ne changent pas sous l'eau : fogVisibility ne le détecte pas non plus).

---

# Partie VII : Supplément d'intérieurs

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

Le calcul du brouillard est toujours en mode LINEAR (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), avec `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = réglage de brouillard ; seul D = 0 est spécial avec fogEnd = 5). **La bande de dégradé ne fait que 32 blocs**, et `l.fogVisibility` est moins « brume de distance » que **distance normalisée au bord du monde chargé**. Elle varie par joueur avec la distance de chargement : les effets par distance doivent calculer `distance(l.position, bloxdEyePosition())` eux-mêmes (recette R-B).

Couleur de brouillard par défaut `rgb(183, 191, 195)` (gris bleu pâle). Les créateurs de mondes la changent via `fogColourOverride` (hex). Avec mode brouillard 0 (NONE), **fogColour arrive noir**. La forme standard `mix(l.fogColour, col, l.fogVisibility)` est sûre car la couleur de brouillard ne sert pas à fogVisibility 1.

Régler `showFog` à false pousse le brouillard à 3200–3328 blocs, le désactivant de fait (`fogVisibility ≈ 1` continue à venir).

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

En décodant `aPackedLightLevels`, le moteur met à chaque canal un **plancher de 35 % du canal RVB le plus brillant**. P. ex. une « lumière rouge pure » monte à (1,00, 0,35, 0) en sommets avant interpolation et lift. L'orange de torche paraissant « rose blanchâtre plutôt que rouge » vient d'ici — réglez la saturation des recettes de torche chaude (R9.1) contre ce défaut.

La lumière de main (`heldLight`) a une portée selon le canal le plus brillant (max 15 blocs) avec prétraitement `dist^0.75`, le même plancher 35 %, et `l.heldLight` est la valeur **pré**-boost d'ambiant. Les objets personnalisés peuvent fixer `spotlightRange` et angle de cône — un mode « faisceau tenu en main » dont le cône suit la caméra. Les packs ne peuvent connaître la direction du faisceau.

Les blocs personnalisés peuvent porter `skyLightEmission` (0–15), qui **injecte dans le propre canal skyLight, à part du BFS de blockLight**. Les packs style R9.12 jugeant soleil/ombre par seuil skyLight peuvent faillir en mondes à skyLight relevé par lumières artificielles. Les packs de distribution jugent plus robuste combiné avec blockLight.

## 27. Détails de pipeline

- **Les hooks surface tournent « avant » alphaTest** : `out.alpha` alimente le test d'écart directement. Les matériaux cutout (herbe, feuilles) permettent des effets de dissolution type dither (recette R-C). En liquides (mélange) `out.alpha` est la transparence réelle (recette R-D). Sans effet en terrain opaque normal — ne pas confondre
- **Contenu de `l.ambient`** : `material.ambient × sceneAmbient`, distinct par matériau. Le côté scène attache au réglage graphique « Ambient Lighting Intensity » (défaut 0.5) — ne programmez jamais de défauts fixes
- **`bloxdTime()` est vraiment `performance.now()`** : l'uptime du navigateur enroulé à 1 heure. Sans rapport avec le jour/nuit du jeu ni le temps de monde écoulé. Pour animer synchronisé à une horloge de jeu, estimez l'heure depuis l'azimut `bloxdSunDirection()` en mondes à cycle jour/nuit
- Les fins damiers aux bords de chunk au chargement sont le fondu de chunk par dither Bayer 4×4 en espace écran du moteur, pas des bugs du pack
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

1. **Monde normal** (skybox default, sans overrides) — bloxdSunDirection() présent, couleurs par défaut
2. **Monde à skybox spatiale** — bloxdSunDirection() = 0. Le look de la branche `sunPresent`
3. **Monde personnalisé avec `visionMinLightColour` / `skyLightColourOverride`** — sombres relevés et couleurs

Sources principales de variation : `lightingOverride` (éclairage forcé) / `skyLightColourOverride`, `ambientLightColourOverride` (changes hex) / `visionMinLightColour` (plancher « couleur la plus sombre visible » sur sky et ambient ; Night Vision l'utilise — les packs « grotte bien noire » n'assombrissent pas comme prévu) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (présence de bloxdSunDirection()). `uSkyLightColour` par défaut = (1,1,1) blanc, `uAmbientLightColour` par défaut = (0.25,0.25,0.30). `l.ambient` côté scène = réglage graphique « Ambient Lighting Intensity » (défaut 0.5). `l.fogVisibility` suit les réglages de brouillard/distance de chunks du joueur.

## 29. Moyens de débogage

- Paramètre URL `?renderer=lite` — force le moteur Lite (`?renderer=webgl2` / `babylon` valent aussi)
- Paramètre URL `?vconsole` — console à l'écran (VConsole). Utile en vérification mobile réelle
- La console affiche `noa-engine v0.33.0` et `Renderer: lite from <source>` — revoyez-les d'abord pour ne pas mal diagnostiquer la voie de rendu
- Le moteur WebGPU se verrouille « forcé ON » avec pack appliqué. Le réglage « Disable Block Texture Atlas » se verrouille aussi (l'atlas reste ON), et sans WebGPU le pack n'applique même pas. Base pour écrire « navigateur WebGPU requis » en pages de distribution
- La revalidation runtime par partie (`checkCompilation`) compile des matériaux de terrain réels en WebGPU du navigateur (plus stricte que la validation statique de réglages). Les packs qui échouent ici s'excluent de ce jeu

# Partie VIII : Guide de migration vers API Version 2

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

Les 3 structs `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` gagnent toutes `blockId: u32`. C'est l'**ID du bloc possédant la face** (0 à 65535), constant sur toute une face (passé en `@interpolate(flat)`). Il sert à identifier les types de blocs sans dépendre de la couleur de texture. Mais la table ID ↔ type de bloc est interne au moteur et invisible des packs : **il n'y a qu'à mesurer en monde quel ID vaut quel bloc**.

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

Applications : absorption/diffusion par épaisseur, projection de motifs façon rides/caustiques depuis les coordonnées monde du fond via `behind.position`, reflet du ciel en surface distinguant ciel et occlusion avec `found=false`, gradation d'écume et de trouble par profondeur. Si la construction du pipeline de copie de profondeur échoue, dégradation sûre vers « rien derrière ».

## 36. Autres changements v2

- **Repli des hooks** : sans `bloxdLiquidXxx` défini, les programmes liquides replient sur le hook terrain. **Un pack à hooks terrain seuls agit tel quel sur l'eau aussi**. Si indésiré, définissez explicitement les hooks côté liquide.
- **Gardes de champs `BLOXD_LIGHTING` devenues inutiles** : `blockLight` etc. existent dans toutes les variantes, avec des défauts en unlit (0 / 1 / blanc / 0). N'utilisez `#ifdef BLOXD_LIGHTING` que pour tester la lumière. Garder les gardes existantes ne change rien.
- **Condition de définition de `BLOXD_ALPHA` changée** : défini en variantes terrain non strict et toutes variantes liquides, pas en strict × terrain. Gardez la garde pour écrire alpha en hooks terrain.
- **Construction directe de structs interdite** : les appels constructeurs comme `BloxdLight(...)` sont rejetés par la validation statique. Partez toujours de `bloxdDefault*` ou copiez l'entrée.
- **`let _ =` devient `_ =`** : l'affectation de rejet WGSL `_ = f();` est valide mais `let _ = f();` est rejeté.
- **offInStrict** : définir un hook vertex, ou un `discard` atteignable depuis des hooks surface / light, ne fait pas erreur mais auto-désactive tout le pack en jeux stricts (l'UI de réglages affiche `shaderPack:offInStrict`, et ça marche en jeux allow). Entourez vertex et `discard` avec `#ifndef BLOXD_STRICT`.
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

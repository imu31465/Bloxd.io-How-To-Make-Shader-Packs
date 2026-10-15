# Créer des packs de shaders pour Bloxd.io (Guide complet)

Guide autonome pour créer et distribuer des packs de shaders pour Bloxd.io (moteur WebGPU uniquement).
Basé sur la spécification `apiVersion: 1`. Inclut recettes et référence API : avec ce seul fichier, vous passez de zéro à la distribution.

> Ce guide est non officiel et ne représente pas la position des développeurs. L'API peut changer sans préavis.  
> Dernière révision : 2026-10-15 (ordre d'application du brouillard, réglages réels du brouillard et rendu sous-marin vérifiés contre l'implémentation du moteur). Aucune référence officielle publique de l'API WGSL n'ayant été trouvée, continuez à vérifier descriptions et recettes face à l'écran de chargement et à la compilation en jeu.  
> La fonction de packs de shaders est une fonction officielle accessible depuis l'interface du jeu, et les packs sont du WGSL pur  
> (ni exécution JS ni réseau) : rien de dangereux ne se produit avec du code normal.  
> Ce guide a été créé avec l'assistance de l'IA ; l'exactitude n'est pas garantie. Vérifiez avec le comportement réel en jeu.

## Sommaire

- [Partie I : Créer des packs](#partie-i--créer-des-packs)
- [Partie II : Référence API](#partie-ii--référence-api)
- [Partie III : Recettes](#partie-iii--recettes)
- [Partie IV : Guide du réalisme](#partie-iv--guide-du-réalisme)
- [Partie V : Dépannage et notes](#partie-v--dépannage-et-notes)
- [Partie VI : Notes d'implémentation importantes](#partie-vi--notes-dimplémentation-importantes)
- [Partie VII : Supplément d'intérieurs](#partie-vii--supplément-dintérieurs)

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
  "apiVersion": 1,
  "name": "My Pack",
  "author": "your name"
}
```

| Champ | Requis | Description |
|---|---|---|
| `apiVersion` | requis | Doit correspondre exactement à `1` |
| `name` | requis | Non vide. Affiché dans l'interface des réglages |
| `author` | optionnel | Omissible. Les valeurs non-chaînes (nombres etc.) sont des erreurs |

Les autres champs sont ignorés.

## 5. Modèle minimal

Un pack fonctionnel avec juste `pack.json` (section 4) et ce `pack.wgsl` :

```wgsl
// Pack minimal à légère teinte chaude
const packWarmth = 0.18;

fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

Règles à suivre :

- Ne **construisez jamais les structs de sortie directement** (`bloxd_Surface(...)` est une erreur). Partez toujours de `bloxd_defaultSurface(s)` / `bloxd_defaultLight(s, l)` / `bloxd_defaultVertex(v)` et modifiez les champs. Exception : le premier paramètre du hook light (`s: bloxd_Surface`) a le type de sortie : `var out = s;` vaut aussi
- `var x: bloxd_Surface;` sans initialiser (annotation de type seule) est aussi une erreur
- Les paramètres des hooks sont en **lecture seule**. Pour les changer, copiez d'abord, p. ex. `var sv = s;`
- Interdit d'utiliser le préfixe `bloxd_` dans vos identifiants (sauf les 6 noms de hooks)
- Écrivez les constantes avec `const` (`#define` n'accepte pas de valeurs)

## 6. Les 6 hooks

Tous optionnels. Les signatures doivent correspondre exactement en types (noms de paramètres libres).

| Hook | Rôle |
|---|---|
| `fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex` | Animation des sommets du terrain. **Indisponible en mode strict** |
| `fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface` | Couleur, transparence et émission du terrain. `s.colour` = texture × couleur de sommet |
| `fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light` | Couleur finale du terrain. Appelé à **l'étape finale du fragment** : sa valeur de retour devient la couleur finale telle quelle |
| `fn bloxd_liquid_vertex / _surface / _light` (mêmes formes) | Versions liquides. `alpha` agit comme transparence du liquide |

Règles de repli :

- Sans hook liquide, **le hook terrain de même nom est utilisé** (jamais l'inverse). Écrire seulement surface applique le même effet aux liquides
- Sans hook light, le comportement par défaut s'applique (`engineColour + emission × fogFactor`)
- Si vous écartez `engineColour` pour reconstruire depuis la couleur de base, réappliquez le brouillard vous-même : `mix(l.fogColour, col, l.fogFactor)`. En ajoutant de l'émission, multipliez-la d'abord par `fogFactor`

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
- Les coordonnées sont en local-noa. Ajoutez `originOffset` pour le monde. Coordonnées de bloc : `vec3i(floor(position - normal * 0.5)) + originOffset`

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
// Engine-provided and read-only to packs. apiVersion 1.
struct bloxd_VertexIn {
    position: vec3f,     // noa-local world space (world minus originOffset)
    normal: vec3f,
    originOffset: vec3i, // whole blocks
    time: f32,           // seconds, wrapped every 3600 s (part of the API)
}

#ifndef BLOXD_STRICT
struct bloxd_Vertex {
    position: vec3f,     // noa-local
}
#endif

struct bloxd_SurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher in v1)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    originOffset: vec3i, // a face's world block is vec3i(floor(position - normal * 0.5)) + originOffset
    eyePosition: vec3f,  // noa-local
    time: f32,
    sunDirection: vec3f, // unit, towards the sun, in world orientation; zero when the sky has no sun
}

struct bloxd_Surface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct bloxd_LightIn {
    engineColour: vec3f, // the engine's result for this fragment, from the surface hook's colour
    directional: f32,    // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,      // the material's ambient times the scene's
#ifdef BLOXD_LIGHTING
    blockLight: vec3f,   // voxel block light, tone-mapped
    skyLight: f32,       // voxel sky light, tone-mapped
    ambientLightColour: vec3f,
    skyLightColour: vec3f,
    heldLight: vec3f,    // held light here, tone-mapped like blockLight, before the ambient boost; 0 out of reach
#endif
    fogColour: vec3f,
    fogFactor: f32,      // 1 = no fog, 0 = fully fogged
    position: vec3f,     // as in bloxd_SurfaceIn
    normal: vec3f,
    originOffset: vec3i,
    eyePosition: vec3f,
    time: f32,
    sunDirection: vec3f,
}

struct bloxd_Light {
    colour: vec3f,
}

#ifndef BLOXD_STRICT
fn bloxd_defaultVertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    return bloxd_Vertex(v.position);
}
#endif

fn bloxd_defaultSurface(s: bloxd_SurfaceIn) -> bloxd_Surface {
#ifdef BLOXD_ALPHA
    return bloxd_Surface(s.colour, s.alpha, vec3f(0.0));
#else
    return bloxd_Surface(s.colour, vec3f(0.0));
#endif
}

fn bloxd_defaultLight(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    return bloxd_Light(l.engineColour + s.emission * l.fogFactor);
}
```

Points clés :

- `time` boucle toutes les 3600 secondes : c'est un temps écoulé. Aucune garantie de synchro avec l'horloge jour/nuit du jeu.
- `sunDirection` est un vecteur unitaire tant qu'un soleil existe ; zéro quand le ciel n'a pas de soleil. **La lune est toujours en `-sunDirection`** (le moteur calcule la position lunaire comme l'opposé exact du soleil). Mais dans les mondes par défaut le soleil est statique, la lune aussi — une lune en mouvement n'importe que dans les mondes à cycle jour/nuit (voir Partie VII, section 24)
- ※Note : écrit avant comme « non réutilisable comme direction lunaire à zéro ». La direction elle-même est disponible via `-sunDirection`, mais les packs de distribution doivent brancher sur `sunPresent` sur prémisse zéro (voir R2 pour le pseudo look bleu, Partie VII R-A pour le clair de lune directionnel)
- `emission` s'ajoute après le calcul d'éclairage, atténuée par **`fogFactor`** (l'implémentation defaultLight `engineColour + emission × fogFactor`. L'émission disparaît aussi au loin totalement brumeux)
- **Ordre d'application du brouillard** : le fragment traite ① composition éclairage/émission → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogFactor)` → ④ appel au hook light → ⑤ return. Donc **engineColour arrive déjà brumé**, et **la valeur rendue du hook light devient la couleur finale telle quelle** (après le hook, le brouillard n'est pas réappliqué)
- **Source de fogFactor** : distance en espace de vue (calculée par sommet, interpolée). En mode linear `fogFactor = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **Quand fogMode == 0** : `fogColour` arrive en `vec3f(0.0)` (noir). Le code estimant des plages horaires par la teinte de fogColour doit faire attention
- **Réglages réels du brouillard dans les builds actuels** : **linear fixe**. `fogStart` = distance de chunks, `fogEnd` = +1 chunk (horizon seul). Avec brouillard off, fixé à 100 / 101 chunks, de fait désactivé. Couleur de brouillard par défaut RGB(183, 191, 195)
- Un uniform nommé `bloxd_packInputs` existe dans le moteur, mais **les packs ne peuvent le référencer directement**. Passez par les champs d'entrée des hooks (`s.time` etc.)
- **`skyLight` / `blockLight` / `heldLight` arrivent après une "courbe de lift"**. Le `tone-mapped` des commentaires d'en-tête désigne ceci : le moteur applique toujours `y = 1-(1-x/(3-2x))³` (courbe S relevant les zones sombres) aux fragments avant de les remettre aux packs. Ni valeurs voxel brutes (n/15) : sous un arbre (brut 0,87) arrive relevé à **0,97**
- `skyLight` est pour l'essentiel la donnée d'occlusion voxel de "le ciel est-il visible d'ici" (= une carte d'ombres), pas un simple paramètre de luminosité (voir section 15, « La vérité sur les ombres »)

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

Les formes des structs d'en-tête changent aussi par variante (pas de `bloxd_Vertex` en strict, pas de `blockLight` etc. en unlit, pas d'`alpha` en terrain strict).

## 12. Antisèche de squelette

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);          // construction directe interdite ; toujours partir de default
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // le terrain n'a alpha qu'en allow
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);         // engineColour + emission*fogFactor
    #ifdef BLOXD_LIGHTING                       // protégez les entrées éclairage seul
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex toujours avec cette garde
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    out.position.y += sin(v.time) * 0.05;
    return out;
}
#endif
```

Cinq points à garder en tête : compiler propre dans les 8 variantes / les jeux stricts sont la majorité / pas de textures / paramètres de hooks en lecture seule / pas de `let` en portée module.

---

# Partie III : Recettes

> **Important :** les recettes ci-dessous sont des exemples individuels, pas à concaténer de haut en bas. Coller plusieurs définitions du même nom de hook (`bloxd_terrain_light` etc.) ou du même nom de fonction auxiliaire duplique les définitions dans un module et échoue la compilation. Pour combiner des effets, fusionnez-les en une fonction par type de hook.

## R1. Recettes de couleur (surface)

### Teinte unique (le plus basique)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
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
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldY = s.position.y + f32(s.originOffset.y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 1..0 sur hauteur 0..50
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Peindre par orientation (haut = clair, murs = sombres)

```wgsl
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
    // 0..0,35 de brouillard maison de 64 à 192 blocs
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### Nuit (virage bleu par skyLight + protection des lampes)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
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

> Dans cette API, `sunDirection` vaut zéro quand le ciel n'a pas de soleil. Ce qui suit n'est pas un clair de lune directionnel, juste un faible ambiant bleu quand le ciel est sombre. La direction lunaire elle-même est disponible via `-sunDirection` (mondes à cycle jour/nuit seuls. Partie VII R-A).

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 1 à l'horizon / 0 au zénith
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### Remplacement total de la sortie moteur (rééclairage simple)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    #ifdef BLOXD_LIGHTING
    // NOTE : construction directe de bloxd_Light(...) interdite ; réécrire colour depuis default
    var out = bloxd_defaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // écarte engineColour (le résultat d'éclairage du moteur) et utilise « couleur de base × luminosité calculée »
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogFactor);   // engineColour écarté : refaire brouillard obligatoire
    out.colour = col + s.emission * l.fogFactor;   // ajoutez emission vous-même aussi (obligatoire)
    return out;
    #else
    return bloxd_defaultLight(s, l);
    #endif
}
```

## R3. Recettes d'émission

> `emission` s'ajoute après le calcul d'éclairage, mais le traitement par défaut **l'atténue avec `fogFactor`. Au loin totalement brumeux, l'émission disparaît aussi. Pour garder de l'éclat au loin, n'ajoutez pas à emission — ajoutez directement en `out.colour += ...` dans le hook light** (engineColour porte déjà le brouillard : au loin, la lumière tombe sur la couleur de brouillard)

### Lampes pulsantes (torches qui respirent)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(l.time * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### Allure de minerai lumineux (les matériaux clairs émettent)

```wgsl
// côté surface : plus le matériau est clair (blanc), plus d'émission
fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### Nuée de lucioles (points de lumière à la dérive)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let world = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    // quelques « orbes de lumière » à la dérive lente ; éclat par inverse de distance
    let t = l.time * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(l.time * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. Recettes de coordonnées (monde / bloc / vue)

### Coordonnées monde

```wgsl
let worldPos = s.position + vec3f(f32(s.originOffset.x), f32(s.originOffset.y), f32(s.originOffset.z));
```

### Coordonnées de bloc

```wgsl
let worldBlock = vec3i(floor(l.position - l.normal * 0.5)) + l.originOffset;
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
let viewDir = normalize(l.eyePosition - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### Angle de vue (fresnel maison — pour liquides)

```wgsl
let viewDir = normalize(s.eyePosition - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 de face / 0 rasant
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. Recettes de temps (animation)

> `time` boucle toutes les 3600 secondes (1 heure). C'est le temps écoulé du shader, sans garantie de synchro avec le jour/nuit du jeu. Pour l'animation périodique visuelle OK, mais préférez `sunDirection` et les entrées d'éclairage pour détecter la vraie nuit.

### Cycle jour-nuit (1 jour par heure)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let day = 0.5 + 0.5 * sin(l.time * 6.2831853 / 3600.0);   // 0..1 période d'une heure ; pas forcément synchro avec le jour/nuit du jeu
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
fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldX = s.position.x + f32(s.originOffset.x);
    let worldZ = s.position.z + f32(s.originOffset.z);
    let ripple = sin(s.time * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid a toujours BLOXD_ALPHA — garde par habitude
    #endif
    return out;
}
```

### Transparence pseudo par hauteur (pas un vrai test de bas-fond)

> Profondeur de scène et position du fond inconsultables : la vraie profondeur ne se calcule pas avec cette seule API. `s.position.y` est une coordonnée locale et l'utiliser brute déplace l'effet avec l'origine du chunk. Ce qui suit ne fait varier alpha que par hauteur monde — pseudo effet, pas un bas-fond Script côte/fond. Ajustez `packWaterReferenceY` à votre hauteur monde.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    let worldY = s.position.y + f32(s.originOffset.y);
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
fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
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

### Herbe au vent (ne bouger que les pointes)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let sway = sin(v.time * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // faces verticales seules
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### Vagues en liquide (faces du dessus seules)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_liquid_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + v.time * 1.6) * 0.5
              + sin(v.position.z * 1.2 + v.time * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### Terrain pulsant

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    let pulse = sin(v.time * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // légère expansion/contraction le long des normales
    return out;
}
#endif
```

### Terrain ondulant (vagues sinus géantes)

```wgsl
#ifndef BLOXD_STRICT
fn bloxd_terrain_vertex(v: bloxd_VertexIn) -> bloxd_Vertex {
    var out = bloxd_defaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + v.time * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - v.time * 0.7) * 0.3;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // clamp intermédiaire
    col = mix(l.fogColour, col, l.fogFactor);                    // refaire brouillard
    out.colour = col + s.emission * l.fogFactor;                 // re-ajouter emission
    #endif
    return out;
}
```

### R9.2 Specular solaire (Blinn-Phong)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // fin éclat de bord
    #endif
    return out;
}
```

### R9.4 Ambiant hémisphérique (ciel dessus / rebond du sol dessous)

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // dessous : rebond
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // dessus : lumière du ciel
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // clamp intermédiaire
    col = mix(l.fogColour, col, l.fogFactor);                           // refaire brouillard
    out.colour = col + s.emission * l.fogFactor;                        // re-ajouter emission
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1,2 = exposition
    return out;
}
```

### R9.6 Perspective aérienne (« atmosphère » par désaturation à distance)

> Contrairement au brouillard (remplacement de couleur), superposer « désaturation à distance » rend les lointains bien plus réalistes.  
> Prudence : ne baissez que la saturation — jamais la luminance.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let dist = distance(l.eyePosition, l.position);
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
fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, l.time), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(l.eyePosition - l.position);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // coords locales du bloc
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
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

> Un plancher comme `max(l.fogFactor, 0.25)` limite « pas plus dense que ceci »  
> (0,0 = fidèle au moteur / 0,3–0,5 = lointain plus clair).  
> Note : le brouillard moteur est linéaire d'horizon seul (près de la distance de dessin) ; la brume moyenne doit être construite côté pack.
> Réglages réels du brouillard (vérifiés en implémentation) : linear fixe / `fogStart` = distance de chunks / `fogEnd` = +1 chunk / de fait désactivé à 100–101 chunks avec brouillard off / couleur par défaut RGB(183, 191, 195).

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogFactor, 0.15));  // refaire brouillard (0,15 = plancher léger)
    col += s.emission * l.fogFactor;            // émission aussi brumée
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 Grade cinéma (ombres froides / hautes chaudes / désaturation nocturne)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
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
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. restaure valeurs brutes (le sauter ne donne jamais d'ombres)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. coupe par seuil — sépare proprement soleil=1 / ombre=0
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // Lambert solaire (repli sur l.directional sans soleil)
    let sunLen = length(l.sunDirection);
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), l.sunDirection / sunLen), 0.0, 1.0),
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
    col = mix(l.fogColour, col, max(l.fogFactor, 0.15));
    out.colour = clamp(col + s.emission * l.fogFactor, vec3f(0.0), vec3f(1.0));   // n'oubliez pas emission (brumée)
    #endif
    return out;
}
```

> Guide de réglage : **la surface d'ombre tient au seul `shTh`** — `0,93` = rayon 1,5+ / `0,87` = rayon 2 / `0,80` = rayon 3 / `0,67` = rayon 5.  
> La dureté du bord, c'est `shSoft` (0,02 = dur / 0,08 = doux). L'obscurité du cœur, c'est le double réglage de `0,09` (ambiant minimum) et `0,16` (lumière dispersée du ciel).  
> Pour élargir les ombres au couchant, ajoutez `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (approximation des longues ombres du soir.  
> `sunDir` vaut `l.sunDirection / length(l.sunDirection)`). Pour des ombres plus bleues, montez le B de `vec3f(0.72, 0.82, 1.05)`.
>
> ⚠️ « Creuser le contraste avec `pow(skyLight, γ)` » **appliquait gamma à des valeurs liftées** et n'affectait jamais sous les arbres (0,97). Utilisez plutôt cette méthode.

---

# Partie IV : Guide du réalisme

## 13. Éclairage moteur par défaut et marge de réalisme

L'éclairage moteur par défaut n'est « que multiplication » — ni specular, fresnel, séparation chaud/froid, ni ambiant hémisphérique n'existent. Voici ce qui se reconstruit :

| Fonction | Par défaut | Reconstructible en packs ? |
|---|---|---|
| Diffus (Lambert) | Somme scalaire des directionnelles seules | ◎ Maison avec `sunDirection` (sources enveloppées etc.) |
| Specular | Néant | ◎ Blinn-Phong (R9.2) |
| Fresnel | Néant | ◎ Approximation de Schlick (R9.3) |
| Séparation torche chaude / ciel froid | Sans couleur | ◎ (R9.1) |
| Ambiant hémisphérique | Sans direction | ◎ Ciel dessus / sol dessous (R9.4) |
| Mappage de tons | Néant (clamp seul) | ◎ ACES filmique (R9.5) |
| Perspective aérienne | Brouillard seul (remplacement de couleur) | ◎ Désaturation à distance (R9.6) |
| Détail de surface | Résolution de texture seule | △ Micro-relief procédural au hachage (R9.8) |
| Ondes de sommets (eau) | Néant (plan) | ◎ Allow seul (R7) |
| Normales de vague / scintillement solaire | Néant | ◎ (R9.7) |
| Clair de lune nocturne | La couleur du ciel s'assombrit seulement | △ La direction lunaire est en `-sunDirection` : pseudo looks (ambiant bleu en R2 / désaturation en R9.11) plus clair de lune directionnel (R-A, cycle jour/nuit seul) |
| Ombres (occlusion du ciel) | Doux mélange via `mix(ambiant, ciel, skyLight)` seul | ◎ Inversion du lift + coupe par seuil + porte solaire (R9.12). L'ombre des arbres et sous les toits chute nettement, suivant les éditions de blocs en temps réel |

## 14. Deux écoles d'implémentation

**École A : retouches additives (depuis defaultLight)** — utilise `engineColour` (couleur terminée) comme base et ajoute éclat chaud ou rim. Facile et sûr, mais le modèle d'éclairage reste celui par défaut.

**École B : rééclairage total (depuis s.colour)** — écarte `l.engineColour` et reconstruit l'éclairage depuis `s.colour` (albedo) et les matériaux LightIn bruts. La vraie voie du réalisme. Quatre règles :

1. **Réappliquez le brouillard** : le hook light tourne post-brouillard ; appliquez `mix(l.fogColour, col, l.fogFactor)` vous-même (R9.10). Par brouillard dense, posez un plancher avec `max(l.fogFactor, 0.3)`. Et à l'inverse : mélanger plus de couleur de brouillard dans des packs basés sur engineColour produit un double brouillard blanc
2. **Repli unlit** : passez à `defaultLight` hors `#ifdef BLOXD_LIGHTING`
3. **Protégez des fonctions partagées entières** : entourez en `#ifdef BLOXD_LIGHTING` en fonctions complètes les fonctions partagées prenant `bloxd_LightIn` (protéger seuls les appels ne suffit pas)
4. **Sans direction solaire** : si `sunDirection` est zéro, ne calculez pas de specular directionnel. `l.directional` est un scalaire de quantité de lumière, pas un vecteur de direction : il ne restaure pas la direction du reflet. Basculez sur un ambiant faible sans direction si besoin. La direction lunaire est disponible via `-sunDirection` (ne bouge que dans les mondes à cycle jour/nuit. Partie VII R-A)

## 15. Looks inatteignables (le « plafond » du réalisme)

| Look | Motif |
|---|---|
| Shadow maps pixellisées (ombres tournant avec le soleil, pénombre) | Textures de profondeur non référençables. L'occlusion de rayons n'arrive pas aux hooks |
| SSAO | Sans accès à la profondeur de scène (seule l'AO de sommets du mesher) |
| SSR (reflets) | Idem. Pseudo looks seuls mêlant la couleur du ciel via fresnel |
| Bloom / glare | Sans hook au post-traitement |
| Profondeur de champ, aberration chromatique, grain | Post-traitement plein écran requis |
| Lumière volumétrique (god rays) | Idem |
| Textures PBR | Lectures de textures interdites. Pseudo estimation seule depuis la luminance de couleur |
| Réfraction sous-marine | Sans entrée de profondeur de scène |
| Voile sous-marin (teinte bleue) : retirer / changer | Le voile est un quad emissive plein écran généré depuis la couleur/alpha de définition du bloc liquide de la caméra, dessiné hors des pipelines de hooks (tout devant) : le pack ne peut en changer ni couleur ni densité |
| Détection sous-marine directe | Aucune entrée n'indique la submersion de caméra, et fogStart / fogEnd / fogColour ne changent pas sous l'eau : il n'existe pas non plus de moyen fiable de l'estimer depuis fogFactor etc. |

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

Points pratiques : les packs continuent sous l'eau / le voile ne se retire pas / sous l'eau on ne branche pas (fogStart / fogEnd / fogColour ne changent pas sous l'eau : fogFactor ne le détecte pas non plus).

## 16. Astuces de débogage

- Grottes trop claires → manque de courbe non linéaire de `skyLight` (recette de grottes R2 / R9.9)
- Jours cramés → baissez l'exposition pré-ACES
- Nuits trop noires → assurez un ambiant minimum (le `skyLightColour` nocturne est presque noir par prémisse)
- Lointain trop brumeux → baissez les coefficients aériens
- Tout orange autour des torches → baissez la proportion chaude (conservez de la lumière brute teintée)
- Blocs presque tout blancs → le total de sortie du hook light dépasse 1.0 (sans clamp en aval). Terminez avec `clamp(col, vec3f(0.0), vec3f(1.0))`
- Blanc sans additions → inversion un-fog par division avec fogFactor. Retirez un-fog ; reconstruisez depuis `s.colour` et `mix` de brouillard une seule fois à la fin
- Blocs émissifs qui ne brillent pas → manque de re-ajout d'emission en recettes de reconstruction. Ajoutez `+ s.emission * l.fogFactor`
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
| `blockLight` signalé indéfini | Entourez de `#ifdef BLOXD_LIGHTING`. Entourez les fonctions auxiliaires partagées **en fonctions entières** |
| `Packs can't construct bloxd_Surface directly` | Partez de `bloxd_defaultSurface(s)` |
| `bloxd_Vertex only exists when BLOXD_STRICT isn't defined` | Entourez de `#ifndef BLOXD_STRICT` |
| Lointain blanc et laiteux | Souvent double brouillard. La couleur terminée porte déjà le brouillard : gardez subtile la brume maison et préférez ne baisser que la saturation |
| Pack exclu en rejoignant le jeu | Échec du contrôle en direct du jeu. Revoyez les oublis de gardes |
| `pack.json needs "apiVersion": 1.` | `apiVersion` manquant. Ajoutez le nombre `1` (la chaîne `"1"` est rejetée) |
| `There's no pack.json at the top of the pack.` | Pas de `pack.json` à la racine du ZIP. Vérifiez de ne pas avoir zippé le dossier lui-même |
| `bloxd_terrain_vertex must be declared as: fn ...` | Signature différente. Réécrivez exactement comme affiché |
| `bloxd_terrain_vertex can't run in strict games...` | Entourez le hook vertex de `#ifndef BLOXD_STRICT` |
| `bloxd_LightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | Entourez de `#ifdef BLOXD_LIGHTING` |
| Monter `pow(l.skyLight, γ)` ne creuse jamais les ombres | `skyLight` est une valeur post-courbe (brut 0,87 arrive en 0,97). Passez à inversion + seuil de R9.12 (section 10) |
| `... can only be a function's parameter or return type, ...` | `var x: bloxd_Surface;` sans initialiser est rejeté. Construisez depuis `bloxd_default*` |
| `bloxd_packInputs isn't part of the bloxd_ header` | L'uniform PackInputs ne peut se référencer depuis les packs. Utilisez les champs d'entrée des hooks (`s.time`, `s.originOffset`, `s.sunDirection`) |
| `Packs can't declare bloxd_ names...` | Retirez le préfixe `bloxd_` de vos identifiants. Seuls les 6 noms de hooks peuvent se définir |
| `loadDuplicateManifest` au chargement zip | Deux `pack.json` (variantes de casse incluses). Gardez-en un |
| `Packs can't construct bloxd_Surface directly, since header structs gain fields; ...` | Réécrivez depuis `bloxd_defaultSurface(s)`. Partir d'une copie du premier paramètre du hook light (`var out = s;`) vaut aussi |

## 18. Droits et notes

- La fonction de packs de shaders est une fonction officielle chargeable depuis l'interface du jeu, et créer des packs est considéré comme un usage prévu. Mais aucune documentation officielle publique n'a été confirmée
- Les packs sont du WGSL pur — exécution JS et accès réseau impossibles par conception
- Ceci est un guide non officiel, pas la position officielle des développeurs. L'API peut changer sans avis

---

# Partie VI : Notes d'implémentation importantes

## 19. Corriger « ombres sombres mais surfaces brillantes » la nuit

Assombrir seules les ombres laisse la couleur terminée (`engineColour`) brillante sans soleil, et l'écart face/ombre devient contre-nature. Atténuez toute la couleur terminée.

L'exemple traite `sunDirection` zéro comme nuit et le soleil directionnel comme jour, atténuant les couleurs terminées du terrain aux heures sombres. Où `blockLight` et `heldLight` sont forts, l'atténuation faiblit pour préserver les lampes proches comme les torches. `0.52` est une valeur de réglage — baissez pour des nuits plus noires.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(l.sunDirection));
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
    out.colour = l.engineColour * scale + s.emission * l.fogFactor;
    return out;
}
```

**Limites de cette correction :** si `sunDirection` se comporte en « direction unitaire avec soleil, zéro sans », jour/nuit se distinguent mais le couchant ne s'estime pas en douceur. Et comme elle atténue la couleur terminée, elle affaiblit ensemble lumière diurne et ambiant du moteur — pas une reproduction totale de l'horaire. Pour l'appliquer aux liquides, revoyez la relation de repli des hooks liquide.

## 20. Recette intégrée pour une eau d'aspect naturel

Cette API ne peut échantillonner ni couleur de scène, ni profondeur, ni fond : c'est du **pseudo-stylage par mélange fresnel et reflets solaires, pas de vraies maths de réflexion/réfraction/profondeur**. L'échantillon conserve la couleur de base, mélange un peu vers une couleur de ciel aux angles rasants et n'ajoute un petit reflet qu'avec soleil.

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxd_liquid_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(l.eyePosition - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = l.position + vec3f(f32(l.originOffset.x), f32(l.originOffset.y), f32(l.originOffset.z));
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, l.time), topness));
    let sunLen = length(l.sunDirection);
    if (sunLen > 0.5) {
        let sunDir = l.sunDirection / sunLen;
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
- Reflets réels du paysage : les entrées de cette API n'ont ni couleur d'écran ni profondeur : mélanger des couleurs n'est jamais un vrai reflet.

Cette recette **remplace** un `bloxd_liquid_light` existant. Ne la collez pas avec la fonction d'onde homonyme de R9.7 ni d'autres hooks homonymes.

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
- Aucune entrée pour ajouter shadow maps, reflets en espace écran, profondeur de scène, réfraction, bloom, etc.
- `time` est un temps d'animation sans lien garanti avec le jour/nuit du jeu.
- Avec `sunDirection` zéro, la vraie direction lunaire est inconnue, pas de la « physique de clair de lune » mais une approximation d'ambiance. Le clair de lune directionnel se construit depuis `-sunDirection` (mondes à cycle jour/nuit seuls. Partie VII R-A).
- `s.position` / `l.position` sont des coordonnées locales : ajoutez `originOffset` pour les effets dépendants du monde. Pour les motifs locaux du bloc, les coordonnées locales sont l'outil voulu.

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

Points pratiques : les packs continuent sous l'eau / le voile ne se retire pas / sous l'eau on ne branche pas (fogStart / fogEnd / fogColour ne changent pas sous l'eau : fogFactor ne le détecte pas non plus).

---

# Partie VII : Supplément d'intérieurs

Spécifications extra trouvées par analyse d'implémentation du moteur. Tout restauré directement du JavaScript du build de production actuel.

## 24. Identité du soleil et de la lune

La source de `l.sunDirection` est un tampon de direction solaire réécrit seulement quand change le type de skybox — le critère n'est pas « si le ciel a un soleil » mais **« si le skybox est de type terre »**.

| Skybox | `l.sunDirection` |
|---|---|
| `default` (ciel procédural) | Non zéro (défauts ci-dessous) |
| `gloomy` / `interstellar` / `space_*` (textures cubiques) | **Toujours (0,0,0)** |

**La lune est toujours en `-sunDirection`** (le moteur calcule la position lunaire comme l'opposé exact du soleil). La nuit se juge par hauteur solaire — il y a lune en haut quand `sunDirection.y < 0` (soleil sous l'horizon). Mais dans les mondes par défaut le soleil est statique, la lune aussi — seuls les mondes à cycle jour/nuit la voient bouger.

La direction solaire par défaut tourne autour de `(-0.56, 0.81, -0.18)` (vecteur unitaire d'inclination = −0.2 / azimuth = 0.55, statique). Référence pratique pour prédire les directions de reflet en testant des packs de distribution.

Les cycles jour/nuit ne sont pas intégrés au moteur — inclination est un nombre statique que les mondes à jour mobile actualisent côté jeu. `sunDirection` suit chaque mise à jour.

Les lumières directionnelles du terrain ne sont que 2 lampes créées au démarrage de scène, de **direction et intensité fixes, sans changement jour/nuit**. En bref : **aucun facteur de brillance du terrain ne dépend du temps. Les « looks » jour/nuit viennent seulement de la skybox et de sunDirection** : les packs assombrissant de nuit doivent donc estimer la tranche horaire depuis sunDirection (la technique `sunPresent` de §19).

### R-A. Clair de lune directionnel — moonDir = −l.sunDirection

Ajoute du Lambert blanc-bleuté et un faible specular tant que la lune est en haut. `moonUp` vaut 0 dans les mondes à soleil statique par défaut : rien ne s'y passe — **clair de lune qui ne se déclenche qu'en mondes à cycle jour/nuit, donc sûr**.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // la lune est toujours exactement opposée au soleil ; auto-off diurne via moonDir.y < 0
    let moonDir = -l.sunDirection;
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(l.eyePosition - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. Intérieurs du brouillard

Le calcul du brouillard est toujours en mode LINEAR (`fogFactor = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), avec `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = réglage de brouillard ; seul D = 0 est spécial avec fogEnd = 5). **La bande de dégradé ne fait que 32 blocs**, et `l.fogFactor` est moins « brume de distance » que **distance normalisée au bord du monde chargé**. Elle varie par joueur avec la distance de chargement : les effets par distance doivent calculer `distance(l.position, l.eyePosition)` eux-mêmes (recette R-B).

Couleur de brouillard par défaut `rgb(183, 191, 195)` (gris bleu pâle). Les créateurs de mondes la changent via `fogColourOverride` (hex). Avec mode brouillard 0 (NONE), **fogColour arrive noir**. La forme standard `mix(l.fogColour, col, l.fogFactor)` est sûre car la couleur de brouillard ne sert pas à fogFactor 1.

Régler `showFog` à false pousse le brouillard à 3200–3328 blocs, le désactivant de fait (`fogFactor ≈ 1` continue à venir).

### R-B. Bande de bord de chargement — fogFactor en « bord du monde »

Refroidit en silence juste la bande de 32 blocs du bord de chargement pour estomper la fin du monde (ou l'accentuer en effet). Sans distance autocalculée : suit auto les réglages de distance de chargement du joueur.

```wgsl
fn bloxd_terrain_light(s: bloxd_Surface, l: bloxd_LightIn) -> bloxd_Light {
    var out = bloxd_defaultLight(s, l);
    // fogFactor : 1 = dedans (marge au bord), 0 = sur le point de sortir du bord
    let edge = 1.0 - l.fogFactor;
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
- **`time` est vraiment `performance.now()`** : l'uptime du navigateur enroulé à 1 heure. Sans rapport avec le jour/nuit du jeu ni le temps de monde écoulé. Pour animer synchronisé à une horloge de jeu, estimez l'heure depuis l'azimut `sunDirection` en mondes à cycle jour/nuit
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

fn bloxd_terrain_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    #ifdef BLOXD_ALPHA
    // se dissout depuis les blocs bas ; plus dissolve persiste
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(s.originOffset).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. Fondu d'eau proche caméra — l'alpha liquide dégage la vue

L'`out.alpha` du hook liquide alimente le mélange directement. Dégage juste la surface sous la caméra pour assurer la vue en plongée ou caméra sur l'eau.

```wgsl
fn bloxd_liquid_surface(s: bloxd_SurfaceIn) -> bloxd_Surface {
    var out = bloxd_defaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, s.eyePosition);
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 blocs de transparent total à normal
    #endif
    return out;
}
```

## 28. Ce qui change les valeurs visibles du pack — liste de tests

Le même pack rend différemment selon **monde et réglages joueur**. Revoyez au moins ces 3 environnements avant de distribuer :

1. **Monde normal** (skybox default, sans overrides) — sunDirection présent, couleurs par défaut
2. **Monde à skybox spatiale** — sunDirection = 0. Le look de la branche `sunPresent`
3. **Monde personnalisé avec `visionMinLightColour` / `skyLightColourOverride`** — sombres relevés et couleurs

Sources principales de variation : `lightingOverride` (éclairage forcé) / `skyLightColourOverride`, `ambientLightColourOverride` (changes hex) / `visionMinLightColour` (plancher « couleur la plus sombre visible » sur sky et ambient ; Night Vision l'utilise — les packs « grotte bien noire » n'assombrissent pas comme prévu) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (présence de sunDirection). `uSkyLightColour` par défaut = (1,1,1) blanc, `uAmbientLightColour` par défaut = (0.25,0.25,0.30). `l.ambient` côté scène = réglage graphique « Ambient Lighting Intensity » (défaut 0.5). `l.fogFactor` suit les réglages de brouillard/distance de chunks du joueur.

## 29. Moyens de débogage

- Paramètre URL `?renderer=lite` — force le moteur Lite (`?renderer=webgl2` / `babylon` valent aussi)
- Paramètre URL `?vconsole` — console à l'écran (VConsole). Utile en vérification mobile réelle
- La console affiche `noa-engine v0.33.0` et `Renderer: lite from <source>` — revoyez-les d'abord pour ne pas mal diagnostiquer la voie de rendu
- Le moteur WebGPU se verrouille « forcé ON » avec pack appliqué. Le réglage « Disable Block Texture Atlas » se verrouille aussi (l'atlas reste ON), et sans WebGPU le pack n'applique même pas. Base pour écrire « navigateur WebGPU requis » en pages de distribution
- La revalidation runtime par partie (`checkCompilation`) compile des matériaux de terrain réels en WebGPU du navigateur (plus stricte que la validation statique de réglages). Les packs qui échouent ici s'excluent de ce jeu

## 30. Sur des matériaux indépendamment similaires

Il existe un matériau communautaire au contenu presque pareil : [Shader de GlitchHunterCoder/Bloxd-Essay](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader). Publié avant ce guide, mais **le contenu de ce guide vient de l'analyse propre de glm sur les vrais fichiers bundle de Bloxd (jeu de chunks webpack) — pas du copier-coller**. Les deux coïncident parce qu'enquêter indépendamment sur la même implémentation mène aux mêmes conclusions.

---

Recherché par ltf_ahel (recherché avec glm)

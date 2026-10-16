[← Partie précédente](making.md)·[Retour au manuel](README.md)·[Partie suivante →](recipes.md)

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
- `bloxdSunDirection()` est un vecteur unitaire tant qu'un soleil existe ; zéro quand le ciel n'a pas de soleil. **La lune est toujours en `-bloxdSunDirection()`** (le moteur calcule la position lunaire comme l'opposé exact du soleil). Mais dans les mondes par défaut le soleil est statique, la lune aussi — une lune en mouvement n'importe que dans les mondes à cycle jour/nuit (voir [Partie VII](internals.md), section 24)
- ※Note : écrit avant comme « non réutilisable comme direction lunaire à zéro ». La direction elle-même est disponible via `-bloxdSunDirection()`, mais les packs de distribution doivent brancher sur `sunPresent` sur prémisse zéro (voir R2 pour le pseudo look bleu, [Partie VII](internals.md) R-A pour le clair de lune directionnel)
- `emission` s'ajoute après le calcul d'éclairage, atténuée par **`fogVisibility`** (l'implémentation defaultLight `engineColour + emission × fogVisibility`. L'émission disparaît aussi au loin totalement brumeux)
- **Ordre d'application du brouillard** : le fragment traite ① composition éclairage/émission → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ appel au hook light → ⑤ return. Donc **engineColour arrive déjà brumé**, et **la valeur rendue du hook light devient la couleur finale telle quelle** (après le hook, le brouillard n'est pas réappliqué)
- **Source de fogVisibility** : distance en espace de vue (calculée par sommet, interpolée). En mode linear `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **Quand fogMode == 0** : `fogColour` arrive en `vec3f(0.0)` (noir). Le code estimant des plages horaires par la teinte de fogColour doit faire attention
- **Réglages réels du brouillard dans les builds actuels** : **linear fixe**. `fogStart` = distance de chunks, `fogEnd` = +1 chunk (horizon seul). Avec brouillard off, fixé à 100 / 101 chunks, de fait désactivé. Couleur de brouillard par défaut RGB(183, 191, 195)
- L'uniform `bloxdPackInputs` (`@group(3) @binding(0)`, 64 o) **ne s'utilise que via les fonctions d'en-tête**. Ne le référencez jamais directement depuis les packs. La visibilité de stage étant VERTEX|FRAGMENT, les fonctions d'en-tête s'appellent aussi depuis les fonctions de portée module hors hooks et depuis les hooks vertex. La texture de profondeur (binding 1) étant réservée au FRAGMENT, `bloxdOpaqueBehind()` est limité aux hooks surface / light
- **`skyLight` / `blockLight` / `heldLight` arrivent après une "courbe de lift"**. Le `tone-mapped` des commentaires d'en-tête désigne ceci : le moteur applique toujours `y = 1-(1-x/(3-2x))³` (courbe S relevant les zones sombres) aux fragments avant de les remettre aux packs. Ni valeurs voxel brutes (n/15) : sous un arbre (brut 0,87) arrive relevé à **0,97**
- `skyLight` est pour l'essentiel la donnée d'occlusion voxel de "le ciel est-il visible d'ici" (= une carte d'ombres), pas un simple paramètre de luminosité (voir section 15, « La vérité sur les ombres »)
- **`litColour` comme point de départ** : en v1, seule `engineColour` (déjà brumée) existait, et les rendus d'atmosphère maison finissaient souvent en double brouillard. En v2, partez de `litColour` (avant brouillard, avant emission) et réappliquez le brouillard à votre rythme avec `bloxdApplyFog()`
- **Distinguer les blocs avec `blockId`** : identification indépendante de la couleur de texture. Mais la table ID ↔ type de bloc est interne au moteur : mesurez en monde quel ID vaut quel bloc (voir [partie VIII](apiv2.md))
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

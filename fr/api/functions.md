# Fonctions

> API cible : 5 · Build cible : `xkg8x` · État : Analyzed (restauré mot à mot depuis l'en-tête en production)

Toutes les fonctions de l'en-tête. L'API de textures (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`) est couverte dans [API de textures](texture-api.md), tout comme `bloxdOpaqueBehind`.

## Fonctions d'image (même valeur pour toute l'image)

Note d'en-tête : *« These functions return the same value for the entire frame. »* Elles lisent l'uniform `bloxdPackInputs`, elles sont donc aussi appelables depuis les hooks de sommet et les fonctions à portée de module.

### bloxdEyePosition

```wgsl
fn bloxdEyePosition() -> vec3f
```

- **Renvoie** : la position de rendu de la caméra
- **Appelable depuis** : les 9 hooks + la portée de module
- **Usages** : vecteurs de vue (`normalize(l.position - bloxdEyePosition())`), rim light, distances

### bloxdRenderOffset

```wgsl
fn bloxdRenderOffset() -> vec3i
```

- **Renvoie** : le décalage entier en blocs ; **position de rendu + ce décalage = position monde**
- Change à mesure que le joueur se déplace (garde les positions de rendu proches de 0,0,0)
- Utilisé en interne par `bloxdWorldPosition()`

### bloxdSunDirection

```wgsl
fn bloxdSunDirection() -> vec3f
```

- **Renvoie** : vecteur unitaire vers le soleil en orientation monde ; **vecteur nul quand il n'y a pas de soleil**
- **Faits** :
  - **la lune est toujours à `-bloxdSunDirection()`** (le moteur la place à l'opposé du soleil)
  - **ne jamais passer le vecteur nul à `normalize`** — protégez avec `dot(d, d) < 1e-8` et retombez sur une direction constante
  - le build actuel n'a pas de cycle jour/nuit ; soleil, lune et étoiles ne bougent pas pendant une session (seule l'opacité bascule). Dans le ciel « terre » par défaut, le soleil se tient près de `(−0.56, 0.81, −0.18)` (élévation ≈ 54°)
- **Usages** : température de couleur, direction de la lumière, porte solaire, pseudo clair de lune

### bloxdSeconds

```wgsl
fn bloxdSeconds() -> f32
```

- **Renvoie** : secondes depuis le chargement de la page (pas de wrap — le f32 garde une précision inférieure à la milliseconde pendant les 4,5 premières heures)
- **Usages** : animation ; minuteurs récurrents via `bloxdSeconds() % period`
- **Note** : contrairement au `bloxdTime()` de v2 (qui bouclait à 3600 s), il ne boucle pas

### bloxdLit

```wgsl
// Whether block and sky lighting is on. When it's off, BloxdLightIn's
// blockLight and heldLight are 0, and its skyLight and light colours are 1.
fn bloxdLit() -> bool
```

- **Renvoie** : si l'éclairage de bloc et de ciel est activé
- **Nouveau en v5** : remplace la branche à la compilation `#ifdef BLOXD_LIGHTING` de v4 par un test à l'exécution
- **Garanties quand c'est coupé** (note d'en-tête) : `blockLight` et `heldLight` valent 0 ; `skyLight` et les couleurs de lumière (`ambientLightColour` / `skyLightColour`) valent 1
- **Usage** : conditionner le code dépendant de l'éclairage :

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    // ... traitement avec éclairage activé
    return out;
}
```

Utiliser `BLOXD_LIGHTING` produit *« BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead. »*

## Conversion de coordonnées

### bloxdWorldPosition

```wgsl
// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f
```

- **Renvoie** : `position + vec3f(bloxdRenderOffset())`
- **Note** : les limites de précision du f32 font que les coordonnées lointaines peuvent être inexactes (en-tête : *« with possible f32 inaccuracy »*)

### bloxdFragmentBlockPosition — non documentée mais toujours injectée

```wgsl
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i
```

Cette fonction **ne fait plus partie de l'en-tête documenté** (elle y était en v4), mais le moteur l'accepte et la définit toujours :

- **Validateur** : toujours listée dans la table des signatures en production, donc les appels passent la validation de noms dans chaque hook (hooks de sommet compris)
- **Exécution** : le générateur de code injecte toujours une définition dans le module terrain/liquide et dans les deux programmes de modèle — terrain/liquide utilisent `vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset()` ; les pipelines de modèle utilisent un décalage d'1/64 de bloc, en s'alignant sur la cellule du modèle pour les modèles de blocs posés
- **Réserve** : comme il s'agit d'une fonction interne non documentée, elle peut disparaître dans une future version sans préavis — préférez `bloxdWorldPosition()` pour les positions continues et `flags` pour « quel bloc est-ce » (voir [Historique des versions : v5](../history/v5.md) pour son retrait de l'en-tête)

Les packs écrits pour v4 qui l'appellent continuent de fonctionner ; les nouveaux packs ne doivent pas l'adopter.

## Fonctions par défaut (comportement du moteur)

### bloxdDefaultVertex

```wgsl
fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex
// implémentation : return BloxdVertex(vertex.position);
```

### bloxdDefaultSurface

```wgsl
fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface
```

Transmet `colour`, transmet `enchantColour` / `overlayColour` sans changement, met `emission` à zéro (et transmet `alpha` dans les variantes `BLOXD_ALPHA`). **Les structures de sortie ne peuvent être construites que via cette fonction.**

### bloxdDefaultLight

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight
// implémentation :
//   let lit = bloxdLitColour(surface, light);
//   return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
```

Littéralement « appliquer la recette du moteur, puis appliquer le brouillard au résultat augmenté de l'émission ».

## Fonctions de la recette d'éclairage

La recette d'éclairage propre du moteur, documentée comme WGSL appelable — composez ou surchargez les étages individuellement. Explications et diagramme de flux : [Éclairage](lighting.md).

| Fonction | Signature | Rôle |
|---|---|---|
| `bloxdShading` | `(light: BloxdLightIn) -> vec3f` | comment le matériau et l'angle de la face l'éclairent (Lambert × diffuse + emissive + ambient, clampé 0–1) |
| `bloxdWorldLight` | `(light: BloxdLightIn) -> vec3f` | la lumière du monde à cet endroit (la plus brillante de bloc/ciel/main, `ambientLightColour` comme plancher) |
| `bloxdLitColour` | `(surface: BloxdSurface, light: BloxdLightIn) -> vec3f` | la couleur de la surface éclairée comme le moteur le fait (avant émission et brouillard) |
| `bloxdApplyFog` | `(colour: vec3f, light: BloxdLightIn) -> vec3f` | appliquer le brouillard de ce fragment (`mix(colour, fogColour, fogAlpha)`) |

## Fonctions spéciales

### bloxdOpaqueBehind

```wgsl
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind
```

- **Renvoie** : `BloxdOpaqueBehind` (`hit: bool`, `position: vec3f`, `distance: f32`)
- **Appelable depuis** : uniquement les hooks surface / light (la texture de profondeur est FRAGMENT-only)
- **Garde** : `#ifdef BLOXD_SCENE_DEPTH` (défini dans les variantes liquides)
- **Signification** : la face opaque derrière ce fragment (terrain vu à travers l'eau) ; `hit == false` pour le ciel
- **Renommage depuis v2** : `found` → `hit`
- **Pour aller plus loin** : [Historique des versions : v3](../history/v3.md) et [Intérieurs du moteur](../internals/rendering-pipeline.md)

## Voir aussi

- [Éclairage](lighting.md) · [API de textures](texture-api.md) · [Format de pack](pack-format.md)

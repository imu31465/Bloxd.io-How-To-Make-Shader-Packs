# API de textures

> API cible : 5 · Build cible : `ab90qa` · État : Verified (API inchangée depuis v4, reconfirmée sur le build v5)

L'API de lecture des textures propres du jeu : deux fonctions, une famille de constantes nommées et quatre champs d'entrée. Le résumé en une ligne de l'en-tête lui-même : *« This face's texture. Compare with `bloxdTextureId*`. »*

## bloxdTexel

```wgsl
fn bloxdTexel(textureId: u32, uv: vec2f, mipLevel: f32) -> vec4f
```

- **Appelable depuis** : **uniquement les hooks surface / light** (l'atteindre depuis un hook de sommet échoue avec un diagnostic « reaches »)

Lit un texel **de la même façon que le propre échantillonneur du moteur** — même atlas `texture_2d_array<f32>`, même sampler, `textureSampleLevel` à `round(mipLevel)` — si bien que le texel que vous lisez correspond structurellement au texel que le moteur a dessiné.

### Ce que lit `bloxdTexel` dépend du pipeline

Le moteur génère une définition différente de `bloxdTexel` par pipeline, donc une seule fonction a trois comportements :

| Pipeline | `textureId == 0` | `textureId` non nul | Notes |
|---|---|---|---|
| **Pipelines atlas** — terrain, liquide et modèles de blocs dessinés depuis l'atlas de blocs | `vec4f(1.0)` (blanc — « pas de texture ») | échantillonne **cette entrée d'atlas** | les constantes nommées s'appliquent ; animation et rotation sont automatiques |
| **Pipelines à texture propre** — modèles dont le maillage porte sa propre texture diffuse (skins de joueurs, textures de mobs, sprites d'objets) | échantillonne **la texture propre du maillage** à l'uv que vous passez | `vec4f(1.0)` (blanc) | exactement une texture est en portée ; les constantes nommées ne s'appliquent pas |
| **Pipelines sans texture** | blanc | blanc | stub ; `bloxdTextureSize() -> vec2u(1u)` |

Sémantique des pipelines atlas en détail :

- **`textureId == 0` renvoie `vec4f(1.0)` (blanc).** C'est l'id « pas de texture » ; les faces sans texture portent 0 dans les quatre champs d'entrée, donc `bloxdTexel(surface.textureId, ...)` est toujours appelable sans risque
- **Les textures animées renvoient automatiquement l'image courante.** Les images avancent sur l'horloge d'animation du jeu — vous ne pouvez ni les arrêter ni les faire avancer pas à pas, et vous n'en aurez jamais besoin
- **`mipLevel` se clampe exactement comme celui du moteur** : `clamp(round(mipLevel), 0, textureNumLevels(textureAtlas0) - 1)` ; les mips hors bornes saturent au lieu de produire une erreur
- **Le `textureRotation` propre du fragment est appliqué à l'uv que vous passez** (voir ci-dessous)

`textureId` est **indexé à partir de 1** sur les pipelines atlas : `bloxdTextureIdGrassTop` est l'id, et la couche d'atlas que le moteur échantillonne pour lui est `id - 1`. Les ids sont stables par *nom* de texture, pas par emplacement d'atlas — le moteur remanie l'atlas d'un build à l'autre, mais la comparaison par nom garde son sens.

### Le motif d'appel universel

```wgsl
// Fonctionne dans tous les pipelines : sur les faces d'atlas il échantillonne l'entrée d'atlas ;
// sur les modèles à texture propre textureId vaut 0 et il échantillonne la texture propre du modèle.
let texel = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
```

`surface.colour` contient déjà `texture × tint × occlusion ambiante` (skins et teintes incluses), donc les lectures de texel servent au détail *additionnel* — estimations de luminance, effets par texture — pas à reconstruire la couleur de base.

## bloxdTextureSize

```wgsl
fn bloxdTextureSize(mipLevel: f32) -> vec2u
```

- **Appelable depuis** : uniquement les hooks surface / light

`textureDimensions(textureAtlas0, <mip clampé>)`. Chaque texture occupe une couche de l'array, donc c'est aussi *la taille en texels de n'importe quelle texture à ce mip* (toutes les textures de blocs d'un même palier d'atlas font la même taille carrée).

```wgsl
// rééchantillonnage aligné au texel pour un rendu « pixel-art »
let size = bloxdTextureSize(surface.mipLevel);
let uv = fract(surface.uv);
let texel = bloxdTexel(surface.textureId, uv, surface.mipLevel);
```

## Textures possédées par le modèle (textureId: 0)

L'en-tête note : *« These are all 0 if the face has no texture. **Most models use textureId 0.** »* — la plupart des faces de modèle n'ont pas de texture d'*atlas*, parce que leurs maillages portent leurs propres textures :

- **Les skins de joueurs** et les autres textures de modèle hors atlas (mobs, sprites d'objets) arrivent avec `textureId: 0`
- Sur ces pipelines, `bloxdTexel(0u, uv, mip)` échantillonne **la texture propre du maillage** (voir le tableau ci-dessus) ; tout id non nul renvoie du blanc — aucun atlas n'est en portée
- Les champs de l'en-tête fonctionnent toujours comme documentés : `uv` couvre la texture du modèle de 0 à 1, `mipLevel` est le mip de la face
- **`bloxdTextureSize()`** rapporte la taille de *la texture que le pipeline échantillonne* : l'atlas sur les pipelines atlas, la texture propre du modèle sur les pipelines à texture propre

Les effets qui n'ont de sens que sur les faces d'atlas devraient être protégés par une garde :

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        // uniquement les faces dont la texture vit dans l'atlas de blocs (modèles de blocs)
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

- **Skins contre atlas** : l'atlas associe des *noms* de textures à des couches et se compare via `bloxdTextureId*`. Les textures possédées par le modèle (skins) ne sont pas dans cet espace de noms et arrivent avec l'id 0. `surface.colour` contient déjà skin × tint, donc partez de celui-ci

## bloxdTextureId* : constantes de noms de textures

Chaque nom de texture utilisable devient une `const` comparable. **L'orthographe est le nom de fichier passé en CamelCase** :

| Fichier de texture | Constante | Note |
|---|---|---|
| `grass_top.png` | `bloxdTextureIdGrassTop` | l'exemple du moteur lui-même |
| `lava0.png` (images `lava0`–`lava7`) | `bloxdTextureIdLava` | famille d'animation : les suffixes d'image tombent du nom canonique |
| `black_portal0.png` (images 0–3) | `bloxdTextureIdBlackPortal` | même règle |
| `radar_screen0` (copies tournées `[rot[1`–`[rot[4`) | `bloxdTextureIdRadarScreen0` | famille de rotation : se replie sur le nom racine |

### Règles d'orthographe et liberté de nommage

- **Règle de génération** (restaurée depuis le validateur) : découpez le nom sur les suites de caractères non alphanumériques, mettez une majuscule à chaque partie, concaténez après le préfixe `bloxdTextureId`
- **La casse et les underscores ne sont pas distingués** : la correspondance inverse (le nom qu'un pack a écrit → nom du registre) replie à la fois votre orthographe et celle du moteur, donc p. ex. `bloxdTextureIdGrassTop` et `bloxdTextureId_grass_top` se résolvent en **la même constante**
- **Les textures animées ne prennent pas de numéro d'image** : `lava` est le nom ; `lava0` est une erreur dédiée
- **Les familles de rotation utilisent le nom racine** : écrire l'orthographe d'une copie tournée produit un message dédié

### Erreurs de résolution de noms (verbatim depuis le validateur)

> **Préfixe mal orthographié / casse :** `bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?`
>
> **Image d'animation :** `...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates.`
>
> **Copie tournée :** `...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, which bloxdTexel turns as each face shows it.`
>
> **Ambigu après repli :** `...could name X and Y, which differ only by case or underscores, so it can't be used.`
>
> **Introuvable (avec suggestion) :** `There's no texture called X. Did you mean bloxdTextureIdY?` — le seuil de suggestion est la distance de Levenshtein `max(2, floor(len/4)) + 1`
>
> **Introuvable (sans suggestion) :** `There's no texture called X. Texture names are the file names texture packs use, as in bloxdTextureIdGrassTop for grass_top.png; BLOCK_TEXTURES.md lists them.`

> `BLOCK_TEXTURES.md` dans ce message est la liste interne de noms de textures du jeu lui-même, référencée par le validateur du moteur — ce n'est pas une page de ce site. L'équivalent ici est le [Catalogue des textures](texture-catalog.md).

### Seules les constantes référencées sont émises

Le bloc `bloxdTextureId*` de l'en-tête est généré **par pack** à partir des noms qu'il référence réellement — un pack qui utilise 3 constantes obtient 3 lignes `const`, pas ~900.

## Champs d'entrée

Les quatre champs de texture sur `BloxdSurfaceIn` / `BloxdLightIn` :

| Champ | Type | Description |
|---|---|---|
| `textureId` | `u32` | la texture de cette face ; comparer avec `bloxdTextureId*` ; 0 = aucune |
| `textureRotation` | `u32` | quarts de tour horaires (0–3), appliqués par `bloxdTexel` |
| `uv` | `vec2f` | la texture couvre 0–1 ; `fract(uv)` est dessiné |
| `mipLevel` | `f32` | niveau de mip : 0 = pleine taille, 1 = moitié… |

## La subtilité de rotation — un échantillonneur neutre

`bloxdTexel` applique une contre-rotation à l'uv que vous passez selon le `textureRotation` **du fragment courant** — quel que soit l'id passé. Deux cas courants :

- **Ré-échantillonner la texture propre de cette face** avec `surface.uv` — l'uv est dans le repère tourné de la face et la contre-rotation ramène en espace atlas ; l'usage principal prévu
- **Échantillonner une autre texture** avec un uv en espace atlas pendant que la face est tournée — la contre-rotation se déclenche quand même et l'échantillon atterrit tourné. C'est le piège

Le moteur ne peut pas consulter la rotation par texture (la rotation est une donnée géométrique de la face) et utilise toujours la valeur du fragment. Pour échantillonner une autre texture de façon neutre en rotation, pré-tournez l'uv du même quart de tour pour l'annuler :

```wgsl
// Échantillonnage de texel neutre en rotation : pré-tournez l'uv pour que la contre-rotation
// de bloxdTexel (par le textureRotation de cette face) s'annule. Passez surface.textureRotation en r.
fn texelNeutral(id: u32, uv: vec2f, mip: f32, r: u32) -> vec4f {
    var turned = uv;
    if (r == 1u) {
        turned = vec2f(1.0 - uv.y, uv.x);
    } else if (r == 2u) {
        turned = vec2f(1.0 - uv.x, 1.0 - uv.y);
    } else if (r == 3u) {
        turned = vec2f(uv.y, 1.0 - uv.x);
    }
    return bloxdTexel(id, turned, mip);
}
```

(`textureRotation == 0` n'a besoin d'aucune correction. La plupart des faces portent 0, mais les packs distribués ne doivent pas le présumer.)

## Exemples concrets

### Émission depuis la luminance du texel

Échantillonnez un mip au-dessus de celui de la face pour une moyenne douce à l'échelle des blocs, robuste à la distance :

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let avg = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + 1.0);
    let lum = dot(avg.rgb, vec3f(0.2126, 0.7152, 0.0722));
    if (surface.flags.emissive) {
        out.emission += avg.rgb * lum * 0.5;
    }
    return out;
}
```

### Effets propres à une texture

Comparez `textureId` pour isoler des textures choisies (la voie officielle pour p. ex. faire scintiller des minerais) :

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.textureId == bloxdTextureIdDiamondOre) {
        let p = bloxdWorldPosition(light.position);
        let s = sin(bloxdSeconds() * 3.0 + p.x * 2.7 + p.y * 1.3 + p.z * 4.1);
        out.colour += vec3f(0.35, 0.45, 0.55) * max(0.0, s);
    }
    return out;
}
```

### Flou de distance façon profondeur de champ

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let d = distance(surface.position, bloxdEyePosition());
    if (d > 40.0 && surface.textureId != 0u) {
        let own = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel);
        if (any(abs(own.rgb - vec3f(0.0)) > vec3f(1e-6))) {          // garde de division
            let blur = clamp((d - 40.0) / 60.0, 0.0, 3.0);
            let t = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + blur);
            out.colour = t.rgb / own.rgb * out.colour;
        }
    }
    return out;
}
```

(L'astuce du ratio préserve le `colour = texture × tint × AO` du moteur : diviser le texel filtré par le texel natif annule le contenu de la texture, ne laissant que le facteur de flou à remultiplier dans `surface.colour`. Les lectures blanches — faces sans texture — font que la garde saute l'effet.)

## Là où l'API de textures ne peut pas aller

- **Pas appelable depuis les hooks de sommet** — les diagnostics « reaches » la rejettent
- **Vous ne pouvez pas ajouter de textures** — l'atlas est celui du moteur ; l'API ne fait que le lire. Les textures personnalisées restent le travail du système de packs de textures
- **Les configurations de rendu hors atlas se dégradent en stubs** — `bloxdTextureSize() -> vec2u(1u)` et `bloxdTexel(...) -> vec4f(1.0)`, avec les quatre entrées qui circulent à `0u, 0u, vec2f(0.0), 0.0`. Le code écrit pour le vrai atlas se compile et s'exécute encore — il ne voit simplement que des texels blancs et une taille 1×1. Le code qui tolère `textureId == 0` tolère ceci aussi

## Voir aussi

- **Les 896 noms utilisables** → [Catalogue des textures](texture-catalog.md)
- [Intérieurs du moteur : registre des textures](../internals/texture-registry.md) · [Échantillonnage des textures](../internals/texture-sampling.md)

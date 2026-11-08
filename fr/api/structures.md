# Structures d'entrée et de sortie

> API cible : 5 · Build cible : `v98qt8` · État : Analyzed (restauré mot à mot depuis l'en-tête en production)

Sept structures sont accessibles aux packs en lecture/écriture. Chaque champ est listé ci-dessous (les champs `#ifdef` sont conditionnels). L'en-tête complet est dans [Internals du moteur](../internals/engine-header.md).

## BloxdVertexIn (entrée du hook de sommet)

```wgsl
struct BloxdVertexIn {
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
}
```

| Champ | Type | Description |
|---|---|---|
| `position` | `vec3f` | position dans l'espace de rendu (espace monde via `bloxdWorldPosition()`) |
| `normal` | `vec3f` | vecteur unitaire orienté vers l'extérieur de la face |
| `localPosition` | `vec3f` | coordonnées locales au modèle ; **`vec3f(0.0)` pour le terrain et le liquide** ; pour le bras d'un joueur, une épée tenue ou les pales d'un moulin, la valeur tourne avec le modèle |
| `flags` | `BloxdFlags` | type de la face ([Flags](flags.md)) |

## BloxdVertex (sortie du hook de sommet)

```wgsl
struct BloxdVertex {
    position: vec3f,      // The render position output.
}
```

## BloxdSurfaceIn (entrée du hook de surface)

```wgsl
struct BloxdSurfaceIn {
    colour: vec3f,        // RGB colour = texture * tint * ambient occlusion.
    alpha: f32,           // Opacity.

    // Enchanted items and armour only, all 0 for anything else.
    enchantTier: u32,     // 1-5 for Tier 1-5.
    enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
    enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.

    // Players and mobs only, 0 for anything else: RGB overlay colour, e.g. the
    // red flash when hurt, and its alpha. bloxdLitColour mixes it into colour.
    overlayColour: vec4f,

    // These mean the same as in BloxdVertexIn, after the vertex hook.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.

    // These are all 0 if the face has no texture. Most models use textureId 0.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

| Champ | Type | Description |
|---|---|---|
| `colour` | `vec3f` | RGB = texture × teinte × AO, cuit par le mailleur |
| `alpha` | `f32` | opacité |
| `enchantTier` | `u32` | palier d'enchantement 1–5 ; 0 pour tout ce qui n'est pas enchanté |
| `enchantColour` | `vec4f` | RGB d'enchantement plus un alpha **animé** (`.a`) — lire `.a` à chaque fragment donne gratuitement un motif en mouvement ; tout à zéro sur les faces non enchantées |
| `enchantSpeed` | `f32` | vitesse du motif d'enchantement («faster at higher tiers») |
| `overlayColour` | `vec4f` | superposition d'entité (flash de dégâts etc.) RGB + alpha ; 0 hors joueurs/mobs ; mélangée par `bloxdLitColour` avant l'éclairage |
| `position` / `normal` / `localPosition` / `flags` | — | mêmes significations que dans `BloxdVertexIn`, **après le hook de sommet** (les valeurs suivent les sommets déplacés) |
| `textureId` | `u32` | la texture de cette face ; à comparer avec `bloxdTextureId*` ; **0 quand la face n'a pas de texture** — la plupart des modèles utilisent textureId 0 (textures propres au modèle, skins de joueurs) |
| `textureRotation` | `u32` | quarts de tour horaires (0–3), appliqués par `bloxdTexel` |
| `uv` | `vec2f` | la texture couvre 0–1 ; `fract(uv)` est dessiné (les pas entiers répètent la texture) |
| `mipLevel` | `f32` | niveau de mipmap : 0 = taille maximale, 1 = moitié… |

## BloxdSurface (sortie du hook de surface)

```wgsl
struct BloxdSurface {
    colour: vec3f,        // RGB colour output.
#ifdef BLOXD_ALPHA
    alpha: f32,           // Opacity output.
#endif
    emission: vec3f,      // Emissive RGB, added after lighting, before fog.
    enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
    overlayColour: vec4f, // Overlay output, mixed in by bloxdLitColour.
}
```

| Champ | Type | Condition | Description |
|---|---|---|---|
| `colour` | `vec3f` | toujours | sortie RGB |
| `alpha` | `f32` | `#ifdef BLOXD_ALPHA` (tout liquid + terrain/model non strict) | sortie d'opacité |
| `emission` | `vec3f` | toujours | RGB émissif — **ajouté après l'éclairage, avant le brouillard** |
| `enchantColour` | `vec4f` | toujours | sortie d'enchantement, mélangée par `bloxdLitColour` |
| `overlayColour` | `vec4f` | toujours | sortie de superposition, mélangée par `bloxdLitColour` |

`bloxdDefaultSurface` transmet `enchantColour` / `overlayColour` inchangés, donc le rendu par défaut correspond au comportement interne du moteur de la v4. Mettez `out.enchantColour` à zéro pour retirer le scintillement d'enchantement sous un éclairage personnalisé ; amplifiez `out.overlayColour.a` pour accentuer le flash de dégâts.

## BloxdLightIn (entrée du hook de lumière)

```wgsl
struct BloxdLightIn {
    litColour: vec3f,  // Lit and enchanted RGB colour, before emission and fog.
    directional: f32,  // Summed Lambert from directional lights; 0 if none.
    diffuse: vec3f,    // The material's RGB response to directional light.
    emissive: vec3f,   // The material's RGB glow, added to directional light.
    ambient: vec3f,    // RGB ambient colour, added to directional light.
    blockLight: vec3f, // RGB block light; 0 when !bloxdLit().
    skyLight: f32,     // Sky light; 1 when !bloxdLit().
    ambientLightColour: vec3f, // Minimum RGB light; 1 when !bloxdLit().
    skyLightColour: vec3f, // RGB colour of skyLight; 1 when !bloxdLit().
    heldLight: vec3f,  // RGB held light; 0 when !bloxdLit() or no light held.
    fogColour: vec3f,  // The game's RGB fog colour; 0 when the game has no fog.
    fogAlpha: f32,     // 0 = no fog, 1 = only fogColour.

    // These are the same as in BloxdSurfaceIn.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

Signification champ par champ et rôle dans les calculs d'éclairage : voir [Éclairage](lighting.md).

**Par rapport aux anciennes versions de l'API** : `fogVisibility` (v2–v4) devient `fogAlpha` au sens inversé (0 = pas de brouillard) ; `engineColour` devient `litColour` ; la formulation des niveaux de lumière est «0 when !bloxdLit()». L'intégralité des changements de champs version par version : [Historique des versions](../history/).

## BloxdLight (sortie du hook de lumière)

```wgsl
struct BloxdLight {
    colour: vec3f, // RGB colour output.
}
```

## BloxdOpaqueBehind (retour de fonction spéciale)

```wgsl
struct BloxdOpaqueBehind {
    hit: bool,       // False where nothing opaque is behind (sky).
    position: vec3f, // The render position; 0 when !hit.
    distance: f32,   // From the camera; 0 when !hit.
}
```

Valeur de retour de `bloxdOpaqueBehind()`. À utiliser dans les variantes liquid derrière une garde `#ifdef BLOXD_SCENE_DEPTH` (le champ était `found: bool` en v2).

## Champs conditionnels ↔ macros

| Champ | Existe quand | Remarque |
|---|---|---|
| `BloxdSurface.alpha` | `#ifdef BLOXD_ALPHA` | toutes les variantes liquid + terrain/model non strict |
| appel à `bloxdOpaqueBehind()` | `#ifdef BLOXD_SCENE_DEPTH` | toutes les variantes liquid |

`BLOXD_STRICT` contrôle **l'existence des hooks** (hooks de sommet), pas la forme des structures. Voir [Préprocesseur](preprocessor.md).

## Conventions d'écriture (rappel)

- Ne construisez jamais les structures de sortie directement — partez de `bloxdDefault*` ; dans les hooks de lumière, `var out = s;` fonctionne aussi
- Un `var x: BloxdSurface;` isolé est une erreur de validation
- Les paramètres des hooks sont en lecture seule — copiez avant de modifier

## Voir aussi

- [Éclairage](lighting.md) · [Flags](flags.md) · [API de textures](texture-api.md)

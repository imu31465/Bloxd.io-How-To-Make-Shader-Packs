# Hooks de shader

> API cible : 5 · Build cible : `xkg8x` (vérifié en production le 2026-11-04) · État : Verified

Un pack peut se brancher sur **9 hooks** : 3 cibles de rendu (Terrain / Liquid / Model) × 3 étapes de pipeline (Vertex / Surface / Light). Tous sont optionnels — un hook non défini retombe sur le comportement par défaut du moteur.

## Les hooks

| Hook | Étape | Ce qu'il fait |
|---|---|---|
| `bloxdTerrainVertex` | terrain · vertex | Animation de sommets du terrain. **Ne peut pas tourner dans les jeux stricts** |
| `bloxdTerrainSurface` | terrain · surface | Couleur, alpha, émission, enchantement, superposition du terrain |
| `bloxdTerrainLight` | terrain · light | Couleur finale du terrain — la dernière étape du fragment |
| `bloxdLiquidVertex` | liquid · vertex | Animation de sommets de l'eau. **exige une garde contre les jeux stricts** |
| `bloxdLiquidSurface` | liquid · surface | Couleur, alpha, émission de l'eau |
| `bloxdLiquidLight` | liquid · light | Couleur finale de l'eau |
| `bloxdModelVertex` | model · vertex | Animation de sommets des modèles de blocs / objets / entités. **exige une garde contre les jeux stricts** |
| `bloxdModelSurface` | model · surface | Couleur, alpha, émission, enchantement, superposition des modèles |
| `bloxdModelLight` | model · light | Couleur finale des modèles |

Signatures (les types doivent correspondre exactement ; les noms de paramètres sont libres) :

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex;
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight;
// bloxdLiquid* / bloxdModel* prennent les mêmes types
```

## Répartition des cibles de rendu

- **Terrain** — tous les blocs sauf l'eau et les modèles de blocs
- **Liquid** — l'eau
- **Model** — modèles de blocs (dalles, escaliers, plantes en plans croisés), objets tenus/lâchés/lancés, joueurs, mobs, PNJ, armures, cosmétiques

**Important** : si un pack ne définit aucun hook Liquid, **aucun hook Terrain ne tourne non plus sur l'eau** (l'eau est gérée par les seuls hooks Liquid). Cela diffère du comportement d'avant la v4, où le liquide retombait sur les hooks de terrain.

## Comportements de repli et partage de code

- Un hook non défini signifie que cette étape utilise le comportement par défaut du moteur (même comportement que `bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight`)
- **Pour partager du code entre hooks**, définissez une fonction à portée de module et appelez-la depuis les deux :

```wgsl
fn applyWarmth(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.04, 1.0, 0.96);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyWarmth(surface);
}
```

## Le pack par défaut (gabarit officiel à 9 hooks)

Le gabarit de départ inclut désormais les hooks de lumière. 1 683 octets tel que livré, mot à mot :

```wgsl
// Every hook here returns its engine default. Modify the return values to start
// building a shader pack. If you delete a hook, the default is used instead.

// All blocks but water and block models use terrain hooks.
#ifndef BLOXD_STRICT
// Strict games keep terrain where it is. Without the #ifndef, this hook would
// turn the whole shader pack off there.
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

// Water uses liquid hooks. To share code with another hook, define a function
// and call it from both places.
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

// Models: block models such as slabs and plants, items, players and mobs.
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

Les commentaires du gabarit constituent les orientations de conception : modifiez les valeurs de retour pour commencer à construire ; supprimer un hook restaure le comportement par défaut ; les jeux stricts gardent le terrain en place ; partagez le code au moyen de fonctions.

## Conventions d'écriture

- **Ne construisez jamais les structures de sortie directement** (`BloxdSurface(...)` échoue à la validation). Partez toujours de `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` et modifiez les champs. Le premier argument du hook de lumière étant déjà du type de sortie, `var out = s;` fonctionne aussi
- Un `var x: BloxdSurface;` nu (simple annotation de type) est également une erreur de validation
- Les paramètres des hooks sont **en lecture seule**. Copiez d'abord (`var sv = s;`)
- Vous ne pouvez pas utiliser d'identifiants commençant par `bloxd` (insensible à la casse), à l'exception des 9 noms de fonctions de hook
- Écrivez les constantes avec `const` (`#define` ne prend pas de valeur)

Pour chaque champ que chaque hook peut lire et écrire, voir [Structures](../api/structures.md).

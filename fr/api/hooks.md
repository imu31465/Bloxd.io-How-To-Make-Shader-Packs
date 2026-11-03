# Hooks de shader

> API cible : 5 · Build cible : `ab90qa` · État : Verified

Les packs peuvent définir **9 hooks** — 3 cibles de rendu (programmes) × 3 étapes de pipeline, tous optionnels (non défini = défaut du moteur).

## Comparatif des 9 hooks

| Hook | Programme | Étape | Arguments | Retour | Condition d'exécution |
|---|---|---|---|---|---|
| `bloxdTerrainVertex` | Terrain | vertex | `BloxdVertexIn` | `BloxdVertex` | variantes allow uniquement (**le définir en strict est en soi une erreur**) |
| `bloxdTerrainSurface` | Terrain | surface | `BloxdSurfaceIn` | `BloxdSurface` | toujours |
| `bloxdTerrainLight` | Terrain | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | toujours |
| `bloxdLiquidVertex` | Liquid | vertex | `BloxdVertexIn` | `BloxdVertex` | allow uniquement |
| `bloxdLiquidSurface` | Liquid | surface | `BloxdSurfaceIn` | `BloxdSurface` | toujours |
| `bloxdLiquidLight` | Liquid | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | toujours |
| `bloxdModelVertex` | Model | vertex | `BloxdVertexIn` | `BloxdVertex` | allow uniquement |
| `bloxdModelSurface` | Model | surface | `BloxdSurfaceIn` | `BloxdSurface` | toujours |
| `bloxdModelLight` | Model | light | `BloxdSurface`, `BloxdLightIn` | `BloxdLight` | toujours |

## Ce que dessine chaque programme

| Programme | Dessine | L'eau quand aucun hook Liquid n'existe |
|---|---|---|
| **Terrain** | tous les blocs sauf l'eau et les modèles de blocs | — |
| **Liquid** | l'eau | **aucun hook Terrain ne s'exécute non plus sur l'eau** (l'eau garde son apparence par défaut) |
| **Model** | modèles de blocs (dalles, escaliers, plantes, cultures, toiles d'araignée), objets tenus/lâchés/lancés, joueurs, mobs, PNJ, armures, cosmétiques | — |

## Rôles des étapes

- **Vertex** — déplace les positions des sommets (balancement de l'herbe, vagues). L'animation de sommets désactive tout le pack dans les jeux stricts, donc `#ifndef BLOXD_STRICT` est obligatoire
- **Surface** — la sortie matériau : `colour` / `alpha` (conditionnel) / `emission` / `enchantColour` / `overlayColour`
- **Light** — la couleur finale ; prend la sortie de surface plus `BloxdLightIn`. Sa valeur de retour est la couleur affichée à l'écran

## Signatures

```wgsl
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
// bloxdLiquid* / bloxdModel* prennent les mêmes types d'arguments et de retour
```

## Restrictions d'appel des fonctions spéciales

Le validateur du moteur restreint les hooks autorisés à atteindre certaines fonctions (les violations échouent avec des diagnostics « reaches » dédiés) :

| Fonction | Appelable depuis | Garde |
|---|---|---|
| `bloxdTexel` | hooks surface / light uniquement | — |
| `bloxdTextureSize` | hooks surface / light uniquement | — |
| `bloxdOpaqueBehind` | hooks surface / light (pertinent dans les variantes liquid) | `#ifdef BLOXD_SCENE_DEPTH` |

> `bloxdFragmentBlockPosition` ne figure plus dans l'en-tête documenté, mais le moteur l'injecte et l'accepte toujours — voir [Fonctions : bloxdFragmentBlockPosition](functions.md#bloxdfragmentblockposition--non-documentée-mais-toujours-injectée). C'était l'unique fonction spéciale appelable depuis les hooks de sommet ; pour du nouveau code, préférez `flags` pour « quel est ce bloc ».

## Replis et partage

- Hook non défini → cette étape se comporte comme le défaut du moteur (`bloxdDefaultVertex` / `bloxdDefaultSurface` / `bloxdDefaultLight`)
- **Partagez du traitement entre hooks** avec une fonction à portée module appelée depuis les deux :

```wgsl
fn sharedSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return sharedSurface(surface);
}
```

## Voir aussi

- Gabarit officiel à 9 hooks → [Prise en main : hooks de shader](../getting-started/hooks.md)
- Chaque champ de chaque structure → [Structures](structures.md)
- Internals de l'invocation des hooks → [Internals du moteur](../internals/hook-invocation.md)

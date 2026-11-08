# Flags (BloxdFlags)

> API cible : 5 · Build cible : `v98qt8` · État : Analyzed (restauré mot à mot depuis l'en-tête en production)

v5 identifie les faces à l'aide d'une structure de booléens nommés. Le masque de bits `blockFlags: u32` de v4 et ses 6 constantes `bloxdBlockFlag*` ont disparu.

## Définition (verbatim de l'en-tête)

```wgsl
// What kind of block, item or lifeform a face is. Any number of flags may be
// set, possibly even none. For example, sandstone is sand and rock.
struct BloxdFlags {
    opaque: bool,     // Opaque blocks, i.e. full cubes with no gaps or holes.
    emissive: bool,   // Blocks that emit light, e.g. lava and glowing ores.
    vegetation: bool, // Leaves, grass blocks and leafy plants, e.g. tall grass.
    dirt: bool,       // Soil, grass blocks included. Rocky Dirt is rock too.
    sand: bool,       // Sand, Red Sand and every sandstone, which is rock too.
    rock: bool,       // Stone variants, and more, e.g. gravel, ores and magma.

    // Drawn as block models, so never part of terrain or flagged as opaque.
    slab: bool,       // Half blocks.
    stairs: bool,     // Stairs and corner stairs.
    flat: bool,       // Planes, e.g. tall grass, flowers, crops and cobwebs.

    placed: bool,     // Blocks placed as part of chunks. Not items or vehicles.
    held: bool,       // Items in a hand, in first or third person.
    dropped: bool,    // Dropped items, on the ground, on a belt or in a pipe.
    thrown: bool,     // Items in flight, e.g. snowballs, arrows and rockets.

    lifeform: bool,   // Players, mobs and NPCs. Includes armour and cosmetics.
}
```

## Référence des champs

| Champ | Classe | Signification | Objets typiques | Hooks |
|---|---|---|---|---|
| `opaque` | matériau | cube plein sans interstices ni trous | pierre, terre, bois plein | les 9 |
| `emissive` | matériau | blocs qui émettent de la lumière | lave, minerais lumineux | les 9 |
| `vegetation` | matériau | feuilles, blocs d'herbe, plantes feuillues | feuilles, hautes herbes | les 9 |
| `dirt` | matériau | sol (blocs d'herbe inclus) | terre, bloc d'herbe, Rocky Dirt (également rock) | les 9 |
| `sand` | matériau | famille du sable et du grès | sable, sable rouge, tous les grès (également rock) | les 9 |
| `rock` | matériau | famille de la pierre (+ gravier, minerais, magma) | variantes de pierre, gravier, minerais | les 9 |
| `slab` | forme | demi-blocs | dalles | hooks Model |
| `stairs` | forme | escaliers et escaliers d'angle | escaliers | hooks Model |
| `flat` | forme | plans (y compris les plans croisés) | hautes herbes, fleurs, cultures, toiles d'araignée | hooks Model |
| `placed` | placement | géométrie posée dans les chunks | blocs du monde | hooks Model (pas les objets/véhicules) |
| `held` | placement | objets tenus en main (1re/3e personne) | objets tenus, armures | hooks Model |
| `dropped` | placement | objets au sol / sur tapis / dans un tuyau | objets lâchés | hooks Model |
| `thrown` | placement | objets en vol | boules de neige, flèches, fusées | hooks Model |
| `lifeform` | cible | joueurs, mobs, PNJ (armures et cosmétiques inclus) | entités | hooks Model |

## Les flags se combinent librement

**Les flags ne sont pas une énumération à choix unique.** N'importe quel nombre d'entre eux peut être vrai à la fois — éventuellement aucun (l'en-tête lui-même dit *« Any number of flags may be set, possibly even none »*).

Exemples donnés par l'en-tête lui-même :

- **le grès est à la fois `sand` et `rock`**
- **Rocky Dirt est à la fois `dirt` et `rock`**
- Une dalle peut être `slab` et (selon le matériau) `rock` en même temps

Lire la branche `else` d'un flag comme « tout le reste » est un bug. Les flags de matériau (`opaque`/`emissive`/…) se combinent **indépendamment** des flags de forme/état (`slab`/`held`/…).

## Utilisation

`flags` est un champ du même nom sur les trois structures d'entrée (`BloxdVertexIn`, `BloxdSurfaceIn`, `BloxdLightIn`) :

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.vegetation) {
        out.colour *= vec3f(1.0, 1.08, 0.9);
    }
    if (surface.flags.emissive) {
        out.emission += vec3f(0.05);
    }
    return out;
}
```

Dans le pipeline model, les flags répondent à « que suis-je en train de regarder » :

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;   // rehausse les entités du monde, exclut la main
    }
    if (surface.flags.held) {
        out.colour *= 1.15;   // éclaircit les objets tenus par le joueur local
    }
    return out;
}
```

## Migration depuis v4 (mécanique)

| v4 | v5 |
|---|---|
| `(surface.blockFlags & bloxdBlockFlagOpaque) != 0u` | `surface.flags.opaque` |
| `(surface.blockFlags & bloxdBlockFlagEmissive) != 0u` | `surface.flags.emissive` |
| `(surface.blockFlags & bloxdBlockFlagVegetation) != 0u` | `surface.flags.vegetation` |
| `(surface.blockFlags & bloxdBlockFlagDirt) != 0u` | `surface.flags.dirt` |
| `(surface.blockFlags & bloxdBlockFlagSand) != 0u` | `surface.flags.sand` |
| `(surface.blockFlags & bloxdBlockFlagRock) != 0u` | `surface.flags.rock` |

Les références restantes aux constantes `bloxdBlockFlag*` échouent sur le diagnostic de nom réservé de l'analyseur (les constantes sont supprimées).

## Cas limites (exhaustif, tiré de l'en-tête)

- «Rocky Dirt is rock too»
- «every sandstone, which is rock too»
- «Drawn as block models, so never part of terrain or flagged as opaque» — les faces `slab`/`stairs`/`flat` n'entrent jamais dans le programme Terrain et ne définissent jamais `opaque`
- «Includes armour and cosmetics» — `lifeform` couvre aussi l'équipement des joueurs
- «Not items or vehicles» — `placed` exclut les véhicules

## Voir aussi

- Migration v4 complète → [Historique des versions : v5](../history/v5.md)
- Internals de la transmission des flags → [Internals du moteur](../internals/rendering-pipeline.md)

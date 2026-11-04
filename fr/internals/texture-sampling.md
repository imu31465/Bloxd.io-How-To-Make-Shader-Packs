# Intérieurs de l'échantillonnage des textures

> API cible : 5 · Build cible : `xkg8x` · État : Analyzed (restauré depuis le générateur en production, c56)

Comment `bloxdTexel` / `bloxdTextureSize` se compilent réellement — le codegen de textures à 3 variantes. Le côté utilisateur : [API de textures](../api/texture-api.md).

## Les trois variantes

### Variante 1 — texture pack inactif (stubs)

```wgsl
fn bloxdTextureSize(bloxdSpMipLevel: f32) -> vec2u {
        return vec2u(1u);
}
fn bloxdTexel(bloxdSpTextureId: u32, bloxdSpUv: vec2f, bloxdSpMipLevel: f32) -> vec4f {
        return vec4f(1.0);
}
```

Le code écrit pour le vrai atlas se compile et s'exécute toujours ici — il voit simplement des texels blancs et une taille de 1×1.

### Variante 2 — le chemin atlas (le défaut du jeu)

`bloxdTextureSize` renvoie `textureDimensions(textureAtlas0, u32(clamp(round(bloxdSpMipLevel), 0.0, f32(textureNumLevels(textureAtlas0) - 1u))))`. `bloxdTexel` applique le quart de tour de la face avant le chargement — le piège de rotation, écrit sous forme de la chaîne de if `bloxdSpTurned` générée :

```wgsl
        // Each quarter turn clockwise the face shows its texture at reads the unturned texture at (v, 1 - u)
        var bloxdSpTurned = bloxdSpUv;
        if (bloxdSpTextureRotation == 1u) {
                bloxdSpTurned = vec2f(bloxdSpUv.y, 1.0 - bloxdSpUv.x);
        } else if (bloxdSpTextureRotation == 2u) {
                bloxdSpTurned = 1.0 - bloxdSpUv;
        } else if (bloxdSpTextureRotation == 3u) {
                bloxdSpTurned = vec2f(1.0 - bloxdSpUv.y, bloxdSpUv.x);
        }
```

(`bloxdSpTextureRotation` est le propre stockage, par le moteur, du champ d'entrée `textureRotation`.)

### Variante 3 — textures de texture pack personnalisé

`textureLoad(<atlas>, min(bloxdSpCellAt * bloxdSpSize + bloxdSpAt, <dims> - 1u), bloxdSpLevel)` échantillonne la cellule propre à chaque texture de l'atlas en couches ; les texels propres du pack passent par le chemin `bloxdSpOwnTexel`.

## L'échelle d'images d'animation

Les textures animées (42 familles) avancent à intervalles fixes par famille (200 / 250 / 300 ms — la colonne intervalle du [catalogue de textures](../api/texture-catalog.md#familles-danimation-42-noms)). Passer un id de famille d'animation à `bloxdTexel` échantillonne l'image courante.

## Réglages du sampler

Les textures de blocs sont une `texture_2d_array` ; le sampler du terrain est nearest + repeat.

## Greedy meshing et UV

Le mesher fusionne les faces au matériau/AO/lumière identiques en rectangles uniques (**greedy meshing**), si bien que les UV de vertex peuvent dépasser la largeur d'une tuile sur les faces fusionnées (bords rentrés de 0.0015). L'adressage repeat matériel gère le carrelage, donc les faces fusionnées paraissent sans couture — mais un détail procédural indexé sur `uv` peut être discontinu aux frontières de fusion ; indexez plutôt les effets dépendant du monde sur `bloxdWorldPosition(position)`.

## Voir aussi

- [API de textures](../api/texture-api.md) · [Registre des textures](texture-registry.md) · [Pipeline de rendu](rendering-pipeline.md)

# Shaders de modèle

> API cible : 5 · Build cible : `v98qt8` (vérifié en production le 2026-11-08) · État : Analyzed (rédigé à partir de la spécification d'en-tête v5)

Recettes utilisant les hooks Model de v5 et les nouveaux flags pour des sélections **« qu'est-ce que je suis en train de regarder », impossibles avant v5**. Les bases : [Modèles et textures](../guides/models.md).

## Lueur de l'objet tenu

Ce que les auteurs de shaders à la première personne voulaient depuis v1, en deux lignes :

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## Séparer le monde de la main

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;
    }
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## Pointes de lame lumineuses (localPosition)

`localPosition` tourne avec le modèle — « où suis-je sur le modèle » sans devinette en espace monde :

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        let tipness = clamp(surface.localPosition.y * 0.5 + 0.5, 0.0, 1.0);
        out.emission += vec3f(0.3, 0.4, 0.6) * tipness * tipness * 0.6;
    }
    return out;
}
```

Note : les plages réelles de `localPosition` varient selon le modèle — vérifiez sur appareil et `clamp` défensivement.

## Mettre en valeur les objets lâchés

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.dropped) {
        let pulse = 0.5 + 0.5 * sin(bloxdSeconds() * 2.0
            + surface.localPosition.x * 3.0);
        out.emission += vec3f(0.08, 0.10, 0.06) * pulse;
    }
    return out;
}
```

## Bord froid sur les skins de joueurs (lifeform)

La plupart des modèles utilisent `textureId: 0` (skins) ; `surface.colour` contient déjà skin × teinte :

```wgsl
fn bloxdModelLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.flags.lifeform) {
        let viewDir = normalize(bloxdEyePosition() - light.position);
        let rim = pow(1.0 - clamp(dot(viewDir, normalize(light.normal)), 0.0, 1.0), 2.5);
        out.colour += vec3f(0.4, 0.5, 0.7) * rim * 0.25;
    }
    return out;
}
```

## Plantes qui se balancent au vent (allow seul)

Les plantes (`flags.flat`) sont dessinées comme des modèles — balancement via le hook de sommet :

```wgsl
#ifndef BLOXD_STRICT
fn bloxdModelVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(vertex);
    if (vertex.flags.flat) {
        let sway = sin(bloxdSeconds() * 1.8
            + bloxdWorldPosition(vertex.position).x * 0.7);
        let tipness = clamp(vertex.localPosition.y + 0.5, 0.0, 1.0);
        out.position.x += sway * 0.08 * tipness;
    }
    return out;
}
#endif
```

(La végétation est aussi `flags.vegetation` : `flat` = « dessiné comme un plan croisé », `vegetation` = « est une plante » — l'herbe et les fleurs sont les deux.)

## Faces de modèle à texture d'atlas uniquement

Les faces des modèles de blocs (dalles, escaliers…) portent des `textureId` d'atlas ; sélectionnez avec `textureId != 0u` :

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

Les faces `textureId: 0` (skins) échantillonnent en blanc — sans erreur ([textures propres au modèle](../api/texture-api.md#textures-possédées-par-le-modèle-textureid-0)).

## Armures contre le reste

`flags.lifeform` inclut armures et cosmétiques ([Flags](../api/flags.md)). Aucune entrée plus fine n'existe ; combinez `localPosition` (placement) ou la présence d'`overlayColour` comme approximations pratiques.

## Partage avec le terrain

Gradation uniforme entre blocs pleins et modèles de blocs :

```wgsl
fn applyGrade(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour *= vec3f(1.02, 1.0, 0.98);
    return out;
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}

fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return applyGrade(surface);
}
```

Le motif de fonction partagée est précisément ce que recommande le gabarit de pack par défaut lui-même ([hooks](../getting-started/hooks.md#comportements-de-repli-et-partage-de-code)).

## Voir aussi

- [Modèles et textures](../guides/models.md) · [Effets d'enchantement](enchant-effects.md) · [Flags](../api/flags.md) · [Structures](../api/structures.md)

# Modell-Shader

> Ziel-API: 5 · Ziel-Build: `v98qt8` (2026-11-08, Produktion und Preprod) · Status: Analyzed (gegen die v5-Header-Spezifikation geschrieben)

Rezepte mit den v5-Model-Hooks und neuen Flags für **„Worauf schaue ich gerade“-Auswahlen, die vor v5 unmöglich waren**. Grundlagen: [Modelle und Texturen](../guides/models.md).

## Glow auf gehaltenen Items

Was First-Person-Shader-Autoren seit v1 wollten, in zwei Zeilen:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.held) {
        out.colour *= 1.15;
    }
    return out;
}
```

## Die Welt von der Hand trennen

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

## Glühende Klingenspitzen (localPosition)

`localPosition` rotiert mit dem Modell — „wo am Modell bin ich“ ohne Welt-Raum-Rätselraten:

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

Hinweis: Die tatsächlichen `localPosition`-Bereiche variieren pro Modell — auf dem Gerät verifizieren und defensiv `clamp`en.

## Fallengelassene Items hervorheben

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

## Kühler Rim auf Spieler-Skins (lifeform)

Die meisten Modelle nutzen `textureId: 0` (Skins); `surface.colour` hat bereits Skin × Tint:

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

## Pflanzen im Wind wiegen lassen (nur allow)

Pflanzen (`flags.flat`) werden als Modelle gezeichnet — Wiegen über den Vertex-Hook:

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

(Vegetation ist zusätzlich `flags.vegetation`: `flat` = „als gekreuzte Ebene gezeichnet“, `vegetation` = „ist eine Pflanze“ — Gras und Blumen sind beides.)

## Nur atlas-texturierte Modell-Flächen

Block-Modell-Flächen (Stufen, Treppen…) tragen Atlas-`textureId`s; Auswahl per `textureId != 0u`:

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

`textureId: 0`-Flächen (Skins) sampeln weiß — kein Fehler ([modell-eigene Texturen](../api/texture-api.md#modell-eigene-texturen-textureid-0)).

## Rüstung gegen den Rest

`flags.lifeform` schließt Rüstung und Kosmetik ein ([Flags](../api/flags.md)). Eine feiner granulierte Eingabe existiert nicht; `localPosition` (Platzierung) oder das Vorhandensein von `overlayColour` als praktische Näherungen kombinieren.

## Mit Terrain teilen

Einheitliches Grading über volle Blöcke und Block-Modelle:

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

Das Muster der geteilten Funktion ist es, das die Standard-Pack-Vorlage selbst empfiehlt ([Hooks](../getting-started/hooks.md#fallbacks-und-code-sharing)).

## Verwandte Seiten

- [Modelle und Texturen](../guides/models.md) · [Enchant-Effekte](enchant-effects.md) · [Flags](../api/flags.md) · [Strukturen](../api/structures.md)

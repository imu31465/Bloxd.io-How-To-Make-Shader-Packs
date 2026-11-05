# Modelle und Texturen

> Ziel-API: 5 · Ziel-Build: `bny9u` (2026-11-05, Produktion) · Status: Analyzed (aus Header & Validator restauriert)

Was die neuen v5-Model-Hooks zeichnen und lesen.

## Was das Model-Programm zeichnet

- **Block-Modelle**: halbe Blöcke (`slab`), Treppen (`stairs`), Pflanzen aus gekreuzten Ebenen — hohes Gras, Blumen, Feldfrüchte, Spinnennetze (`flat`)
- **Items**: gehalten (`held`), fallengelassen (`dropped`), geworfen (`thrown` — Schneebälle, Pfeile, Raketen)
- **Entities**: Spieler, Mobs, NPCs (`lifeform`) — **einschließlich Rüstung und Kosmetik**

Terrain (volle Blöcke) und Liquid (Wasser) betreten dieses Programm nie.

## Was sich anders liest

Modell-Flächen tragen drei Dinge, die Terrain-Flächen nie haben:

| Information | Feld | Wert auf Terrain |
|---|---|---|
| modell-lokale Koordinaten | `localPosition: vec3f` | `vec3f(0.0)` (kein Modell) |
| Enchant-Zustand | `enchantTier` / `enchantColour` / `enchantSpeed` | alle 0 |
| Entity-Overlay | `overlayColour` | 0 |

Und **Texturen bedeuten etwas anderes**: Terrain-Flächen tragen Atlas-`textureId`s, aber **die meisten Modelle nutzen `textureId: 0`** („keine Textur“) — Spieler-Skins und Mob-Texturen liegen nicht im Atlas-Namensraum. `surface.colour` enthält bereits Skin × Tint, also davon ausgehend arbeiten ([modell-eigene Texturen](../api/texture-api.md#modell-eigene-texturen-textureid-0)).

`flags`' `held` / `dropped` / `thrown` / `lifeform` / `placed` sind nur auf Modell-Flächen bedeutungstragend ([Flags](../api/flags.md)).

## localPosition

Die modell-instanz-lokale Position **vor** der Welt-Platzierung; `vec3f(0.0)` für Terrain/Liquid.

- Für den Arm eines Spielers, ein gehaltenes Schwert oder Windmühlenflügel rotiert sie mit dem Modell
- **Per-Teil-keyed Animation und Biegeeffekte** werden zu einem Ein-Feld-Schreibvorgang — „wie weit oben an der Klinge bin ich“ ist direkt `localPosition.y`
- In den Light-Strukturen ist es der Wert **nach dem Vertex-Hook** (Header: *"the same as in BloxdVertexIn, after the vertex hook"*)

## Auswahl-Muster

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.flags.lifeform && !surface.flags.held) {
        out.colour *= 1.05;   // lift world entities, exclude the hand
    }
    if (surface.flags.held) {
        out.colour *= 1.15;   // brighten the local player's held items
    }
    return out;
}
```

Vollständige Beispiele: [Modell-Shader-Rezepte](../recipes/model-shaders.md) und [Enchant-Effekte](../recipes/enchant-effects.md).

## Terrain / Liquid / Model — Spickzettel

| Beeinflussen wollen | Hooks | Auswahl-Felder |
|---|---|---|
| Look voller Blöcke | `bloxdTerrain*` | Material-Flags (`opaque` / `rock`…) |
| Wasser | `bloxdLiquid*` | immer Liquid (keine Liquid-Hooks = Wasser unangetastet) |
| Pflanzen, Stufen, Treppen | `bloxdModel*` | `flags.flat` / `slab` / `stairs` |
| gehaltene Items | `bloxdModel*` | `flags.held` |
| fallengelassene Items | `bloxdModel*` | `flags.dropped` |
| geworfene Items | `bloxdModel*` | `flags.thrown` |
| Spieler & Mobs | `bloxdModel*` | `flags.lifeform` |

## Beleuchtung

`bloxdModelLight` nimmt dieselben `BloxdSurface` / `BloxdLightIn` und arbeitet mit `bloxdDefaultLight` / `bloxdLitColour()`. Der Enchant-Glint (`enchantColour`) und der Schadens-Blitz (`overlayColour`) mischen sich innerhalb von `bloxdLitColour`, daher **erhalten die Defaults beide Looks automatisch**; zum Steuern siehe [Enchant-Effekte](../recipes/enchant-effects.md).

## Interna

Wie Modelle rendern und wie Flags-/Enchant-Eingaben fließen: [Engine-Interna: Model-Rendering](../internals/model-rendering.md); generierte Symbole wie `bloxdSpItemLocalPosition` und `bloxdSpEnchant` stehen in [Einschränkungen](../api/restrictions.md).

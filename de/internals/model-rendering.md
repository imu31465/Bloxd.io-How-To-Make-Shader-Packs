# Model-Rendering-Interna

> Ziel-API: 5 · Ziel-Build: `xkg8x` · Status: Analyzed (aus dem Live-Bundle restauriert)

Die Interna des v5-Model-Programms. Der nutzerseitige Leitfaden: [Modelle und Texturen](../guides/models.md).

## Was das Model-Programm ist

Vor v5 konnten Pakete nur in Terrain / Liquid andocken; Block-Modelle (Stufen, Treppen, Pflanzen) und Entities (Spieler, Mobs, Items) lagen **außerhalb der Paket-Zuständigkeit**. v5 fügte Model als drittes Programm hinzu, es zeichnet:

- Blöcke, die als Block-Modelle gezeichnet werden (Header-Notiz: *"Drawn as block models, so never part of terrain or flagged as opaque"*)
- gehaltene / fallengelassene / geworfene Items
- Spieler, Mobs, NPCs (Rüstung und Kosmetik eingeschlossen)

## Flag- & Eingabe-Übergabe

- **`bloxdSpFlags`** — der Übergabeweg für die `BloxdFlags`-Struktur; die 8 neuen Felder (`slab` / `stairs` / `flat` / `placed` / `held` / `dropped` / `thrown` / `lifeform`) tragen Werte, die nur auf Modell-Flächen bedeutungstragend sind
- **`bloxdSpItemLocalPosition`** — Übergabe von `localPosition`; `vec3f(0.0)` auf Terrain/Liquid
- **`bloxdSpEnchant`** — Übergabe der Enchant-Eingaben (`enchantTier` / `enchantColour` / `enchantSpeed`)

## Enchant-Berechnung

Die Engine animiert den Glint-Sweep und liefert ihn als `enchantColour.a` an die Surface-/Light-Hooks ([Enchant-Effekte](../recipes/enchant-effects.md)). Das Mischen geschieht innerhalb von `bloxdLitColour()` — direkt nach dem Shading, vor dem Weltlicht ([Beleuchtung](../api/lighting.md#die-komplette-pipeline)).

## Das Overlay (Schadens-Blitz etc.)

`overlayColour` trägt den Entity-Zustands-Farbwert (Schadens-Blitz etc.) als RGB + Alpha. `bloxdLitColour` mischt es **vor der Beleuchtung**, daher reitet der Zustands-Ausdruck mit, ohne die Grundfarbe zu brechen. Die Verarbeitung existierte intern schon in v4 und wurde in v5 für Ein-/Ausgaben geöffnet.

## Der Textur-Pfad

Die meisten Modell-Flächen nutzen `textureId: 0` (keine Textur) — Spieler-Skins und Mob-Texturen liegen nicht im Namensraum des Block-Textur-Atlas. `surface.colour` kommt mit Skin × Tint gebacken an, die Modell-Flächen-Verarbeitung startet also bei `colour` ([modell-eigene Texturen](../api/texture-api.md#modell-eigene-texturen-textureid-0)).

## Varianten

Das Model-Programm bildet eine Achse der Varianten-Matrix: `strict.model` / `allow.model`. `BLOXD_ALPHA` ist nur in allow.model definiert ([Präprozessor](../api/preprocessor.md#makro--varianten-matrix)); strict.model hat keine Vertex-Hooks.

## Verwandte Seiten

- [Modelle und Texturen](../guides/models.md) · [Modell-Shader-Rezepte](../recipes/model-shaders.md) · [Flags](../api/flags.md) · [Rendering-Pipeline](rendering-pipeline.md)

# Hook-Aufruf-Interna

> Ziel-API: 5 · Ziel-Build: `xkg8x` · Status: Analyzed (aus dem Produktions-Bundle restauriert — der Lite-Renderer; die integrierte Quelldatei `lite/terrainShaderPack.ts` überlebt in Fehlerstrings)

Wie die Engine Hooks zur Laufzeit aufruft. Das ändert nichts an dem Code, den du schreibst, nimmt aber das Rätselraten darüber, was Hooks empfangen.

## Die Spleiß-Architektur

Der Renderer „ruft“ Hooks nicht aus JavaScript auf. Sobald ein Paket die Validierung besteht, **pfropft die Engine deine Hook-Aufrufe in ihr Terrain-WGSL ein, indem sie feste Anker-Zeilen im Shader-Text ersetzt**. Jeder Anker muss exakt einmal matchen — null oder mehrere Treffer brechen ab mit `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Stufe | Anker im Engine-Shader | Was eingepfropft wird |
|---|---|---|
| Vertex | der Block von `let worldPos = …` bis `vertexOutputs.vNormalW = …` | `BloxdVertexIn` bauen, den Vertex-Hook aufrufen, `worldPos` zurückschreiben (dabei auch `let worldPos` zu `var worldPos` umschreibend) |
| Surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | `BloxdSurfaceIn` bauen, den Surface-Hook aufrufen, `baseColor` / `alpha` zurückschreiben |
| Lit-Color | direkt vor dem Fog-Mix | fängt die VOR-Fog-Farbe ab (v3 nutzte das `bloxdSpLitColour`-Temporäre — v5 befördert diese Rolle in die öffentliche Header-Funktion `bloxdLitColour()`) |
| Light | das `return color;` am Ende des Fragment-Shaders | `BloxdLightIn` bauen, den Light-Hook aufrufen, `color` zurückschreiben — nach dem Fog-Mix |

## Was der Spleiß erzwingt

- **strict-Terrain ignoriert Alpha-Änderungen des Surface-Hooks.** Das Zurückschreiben von `alpha = bloxdSpSurface.alpha` wird nur für das Liquid-Programm oder nicht-strict Varianten eingepfropft — die Implementierung hinter der Makro-Tabelle ([Präprozessor](../api/preprocessor.md))
- **Eine strict-Variante, die einen Vertex-Hook deklariert, führt ihn nie aus.** Die Engine meldet zur Build-Zeit: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. Daher das `#ifndef BLOXD_STRICT` der Vorlage
- **`bloxdSp*`-Bezeichner** sind Engine-Temporäre — für deinen Code unsichtbar, aber in Diagnosen und Reverse-Engineering-Ausgaben präsent ([Reservierte Bezeichner](reserved-identifiers.md) — 46 in v5)
- **Der Default-Surface-Kurzschluss.** Ist der Surface-Hook einer Variante wortwörtlich `bloxdDefaultSurface`, lässt die Engine das `baseColor` / `alpha`-Zurückschreiben komplett weg — das Default erzeugt diese Werte bereits, die Zuweisungen wären toter Code. **Unveränderte Hook-Ketten kosten nichts**

## Was sich in v5 änderte

Die Spleiß-Architektur existierte schon im v2-Renderer und blieb über v2 → v3 stabil (v3 änderte nur `vBlockId` → `vBlockFlags` und fügte die Liquid-Variante hinzu). Die Änderungen von v5:

- `vBlockFlags` (Bits) → die **`BloxdFlags`-Struktur** (über `bloxdSpFlags` übergeben)
- das Abfangen von `litColour` ging von engine-intern zur **öffentlichen API** (`bloxdLitColour()` — das `bloxdSpLitColour` aus v4, befördert)
- `BloxdLightIn` erhielt `diffuse` / `emissive`, und `bloxdShading()` baut die Materialantwort neu auf ([Beleuchtung](../api/lighting.md))
- Übergabe von `localPosition` (`bloxdSpItemLocalPosition`), Enchant-Eingaben (`bloxdSpEnchant`) und `overlayColour` ([Model-Rendering](model-rendering.md))
- `fogVisibility` → **`fogAlpha`** (invertiert)
- das Model-Programm trat der Varianten-Matrix bei (3 Programme × 2 Modi = 6 Varianten)

## Was BloxdLightIn speist (pro Feld)

| Feld | Engine-seitige Quelle |
|---|---|
| `litColour` | die Fragment-Farbe, direkt vor dem Fog-Mix abgefangen — in Header-Worten „vor Emission und Fog“ |
| `directional` | die vertex-interpolierte Summe der Lambert-Terme je Richtlicht (2-Licht-Setup in [Rendering-Pipeline](rendering-pipeline.md)) |
| `diffuse` / `emissive` | die richtlicht-RGB-Antwort / der RGB-Glow des Materials |
| `ambient` | `material.ambient × sceneAmbient` — pro Material, pro Frame |
| `blockLight` / `skyLight` | die dekodierten Lichtstufen-Varyings ([Beleuchtungs-Interna](lighting-internals.md)) |
| `ambientLightColour` / `skyLightColour` | die entsprechenden Uniforms |
| `heldLight` | aus dem Lichtstufen-Varying und den Handlicht-Uniforms gebaut (Kegel-Falloff in [Beleuchtungs-Interna](lighting-internals.md)) |
| `fogColour` | nur in komplett foglosen Szenen schwarz (Modus 0) |
| `fogAlpha` | der geclampte Fog-Faktor ([Fog-Interna](fog-internals.md)) |
| `position` / `normal` / `localPosition` / `flags` / `textureId` / `textureRotation` / `uv` / `mipLevel` | Varyings und flat-interpolierte Werte (dieselben wie `BloxdSurfaceIn` — Werte nach dem Vertex-Hook) |

## Verwandte Seiten

- [Shader-Hooks](../api/hooks.md) · [Rendering-Pipeline](rendering-pipeline.md) · [Reservierte Bezeichner](reserved-identifiers.md) · [Versionsgeschichte: v3](../history/v3.md)

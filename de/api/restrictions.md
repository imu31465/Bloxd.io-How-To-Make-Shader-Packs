# Einschränkungen & reservierte Namen

> Ziel-API: 5 · Ziel-Build: `v98qt8` (2026-11-08, Produktion und Preprod) · Status: Verified (v4-Grenzen auf v5 byte-identisch erneut bestätigt)

Was Pakete schreiben dürfen — und die vollständigen Regeln der Namensreservierung.

## Erlaubt

- WGSL-Built-ins (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select`, …)
- eigene `fn` / `struct` / `const` / `alias` / `var<private>`, funktionseigene `let` und Kontrollfluss (if/for/while/switch…)
- Ableitungen (`dpdx` / `dpdy` / `fwidth`) nur in Surface-/Light-Hooks (Fragment-Stufe) — nicht in Vertex-Hooks
- `const`-Arrays (Farb-LUTs etc.), Zeiger (`ptr<function, T>`), Matrizen (`mat3x3f` etc.)
- Flag-Definitionen `#define NAME` (ohne Wert) + `#ifdef`-Bedingungen

## Verboten / Vorbehalte

- **Keine direkten Texturen**: `texture_*` / `sampler`-Typen lassen sich nicht deklarieren; Atlas-Lesezugriffe gehen ausschließlich über [`bloxdTexel`](texture-api.md). *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*
- **`discard` ist in strict verboten** — in `#ifndef BLOXD_STRICT` einpacken
- `@attributes` / `enable` / `requires` / `override` sind verboten — kein `enable f16;`, daher **keine f16-Typen**
- kein `@builtin`, daher sind `fragCoord` / `vertex_index` unerreichbar
- **kein `let` auf Modul-Ebene** — `const` oder `var` benutzen
- kein `atomic`
- **Ausgabe-Strukturen nie direkt konstruieren**: `BloxdLight(...)` scheitert an der statischen Validierung; bei `bloxdDefault*` beginnen
- ein nacktes `var x: BloxdSurface;` ist ein Validierungsfehler
- Hook-Parameter sind read-only — vor dem Mutieren kopieren
- `#define` nimmt keinen Wert (nur Namen)

## Reservierte Namen

### Das bloxd-Präfix (allgemeine Regel)

**Jeder Bezeichner, der auf `/^bloxd/i` (case-insensitive) passt, ist reserviert.** Die einzigen Ausnahmen sind die 9 Hook-Funktionsnamen.

Validator-Wortlaut, wortwörtlich:

> *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*

### Der bloxdSp*-Namensraum (46 Symbole)

Die 46 Symbole, die der Codegenerator injizieren kann und die daher nicht neu deklariert werden dürfen:

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

Sie decken die Übergabe der Flag-Struktur (`bloxdSpFlags`), die Enchant- und Modell-lokalen Eingaben (`bloxdSpEnchant` / `bloxdSpItemLocalPosition`), den Zell-Sampling-Pfad der Texturpakete, die Rotationskette und erweiterte Hook-Locals ab. **Die Reservierungsregel auf Paket-Ebene ist breiter als diese Liste** (alles, was auf `/^bloxd/i` passt) — du musst sie also nicht auswendig lernen: Beginne deine eigenen Namen einfach nie mit `bloxd`.

### Texturnamen

Bezeichner, die mit `bloxdTextureId` beginnen, werden als Textur-Namenskonstanten aufgelöst ([Textur-API](texture-api.md#bloxdtextureid-benannte-texturkonstanten)).

## Automatische Umschreibungen

- **Vorzeichen-Flip der Y-Ableitung**: der Analyzer schreibt jeden Aufruf von `dpdy`, `dpdyCoarse` und `dpdyFine` als `(-dpdy(...))` um (die dpdy-Familie ist im Token-Rewrite-Pass des Validators explizit als Inversionsmenge aufgeführt). Das Screen-Space-y zeigt nach unten; diese Inversion bringt „Änderungsrate nach oben“ mit der Intuition in Einklang. Schreibe `dpdy(h)` in der Bedeutung „wie ändert sich h, wenn ich nach oben gehe“ — der emittierte Code trägt den Flip. `dpdx` und die `fwidth`-Familie bleiben unberührt

## Diagnosen, die du tatsächlich zu sehen bekommst

- *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*
- *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*
- *"X reaches bloxdTexel, which only surface and light hooks can use."*
- *"X reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and Y doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH."*
- *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## Verwandte Seiten

- [Fehlerbehebung: Kompilierung](../troubleshooting/compilation.md) · [Engine-Interna: Shader-Validierung](../internals/shader-validation.md)

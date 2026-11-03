# Interna reservierter Bezeichner

> Ziel-API: 5 · Ziel-Build: `ab90qa` · Status: Analyzed (aus den Generatoren des Live-Bundles restauriert)

Der `bloxdSp*`-Namensraum — Symbole, die die Generatoren injizieren können und die Pakete daher nicht neu deklarieren dürfen. Die Zusammenfassung für Paket-Autoren: [Einschränkungen](../api/restrictions.md).

## Die 46 Symbole

Gewachsen von 27 (v4) auf **46** (20 hinzugekommen, 1 ausgemustert — `bloxdSpLitColour`, befördert in die öffentliche `bloxdLitColour()`):

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

## Neue Namen ↔ v5-Features

- `bloxdSpFlags` — Übergabe der `BloxdFlags`-Struktur
- `bloxdSpEnchant` / `bloxdSpItemLocalPosition` — die neuen Eingaben (Enchant, modell-lokale Position)
- `bloxdSpAcross` / `bloxdSpAt` / `bloxdSpCell` / `bloxdSpCellAt` / `bloxdSpCellIndex` / `bloxdSpSize` / `bloxdSpLevel` / `bloxdSpOwnTexel` — der Zell-Sampling-Pfad der Texturpakete
- `bloxdSpQuarterTurns` — die Rotationskette ([Textur-Sampling](texture-sampling.md))
- `bloxdSpNormal` / `bloxdSpPosition` / `bloxdSpColour` / `bloxdSpOut` / `bloxdSpWord` / `bloxdSpIndex` / `bloxdSpDown` / `bloxdSpInside` — Locals erweiterter Hooks

## Die Regel auf Paket-Ebene

Breiter als dieser Namensraum: **alles, was auf `/^bloxd/i` (case-insensitive) passt**. Nur die 9 Hook-Funktionsnamen dürfen deklariert werden ([Validierungsfehler](../troubleshooting/validation.md)).

Bezeichner mit `bloxdTextureId`-Präfix lösen als Texturnamen auf, mit ihrer eigenen Fehlerfamilie ([Textur-Probleme](../troubleshooting/textures.md)).

## Verwandte Seiten

- [Einschränkungen](../api/restrictions.md) · [Textur-Sampling](texture-sampling.md) · [Versionsgeschichte: v5](../history/v5.md)

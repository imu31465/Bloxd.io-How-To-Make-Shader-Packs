# Interna reservierter Bezeichner

> Ziel-API: 5 · Typ: technische Referenz

Der `bloxdSp*`-Namensraum — Symbole, die die Generatoren injizieren können und die Pakete daher nicht neu deklarieren dürfen. Die Zusammenfassung für Paket-Autoren: [Einschränkungen](../api/restrictions.md).

## Die 88 Symbole


`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCasterBlocks` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellFull` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpCrossed` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEntityLight` · `bloxdSpEntityRow` · `bloxdSpExitBox` · `bloxdSpEye` · `bloxdSpFacing` · `bloxdSpFacingDot` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLit` · `bloxdSpLod` · `bloxdSpMarch` · `bloxdSpMaskBit` · `bloxdSpMaskEdge` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpNormalCode` · `bloxdSpOrigin` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpOwnTexture` · `bloxdSpPixel` · `bloxdSpPlaneTolerance` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpRayFresh` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpShadowDz` · `bloxdSpShadowEmissive` · `bloxdSpShadowEntities` · `bloxdSpShadowEntityGrids` · `bloxdSpShadowFirstPerson` · `bloxdSpShadowLight` · `bloxdSpShadowMarch` · `bloxdSpShadowMask` · `bloxdSpShadowNormal` · `bloxdSpShadowPixel` · `bloxdSpShadowPosition` · `bloxdSpShadowSpecial` · `bloxdSpShadowVolume` · `bloxdSpShadowVolumeSampler` · `bloxdSpShadowVoxels` · `bloxdSpShadowZ` · `bloxdSpSize` · `bloxdSpSunShadow` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpT` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpVolumeAt` · `bloxdSpVolumeOpenLit` · `bloxdSpVolumeOut` · `bloxdSpVolumeTexel` · `bloxdSpVolumeWork` · `bloxdSpWindowHas` · `bloxdSpWindowSlot` · `bloxdSpWord` · `bloxdSpZ`


Alle 42 neuen Symbole stammen aus der Sonnen-/Mondschatten-Implementierung der Engine, die \`bloxdShadow()\` / \`bloxdAirShadow()\` trägt:

- \`bloxdSpSunShadow\` / \`bloxdSpShadowVolume\` / \`bloxdSpShadowVolumeSampler\` / \`bloxdSpShadowVoxels\` — das Sonnenschattenvolumen (eine 3D-Textur, die die Engine um den Spieler füllt) und sein Sampler
- \`bloxdSpShadowMarch\` / \`bloxdSpMarch\` / \`bloxdSpOrigin\` / \`bloxdSpRayFresh\` / \`bloxdSpExitBox\` — der Ray March, der einen Schattenstrahl auflöst (64 Schritte, Stale-Box-Frischetest)
- \`bloxdSpShadowMask\` / \`bloxdSpShadowPixel\` / \`bloxdSpMaskBit\` / \`bloxdSpMaskEdge\` — der Maskentextur-Pfad (kantenbewusstes Sampling)
- \`bloxdSpEntityLight\` / \`bloxdSpShadowEntities\` / \`bloxdSpShadowEntityGrids\` / \`bloxdSpEntityRow\` / \`bloxdSpCasterBlocks\` — Entitätenschattenwurf (Spieler, Mobs, Items)
- \`bloxdSpShadowPosition\` / \`bloxdSpShadowNormal\` / \`bloxdSpShadowEmissive\` / \`bloxdSpShadowFirstPerson\` / \`bloxdSpShadowLight\` / \`bloxdSpShadowDz\` / \`bloxdSpShadowZ\` / \`bloxdSpShadowSpecial\` — Schattenkontext pro Fragment (die Emissive- und First-Person-Ausschlüsse)
- \`bloxdSpVolumeAt\` / \`bloxdSpVolumeOpenLit\` / \`bloxdSpVolumeTexel\` / \`bloxdSpVolumeOut\` / \`bloxdSpVolumeWork\` — Volumenabfragen (der Pfad von \`bloxdAirShadow\`: nur Blöcke, auf ganze Blöcke weichgezeichnet)
- \`bloxdSpLit\` / \`bloxdSpFacing\` / \`bloxdSpFacingDot\` / \`bloxdSpT\` / \`bloxdSpCrossed\` / \`bloxdSpNormalCode\` / \`bloxdSpCellFull\` / \`bloxdSpWindowHas\` / \`bloxdSpWindowSlot\` / \`bloxdSpOwnTexture\` / \`bloxdSpPlaneTolerance\` — Stützwerte des Schatten- und Sampling-Codegens

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

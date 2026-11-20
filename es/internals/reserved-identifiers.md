# Internas de los identificadores reservados

> API objetivo: 5 · Build objetivo: `bbb6l5` · Estado: Analyzed (restaurado de los generadores del bundle en vivo)

El espacio de nombres `bloxdSp*` — símbolos que los generadores pueden inyectar y que los paquetes, por tanto, no pueden redeclarar. El resumen para autores de packs: [Restricciones](../api/restrictions.md).

## Los 88 símbolos

De 27 en v4 a 46 en el lanzamiento v5, y a **88** en `bbb6l5` (+42, 0 retirados; el único retiro histórico fue `bloxdSpLitColour`, ascendido al público `bloxdLitColour()`):

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCasterBlocks` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellFull` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpCrossed` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEntityLight` · `bloxdSpEntityRow` · `bloxdSpExitBox` · `bloxdSpEye` · `bloxdSpFacing` · `bloxdSpFacingDot` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLit` · `bloxdSpLod` · `bloxdSpMarch` · `bloxdSpMaskBit` · `bloxdSpMaskEdge` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpNormalCode` · `bloxdSpOrigin` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpOwnTexture` · `bloxdSpPixel` · `bloxdSpPlaneTolerance` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpRayFresh` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpShadowDz` · `bloxdSpShadowEmissive` · `bloxdSpShadowEntities` · `bloxdSpShadowEntityGrids` · `bloxdSpShadowFirstPerson` · `bloxdSpShadowLight` · `bloxdSpShadowMarch` · `bloxdSpShadowMask` · `bloxdSpShadowNormal` · `bloxdSpShadowPixel` · `bloxdSpShadowPosition` · `bloxdSpShadowSpecial` · `bloxdSpShadowVolume` · `bloxdSpShadowVolumeSampler` · `bloxdSpShadowVoxels` · `bloxdSpShadowZ` · `bloxdSpSize` · `bloxdSpSunShadow` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpT` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpVolumeAt` · `bloxdSpVolumeOpenLit` · `bloxdSpVolumeOut` · `bloxdSpVolumeTexel` · `bloxdSpVolumeWork` · `bloxdSpWindowHas` · `bloxdSpWindowSlot` · `bloxdSpWord` · `bloxdSpZ`

## Nombres nuevos ↔ el sistema de sombras de `bbb6l5`

Los 42 símbolos nuevos provienen de la implementación de sombras sol/luna del engine, que ahora respalda `bloxdShadow()` / `bloxdAirShadow()`:

- `bloxdSpSunShadow` / `bloxdSpShadowVolume` / `bloxdSpShadowVolumeSampler` / `bloxdSpShadowVoxels` — el volumen de sombra solar (una textura 3D que el engine rellena alrededor del jugador) y su sampler
- `bloxdSpShadowMarch` / `bloxdSpMarch` / `bloxdSpOrigin` / `bloxdSpRayFresh` / `bloxdSpExitBox` — el ray march que resuelve un rayo de sombra (64 pasos, prueba de frescura stale-box)
- `bloxdSpShadowMask` / `bloxdSpShadowPixel` / `bloxdSpMaskBit` / `bloxdSpMaskEdge` — la ruta de textura de máscara (muestreo consciente del borde)
- `bloxdSpEntityLight` / `bloxdSpShadowEntities` / `bloxdSpShadowEntityGrids` / `bloxdSpEntityRow` / `bloxdSpCasterBlocks` — proyección de sombras de entidades (jugadores, mobs, objetos)
- `bloxdSpShadowPosition` / `bloxdSpShadowNormal` / `bloxdSpShadowEmissive` / `bloxdSpShadowFirstPerson` / `bloxdSpShadowLight` / `bloxdSpShadowDz` / `bloxdSpShadowZ` / `bloxdSpShadowSpecial` — contexto de sombra por fragmento (las exclusiones emissive y primera persona)
- `bloxdSpVolumeAt` / `bloxdSpVolumeOpenLit` / `bloxdSpVolumeTexel` / `bloxdSpVolumeOut` / `bloxdSpVolumeWork` — consultas de volumen (la ruta de `bloxdAirShadow`: solo bloques, difuminado por bloque entero)
- `bloxdSpLit` / `bloxdSpFacing` / `bloxdSpFacingDot` / `bloxdSpT` / `bloxdSpCrossed` / `bloxdSpNormalCode` / `bloxdSpCellFull` / `bloxdSpWindowHas` / `bloxdSpWindowSlot` / `bloxdSpOwnTexture` / `bloxdSpPlaneTolerance` — locales de apoyo del codegen de sombras y muestreo

## Nombres nuevos ↔ características de v5

- `bloxdSpFlags` — entrega de la estructura `BloxdFlags`
- `bloxdSpEnchant` / `bloxdSpItemLocalPosition` — las nuevas entradas (encantamiento, posición local del modelo)
- `bloxdSpAcross` / `bloxdSpAt` / `bloxdSpCell` / `bloxdSpCellAt` / `bloxdSpCellIndex` / `bloxdSpSize` / `bloxdSpLevel` / `bloxdSpOwnTexel` — la ruta de paquetes de texturas con muestreo por celda
- `bloxdSpQuarterTurns` — la cadena de rotación ([Muestreo de texturas](texture-sampling.md))
- `bloxdSpNormal` / `bloxdSpPosition` / `bloxdSpColour` / `bloxdSpOut` / `bloxdSpWord` / `bloxdSpIndex` / `bloxdSpDown` / `bloxdSpInside` — variables locales de hooks extendidos

## La regla a nivel de paquete

Más amplia que este espacio de nombres: **todo lo que coincida con `/^bloxd/i` (sin distinguir mayúsculas)**. Solo los 9 nombres de funciones hook se pueden declarar ([Errores de validación](../troubleshooting/validation.md)).

Los identificadores con prefijo `bloxdTextureId` se resuelven como nombres de textura con su familia de errores dedicada ([Problemas de texturas](../troubleshooting/textures.md)).

## Relacionado

- [Restricciones](../api/restrictions.md) · [Muestreo de texturas](texture-sampling.md) · [Historial de versiones: v5](../history/v5.md)

# Internas de los identificadores reservados

> API objetivo: 5 · Build objetivo: `bny9u` · Estado: Analyzed (restaurado de los generadores del bundle en vivo)

El espacio de nombres `bloxdSp*` — símbolos que los generadores pueden inyectar y que los paquetes por tanto no pueden redeclarar. El resumen para autores de paquetes: [Restricciones](../api/restrictions.md).

## Los 46 símbolos

Crecidos de los 27 de v4 a **46** (20 añadidos, 1 retirado — `bloxdSpLitColour`, promovido a la pública `bloxdLitColour()`):

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

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

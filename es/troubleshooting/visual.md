# Problemas visuales

> API objetivo: 5 · Estado: Verified

Compila bien pero se ve mal.

## La distancia se vuelve blanca/brumosa

- **Causa**: niebla doble. La salida por defecto del hook de light **ya lleva niebla** (`bloxdApplyFog(lit + emission, light)`), así que mezclar más color de niebla encima la duplica
- **Corrección**: mantén la niebla propia sutil; considera la perspectiva aérea solo por saturación ([recetas de realismo](../recipes/realism.md))
- **Prevención**: entiende la semántica de `fogAlpha` (0 = sin niebla, 1 = solo fogColour) y el [pipeline](../api/lighting.md#el-pipeline-completo) antes de escribir niebla

## pow(l.skyLight, γ) nunca oscurece las sombras

- **Causa**: `skyLight` llega tras la curva de realce (un crudo 0.87 llega como 0.97); la gamma no puede competir matemáticamente
- **Corrección**: pasa a la inversión del realce + umbral ([Sombras](../guides/shadows.md))

## Los bloques se vuelven casi blanco puro

- **Causa**: la salida del hook de light supera 1.0 (no hay clamp más allá de la salida)
- **Corrección**: añade `clamp(col, vec3f(0.0), vec3f(1.0))`

## Blanco sin sumas

- **Causa**: inversión de la niebla por división
- **Corrección**: suelta la inversión; reconstruye desde `s.colour` y aplica la niebla exactamente una vez al final (o vía `bloxdApplyFog`)

## Los bloques brillantes no brillan (paquetes reconstruidos)

- **Causa**: falta la re-adición de la emisión — tirar la salida por defecto significa añadir la emisión tú mismo
- **Corrección**: añade `+ s.emission * (1.0 - l.fogAlpha)`; en v5 la composición `bloxdLitColour()` + emisión + `bloxdApplyFog` es lo más seguro ([Iluminación](../api/lighting.md))

## Ondas/patrones cortados en cambios de chunk u origen

- **Causa**: usar posiciones de espacio de render directamente — el origen se mueve con el jugador
- **Corrección**: usa `bloxdWorldPosition(position)` para los efectos dependientes del mundo ([Coordenadas](../recipes/coordinates.md)); nota los límites de precisión de f32 lejos del origen

## Los patrones en la superficie del agua se desalinean en caras giradas

- **Causa**: `bloxdTexel` aplica la `textureRotation` propia del fragmento a tu uv ([la sutileza de la rotación](../api/texture-api.md#la-sutileza-de-la-rotación--un-sampler-neutral))
- **Corrección**: prerrota con el ayudante `texelNeutral`

## El brillo de encantamiento / el destello de daño desaparecieron

- **Causa**: iluminación propia reconstruida sin pasar `enchantColour` / `overlayColour`
- **Corrección**: pásalos o usa `bloxdLitColour()` ([Efectos de encantamiento](../recipes/enchant-effects.md))
- **v5**: `bloxdDefaultSurface` pasa ambos sin cambios, así que los valores por defecto nunca los pierden

## Cielo, nubes o el disco solar sin efecto

- **Es de diseño**: los hooks cubren solo terreno / líquido / modelo ([Looks inalcanzables](../guides/constraints.md))

## Relacionado

- [Problemas de iluminación](lighting.md) · [Consejos de depuración](../guides/debugging.md) · [Internas de niebla](../internals/fog-internals.md)

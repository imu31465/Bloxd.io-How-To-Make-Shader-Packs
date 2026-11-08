# Sombras

> API objetivo: 5 · Build objetivo: `v98qt8` · Estado: Verified (comportamiento de LightEngine sin cambios desde la medición de v4)

Las tres formas de hacer «sombras» en un shader pack, y sus límites.

## Se puede / no se puede

| Efecto | ¿Posible? | Cómo |
|---|---|---|
| Oscurecer con claridad bajo árboles/techos (estilo proyectado) | ◎ | inversión del realce de `skyLight` + corte por umbral (abajo) |
| Las sombras siguen las ediciones de bloques en tiempo real | ◎ | LightEngine recalcula de inmediato — automático |
| Sombras de color frío / zonas al sol cálidas | ◎ | desplazamiento de dos colores |
| Sombras que giran con el sol (mapa de sombras) | ✕ | la profundidad es solo para líquidos; la oclusión por rayos de luz no es una entrada |
| Penumbra física | ✕ | limitada por la propagación BFS a resolución de vóxeles |
| AO en tiempo real (SSAO) | ✕ | solo el AO horneado en los colores de vértice |

## skyLight es un mapa de sombras por vóxeles

`l.skyLight` no es solo un parámetro de brillo. El LightEngine del mesher calcula datos de oclusión por vóxeles estilo Minecraft de **«¿puede esta posición ver el cielo?» — un mapa de sombras**:

1. **Barrido de columnas**: cada columna (x,z) de arriba abajo; la luz de cielo arranca en 15, llega a 0 en los bloques opacos y se atenúa por `lightFilter` (aire 1 / agua 3 / opaco 15)
2. **Relleno por inundación BFS**: se propaga en horizontal a los 6 vecinos (−1 por bloque) — esto suaviza los bordes de sombra. Bajo un oclusor de radio r el valor crudo es (15−r)/15
3. blockLight (antorchas) es un BFS aparte RGB de 3 canales (empaquetado en 4 bits)

Bajo árboles, techos y dentro de edificios el valor ya es bajo e interpola suavemente por vértice. Colocar o romper un bloque recalcula de inmediato — **sombras que siguen en tiempo real**.

## La trampa de la curva de realce

`l.skyLight` llega **tras la curva de realce** (`y = 1-(1-x/(3-2x))³`, una curva S que realza los valores oscuros):

| Lugar | Vóxel crudo | Realzado (= l.skyLight) | pow(·, 5.0) |
|---|---|---|---|
| cielo abierto | 1.00 | 1.00 | 1.00 |
| bajo árbol (radio 2) | 0.87 | **0.97** | **0.86** ← casi intacto |
| radio 3 | 0.80 | **0.92** | 0.66 |
| radio 5 | 0.67 | 0.78 | 0.29 |

**Esta es la causa raíz demostrada de que «la gamma no oscurece las sombras»** — incluso γ=5 solo baja el 0.97 bajo árbol hasta 0.86.

## La solución: inversión del realce + corte por umbral

La curva es monótona y se invierte exacta: `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Restaura el valor crudo y luego binariza con un **umbral `smoothstep`**. La propagación BFS del LightEngine es «−1 por bloque adyacente», así que `th = 1 - r/15` es directamente el mando de «radio de oclusión contado como sombra».

La implementación completa (puerta solar + separación cálida/fría + passthrough de blockLight) está en [recetas de realismo](../recipes/realism.md). Pasos clave:

```wgsl
// 1. restore the raw value (skipping this means shadows never appear)
let skyRaw = sh_unlift(l.skyLight);
// 2. threshold-cut — sunlit 1 / shadow 0
let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
// the essence of projection: direct sun only reaches places that see the sky
let lit = sunL * sky;
```

Mandos: **área** = `shTh` (0.93→radio 1.5 / 0.87→2 / 0.80→3 / 0.67→5); **suavidad de borde** = `shSoft`; **oscuridad del núcleo** = el mínimo ambiente y el desplazamiento de dos puntos de dispersión de cielo; sombras vespertinas largas ≈ `thEff = shTh + 0.10 * (1 - clamp(sunDir.y, 0.0, 1.0))`.

## Límites honestos

- Las sombras referencian el **cielo hacia arriba**, así que **no giran con el sol** (resolución de vóxeles; los bordes suaves vienen de la propagación BFS)
- La plantilla de iluminación del motor conserva un `var shadow: f32 = 1.;` sin usar (siempre 1.0 = desactivado) — un rastro plausible de «planes futuros» para sombras rotatorias precisas al píxel
- Las sombras rotatorias precisas al píxel quedan fuera de la API actual ([Looks inalcanzables](constraints.md))

## Relacionado

- [recetas de realismo](../recipes/realism.md) (la receta completa de sombra proyectada) · [Interioridades de la iluminación](../internals/lighting-internals.md) · [Consejos de depuración](debugging.md)

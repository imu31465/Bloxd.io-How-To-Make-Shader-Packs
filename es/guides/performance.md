# Rendimiento

> API objetivo: 5 · Build objetivo: `ab90qa` · Estado: Verified (práctica basada en mediciones)

Los hooks del paquete corren en cada fragmento (todos los píxeles de terreno / líquido / modelo), así que las decisiones de estilo mueven la tasa de fotogramas de forma notable.

## Primeros hechos

- **El hook de light es la etapa final**: corre para cada píxel dibujado de terreno, líquido y modelo — la mayor parte de la pantalla
- **Los paquetes corren sobre WebGPU**: evalúa el coste asumiendo un rango de GPUs que incluya el móvil
- El tope de tamaño del cargador (256 KB de `.wgsl`) es también un techo **de compilación** en la práctica

## Escalera de coste (barato → caro)

| Operación | Coste | Nota |
|---|---|---|
| `mix` / `clamp` / aritmética | ◎ mínimo | |
| lecturas de entrada (`l.skyLight`…) | ◎ | de uniform/atributo de vértice |
| `smoothstep` / `pow` | ○ | `pow` varía según el exponente |
| `sin` / `cos` | ○ | básico de animación |
| `dot` / `normalize` | ○ | |
| `bloxdTexel()` (muestreo de textura) | △ | más barato en mips altos |
| `dpdx` / `dpdy` / `fwidth` | △ | solo hooks surface/light |
| ramificar (`if`) | △ | WGSL puede evaluar ambos lados; condiciones uniformes (comprobaciones de flags) son baratas |
| ruido por hash (muchos `sin`/`fract`) | △ | limita los efectos de micro-relieve por distancia |

## Práctica

1. **Limita los efectos a las caras que los necesitan** — la selección por `flags` gana a «+20 % en todas partes»
2. **Suelta detalle con la distancia** — sal pronto cuando `distance(surface.position, bloxdEyePosition())` supere un umbral
3. **Usa los mips** — `bloxdTexel(id, uv, mipLevel + 1.0)` es un promedio a ¼ de resolución ([ejemplos prácticos](../api/texture-api.md#ejemplos-prácticos))
4. **Prefiere los hooks de surface para retoques de color** — el hook de light es la etapa final sobre todos los píxeles
5. **Añade detalle de forma incremental y compara FPS** ([pruebas](testing.md))
6. **Las guardas `#ifdef` no ahorran ejecución** — las variantes son unidades de compilación; el ahorro en ejecución viene de flags y distancia

## Medición

- Compara FPS con y sin el paquete con las herramientas de desarrollador del navegador (panel de rendimiento / estadísticas WebGPU)
- Mide por separado escenas cargadas de terreno (bosque rico en sombras) y agua (hooks de líquido)
- Comprueba el hardware móvil — puede ser decenas de veces más lento

## Relacionado

- [Pruebas](testing.md) · [Pipeline de renderizado](../internals/rendering-pipeline.md) · [API de texturas](../api/texture-api.md)

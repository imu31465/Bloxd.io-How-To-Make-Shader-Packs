# Rendimiento

> API objetivo: 5 · Estado: Verified

Problemas de velocidad y sus soluciones.

## La comprobación en el dispositivo nunca termina y descarta el paquete

- **Causa**: la comprobación tiene un **tiempo límite forzado de 60 segundos** (el exceso se trata como `skipped`) — común en dispositivos de gama baja y mundos pesados
- **Corrección**: reduce el trabajo pesado de vértices y los bucles complejos, y reintenta
- **Prevención**: sigue la [guía de rendimiento](../guides/performance.md)

## Caída de la tasa de fotogramas

- **Comprobación**: compara los FPS con y sin el paquete; mide por separado escenas cargadas de terreno y agua
- **Causas típicas**: efectos pesados en cada cara incondicionalmente (sin selección por flags/distancia); ruido por hash de alta frecuencia; exponentes `pow` grandes
- **Correcciones** ([la guía](../guides/performance.md)):
  - limita los efectos a las caras que los necesitan vía `flags`
  - salida anticipada por distancia (`distance(surface.position, bloxdEyePosition())`)
  - muestrea un mip más arriba para lecturas `bloxdTexel` más baratas
- **Prevención**: añade detalle de forma incremental y compara FPS ([pruebas](../guides/testing.md))

## Lento solo en el móvil

- **Causa**: los paquetes corren sobre el renderizador WebGPU; las GPU móviles pueden ser decenas de veces más lentas que las de escritorio
- **Corrección**: reduce la fuerza/frecuencia de los efectos, refuerza el recorte por distancia — o marca claramente el móvil como no soportado ([Requisitos](../getting-started/requirements.md))

## Acercándose al límite de 256 KB del paquete

- **Corrección**: recorta comentarios, factoriza el código compartido en funciones, suelta las recetas sin usar ([Estructura del paquete](../getting-started/pack-structure.md))

## Relacionado

- [Guía de rendimiento](../guides/performance.md) · [Pruebas](../guides/testing.md)

# Inicio rápido

> API objetivo: 5 · Build objetivo: `bny9u` (2026-11-05, producción) · Estado: Verified

Tu primer paquete en cinco minutos.

## 1. Crea los archivos

Crea una carpeta con `pack.json` y `pack.wgsl`:

**`pack.json`**:

```json
{
  "apiVersion": 5,
  "name": "My First Pack",
  "author": "your name"
}
```

**`pack.wgsl`** — un paquete mínimo de tinte cálido:

```wgsl
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    return out;
}
```

> La cabecera del motor (constantes, estructuras, funciones) se antepone automáticamente a cada paquete en la carga — nunca la escribes tú. La cabecera completa está reproducida en [Interior del motor](../internals/engine-header.md).

## 2. Cárgalo en el juego

1. Abre ajustes → Shader Pack y carga el zip o la carpeta (la carga por carpeta es solo para navegadores de escritorio)
2. Comprueba el estado: justo tras seleccionarlo verás "Ready. Reload the page to use it." — tras una **recarga de página**, "Ready to use" significa éxito
3. Si ves "Saved, but it won't run until you fix these errors...", corrige los errores listados (archivo:línea + variante) y recarga

## 3. Verifica

1. Prueba primero en un juego permisivo
2. Luego en un juego en modo strict (la mayoría de los juegos son strict)
3. La animación de vértices solo funciona en juegos marcados allow

## 4. Distribuye

Comprímelo en zip — ver [Distribución](distribution.md).

## ¿Atascado?

- Qué significan los errores → [Solución de problemas](../troubleshooting/)
- Cómo escribir hooks → [Hooks de sombreado](hooks.md)
- La plantilla completa de 9 hooks está en la página siguiente, [Hooks de sombreado](hooks.md)

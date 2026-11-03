# Solución de problemas

Errores y problemas visuales, localizables **por síntoma**. Las páginas siguen la estructura: síntoma → causa → cómo comprobarlo → corrección → prevención.

## Índice de síntomas

| Síntoma | Página |
|---|---|
| El paquete no carga / errores de zip y pack.json | [Errores de carga](loading.md) |
| Mensajes de `apiVersion` / paquetes antiguos que no corren | [Errores de versión de API](api-version.md) |
| No compila / `must be declared as` / sintaxis WGSL | [Errores de compilación](compilation.md) |
| Errores de validación (nombres reservados, contrato strict, `reaches`) | [Errores de validación](validation.md) |
| Falla solo en algunas variantes / descartado en juegos strict | [Problemas específicos de variantes](variants.md) |
| Se ve mal (bruma blanca, sin sombras, noche rara) | [Problemas visuales](visual.md) |
| Errores de nombre de textura / `did you mean` | [Problemas de texturas](textures.md) |
| Problemas de brillo / sombra / niebla | [Problemas de iluminación](lighting.md) |
| Problemas de modelo / entidad / encantamiento | [Problemas de modelos](models.md) |
| Lento / descartado por la comprobación en el dispositivo | [Rendimiento](performance.md) |
| Legal, seguridad, preguntas frecuentes | [FAQ](faq.md) |

> API objetivo: 5 · Build objetivo: `ab90qa` (2026-11-03, producción) · Estado: Verified (mensajes registrados literalmente del validador y el cargador en vivo)

## Dónde aparecen los errores

1. **Ajustes → línea de estado de Shader Pack** — errores de la etapa del cargador (los ids son `shaderPack:load*`)
2. **La lista de errores de la pantalla del cargador** — validación y compilación (archivo:línea + variante)
3. **La consola de las herramientas de desarrollador del navegador** — errores de ejecución y de etapa 2 (compilador WGSL del navegador)

La comprobación de carga de 3 etapas está detallada en [Primeros pasos: validación](../getting-started/validation.md).

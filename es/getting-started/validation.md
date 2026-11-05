# Validación

> API objetivo: 5 · Build objetivo: `bny9u` (2026-11-05, producción) · Estado: Verified

## La comprobación de carga de 3 etapas

1. **Límites del cargador** — tamaño, forma, validez del manifiesto (ver [Estructura del paquete](pack-structure.md))
2. **Validación estática (analizador)** — sintaxis, tipos, nombres reservados, contrato strict, en las 6 variantes
3. **Compilación WebGPU real en el navegador** — la comprobación de tipos de la validación estática es incompleta, así que algunos errores solo afloran aquí

Para leer cada error, ver [Solución de problemas](../troubleshooting/) (organizado por síntoma).

## Procedimiento

1. Carga el zip o la carpeta desde ajustes → Shader Pack
2. Comprueba el estado: "Ready. Reload the page to use it." justo tras seleccionar; **tras una recarga de página**, "Ready to use" significa éxito
3. Ante "Saved, but it won't run until you fix these errors...", corrige los errores listados (archivo:línea + variante) y recarga
4. Prueba primero en un juego permisivo, luego en un juego strict (la mayoría). La animación de vértices funciona solo en juegos allow
5. Sustituir un paquete recarga desde la misma pantalla; los cambios necesitan una recarga de página
6. Elimina con Remove Pack. Tras las actualizaciones del juego, los paquetes guardados se revalidan automáticamente al cargar la página (los cambios de cabecera/registro los marcan como «necesita revisión»)

## Lista de comprobación de pruebas en el dispositivo

Ver la [guía de pruebas](../guides/testing.md) para la lista completa y la lista íntegra de factores que cambian lo que ve un paquete.

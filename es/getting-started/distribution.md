# Distribución

> API objetivo: 5 · Estado: Verified

## Formato de publicación

1. Zip con `pack.json` en la raíz, dentro de los límites de tamaño ([Estructura del paquete](pack-structure.md))
2. Verifica que `pack.json` quede en la raíz del zip (una única carpeta raíz común se elimina automáticamente)
3. Pule `name` / `author` para la publicación

## Lista de comprobación previa a la publicación

- [ ] `apiVersion: 5` (número, no string)
- [ ] Las 6 variantes pasan la validación (lista de errores vacía en la pantalla del cargador)
- [ ] Verificado visualmente tanto en un juego allow como en uno strict
- [ ] Los paquetes con animación de vértices / `discard` claramente marcados como solo-allow
- [ ] Juegos probados y fecha anotados en las notas de publicación (los builds cambian)

## Tras la publicación

- Los paquetes guardados por los jugadores se revalidan automáticamente cuando la cabecera del motor o el registro de texturas cambian con una actualización del juego
- **Los paquetes distribuidos como v1–v4 quedan inactivos en silencio** en v5 (ver [pack.json](manifest.md)) — los jugadores solo ven la línea de estado, así que publica y anuncia una versión actualizada
- Cuando la API se actualice, sigue los pasos de migración del [Historial de versiones](../history/), sube la versión y vuelve a publicar

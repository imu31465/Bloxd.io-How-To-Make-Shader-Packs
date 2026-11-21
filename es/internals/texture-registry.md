# Cómo funciona el registro de texturas

> API objetivo: 5 · Uso: referencias a texturas con nombre

Los shader packs hacen referencia a las texturas mediante constantes con nombre, no mediante IDs numéricos. Las constantes usan el formato `bloxdTextureId<Name>`. Consulta el [Catálogo de texturas](../api/texture-catalog.md) para ver los nombres disponibles.

## Resolución de nombres

Al cargar un pack, el cargador resuelve cada constante con nombre frente a los nombres de textura disponibles. Si cambia la organización interna pero el nombre sigue disponible, el pack puede seguir haciendo referencia a esa textura por su nombre.

**No escribas IDs numéricos de textura directamente en WGSL.** Los IDs internos y las posiciones del atlas pueden cambiar cuando se actualiza el contenido del juego. Las constantes con nombre mantienen el código del pack independiente de esas posiciones internas.

## Animación y rotación

- **Animación:** Usa el nombre base, como `lava`, en lugar de las grafías de fotograma como `lava0`–`lava7`. El muestreo selecciona el fotograma actual.
- **Rotación:** Usa el nombre base del catálogo en lugar de las ranuras internas de rotación. El muestreo aplica la rotación de la cara.
- **Transiciones entre fotogramas:** El motor dispone de ranuras internas para interpolar fotogramas de animación adyacentes. Los packs deben seguir usando las constantes con nombre habituales.

## Relacionado

- [Catálogo de texturas](../api/texture-catalog.md) — nombres y constantes disponibles
- [API de texturas](../api/texture-api.md) — consulta y muestreo de texturas
- [Internas del muestreo de texturas](texture-sampling.md) — funcionamiento del muestreo

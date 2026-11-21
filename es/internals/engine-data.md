# Registro de datos del motor

> API objetivo: 5 · Estado: Analyzed

Esta página resume la API disponible para los shader packs. Consulta la [Referencia de la API](../api/) para conocer su uso.

## Superficie de la API

| Elemento | Especificación |
|---|---|
| Versión de API | `5` |
| Cabecera del motor | 216 líneas; consulta la [cabecera del motor](engine-header.md) |
| Hooks | 9 (Terrain / Liquid / Model × Vertex / Surface / Light) |
| Variantes | 6 (strict × terrain / liquid / model) |
| Macros | `BLOXD_STRICT`, `BLOXD_ALPHA`, `BLOXD_SCENE_DEPTH` |
| Uniform del pack | 80 bytes; consulta el [Formato del paquete](../api/pack-format.md) |
| Campos del uniform | `seconds` @0, `lit` @4, `renderOffset` @16, `sunDirection` @32, `eyePosition` @48, `shadowDirection` @64 |
| Nombres de textura | Las constantes utilizables están en el [Catálogo de texturas](../api/texture-catalog.md) |

## API de sombras

- `bloxdShadow()` devuelve el factor de sombra solar/lunar calculado por el motor.
- `bloxdAirShadow(t)` evalúa la sombra en un punto entre la cámara y el fragmento.
- `bloxdShadowDirection()` devuelve la dirección de la luz que genera la sombra.
- `keepCircleShadows` es un campo booleano opcional de `pack.json` que conserva las sombras circulares anteriores.

## Relacionado

- [Referencia de la API](../api/) — API disponible para los packs
- [Formato del paquete](../api/pack-format.md) — manifiesto, uniform y límites del cargador
- [Política por juego](policy.md) — restricciones de cada juego

# Registro de investigación

> Estado: Analyzed

Esta página explica cómo interpretar las notas técnicas sobre la implementación del juego. El comportamiento interno no es un contrato público de API y puede cambiar con las actualizaciones.

## Principios de investigación

1. **Comprobar el comportamiento observable** — contrastar la documentación con la validación dentro del juego y el comportamiento en ejecución.
2. **Separar implementación y API** — distinguir las funciones disponibles para los shader packs de los mecanismos que solo utiliza el motor.
3. **Explicar cómo se obtuvo cada hallazgo** — indicar la operación del motor de la que procede un valor o comportamiento documentado.
4. **No presentar inferencias como hechos** — separar observaciones, interpretaciones y preguntas sin resolver.
5. **No confundir la hora de observación con la fecha de publicación** — una comprobación durante una investigación no demuestra cuándo se distribuyó una función.

## Páginas de referencia

| Página | Contenido |
|---|---|
| [Cabecera del motor](engine-header.md) | Tipos, funciones y constantes añadidos a los packs |
| [Validación de shaders](shader-validation.md) | Reglas de validación de los packs |
| [Compilación WGSL](wgsl-compilation.md) | Comportamiento de compilación |
| [Registro de texturas](texture-registry.md) | Resolución y muestreo de nombres de textura |
| [Política por juego](policy.md) | Restricciones de cada juego |
| [Registro de datos del motor](engine-data.md) | API visible para los packs |

## Limitaciones

- No se garantiza que las funciones y estructuras internas sigan disponibles.
- La disposición del bundle y los identificadores internos no forman parte de la especificación de la API.
- Utiliza las API documentadas para los packs en lugar de depender de detalles privados de implementación.

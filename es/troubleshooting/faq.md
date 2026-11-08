# FAQ y notas legales

> API objetivo: 5 · Build objetivo: `v98qt8` (2026-11-08, producción y preprod) · Estado: Verified

## Preguntas frecuentes

### P. ¿Son los shader packs una función oficial?

La función de shader packs es accesible desde la interfaz del juego y crear paquetes parece una actividad prevista. Eso sí, no se ha encontrado documentación oficial pública — esta guía es un documento no oficial basado en análisis.

### P. ¿Pueden los paquetes hacer algo peligroso?

Los paquetes son WGSL puro — **la ejecución de JS y el acceso a red son imposibles por diseño**. Solo corre el código que pasa la validación y la compilación ([Restricciones](../api/restrictions.md)).

### P. ¿En qué juegos funcionan los paquetes?

La mayoría de los juegos corre en modo strict (sin animación de vértices, sin `discard`). La animación de vértices funciona solo en juegos de la lista allow. La lista por título está en [Interior del motor: política](../internals/policy.md).

### P. ¿Funcionan los paquetes en el móvil?

Solo en entornos con WebGPU ([Requisitos](../getting-started/requirements.md)).

### P. ¿Puedo distribuir mis propias texturas?

No en un shader pack (el atlas es de solo lectura). Eso es tarea del sistema de paquetes de texturas ([combinaciones](../guides/combinations.md)).

### P. ¿Puedo seguir usando un paquete de una versión antigua?

El juego actual solo acepta `apiVersion: 5`; los paquetes antiguos se desactivan en silencio ([Compatibilidad](../api/compatibility.md)). Migra vía el [Historial de versiones](../history/).

### P. ¿Cambiará la API de nuevo?

Las interioridades del motor pueden cambiar con las actualizaciones — cada página nombra su build objetivo. Los paquetes guardados se revalidan automáticamente cuando cambian la cabecera o el registro ([Compatibilidad](../api/compatibility.md#revalidación-de-paquetes-guardados-necesita-revisión)).

### P. ¿Y las distribuciones de «shader cinematográfico»?

Una distribución comunitaria de «cinematic shader» que analizamos resultó ser un paquete de texturas (texturas 128×128, sin `pack.json` / `.wgsl`). La mayoría de los looks «sombrío tipo shader» son artesanía del lado de las texturas ([combinaciones](../guides/combinations.md)).

## Legal y notas

- Esta es una guía no oficial y no representa las opiniones de los desarrolladores. La API puede cambiar sin previo aviso
- Creada con asistencia de IA; la exactitud no está garantizada. Verifícala contra el comportamiento real del juego
- Los valores medidos (ids de textura etc.) son instantáneas de builds concretos y cambian entre builds ([los nombres son la API](../api/texture-catalog.md#deriva-medida-cnty9--ab90qa))

## Relacionado

- [Entrada de la documentación](../) · [Historial de versiones](../history/)

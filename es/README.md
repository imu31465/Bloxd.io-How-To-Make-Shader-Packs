# Cómo crear paquetes de sombreadores (shader packs) para Bloxd.io (Guía completa)

Guía autocontenida para crear y distribuir paquetes de sombreadores para Bloxd.io (solo renderizador WebGPU).
Basada en la especificación de `apiVersion: 2`. La guía está dividida en un archivo por parte (este README es el índice; el recetario está en `recipes.md`). Los paquetes v1 no cargan en el juego actual (los valores v1 de `apiVersion` y los identificadores antiguos se rechazan). Para migrar desde v1, ver la Parte VIII (`apiv2.md`).

> Esta es una guía no oficial y no representa la postura de los desarrolladores. La API puede cambiar sin aviso.  
> Esta guía se creó con asistencia de IA; la exactitud no está garantizada. Verifica con el comportamiento real en el juego.  
> Última revisión: 2026-10-15 (orden de aplicación de niebla, ajustes reales de niebla y renderizado submarino verificados contra la implementación del motor). Como no se encontró una referencia oficial pública de la API WGSL, sigue verificando las descripciones y recetas con la pantalla de carga y la compilación en el juego.  
> La función de paquetes de sombreadores es una función oficial accesible desde la interfaz del juego, y los paquetes son WGSL puro  
> (sin ejecución de JS ni red), así que nada peligroso ocurre con código normal.

## Índice

- [Parte I: Crear paquetes](making.md)
- [Parte II: Referencia de la API](api.md)
- [Parte III: Recetario](recipes.md)
- [Parte IV: Guía de realismo](realism.md)
- [Parte V: Solución de problemas y notas](troubleshooting.md)
- [Parte VI: Notas importantes de implementación](implementation.md)
- [Parte VII: Suplemento de interioridades](internals.md)
- [Parte VIII: Guía de migración a API Version 2](apiv2.md)

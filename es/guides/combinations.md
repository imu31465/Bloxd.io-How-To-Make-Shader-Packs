# Combinar con otros paquetes cuando el sombreador solo llega a su límite



Como los paquetes no pueden añadir ni muestrear texturas, no intentes resolver bultos finos de material o imágenes del cielo solo con sombreadores. El repositorio público de paquetes de texturas para Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) maneja texturas, skybox, modelos, etc. por otra vía.

Como referencia, distribuciones comunitarias "cinematic shader" analizadas en un caso resultaron ser paquetes de texturas (texturas 128x128 sin `pack.json` / `.wgsl`).

En la práctica, **ajusta luz y color con sombreadores y cubre materiales y cielo con un paquete de recursos a juego**. Pero verifica el co-uso y el orden de carga según la implementación y ajustes del juego.

Los paquetes de texturas tienen su propia especificación (a título de referencia): el límite de tamaño es 25MB medido como la longitud de la cadena JSON codificada en base64; y codificar un PNG en base64 infla un +33%, así que el techo práctico en imágenes crudas queda en ~18–19MB. El CSS lo procesa un parser simple basado en regex — evita anidamientos y comentarios.

# Internas del registro de texturas

> API objetivo: 5 · Estado: Analyzed

Esta página explica cómo se resuelven los nombres de textura y cómo los referencian los shader packs. Para consultar los nombres disponibles para los autores de packs, ve al [Catálogo de texturas](../api/texture-catalog.md).

## Constantes con nombre

Los packs deben usar constantes con nombre en el formato `bloxdTextureId*`. Los nombres de textura se resuelven contra el registro al cargar el pack, por lo que no es necesario fijar IDs numéricos.

**Trata los nombres como la API; no dependas de los IDs numéricos.** La disposición del atlas y los IDs son detalles de implementación que pueden cambiar.

## Texturas animadas

Las texturas animadas se referencian mediante el nombre base de su familia, no mediante un número de fotograma. El motor selecciona el fotograma actual durante el muestreo, por lo que el pack no tiene que avanzar los fotogramas por su cuenta.

Las grafías de los fotogramas no son constantes con nombre independientes para uso general. Utiliza los nombres base del catálogo.

## Texturas giradas

La rotación de cada cara se aplica durante el muestreo. Los packs no necesitan seleccionar directamente las ranuras internas del atlas ya giradas.

## Notas de muestreo

- Elige nombres del [Catálogo de texturas](../api/texture-catalog.md).
- Evita depender de IDs numéricos o de la disposición interna del atlas.
- En general, deja que el proceso de muestreo del motor gestione la animación y la rotación de las caras.

## Relacionado

- [API de texturas](../api/texture-api.md) — `bloxdTexel` y constantes con nombre
- [Catálogo de texturas](../api/texture-catalog.md) — nombres de textura utilizables
- [Registro de investigación](research-log.md) — cómo interpretar las notas de investigación

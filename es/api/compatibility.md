# Compatibilidad

> API objetivo: 5 · Tipo: referencia de API

Esta página explica qué versiones de la API de shader packs acepta el juego actual y cómo se tratan los packs guardados para versiones anteriores.

## Versión de API aceptada

El juego actual solo acepta packs cuyo manifiesto contiene el valor numérico `5` en `apiVersion`. No se acepta la cadena `"5"`. Los packs creados para API v1–v4 deben migrarse antes de poder cargarse.

## Mensajes al cargar

- `pack.json needs "apiVersion": {{version}}.` — falta la clave `apiVersion`
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — la versión indicada no coincide con la actual

## Packs guardados de versiones anteriores

Un pack guardado para una versión anterior de la API no se ejecutará en el juego actual. La pantalla de ajustes de shader packs indica que el pack pertenece a una versión no compatible. Actualízalo siguiendo la guía de migración correspondiente.

## Revalidación de packs guardados

Los packs guardados se vuelven a validar cuando cambian los encabezados del motor o las definiciones de nombres de textura. La revalidación se realiza automáticamente al cargar el juego. En el código del pack, referencia las texturas mediante constantes con nombre, no mediante IDs numéricos que pueden cambiar.

## Compatibilidad del entorno

- **WebGPU:** los shader packs requieren un renderizador compatible con WebGPU.
- **Móviles:** los shader packs no están disponibles en entornos sin compatibilidad con WebGPU ([Requisitos](../getting-started/requirements.md)).
- **Acceso a texturas:** en las configuraciones del renderizador que no utilizan el atlas, `bloxdTexel` y `bloxdTextureSize` no ofrecen acceso normal a las texturas del atlas ([API de texturas](texture-api.md)).

## Compatibilidad de versiones de API

| Versión de API | Compatibilidad con el juego actual |
|---|---|
| v1 | Rechazada al cargar |
| v2 | Rechazada al cargar |
| v3 | Rechazada al cargar |
| v4 | Rechazada al cargar |
| **v5** | **Actual** |

## Relacionado

- [Migración de v4 a v5](../history/v5.md)
- [Historial de versiones](../history/)

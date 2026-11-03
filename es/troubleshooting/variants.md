# Problemas específicos de variantes

> API objetivo: 5 · Estado: Verified

Problemas que ocurren solo en algunas de las 6 variantes (`strict|allow` × `terrain|liquid|model`). v5 eliminó el eje de iluminación (la vieja `BLOXD_LIGHTING`) y el cargador valida **las 6 variantes a la vez** en la carga.

## Carga solo en juegos no strict / descartado en strict

- **Causa**: un hook de vértice sin guarda o un `discard` alcanzable; los juegos strict prohíben ambos y la infracción = **desactivación automática del paquete entero** (`shaderPack:offInStrict`)
- **Comprobación**: la pantalla del cargador muestra `<hook> moves terrain, which strict games prevent.` / `discard makes terrain see-through, which strict games prevent.`
- **Corrección**: envuelve los hooks de vértice y el `discard` en `#ifndef BLOXD_STRICT`
- **Prevención**: parte siempre de la plantilla con guarda para los hooks de vértice ([Variantes](../getting-started/variants.md))

## ".alpha is undefined"

- **Causa**: `alpha` existe solo tras `#ifdef BLOXD_ALPHA` (todo líquido + terreno/modelo no strict)
- **Corrección**: envuelve el código que toca alpha en `#ifdef BLOXD_ALPHA` ([Preprocesador](../api/preprocessor.md#matriz-de-macros--variantes))

## "BloxdVertex only exists when BLOXD_STRICT isn't defined"

- **Causa**: las variantes strict no tienen hooks de vértice en absoluto, así que tampoco `BloxdVertex`; el código de vértice es alcanzable desde variantes strict
- **Corrección**: guarda el hook de vértice

## bloxdOpaqueBehind falla solo en algunas variantes

- **Causa**: `BLOXD_SCENE_DEPTH` está definida solo en todas las variantes de líquido
- **Corrección**: `#ifdef BLOXD_SCENE_DEPTH` ([Errores de validación](validation.md))

## El agua ignora el paquete (Liquid)

- **Síntoma**: hooks de terreno escritos, agua sin cambios
- **Causa**: **en v5, si un paquete no define ningún hook de Liquid, tampoco corre ningún hook de Terrain sobre el agua** (el comportamiento pre-v4 de «el líquido cae en el terreno» ha desaparecido)
- **Corrección**: escribe hooks de Liquid ([reparto de hooks](../api/hooks.md#qué-dibuja-cada-programa))

## Modelos (entidades, modelos de bloque) sin efecto

- **Causa**: fuera de alcance antes de v5; ahora requiere hooks `bloxdModel*`
- **Corrección**: define `bloxdModelSurface` / `bloxdModelLight` ([Guía de modelos](../guides/models.md))

## Sobre la validación de 6 variantes

El cargador valida **las 6 variantes a la vez** en la carga (el eje de iluminación ya no se compila aparte). Aunque un juego use solo algunas condiciones, los paquetes distribuidos deben anticipar las seis.

| Variante | Macros definidas |
|---|---|
| `allow.terrain` | `BLOXD_ALPHA` |
| `allow.liquid` | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | `BLOXD_ALPHA` |
| `strict.terrain` | — |
| `strict.liquid` | `BLOXD_SCENE_DEPTH` |
| `strict.model` | — |

## Relacionado

- [Variantes](../getting-started/variants.md) · [Preprocesador](../api/preprocessor.md) · [Política](../internals/policy.md)

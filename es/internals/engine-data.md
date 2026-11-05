# Ledger de datos del motor

> API objetivo: 5 · Build objetivo: `bny9u` (2026-11-05; producción y preprod sirven el mismo bundle idéntico byte a byte) · Estado: Verified

El ledger de mediciones de esta documentación — cada valor confirmado, todo medido sobre el build objetivo vigente `bny9u`.

## El ledger

| Elemento | Valor |
|---|---|
| `apiVersion` | `5` (`===` estricto, número) |
| cabecera del motor | 8.954 B decodificados / 208 líneas (9.125 B tal como se distribuye, 6 interpolaciones). Primera línea `// The Bloxd shader pack API, apiVersion 5. Read-only, prepended to all packs.` — texto completo en [Cabecera del motor](engine-header.md) |
| hooks | 9 (terrain/liquid/model × vertex/surface/light). Nombres sin cambios; la plantilla por defecto incluye los 9 |
| variantes | 6 (strict × programa). Nombres `strict\|allow.terrain\|liquid\|model` — el eje de iluminación ha desaparecido |
| macros | `BLOXD_STRICT` (strict) · `BLOXD_ALPHA` (todo líquido + terreno/modelo no strict) · `BLOXD_SCENE_DEPTH` (todo líquido) · ~~`BLOXD_LIGHTING`~~ **eliminada** |
| uniform del paquete | `@group(3) @binding(0)`, 64 B: seconds@0, **lit@4 (u32, nuevo)**, renderOffset@16, sunDirection@32, eyePosition@48 |
| bindings del paquete | group 3: 0 uniform · 1 profundidad de escena (líquido) · 2 almacenamiento `bloxdSpTextureLayers` |
| flags | la estructura `BloxdFlags`, 14 bools; los valores de bits de v4 retirados |
| límites del cargador | 256 `.wgsl` / 256 KB de fuente / 64 KB `pack.json` / 32 MB zip / 1.024 entradas; UTF-8; un manifiesto; rutas únicas — todo sin cambios |
| registro de texturas | 1.210 entradas → **896 nombres utilizables**; deriva frente a cnty9 +1/−10 ([Registro de texturas](texture-registry.md)) → `xkg8x` (2026-11-04): 1.220 / **906** → `bny9u` (2026-11-05): 1.232 / **911 nombres utilizables** — +5 (Terminal de Intercambio ×3, Generador de Piedra ×2), 864 cambios de id |
| curva de luz | niveles 0–15 → 0–1, ease-out (`6 → 0.45`, `12 → 0.92`) — en la cabecera, sin cambios |
| curva de realce | `1 - (1 - x / (3 - 2x))^3` — sin cambios (actualmente chunk c9) |
| cono direccional | `0.12 / 0.65 / 0.62 / 0.95` — sin cambios (chunk c9) |
| color de niebla | `vec3f(183/255, 191/255, 195/255)` — sin cambios |
| nombres reservados | `/^bloxd/i` (sin distinguir mayúsculas) + los 46 símbolos `bloxdSp*` del motor ([Identificadores reservados](reserved-identifiers.md)) |
| HEADER_VERSION | `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` |
| títulos strict | todo salvo los 12 títulos allow de [Política](policy.md) (reenumerado en bny9u: 115 definiciones de juego, 28 entradas allow — los mismos 12 títulos) |
| constructores de cabecera/registro | módulo de cabecera 29815 en el chunk c56 (renumerado desde c55); en `bny9u` el constructor del registro es el módulo 29812 (chunks c52/c53/c54, módulo de datos 1351; en `xkg8x` era 30093 + 1391) |
| plantilla de paquete por defecto | chunk c122 (c116 en `xkg8x`, c124 en v4), 1.633 B |

## Disposición del bundle (para reinspectores)

El clúster del pipeline de sombreado: cargador (zip/manifiest/límites, módulo 32942) y constructor del registro c52–c54, validador/cabecera c56, WebGPU/codegen c57, niebla c9. **La plantilla de paquete por defecto es c122** (c116 en `xkg8x`, c124 en v4).

Nota sobre el formato de chunks: cada chunk es un módulo ES (`export const modules = {...}`) — c53 lleva los módulos de c52 y de c53 — así que la búsqueda de texto plano del bundle sigue teniendo sentido (el id de módulo `1371` vive en el array disperso de módulos de *main*, en ningún chunk).

El bundle principal ocupa 3,39 MB (+115 KB frente al build de v4); el mapa de chunks tiene 195 ids (188 emitidos, 7 huecos conocidos).

## Ledgers pasados

- v4 (cnty9, 2026-10-27) → [Historial de versiones: v4](../history/v4.md)
- v3 (3ymzdd, 2026-10-19) → [Historial de versiones: v3](../history/v3.md)

## Relacionado

- [Registro de investigación](research-log.md) · [Cabecera del motor](engine-header.md) · [Política](policy.md)

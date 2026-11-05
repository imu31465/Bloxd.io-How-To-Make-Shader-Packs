# Compilación de WGSL

> API objetivo: 5 · Build objetivo: `bny9u` · Estado: Analyzed (restaurado del bundle en vivo)

La segunda etapa de validación — la compilación real a través del compilador WGSL del navegador — y los stubs de validación de v5.

## Por qué dos etapas

La comprobación de tipos de la validación estática es incompleta, así que algunos errores solo afloran aquí (p. ej. requisitos de precedencia de operadores de WGSL como `mixing '*' and '^' requires parenthesis`). Los errores afloran en el juego con el nombre de la variante ([Errores de compilación](../troubleshooting/compilation.md)).

## Generación de stubs de validación

El motor sintetiza stubs para el código que pasó la validación estática (restaurado del módulo 29866):

- la tabla de stubs de tipos:

| Tipo | Valor stub |
|---|---|
| `bool` | `p.x > 0.0` |
| `f32` | `p.x` |
| `vec2f` | `p.xy` |
| `vec3f` | `p.xyz` |
| `vec4f` | `p` |
| `i32` / `vec2i` / `vec3i` / `vec4i` | `i32(p.x)` etc. |
| `u32` / `vec2u` / `vec3u` / `vec4u` | `u32(p.x)` etc. |

- las estructuras se construyen recursivamente — cada campo rellenado con valores stub (las estructuras anidadas recursan)
- los puntos de entrada sintetizados:

```wgsl
var<private> bloxdValidationP: vec4f;

fn <special fn>(<params>) -> <returns> {
    let p = bloxdValidationP;
    return <stub value>;
}

@vertex
fn bloxdValidateVertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    let p = vec4f(f32(i));
    let o = <vertexHook>(BloxdVertexIn(<stubs>));
    return vec4f(o.position, 1.0);
}

@fragment
fn bloxdValidateFragment(@builtin(position) p: vec4f) -> @location(0) vec4f {
    bloxdValidationP = p;
    let s = <surfaceHook or bloxdDefaultSurface>(BloxdSurfaceIn(<stubs>));
    let o = <lightHook or bloxdDefaultLight>(s, BloxdLightIn(<stubs>));
    return vec4f(o.colour, 1.0);
}
```

La validación literalmente compila «WGSL que llama a tus hooks con entradas stub» en el navegador, haciendo aflorar violaciones de sintaxis, tipos y características del lenguaje.

## Restauración de nombres en los mensajes de error

Al empalmar las llamadas de hooks, el motor conserva un mapeo de identificadores (`originalNames`). Los identificadores de los errores del navegador se mapean **de vuelta a tus nombres originales**, y `sourceOf(lineNum)` mapea los números de línea empalmados de vuelta a (archivo, línea) — lees los errores contra tu propio código, no contra el texto transformado.

## Revalidación en ejecución al unirse

`checkCompilation` corre en cada unión a un juego y de hecho compila cada material de terreno existente (más estricta que la comprobación de la pantalla de ajustes). Fallarla descarta el paquete para ese juego. La comprobación tiene un tiempo límite forzado de 60 segundos ([Rendimiento](../troubleshooting/performance.md)).

## Relacionado

- [Errores de compilación](../troubleshooting/compilation.md) · [Validación de sombreadores](shader-validation.md) · [Primeros pasos: validación](../getting-started/validation.md)

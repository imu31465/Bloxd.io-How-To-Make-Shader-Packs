# Pré-processador

> API alvo: 5 · Build alvo: `xkg8x` · Estado: Analyzed (restaurado do validador em produção)

A compilação condicional suporta apenas `#define NAME` (sem valor) / `#ifdef` / `#ifndef` / `#else` / `#endif`. O `#` vai no início da linha (dentro de funções tudo bem). A correspondência de nomes de flags não distingue maiúsculas de minúsculas; um nome errado em `#ifdef` faz a mensagem de erro listar o conjunto oficial.

## Macros definidas (3)

| Macro | Definida em | Uso típico |
|---|---|---|
| `BLOXD_STRICT` | variantes de jogo strict (strict.terrain / strict.liquid / strict.model) | `#ifndef BLOXD_STRICT` em volta de hooks vertex inteiros e de `discard` |
| `BLOXD_ALPHA` | variantes onde `BloxdSurface.alpha` existe — todo liquid + terrain/model não strict | envolver código que toca alpha |
| `BLOXD_SCENE_DEPTH` | todas as variantes liquid | envolver chamadas a `bloxdOpaqueBehind()` |

## Matriz de macros × variantes

| Variante | `BLOXD_STRICT` | `BLOXD_ALPHA` | `BLOXD_SCENE_DEPTH` |
|---|---|---|---|
| `allow.terrain` | – | ✓ | – |
| `allow.liquid` | – | ✓ | ✓ |
| `allow.model` | – | ✓ | – |
| `strict.terrain` | ✓ | – | – |
| `strict.liquid` | ✓ | ✓ | ✓ |
| `strict.model` | ✓ | – | – |

As diferenças terrain / liquid / model são **programas separados, não macros** — `#ifdef BLOXD_TERRAIN` não existe.

## Macros removidas

- **`BLOXD_LIGHTING`** — removida na v5. O estado de iluminação é uma questão de tempo de execução para [`bloxdLit()`](lighting.md#bloxdlit--a-porta), não um ramo de compilação. Usá-la faz a validação falhar com:

> *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

Padrão de migração da v4:

```wgsl
// v4 (falha na validação na v5)
#ifdef BLOXD_LIGHTING
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight { ... }
#endif

// v5 (migrado)
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    // ... processamento com iluminação ativada
}
```

## Exemplo

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // o terreno só tem alpha em allow
    out.alpha = s.alpha;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // hooks vertex sempre precisam desta guarda
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdSeconds()) * 0.05;
    return out;
}
#endif
```

## As macros moldam as structs

- `BloxdSurface.alpha` existe apenas dentro de `#ifdef BLOXD_ALPHA`
- `bloxdOpaqueBehind()` só pode ser chamada dentro de `#ifdef BLOXD_SCENE_DEPTH`

Veja [Estruturas](structures.md#campos-condicionais--macros).

## Relacionados

- [Primeiros passos: Variantes](../getting-started/variants.md) · [Interior do motor: Validação de shaders](../internals/shader-validation.md)

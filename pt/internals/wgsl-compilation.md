# Compilação de WGSL

> API alvo: 5 · Build alvo: `v98qt8` · Estado: Analyzed (restaurado do bundle em execução)

A segunda etapa de validação — a compilação real pelo compilador WGSL do navegador — e os stubs de validação da v5.

## Por que duas etapas

A verificação de tipos da validação estática é incompleta, então alguns erros só afloram aqui (p. ex. requisitos de precedência de operadores do WGSL como `mixing '*' and '^' requires parenthesis`). Os erros afloram no jogo com o nome da variante ([Erros de compilação](../troubleshooting/compilation.md)).

## Geração de stubs de validação

O motor sintetiza stubs para o código que passou na validação estática (restaurado do módulo 29866):

- a tabela de stubs de tipos:

| Tipo | Valor stub |
|---|---|
| `bool` | `p.x > 0.0` |
| `f32` | `p.x` |
| `vec2f` | `p.xy` |
| `vec3f` | `p.xyz` |
| `vec4f` | `p` |
| `i32` / `vec2i` / `vec3i` / `vec4i` | `i32(p.x)` etc. |
| `u32` / `vec2u` / `vec3u` / `vec4u` | `u32(p.x)` etc. |

- as structs são construídas recursivamente — cada campo preenchido com valores stub (structs aninhadas repetem a recursão)
- os pontos de entrada sintetizados:

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

A validação literalmente compila no navegador "WGSL que chama seus hooks com entradas stub", fazendo aflorar violações de sintaxe, tipos e recursos da linguagem.

## Restauração de nomes nas mensagens de erro

Ao injetar as chamadas de hooks, o motor mantém um mapeamento de identificadores (`originalNames`). Os identificadores nos erros do navegador são mapeados **de volta para os seus nomes originais**, e `sourceOf(lineNum)` mapeia os números de linha injetados de volta para (arquivo, linha) — você lê os erros contra o seu próprio código, não contra o texto transformado.

## Revalidação em tempo de execução ao entrar em um jogo

`checkCompilation` roda a cada entrada em um jogo e de fato compila todo material de terreno existente (mais estrita que a verificação da tela de configurações). Falhar descarta o pacote para aquele jogo. A verificação tem um tempo limite forçado de 60 segundos ([Desempenho](../troubleshooting/performance.md)).

## Relacionado

- [Erros de compilação](../troubleshooting/compilation.md) · [Validação de shaders](shader-validation.md) · [Primeiros passos: Validação](../getting-started/validation.md)

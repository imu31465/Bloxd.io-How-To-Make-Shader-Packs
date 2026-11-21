# Formato do pacote

O modelo inteiro de pacote em uma página só — manifesto, limites do carregador, uniform por frame. Para a versão passo a passo, veja [Primeiros passos](../getting-started/manifest.md).

## pack.json

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `apiVersion` | number | obrigatório | **deve ser estritamente igual a `5`** (`===`). Uma string `"5"` falha e é reportada com a sua grafia JSON |
| `name` | string | obrigatório | não vazio após o trim; exibido nos ajustes |
| `author` | string | opcional | deve ser uma string se presente |
| `keepCircleShadows` | boolean | opcional | mantém as antigas sombras circulares sob jogadores e mobs quando seus shaders também usam a API real de sombras solares ([Sombras](../guides/shadows.md)). Padrão `false`; qualquer outro tipo é rejeitado com mensagem dedicada |

Todo o resto do manifesto é ignorado. `pack.json` deve ser exatamente um objeto JSON na raiz do zip.

## Limites do carregador (remedidos no c53 em produção)

| Limite | Valor | Mensagem ao exceder |
|---|---|---|
| arquivos `.wgsl` por pacote | 256 | `The pack has more than 256 .wgsl files.` |
| código-fonte `.wgsl` total | 256 KB | `The pack's .wgsl files are over 256 KB in total.` |
| tamanho de `pack.json` | 64 KB | `pack.json is over 64 KB.` |
| tamanho do zip | 32 MB | `The zip is over 32 MB.` |
| entradas do zip | 1.024 | `The zip has more than 1024 entries.` |
| forma do zip | — | zip dividido / zip64 / criptografado / compressão não suportada, cada um rejeitado com a própria mensagem; todos os arquivos em UTF-8 válido; exatamente um `pack.json`; sem caminhos duplicados |

## Verificação da versão da API

O carregador compara `manifest.apiVersion !== 5` com o `!==` estrito de JavaScript. Mensagens de incompatibilidade: veja [Compatibilidade](compatibility.md).

## Uniform por frame: bloxdPackInputs

`@group(3) @binding(0) var<uniform> bloxdPackInputs: BloxdPackInputs` — continua com 80 bytes, mas a v5 adicionou um membro:

| Offset | Campo | Tipo | Nota |
|---|---|---|---|
| 0 | `seconds` | `f32` | sustenta `bloxdSeconds()` |
| 4 | `lit` | `u32` | 1 quando a iluminação de bloco/céu está ligada; sustenta `bloxdLit()` |
| 16 | `renderOffset` | `vec3i` | sustenta `bloxdRenderOffset()` |
| 32 | `sunDirection` | `vec3f` | sustenta `bloxdSunDirection()` |
| 48 | `eyePosition` | `vec3f` | sustenta `bloxdEyePosition()` |
| 64 | `shadowDirection` | `vec3f` | a direção em que viaja a luz que projeta sombras; respalda `bloxdShadowDirection()` |

`shadowDirection` coube no preenchimento após `eyePosition` (um `vec3f` ocupa 12 bytes, então os offsets 60–63 eram folga; `shadowDirection` pousa em 80, uma fronteira de 16 bytes, deixando o struct em exatamente 80 bytes). O engine o escreve com três `setFloat32` — é um vetor unitário (do sol de dia, da lua à noite, e do sol do céu padrão quando não há sol), nunca acima do horizonte. O uniform tem 80 bytes e o `minBindingSize` também é 80.

`lit` coube no preenchimento que o v4 já tinha entre `seconds` e `renderOffset`.

**Nunca referencie o uniform diretamente de um pacote.** Use-o por meio das funções de cabeçalho (`bloxdSeconds()` etc.). A visibilidade de estágios é VERTEX|FRAGMENT, então as funções de cabeçalho funcionam também a partir de funções de escopo de módulo e de hooks vertex.

## Layout do bind group

| binding | Conteúdo |
|---|---|
| 0 | uniform `bloxdPackInputs` (80 B) |
| 1 | textura de profundidade de cena (variantes liquid) |
| 2 | storage buffer `bloxdSpTextureLayers` |

`minBindingSize` continua 80. A textura de profundidade (binding 1) é FRAGMENT-only, e é por isso que `bloxdOpaqueBehind()` é exclusivo de hooks surface/light.

## Concatenação wgsl

Múltiplos arquivos `.wgsl` são concatenados em um único módulo em **ordem de dicionário pelo nome do caminho**. Declarações de escopo de módulo são independentes de ordem; só a ordem de inicialização de `var` pode importar. Arquivos que não são `.wgsl` são ignorados.

# Formato do pacote

> API alvo: 5 · Build alvo: `xkg8x` (verificado em produção 2026-11-04) · Estado: Verified (remedido no carregador em produção)

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

O carregador compara `manifest.apiVersion !== 5` com o `!==` estrito de JavaScript. A constante de versão `5` e o template do cabeçalho vivem no mesmo módulo (c55 / módulo 29836), então a validação e o cabeçalho que ela pressupõe se movem juntos. Mensagens de incompatibilidade: veja [Compatibilidade](compatibility.md).

## Uniform por frame: bloxdPackInputs

`@group(3) @binding(0) var<uniform> bloxdPackInputs: BloxdPackInputs` — continua com 64 bytes, mas a v5 adicionou um membro (do módulo de layout do uniform em produção):

| Offset | Campo | Tipo | Nota |
|---|---|---|---|
| 0 | `seconds` | `f32` | sustenta `bloxdSeconds()` |
| 4 | `lit` | `u32` | 1 quando a iluminação de bloco/céu está ligada; sustenta `bloxdLit()` |
| 16 | `renderOffset` | `vec3i` | sustenta `bloxdRenderOffset()` |
| 32 | `sunDirection` | `vec3f` | sustenta `bloxdSunDirection()` |
| 48 | `eyePosition` | `vec3f` | sustenta `bloxdEyePosition()` |

`lit` coube no padding que a v4 já tinha entre `seconds` e `renderOffset` (os offsets 4–15 eram vazios de alinhamento; `vec3i` precisa de alinhamento de 16 bytes, então `renderOffset` fica em 16). O tamanho total e todos os outros offsets permanecem inalterados. O motor o escreve com um único `setUint32(4, lit ? 1 : 0)` — é uma flag, não um nível de luz (os nomes do lado JS da v4 `terrainLightLevels` / `terrainHeldLight` sumiram do bundle por completo).

**Nunca referencie o uniform diretamente de um pacote.** Use-o por meio das funções de cabeçalho (`bloxdSeconds()` etc.). A visibilidade de estágios é VERTEX|FRAGMENT, então as funções de cabeçalho funcionam também a partir de funções de escopo de módulo e de hooks vertex.

## Layout do bind group

| binding | Conteúdo |
|---|---|
| 0 | uniform `bloxdPackInputs` (64 B) |
| 1 | textura de profundidade de cena (variantes liquid) |
| 2 | storage buffer `bloxdSpTextureLayers` |

`minBindingSize` continua 64. A textura de profundidade (binding 1) é FRAGMENT-only, e é por isso que `bloxdOpaqueBehind()` é exclusivo de hooks surface/light.

## Concatenação wgsl

Múltiplos arquivos `.wgsl` são concatenados em um único módulo em **ordem de dicionário pelo nome do caminho**. Declarações de escopo de módulo são independentes de ordem; só a ordem de inicialização de `var` pode importar. Arquivos que não são `.wgsl` são ignorados.

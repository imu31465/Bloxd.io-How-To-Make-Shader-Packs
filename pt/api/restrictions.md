# Restrições e nomes reservados

> API alvo: 5 · Build alvo: `ab90qa` · Estado: Verified (limites da v4 reconfirmados byte a byte na v5)

O que os pacotes podem escrever, e as regras completas de reserva de nomes.

## Permitido

- built-ins do WGSL (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select`, …)
- seus próprios `fn` / `struct` / `const` / `alias` / `var<private>`, `let` dentro de funções e fluxo de controle (if/for/while/switch…)
- derivadas (`dpdx` / `dpdy` / `fwidth`) apenas em hooks surface/light (estágio de fragmento) — não em hooks vertex
- arrays `const` (LUTs de cor etc.), ponteiros (`ptr<function, T>`), matrizes (`mat3x3f` etc.)
- definições de flags `#define NAME` (sem valor) + condicionais `#ifdef`

## Proibido / ressalvas

- **Sem texturas diretas**: você não pode declarar tipos `texture_*` / `sampler`; leituras do atlas passam apenas por [`bloxdTexel`](texture-api.md). *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*
- **`discard` é proibido em strict** — envolva em `#ifndef BLOXD_STRICT`
- `@attributes` / `enable` / `requires` / `override` são proibidos — não existe `enable f16;`, então **sem tipos f16**
- sem `@builtin`, então `fragCoord` / `vertex_index` são inacessíveis
- **sem `let` de escopo de módulo** — use `const` ou `var`
- sem `atomic`
- **nunca construa structs de saída diretamente**: `BloxdLight(...)` falha na validação estática; comece a partir de `bloxdDefault*`
- um simples `var x: BloxdSurface;` é um erro de validação
- parâmetros dos hooks são somente leitura — copie antes de modificar
- `#define` não recebe valor (apenas nomes)

## Nomes reservados

### O prefixo bloxd (regra geral)

**Todo identificador que corresponde a `/^bloxd/i` (sem distinguir maiúsculas de minúsculas) é reservado.** As únicas exceções são os 9 nomes de função de hook.

Redação do validador, verbatim:

> *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*

### O namespace bloxdSp* (46 símbolos)

Os 46 símbolos que o gerador de código pode injetar e que, portanto, não podem ser redeclarados:

`bloxdSpAcross` · `bloxdSpAt` · `bloxdSpBehind` · `bloxdSpCell` · `bloxdSpCellAt` · `bloxdSpCellIndex` · `bloxdSpColour` · `bloxdSpDdx` · `bloxdSpDdy` · `bloxdSpDown` · `bloxdSpEnchant` · `bloxdSpEye` · `bloxdSpFlags` · `bloxdSpFrame` · `bloxdSpIndex` · `bloxdSpInside` · `bloxdSpItemLocalPosition` · `bloxdSpLayer` · `bloxdSpLevel` · `bloxdSpLight` · `bloxdSpLightIn` · `bloxdSpLod` · `bloxdSpMipLevel` · `bloxdSpNormal` · `bloxdSpOut` · `bloxdSpOwnTexel` · `bloxdSpPixel` · `bloxdSpPosition` · `bloxdSpPositionW` · `bloxdSpQuarterTurns` · `bloxdSpScale` · `bloxdSpSceneDepth` · `bloxdSpSize` · `bloxdSpSurface` · `bloxdSpSurfaceIn` · `bloxdSpTexelUV` · `bloxdSpTexture` · `bloxdSpTextureId` · `bloxdSpTextureLayers` · `bloxdSpTextureRotation` · `bloxdSpTurned` · `bloxdSpUv` · `bloxdSpVertex` · `bloxdSpVertexIn` · `bloxdSpWord` · `bloxdSpZ`

Eles cobrem a entrega da struct de flags (`bloxdSpFlags`), as entradas de encantamento e locais de modelo (`bloxdSpEnchant` / `bloxdSpItemLocalPosition`), o caminho de pack de texturas com amostragem por célula, a cadeia de rotação e as variáveis locais de hooks estendidos. **A regra de reserva no nível do pacote é mais ampla do que esta lista** (tudo que corresponde a `/^bloxd/i`), então você não precisa memorizá-la — apenas nunca comece os seus próprios nomes com `bloxd`.

### Nomes de textura

Identificadores que começam com `bloxdTextureId` são resolvidos como constantes de nome de textura ([API de texturas](texture-api.md#bloxdtextureid-constantes-nomeadas-de-textura)).

## Reescritas automáticas

- **Inversão do sinal da derivada em Y**: o analisador reescreve toda chamada a `dpdy`, `dpdyCoarse` e `dpdyFine` como `(-dpdy(...))` (a família dpdy é explicitamente enumerada como o conjunto de inversão na passada de reescrita de tokens do validador). O y em espaço de tela aponta para baixo, então essa inversão faz a "taxa de variação para cima" corresponder à intuição. Escreva `dpdy(h)` com a intenção "como h muda conforme eu subo" e o código emitido carrega a inversão. `dpdx` e a família `fwidth` ficam intactos

## Diagnósticos que você realmente verá

- *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*
- *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*
- *"X reaches bloxdTexel, which only surface and light hooks can use."*
- *"X reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and Y doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH."*
- *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## Relacionados

- [Solução de problemas: compilação](../troubleshooting/compilation.md) · [Interior do motor: Validação de shaders](../internals/shader-validation.md)

# Validação de shaders

> API alvo: 5 · Build alvo: `ab90qa` · Estado: Analyzed (restaurado do validador em execução)

A validação estática (o analisador, etapa 1 da verificação de carregamento). Correções voltadas ao usuário: [Erros de validação](../troubleshooting/validation.md).

## As etapas

1. **Limites do carregador** (forma do zip / pack.json) → [Formato do pacote](../api/pack-format.md)
2. **Validação estática (analisador)** — esta página; sintaxe, tipos, nomes reservados, contratos de hooks nas 6 variantes
3. **Compilação real no navegador** → [Compilação de WGSL](wgsl-compilation.md)
4. **Revalidação em tempo de execução ao entrar em um jogo** — de fato compila todo material de terreno existente (mais estrita que a verificação da tela de configurações); falhar nela descarta o pacote para aquele jogo

## A tabela de assinaturas de funções especiais

O validador mantém uma tabela no módulo 29849 e verifica restrições de chamadas entre hooks:

```js
const Jq = new Map([
  ["bloxdFragmentBlockPosition", { params: "position: vec3f, normal: vec3f", returns: "vec3i", symbol: null, vertex: true }],
  ["bloxdOpaqueBehind", { params: "", returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }],
  ["bloxdTexel", { params: "textureId: u32, uv: vec2f, mipLevel: f32", returns: "vec4f", symbol: null }],
  ["bloxdTextureSize", { params: "mipLevel: f32", returns: "vec2u", symbol: null }],
]);
```

Lógica restaurada:

- chamar uma função especial não marcada `vertex: true` a partir de um hook de vertex → *"X reaches Y, which only surface and light hooks can use."*
- uma função com `symbol` (`bloxdOpaqueBehind` → `BLOXD_SCENE_DEPTH`) alcançada a partir de uma variante que não define essa macro → *"X reaches Y, which needs BLOXD_SCENE_DEPTH, and Z doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH."*

Nota: `bloxdFragmentBlockPosition` saiu da geração do cabeçalho, mas sua entrada permanece nesta tabela em execução — e a tabela é o que a verificação de identificadores consulta, então as chamadas continuam passando na validação. O gerador de código também continua injetando a definição (terreno/líquido e ambos os programas de modelo), então a função continua chamável na prática. Tratada como descontinuada: indocumentada, e pode ser removida em qualquer versão futura.

## Diagnósticos de nomes reservados

- **a regra geral `/^bloxd/i`**: *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*
- **declarações diretas de textura/sampler**: *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*

## Resolução e diagnóstico de nomes de textura

A resolução de `bloxdTextureId*` tem um caminho dedicado ([as mensagens](../api/texture-api.md#erros-de-resolução-de-nomes-verbatim-do-validador)):

- **dobramento**: divisão nos caracteres não alfanuméricos, CamelCase, prefixo com `bloxdTextureId`; a coincidência reversa não distingue caixa nem sublinhados
- **sugestões de grafia** (novo na v5): nomes sem correspondência recebem propostas de Levenshtein no limiar `max(2, floor(len/4)) + 1`
- mensagens dedicadas para grafias de quadro e grafias de cópia girada
- nomes ambíguos após o dobramento não podem ser usados

## Os novos diagnósticos da v5

- *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."* — nomeia a macro removida
- pacotes que leem `blockFlags` ou referenciam `bloxdBlockFlag*` falham no diagnóstico de nomes reservados — **nenhum pacote se comporta mal em silêncio**

## A reescrita da derivada em Y

A passada de reescrita de tokens do analisador reescreve toda chamada a `dpdy` / `dpdyCoarse` / `dpdyFine` para `(-dpdy(...))` (a família dpdy está explicitamente enumerada como o conjunto de inversão). `dpdx` e `fwidth` ficam intactas ([Restrições](../api/restrictions.md#reescritas-automáticas)).

## Geração de cabeçalho e constantes de textura

- o cabeçalho é anteposto em modo somente leitura ([Cabeçalho do motor](engine-header.md))
- o bloco `bloxdTextureId*` é gerado **por pacote** a partir dos nomes referenciados

## HEADER_VERSION

`HEADER_VERSION` é `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` (inteiro inicial 8 → 9 desde a v4). Os dois sufixos fnv1a32 dão a impressão digital do material do cabeçalho e do registro ordenado nome-id. A revalidação de pacotes salvos usa essa impressão digital para decidir "precisa de nova verificação" ([Compatibilidade](../api/compatibility.md#revalidação-de-pacotes-salvos-precisa-de-nova-verificação)).

## Stubs de validação

O código que passa na validação estática recebe código stub sintetizado antes da verificação real de WGSL do navegador: `var<private> bloxdValidationP: vec4f` mais `bloxdValidateVertex` / `bloxdValidateFragment` — a tabela de stubs de tipos (`bool` → `p.x > 0.0`, `vec3f` → `p.xyz`, …) constrói as structs de entrada e invoca os hooks. Detalhes: [Compilação de WGSL](wgsl-compilation.md).

## Relacionado

- [Erros de validação](../troubleshooting/validation.md) · [Compilação de WGSL](wgsl-compilation.md) · [Registro de texturas](texture-registry.md) · [Ledger de dados do motor](engine-data.md)

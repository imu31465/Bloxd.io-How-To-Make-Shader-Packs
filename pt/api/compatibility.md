# Compatibilidade

> API alvo: 5 · Build alvo: `ab90qa` (verificado em produção 2026-11-03) · Estado: Verified

Como o jogo atual e os pacotes de versões antigas interoperam.

## Versões aceitas

**Apenas `apiVersion: 5`.** O carregador compara `manifest.apiVersion !== 5` estritamente e pacotes v1/v2/v3/v4 **falham no instante do carregamento**. Não existe aceitação de múltiplas versões.

## Mensagens no momento do carregamento (verbatim do dicionário i18n em produção)

- `pack.json needs "apiVersion": {{version}}.` — a chave `apiVersion` está faltando
- `This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}.` — a chave existe, mas não é 5

## Pacotes antigos salvos (sem exceções — desativação silenciosa)

Pacotes v1–v4 salvos anteriormente não geram erro. O resultado do pacote salvo resolve para:

```
{kind: "none", reason: "otherApiVersion"}
```

e o pacote fica **silenciosamente inativo**. Só a aba de ajustes de pacotes de shaders explica o porquê:

> `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`

## A natureza da conversão v4 → v5

A conversão é majoritariamente mecânica (lista completa no [guia de migração para a v5](../history/v5.md)):

- `blockFlags & bloxdBlockFlagX != 0u` → `flags.x` (uma renomeação 1:1)
- `#ifdef BLOXD_LIGHTING` → `if (bloxdLit()) { ... } else { return bloxdDefaultLight(...); }`
- os pontos de chamada de `bloxdFragmentBlockPosition` ainda compilam (o motor o injeta), mas ele já não está documentado — migrar para fora dele é o caminho seguro ([Funções](functions.md#bloxdfragmentblockposition--indocumentada-mas-ainda-injetada))
- atualize o `pack.json` para `"apiVersion": 5`

A armadilha silenciosa desta vez: pacotes que continuam lendo `blockFlags` ou envolvendo hooks de luz em `#ifdef BLOXD_LIGHTING` **falham na validação com mensagens dedicadas** (o analisador agora explica os dois casos), então nada se comporta mal em silêncio — eles apenas continuam recusados até serem migrados.

## Revalidação de pacotes salvos ("precisa de nova verificação")

`HEADER_VERSION` é `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` (o inteiro inicial passou do 8 da v4 para 9). Quando o cabeçalho do motor ou o registro de texturas muda (comum com atualizações do jogo), os pacotes salvos são marcados como "precisa de nova verificação" e revalidam automaticamente no carregamento da página.

Um exemplo medido do movimento do registro (duas builds, 10 dias de distância): entradas 1200 → 1219 (98 adicionadas, 79 removidas) e, dos nomes que mantiveram a grafia, **779 de 1121 mudaram de id**. Em outras palavras:

- **pacotes escritos com nomes (`bloxdTextureIdLava`) sobrevivem à deriva** (o carregador os resolve de novo contra o registro em produção)
- **pacotes escritos com ids brutos (`19`) quebram na revalidação**

Detalhes: [Interior do motor: Registro de texturas](../internals/texture-registry.md).

## Ambientes de execução

- **Somente renderizador WebGPU**: instalar um pacote força a ativação do renderizador WebGPU
- **Celular**: ambientes com WebGPU limitado não conseguem executar pacotes de forma alguma ([Requisitos](../getting-started/requirements.md))
- **Configurações de renderizador sem atlas**: `bloxdTexel` / `bloxdTextureSize` degradam para stubs (texels brancos, 1×1); o código ainda compila e roda ([API de texturas](texture-api.md#onde-a-api-de-texturas-não-pode-chegar))

## Resumo de suporte a versões

| Versão da API | Em produção desde | Tratamento pelo jogo atual |
|---|---|---|
| v1 | — | rejeitado no carregamento (migre pela [v2](../history/v2.md)) |
| v2 | — | rejeitado no carregamento |
| v3 | 2026-10-19 | rejeitado no carregamento |
| v4 | 2026-10-26 | rejeitado no carregamento |
| **v5** | **2026-11-03** | **atual** |

## Relacionados

- [Lista de verificação de migração para a v5](../history/v5.md) · [Histórico de versões](../history/)

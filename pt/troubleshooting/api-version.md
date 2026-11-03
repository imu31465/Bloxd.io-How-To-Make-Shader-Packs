# Erros de versão de API

> API alvo: 5 · Build alvo: `ab90qa` (verificado em produção 2026-11-03) · Estado: Verified (literal, do dicionário i18n em produção)

Erros em torno de `apiVersion`. O jogo atual aceita **apenas `5`**.

## "pack.json needs "apiVersion": {{version}}."

- **Sintoma**: esta mensagem logo após o carregamento (`loadNoApiVersion`)
- **Causa**: a chave `apiVersion` falta por completo
- **Correção**: adicione `"apiVersion": 5` — um **número** (a string `"5"` falha)
- **Prevenção**: comece pelo template de [pack.json](../getting-started/manifest.md)

## "This pack is shader pack API version {{packVersion}}. Bloxd supports version {{version}}."

- **Sintoma**: `loadWrongApiVersion`
- **Causa**: o `apiVersion` existe, mas não é 5 (um pacote v1–v4)
- **Correção**: aplique a migração correspondente ([Histórico de versões](../history/)):
  - v4 → v5: [o guia da v5](../history/v5.md) — quase tudo mecânico (flags · `bloxdLit()` · a ressalva de `bloxdFragmentBlockPosition`)
  - v3 → v5: aplique primeiro a [v4](../history/v4.md)
  - v2 ou anterior → v5: percorra v3 → v4 → v5
- **Prevenção**: após qualquer atualização da API, consulte [Compatibilidade](../api/compatibility.md) e o guia de migração correspondente

## A string "5" é rejeitada

- **Causa**: o carregador compara `manifest.apiVersion !== 5` **estritamente** (`===`); uma string JSON `"5"` não é o número 5
- **Correção**: `"apiVersion": 5` (sem aspas)

## Um pacote antigo salvo parou de funcionar em silêncio

- **Sintoma**: um pacote v1–v4 que antes funcionava não responde, sem exceção nenhuma
- **Causa**: pacotes salvos resolvem para `{kind: "none", reason: "otherApiVersion"}` e ficam **inativos em silêncio**
- **Verificação**: a linha de status da aba de configurações: `This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it.`
- **Correção**: carregue um substituto migrado a partir da mesma tela
- **Prevenção**: após atualizações da API, republique uma versão com número elevado e anuncie-a ([Distribuição](../getting-started/distribution.md))

## Um pacote v4 migrado falha na validação

Os três padrões típicos (passos completos no [guia de migração para a v5](../history/v5.md)):

| Mensagem de validação | Causa | Correção |
|---|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | uso de `#ifdef BLOXD_LIGHTING` | reescreva como `if (bloxdLit()) { ... } else { return bloxdDefaultLight(s, l); }` |
| `bloxdBlockFlagRock isn't part of the shader pack API...` (diagnóstico de nome reservado) | referências remanescentes a constantes de bits | use `surface.flags.rock` etc. (tabela 1:1 em [Flags](../api/flags.md)) |
| `bloxdFragmentBlockPosition` ausente | fora do cabeçalho documentado desde a v5 (ainda injetado e aceito — veja [Funções](../api/functions.md)) | não é um erro a corrigir: compila; prefira `flags` / `bloxdWorldPosition()` em código novo |

## Relacionado

- [Compatibilidade](../api/compatibility.md) · [Histórico de versões](../history/) · [pack.json](../getting-started/manifest.md)

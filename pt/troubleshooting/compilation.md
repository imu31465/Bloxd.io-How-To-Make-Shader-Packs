# Erros de compilação

> API alvo: 5 · Estado: Verified

Erros que passam pela validação estática mas falham como WGSL, ou falham apenas no compilador WGSL do navegador (etapa 2).

## "bloxdTerrainVertex must be declared as: fn ..."

- **Causa**: incompatibilidade de assinatura do hook (tipos de argumento/retorno)
- **Correção**: reescreva conforme a declaração mostrada na mensagem (nomes de parâmetros são livres; os tipos devem corresponder exatamente)
- **Prevenção**: comece pela [tabela comparativa de hooks](../api/hooks.md)

## "mixing '*' and '^' requires parenthesis (only in ...)"

- **Causa**: o WGSL exige parênteses ao misturar `^` `&` `|` `<<` `>>` com outros operadores
- **Correção**: coloque parênteses nos operandos

## "... can only be a function's parameter or return type, ..."

- **Causa**: `var x: BloxdSurface;` — declarações nuas com anotação de tipo são rejeitadas porque as structs do cabeçalho ganham campos
- **Correção**: `var out = bloxdDefaultSurface(s);` (ou `var out = s;` em hooks light)
- **Prevenção**: construa sempre as saídas a partir de `bloxdDefault*` ([convenções](../api/structures.md#convenções-de-escrita-recapitulação))

## "_ can only be the target of a phony assignment, as in _ = f();"

- **Causa**: `let _ = f();` é WGSL inválido
- **Correção**: escreva `_ = f();`

## "Lite: …reads scene depth on a page that didn't turn it on"

- **Causa**: um pacote leitor de profundidade (`bloxdOpaqueBehind`) estava ativo quando a página foi gerada; a disponibilidade de profundidade é decidida na geração da página
- **Correção**: recarregue a página com o pacote ativo

## O sinal de dpdy parece invertido

- **Isto é por design**: o analisador reescreve automaticamente toda chamada `dpdy` / `dpdyCoarse` / `dpdyFine` para `(-dpdy(...))` (o y do espaço de tela aponta para baixo)
- **Correção**: nada — escreva `dpdy(h)` com a intenção "como h muda ao subir" e o código emitido carrega a inversão ([Restrições](../api/restrictions.md#reescritas-automáticas))
- `dpdx` e `fwidth` ficam intactas

## O pacote é descartado ao entrar em um jogo / a verificação no dispositivo nunca termina

- **Causa**: a verificação no dispositivo falhou, ou atingiu o timeout forçado de 60 segundos (`skipped`) — comum em dispositivos de baixo desempenho e mundos pesados
- **Correção**: reduza o trabalho pesado de vértices e os loops complexos; veja [Desempenho](performance.md)

## Relacionado

- [Erros de validação](validation.md) · [Interioridades do motor: compilação de WGSL](../internals/wgsl-compilation.md) · [Restrições](../api/restrictions.md)

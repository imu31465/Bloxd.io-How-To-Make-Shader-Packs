# Distribuição

> API alvo: 5 · Estado: Verified

## Formato de lançamento

1. Zip com `pack.json` na raiz, dentro dos limites de tamanho ([Estrutura do pacote](pack-structure.md))
2. Verifique que `pack.json` fique na raiz do zip (uma única pasta raiz comum é removida automaticamente)
3. Dê polimento em `name` / `author` para o lançamento

## Lista de verificação pré-lançamento

- [ ] `apiVersion: 5` (número, não string)
- [ ] Todas as 6 variantes passam na validação (lista de erros vazia na tela do carregador)
- [ ] Verificado visualmente tanto em um jogo allow quanto em um jogo strict
- [ ] Pacotes com animação de vértices / `discard` claramente marcados como somente allow
- [ ] Jogos testados e data anotados nas notas de lançamento (builds mudam)

## Depois do lançamento

- Pacotes salvos por jogadores são revalidados automaticamente quando o cabeçalho do motor ou o registro de texturas muda com uma atualização do jogo
- **Pacotes distribuídos como v1–v4 ficam silenciosamente inativos** na v5 (veja [pack.json](manifest.md)) — jogadores só veem a linha de estado, então publique e anuncie uma versão atualizada
- Quando a API for atualizada, siga as etapas de migração do [Histórico de versões](../history/), incremente a versão e lance novamente

# Validação

> API alvo: 5 · Build alvo: `v98qt8` (verificado em produção em 2026-11-08) · Estado: Verified

## A verificação de carga em 3 etapas

1. **Limites do carregador** — tamanho, forma, validade do manifesto (veja [Estrutura do pacote](pack-structure.md))
2. **Validação estática (analisador)** — sintaxe, tipos, nomes reservados, contrato strict, em todas as 6 variantes
3. **Compilação WebGPU real no navegador** — a checagem de tipos da validação estática é incompleta, então alguns erros só aparecem aqui

Para ler cada erro, veja [Solução de problemas](../troubleshooting/) (organizado por sintoma).

## Procedimento

1. Carregue o zip ou a pasta a partir de configurações → Shader Pack
2. Confira o estado: "Ready. Reload the page to use it." logo após selecionar; **depois de um recarregamento da página**, "Ready to use" significa sucesso
3. Diante de "Saved, but it won't run until you fix these errors...", corrija os erros listados (arquivo:linha + variante) e recarregue
4. Teste primeiro em um jogo permissivo, depois em um jogo em modo strict (a maioria dos jogos). Animação de vértices funciona somente em jogos allow
5. Substituir um pacote recarrega a partir da mesma tela; mudanças precisam de recarregamento da página
6. Remova com Remove Pack. Depois de atualizações do jogo, pacotes salvos são revalidados automaticamente no carregamento da página (mudanças de cabeçalho/registro os marcam como "precisa de nova verificação")

## Lista de verificação de testes no dispositivo

Veja o [guia de testes](../guides/testing.md) para a lista de verificação completa e a lista integral de fatores que mudam o que um pacote vê.

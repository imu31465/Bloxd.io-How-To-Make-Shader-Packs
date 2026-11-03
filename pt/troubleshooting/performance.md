# Desempenho

> API alvo: 5 · Estado: Verified

Problemas de velocidade e suas correções.

## A verificação no dispositivo nunca termina e derruba o pacote

- **Causa**: a verificação tem um **timeout forçado de 60 segundos** (o excesso é tratado como `skipped`) — comum em dispositivos de baixo desempenho e mundos pesados
- **Correção**: reduza o trabalho pesado de vértices e os loops complexos, e tente novamente
- **Prevenção**: siga o [guia de desempenho](../guides/performance.md)

## A taxa de quadros cai

- **Verificação**: compare os FPS com e sem o pacote; meça separadamente cenas pesadas de terrain e água
- **Causas típicas**: efeitos pesados em toda face, incondicionalmente (sem seleção por flag/distância); ruído de hash de alta frequência; expoentes grandes de `pow`
- **Correções** ([o guia](../guides/performance.md)):
  - restrinja efeitos às faces que precisam deles via `flags`
  - saia cedo por distância (`distance(surface.position, bloxdEyePosition())`)
  - amostre um mip acima para leituras `bloxdTexel` mais baratas
- **Prevenção**: adicione detalhe incrementalmente e compare os FPS ([testes](../guides/testing.md))

## Lento apenas no celular

- **Causa**: pacotes rodam no renderizador WebGPU; GPUs móveis podem ser dezenas de vezes mais lentas que as de desktop
- **Correção**: reduza força/frequência dos efeitos, fortaleça o corte por distância — ou marque claramente o celular como não suportado ([Requisitos](../getting-started/requirements.md))

## Aproximando-se do limite de 256 KB do pacote

- **Correção**: corte comentários, fatore código compartilhado em funções, descarte receitas não usadas ([Estrutura do pacote](../getting-started/pack-structure.md))

## Relacionado

- [Guia de desempenho](../guides/performance.md) · [Testes](../guides/testing.md)

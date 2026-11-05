# FAQ e notas legais

> API alvo: 5 · Build alvo: `bny9u` (2026-11-05, produção) · Estado: Verified

## Perguntas frequentes

### P. Pacotes de shaders são um recurso oficial?

O recurso de pacotes de shaders é acessível pela interface do jogo, e criar pacotes parece ser uma atividade intencional. Porém, nenhuma documentação oficial pública foi encontrada — este guia é um documento não oficial, baseado em análise.

### P. Pacotes podem fazer algo perigoso?

Pacotes são WGSL puro — **execução de JS e acesso à rede são impossíveis por design**. Só roda o código que passa pela validação e pela compilação ([Restrições](../api/restrictions.md)).

### P. Em quais jogos os pacotes funcionam?

A maioria dos jogos roda em modo strict (sem animação de vértices, sem `discard`). Animação de vértices funciona apenas em jogos da lista allow. A lista por título está em [Interioridades do motor: política](../internals/policy.md).

### P. Pacotes funcionam no celular?

Apenas em ambientes com capacidade de WebGPU ([Requisitos](../getting-started/requirements.md)).

### P. Posso distribuir minhas próprias texturas?

Não em um pacote de shaders (o atlas é somente leitura). Isso é trabalho do sistema de pacotes de texturas ([combinações](../guides/combinations.md)).

### P. Posso continuar usando um pacote de versão antiga?

O jogo atual aceita apenas `apiVersion: 5`; pacotes antigos são desativados em silêncio ([Compatibilidade](../api/compatibility.md)). Migre pelo [Histórico de versões](../history/).

### P. A API mudará de novo?

As interioridades do motor podem mudar com as atualizações — cada página nomeia a sua build alvo. Pacotes salvos são revalidados automaticamente quando o cabeçalho ou o registro muda ([Compatibilidade](../api/compatibility.md#revalidação-de-pacotes-salvos-precisa-de-nova-verificação)).

### P. E as distribuições de "cinematic shader"?

Uma distribuição comunitária de "cinematic shader" que analisamos acabou sendo um pacote de texturas (texturas 128×128, sem `pack.json` / `.wgsl`). A maioria dos looks "sombrios tipo shader" é artesanato do lado das texturas ([combinações](../guides/combinations.md)).

## Jurídico e notas

- Este é um guia não oficial e não representa as opiniões dos desenvolvedores. A API pode mudar sem aviso
- Criado com assistência de IA; a exatidão não é garantida. Verifique contra o comportamento real no jogo
- Valores medidos (ids de textura etc.) são fotografias de builds específicas e mudam entre builds ([nomes são a API](../api/texture-catalog.md#deriva-medida-cnty9--ab90qa))

## Relacionado

- [Entrada da documentação](../) · [Histórico de versões](../history/)

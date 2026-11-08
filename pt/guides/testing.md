# Lista de verificação de testes no jogo

> API alvo: 5 · Build alvo: `v98qt8` (2026-11-08, produção e preprod) · Estado: Verified (portado para a API atual — reverificação no dispositivo recomendada)

Sucesso de compilação e "boa aparência" são coisas diferentes. Verifique nesta ordem:

1. **Carregamento:** o `pack.json` fica na raiz do ZIP. Logo após a seleção, aparece `Ready. Reload the page to use it.` e o pacote fica ativo **ao recarregar a página**; confirme `Ready to use` em seguida. Pacotes salvos são revalidados automaticamente no próximo carregamento da página: sempre que o cabeçalho de spec do lado do motor atualiza, o conteúdo do cabeçalho é verificado por impressão digital (passou = permanece como está / falhou = mostrado como bloqueado), então um pacote antigo quebrado nunca fica silenciosamente ativo.
2. **6 variantes:** sem omissões de guardas de tipos em strict / allow, iluminação on / off, terreno / líquido. Mesmo que um jogo use só algumas condições, pacotes de distribuição devem assumir as 8.
3. **Dia:** cores sem estourar por material (grama, pedra, areia, madeira); divisão claro/escuro natural entre topos e laterais.
4. **Noite:** compare os mesmos materiais na luz do dia anterior, nas sombras e perto de tochas. Se só restarem faces iluminadas, ajuste a atenuação de exposição; se tudo estiver escuro, ajuste a proteção de luz local.
5. **Água:** olhe de cima, em ângulos rasantes, margens, debaixo d'água e de noite separadamente. O comportamento do alpha e os looks submarinos dependem da composição do jogo — nunca julgue a partir de um único ponto de vista. Debaixo d'água, o véu de definição líquida cobre na frente (veja [O que pacotes de shaders podem e não podem fazer](constraints.md#realidade-submarina)), então as diferenças do pacote aparecem principalmente na superfície e no terreno através do véu.
6. **Bordas e distância:** sem ondas/padrões estourando em transições de chunk / origem; sem névoa dupla nem bruma branca ao longe.
7. **Desempenho:** efeitos pesados em chamadas de hash/trig/`pow` por fragmento devem ser mínimos. Adicione detalhe gradualmente e compare FPS.

## Restrições conhecidas como premissas

- Pacotes de shaders se limitam aos hooks de terreno / líquido — sem tratamento de céu, entidades ou UI com o mesmo código.
- Não existem entradas para adicionar mapas de sombras, reflexos em espaço de tela, refração, bloom etc. (a profundidade de cena é desbloqueada só para líquidos como `bloxdOpaqueBehind()` — veja [Funções](../api/functions.md)).
- `bloxdSeconds()` é tempo de animação sem vínculo garantido com o dia/noite do jogo.
- Com `bloxdSunDirection()` zero, a verdadeira direção da lua é desconhecida — não é "física de luar", mas uma aproximação de ambiente. O luar direcional pode ser construído a partir de `-bloxdSunDirection()` (apenas mundos com ciclo dia/noite — [O sol e a lua](../internals/sun-and-moon.md)).
- `s.position` / `l.position` são coordenadas locais, então some `bloxdRenderOffset()` para efeitos dependentes do mundo. Para padrões locais ao bloco, as coordenadas locais são intencionalmente a ferramenta.

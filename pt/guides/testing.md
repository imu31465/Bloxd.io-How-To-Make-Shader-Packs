# Lista de testes no jogo



Sucesso de compilação e "boa aparência" são coisas distintas. Confira nesta ordem:

1. **Carga:** `pack.json` na raiz do ZIP. Logo após a seleção aparece `Ready. Reload the page to use it.` e o pacote fica ativo **ao recarregar a página**; confirme `Ready to use` depois. Pacotes salvos são revalidados automaticamente no próximo carregamento da página: a cada atualização do cabeçalho de spec no motor, o conteúdo do cabeçalho é verificado por impressão digital (sucesso = permanece como está / falha = mostrado bloqueado), então um pacote antigo quebrado nunca fica silenciosamente ativo.
2. **6 variantes:** sem omissões de guardas de tipos em strict / allow, iluminação on / off, terreno / líquido. Mesmo que um jogo só use algumas condições, pacotes de distribuição devem assumir as 8.
3. **Dia:** cores sem estourar por material (grama, pedra, areia, madeira); salto claro/escuro natural entre topos e laterais.
4. **Noite:** compare os mesmos materiais à plena luz passada, sombras e perto de tochas. Se só restam faces iluminadas, ajuste a atenuação de exposição; se tudo escurece, ajuste a proteção de luz local.
5. **Água:** olhe de cima, ângulos rasantes, margens, debaixo d'água e de noite separadamente. O comportamento alpha e o visual submarino dependem da composição do jogo — nunca julgue de um só ponto de vista. Debaixo d'água o véu de definição líquida cobre na frente (como descrito na [Parte VII](../internals/)): as diferenças do pacote aparecem sobretudo na superfície e no terreno através do véu.
6. **Bordas e distância:** sem saltos de ondas/padrões em transições de chunk / origem; sem névoa dupla nem bruma branca longe.
7. **Desempenho:** efeitos pesados em hash/trig/`pow` por fragmento no mínimo. Adicione detalhe aos poucos e compare FPS.

## Restrições conhecidas como premissas

- Pacotes se limitam a hooks de terreno / líquido — sem trato de céu, entidades ou UI com o mesmo código.
- Não existem entradas para adicionar mapas de sombras, reflexos em espaço de tela, refração, bloom etc. (a profundidade de cena foi desbloqueada limitada a líquidos como `bloxdOpaqueBehind()`. Ver [Parte VIII](../history/v2.md)).
- `bloxdSeconds()` é tempo de animação sem vínculo garantido com o dia/noite do jogo.
- Com `bloxdSunDirection()` zero a verdadeira direção lunar é desconhecida, não "física de luar" mas aproximação de ambiente. O luar direcional se constrói desde `-bloxdSunDirection()` (só mundos com ciclo dia/noite. [Parte VII](../internals/) R-A).
- `s.position` / `l.position` são coordenadas locais: some `bloxdRenderOffset()` para efeitos dependentes do mundo. Para padrões locais do bloco, as coordenadas locais são a ferramenta intencional.

# Desempenho

> API alvo: 5 · Build alvo: `v98qt8` · Estado: Verified (prática baseada em medições)

Os hooks do pacote rodam em cada fragmento (todos os pixels de terreno / líquido / modelo), então escolhas de estilo movem a taxa de quadros de forma significativa.

## Primeiros fatos

- **O hook de light é o estágio final**: ele roda para cada pixel desenhado de terreno, líquido e modelo — a maior parte da tela
- **Pacotes rodam em WebGPU**: avalie o custo assumindo uma faixa de GPUs, incluindo dispositivos móveis
- O teto de tamanho do carregador (256 KB de `.wgsl`) é também um teto prático **de compilação**

## Escada de custos (barato → caro)

| Operação | Custo | Nota |
|---|---|---|
| `mix` / `clamp` / aritmética | ◎ mínimo | |
| leituras de entrada (`l.skyLight`…) | ◎ | originadas de uniform/atributo de vértice |
| `smoothstep` / `pow` | ○ | `pow` varia conforme o expoente |
| `sin` / `cos` | ○ | base de animação |
| `dot` / `normalize` | ○ | |
| `bloxdTexel()` (amostragem de textura) | △ | mais barato em mips mais altos |
| `dpdx` / `dpdy` / `fwidth` | △ | só hooks de surface/light |
| ramificações (`if`) | △ | o WGSL pode avaliar ambos os lados; condições aproximadamente uniformes (checagens de flags) são baratas |
| ruído por hash (muitos `sin`/`fract`) | △ | limite efeitos de micro-relevo por distância |

## Prática

1. **Limite os efeitos às faces que precisam deles** — a seleção por `flags` vence "+20% em toda parte"
2. **Abandone detalhe com a distância** — saia cedo quando `distance(surface.position, bloxdEyePosition())` superar um limiar
3. **Use os mips** — `bloxdTexel(id, uv, mipLevel + 1.0)` é uma média a ¼ de resolução ([exemplos práticos](../api/texture-api.md#exemplos-resolvidos))
4. **Prefira hooks de surface para retoques de cor** — o hook de light é o estágio final sobre todos os pixels
5. **Adicione detalhe de forma incremental e compare FPS** ([testes](testing.md))
6. **As guardas `#ifdef` não economizam tempo de execução** — as variantes são unidades de compilação; a economia em tempo de execução vem de flags e distância

## Medição

- Compare o FPS com e sem o pacote pelas ferramentas de desenvolvedor do navegador (painel de desempenho / estatísticas de WebGPU)
- Meça separadamente cenas carregadas de terreno (floresta rica em sombras) e água (hooks de líquido)
- Verifique o hardware móvel — ele pode ser dezenas de vezes mais lento

## Relacionado

- [Testes](testing.md) · [Pipeline de renderização](../internals/rendering-pipeline.md) · [API de texturas](../api/texture-api.md)

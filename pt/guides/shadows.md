# Sombras

> API alvo: 5 · Build alvo: `xkg8x` · Estado: Verified (comportamento do LightEngine inalterado desde a medição da v4)

As três formas de fazer "sombras" num pacote de shaders, e seus limites.

## Pode / não pode

| Efeito | Possível? | Como |
|---|---|---|
| Escurecer claramente sob árvores/telhados (estilo projetado) | ◎ | inversão do lift de `skyLight` + corte por limiar (abaixo) |
| Sombras que acompanham edições de blocos em tempo real | ◎ | o LightEngine recalcula imediatamente — automático |
| Sombras coloridas frias / áreas ao sol quentes | ◎ | deslocamento em duas cores |
| Sombras girando com o sol (mapa de sombras) | ✕ | a profundidade é exclusiva de líquidos; a oclusão por raios de luz não é uma entrada |
| Penumbra física | ✕ | limitada pela dispersão BFS em resolução de voxel |
| AO em tempo real (SSAO) | ✕ | só o AO cozido nas cores de vértice |

## skyLight é um mapa de sombras por voxel

`l.skyLight` não é apenas um parâmetro de brilho. O LightEngine do mesher calcula, ao estilo Minecraft, **dados de oclusão por voxel de "esta posição vê o céu?" — um mapa de sombras**:

1. **Varredura de colunas**: cada coluna (x,z) de cima para baixo; a luz do céu começa em 15, chega a 0 nos blocos opacos e é atenuada por `lightFilter` (ar 1 / água 3 / opaco 15)
2. **Preenchimento por inundação BFS**: espalha-se horizontalmente aos 6 vizinhos (-1 por bloco) — isto suaviza as bordas de sombra. Sob um oclusor de raio r o valor cru é (15-r)/15
3. blockLight (tochas) é um BFS separado, RGB de 3 canais (empacotado em 4 bits)

Sob árvores, telhados e dentro de construções o valor já é baixo e interpola suavemente por vértice. Colocar ou quebrar um bloco recalcula imediatamente — **sombras que acompanham em tempo real**.

## A armadilha da curva de lift

`l.skyLight` chega **pós-curva de lift** (`y = 1-(1-x/(3-2x))³`, uma curva S que eleva os valores escuros):

| Lugar | Voxel cru | Liftado (= l.skyLight) | pow(·, 5.0) |
|---|---|---|---|
| céu aberto | 1.00 | 1.00 | 1.00 |
| sob árvore (raio 2) | 0.87 | **0.97** | **0.86** ← quase mantido |
| raio 3 | 0.80 | **0.92** | 0.66 |
| raio 5 | 0.67 | 0.78 | 0.29 |

**Esta é a causa raiz comprovada de "gama não escurece as sombras"** — mesmo γ=5 só leva o 0.97 de sob árvore a 0.86.

## A correção: inversão do lift + corte por limiar

A curva é monótona e se inverte exatamente: `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Restaure o valor cru e então binarize com um **limiar `smoothstep`**. A dispersão BFS do LightEngine é "-1 por bloco adjacente", então `th = 1 - r/15` é diretamente o ajuste de "raio de oclusão contado como sombra".

A implementação completa (porta solar + separação quente/frio + passagem de blockLight) está em [receitas de realismo](../recipes/realism.md). Passos-chave:

```wgsl
// 1. restaure o valor cru (pular isto significa que as sombras nunca aparecem)
let skyRaw = sh_unlift(l.skyLight);
// 2. corte por limiar — ao sol 1 / sombra 0
let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
// a essência da projeção: o sol direto só alcança lugares que veem o céu
let lit = sunL * sky;
```

Ajustes: **área** = `shTh` (0.93→raio 1.5 / 0.87→2 / 0.80→3 / 0.67→5); **suavidade de borda** = `shSoft`; **escuridão do núcleo** = o ambiente mínimo e o deslocamento de dois pontos da dispersão do céu; sombras longas de fim de tarde ≈ `thEff = shTh + 0.10 * (1 - clamp(sunDir.y, 0.0, 1.0))`.

## Limites honestos

- As sombras têm como referência o **céu para cima**, então elas **não giram com o sol** (resolução de voxel; bordas suaves vêm da dispersão BFS)
- O template de iluminação do motor retém um `var shadow: f32 = 1.;` não usado (sempre 1.0 = desativado) — um rastro plausível de "planos futuros" para sombras rotativas precisas ao pixel
- Sombras rotativas precisas ao pixel estão fora da API atual ([Looks inalcançáveis](constraints.md))

## Relacionado

- [receitas de realismo](../recipes/realism.md) (a receita completa de sombra projetada) · [Interioridades de iluminação](../internals/lighting-internals.md) · [Dicas de depuração](debugging.md)

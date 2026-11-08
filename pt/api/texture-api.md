# API de texturas

> API alvo: 5 · Build alvo: `v98qt8` · Estado: Verified (API inalterada desde a v4, reconfirmada no build da v5)

A API para ler as texturas do próprio jogo: duas funções, uma família de constantes nomeadas e quatro campos de entrada. A frase de uma linha do próprio cabeçalho: *"This face's texture. Compare with `bloxdTextureId*`."*

## bloxdTexel

```wgsl
fn bloxdTexel(textureId: u32, uv: vec2f, mipLevel: f32) -> vec4f
```

- **Chamável de**: **apenas hooks surface / light** (alcançá-la a partir de um hook de vértice falha com um diagnóstico "reaches")

Lê um texel **do mesmo jeito que o sampler do próprio motor** — mesmo atlas `texture_2d_array<f32>`, mesmo sampler, `textureSampleLevel` em `round(mipLevel)` — então o texel que você lê corresponde estruturalmente ao texel que o motor desenhou.

### O que `bloxdTexel` lê depende do pipeline

O motor gera uma definição diferente de `bloxdTexel` por pipeline, então uma única função tem três comportamentos:

| Pipeline | `textureId == 0` | `textureId` não nulo | Notas |
|---|---|---|---|
| **Pipelines de atlas** — terreno, líquido e modelos de bloco desenhados a partir do atlas de blocos | `vec4f(1.0)` (branco — "sem textura") | amostra **essa entrada do atlas** | as constantes nomeadas se aplicam; animação e rotação são automáticas |
| **Pipelines de textura própria** — modelos cuja malha carrega sua própria textura difusa (skins de jogador, texturas de mobs, sprites de item) | amostra **a textura própria da malha** no uv que você passar | `vec4f(1.0)` (branco) | exatamente uma textura está em escopo; constantes nomeadas não se aplicam |
| **Pipelines sem textura** | branco | branco | stub; `bloxdTextureSize() -> vec2u(1u)` |

Semântica dos pipelines de atlas em detalhe:

- **`textureId == 0` devolve `vec4f(1.0)` (branco).** Esse é o id de "sem textura"; faces sem textura carregam 0 nos quatro campos de entrada, então `bloxdTexel(surface.textureId, ...)` é sempre seguro de chamar
- **Texturas animadas devolvem automaticamente o quadro atual.** Os quadros avançam no relógio de animação do jogo — você não pode pará-los nem avançá-los passo a passo, e nunca precisará
- **`mipLevel` recebe clamp exatamente como o do próprio motor**: `clamp(round(mipLevel), 0, textureNumLevels(textureAtlas0) - 1)`; mips fora da faixa saturam em vez de dar erro
- **A `textureRotation` do próprio fragmento é aplicada ao uv que você passa** (veja abaixo)

`textureId` é **baseado em 1** nos pipelines de atlas: `bloxdTextureIdGrassTop` é o id, e a camada do atlas que o motor amostra para ele é `id - 1`. Os ids são estáveis por *nome* de textura, não por slot do atlas — o motor reembaralha o atlas entre builds, mas a comparação por nome mantém seu significado.

### O padrão de chamada universal

```wgsl
// Funciona em todo pipeline: em faces de atlas amostra a entrada do atlas;
// em modelos de textura própria textureId é 0 e amostra a textura própria do modelo.
let texel = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
```

`surface.colour` já contém `textura × tinta × oclusão ambiente` (skins e tintas incluídas), então leituras de texel servem para detalhe *adicional* — estimativas de luminância, efeitos por textura — não para reconstruir a cor base.

## bloxdTextureSize

```wgsl
fn bloxdTextureSize(mipLevel: f32) -> vec2u
```

- **Chamável de**: apenas hooks surface / light

`textureDimensions(textureAtlas0, <mip com clamp>)`. Cada textura ocupa uma camada do array, então isto é também *o tamanho em texels de qualquer textura nesse mip* (todas as texturas de bloco de um nível do atlas têm o mesmo tamanho quadrado).

```wgsl
// reamostragem alinhada a texel para um visual "pixel-art"
let size = bloxdTextureSize(surface.mipLevel);
let uv = fract(surface.uv);
let texel = bloxdTexel(surface.textureId, uv, surface.mipLevel);
```

## Texturas próprias do modelo (textureId: 0)

O cabeçalho observa: *"These are all 0 if the face has no texture. **Most models use textureId 0.**"* — a maioria das faces de modelo não tem textura de *atlas*, porque suas malhas carregam suas próprias texturas:

- **Skins de jogador** e outras texturas de modelo fora do atlas (mobs, sprites de item) chegam como `textureId: 0`
- Nesses pipelines `bloxdTexel(0u, uv, mip)` amostra **a textura própria da malha** (veja a tabela acima); qualquer id não nulo devolve branco — não há atlas em escopo
- Os campos do cabeçalho continuam funcionando como documentado: `uv` abrange a textura do modelo de 0 a 1, `mipLevel` é o mip da face
- **`bloxdTextureSize()`** informa o tamanho de *a textura que o pipeline amostra*: o atlas em pipelines de atlas, a textura própria do modelo em pipelines de textura própria

Efeitos que só fazem sentido em faces de atlas devem ficar atrás de uma guarda:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        // apenas faces cuja textura vive no atlas de blocos (modelos de bloco)
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

- **Skins contra o atlas**: o atlas mapeia *nomes* de textura para camadas e é comparável via `bloxdTextureId*`. Texturas próprias do modelo (skins) não estão nesse namespace e chegam como id 0. `surface.colour` já contém skin × tinta, então trabalhe a partir dele

## bloxdTextureId*: constantes nomeadas de textura

Cada nome de textura utilizável vira uma `const` comparável. **A grafia é o nome do arquivo em CamelCase**:

| Arquivo de textura | Constante | Nota |
|---|---|---|
| `grass_top.png` | `bloxdTextureIdGrassTop` | o próprio exemplo do motor |
| `lava0.png` (quadros `lava0`–`lava7`) | `bloxdTextureIdLava` | família de animação: sufixos de quadro caem do nome canônico |
| `black_portal0.png` (quadros 0–3) | `bloxdTextureIdBlackPortal` | mesma regra |
| `radar_screen0` (cópias giradas `[rot[1`–`[rot[4`) | `bloxdTextureIdRadarScreen0` | família de rotação: dobra para o nome raiz |

### Regras de grafia e liberdade de nomes

- **Regra de geração** (restaurada do validador): divida o nome nas sequências não alfanuméricas, capitalize cada parte e concatene após o prefixo `bloxdTextureId`
- **Caixa e sublinhados não são distinguidos**: a coincidência reversa (o nome que um pacote escreveu → nome do registro) dobra tanto a sua grafia quanto a do motor, então p. ex. `bloxdTextureIdGrassTop` e `bloxdTextureId_grass_top` resolvem para **a mesma constante**
- **Texturas animadas não levam número de quadro**: `lava` é o nome; `lava0` é um erro dedicado
- **Famílias de rotação usam o nome raiz**: escrever a grafia de uma cópia girada produz uma mensagem dedicada

### Erros de resolução de nomes (verbatim do validador)

> **Grafia incorreta do prefixo / caixa:** `bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?`
>
> **Quadro de animação:** `...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates.`
>
> **Cópia girada:** `...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, which bloxdTexel turns as each face shows it.`
>
> **Ambígua depois do dobramento:** `...could name X and Y, which differ only by case or underscores, so it can't be used.`
>
> **Não encontrada (com sugestão):** `There's no texture called X. Did you mean bloxdTextureIdY?` — o limiar de sugestão é a distância de Levenshtein `max(2, floor(len/4)) + 1`
>
> **Não encontrada (sem sugestão):** `There's no texture called X. Texture names are the file names texture packs use, as in bloxdTextureIdGrassTop for grass_top.png; BLOCK_TEXTURES.md lists them.`

> O `BLOCK_TEXTURES.md` nessa mensagem é a lista interna de nomes de textura do próprio jogo, referenciada pelo validador do motor — não é uma página deste site. O equivalente aqui é o [Catálogo de texturas](texture-catalog.md).

### Só as constantes referenciadas são emitidas

O bloco `bloxdTextureId*` do cabeçalho é gerado **por pacote** a partir dos nomes que ele de fato referencia — um pacote que usa 3 constantes recebe 3 linhas `const`, não ~900.

## Campos de entrada

Os quatro campos de textura em `BloxdSurfaceIn` / `BloxdLightIn`:

| Campo | Tipo | Descrição |
|---|---|---|
| `textureId` | `u32` | a textura desta face; compare com `bloxdTextureId*`; 0 = nenhuma |
| `textureRotation` | `u32` | quartos de volta no sentido horário (0–3), aplicados por `bloxdTexel` |
| `uv` | `vec2f` | a textura abrange 0–1; `fract(uv)` é desenhado |
| `mipLevel` | `f32` | nível de mip: 0 = tamanho completo, 1 = metade… |

## A sutileza da rotação — um sampler neutro

`bloxdTexel` contra-rotaciona o uv que você passa pela `textureRotation` do **fragmento atual** — não importa qual id você passou. Dois casos comuns:

- **Reamostrar a textura da própria face** com `surface.uv` — o uv está no referencial girado da face e a contra-rotação mapeia de volta ao espaço do atlas; o uso primário pretendido
- **Amostrar uma textura diferente** com uv no espaço do atlas enquanto a face está girada — a contra-rotação dispara mesmo assim e a amostra cai girada. Essa é a armadilha

O motor não consegue consultar a rotação por textura (rotação é um dado da geometria da face) e sempre usa o valor do fragmento. Para amostrar outra textura de forma neutra em rotação, pré-rotacione o uv pelo mesmo quarto de volta para cancelá-la:

```wgsl
// Amostragem de texel neutra em rotação: pré-rotacione o uv para que a contra-rotação
// de bloxdTexel (pela textureRotation desta face) se cancele. Passe surface.textureRotation como r.
fn texelNeutral(id: u32, uv: vec2f, mip: f32, r: u32) -> vec4f {
    var turned = uv;
    if (r == 1u) {
        turned = vec2f(1.0 - uv.y, uv.x);
    } else if (r == 2u) {
        turned = vec2f(1.0 - uv.x, 1.0 - uv.y);
    } else if (r == 3u) {
        turned = vec2f(uv.y, 1.0 - uv.x);
    }
    return bloxdTexel(id, turned, mip);
}
```

(`textureRotation == 0` não precisa de correção. A maioria das faces carrega 0, mas pacotes distribuídos não devem presumi-lo.)

## Exemplos resolvidos

### Emissão a partir da luminância do texel

Amostra um mip acima do da face para uma média suave por blocos, robusta à distância:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let avg = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + 1.0);
    let lum = dot(avg.rgb, vec3f(0.2126, 0.7152, 0.0722));
    if (surface.flags.emissive) {
        out.emission += avg.rgb * lum * 0.5;
    }
    return out;
}
```

### Efeitos específicos por textura

Compare `textureId` para isolar texturas escolhidas (o jeito oficial de, p. ex., dar brilho a minérios):

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.textureId == bloxdTextureIdDiamondOre) {
        let p = bloxdWorldPosition(light.position);
        let s = sin(bloxdSeconds() * 3.0 + p.x * 2.7 + p.y * 1.3 + p.z * 4.1);
        out.colour += vec3f(0.35, 0.45, 0.55) * max(0.0, s);
    }
    return out;
}
```

### Desfoque de distância estilo profundidade de campo

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let d = distance(surface.position, bloxdEyePosition());
    if (d > 40.0 && surface.textureId != 0u) {
        let own = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel);
        if (any(abs(own.rgb - vec3f(0.0)) > vec3f(1e-6))) {          // guarda de divisão
            let blur = clamp((d - 40.0) / 60.0, 0.0, 3.0);
            let t = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + blur);
            out.colour = t.rgb / own.rgb * out.colour;
        }
    }
    return out;
}
```

(O truque da razão preserva o `colour = textura × tinta × AO` do motor: dividir o texel misturado pelo nativo cancela o conteúdo da textura, deixando apenas o fator de desfoque para multiplicar de volta em `surface.colour`. Leituras brancas — faces sem textura — fazem a guarda pular o efeito.)

## Onde a API de texturas não pode chegar

- **Não é chamável de hooks de vértice** — diagnósticos de "reaches" a rejeitam
- **Você não pode adicionar texturas** — o atlas é do motor; a API apenas o lê. Texturas personalizadas continuam sendo tarefa do sistema de pacotes de texturas
- **Configurações de renderizador sem atlas degradam para stubs** — `bloxdTextureSize() -> vec2u(1u)` e `bloxdTexel(...) -> vec4f(1.0)`, com as quatro entradas fluindo `0u, 0u, vec2f(0.0), 0.0`. Código escrito para o atlas real ainda compila e roda — só vê texels brancos e um tamanho 1×1. Código que tolera `textureId == 0` tolera isto também

## Relacionado

- **Todos os 896 nomes utilizáveis** → [Catálogo de texturas](texture-catalog.md)
- [Interioridades do motor: registro de texturas](../internals/texture-registry.md) · [Amostragem de texturas](../internals/texture-sampling.md)

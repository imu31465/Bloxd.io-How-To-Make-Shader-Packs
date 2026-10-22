# Como criar pacotes de shaders para Bloxd.io (Guia completo)

Guia autocontido para criar e distribuir pacotes de shaders para Bloxd.io (somente renderizador WebGPU).

> Este é um guia não oficial e não representa a posição dos desenvolvedores. A API pode mudar sem aviso.  
> Este guia foi criado com assistência de IA; a precisão não é garantida. Verifique com o comportamento real no jogo.  
> Última revisão: 2026-10-20 (implantação da v3 em produção confirmada por comparação de bundles; invocação de hooks, névoa, profundidade e interioridades do `blockFlags` restauradas do build de produção — Parte IX §49–§54). Como não foi encontrada uma referência pública oficial da API WGSL, continue verificando as descrições da API e as receitas na tela de carregamento e na compilação no jogo.  
> O recurso de pacotes de shaders é um recurso oficial acessível pela interface do jogo, e os pacotes são WGSL puro  
> (sem execução de JS nem rede), então nada perigoso acontece com código normal.

[Voltar ao manual](README.md)·[Parte seguinte →](02-api.md)

# Parte I: Criar pacotes

> O jogo atual exige `apiVersion: 3` desde 2026-10-19 e rejeita pacotes v1/v2 ao carregar — o conteúdo abaixo está escrito sobre a especificação v2. Consulte [Parte IX](09-apiv3.md) para migrar antes de distribuir.

## 1. Visão geral e pré-requisitos

- Pacotes de shaders são **somente para o renderizador WebGPU**. Enquanto um pacote está instalado, o renderizador WebGPU é ativado à força nas configurações
- Pacotes são escritos em um **subconjunto restrito de WGSL**. Afetam apenas a aparência do **terreno (terrain) e líquidos (liquid)**
- O que você pode fazer: mudar cores, transparência e emissão; reconstruir a iluminação; sombras estilo projeção (R9.12); animação de vértices (só em certos jogos)
- O que você não pode fazer: adicionar/amostrar texturas, pós-processamento (bloom etc.), sombras pixeladas que giram com o sol (mapas de sombra) nem reflexos reais (SSR), nem afetar céu ou entidades
- O que dá para fazer (mas passa despercebido): **sombras estilo projeção com `skyLight` (oclusão de céu por voxels)** — dá para escurecer claramente sob árvores e telhados (R9.12). Quebrar blocos faz o LightEngine recalcular na hora, então as sombras acompanham em tempo real
- **A maioria dos jogos usa o modo estrito** (sem animação de vértices, sem `discard`). Projete pacotes de distribuição geral para funcionar no modo estrito

## 2. Início rápido

1. Crie uma pasta e coloque `pack.json` e arquivos `.wgsl` nela
2. Carregue o zip ou a pasta em configurações do jogo → Shader Pack
3. Corrija erros e recarregue (ver [Parte V](05-troubleshooting.md))
4. Teste em jogos compatíveis
5. Compacte em zip ao terminar e distribua

## 3. Estrutura do pacote

- **Formato de distribuição**: um único `.zip`, ou uma pasta (carregar pasta é só em navegadores desktop)
- **Conteúdo**: um `pack.json` (no nível superior do pacote; sem diferenciar maiúsculas) + 1–256 arquivos `.wgsl`
- Múltiplos `.wgsl` são concatenados e tratados como um módulo, então dividir e usar subdiretórios é livre. Sem restrições de nomes. A concatenação acontece em **ordem alfabética pelo nome de entrada (caminho)** (declarações de escopo de módulo não dependem de ordem, então em geral sem efeito — isso só morde em código dependente da ordem de inicialização de `var`). Arquivos não `.wgsl` (READMEs etc.) são ignorados
- Dica de compactação: se um zip guarda tudo sob uma pasta raiz comum, esse prefixo é removido automaticamente (zips do "Comprimir" do macOS funcionam como estão; sujeira de SO como `__MACOSX`, arquivos prefixados `._` e `.DS_Store` são excluídos automaticamente). Mas arquivos extras na raiz quebram a detecção do nível superior; o mais seguro é entrar na pasta e compactar `pack.json` e os `.wgsl` diretamente (confira que `pack.json` fique na raiz do ZIP)

| Item | Limite |
|---|---|
| tamanho do zip / nº de entradas | 32MB / 1024 |
| tamanho do pack.json | 64KB, UTF-8 |
| tamanho total .wgsl | 256KB, UTF-8 |
| formato zip | zip64, divididos e criptografados são rejeitados. Compactação: apenas store / deflate. Caminhos duplicados proibidos |

## 4. pack.json

```json
{
  "apiVersion": 3,
  "name": "My Pack",
  "author": "your name"
}
```

| Campo | Obrigatório | Descrição |
|---|---|---|
| `apiVersion` | obrigatório | Deve coincidir exatamente com `3`. Pacotes com `1`/`2` são rejeitados ao carregar com `shaderPack:loadWrongApiVersion` — veja [Parte IX](09-apiv3.md) para migrar |
| `name` | obrigatório | Não pode estar vazio. Exibido na interface de configurações |
| `author` | opcional | Pode omitir. Valores não-string (números etc.) são erros |

Outros campos são ignorados.

## 5. Modelo mínimo

Um pacote funcional só com `pack.json` (seção 4) e este `pack.wgsl`:

```wgsl
// Pacote mínimo com leve tom quente
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

Regras a seguir:

- Nunca **construa as structs de saída diretamente** (`BloxdSurface(...)` é erro). Comece sempre de `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` e modifique campos. Exceção: o primeiro parâmetro do hook light (`s: BloxdSurface`) tem o tipo de saída: `var out = s;` também vale
- `var x: BloxdSurface;` sem inicializar (só anotação de tipo) também é erro
- Parâmetros dos hooks são **somente leitura**. Para mudá-los, copie antes, ex. `var sv = s;`
- Você não pode usar o prefixo `bloxd_` nos seus identificadores (salvo os 6 nomes de hook)
- Escreva constantes com `const` (`#define` não aceita valores)

## 6. Os 6 hooks

Todos opcionais. Assinaturas devem coincidir exatamente nos tipos (nomes de parâmetros são livres).

| Hook | Papel |
|---|---|
| `fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex` | Animação de vértices do terreno. **Indisponível no modo estrito** |
| `fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface` | Cor, transparência e emissão do terreno. `s.colour` é textura × cor de vértice |
| `fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight` | Cor final do terreno. Chamado na **etapa final do fragmento**, e seu retorno vira a cor final como está |
| `fn bloxdLiquidVertex / bloxdLiquidSurface / bloxdLiquidLight` (mesmas formas) | Versões para líquidos. `alpha` age como transparência do líquido |

Regras de fallback:

- Sem hook de líquido, **usa-se o hook de terreno de mesmo nome** (nunca o inverso). Escrever só surface aplica o mesmo efeito aos líquidos
- Sem hook light, vale o comportamento padrão (`engineColour + emission × fogVisibility`)
- Se descartar `engineColour` e reconstruir da cor base, reaplique a névoa você mesmo: `mix(l.fogColour, col, l.fogVisibility)`. Ao somar emissão, multiplique-a antes por `fogVisibility`

## 7. 8 variantes e guardas

Você escreve um código só, mas ele deve compilar nas **8 combinações de {strict, allow} × {iluminação on, iluminação off} × {terreno, líquido}**.
Só existem `#define` (só flag, sem valores) / `#ifdef` / `#ifndef` / `#else` / `#endif`. `#` deve abrir sua linha (vale dentro de funções).

| Guarda | Significado | Uso |
|---|---|---|
| `#ifndef BLOXD_STRICT` | Só fora do estrito (allow) | Envolve todo o hook vertex e `discard` |
| `#ifdef BLOXD_LIGHTING` | Só com iluminação ligada | Envolve código que toca `blockLight`, `skyLight`, `ambientLightColour` etc. **Envolva funções auxiliares compartilhadas (fn de escopo de módulo) como funções inteiras** (proteger só o ponto de chamada não basta) |
| `#ifdef BLOXD_ALPHA` | Quando existe o campo `alpha` (sempre em líquidos, em terreno só em allow) | Envolve código que toca `alpha` |

## 8. Recursos da linguagem disponíveis e proibições

Disponível:

- Funções embutidas do WGSL (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select` etc.)
- Seus próprios `fn` / `struct` / `const` / `alias` / `var<private>`, mais `let` e fluxo de controle (if/for/while/switch etc.) dentro de funções
- Derivadas (`dpdx` / `dpdy` / `fwidth`) só em hooks surface/light (etapa de fragmento). Não em vertex
- Arrays `const` (ex. LUTs de paleta), ponteiros (`ptr<function, T>`), matrizes (`mat3x3f` etc.)
- Definições de flags `#define NOME` + ramificação `#ifdef`

Proibido / cuidado:

- **Sem texturas**: tipos `texture_*` / `sampler` são inutilizáveis. Construa detalhe proceduralmente com ruído hash etc.
- **`discard` é proibido no modo estrito** (envolva com `#ifndef BLOXD_STRICT`)
- `@attribute` / `enable` / `requires` / `override` são proibidos. Como `enable f16;` não pode ser escrito, **tipos f16 são efetivamente inutilizáveis**
- Atributos `@builtin` também são proibidos, então `fragCoord` (coordenadas de tela) e `vertex_index` não podem ser lidos
- **Não use `let` de escopo de módulo** (use `const` ou `var`)
- `atomic` é inutilizável
- Coordenadas são locais-noa. Some `bloxdOriginOffset()` para coordenadas de mundo. Coordenadas de bloco são `bloxdFaceBlock(position, normal)`

## 9. Validação, testes e distribuição

O carregamento executa estas verificações em ordem:

1. Verificações de limite do carregador (limites da seção 3)
2. Compilação estática (as 8 variantes)
3. Compilação real no WebGPU do navegador (a validação estática não verifica todos os tipos; certo código só falha aqui — evite as armadilhas da seção 8)

Passos:

1. Carregue o zip / pasta em configurações → Shader Pack
2. Confira o status. Logo após a seleção aparece "Ready. Reload the page to use it." — depois de recarregar a página, "Ready to use" significa o sucesso. Com "Saved, but it won't run until you fix these errors...", corrija os erros listados (arquivo:linha + variante) e recarregue
3. Recarregue a página para ativar. Remova antes qualquer override de renderizador em parâmetros URL ou localStorage, ou o pacote se recusará a iniciar
4. Teste primeiro em jogos permissivos e depois em jogos estritos (a maioria). Animação de vértices só funciona em jogos allow
5. Para distribuir, compacte com `pack.json` no topo (dentro dos limites da seção 3). O pacote pode ser substituído na mesma tela, mas só entra em vigor após recarregar a página (etapas 2–3). Remove Pack o exclui. A revalidação após atualizações do jogo roda sozinha ao carregar a página

[Voltar ao manual](README.md)·[Parte seguinte →](02-api.md)

[← Parte anterior](01-making.md)·[Voltar ao manual](README.md)·[Parte seguinte →](03-recipes.md)

# Parte II: Referência da API

> O jogo atual exige `apiVersion: 3` desde 2026-10-19 e rejeita pacotes v1/v2 ao carregar — o conteúdo abaixo está escrito sobre a especificação v2. Consulte [Parte IX](09-apiv3.md) para migrar antes de distribuir.

## 10. Cabeçalho do motor (anteposto automaticamente ao código do pacote)

O motor insere automaticamente o código abaixo antes do código do pacote (pacotes não podem redeclarar). Trechos em `#ifdef` variam por variante.

```wgsl
// Engine-provided and read-only to packs. apiVersion 2.
const bloxdTimeWrap: f32 = 3600.0;   // seconds until time wraps to 0

fn bloxdTime() -> f32;               // seconds. wraps to 0 every 3600 s
fn bloxdOriginOffset() -> vec3i;     // whole blocks. noa-local + this = world coords
fn bloxdEyePosition() -> vec3f;      // camera position (noa-local)
fn bloxdSunDirection() -> vec3f;     // sun direction (unit vector, non-zero only with earth skybox)
fn bloxdWorldPosition(position: vec3f) -> vec3f;  // noa-local -> world coords
fn bloxdFaceBlock(position: vec3f, normal: vec3f) -> vec3i;  // world block coords of this face
fn bloxdApplyFog(colour: vec3f, l: BloxdLightIn) -> vec3f;   // mix(l.fogColour, colour, l.fogVisibility)

struct BloxdVertexIn {
    position: vec3f,   // noa-local world space (world minus bloxdOriginOffset())
    normal: vec3f,
    blockId: u32,      // owning block id (flat-interpolated, uniform across the face)
}

#ifndef BLOXD_STRICT
struct BloxdVertex {
    position: vec3f,     // noa-local
}
#endif

struct BloxdSurfaceIn {
    colour: vec3f,       // texture x vertex colour (tint x AO, baked together by the mesher)
    alpha: f32,
    normal: vec3f,
    position: vec3f,     // noa-local
    blockId: u32,        // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdSurface {
    colour: vec3f,
#ifdef BLOXD_ALPHA
    alpha: f32,
#endif
    emission: vec3f,     // added after lighting, then fogged
}

struct BloxdLightIn {
    litColour: vec3f,          // engine lighting result (before emission and fog)
    engineColour: vec3f,       // post-fog = bloxdApplyFog(litColour, l). excludes emission
    directional: f32,          // summed Lambert from the scene's directional lights (0 when off)
    ambient: vec3f,            // the material's ambient times the scene's
    blockLight: vec3f,         // voxel block light, tone-mapped (all variants; 0 when unlit)
    skyLight: f32,             // voxel sky light, tone-mapped (all variants; 1 when unlit)
    ambientLightColour: vec3f, // present in all variants (white when unlit)
    skyLightColour: vec3f,     // present in all variants (white when unlit)
    heldLight: vec3f,          // held light here (all variants; 0 when unlit/out of range)
    fogColour: vec3f,
    fogVisibility: f32,        // 1 = no fog, 0 = fully fogged (renamed from v1 fogFactor)
    position: vec3f,           // as in BloxdSurfaceIn
    normal: vec3f,
    blockId: u32,              // owning block id (flat-interpolated, uniform across the face)
}

struct BloxdLight {
    colour: vec3f,
}

// liquid variants, surface / light hooks only
struct BloxdOpaqueBehind {
    found: bool,       // false when no opaque face behind (sky)
    position: vec3f,   // opaque face position behind (noa-local)
    distance: f32,     // distance from the eye
}
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind;

#ifndef BLOXD_STRICT
fn bloxdDefaultVertex(v: BloxdVertexIn) -> BloxdVertex;
#endif

fn bloxdDefaultSurface(s: BloxdSurfaceIn) -> BloxdSurface;
fn bloxdDefaultLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight;
```

Pontos-chave:

- `bloxdTime()` é tempo decorrido que envolve a cada 3600 segundos (`bloxdTimeWrap`). Não há garantia de sincronia com o relógio diurno do jogo. Como a visibilidade de etapa do bind group é VERTEX|FRAGMENT, **também pode ser chamada desde hooks vertex**
- `bloxdSunDirection()` é um vetor unitário enquanto existe um sol; zero quando o céu não tem sol. **A lua está sempre em `-bloxdSunDirection()`** (o motor calcula a posição lunar como o oposto exato do sol). As builds atuais não têm ciclo dia/noite: sol, lua e estrelas nunca se movem durante a partida (só opacidades alternam, como `dayNightSunOpacity`). No céu terrestre padrão o sol fica fixo em ≈ `(−0.56, 0.81, −0.18)` (elevação ~54°). **Nunca passe um vetor zero a `normalize`** — teste a ausência de sol com `dot(d, d) < 1e-8` e recorra a uma direção constante (ver [Parte VII](07-internals.md) §28)
- ※Nota: antes escrito como "não reutilizável como direção lunar em zero". A direção em si está disponível via `-bloxdSunDirection()`, mas pacotes de distribuição devem ramificar com `sunPresent` sob premissa zero (ver R2 para o pseudo look azul, [Parte VII](07-internals.md) R-A para luar direcional)
- `emission` é somado após o cálculo de iluminação, atenuado por **`fogVisibility`** (a implementação defaultLight `engineColour + emission × fogVisibility`. A emissão também some em distância totalmente enevoada)
- **Ordem de aplicação de névoa**: o fragmento processa ① composição iluminação/emissão → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ chamada ao hook light → ⑤ return. Logo **engineColour chega já com névoa**, e **o valor devolvido do hook light vira a cor final como está** (após o hook não se reaplica névoa)
- **Origem de fogVisibility**: distância em espaço de vista (calculada por vértice, interpolada). Em modo linear `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **Quando fogMode == 0**: `fogColour` chega como `vec3f(0.0)` (preto). Código que estime faixas horárias pelo tom de fogColour deve ter cuidado
- **Ajustes reais de névoa em builds atuais**: **linear fixo**. `fogStart` = distância de chunks, `fogEnd` = +1 chunk (só horizonte). Com névoa off fixa-se em 100 / 101 chunks, efetivamente desativada. Cor de névoa padrão RGB(183, 191, 195)
- O uniform `bloxdPackInputs` (`@group(3) @binding(0)`, 64B) é só para **uso via funções de cabeçalho**. Não o referencie diretamente desde pacotes. A visibilidade de etapa é VERTEX|FRAGMENT, logo funções de cabeçalho também podem ser chamadas desde funções de escopo de módulo fora dos hooks e desde hooks vertex. A textura de profundidade (binding 1) é só FRAGMENT, logo `bloxdOpaqueBehind()` fica limitado a hooks surface / light
- **`skyLight` / `blockLight` / `heldLight` chegam após uma "curva de lift"**. O `tone-mapped` dos comentários do cabeçalho refere-se a isto: o motor sempre aplica `y = 1-(1-x/(3-2x))³` (curva S que levanta áreas escuras) aos fragmentos antes de entregar aos pacotes. Não são valores de voxel crus (n/15); ex. sob árvore (cru 0.87) chega elevado a **0.97**
- `skyLight` é essencialmente o dado de oclusão por voxels de "se o céu é visível daqui" (= um mapa de sombras), não um simples parâmetro de brilho (ver seção 15, "A verdade sobre as sombras")
- **`litColour` serve de ponto de partida**: na v1 só havia `engineColour` já com névoa, e a atmosfera própria tendia à névoa dupla. Na v2 parte-se de `litColour` pré-névoa e pré-emissão, e se reaplica névoa no próprio ritmo com `bloxdApplyFog()`
- **`blockId` distingue tipos de bloco**: identificação independente da cor de textura. Mas a tabela ID-tipo vive dentro do motor: qual ID é qual bloco se mede no mundo; há uma tabela pronta em [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (ver [Parte VIII](08-apiv2.md))
- **A construção direta de structs é proibida**: chamadas de construtor como `BloxdLight(...)` são rejeitadas na validação estática. Parta sempre de `bloxdDefault*` ou use uma cópia da entrada

## 11. Tabela de variantes

| Variante | BLOXD_STRICT | BLOXD_LIGHTING | BLOXD_ALPHA |
|---|---|---|---|
| allow + unlit + terreno | – | – | ✓ |
| allow + unlit + líquido | – | – | ✓ |
| allow + lit + terreno | – | ✓ | ✓ |
| allow + lit + líquido | – | ✓ | ✓ |
| strict + unlit + terreno | ✓ | – | – |
| strict + unlit + líquido | ✓ | – | ✓ |
| strict + lit + terreno | ✓ | ✓ | – |
| strict + lit + líquido | ✓ | ✓ | ✓ |

As formas das structs do cabeçalho também mudam por variante (sem `BloxdVertex` em strict, sem `blockLight` etc. em unlit, sem `alpha` em terreno strict).

Os símbolos oficialmente definidos são apenas 4 (os 3 acima + `BLOXD_SCENE_DEPTH` — [Parte VIII](08-apiv2.md) §35). Terreno vs líquido não é um símbolo, mas um **programa separado**: ramos como `#ifdef BLOXD_TERRAIN` são impossíveis. A correspondência dos nomes de flags é insensível a maiúsculas/minúsculas; um nome errado em `#ifdef` faz a mensagem de erro listar os 4 nomes válidos. As funções de hook só são injetadas nos programas de terreno e líquido — pacotes não podem afetar entidades, partículas ou qualquer outra renderização.

## 12. Cola de esqueleto

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);          // construção direta é proibida; comece sempre do default
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // terreno só tem alpha em allow
    out.alpha = s.alpha;
    #endif
    return out;
}

fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);         // engineColour + emission*fogVisibility
    #ifdef BLOXD_LIGHTING                       // proteja entradas só de iluminação
    out.colour += l.blockLight * 0.2;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex sempre com esta guarda
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdTime()) * 0.05;
    return out;
}
#endif
```

Cinco coisas para ter sempre em mente: compilar limpo nas 8 variantes / jogos estritos são a maioria / sem texturas / parâmetros de hook são somente leitura / nada de `let` em escopo de módulo.

[← Parte anterior](01-making.md)·[Voltar ao manual](README.md)·[Parte seguinte →](03-recipes.md)

[← Parte anterior](02-api.md)·[Voltar ao manual](README.md)·[Parte seguinte →](04-realism.md)

# Parte III: Receituário

> O jogo atual exige `apiVersion: 3` desde 2026-10-19 e rejeita pacotes v1/v2 ao carregar — o conteúdo abaixo está escrito sobre a especificação v2. Consulte [Parte IX](09-apiv3.md) para migrar antes de distribuir.

- [R1. Receitas de cor (surface)](#r1-receitas-de-cor-surface)
- [R2. Receitas de iluminação (light)](#r2-receitas-de-iluminação-light)
- [R3. Receitas de emissão](#r3-receitas-de-emissão)
- [R4. Receitas de coordenadas (mundo / bloco / vista)](#r4-receitas-de-coordenadas-mundo--bloco--vista)
- [R5. Receitas de tempo (animação)](#r5-receitas-de-tempo-animação)
- [R6. Receitas de líquidos](#r6-receitas-de-líquidos)
- [R7. Receitas de vértices (só allow)](#r7-receitas-de-vértices-só-allow)
- [R8. Truques matemáticos](#r8-truques-matemáticos)
- [R9. Receitas realistas](#r9-receitas-realistas)

---

> **Importante:** as receitas abaixo são exemplos individuais, não para concatenar de cima abaixo. Colar várias definições do mesmo nome de hook (`bloxdTerrainLight` etc.) ou do mesmo nome de função auxiliar duplica definições num módulo e falha a compilação. Para combinar efeitos, funda-os numa função por tipo de hook.

## R1. Receitas de cor (surface)

### Tom único (o mais básico)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Subir / tirar saturação

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 vívido / -1.0 monocromo total
```

### Temperatura de cor (quente ⇄ frio)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = quente (vermelho forte), -1.0 = frio (azul forte)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### Vintage / sépia

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### Gradiente de altitude (baixadas quentes)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 1..0 na altura 0..50
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Pintar por orientação (cima = claro, paredes = escuro)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // chão 1 / parede 0 / teto -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // paredes e tetos um pouco mais escuros
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Posterizar (menos cores)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

## R2. Receitas de iluminação (light)

### Curva S de contraste

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### Neblina de distância (névoa própria)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 0..0.35 de névoa própria de 64 a 192 blocos
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### Noite (tom azul por skyLight + proteção de lamparinas)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
    #endif
    return out;
}
```

### Cavernas escuras (escurecer mais onde não há skyLight)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    out.colour *= mix(1.0, 0.35, underground * underground);
    #endif
    return out;
}
```

> `skyLight` chega pós-lift (seção 10): oclusão leve (sob árvores: cru 0.87 → lift 0.97) quase não escurece com este método. Serve para cavernas (cru 0). Para marcar "sombra de árvore", use inversão + limiar de R9.12.

### Azul noturno ambiente (pseudo look sem direção lunar)

> Nesta API, `bloxdSunDirection()` é zero quando o céu não tem sol. O abaixo não é luar direcional, só um tênue ambiente azul quando o céu está escuro. A direção lunar em si está disponível via `-bloxdSunDirection()` (só mundos com ciclo dia/noite. [Parte VII](07-internals.md) R-A).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let upward = clamp(l.normal.y, 0.0, 1.0);
    out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
    #endif
    return out;
}
```

### Calor de pôr do sol (tom por altura do sol)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 1 no horizonte / 0 no zênite
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### Substituição total da saída do motor (reiluminação simples)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    #ifdef BLOXD_LIGHTING
    // NOTA: construção direta de BloxdLight(...) é proibida; reescreva colour a partir do default
    var out = bloxdDefaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // descarta engineColour (o resultado de iluminação do motor) e usa "cor base × brilho calculado"
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogVisibility);   // descartado engineColour: refazer névoa é obrigatório
    out.colour = col + s.emission * l.fogVisibility;   // some emission você também (obrigatório)
    return out;
    #else
    return bloxdDefaultLight(s, l);
    #endif
}
```

## R3. Receitas de emissão

> `emission` é somado após o cálculo de iluminação, mas o processo padrão **o atenua com `fogVisibility`. Em distância totalmente enevoada a emissão também some. Para manter brilho ao longe, não some a emission — some diretamente como `out.colour += ...` dentro do hook light** (engineColour já leva névoa, então ao longe a luz cai sobre a cor de névoa)

### Lamparinas pulsantes (tochas que respiram)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(bloxdTime() * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### Padrão de minério luminoso (materiais claros emitem)

```wgsl
// lado surface: quanto mais claro (branco) o material, mais emissão
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### Enxame de vaga-lumes (pontos de luz à deriva)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // uns "orbes de luz" à deriva lenta; brilho por inverso da distância
    let t = bloxdTime() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdTime() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. Receitas de coordenadas (mundo / bloco / vista)

### Coordenadas de mundo

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### Coordenadas de bloco

```wgsl
let worldBlock = bloxdFaceBlock(l.position, l.normal);
```

### Xadrez (por bloco)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 ou 1
out.colour *= mix(0.96, 1.04, checker);
```

### Pseudoaleatório por bloco (hash)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// usos: variação de grama, mosqueado de pedra etc.
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### Vetor de vista e luz de borda (rim)

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### Ângulo de vista (fresnel caseiro — para líquidos)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 de frente / 0 rasante
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. Receitas de tempo (animação)

> `bloxdTime()` envolve a cada 3600 segundos (1 hora). É tempo decorrido do shader sem garantia de sincronia com o dia/noite do jogo. Use para animação periódica visual, mas prefira `bloxdSunDirection()` e entradas de iluminação para detectar noite real.

### Ciclo dia-noite (1 dia por hora)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdTime() * 6.2831853 / 3600.0);   // 0..1 período de uma hora; não necessariamente sincronizado com o dia/noite do jogo
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### Oscilação (senos sobrepostos)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### Faixas de aurora / listras fluorescentes

```wgsl
// mistura 3 cores por posição XZ e tempo
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

## R6. Receitas de líquidos

### Superfície ondulada (cintilação de cor)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdOriginOffset().x);
    let worldZ = s.position.z + f32(bloxdOriginOffset().z);
    let ripple = sin(bloxdTime() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid sempre tem BLOXD_ALPHA — guarda por hábito
    #endif
    return out;
}
```

### Transparência pseudo por altura (não é teste real de baixio)

> Na v1, profundidade de cena e posição do fundo não podiam ser consultadas: a profundidade real não se calculava só com aquela API. Na v2, `bloxdOpaqueBehind()` limitado a líquidos mede a espessura até a face opaca traseira ([Parte VIII](08-apiv2.md) R-E). O que segue é o velho pseudo efeito sem isso: `s.position.y` é coordenada local e usá-la crua desloca o efeito com a origem do chunk. Para altura de mundo converta com `bloxdWorldPosition()`. O trecho só varia alpha por altura de mundo — pseudo efeito, não baixio por costa/fundo. Ajuste `packWaterReferenceY` à sua altura de mundo.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // mais fino em baixa altura, mais perto do alpha base em cima; confira a direção no jogo
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### Turbidez submarina por dentro

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### Pacote só-líquidos (terreno intacto)

```wgsl
// não escreva nenhum hook terrain_*. Então:
//  - variantes terrain = sem hooks = padrões do motor
//  - variantes liquid  = só agem os hooks liquid_*
```

## R7. Receitas de vértices (só allow)

> Envolva tudo em `#ifndef BLOXD_STRICT`.
> Para as condições exatas (lista de títulos allow; Custom Games é estrito) veja §30: [§30 Modos de aplicação por jogo](07-internals.md#30-modos-de-aplicação-por-jogo-shaderpackpolicy)

### Grama ao vento (move só as pontas)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdTime() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // só faces verticais
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### Ondas em líquido (só faces de cima)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdTime() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdTime() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### Terreno pulsante

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdTime() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // leve expansão/contração ao longo das normais
    return out;
}
#endif
```

### Terreno ondulante (ondas seno gigantes)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdTime() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdTime() * 0.7) * 0.3;
    return out;
}
#endif
```

## R8. Truques matemáticos

```wgsl
// quantização suave de 0..1 (n passos)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// limiar de 2 níveis (sombra toon)
let shadow = smoothstep(0.35, 0.37, level);   // ±0.02 em torno do limiar cria degraus

// toon de 3 níveis
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// luma (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// pulso suave
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// onda triangular (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// segundos → "fase lenta" (para efeitos que ignoram o ciclo de 3600 s)
let phase = t * 0.15;
```

## R9. Receitas realistas

> Receitas físicas para "reconstruir o visual baunilha a partir dos materiais". Leia estas premissas primeiro:
>
> 1. **O hook light é chamado na etapa final do fragmento**. Sua cor devolvida vira a cor final como está. **Você deve reaplicar a névoa** (R9.10)  
> 2. **A iluminação padrão do motor é só multiplicação**. Especular / fresnel / separação quente-frio / ambiente hemisférico se constroem do zero  
> 3. `l.engineColour` é a cor terminada (já com névoa). Reconstruir de `s.colour` (albedo) é a abordagem completa  
> 4. Texturas são proibidas → todo detalhe deve ser **procedural** (hash/ruído) (R9.8)

### R9.1 Tochas quentes × céu frio

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // clamp intermediário
    col = mix(l.fogColour, col, l.fogVisibility);                    // refazer névoa
    out.colour = col + s.emission * l.fogVisibility;                 // re-somar emission
    #endif
    return out;
}
```

### R9.2 Especular solar (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);          // vetor médio
        let ndh = max(dot(n, h), 0.0);
        let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
        let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
        out.colour += spec * vec3f(1.0, 0.97, 0.90);
    }
    #endif
    return out;
}
```

### R9.3 Fresnel de Schlick

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // tênue brilho de borda
    #endif
    return out;
}
```

### R9.4 Ambiente hemisférico (céu em cima / rebote do chão embaixo)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // embaixo: rebote
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // em cima: luz do céu
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // clamp intermediário
    col = mix(l.fogColour, col, l.fogVisibility);                           // refazer névoa
    out.colour = col + s.emission * l.fogVisibility;                        // re-somar emission
    #endif
    return out;
}
```

### R9.5 ACES fílmico (aproximação de Narkowicz)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = exposição
    return out;
}
```

### R9.6 Perspectiva aérea ("atmosfera" por dessaturação com distância)

> Ao contrário da névoa (troca de cor), sobrepor "dessaturação com distância" deixa vistas longes bem mais realistas.  
> Cuidado: reduza só a saturação — nunca toque a luminância.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // queda (~30% a 100blk / ~75% a 400blk)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // só cai saturação (luminância intacta)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 Normais de onda + brilho solar ("estrada do sol" na água)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // altura h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // dh/dx
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // dh/dz
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = bloxdWorldPosition(l.position);
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdTime()), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);
        let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
        out.colour += glint * vec3f(1.0);
    }
    #endif
    return out;
}
```

### R9.8 Micro-relevo procedural (truque contra a proibição de texturas)

```wgsl
fn pack_hash(p: vec3f) -> f32 {
    return fract(sin(dot(p, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
}
fn pack_bumpNormal(p: vec3f, n: vec3f, strength: f32) -> vec3f {
    let e = 0.15;
    let h0 = pack_hash(p);
    let hx = pack_hash(p + vec3f(e, 0.0, 0.0));
    let hz = pack_hash(p + vec3f(0.0, 0.0, e));
    let tangentX = normalize(cross(vec3f(0.0, 1.0, 0.0), n) + vec3f(0.0001, 0.0, 0.0));
    let tangentZ = normalize(cross(n, tangentX));
    return normalize(n + tangentX * (hx - h0) * strength + tangentZ * (hz - h0) * strength);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // coords locais do bloco
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lam = clamp(dot(n, sunDir), 0.0, 1.0);
        let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
        out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
    }
    #endif
    return out;
}
```

### R9.9 Escurecimento não linear de cavernas + proteção de lamparinas

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let keep = 0.12 + 0.88 * blockInt;          // levanta focos com lamparinas
    out.colour *= mix(keep, 1.0, sky * sky);     // escurecimento não linear (ao quadrado)
    #endif
    return out;
}
```

### R9.10 Reaplicar névoa (obrigatório ao descartar engineColour)

> Por um piso como `max(l.fogVisibility, 0.25)` limita "não mais denso que isto"  
> (0.0 = fiel ao motor / 0.3–0.5 = distância mais clara).  
> Nota: a névoa do motor é linear só de horizonte (perto da distância de desenho); a bruma média deve ser construída pelo pacote.
> Ajustes reais de névoa (verificados em implementação): linear fixo / `fogStart` = distância de chunks / `fogEnd` = +1 chunk / efetivamente desativada a 100–101 chunks com névoa off / cor padrão RGB(183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));  // refazer névoa (0.15 = piso leve)
    col += s.emission * l.fogVisibility;            // emissão também com névoa
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 Grau cinema (sombras frias / altas quentes / dessaturação noturna)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;  // noite só quando a direção solar é zero; sem degradê de ocaso
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

### R9.12 Sombras projetadas — inversão do lift + corte por limiar (definitivo)

> **Revisão da premissa (seção 10)**: `l.skyLight` não é o valor de voxel cru (n/15) mas o valor após a "curva de lift" do motor  
> `y = 1-(1-x/(3-2x))³` (curva S que levanta áreas escuras).
>
> | Lugar | voxel cru | liftado (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | céu aberto | 1.00 | 1.00 | 1.00 |  
> | sob árvore (raio 2) | 0.87 | **0.97** | **0.86** ← quase intacto |  
> | raio 3 | 0.80 | **0.92** | 0.66 |  
> | raio 5 | 0.67 | 0.78 | 0.29 |
>
> **Esta é a causa demonstrada de "sombras não aprofundam com gamma"**. Mas a curva é monótona e invertível algebricamente:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Após restaurar valores crus, basta binarizar com corte por limiar (`smoothstep`).  
> A dispersão BFS do LightEngine é "1 bloco = -1", então o limiar `th = 1 - r/15` marca diretamente  
> "oclusão de raio r ou mais conta como sombra". Quebrar blocos move sombras na hora (LightEngine recalcula em tempo real).  
> Limitação: sombras usam como base "o céu para cima", então não giram com o sol (seção 15, "A verdade sobre as sombras").

```wgsl
// Inverte exatamente o lift do motor para restaurar o skyLight de voxel cru (n/15)
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // sem cbrt em WGSL, use pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // dial de raio de sombra: th = 1 - r/15 (0.87 = raio 2+ é sombra)
const shSoft = 0.04;   // suavidade de borda (0.02 = duro / 0.08 = suave)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. restaura valores crus (pular isto jamais dá sombras)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. corte por limiar — separa limpo sol=1 / sombra=0
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // Lambert solar (recorre a l.directional quando não há sol)
    let sunLen = length(bloxdSunDirection());
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                      sunLen > 0.5);
    // a essência da projeção: sol direto só chega onde o céu é visível
    let lit = sunL * sky;
    // lado sombra: azul céu, não preto + ambiente mínimo
    let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
    var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
    // luz de tocha atravessa sombras (blockLight também liftado: restaura junto)
    let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                         sh_unlift(l.blockLight.g),
                         sh_unlift(l.blockLight.b));
    let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
    col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
    // reaplica névoa (a parte do engineColour descartado)
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));
    out.colour = clamp(col + s.emission * l.fogVisibility, vec3f(0.0), vec3f(1.0));   // não esqueça emission (com névoa)
    #endif
    return out;
}
```

> Guia de ajuste: **a área de sombra é só `shTh`** — `0.93` = raio 1.5+ / `0.87` = raio 2 / `0.80` = raio 3 / `0.67` = raio 5.  
> A dureza da borda é `shSoft` (0.02 = duro / 0.08 = suave). A escuridão do núcleo é o duplo ajuste de `0.09` (ambiente mínimo) e `0.16` (luz dispersa do céu).  
> Para alargar sombras ao entardecer, some `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (aproximação de sombras longas de tarde.  
> `sunDir` é `bloxdSunDirection() / length(bloxdSunDirection())`). Para sombras mais azuis suba o B de `vec3f(0.72, 0.82, 1.05)`.
>

[← Parte anterior](02-api.md)·[Voltar ao manual](README.md)·[Parte seguinte →](04-realism.md)

[← Parte anterior](03-recipes.md)·[Voltar ao manual](README.md)·[Parte seguinte →](05-troubleshooting.md)

# Parte IV: Guia de realismo

> O jogo atual exige `apiVersion: 3` desde 2026-10-19 e rejeita pacotes v1/v2 ao carregar — o conteúdo abaixo está escrito sobre a especificação v2. Consulte [Parte IX](09-apiv3.md) para migrar antes de distribuir.

## 13. Iluminação padrão do motor e margem para realismo

A iluminação padrão do motor é "só multiplicação" — não existem especular, fresnel, separação quente/frio nem ambiente hemisférico. O seguinte pode ser reconstruído:

| Função | Padrão | Reconstruível em pacotes? |
|---|---|---|
| Difuso (Lambert) | Só soma escalar de direcionais | ◎ Próprio com `bloxdSunDirection()` (fontes envoltas etc.) |
| Especular | Nenhum | ◎ Blinn-Phong (R9.2) |
| Fresnel | Nenhum | ◎ Aproximação de Schlick (R9.3) |
| Separação tocha quente / céu frio | Sem cor | ◎ (R9.1) |
| Ambiente hemisférico | Sem direção | ◎ Céu em cima / chão embaixo (R9.4) |
| Mapeamento de tons | Nenhum (só clamp) | ◎ ACES fílmico (R9.5) |
| Perspectiva aérea | Só névoa (troca de cor) | ◎ Dessaturação com distância (R9.6) |
| Detalhe de superfície | Só resolução de textura | △ Micro-relevo procedural com hash (R9.8) |
| Ondas de vértice (água) | Nenhuma (plano) | ◎ Só allow (R7) |
| Normais de onda / brilho solar | Nenhumas | ◎ (R9.7) |
| Luar noturno | A cor do céu só escurece | △ A direção lunar está em `-bloxdSunDirection()`: pseudo looks (ambiente azul em R2 / dessaturação em R9.11) mais luar direcional (R-A, só ciclo dia/noite) |
| Sombras (oclusão de céu) | Só mistura suave via `mix(ambiente, céu, skyLight)` | ◎ Inversão do lift + corte por limiar + porta solar (R9.12). Sombra de árvores e sob telhados cai claramente, seguindo edições de blocos em tempo real |

## 14. Duas escolas de implementação

**Escola A: retoques aditivos (de defaultLight)** — usa `engineColour` (cor terminada) como base e soma brilho quente ou rim. Fácil e seguro, mas o modelo de iluminação segue o padrão.

**Escola B: reiluminação total (de s.colour)** — descarta `l.engineColour` e reconstrói a iluminação de `s.colour` (albedo) e materiais LightIn crus. O caminho real ao realismo. Quatro regras:

1. **Reaplique a névoa**: o hook light roda pós-névoa; aplique `mix(l.fogColour, col, l.fogVisibility)` você mesmo (R9.10). Com névoa densa, ponha piso com `max(l.fogVisibility, 0.3)`. E ao contrário: misturar mais cor de névoa em pacotes baseados em engineColour produz névoa branca dupla
2. **Reserva unlit**: passe para `defaultLight` fora de `#ifdef BLOXD_LIGHTING`
3. **Proteja funções compartilhadas inteiras**: envolva em `#ifdef BLOXD_LIGHTING` como funções completas as funções compartilhadas que tomam `BloxdLightIn` (proteger só chamadas não basta)
4. **Sem direção solar**: se `bloxdSunDirection()` é zero, não compute especular direcional. `l.directional` é um escalar de quantidade de luz, não um vetor de direção: não restaura a direção do brilho. Troque para ambiente fraco sem direção se preciso. A direção lunar está disponível via `-bloxdSunDirection()` (só se move em mundos com ciclo dia/noite. [Parte VII](07-internals.md) R-A)

## 15. Looks inalcançáveis (o "teto" do realismo)

| Look | Motivo |
|---|---|
| Mapas de sombra pixelados (sombras que giram com o sol, penumbra) | Texturas de profundidade não podem ser referenciadas (`bloxdOpaqueBehind()` limitado a líquidos é só geometria e não serve como mapa de sombras). Oclusão de raios não chega aos hooks |
| SSAO | Sem acesso à profundidade de cena (só AO de vértices do mesher; a profundidade limitada a líquidos não serve para SSAO) |
| SSR (reflexos) | Sem cor de cena. Só pseudo looks misturando cor de céu via fresnel |
| Bloom / glare | Sem hook ao pós-processamento |
| Profundidade de campo, aberração cromática, grão | Requerem pós-processamento de tela cheia |
| Luz volumétrica (god rays) | Igual |
| Texturas PBR | Leituras de textura proibidas. Só pseudo estimativa desde luminância de cor |
| Refração submarina | Sem cor de cena. A profundidade limitada a líquidos (`bloxdOpaqueBehind()`) permite absorção por espessura e projeção de fundo ([Parte VIII](08-apiv2.md) R-E) |
| Véu submarino (tom azul): remover / mudar | O véu é um quad emissive de tela cheia gerado da cor/alpha de definição do bloco líquido da câmera, desenhado fora dos pipelines de hook (na frente de tudo): o pacote não muda nem cor nem densidade |
| Detecção submarina direta | Nenhuma entrada indica submersão de câmera, e fogStart / fogEnd / fogColour não mudam debaixo d'água: tampouco há forma fiável de estimá-la desde fogVisibility etc. |

### A verdade sobre as sombras — "sombras de árvores" dá para fazer

Só **mapas de sombra pixelados que giram com o sol** são impossíveis na tabela. O motor já calcula "sombras" desde o início, e isso é `skyLight`. O LightEngine do lado da malha usa um algoritmo estilo Minecraft:

1. **Varredura de colunas**: percorre cada coluna (x,z) de cima abaixo. A luz do céu começa em 15, vira **0 em blocos opacos**, atenuando ao descer com `lightFilter` (ar 1 / água 3 / opaco 15)
2. **Preenchimento BFS**: expande lateralmente a 6 vizinhos (-1 por bloco) — isto suaviza bordas de sombra. O valor cru sob oclusão de raio r é (15-r)/15
3. blockLight (tochas etc.) é um BFS separado de 3 canais RGB (empacotado 4bit)

Então `l.skyLight` não é mero parâmetro de brilho mas **dado de oclusão por voxels de "se o céu é visível daqui" = um mapa de sombras**. Sob árvores, sob telhados e interiores já é numericamente baixo, chegando suavizado por interpolação de vértices. Colocar/quebrar blocos recalcula na hora = **sombras que acompanham em tempo real**. O baunilha só usa "suave" via `mix(ambiente, céu, skyLight)`.

As ferramentas certas são os dois passos de R9.12 (**restaurar valores crus via inversão do lift → binarizar com limiar `smoothstep`**. `th = 1 - r/15` marca diretamente o "raio de oclusão tratado como sombra") mais **abrir o sol direto com sky** (o sol só chega onde o céu é visível = a essência da projeção), com tom quente no sol / frio na sombra.

**Limites honestos**: estas sombras usam como base "o céu para cima", então **não giram quando o sol se move**. A resolução é por bloco (bordas suaves vêm da dispersão BFS). O template de iluminação ainda contém um stub fechado `var shadow: f32 = 1.;` para mapas de sombra (sempre 1.0 = desativado) — interpretado como rastro de sombras rotativas pixeladas "planejadas". Se essas sombras forem imprescindíveis, só restam vias fora da API (ex. injeção GLSL por userscript, com risco de política).

### Realidade submarina

Os looks submarinos constam de 3 camadas:

| Camada | Conteúdo | Operável desde pacotes? |
|---|---|---|
| ① Render de terreno/líquido | Processável por hooks. Os hooks light são chamados normalmente debaixo d'água | Sim (funciona "sob o véu") |
| ② Véu de definição líquida | Quad emissive de tela cheia da cor/alpha de definição do bloco líquido da câmera, desenhado na frente de tudo. O ajuste `cameraTint` ganha se existir | Não (nem cor nem densidade mudáveis) |
| ③ cameraTint | Ajuste do jogo | Não |

Pontos práticos: os pacotes seguem funcionando debaixo d'água / o véu não se remove / debaixo d'água não se ramifica (fogStart / fogEnd / fogColour não mudam debaixo d'água: fogVisibility tampouco o detecta).

## 16. Dicas de depuração

- Cavernas claras demais → falta curva não linear de `skyLight` (receita de cavernas R2 / R9.9)
- Dias estourados → baixe a exposição pré-ACES
- Noites escuras demais → assegure ambiente mínimo (o `skyLightColour` noturno é quase preto por premissa)
- Distância com bruma demais → baixe coeficientes aéreos
- Tudo laranja em torno de tochas → baixe a proporção quente (conserve algo de luz crua tingida)
- Blocos quase todo brancos → o total de saída do hook light supera 1.0 (sem clamp águas abaixo). Termine com `clamp(col, vec3f(0.0), vec3f(1.0))`
- Branco sem somas → inversão un-fog por divisão com fogVisibility. Tire un-fog; reconstrua desde `s.colour` e `mix` de névoa uma só vez ao final
- Blocos emissivos não brilham → falta re-soma de emission em receitas de reconstrução. Some `+ s.emission * l.fogVisibility`
- De noite só restam faces iluminadas → não escureça só sombras; atenue toda a cor terminada (`engineColour`) de noite. Para conservar lamparinas locais, atenue menos com `blockLight` / `heldLight` ([Parte VI](06-implementation.md), seção 19)
- Sombra não aprofunda com `pow(skyLight, γ)` → `l.skyLight` é pós-curva (seção 10). Mude para inversão + limiar de R9.12
- Ajustar área/densidade de sombra → guia de ajuste de R9.12 (área = limiar `shTh` / borda = `shSoft` / escuridão do núcleo = duplo ajuste de ambiente mínimo e dispersão do céu)

[← Parte anterior](03-recipes.md)·[Voltar ao manual](README.md)·[Parte seguinte →](05-troubleshooting.md)

[← Parte anterior](04-realism.md)·[Voltar ao manual](README.md)·[Parte seguinte →](06-implementation.md)

# Parte V: Solução de problemas e notas

> O jogo atual exige `apiVersion: 3` desde 2026-10-19 e rejeita pacotes v1/v2 ao carregar — o conteúdo abaixo está escrito sobre a especificação v2. Consulte [Parte IX](09-apiv3.md) para migrar antes de distribuir.

## 17. Erros comuns e soluções

| Sintoma | Solução |
|---|---|
| Não carrega em jogos estritos | Envolva o hook vertex em `#ifndef BLOXD_STRICT` |
| `.alpha` reportado indefinido | Envolva em `#ifdef BLOXD_ALPHA` |
| `blockLight` reportado indefinido | Envolva em `#ifdef BLOXD_LIGHTING`. Envolva funções auxiliares compartilhadas **como funções inteiras** (na v2 o campo existe em todas as variantes: raramente ocorre. Mantenha as guardas usadas para detecção) |
| `Packs can't construct BloxdSurface directly` | Comece de `bloxdDefaultSurface(s)` |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | Envolva em `#ifndef BLOXD_STRICT` |
| Distância branca e leitosa | Costuma ser névoa dupla. A cor terminada já leva névoa: mantenha sutil a bruma própria e prefira reduzir só saturação |
| `LightEngine: block light seed queue overflow - lighting may be incomplete for this chunk` | Aviso: a fila de sementes de luz transbordou em regiões de alta densidade de emissores ou através de fronteiras de regiões, e o cálculo de luz desse chunk foi encurtado. Sem origem "pacote", mas **os buracos de luz ao redor de concentrações de emissores vêm desse limite** — espalhar as fontes de luz pelo mundo evita isso |
| Pacote excluído ao entrar no jogo | Falha a verificação ao vivo do jogo. Revise omissões de guardas |
| A verificação ao vivo do jogo não termina nunca e o pacote cai com `This device couldn't check …` etc. | A verificação tem um prazo forçado de 60 segundos (o estouro conta como `skipped`). Frequente em dispositivos fracos / mundos pesados — alivie o trabalho pesado de vertex e os laços complexos, e tente de novo |
| `pack.json needs "apiVersion": 3.` | Falta `apiVersion` ou não é `3`. Adicione o número `3` (a string `"3"` é rejeitada). Pacotes v1/v2 são rejeitados com `shaderPack:loadWrongApiVersion` |
| `There's no pack.json at the top of the pack.` | Sem `pack.json` na raiz do ZIP. Confira não ter compactado a pasta em si |
| `bloxdTerrainVertex must be declared as: fn ...` | Assinatura distinta. Reescreva exatamente como mostrado |
| `bloxdTerrainVertex can't run in strict games...` | Envolva o hook vertex em `#ifndef BLOXD_STRICT` |
| `BloxdLightIn.blockLight only exists when BLOXD_LIGHTING is defined...` | Envolva em `#ifdef BLOXD_LIGHTING` (na v2 o campo existe em todas as variantes: raramente ocorre) |
| Subir `pow(l.skyLight, γ)` jamais aprofunda sombras | `skyLight` é valor pós-curva (cru 0.87 chega como 0.97). Mude para inversão + limiar de R9.12 (seção 10) |
| `... can only be a function's parameter or return type, ...` | `var x: BloxdSurface;` sem inicializar é rejeitado. Construa desde `bloxdDefault*` |
| `bloxdPackInputs isn't part of the bloxd_ header` | O uniform PackInputs não pode ser referenciado desde pacotes diretamente. Use-o via funções de cabeçalho como `bloxdTime()` |
| `Packs can't declare bloxd_ names...` | Tire o prefixo `bloxd_` dos seus identificadores. Só os 6 nomes de hook podem ser definidos |
| `_ can only be the target of a phony assignment, as in _ = f();` | `let _ = f();` é rejeitado. Escreva `_ = f();` |
| `...needs BLOXD_SCENE_DEPTH, but this hook also runs on terrain...` | Envolva as chamadas `bloxdOpaqueBehind()` em hooks de terreno com `#ifdef BLOXD_SCENE_DEPTH` |
| `...only surface and light hooks can use.` | Remova `bloxdOpaqueBehind()` de hooks vertex (só surface / light) |
| `Lite: …reads scene depth on a page that didn't turn it on` | Recarregue a página e reabra-a com o pacote que lê a profundidade ativado ([Parte VIII](08-apiv2.md) §35). A disponibilidade da textura de profundidade é fixada na geração da página |
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Não é erro mas autodesativação em jogos estritos (`shaderPack:offInStrict`). Envolva hooks vertex e `discard` com `#ifndef BLOXD_STRICT` |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Erro de segunda etapa (Tint do navegador). Ponha entre parênteses operandos de `^` `&` `\|` `<<` `>>` (§38) |
| `loadDuplicateManifest` ao carregar zip | Dois `pack.json` (incluindo variantes de maiúsculas/minúsculas). Deixe um |
| `needs the new WebGPU renderer, so remove the renderer override...` | Remova o parâmetro URL `?renderer=` e o `bloxdRenderer` do localStorage, e recarregue ([Parte VII](07-internals.md) §29) |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Reescreva desde `bloxdDefaultSurface(s)`. Começar de uma cópia do primeiro parâmetro do hook light (`var out = s;`) também vale |

### IDs de erro da fase de carregamento

Os erros da tela de configurações carregam IDs `shaderPack:load*`. Como ajuda de memória para localizar uma mensagem:

| ID | Significado |
|---|---|
| `loadZipTooBig` | zip acima de 32MB |
| `loadTooManyZipEntries` | mais de 1024 entradas de zip |
| `loadTooManyWgsl` | mais de 256 arquivos `.wgsl` |
| `loadSourceTooBig` | total `.wgsl` acima de 256KB (verificação em fluxo, arquivo por arquivo) |
| `loadManifestTooBig` | `pack.json` acima de 64KB |
| `loadManifestNotJson` / `loadManifestNotObject` | `pack.json` não é JSON / não é um objeto |
| `loadNoApiVersion` / `loadWrongApiVersion` | `apiVersion` ausente / ≠ `3` (pacotes v1/v2 recusados) |
| `loadNoName` / `loadAuthorNotString` | `name` ausente / `author` não é uma string |
| `loadUnsupportedCompression` / `loadZip64` / `loadSplitZip` / `loadEncrypted` | compressão não suportada / zip64 / dividido / criptografado |
| `loadDuplicatePath` / `loadNotUtf8` / `loadDecompressFailed` / `loadZipDamaged` | caminhos duplicados / não UTF-8 / falha de descompressão / zip danificado |

`loadNoManifest` / `loadDuplicateManifest` (posição / duplicatas de `pack.json`) — veja as linhas correspondentes da tabela acima.

## 18. Direitos e notas

- O recurso de pacotes de shaders é um recurso oficial carregável pela interface do jogo, e criar pacotes é considerado uso previsto. Mas não se confirmou documentação oficial pública
- Pacotes são WGSL puro — execução de JS e acesso à rede são impossíveis por projeto
- Este é um guia não oficial, não a posição oficial dos desenvolvedores. A API pode mudar sem aviso

[← Parte anterior](04-realism.md)·[Voltar ao manual](README.md)·[Parte seguinte →](06-implementation.md)

[← Parte anterior](05-troubleshooting.md)·[Voltar ao manual](README.md)·[Parte seguinte →](07-internals.md)

# Parte VI: Notas importantes de implementação

> O jogo atual exige `apiVersion: 3` desde 2026-10-19 e rejeita pacotes v1/v2 ao carregar — o conteúdo abaixo está escrito sobre a especificação v2. Consulte [Parte IX](09-apiv3.md) para migrar antes de distribuir.

## 19. Corrigindo "sombras escuras mas superfícies brilhantes" de noite

Escurecer só sombras deixa a cor terminada (`engineColour`) brilhante sem sol, e o salto face/sombra fica antinatural. Atenue toda a cor terminada.

O exemplo trata `bloxdSunDirection()` zero como noite e sol direcional como dia, atenuando as cores terminadas do terreno em horas escuras. Onde `blockLight` e `heldLight` são fortes, a atenuação enfraquece para preservar lamparinas próximas como tochas. `0.52` é valor de ajuste — baixe para noites mais escuras.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    #ifdef BLOXD_LIGHTING
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
    let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
    let protectLocalLight = smoothstep(0.03, 0.35, localLight);
    scale = mix(nightDim, 1.0, protectLocalLight);
    #endif
    // atenua a cor terminada; soma a emissão do material com névoa por padrão
    out.colour = l.engineColour * scale + s.emission * l.fogVisibility;
    return out;
}
```

**Limites desta correção:** se `bloxdSunDirection()` se comporta como "direção unitária com sol, zero sem ele", dia/noite se distinguem mas o ocaso não se estima suavemente. E como atenua a cor terminada, enfraquece juntos a luz diurna e o ambiente do motor — não é reprodução total do horário. Para aplicar o mesmo a líquidos, revise a relação de fallback dos hooks de líquido.

## 20. Receita integrada para água com aparência natural

Esta API não pode amostrar cor de cena: é **estilização pseudo com mistura de cor fresnel e realces solares, não reflexo/refração reais** (o cálculo de profundidade chegou na v2 com `bloxdOpaqueBehind()`, separado na [Parte VIII](08-apiv2.md) R-E). A amostra conserva a cor base, mistura um pouco para cor de céu em ângulos rasantes e adiciona um pequeno brilho só com sol.

```wgsl
fn pack_waterWaveNormal(p: vec3f, t: f32) -> vec3f {
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3;
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}

fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let baseN = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let facing = clamp(dot(baseN, viewDir), 0.0, 1.0);
    let fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    let fakeSkyReflection = vec3f(0.16, 0.29, 0.36);
    out.colour *= vec3f(0.88, 0.97, 1.04);
    out.colour = mix(out.colour, fakeSkyReflection, fresnel * 0.38);
    #ifdef BLOXD_LIGHTING
    let worldPos = bloxdWorldPosition(l.position);
    let topness = clamp(baseN.y * 2.0, 0.0, 1.0);
    let waveN = normalize(mix(baseN, pack_waterWaveNormal(worldPos, bloxdTime()), topness));
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let halfDir = normalize(viewDir + sunDir);
        let glint = pow(max(dot(waveN, halfDir), 0.0), 180.0) * 0.55 * clamp(l.skyLight, 0.0, 1.0);
        out.colour += vec3f(1.0, 0.97, 0.90) * glint;
    }
    #endif
    return out;
}
```

Pistas de ajuste:

- Água branca/lavada: baixe `0.38` em `fresnel * 0.38` e o brilho `0.55`.
- Água escura demais: misture um pouco mais de `fakeSkyReflection`. Em excesso parece plástico.
- Linhas ou listras regulares na água: baixe frequências de onda e força de brilho. Este código não desloca vértices de malha.
- Reflexos reais da paisagem: as entradas desta API não têm cor de tela: misturar cores jamais é reflexo real (profundidade só limitada a líquidos. [Parte VIII](08-apiv2.md) R-E).

Esta receita **substitui** um `bloxdLiquidLight` existente. Não a cole junto à função de onda homônima de R9.7 nem outros hooks homônimos.

## 21. Lista de testes no jogo

Sucesso de compilação e "boa aparência" são coisas distintas. Confira nesta ordem:

1. **Carga:** `pack.json` na raiz do ZIP. Logo após a seleção aparece `Ready. Reload the page to use it.` e o pacote fica ativo **ao recarregar a página**; confirme `Ready to use` depois. Pacotes salvos são revalidados automaticamente no próximo carregamento da página: a cada atualização do cabeçalho de spec no motor, o conteúdo do cabeçalho é verificado por impressão digital (sucesso = permanece como está / falha = mostrado bloqueado), então um pacote antigo quebrado nunca fica silenciosamente ativo.
2. **8 variantes:** sem omissões de guardas de tipos em strict / allow, iluminação on / off, terreno / líquido. Mesmo que um jogo só use algumas condições, pacotes de distribuição devem assumir as 8.
3. **Dia:** cores sem estourar por material (grama, pedra, areia, madeira); salto claro/escuro natural entre topos e laterais.
4. **Noite:** compare os mesmos materiais à plena luz passada, sombras e perto de tochas. Se só restam faces iluminadas, ajuste a atenuação de exposição; se tudo escurece, ajuste a proteção de luz local.
5. **Água:** olhe de cima, ângulos rasantes, margens, debaixo d'água e de noite separadamente. O comportamento alpha e o visual submarino dependem da composição do jogo — nunca julgue de um só ponto de vista. Debaixo d'água o véu de definição líquida cobre na frente (como descrito na [Parte VII](07-internals.md)): as diferenças do pacote aparecem sobretudo na superfície e no terreno através do véu.
6. **Bordas e distância:** sem saltos de ondas/padrões em transições de chunk / origem; sem névoa dupla nem bruma branca longe.
7. **Desempenho:** efeitos pesados em hash/trig/`pow` por fragmento no mínimo. Adicione detalhe aos poucos e compare FPS.

### Restrições conhecidas como premissas

- Pacotes se limitam a hooks de terreno / líquido — sem trato de céu, entidades ou UI com o mesmo código.
- Não existem entradas para adicionar mapas de sombras, reflexos em espaço de tela, refração, bloom etc. (a profundidade de cena foi desbloqueada limitada a líquidos como `bloxdOpaqueBehind()`. Ver [Parte VIII](08-apiv2.md)).
- `bloxdTime()` é tempo de animação sem vínculo garantido com o dia/noite do jogo.
- Com `bloxdSunDirection()` zero a verdadeira direção lunar é desconhecida, não "física de luar" mas aproximação de ambiente. O luar direcional se constrói desde `-bloxdSunDirection()` (só mundos com ciclo dia/noite. [Parte VII](07-internals.md) R-A).
- `s.position` / `l.position` são coordenadas locais: some `bloxdOriginOffset()` para efeitos dependentes do mundo. Para padrões locais do bloco, as coordenadas locais são a ferramenta intencional.

## 22. Combinar com outros pacotes quando o shader sozinho bate no limite

Como pacotes não podem adicionar nem amostrar texturas, não tente resolver relevos finos de material ou imagens do céu só com shaders. O repositório público de pacotes de texturas para Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) trata texturas, skybox, modelos etc. por outra via.

Como referência, distribuições comunitárias "cinematic shader" analisadas num caso resultaram ser pacotes de texturas (texturas 128x128 sem `pack.json` / `.wgsl`).

Na prática, **ajuste luz e cor com shaders e cubra materiais e céu com um pacote de recursos combinado**. Mas verifique co-uso e ordem de carga segundo a implementação e ajustes do jogo.

Os pacotes de texturas têm especificação própria (para referência): o limite de tamanho é 25MB medido como o comprimento da string JSON codificada em base64; codificar um PNG em base64 infla +33%, então o teto prático para imagens cruas é ~18–19MB. O CSS é processado por um analisador regex simples — evite aninhamento e comentários.

## 23. Realidade submarina com pacotes de shaders

Os looks submarinos constam de 3 camadas:

| Camada | Conteúdo | Operável desde pacotes? |
|---|---|---|
| ① Render de terreno/líquido | Processável por hooks. Os hooks light são chamados normalmente debaixo d'água | Sim (funciona "sob o véu") |
| ② Véu de definição líquida | Quad emissive de tela cheia da cor/alpha de definição do bloco líquido da câmera, desenhado na frente de tudo. O ajuste `cameraTint` ganha se existir | Não (nem cor nem densidade mudáveis) |
| ③ cameraTint | Ajuste do jogo | Não |

Pontos práticos: os pacotes seguem funcionando debaixo d'água / o véu não se remove / debaixo d'água não se ramifica (fogStart / fogEnd / fogColour não mudam debaixo d'água: fogVisibility tampouco o detecta).

[← Parte anterior](05-troubleshooting.md)·[Voltar ao manual](README.md)·[Parte seguinte →](07-internals.md)

[← Parte anterior](06-implementation.md)·[Voltar ao manual](README.md)·[Parte seguinte →](08-apiv2.md)

# Parte VII: Suplemento de interioridades

> O jogo atual exige `apiVersion: 3` desde 2026-10-19 e rejeita pacotes v1/v2 ao carregar — o conteúdo abaixo está escrito sobre a especificação v2. Consulte [Parte IX](09-apiv3.md) para migrar antes de distribuir.

Especificações extra achadas por análise de implementação do motor. Tudo restaurado diretamente do JavaScript do build de produção atual.

## 24. Identidade do sol e da lua

A fonte de `bloxdSunDirection()` é um buffer de direção solar reescrito só quando muda o tipo de skybox — o critério não é "se o céu tem sol" mas **"se o skybox é tipo terra"**.

| Skybox | `bloxdSunDirection()` |
|---|---|
| `default` (céu procedural) | Não zero (defeitos abaixo) |
| `gloomy` / `interstellar` / `space_*` (texturas cubo) | **Sempre (0,0,0)** |

**A lua está sempre em `-bloxdSunDirection()`** (o motor calcula a posição lunar como o oposto exato do sol). A noite se julga por altura solar — há lua acima quando `bloxdSunDirection().y < 0` (sol sob o horizonte). Mas em mundos padrão o sol é estático e a lua também — só os mundos com ciclo dia/noite a veem mover-se.

A direção solar padrão ronda `(-0.56, 0.81, -0.18)` (vetor unitário de inclination = −0.2 / azimuth = 0.55, estático). Referência prática para predizer direções de brilho ao testar pacotes de distribuição.

Os ciclos dia/noite não estão integrados no motor — inclination é um número estático que os mundos com dia móvel atualizam lado jogo. `bloxdSunDirection()` segue cada atualização.

As luzes direcionais do terreno são só 2 lâmpadas criadas ao arrancar a cena, de **direção e intensidade fixas, sem mudança dia/noite**. Em curto: **nenhum fator de brilho do terreno depende do tempo. Os "looks" dia/noite vêm só do skybox e bloxdSunDirection()**, assim os pacotes que escurecem de noite devem estimar a faixa horária desde bloxdSunDirection() (a técnica `sunPresent` de §19).

### R-A. Luar direcional — moonDir = −bloxdSunDirection()

Soma Lambert branco-azulado e especular fraca só enquanto a lua está acima. `moonUp` é 0 em mundos de sol estático padrão: ali nada acontece — **luar que só dispara em mundos com ciclo dia/noite, logo seguro**.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // a lua está sempre exatamente oposta ao sol; auto-off diurno via moonDir.y < 0
    let moonDir = -bloxdSunDirection();
    let moonUp  = smoothstep(0.0, 0.15, moonDir.y);
    if (moonUp > 0.0) {
        let n     = normalize(l.normal);
        let diff  = max(0.0, dot(n, moonDir));
        let view  = normalize(bloxdEyePosition() - l.position);
        let halfV = normalize(moonDir + view);
        let spec  = pow(max(0.0, dot(n, halfV)), 48.0) * 0.25;
        out.colour += vec3f(0.10, 0.14, 0.24) * (diff * 0.6 + spec) * moonUp;
    }
    #endif
    return out;
}
```

## 25. Interioridades da névoa

O cômputo de névoa é sempre modo LINEAR (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), com `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = ajuste de névoa; só D = 0 é especial com fogEnd = 5). **A banda de gradiente é de só 32 blocos**, e `l.fogVisibility` é menos "bruma por distância" que **distância normalizada à borda do mundo carregado**. Varia por jogador com a distância de carga: efeitos por distância devem calcular `distance(l.position, bloxdEyePosition())` eles mesmos (receita R-B). (nota da v3: a função de névoa do renderizador implementa na verdade **quatro** modos — desativada / exponencial / exponencial ao quadrado / linear —, e os títulos publicados usam o linear; o código restaurado e o argumento de robustez estão na [Parte IX](09-apiv3.md) §50.)

Cor de névoa padrão `rgb(183, 191, 195)` (cinza azul pálido). Criadores de mundos a mudam via `fogColourOverride` (hex). Com modo névoa 0 (NONE), **fogColour chega preto**. A forma padrão `mix(l.fogColour, col, l.fogVisibility)` é segura pois a cor de névoa não se usa a fogVisibility 1. A API de script oferece duas opções a mais, `fogChunkDistanceOverride` e `fogOnSkybox`: os Custom Games podem ajustar independentemente a distância de névoa (o valor D) e a aplicação da névoa ao skybox. Por padrão o skybox não é afetado pela névoa (só jogos que ativam `fogOnSkybox` tingem também o skybox com a cor de névoa).

Ajustar `showFog` para false empurra a névoa a 3200–3232 blocos, desativando de fato (`fogVisibility ≈ 1` segue vindo).

### R-B. Banda de borda de carga — fogVisibility como "borda do mundo"

Esfria em silêncio só a banda de 32 blocos da borda de carga para disfarçar o fim do mundo (ou enfatizá-la como efeito). Sem distância autocalculada: segue auto os ajustes de distância de carga do jogador.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    // fogVisibility: 1 = dentro (margem à borda), 0 = a ponto de sair da borda
    let edge = 1.0 - l.fogVisibility;
    let band = smoothstep(0.0, 1.0, edge);
    out.colour = mix(out.colour, out.colour * vec3f(0.82, 0.86, 0.95), band * 0.5);
    return out;
}
```

## 26. Interioridades de blockLight / heldLight

`blockLight` é uma **luz colorida** de três canais RGB. Cada bloco emissor define uma cor de emissão `[R, G, B]` (0–15 cada) levada como está como cor da luz (tocha normal = branco quente (14,14,12) / lava = laranja (14,8,2) / beacon = ciano (5,14,14) / tocha branca = (15,15,15), etc.). No estágio de vértice ela chega empacotada em 4 nibbles — r / g / b / sky — num atributo float. Tratar os três canais separadamente no hook light abre a iluminação local colorida — a receita de tocha quente (R9.1) é calibrada nesse comportamento.

Ao decodificar `aPackedLightLevels`, o motor põe a cada canal um **piso de 35% do canal RGB mais brilhante**. Ex. uma "luz vermelha pura" eleva-se a (1.00, 0.35, 0) em vértices antes de interpolação e lift. O laranja de tocha parecendo "rosa esbranquiçado mais que vermelho" vem daqui — ajuste a saturação de receitas de tocha quente (R9.1) contra este default.

A composição de luz não é aditiva. Internamente o motor toma o **max** entre a luz de bloco (após o piso de 35 %) e a luz de céu construída como `mix(cor ambiente, cor de céu, skyLight)`, e então toma de novo o max com a luz de mão (após boost de ambiente). Os valores de canal nessa composição são os valores **pós-lift** — o motor compõe a partir dos mesmos níveis de luz elevados que chegam às entradas dos hooks (`terrainLightLevels` após a curva de lift), tanto na v2 quanto na v3. Portanto `blockLight` e `skyLight` nunca se anulam — a contribuição do lado mais escuro é simplesmente descartada — enfraquecer a luz de céu quase não escurece as zonas dominadas por blockLight. Projete as receitas de exposição / atenuação em torno dessa estrutura (a proteção de luz local na [Parte VI](06-implementation.md) §19 existe para compensar isso).

A luz de mão (`heldLight`) tem alcance segundo o canal mais brilhante (máx 15 blocos) com pré-processo `dist^0.75`, o mesmo piso 35%, e `l.heldLight` é o valor **pré**-boost ambiental. A queda do cone, restaurada do módulo de luz do motor: a atenuação angular do feixe é `1 − 0.5 × (smoothstep(0.12, 0.65, t) + smoothstep(0.62, 0.95, t))`, onde `t` é o ângulo normalizado desde o eixo do cone (0 = centro, 1 = borda); o alcance é `(rangeOverride > 0 ? rangeOverride : canal mais brilhante) × queda do cone`, com `rangeOverride` lido do alpha da cor da luz na mão; dentro do alcance, uma sobreescrita atenua por `(range − dist) / range`, enquanto o padrão subtrai a distância (pré-processada) canal a canal; depois vêm o piso de 35 %, a divisão por 15, a curva de lift e, por fim, o boost de ambiente. Objetos personalizados podem fixar `spotlightRange` e ângulo de cone — um modo "feixe enquanto segura" cujo cone segue a câmera. Pacotes não podem saber a direção do feixe.

Blocos personalizados podem levar `skyLightEmission` (0–15), que **injeta no próprio canal skyLight, à parte do BFS de blockLight**. Pacotes estilo R9.12 que julgam sol/sombra por limiar skyLight podem falhar em mundos com skyLight elevado por luzes artificiais. Pacotes de distribuição julgam mais robusto combinado com blockLight.

## 27. Detalhes de pipeline

- **Os hooks surface correm "antes" de alphaTest**: `out.alpha` alimenta o teste de descarte diretamente. Materiais cutout (grama, folhas) permitem efeitos de dissolução tipo dither (receita R-C). Em líquidos (mistura) `out.alpha` é a transparência real (receita R-D). Sem efeito em terreno opaco normal — não confundir
- **Conteúdo de `l.ambient`**: `material.ambient × sceneAmbient`, distinto por material. O lado cena ata ao ajuste gráfico "Ambient Lighting Intensity" (defeito 0.5) — nunca programe defeitos fixos
- **As luzes direcionais da cena formam um rig de 2 luzes**: a soma de Lambert da luz principal (direção vinda da posição do sol ajustada no skybox, intensidade 1.0) e da luz de preenchimento (direção `[-0.5, -1, -1]`, intensidade 0.35) chega em `l.directional`. A luz de preenchimento aponta para baixo: não acrescenta nada às faces para cima e cobre as superfícies voltadas para baixo (tetos de cavernas etc.). O terreno só considera luzes adicionadas em `_initScene`; as adicionadas após o início são ignoradas pelo terreno e pelos modelos de blocos (uma mensagem de aviso oficial diz isso)
- **`bloxdTime()` é realmente `performance.now()`**: o uptime do navegador enrolado a 1 hora. Sem relação com dia/noite do jogo nem tempo de mundo decorrido. Para animar sincronizado a um relógio de jogo, estime a hora desde o azimute `bloxdSunDirection()` em mundos com ciclo dia/noite
- **As funções de cabeçalho leem um único uniform**: o motor coloca um uniform de 64 bytes em `@group(3) @binding(0)` (4 slots — time / originOffset / sunDirection / eyePosition, little-endian), e `bloxdTime()` / `bloxdOriginOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` correspondem à leitura desses slots. Um pacote não pode escrever esse uniform, e como o WGSL do pacote e o do motor se fundem num único módulo, declarar o mesmo group/binding por conta própria também é impossível (a v3 renomeia os dois slots — `seconds` / `renderOffset`, expostos como `bloxdSeconds()` / `bloxdRenderOffset()` — e adiciona a textura de profundidade da cena em `@group(3) @binding(1)`; ver [Parte IX](09-apiv3.md) §41 e §51)
- **Os dados de vértice são construídos pelo mesher (Web Worker)**: o terreno de blocos é entrelaçado com 28 bytes por vértice (32 bytes quando o atlas está ativo) — posição = float32×3 / normal = inteiro com sinal de 8 bits×4 / cor = inteiro normalizado de 8 bits×4 (a substância de `s.colour` — tinta × AO é cozida em 8 bits na etapa do mesher, separá-la ou restaurá-la no lado do pacote é portanto impossível por princípio) / UV = float32×2 / atlasIndex = float32. Só os níveis de luz viajam num buffer de vértice separado de 4 bytes ([Parte VII](07-internals.md) §26, [Parte II](02-api.md) §11). Os vértices são desenhados por instanciação por chunk
- Os finos damieiros em bordas de chunk ao carregar são o fundido de chunk por dither Bayer 4×4 em espaço de tela do motor, não bugs do pacote (desativável pelo ajuste gráfico `chunkFadeIn`)
- **`mod` é palavra reservada**: rejeitado com `pack.wgsl:3 'mod' is a reserved word in WGSL.` Escreva restos com o operador `%`

### R-C. Dissolução por dither Bayer — out.alpha controla discard

Reproduz a **mesma tabela Bayer 4×4** que o motor usa em fundidos de chunk, dissolvendo cutouts desde blocos baixos. discard dispara em materiais alphaTest (grama, folhas); em líquidos é transparência de mistura.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod é reservado: use o operador %
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // dissolve-se desde blocos baixos; maior dissolve persiste
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdOriginOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

### R-D. Fundido de água cercana à câmera — o alpha líquido despeja a vista

O `out.alpha` do hook líquido alimenta a mistura diretamente. Despeja só a superfície sob a câmera para assegurar a vista ao mergulhar ou com câmera sobre a água.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 blocos de transparente total a normal
    #endif
    return out;
}
```

## 28. O que muda os valores visíveis do pacote — lista de provas

O mesmo pacote renderiza distinto segundo **mundo e ajustes de jogador**. Revise ao menos estes 3 ambientes antes de distribuir:

1. **Mundo normal** (skybox default, sem overrides) — bloxdSunDirection() ≈ `(−0.56, 0.81, −0.18)`, cores padrão
2. **Mundo com skybox espacial** — bloxdSunDirection() = 0. O look do ramo `sunPresent`
3. **Mundo personalizado com `visionMinLightColour` / `skyLightColourOverride`** — escuros elevados e cores

Fontes principais de variação: `lightingOverride` (iluminação forçada) / `skyLightColourOverride`, `ambientLightColourOverride` (trocas hex) / `visionMinLightColour` ("cor mais escura visível". Implementado como um max por componente contra `uSkyLightColour` e `uAmbientLightColour` ao mesmo tempo; Night Vision o usa — os pacotes "caverna às escuras" não escurecem o previsto, e a própria cor de céu é elevada) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (presença de bloxdSunDirection()). `uSkyLightColour` padrão = (1,1,1) branco, `uAmbientLightColour` padrão = (0.25,0.25,0.30). `l.ambient` lado cena = ajuste gráfico "Ambient Lighting Intensity" (padrão 0.5). `l.fogVisibility` segue os ajustes de névoa/distância de chunks do jogador. Também `cameraTint` (tinta RGBA sobre a tela toda) e `proximityFadeDistance` / `proximityFadeMinOpacity` (fade de proximidade da câmera para entidades) são fatores de variação por mundo — `cameraTint` em especial é uma passada final composta **por cima** da saída do pacote. Muitos desses ajustes também podem ser definidos pela API de script (`serverOption`) e atualizados durante a partida.

## 29. Meios de depuração

- Parâmetro URL `?renderer=lite` — força o renderizador Lite (`?renderer=webgl2` / `babylon` também valem; `babylon` = nome antigo do webgl2). A prioridade: parâmetro URL > localStorage `bloxdRenderer` > tela de configurações > padrão (webgl2). Valores inválidos são ignorados com um aviso. Overrides remanescentes na URL ou no localStorage podem quebrar cenas que exigem WebGPU (lite) com `needs the new WebGPU renderer, so remove the renderer override...` ([Parte V](05-troubleshooting.md) §17)
- Parâmetro URL `?vconsole` — consola em tela (VConsole). Útil em verificação móvel real
- Parâmetro URL `?drawcalls=1` — adiciona um painel de depuração de estatísticas de draw. Selecione objetos de jogo na consola de depuração, ou use `drawCalls()` / `why()` / `configureDrawCallWatching()`, para inspecionar o overdraw de mecanismos grandes (do pacote ou não) e a aproximação do teto de ~65.000 vértices por draw — útil para isolar gargalos de desempenho
- A consola mostra `noa-engine v0.33.0` e `Renderer: lite from <fonte>` — revise-os primeiro para não diagnosticar mal a via de render
- O renderizador WebGPU bloqueia-se "forçado ON" com pacote aplicado. O ajuste "Disable Block Texture Atlas" também se bloqueia (o atlas fica ON), e em ambientes sem WebGPU o pacote nem aplica. Base para escrever "precisa navegador WebGPU" em páginas de distribuição
- As texturas de blocos são uma textura de array 2D (`texture_2d_array`), e o sampler do terreno é nearest + repeat. O mesher também funde faces com material / AO / luz idênticos num retângulo (**greedy meshing**), então a UV de uma face fundida pode exceder a largura de um tile (bordas recuadas em 0.0015). O endereçamento repeat do hardware cuida do encaixe, então faces fundidas parecem sem costura. Note que um detalhe procedural atrelado à `vUV` pode quebrar nas fronteiras de fusão — prefira atrelá-lo à posição de mundo (`s.position` + `bloxdOriginOffset()`)
- A revalidação runtime por partida (`checkCompilation`) compila materiais de terreno reais em WebGPU do navegador (mais estrita que a validação estática de ajustes). Os pacotes que falham aqui se excluem desse jogo

## 30. Modos de aplicação por jogo (`shaderPackPolicy`)

Aqui fica definido o que significam `allow / strict` no nível de título (cf. §7). Só os títulos cuja definição de jogo carrega explicitamente `shaderPackPolicy: "allow"` rodam em modo completo (hooks vertex, `discard`, `alpha` de terreno); títulos sem valor (ou com valor diferente de allow) são estritos: `BLOXD_STRICT` fica definido e o código amparado por guardas fica desativado automaticamente. O lado do pacote não escolhe isto, então saber que títulos rodam o quê é pré-requisito da distribuição.

- Build de referência: `szby6g.main.94a7596c.js` (deploy em produção em 2026-10-17). Enumerando estaticamente as 111 definições de jogo: **26 entradas allow (12 títulos) / 85 entradas estritas**. Os mesmos 12 literais allow, nos mesmos 12 títulos, foram reconfirmados sem alteração no bundle de produção da v3 (`3ymzdd`, 2026-10-20) — a lista abaixo se mantém literalmente na v3.
- Acima de `shaderPackPolicy` existe um bloqueio de canal de distribuição (basicamente `canUseShaderPacks`): via portais externos (por exemplo, builds do Coolmath Games) o próprio sistema de pacotes de shaders pode ser desativado antes mesmo que `shaderPackPolicy` seja consultado. A análise allow/strict abaixo diz respeito à build web principal do bloxd.io.
- allow é declarado em 12 lugares: 8 literais diretos em definições de jogo e 4 variáveis base (`tb` / `kz` / `cb` / `Fb`); as variantes herdam por spread (`{...tb,...}`). Hoje não existe sobreescrita por variante (nem o padrão inverso pai-allow / filho-estrito).

Os 12 títulos allow (26 entradas no total):

- **Test Gym** — base + Empty / Mobs / Mobs & Worldgen / Schematic / Fragment Shader / Item Drops / Bot Armour / Void / Busy / Particles (11 entradas)
- **Doodle Cube** — base + Solos / Duos (3)
- **Rocket Obby** — base + Sheep / January (3)
- **9 títulos individuais**: Creative (`classic_creative`) / Bloxd Hop / Fishing / Dress Up / Evil Tower / Plots / Test Mode (`schematicTester`) / Tsunami Steal Brainrots / Work at a Restaurant (`cooking`)

No lado estrito, os casos mais enganosos:

- **Superflat Creative (classic_creativeFlat) é estrito.** O nome contém "Creative", mas na família classic só o Creative normal (`classic_creative`) é allow. Peaceful / Survival / SMP / Worlds / Anarchy / Survival with Guns etc. são todos estritos
- **Custom Games (customGames) é estrito.** Efeitos de hooks vertex não disparam em jogos personalizados criados pelo usuário. Para o trabalho de verificação, Test Gym é a escolha segura
- Títulos principais PvP / de servidor como bedwars / skywars / skyblock / oneBlock / greenville / pirates / shooting (cubeWarfare) são todos estritos

Note que nos títulos estritos o pacote continua sendo carregado e compilado, e as receitas do lado fragment como surface / light funcionam normalmente. O que fica restrito: os hooks vertex (`bloxdTerrainVertex` / `bloxdLiquidVertex`), `discard` e a `alpha` de terreno (em líquidos existe sempre).

Esta lista reflete a análise estática do build indicado; atualizações do motor podem mudar a divisão allow/strict. Reconfirme ao saírem versões novas.

[← Parte anterior](06-implementation.md)·[Voltar ao manual](README.md)·[Parte seguinte →](08-apiv2.md)

[← Parte anterior](07-internals.md)·[Voltar ao manual](README.md)

# Parte VIII: Guia de migração para API Version 2

> O jogo atual exige `apiVersion: 3` desde 2026-10-19 e rejeita pacotes v1/v2 ao carregar — o conteúdo abaixo está escrito sobre a especificação v2. Consulte [Parte IX](09-apiv3.md) para migrar antes de distribuir.

Build alvo: `6qxffk.main.5912a15f.js` (deploy em produção em 2026-10-16). As Partes I–VII deste guia já estão reescritas à base v2; esta Parte VIII recolhe os pontos de migração desde a v1 e as novidades da v2. Os exemplos de código das novidades passam a validação de 8/8 variantes no compilador v2 e a validação do compilador WGSL do navegador (Tint) (§38), mas a conversão v2 de receitas existentes é substituição mecânica de identificadores — verifique sempre com compilação em jogo antes de distribuir.

## 31. Destino dos pacotes v1 (conclusão primeiro)

O jogo exige que o `apiVersion` do manifesto **coincida estritamente com 2**. Carregar um pacote v1 é rejeitado com `This pack is for shader pack API version 1. Bloxd supports version 2.` (chave i18n `shaderPack:loadWrongApiVersion`). **Não há suporte paralelo v1/v2**. O motor também re-verifica o `validation.headerVersion` de pacotes salvos (hash do texto completo do cabeçalho): o mecanismo que marca pacotes salvos "a re-verificar" em atualizações do motor é igual ao da v1.

## 32. Renomeação total de identificadores (tabela de correspondência)

v2 unifica o nomeado com sublinhados em camelCase. **Nomes velhos são totalmente inutilizáveis.**

| v1 | v2 |
|---|---|
| `bloxd_terrain_vertex` | `bloxdTerrainVertex` |
| `bloxd_terrain_surface` | `bloxdTerrainSurface` |
| `bloxd_terrain_light` | `bloxdTerrainLight` |
| `bloxd_liquid_vertex` | `bloxdLiquidVertex` |
| `bloxd_liquid_surface` | `bloxdLiquidSurface` |
| `bloxd_liquid_light` | `bloxdLiquidLight` |
| `bloxd_defaultVertex` | `bloxdDefaultVertex` |
| `bloxd_defaultSurface` | `bloxdDefaultSurface` |
| `bloxd_defaultLight` | `bloxdDefaultLight` |
| `bloxd_VertexIn` | `BloxdVertexIn` |
| `bloxd_Vertex` | `BloxdVertex` |
| `bloxd_SurfaceIn` | `BloxdSurfaceIn` |
| `bloxd_Surface` | `BloxdSurface` |
| `bloxd_LightIn` | `BloxdLightIn` |
| `bloxd_Light` | `BloxdLight` |
| `bloxd_packInputs` (uniform interno) | `bloxdPackInputs` (`@group(3) @binding(0)`, 64B) |

Os tipos de hook (vertex / surface / light × terrain / liquid, 6 no total) e o formato `pack.json` (`apiVersion` / `name` / `author`) não mudam. Os limites do carregador tampouco (zip 32MB / 1024 entradas / 256 arquivos `.wgsl` / 256KB total / 64KB manifesto).

## 33. Destino dos campos removidos

Na v1, `time` / `eyePosition` / `sunDirection` / `originOffset` eram campos de structs. Na v2 **esses campos são removidos; em vez disso usam-se funções de cabeçalho que leem o uniform do motor (`bloxdPackInputs`)**. Como as funções leem o uniform diretamente, **podem ser chamadas desde funções de escopo de módulo fora dos hooks e desde hooks vertex**.

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| `s.position + vec3f(...)` para conversão a coordenadas de mundo | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

## 34. Novidade ①: `blockId` (sombreamento por bloco)

Os três structs `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` ganham `blockId: u32`. É o **ID do bloco dono** (0–65535), uniforme em toda a face (passado com `@interpolate(flat)`). Use-o para identificar tipos de bloco sem depender da cor de textura. Mas a tabela ID-tipo vive dentro do motor e é invisível desde pacotes: **qual ID é qual bloco pode ser medido no mundo ou consultado na referência abaixo**. Internamente esse ID é embutido no alpha da cor de vértice (8 bits baixos) e no w da normal (8 bits altos) — 16 bits no total, daí o teto de 65535. O sistema blockId em si só fica ativo enquanto houver um pacote de shaders ativo (sem pacote, a fiação mantém seus alvos de preenchimento, mas nas definições de structs da Parte II essa diferença é inobservável).

**Referência**: o autor publica uma lista de entradas do jogo em [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (`entries.json`: tabela id ↔ nome do bloco; variantes de rotação/meta como `Furnace|meta|rot2` aparecem como IDs separados). As correspondências podem mudar com atualizações do jogo — confirme o definitivo no jogo real.

Exemplos de blocos comuns (segundo entries.json em 2026-10-18; só as famílias de terreno de ID baixo estão listadas):

| ID | Nome do bloco | ID | Nome do bloco |
|---|---|---|---|
| 0 | Air | 15 | Maple Wood Planks |
| 1 | Unloaded | 28 | Stone |
| 2 | Dirt | 29 | Messy Stone |
| 3 | Messy Dirt | 31 | Smooth Stone |
| 4 | Grass Block | 126 | Water |
| 5 | Sand | 128 | Bricks |
| 6 | Clay | 139 | Ice |
| 7 | Gravel | 147 | Bedrock |
| 8 | Snow | 149 | Cactus |
| 9 | Maple Log | 1491 | Lava |

entries.json também lista entradas que não são blocos (ferramentas etc.), mas só os IDs das famílias de blocos alcançam os hooks de terreno / líquido.

### R-F. Tinta por tipo de bloco via blockId

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // ex. inclina ids pétreos (padrão de bits altos) ao frio
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

### R-G. Medir blockId no mundo — o pacote de exibição em planos de bits

Receita de depuração para identificar no mundo os IDs dos blocos ausentes da tabela de correspondência. Mude o valor da constante `plane` no topo (`0, 1, 2, …`) enquanto lê a cor da face do bloco que quer identificar.

```wgsl
const plane: u32 = 0u;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let d = (s.blockId >> (plane * 3u)) & 7u;
    var palette = array<vec3f, 8>(
        vec3f(0.0, 0.0, 0.0), vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 1.0, 0.0),
        vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 1.0));
    out.colour = palette[d];
    return out;
}
```

A cor da face codifica diretamente 3 bits do blockId em RGB (preto = 0 / vermelho = 1 / verde = 2 / amarelo = 3 / azul = 4 / magenta = 5 / ciano = 6 / branco = 7). Uma observação lê um dígito octal. Se p0 → p3 leem em sequência 3, 2, 7, 2, o octal 2723 = 1491 lido no dígito de cima é o ID (Lava). As famílias de terreno de ID baixo se contentam com 2 observações (p0, p1). O pacote usa só o hook surface, então roda também em títulos estritos.

### R-H. Balançar só as folhas — limitar o hook vertex por blockId

A receita de vento R7 ([Parte III](03-recipes.md)) faz ondular todo o terreno, mas o hook vertex também pode ler `blockId` — dá para balançar só as folhas. A lista de IDs e o array WGSL (medidos em 2026-10-18; 22 tipos — Pine / Aspen / Maple / Jungle / Plum / Cedar / Palm / Autumn Maple / Fallen Maple / Pear / Cherry / Fallen Cherry / Spectral / Mango / variantes frutíferas / Autumn Aspen):

```wgsl
const LEAF_IDS = array<u32, 22>(
    100u, 101u, 102u, 103u, 491u, 492u, 493u, 653u, 655u, 911u,
    1226u, 1227u, 1636u, 1969u, 2019u, 2020u, 2021u, 2022u, 2023u,
    2024u, 2025u, 2085u);

// os hooks vertex são autodesativados em títulos estritos (ver §36)
#ifndef BLOXD_STRICT

fn sp_isLeaf(id: u32) -> bool {
    for (var i = 0u; i < 22u; i++) {
        if (LEAF_IDS[i] == id) { return true; }
    }
    return false;
}

fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    if (sp_isLeaf(v.blockId)) {
        let wp   = bloxdWorldPosition(v.position);
        let t    = bloxdTime();
        // o deslocamento é uma função suave da posição de mundo. Os vértices compartilhados
        // apontando para o mesmo ponto de mundo se movem igual, então as faces nunca se rasgam ([Parte III](03-recipes.md) R7 segue o mesmo princípio)
        let sway = sin(wp.x * 0.9 + t * 1.7) * cos(wp.z * 0.7 + t * 1.1);
        out.position.x += sway * 0.045;
        out.position.z += sway * 0.030;
    }
    return out;
}

#endif
```

- A lista de IDs cresce com as atualizações do motor (só durante a medição, 50 tipos de blocos foram adicionados numa build nova). Para continuar a usá-la, encontre as adições via [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) ou medindo com a exibição em planos de bits do R-G, e então estenda o array
- `Fallen Maple Leaves` (655) / `Fallen Cherry Leaves` (1227) são tapetes de folhas não sólidos no chão. Balançá-los faz parecer que descolam do chão; excluí-los do array é uma opção
- Em títulos estritos o hook vertex é desativado em bloco, mas com a guarda acima o pacote "simplesmente para de balançar" — os efeitos do lado fragment continuam funcionando

## 35. Novidade ②: `BLOXD_SCENE_DEPTH` e `bloxdOpaqueBehind()` (a principal)

O acesso à profundidade, estruturalmente impossível na v1, é desbloqueado **só para programas liquid**. Sem cor, mas **a geometria — distância e posição da face opaca traseira — está disponível**. O uso típico é calcular cor de absorção desde a espessura de água medida.

Regras de uso:

| Uso | Resultado |
|---|---|
| Chamado sem guarda em `bloxdLiquidSurface` / `bloxdLiquidLight` | OK (sempre definido em variantes liquid) |
| Chamado sem guarda em `bloxdTerrainSurface` | ERROR. Envolva com `#ifdef BLOXD_SCENE_DEPTH` |
| Chamado em hooks vertex | ERROR (só hooks surface / light) |

Para usar profundidade também em hooks de terreno, envolva com `#ifdef BLOXD_SCENE_DEPTH` (hooks de terreno são reutilizados em programas liquid: a profundidade só vive do lado liquid).

### R-E. Absorção por espessura de água (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // comprimento de coluna de água = daqui à face opaca traseira
        let thickness = distance(behind.position, surface.position);
        // absorção Beer-Lambert: o vermelho cai rápido, o azul chega longe
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // nada atrás = tinta para azul de água profunda
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

Aplicações: absorção/dispersão por espessura, projeção de ondas tipo cáustica desde coordenadas de mundo do fundo via `behind.position`, distinção céu-oclusão com `found=false` para reflexo de céu na água, turbidez por etapas segundo profundidade. Se o pipeline de cópia de profundidade não se constrói, degrada com segurança a "nada atrás". A disponibilidade da textura de profundidade é fixada uma só vez, na geração do renderizador da página — o critério sendo "o pacote ativo lê a profundidade". **Ao usar um pacote que lê a profundidade, recarregue sempre a página**. Se a profundidade é pedida com um pacote ativo mas a página não foi recarregada, a consola mostra uma vez um aviso `…reads scene depth on a page that didn't turn it on`, e a textura de profundidade é substituída por um fallback 1×1, de modo que `bloxdOpaqueBehind()` retorna sempre `found = false`.

## 36. Outras mudanças da v2

- **Fallback de hooks**: programas liquid usam o hook de terreno se `bloxdLiquidXxx` não está definido. **Pacotes só-terreno afetam a água como estão**. Defina hooks do lado liquid explícitos se não quiser.
- **Sem guardas `BLOXD_LIGHTING` para campos**: `blockLight` etc. existem em todas as variantes, com defeitos em unlit (0 / 1 / branco / 0). Use `#ifdef BLOXD_LIGHTING` só para detectar iluminação. Manter as guardas existentes não muda nada.
- **Muda a condição de `BLOXD_ALPHA`**: definido em variantes de terreno não estritas e em todas as liquid, indefinido em strict × terrain. Mantenha a guarda ao escrever alpha em hooks de terreno.
- **Construção direta de structs proibida**: chamadas de construtor como `BloxdLight(...)` são rejeitadas na validação estática. Modifique sempre desde `bloxdDefault*` ou use uma cópia da entrada.
- **`let _ =` vira `_ =`**: a atribuição de descarte WGSL `_ = f();` vale, mas `let _ = f();` é rejeitada.
- **offInStrict**: definir um hook vertex, ou um `discard` alcançável desde hooks surface / light, autodesativa todo o pacote em jogos estritos em vez de erro (a UI mostra `shaderPack:offInStrict`; segue rodando em jogos allow). Envolva hooks vertex e `discard` com `#ifndef BLOXD_STRICT`. Note que o aviso da própria tela de configurações pede para envolver o que resta com `#ifndef BLOXD_STRICT` — é uma recomendação oficial, não uma mera convenção.
- **Extensões de névoa**: modos LINEAR / EXP / EXP2 implementados, mas os ajustes do jogo seguem sempre em LINEAR: as specs de névoa existentes seguem valendo. A semântica de `fogColour` fica documentada oficialmente (preto só em cenas sem névoa).
- **Sem mudanças**: curva de lift, piso de canal 35%, queda de heldLight (`pow(lightDist, 0.75)`) e boost ambiental, spec de direções sol/lua, cor de névoa padrão, wrap de tempo (3600 s), luzes direcionais (máx 4), só Lite (WebGPU), mecanismo de salvamento (IndexedDB), `mod` palavra reservada.

## 37. Lista de migração v1 → v2

1. **pack.json**: `"apiVersion": 1` → `"apiVersion": 2`
2. **Identificadores**: substitua tudo segundo a tabela §32 (nomes de hook, structs, funções default)
3. **Porte de campos removidos**: para funções de cabeçalho segundo a tabela §33 (`s.time` → `bloxdTime()` etc.)
4. **Renomeie `fogFactor` → `fogVisibility`**
5. **Remova a construção direta de structs**
6. **Corrija `let _ =` para `_ =`**
7. **Envolva hooks vertex e discard com `#ifndef BLOXD_STRICT`**
8. **Confirme que a água também sente os efeitos de hooks de terreno**; defina hooks liquid explícitos se não quiser
9. (Opcional) Gerencie névoa desde `litColour` / adicione absorção por espessura com `bloxdOpaqueBehind()` / estilização por bloco com `blockId`
10. **Valide também a segunda etapa (Tint do navegador)** — ponha parênteses em expressões com `^` `&` `|` `<<` `>>` sobretudo. Há código que passa a validação estática e o navegador o rejeita (§38)

## 38. Segunda etapa de validação — o compilador WGSL do navegador é mais estrito que o analisador interno

A validação de pacotes no jogo tem **2 etapas**. A primeira etapa é a validação estática (analisador JS interno do motor. Verifica regras próprias de pacotes como assinaturas de hook, sintaxe proibida, uso de sceneDepth), e a segunda etapa é a validação de navegador (compila stubs incluídos no resultado de compilação com uma implementação WebGPU real, remapeando erros às linhas do arquivo-fonte do pacote para exibi-los. O «Saved, but it won't run until you fix these errors» da UI é esta etapa). Um sufixo como `(only in terrain)` no fim de um erro é «a classe de program da variante onde esse erro ocorreu».

O analisador interno não implementa as regras de ligação (Binding) de operadores do WGSL: **até o código que passa a validação estática pode ser rejeitado pelo navegador**. A vítima típica é o padrão clássico do hash inteiro:

| Operador | Consequência |
|---|---|
| `<<` `>>` | Só podem ligar-se diretamente em nível unário. `a + b << c` é erro |
| `&` `^` `\|` | Só podem ligar-se diretamente em nível unário. `a * b ^ c` é erro |
| `&&` `\|\|` | Não podem misturar-se. `a && b \|\| c` é erro |

### Como pôr parênteses (NG / OK)

```wgsl
// NG — passa a validação estática mas o navegador (Tint) o rejeita:
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — ponha parênteses em cada multiplicação (uma cadeia do mesmo operador A ^ B ^ C é legal por associatividade à esquerda)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

O código publicado neste guia não contém este padrão (a mistura `+`/`*` de `pack_hash3` e `h ^ (h >> 16u)` já vão entre parênteses, logo conformes). Quando escrever um pacote, passe a primeira e a segunda etapa.

## 39. Sobre materiais independentemente similares

Existe um material comunitário de conteúdo quase igual: [Shader de GlitchHunterCoder/Bloxd-Essay](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader). Publicou-se antes deste guia, mas **o conteúdo deste guia vem da análise própria de glm sobre os arquivos bundle reais de Bloxd (conjunto de chunks webpack) — não é copiar-colar**. Ambos coincidem porque investigar independentemente a mesma implementação leva às mesmas conclusões.

---

Pesquisado por ltf_ahel (pesquisado com glm)

[← Parte anterior](07-internals.md)·[Voltar ao manual](README.md)

[← Parte anterior](08-apiv2.md)·[Voltar ao manual](README.md)

# Parte IX: Guia de migração para API Version 3

Build alvo: `3ymzdd.main.fae4743f.js` — **a build de produção em execução desde 2026-10-19**. O bundle que o bloxd.io serve em produção é idêntico byte a byte (conferido por md5, tanto o bundle principal quanto os chunks de pacotes de shaders) à implantação de pré-produção contra a qual esta parte foi originalmente pesquisada, então tudo aqui se aplica diretamente à produção. O modelo de pacote mantém a forma da v2 (mesmos campos de `pack.json`, mesmos limites do carregador, mesmo layout de uniform).

As Partes I–VII deste guia ainda estão escritas sobre a base v2. Esta parte reúne, na mesma ordem da [Parte VIII](08-apiv2.md), os pontos de migração v2 → v3 e os novos recursos da v3. A conversão é majoritariamente mecânica (§47), mas apenas uma mudança realmente altera o comportamento — a luz padrão agora atenua a emissão com a névoa (§43) — e `blockId` é substituído por completo por `blockFlags` (§42), então sempre verifique com uma compilação no jogo antes de distribuir.

Novo nesta revisão: as seções **§49–§54** vão além da própria migração, para interioridades do motor restauradas da build de produção — como o renderizador Lite realmente invoca seus hooks, a função de névoa real de quatro modos, a implementação exata de `bloxdOpaqueBehind()`, o caminho completo de entrega de blockFlags desde o registro do bloco até seu hook, e o pipeline de validação com seu hash de cabeçalho medido. Estes são os fatos publicamente documentados mais profundos sobre o sistema de pacotes até hoje, e resolvem várias questões que outros guias ainda listam como abertas.

## 40. Destino dos pacotes v2 (conclusão primeiro)

**Atualização de 2026-10-19: a v3 saiu da pré-produção e agora é o que o site em execução serve.** Todo pacote v2 salvo antes do lançamento — inclusive todo pacote distribuído como v2 — agora falha em produção exatamente como descrito abaixo, então a migração da §47 deixou de ser opcional para quem distribui pacotes hoje.

A build exige que o `apiVersion` do manifesto **corresponda exatamente a 3**, e **não há suporte paralelo v2/v3**. Um pacote v2 é rejeitado no carregamento com as mensagens de "versão de API incorreta" (chaves i18n, texto com placeholders):

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>
> `loadNoApiVersion`: "pack.json needs \"apiVersion\": {{version}}."

Pacotes salvos mantêm o ciclo de vida da v2 ([Parte VIII](08-apiv2.md) §31): cada build faz hash do cabeçalho do motor, atualizações do motor marcam automaticamente os pacotes salvos como "precisa de nova verificação", e um pacote salvo cujo `apiVersion` seja qualquer versão diferente da atual é marcado como não executável (com a mensagem de status acima apontando para o substituto) em vez de gerar erro.

## 41. pack.json e o buffer uniform (o que não muda)

- Os campos obrigatórios do manifesto não mudam: `{ apiVersion, name, author }`.
- Os limites do carregador não mudam: zip de 32MB / 1024 entradas / 256 arquivos `.wgsl` / 256KB de código no total / manifesto de 64KB.
- O bloco de uniform do motor não muda de forma: `@group(3) @binding(0)`, 64 B, contendo — na ordem de declaração — o tempo, o offset de render, a direção do sol e a posição dos olhos. O layout é registrado com `minBindingSize: 64`, e o layout exato dos campos é `seconds: f32` @ byte 0, `renderOffset: vec3i` @ 16, `sunDirection: vec3f` @ 32, `eyePosition: vec3f` @ 48. Dois nomes internos de campo mudaram: `time` → `seconds`, `originOffset` → `renderOffset`. O **layout de bytes é idêntico ao da v2**, e nada muda para o código do pacote de qualquer forma, porque pacotes não podem nomear o uniform diretamente (o cabeçalho do motor o marca como fornecido pelo motor e somente leitura, "which packs can't name"); continue usando as funções de cabeçalho `bloxdSeconds()` / `bloxdRenderOffset()`.
- O group 3 do pacote ganhou um segundo ocupante documentado: `@group(3) @binding(1)` é a textura de profundidade de cena que `bloxdOpaqueBehind()` lê (implementação completa na §51). O uniform de 64 B permanece no binding 0; pacotes continuam sem poder nomear nenhum dos bindings.

## 42. blockId vira blockFlags: materiais por bloco como bits (o principal)

Em todas as três structs de entrada dos hooks (`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`), o campo `blockId: u32` da v2 é **substituído** por `blockFlags: u32`. Texto do motor sobre o campo: *"What kind of block this face is: `bloxdBlockFlag*` bits, the same across the face."* O motor agora entrega os próprios dados de material, então a forma da v2 de adivinhar materiais por faixas de ID numérico ou manter tabelas de IDs no mundo ([Parte VIII](08-apiv2.md) §34) não é mais necessária.

Os bits são expostos como constantes nomeadas:

```wgsl
// Teste um com (blockFlags & bloxdBlockFlagRock) != 0.
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| Valor | Constante | Significado (notas do motor, condensadas) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | Totalmente opaco — folhas e gelo incluídos. Não é vidro, água, lava, spawners, nem blocos fantasma e invisíveis. |
| 2 | `bloxdBlockFlagEmissive` | Emite luz de bloco, como neon, portais, lâmpadas, Lava e Beacon. Minérios brilhantes contam, por mais fracos que sejam. |
| 4 | `bloxdBlockFlagVegetation` | Folhas e a grama sobre blocos de grama — que também são terra. Não cactos, blocos de cogumelo ou feno. |
| 8 | `bloxdBlockFlagDirt` | Terra e solo, incluindo blocos de grama. Terra rochosa também é rocha. |
| 16 | `bloxdBlockFlagSand` | Areia, Areia vermelha e todo arenito — que também é rocha. |
| 32 | `bloxdBlockFlagRock` | Pedra e seus tipos, andesito, diorito, granito, cascalho, minérios, arenito, Terra rochosa, bedrock, obsidiana e magma. |

Um bloco feito de vários materiais carrega **cada** flag correspondente (o próprio exemplo do motor: arenito é areia e rocha, então recebe as duas). Folhas são vegetação mas não terra; blocos de grama são vegetação e terra ao mesmo tempo.

As flags de vegetação / terra / areia / rocha são atribuídas a partir do **nome de exibição** registrado do bloco (opaco / emissivo vêm em vez disso dos próprios dados de opacidade e emissão do motor): nomes terminados em `Leaves`, ou `Grass Block`, são vegetação; nomes `Dirt` / `Soil` (e todo `Grass Block`) são terra; exatamente `Sand` e `Red Sand`, mais qualquer nome contendo `Sandstone`, são areia; nomes contendo `Stone` / `Andesite` / `Diorite` / `Granite`, qualquer `Ore`, além de Yellowstone, Gravel, Bedrock, Obsidian, Magma, Rocky Dirt (e arenito) são rocha.

### As regras exatas de nomes (derive você mesmo as flags de qualquer bloco)

Os quatro bits de material vêm de um classificador fixo sobre o nome de exibição registrado do bloco. Nomes de variante (qualquer coisa depois de `|`) são removidos primeiro, então as variantes herdam as flags do bloco base. Depois:

| Bit | Regra (avaliada sobre o nome sem a variante) |
|---|---|
| vegetation | o nome **termina em** ` Leaves`, ou **termina em** ` Grass Block` |
| dirt | o nome **é exatamente** `Dirt`, **termina em** ` Dirt` ou ` Soil`, ou **termina em** ` Grass Block` |
| sand | o nome **é exatamente** `Sand` ou `Red Sand`, ou **contém** `Sandstone` |
| rock | o nome **é exatamente** um de `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt`, **contém** `Sandstone`, **termina em** ` Ore`, ou contém `Stone` / `Andesite` / `Diorite` / `Granite` como palavra isolada |

Yellowstone aparece listado explicitamente porque `Stone` não é uma palavra isolada dentro de `Yellowstone`. Opaco e emissivo **não** vêm do nome — vêm dos próprios dados de opacidade e de emissão de luz de bloco do motor, então não podem ser derivados com estas regras.

Fonte: o classificador de nomes do motor (módulo 28537, bundle `3ymzdd`); verificado contra todos os 7.861 blocos nomeados, 2026-10-20.

Exemplo — tint por bloco conforme o material:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

Efeito nas receitas v2: o array de 22 IDs de folhas da R-H ([Parte VIII](08-apiv2.md) §34) encolhe para `(blockFlags & bloxdBlockFlagVegetation) != 0`. A referência id ↔ nome de bloco em [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) continua útil para fins que não são de shader, mas não precisa mais de consulta no mundo para estilizar materiais.

### Folhas sem a grama (a pergunta que todos fazem)

`vegetation` sozinho corresponde a folhas **e** à grama sobre blocos de grama, que também
carregam `dirt`. Exclua a terra para balançar só as folhas — o discriminante que as próprias
notas de campo do motor explicam:

```wgsl
// Só folhas: vegetação sem terra. Blocos de grama são vegetação E terra.
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// Só blocos de grama (as faces gramadas da superfície do terreno):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

Verificado contra o registro em execução (2026-10-20, bundle `3ymzdd`):
`vegetation && !dirt` corresponde exatamente aos 45 registros de folhas (22 tipos base —
os mesmos 22 que o array de IDs da R-H da v2 mediu); `vegetation && dirt` corresponde exatamente
aos 8 blocos de grama. Nenhuma exceção em nenhuma das direções — contagens do registro naquela build; novos blocos aumentam os números sem mudar a regra. Combine com `vertex.normal`
(cima/baixo) para escolher faces, por exemplo só os topos de blocos de grama.

## 43. Renomeações de funções e mudanças semânticas

| v2 | v3 | Notas |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | Segundos desde o carregamento da página (nota de precisão f32 abaixo) |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | Mesma grandeza: posição de render + isto = posição de mundo |
| `const bloxdTimeWrap: f32 = 3600` | **removido** | Defina os períodos você mesmo no lado do pacote |
| `engineColour` (em `BloxdLightIn`) | **removido** (14 → 13 campos) | Reconstrua a partir de `litColour` + névoa |
| parâmetros dos hooks `v` / `s` / `l` | `vertex` / `surface` / `light` | Grafia do template; assinaturas inalteradas |

- **`bloxdSeconds()`** — segundos desde o carregamento da página. Em f32, ele conta em passos de menos de 1 ms nas primeiras 4,5 horas, e de cerca de 4 ms entre 9 e 18 horas. O cabeçalho recomenda a expressão `bloxdSeconds() % period`, que conta de 0 até `period` e então começa de novo — um substituto limpo para a constante de wrap removida.
- **`bloxdRenderOffset()`** — em blocos inteiros: "a render position plus this is a world position." Ele muda conforme o jogador viaja, então as posições de render ficam próximas do jogador — e assim precisas. Em todo o guia, o que o texto da v2 chamava de offset local de noa agora é chamado consistentemente de **posição de render** / offset de render; é a mesma grandeza que `bloxdOriginOffset()` retornava.
- **`bloxdTimeWrap` removido** — um pacote que antes reiniciava o tempo a cada 3600 s agora declara sua própria constante, por exemplo `const timeWrap: f32 = 3600.0;` e `% timeWrap`.
- **Semântica da luz padrão** — o padrão da v2 era `engineColour + emission × fogVisibility`; o padrão da v3 o compõe como `bloxdApplyFog(litColour + emission, light)` — **a emissão é atenuada pela névoa dentro do padrão** agora, então a saída combinada passa pela mistura de névoa junto. Tabela de conversão:

  | Expressão v2 | Conversão v3 |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // conversão para v3 da leitura v2 `l.engineColour + s.emission * l.fogVisibility`:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **Inalteradas em nome e significado**: `bloxdEyePosition()`, `bloxdSunDirection()`, `bloxdFaceBlock()`, `bloxdApplyFog()`, `bloxdWorldPosition()`.

## 44. Novas constantes do cabeçalho: `bloxdPi` e `bloxdTau`

```wgsl
// Meia volta e uma volta, em radianos.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

Úteis tanto para truques de trigonometria quanto porque pacotes não precisam mais codificar π à mão. Atenção à reutilização de nome: uma constante local do pacote com o mesmo nome agora colide com a verificação de identificadores duplicados do cabeçalho — remova ou renomeie qualquer redeclaração de `bloxdPi` / `bloxdTau` no seu código.

## 45. O template de seis hooks (hooks de líquido mostrados oficialmente)

O texto de pacote padrão publicado com a build agora traz **todos os seis hooks** — terreno / líquido × vertex / surface / light — cada um retornando o padrão do motor. Os comentários do motor o apresentam: *"Every hook returns its engine default. Copy a hook and change its output to start a shader pack."*

```wgsl
// Todo hook retorna o padrão do motor. Copie um hook e altere sua
// saída para começar um pacote de shaders.

// Jogos estritos mantêm o terreno onde está: sem guarda, este hook
// desativaria o pacote de shaders inteiro neles.
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// A água usa estes. Se apagados, a água usa seus hooks de terreno.
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdLiquidLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

- Os comentários dos hooks declaram diretamente as regras dos líquidos: **a água precisa do trio; apague-o e a água reutiliza seus hooks de terreno** (o comportamento de fallback conhecido da v2, [Parte VIII](08-apiv2.md) §36, agora escrito no próprio template).
- `bloxdLiquidVertex` fica dentro da mesma guarda `#ifndef BLOXD_STRICT` que `bloxdTerrainVertex` — sem guarda, ele desativaria o pacote inteiro em jogos estritos, exatamente como os efeitos vertex do lado do terreno fazem.
- As grafias do template agora são os nomes completos de parâmetro `vertex` / `surface` / `light` (o template da v2 usava os curtos `v` / `s` / `l`). Os nomes de parâmetro do seu próprio código são livres — só as assinaturas importam.

## 46. Matriz de variantes: o eixo de programa e as mudanças de macros

As variantes são geradas sobre uma matriz de **strict × lighting × program** — as mesmas 8 combinações da v2, mas com terreno / líquido agora como um eixo explícito da matriz. Os nomes das variantes explicitam isso como `allow|strict · unlit|lit · terrain|liquid`, expostos na interface como ``terrain`` / `liquid`, `strict` / `non-strict`, `lighting on` / `lighting off` (e exibições de erro podem acrescentar "(only in {{variants}})").

| Macro | Definida em |
|---|---|
| `BLOXD_STRICT` | variantes strict (ambos os programas) |
| `BLOXD_LIGHTING` | variantes com iluminação ligada (ambos os programas) |
| `BLOXD_ALPHA` | **todas as variantes liquid** mais variantes **terrain** não strict |
| `BLOXD_SCENE_DEPTH` | **todas as variantes liquid** |

Duas coisas mudam para autores em relação às regras da v2 ([Parte VIII](08-apiv2.md) §36):

- **`BLOXD_ALPHA` está inalterado em relação à v2.** O gerador de variantes carrega a linha literal `"liquid"!==program&&strict||push("BLOXD_ALPHA")` — a precedência de operadores de JS faz de *(terrain **e** strict)* o único caso que pula o push, então a macro fica definida em **todas as variantes liquid (strict ou não strict) e em terrain não strict**; só terrain strict a omite. Código `#ifdef BLOXD_ALPHA` do lado liquid compila exatamente como sempre compilou, e a gravação de volta de alpha da §49 (injetada para programas liquid ou variantes não strict) corresponde precisamente a este conjunto.
- **`BLOXD_SCENE_DEPTH` é sempre definido em variantes liquid**, então o uso de profundidade continua OK sem guarda ali, exatamente como na v2 (§35); em hooks de terreno ele continua exigindo o envelope `#ifdef BLOXD_SCENE_DEPTH`.

## 47. Lista de migração v2 → v3

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`** nas três structs de entrada; expresse a estilização de material como testes de bits contra as constantes `bloxdBlockFlag*` (§42); descarte as heurísticas de faixa de ID da v2
3. **`bloxdTime()` → `bloxdSeconds()`**; declare seu próprio período em vez do `bloxdTimeWrap` removido (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **Reconstrua a matemática de luz de `engineColour` para `litColour` + névoa** conforme a tabela da §43; note que o padrão agora atenua a emissão com a névoa
6. **Hooks liquid**: defina `bloxdLiquid*` explicitamente quando quiser que a água seja tratada de forma diferente; omita-os para cair de volta nos hooks de terreno
7. **Nenhuma auditoria de `BLOXD_ALPHA` é necessária** — seu conjunto de variantes está inalterado em relação à v2: todas as variantes liquid mais terrain não strict a definem, só terrain strict a omite (§46)
8. **Use `bloxdPi` / `bloxdTau`** onde constantes de trigonometria eram codificadas à mão; remova redeclarações locais do pacote que agora duplicam o cabeçalho
9. **Mantenha as guardas strict**: hooks vertex e `discard` continuam dentro de `#ifndef BLOXD_STRICT`; o template guarda `bloxdLiquidVertex` da mesma forma que o terreno
10. **Valide no jogo** — compile e teste o pacote em um jogo que suporte pacotes de shaders

## 48. Outras mudanças e notas da v3

- **A validação continua em duas etapas** ([Parte VIII](08-apiv2.md) §38): primeiro a validação estática, depois a compilação WebGPU real do navegador por meio de trechos stub gerados que chamam seus hooks, com erros mapeados de volta para arquivos / linhas de origem, e diagnósticos que restauram os nomes originais dos identificadores do lado do motor por meio de um mapeamento.
- **Diagnósticos strict nomeiam o motivo**: um hook vertex que move o terreno reporta "… moves terrain, which strict games prevent." e `discard` em hooks surface / light reporta "discard makes terrain see-through, which strict games prevent."; a interface de configurações mantém a orientação "wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`." (`offInStrict`).
- **Mensagens do carregador**: os tipos de erro e limites não mudam; "Zip64 archives aren't supported." é exibido como mensagem de interface (`loadZip64`). O inventário de strings da interface de pacotes totaliza 57 chaves `shaderPack:*`; entre os erros da etapa de carga, `loadNoWgsl` (um zip sem nenhum arquivo `.wgsl`) e `loadNotZip` (um arquivo sem assinatura de fim de arquivo zip) completam o conjunto.
- **Nenhum editor WGSL no jogo acompanha a interface de pacotes.** A tela de configurações não oferece editor de código de shader — pacotes são escritos como arquivos zip fora do jogo. (Um editor CodeMirror existe no bundle, mas é o editor JavaScript da interface de script dos Custom Games; não tem suporte a WGSL nem conexão com o sistema de pacotes.)
- **Requisito de hardware**: o Lite exige um driver que suporte o recurso WebGPU `shader-f16`; drivers antigos demais são rejeitados com uma mensagem como "Intel driver too old for Lite (no shader-f16)".
- **Mudanças de iluminação revalidam os pacotes salvos**: quando o ajuste de iluminação muda em tempo de execução, o motor refaz a verificação do pacote (`changed → recheck`); a visualização de replay chama o mesmo hook com `changed: false` e pula a reverificação.
- **Redação**: o texto sobre jogos que aceitam pacotes de shaders agora diz "in games that **support** them".
- **Escopo dos títulos**: o conjunto de jogos em que os pacotes rodam não muda em relação à build anterior.

## 49. Interioridades do motor: como o renderizador Lite invoca seus hooks

Tudo em §40–§48 é o que o carregador e o cabeçalho dizem. Esta seção e as seguintes documentam o que o motor realmente faz em tempo de execução, restaurado do bundle de produção (o renderizador Lite — um chunk de 175 KB; o nome real do arquivo de integração, `lite/terrainShaderPack.ts`, sobrevive dentro de suas strings de erro). Nada disso muda o que você escreve, mas elimina as suposições sobre o que seus hooks recebem — e resolve várias questões que outros guias da comunidade ainda listam como abertas.

O renderizador não "chama" seus hooks a partir de JavaScript. Quando um pacote passa na validação, o motor **injeta as chamadas dos seus hooks no próprio WGSL de terreno** substituindo linhas de âncora fixas no texto do shader. Uma âncora precisa corresponder exatamente uma vez — zero ou múltiplas correspondências abortam com `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Estágio | Linha de âncora no shader do motor | O que é injetado |
|---|---|---|
| vertex | um bloco de quatro linhas, de `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` até `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);` | constrói `BloxdVertexIn`, chama seu hook vertex, grava `worldPos` de volta — a injeção também reescreve `let worldPos` como `var worldPos` |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | constrói `BloxdSurfaceIn`, chama seu hook surface, grava `baseColor` / `alpha` de volta |
| cor iluminada | logo antes de `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` | `let bloxdSpLitColour = color.rgb;` — captura a cor antes da névoa |
| light | a linha final `return color;` do fragment shader | constrói `BloxdLightIn`, chama seu hook light, grava `color` de volta — depois da mistura de névoa |

O código injetado, restaurado do bundle distribuído (expressões de amostra de nível de luz abreviadas onde a formatação do próprio motor se alonga):

```wgsl
// estágio de vértice — variantes não strict que carregam um hook vertex
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* seu bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// estágio de fragmento — surface
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* seu hook surface */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // injetado só quando o programa é liquid ou a variante é não strict
```

```wgsl
// estágio de fragmento — light
{
    let bloxdSpLightIn = BloxdLightIn(
        bloxdSpLitColour,                        // litColour
        fragmentInputs.vTerrainLambert,          // direcional
        ambient,                                 // ambiente
        /* varying de nível de luz */.rgb,       // blockLight
        /* canal de céu do mesmo varying */,     // skyLight
        uniforms.uAmbientLightColour,            // ambientLightColour
        uniforms.uSkyLightColour,                // skyLightColour
        /* termo de luz na mão (ver abaixo) */,  // heldLight
        select(vec3f(0.0), uniforms.vFogColor,
               uniforms.vFogInfos.x != 0.0),     // fogColour — preto só sem nenhuma névoa
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* seu hook light */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

Quatro fatos sobre a aplicação das regras decorrem diretamente dessa injeção:

- **Terreno strict ignora mudanças de alpha do hook surface.** A gravação de volta `alpha = bloxdSpSurface.alpha` só é injetada para programas liquid ou variantes não strict — a implementação por trás da tabela de macros da §46. (Em terreno strict, seu código `#ifdef BLOXD_ALPHA` não compila de qualquer forma; agora também está confirmado que gravações de alpha sem guarda são descartadas ali.)
- **Uma variante strict que ainda declara um hook vertex nunca o executa** — o motor reporta isso no momento da build: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. É por isso que o template oficial (§45) envolve `bloxdLiquidVertex` na mesma guarda `#ifndef BLOXD_STRICT` que sua contraparte de terreno.
- Os identificadores `bloxdSp*` — **14 no total**: `bloxdSpVertexIn`, `bloxdSpVertex`, `bloxdSpSurfaceIn`, `bloxdSpSurface`, `bloxdSpLightIn`, `bloxdSpLight`, `bloxdSpLitColour`, `bloxdSpSceneDepth`, `bloxdSpPixel`, `bloxdSpPositionW`, `bloxdSpZ`, `bloxdSpEye`, `bloxdSpScale`, `bloxdSpBehind` — são temporários do lado do motor. Seu código nunca os vê, mas eles aparecem em diagnósticos e na saída de engenharia reversa de qualquer pessoa, então vale reconhecê-los à primeira vista.
- **O atalho de surface padrão.** Quando o hook surface de uma variante é literalmente `bloxdDefaultSurface`, o motor pula completamente a injeção das linhas de gravação de volta de `baseColor` / `alpha` — o padrão já produz esses valores, então a atribuição seria código morto. Cadeias de hooks sem modificação não custam nada.

**O que realmente alimenta `BloxdLightIn`** — campo por campo, a partir do código injetado:

| Campo | Origem no lado do motor |
|---|---|
| `litColour` | a cor do fragmento capturada logo antes da mistura de névoa (a âncora `bloxdSpLitColour`) — "before emission and fog", como diz o cabeçalho |
| `directional` | `vTerrainLambert` — uma soma interpolada por vértice de `max(0, dot(normal, lightDirection)) × intensity` sobre as luzes direcionais da cena (fórmula na §54); 0 quando a cena não tem nenhuma |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient` — por material, por frame |
| `blockLight` | o `.rgb` do varying de nível de luz decodificado (decodificação na §54) |
| `skyLight` | o canal de céu do mesmo varying de nível de luz — *"Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING"* (texto do cabeçalho) |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | o termo de luz na mão, construído a partir do canal w do varying de nível de luz junto com os uniforms de frame `uHeldLightPos` / `uHeldLightColour` ([Parte VII](07-internals.md) §26 documenta a queda e o comportamento de piso de canal) |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)` — **preto só em uma cena sem nenhuma névoa** (modo 0, §50) |
| `fogVisibility` | o coeficiente de névoa limitado — o valor exato que a função da §50 retorna |
| `position` / `normal` | os varyings `vPositionW` / `vNormalW` (normal renormalizada por fragmento) |
| `blockFlags` | o varying flat `vBlockFlags` — caminho completo de entrega na §52 |

Para orientação ao ler material antigo: a mesma arquitetura de injeção existia no renderizador da v2, e as únicas diferenças de integração da v3 são `vBlockId` → `vBlockFlags` e as variantes liquid adicionadas. O sistema de hooks é arquiteturalmente estável ao longo da quebra v2 → v3.

## 50. A função de névoa: quatro modos, um campo

Restaurada literalmente do shader de terreno de produção:

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // linear
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // exponencial
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // exponencial ao quadrado
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = névoa desativada (o coeficiente permanece 1.0)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)` — um único vec4 comanda tudo.
- **Existem quatro modos no shader: 0 = desligado, 1 = exponencial, 2 = exponencial ao quadrado, 3 = linear.** `fogVisibility` é o coeficiente limitado qualquer que seja o modo em execução — existe exatamente um campo, e nenhuma flag de modo é exposta a pacotes.
- Os próprios títulos da Bloxd usam o modo 3 (linear) com a faixa de 32 blocos descrita na [Parte VII](07-internals.md) §25 (`fogStart = 32 × D`, `fogEnd = 32 × (D + 1)`), então a observação "sempre linear" daquela parte ainda descreve o jogo distribuído. Os modos exponenciais são código real e vivo do motor, porém — um título pode trocar `vFogInfos.x` e mudar a rampa sem nenhuma atualização do cliente. Receitas de distância que calculam `distance(l.position, bloxdEyePosition())` por conta própria (receita R-B) são a forma robusta de escrever visuais guiados por distância, já que não podem ser movidas por uma troca de modo.
- Isso resolve a questão "qual rampa de névoa o motor realmente usa" a partir do código-fonte: todas as quatro estão implementadas; os títulos distribuídos usam a linear. (A mesma função também explica o comentário de fogColour do cabeçalho — o modo 0 é o único caso em que `fogColour` chega preto, e os jogos da Bloxd nunca distribuem o modo 0; eles empurram a névoa para longe, [Parte VII](07-internals.md) §25.)

## 51. bloxdOpaqueBehind(): a implementação exata

A função inteira, restaurada literalmente da build de produção:

```wgsl
@group(3) @binding(1) var bloxdSpSceneDepth: texture_2d<f32>;
var<private> bloxdSpPixel: vec2i;
var<private> bloxdSpPositionW: vec3f;

fn bloxdOpaqueBehind() -> BloxdOpaqueBehind {
    let bloxdSpZ = textureLoad(bloxdSpSceneDepth, bloxdSpPixel, 0).r;
    if (bloxdSpZ <= 0.0) {
        return BloxdOpaqueBehind(false, vec3f(0.0), 0.0);
    }
    let bloxdSpEye = bloxdPackInputs.eyePosition;
    let bloxdSpScale = max(bloxdSpZ / (scene.view * vec4f(bloxdSpPositionW, 1.0)).z, 1.0);
    let bloxdSpBehind = bloxdSpEye + (bloxdSpPositionW - bloxdSpEye) * bloxdSpScale;
    return BloxdOpaqueBehind(true, bloxdSpBehind, distance(bloxdSpBehind, bloxdSpEye));
}
```

- **A textura de profundidade fica em `@group(3) @binding(1)`** — o group 3 é o próprio group do pacote: o binding 0 é o uniform de 64 B `bloxdPackInputs` (§41), o binding 1 é esta textura de profundidade. Ambos são fornecidos pelo motor e não nomeáveis do seu lado.
- **A textura de profundidade é um recurso unfilterable-float, só de fragmento.** O layout do bind group a registra como `texture: { sampleType: "unfilterable-float" }` com visibilidade apenas `GPUShaderStage.FRAGMENT` — que é exatamente por que `bloxdOpaqueBehind()` é construída sobre `textureLoad` (coordenadas de texel explícitas, nível de mip 0) em vez de `textureSample`: a filtragem por hardware simplesmente não está disponível nesta textura.
- `z ≤ 0` significa que a amostra de profundidade não atingiu nada (plano distante / céu): `found = false`, e `position` / `distance` não têm significado — verifique `found` primeiro, sempre.
- A posição retornada é uma **interseção por escala de raio**: a superfície opaca é colocada em `eye + (fragment − eye) × max(z / viewDepth, 1)`. `distance` é medida do olho até esse ponto — para pacotes de superfície de água, isso é efetivamente "quanta água o raio atravessou antes de atingir algo sólido", o que faz receitas de água tingida por profundidade funcionarem sem um segundo buffer de profundidade.

## 52. blockFlags de ponta a ponta: do registro ao seu hook

A §42 diz o que os bits significam. Esta seção é o caminho completo que um bit de flag percorre desde o registro do bloco até seu hook — cada salto confirmado no código de produção, o que também comprova, no nível do byte, o "the same across the face" do cabeçalho.

**1. Registro (banco de definições de blocos).** As flags de cada bloco são calculadas uma vez, no registro:

```js
flags[id] = nameFlags                     // regras de nome de exibição (§42): vegetação / terra / areia / rocha
          | (definition.opaque === true ? 1 : 0)   // bit opaco — dados de opacidade do motor
          | (anyFaceEmission >= 1       ? 2 : 0);  // bit emissivo — dados de emissão de luz de bloco
```

As regras de nome de exibição cobrem apenas os quatro bits de material; os dois bits físicos vêm de dados separados do motor — `opaque` direto da definição do bloco, `emissive` do array de emissão de luz de bloco por face. O "Glowing ores count, however faint" do cabeçalho é literal: qualquer face com emissão ≥ 1 define o bit.

**2. Por bloco → por material (inicialização do mesher).** O terreno é desenhado por *material*, não por ID de bloco, então as flags são retabuladas em uma tabela de materiais (um `Uint16Array` indexado por ID de material, cada material recebendo as flags da primeira face do bloco dono). A tabela é enviada ao Web Worker de meshing — mas **só em configurações onde o pipeline de pacotes está ativado**; caso contrário a tabela é `null` e nenhum byte de flag é escrito. Jogadores sem pacotes não pagam custo algum, por construção.

**3. Para os bytes de vértice (worker do mesher).** As flags viajam em dois bytes livres dos dados de vértice entrelaçados existentes:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // 8 bits baixos → byte alpha do atributo de cor
        buffer[o + normalOffset + 3] = flags >> 8;    // 8 bits altos → byte w do atributo de normal
    }
}
```

Todos os quatro vértices de uma face recebem o mesmo valor — o significado, no nível da implementação, de "the same across the face".

**4. Decodificação no lado da GPU (shader de terreno do Lite).** Os dois bytes viajam como o atributo de vértice `blockFlagWords: vec2u` (location 7, presente só quando o pipeline de pacotes está ligado) e são remontados no estágio de vértice:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags` é declarado `@interpolate(flat)` — constante por face até o estágio de fragmento, e é por isso que os testes de bits da §42 são estáveis dentro de uma face e nunca podem produzir mistura no meio da face.

- O pipeline reserva **16 bits** de capacidade (aquela decodificação remonta dois bytes completos) enquanto a v3 define apenas 6 — flags futuras podem aparecer sem outra mudança no formato de vértice ou salto de API.
- No modo de vértice empacotado, os mesmos dois bytes viajam dentro de `packed.y` e do byte superior da palavra de cor em vez de um atributo dedicado — mesmos valores, recipiente diferente.
- Para a pergunta folhas-vs-grama sobre a qual essas flags são mais consultadas, ver [Folhas sem a grama](#folhas-sem-a-grama-a-pergunta-que-todos-fazem) na §42.

## 53. Interioridades da validação: HEADER_VERSION, assinaturas e nomes reservados

**O hash de cabeçalho medido.** Toda validação de pacote é marcada com o `HEADER_VERSION` do motor. Executar diretamente o módulo de validação de produção (ver a nota do harness no fim da §54) o mede:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← medido a partir do bundle de produção em execução
```

É um hash FNV-1a-32 (prefixado com `6.`) sobre cinco entradas: o cabeçalho do motor pré-processado e tokenizado **por variante** (uma entrada para cada uma das 8 variantes), o universo lexical WGSL completo do analisador, os quatro nomes de macro, o mapa de funções especiais, e a declaração `BloxdPackInputs` junto com sua linha de uniform `@group(3) @binding(0)`. Duas consequências para autores:

- **Qualquer edição no cabeçalho do lado do motor recalcula o hash** — este é o mecanismo por trás da marca automática de "precisa de nova verificação" que pacotes salvos recebem após atualizações do motor ([Parte VIII](08-apiv2.md) §31).
- O hash cobre o *cabeçalho do motor*, não seu código. Um pacote que continua carregando após uma atualização do motor não está "ainda válido" — ele só não acionou uma mudança de cabeçalho ainda. A única verificação de versão da qual seu manifesto participa é o portão de `apiVersion` (§40).

**Verificação de assinatura dos hooks: exata em tokens para tipos, livre em nomes.** O validador mantém uma assinatura por slot de hook:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

A correspondência é **token por token**: nomes de tipo dos parâmetros precisam coincidir exatamente, `->` e o tipo de retorno precisam coincidir exatamente, e a quantidade de parâmetros e a colocação de vírgulas são verificadas. Os *nomes* dos parâmetros são livres — qualquer identificador na posição de parâmetro é aceito, e é por isso que seu `fn bloxdTerrainLight(s, l)` compila mesmo que o template escreva `(surface, light)`. O hook light recebe exatamente dois parâmetros.

**Nomes reservados.** A regra é uma única regex: `/^bloxd/i`. Qualquer identificador começando com `bloxd` é reservado — tudo `bloxd*` é fornecido pelo motor, e um pacote não pode declarar nesse namespace (é também por isso que as redeclarações de `bloxdPi` / `bloxdTau` da §44 colidem).

**Funções especiais.** Exatamente uma está registrada na v3:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

"Especial" significa *ligada a uma macro* — uma função do motor cuja disponibilidade depende de um símbolo de variante. Dois diagnósticos de guarda garantem o uso correto:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.` — um hook vertex alcançando uma função exclusiva de surface/light.
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — por exemplo `bloxdOpaqueBehind()` do lado do terreno sem um envelope `#ifdef BLOXD_SCENE_DEPTH`.

**O cabeçalho do motor (prelúdio), fixado.** O cabeçalho da v3 é uma string de 5.637 bytes começando com `// Engine-provided and read-only, prepended to all packs. apiVersion 3.` Ele carrega diretivas `#if` / `#ifdef` que o pré-processador WGSL do próprio motor avalia por variante — o motor realmente executa avaliação de expressões `#if`, e uma expressão malformada gera erro com `Cannot evaluate #if ...`. Toda struct, assinatura de função e comentário citado neste guia vem deste texto renderizado, então o guia e o cabeçalho distribuído não podem divergir.

**Notas do analisador para autores.**

- Funções do lado do pacote são renomeadas com um prefixo `pack_` quando fundidas no shader do motor (para evitar colisões); os diagnósticos as mapeiam de volta aos seus nomes originais — o mesmo mecanismo que a [Parte VIII](08-apiv2.md) §38 descreve para a segunda etapa de validação.
- A mensagem de identificador não declarado diz `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`; `_ can only be the target of a phony assignment, as in _ = f();` e `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.` completam o conjunto recém-confirmado.
- O universo lexical do analisador inclui identificadores que **não são WGSL padrão**: `bufferView`, `bufferArrayView`, `bufferLength`, `atomicStoreMax`, `atomicStoreMin`. O motor os conhece como built-ins, mas não é garantido que a implementação WGSL de um dado navegador os forneça — nunca construa um pacote de distribuição sobre eles.

## 54. Constantes, limites e layouts confirmados

O layout completo de recursos do programa de terreno, direto do renderizador Lite de produção:

| Binding | Conteúdo |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms` — `viewProjection` mat4x4f, `view` mat4x4f, `vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms` — `uHeldLightColour` / `uHeldLightPos`, `uSkyLightColour`, `uAmbientLightColour`, **`vFogInfos`**, `vFogColor`, `outputHeight`, `sceneAmbient`, **`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: storage `array<vec4f>` — xyz = translação para o frame de render, w = visibilidade de fade-in |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`, `ambientAndCutoff`, `emissiveAndLevel`, `anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs` — o uniform do pacote (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth` — a textura de profundidade (§51) |

- **As luzes direcionais têm limite rígido de quatro.** O renderizador gera erro com `Terrain supports 4 directional lights, not ${n}` se uma cena tentar registrar mais do que isso. `l.directional` é a soma de Lambert sobre quantas existirem (0–4; as próprias cenas da Bloxd usam 2 — [Parte VII](07-internals.md) §27). O terreno também avisa sobre luzes que não consegue honrar, literalmente: uma luz adicionada tarde — `Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.`; uma luz tingida — `Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.`; e uma luz que filtra malhas — `Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **Nomes do programa de terreno**: as chaves de cache de pipeline são `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}` — um pacote aparece como o sufixo `-sp{variant}`, um programa por variante da §46. Um watcher (`watchPipelineFailures`) compara nomes de pipeline em execução com `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/` e reverifica a variante de pacote correspondente quando uma compilação de pipeline falha; perda do dispositivo GPU (`device.lost`) pula a verificação.
- **`BLOXD_TERRAIN_DIRECTIONAL` é uma macro interna do motor** (definida quando dirLightCount > 0). Ela *não* é uma das quatro do prelúdio e nunca chega ao código do pacote — mas aparece em dumps WGSL dos próprios shaders do motor, então reconhecê-la evita confusão.
- **Decodificação de nível de luz**: o atributo de vértice `aPackedLightLevels` é um f32 que empacota quatro nibbles, cada um dividido por 15: rgb = a luz de bloco colorida, a = o canal céu/na mão. O estágio de vértice o decodifica no varying `vLightLevels`; `blockLight` lê `.rgb`, o canal céu/na mão lê `.w`. O motor aplica piso de 35% do canal mais brilhante aos canais rgb antes da interpolação — a âncora do lado do motor para a elevação que a [Parte VII](07-internals.md) §26 documenta a partir do jogo.
- **`vTerrainLambert`** (a fonte de `directional`, §49) é gerada como uma soma sobre as luzes direcionais ativas: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`, protegida por `BLOXD_TERRAIN_DIRECTIONAL`.
- **Buffers de índice passam a 32 bits na primeira malha grande.** O renderizador Lite só escolhe índices `Uint16Array` enquanto todo valor de índice permanece ≤ 65.534 — assim que qualquer índice atinge 65.535, o buffer se torna um `Uint32Array` (rastreado por buffer com uma flag `is32Bits`). Na prática: uma malha de chunk com no máximo 65.535 vértices cabe em índices de 16 bits; uma com exatamente 65.536 vértices necessariamente emite um índice 65.535 e troca o buffer inteiro para 32 bits.
- **Detalhes do carregamento de manifesto**: entradas zip sob `__MACOSX/`, arquivos com prefixo `._` e `.DS_Store` são filtrados (ruído de arquivo do macOS); `pack.json` é localizado por comparação de caminho em minúsculas — zero correspondências → `loadNoManifest`, duas ou mais → `loadDuplicateManifest`; a leitura do manifesto é limitada a 65.536 bytes.
- **Como tudo isso foi verificado**: os módulos do bundle de produção foram restaurados (165 chunks; o registro webpack conta 4.951 módulos neste bundle — a contagem de módulos varia em algumas unidades conforme dependências filhas assíncronas sejam incluídas, então trate o número exato como específico do bundle) e executados em um harness compatível com webpack sob Node.js. O `HEADER_VERSION` medido (§53), o cabeçalho renderizado de 5.637 bytes, a ordem canônica da tabela de variantes e o mapa de funções especiais vêm todos de *executar o código distribuído*, não de ler strings. O mesmo harness é o núcleo natural para um `pack_check` v6 da comunidade — executar o próprio validador do motor contra um pacote reproduz seus veredictos exatamente.

---

Pesquisa de ltf_ahel (realizada com glm)

[← Parte anterior](08-apiv2.md)·[Voltar ao manual](README.md)


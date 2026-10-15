# Como criar pacotes de shaders para Bloxd.io (Guia completo)

Guia autocontido para criar e distribuir pacotes de shaders (shader packs) para Bloxd.io (somente renderizador WebGPU).
Baseado na especificação da `apiVersion: 2`. Inclui receitas e referência da API: com este único arquivo você vai do zero à distribuição. Pacotes v1 não carregam no jogo atual (valores v1 de `apiVersion` e identificadores antigos são rejeitados). Para migrar da v1, ver a Parte VIII.

> Este é um guia não oficial e não representa a posição dos desenvolvedores. A API pode mudar sem aviso.  
> Última revisão: 2026-10-15 (ordem de aplicação de névoa, ajustes reais de névoa e renderização submarina verificados contra a implementação do motor). Como não foi encontrada uma referência oficial pública da API WGSL, continue verificando descrições e receitas contra a tela de carregamento e a compilação no jogo.  
> O recurso de pacotes de shaders é um recurso oficial acessível pela interface do jogo, e os pacotes são WGSL puro  
> (sem execução de JS nem rede), então nada perigoso acontece com código normal.  
> Este guia foi criado com assistência de IA; a precisão não é garantida. Verifique com o comportamento real no jogo.

## Índice

- [Parte I: Criar pacotes](#parte-i-criar-pacotes)
- [Parte II: Referência da API](#parte-ii-referência-da-api)
- [Parte III: Receituário](#parte-iii-receituário)
- [Parte IV: Guia de realismo](#parte-iv-guia-de-realismo)
- [Parte V: Solução de problemas e notas](#parte-v-solução-de-problemas-e-notas)
- [Parte VI: Notas importantes de implementação](#parte-vi-notas-importantes-de-implementação)
- [Parte VII: Suplemento de interioridades](#parte-vii-suplemento-de-interioridades)
- [Parte VIII: Guia de migração para API Version 2](#parte-viii-guia-de-migração-para-api-version-2)

---

# Parte I: Criar pacotes

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
3. Corrija erros e recarregue (ver Parte V)
4. Teste em jogos compatíveis
5. Compacte em zip ao terminar e distribua

## 3. Estrutura do pacote

- **Formato de distribuição**: um único `.zip`, ou uma pasta (carregar pasta é só em navegadores desktop)
- **Conteúdo**: um `pack.json` (no nível superior do pacote; sem diferenciar maiúsculas) + 1–256 arquivos `.wgsl`
- Múltiplos `.wgsl` são concatenados e tratados como um módulo, então dividir e usar subdiretórios é livre. Sem restrições de nomes. Arquivos não `.wgsl` (READMEs etc.) são ignorados
- Dica de compactação: se um zip guarda tudo sob uma pasta raiz comum, esse prefixo é removido automaticamente (zips do "Comprimir" do macOS funcionam como estão). Mas arquivos extras na raiz quebram a detecção do nível superior; o mais seguro é entrar na pasta e compactar `pack.json` e os `.wgsl` diretamente (confira que `pack.json` fique na raiz do ZIP)

| Item | Limite |
|---|---|
| tamanho do zip / nº de entradas | 32MB / 1024 |
| tamanho do pack.json | 64KB, UTF-8 |
| tamanho total .wgsl | 256KB, UTF-8 |
| formato zip | zip64, divididos e criptografados são rejeitados |

## 4. pack.json

```json
{
  "apiVersion": 2,
  "name": "My Pack",
  "author": "your name"
}
```

| Campo | Obrigatório | Descrição |
|---|---|---|
| `apiVersion` | obrigatório | Deve coincidir exatamente com `2`. Pacotes com `1` são rejeitados com `shaderPack:loadWrongApiVersion` |
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
2. Confira o status. Sucesso é "Ready to use". Com "Saved, but it won't run until you fix these errors...", corrija os erros listados (arquivo:linha + variante) e recarregue
3. Recarregue a página para ativar. Remova antes qualquer override de renderizador em parâmetros URL ou localStorage, ou o pacote se recusará a iniciar
4. Teste primeiro em jogos permissivos e depois em jogos estritos (a maioria). Animação de vértices só funciona em jogos allow
5. Para distribuir, compacte com `pack.json` no topo (dentro dos limites da seção 3). Recarregar a mesma tela substitui o pacote; Remove Pack o exclui. A revalidação após atualizações do jogo roda sozinha ao carregar a página

# Parte II: Referência da API

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
- `bloxdSunDirection()` é vetor unitário só enquanto há sol; zero quando o céu não tem sol. **A lua está sempre em `-bloxdSunDirection()`** (o motor calcula a posição lunar como o oposto exato do sol). Mas em mundos padrão o sol é estático e a lua também — uma lua em movimento só importa em mundos com ciclo dia/noite (ver Parte VII, seção 24)
- ※Nota: antes escrito como "não reutilizável como direção lunar em zero". A direção em si está disponível via `-bloxdSunDirection()`, mas pacotes de distribuição devem ramificar com `sunPresent` sob premissa zero (ver R2 para o pseudo look azul, Parte VII R-A para luar direcional)
- `emission` é somado após o cálculo de iluminação, atenuado por **`fogVisibility`** (a implementação defaultLight `engineColour + emission × fogVisibility`. A emissão também some em distância totalmente enevoada)
- **Ordem de aplicação de névoa**: o fragmento processa ① composição iluminação/emissão → ② `color = max(color.rgb, 0)` → ③ `color = mix(vFogColor, color.rgb, fogVisibility)` → ④ chamada ao hook light → ⑤ return. Logo **engineColour chega já com névoa**, e **o valor devolvido do hook light vira a cor final como está** (após o hook não se reaplica névoa)
- **Origem de fogVisibility**: distância em espaço de vista (calculada por vértice, interpolada). Em modo linear `fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)` (clamp 0..1)
- **Quando fogMode == 0**: `fogColour` chega como `vec3f(0.0)` (preto). Código que estime faixas horárias pelo tom de fogColour deve ter cuidado
- **Ajustes reais de névoa em builds atuais**: **linear fixo**. `fogStart` = distância de chunks, `fogEnd` = +1 chunk (só horizonte). Com névoa off fixa-se em 100 / 101 chunks, efetivamente desativada. Cor de névoa padrão RGB(183, 191, 195)
- O uniform `bloxdPackInputs` (`@group(3) @binding(0)`, 64B) é só para **uso via funções de cabeçalho**. Não o referencie diretamente desde pacotes. A visibilidade de etapa é VERTEX|FRAGMENT, logo funções de cabeçalho também podem ser chamadas desde funções de escopo de módulo fora dos hooks e desde hooks vertex. A textura de profundidade (binding 1) é só FRAGMENT, logo `bloxdOpaqueBehind()` fica limitado a hooks surface / light
- **`skyLight` / `blockLight` / `heldLight` chegam após uma "curva de lift"**. O `tone-mapped` dos comentários do cabeçalho refere-se a isto: o motor sempre aplica `y = 1-(1-x/(3-2x))³` (curva S que levanta áreas escuras) aos fragmentos antes de entregar aos pacotes. Não são valores de voxel crus (n/15); ex. sob árvore (cru 0.87) chega elevado a **0.97**
- `skyLight` é essencialmente o dado de oclusão por voxels de "se o céu é visível daqui" (= um mapa de sombras), não um simples parâmetro de brilho (ver seção 15, "A verdade sobre as sombras")
- **`litColour` serve de ponto de partida**: na v1 só havia `engineColour` já com névoa, e a atmosfera própria tendia à névoa dupla. Na v2 parte-se de `litColour` pré-névoa e pré-emissão, e se reaplica névoa no próprio ritmo com `bloxdApplyFog()`
- **`blockId` distingue tipos de bloco**: identificação independente da cor de textura. Mas a tabela ID-tipo vive dentro do motor: qual ID é qual bloco deve ser medido no mundo (ver Parte VIII)
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

---

# Parte III: Receituário

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

> Nesta API, `bloxdSunDirection()` é zero quando o céu não tem sol. O abaixo não é luar direcional, só um tênue ambiente azul quando o céu está escuro. A direção lunar em si está disponível via `-bloxdSunDirection()` (só mundos com ciclo dia/noite. Parte VII R-A).

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

> Na v1, profundidade de cena e posição do fundo não podiam ser consultadas: a profundidade real não se calculava só com aquela API. Na v2, `bloxdOpaqueBehind()` limitado a líquidos mede a espessura até a face opaca traseira (Parte VIII R-E). O que segue é o velho pseudo efeito sem isso: `s.position.y` é coordenada local e usá-la crua desloca o efeito com a origem do chunk. Para altura de mundo converta com `bloxdWorldPosition()`. O trecho só varia alpha por altura de mundo — pseudo efeito, não baixio por costa/fundo. Ajuste `packWaterReferenceY` à sua altura de mundo.

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
> ⚠️ "Aprofundar contraste com `pow(skyLight, γ)`" **aplicava gamma a valores liftados** e nunca afetava sob árvores (0.97). Use este método em vez disso.

---

# Parte IV: Guia de realismo

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
4. **Sem direção solar**: se `bloxdSunDirection()` é zero, não compute especular direcional. `l.directional` é um escalar de quantidade de luz, não um vetor de direção: não restaura a direção do brilho. Troque para ambiente fraco sem direção se preciso. A direção lunar está disponível via `-bloxdSunDirection()` (só se move em mundos com ciclo dia/noite. Parte VII R-A)

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
| Refração submarina | Sem cor de cena. A profundidade limitada a líquidos (`bloxdOpaqueBehind()`) permite absorção por espessura e projeção de fundo (Parte VIII R-E) |
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
- De noite só restam faces iluminadas → não escureça só sombras; atenue toda a cor terminada (`engineColour`) de noite. Para conservar lamparinas locais, atenue menos com `blockLight` / `heldLight` (Parte VI, seção 19)
- Sombra não aprofunda com `pow(skyLight, γ)` → `l.skyLight` é pós-curva (seção 10). Mude para inversão + limiar de R9.12
- Ajustar área/densidade de sombra → guia de ajuste de R9.12 (área = limiar `shTh` / borda = `shSoft` / escuridão do núcleo = duplo ajuste de ambiente mínimo e dispersão do céu)

---

# Parte V: Solução de problemas e notas

## 17. Erros comuns e soluções

| Sintoma | Solução |
|---|---|
| Não carrega em jogos estritos | Envolva o hook vertex em `#ifndef BLOXD_STRICT` |
| `.alpha` reportado indefinido | Envolva em `#ifdef BLOXD_ALPHA` |
| `blockLight` reportado indefinido | Envolva em `#ifdef BLOXD_LIGHTING`. Envolva funções auxiliares compartilhadas **como funções inteiras** (na v2 o campo existe em todas as variantes: raramente ocorre. Mantenha as guardas usadas para detecção) |
| `Packs can't construct BloxdSurface directly` | Comece de `bloxdDefaultSurface(s)` |
| `BloxdVertex only exists when BLOXD_STRICT isn't defined` | Envolva em `#ifndef BLOXD_STRICT` |
| Distância branca e leitosa | Suele ser névoa dupla. A cor terminada já leva névoa: mantenha sutil a bruma própria e prefira reduzir só saturação |
| Pacote excluído ao entrar no jogo | Falha a verificação ao vivo do jogo. Revise omissões de guardas |
| `pack.json needs "apiVersion": 2.` | Falta `apiVersion` ou não é `2`. Adicione o número `2` (a string `"2"` é rejeitada). Pacotes v1 são rejeitados com `shaderPack:loadWrongApiVersion` |
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
| `bloxdTerrainVertex moves terrain, which strict games don't allow.` / `discard makes terrain see-through, which strict games don't allow.` | Não é erro mas autodesativação em jogos estritos (`shaderPack:offInStrict`). Envolva hooks vertex e `discard` com `#ifndef BLOXD_STRICT` |
| `mixing '*' and '^' requires parenthesis (only in ...)` | Erro de segunda etapa (Tint do navegador). Ponha entre parênteses operandos de `^` `&` `\|` `<<` `>>` (§38) |
| `loadDuplicateManifest` ao carregar zip | Dois `pack.json` (incluindo variantes de maiúsculas). Deixe um |
| `Packs can't construct BloxdLight directly, since header structs gain fields; ...` | Reescreva desde `bloxdDefaultSurface(s)`. Começar de uma cópia do primeiro parâmetro do hook light (`var out = s;`) também vale |

## 18. Direitos e notas

- O recurso de pacotes de shaders é um recurso oficial carregável pela interface do jogo, e criar pacotes é considerado uso previsto. Mas não se confirmou documentação oficial pública
- Pacotes são WGSL puro — execução de JS e acesso à rede são impossíveis por projeto
- Este é um guia não oficial, não a posição oficial dos desenvolvedores. A API pode mudar sem aviso

---

# Parte VI: Notas importantes de implementação

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

Esta API não pode amostrar cor de cena: é **estilização pseudo com mistura de cor fresnel e realces solares, não reflexo/refração reais** (o cálculo de profundidade chegou na v2 com `bloxdOpaqueBehind()`, separado na Parte VIII R-E). A amostra conserva a cor base, mistura um pouco para cor de céu em ângulos rasantes e adiciona um pequeno brilho só com sol.

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
- Reflexos reais da paisagem: as entradas desta API não têm cor de tela: misturar cores jamais é reflexo real (profundidade só limitada a líquidos. Parte VIII R-E).

Esta receita **substitui** um `bloxdLiquidLight` existente. Não a cole junto à função de onda homônima de R9.7 nem outros hooks homônimos.

## 21. Lista de testes no jogo

Sucesso de compilação e "boa aparência" são coisas distintas. Confira nesta ordem:

1. **Carga:** `pack.json` na raiz do ZIP; configurações mostram `Ready to use`.
2. **8 variantes:** sem omissões de guardas de tipos em strict / allow, iluminação on / off, terreno / líquido. Mesmo que um jogo só use algumas condições, pacotes de distribuição devem assumir as 8.
3. **Dia:** cores sem estourar por material (grama, pedra, areia, madeira); salto claro/escuro natural entre topos e laterais.
4. **Noite:** compare os mesmos materiais à plena luz passada, sombras e perto de tochas. Se só restam faces iluminadas, ajuste a atenuação de exposição; se tudo escurece, ajuste a proteção de luz local.
5. **Água:** olhe de cima, ângulos rasantes, margens, debaixo d'água e de noite separadamente. O comportamento alpha e o visual submarino dependem da composição do jogo — nunca julgue de um só ponto de vista. Debaixo d'água o véu de definição líquida cobre na frente conforme acima: as diferenças do pacote aparecem sobretudo na superfície e no terreno através do véu.
6. **Bordas e distância:** sem saltos de ondas/padrões em transições de chunk / origem; sem névoa dupla nem bruma branca longe.
7. **Desempenho:** efeitos pesados em hash/trig/`pow` por fragmento no mínimo. Adicione detalhe aos poucos e compare FPS.

### Restrições conhecidas como premissas

- Pacotes se limitam a hooks de terreno / líquido — sem trato de céu, entidades ou UI com o mesmo código.
- Não existem entradas para adicionar mapas de sombras, reflexos em espaço de tela, refração, bloom etc. (a profundidade de cena foi desbloqueada limitada a líquidos como `bloxdOpaqueBehind()`. Ver Parte VIII).
- `bloxdTime()` é tempo de animação sem vínculo garantido com o dia/noite do jogo.
- Com `bloxdSunDirection()` zero a verdadeira direção lunar é desconhecida, não "física de luar" mas aproximação de ambiente. O luar direcional se constrói desde `-bloxdSunDirection()` (só mundos com ciclo dia/noite. Parte VII R-A).
- `s.position` / `l.position` são coordenadas locais: some `bloxdOriginOffset()` para efeitos dependentes do mundo. Para padrões locais do bloco, as coordenadas locais são a ferramenta intencional.

## 22. Combinar com outros pacotes quando o shader sozinho bate no limite

Como pacotes não podem adicionar nem amostrar texturas, não tente resolver relevos finos de material ou imagens do céu só com shaders. O repositório público de pacotes de texturas para Bloxd.io [Bloxdy/texture-packs](https://github.com/Bloxdy/texture-packs) trata texturas, skybox, modelos etc. por outra via.

Como referência, distribuições comunitárias "cinematic shader" analisadas num caso resultaram ser pacotes de texturas (texturas 128x128 sem `pack.json` / `.wgsl`).

Na prática, **ajuste luz e cor com shaders e cubra materiais e céu com um pacote de recursos combinado**. Mas verifique co-uso e ordem de carga segundo a implementação e ajustes do jogo.

Na prática, **ajuste luz e cor com shaders e cubra materiais e céu com um pacote de recursos combinado**. Mas verifique co-uso e ordem de carga segundo a implementação e ajustes do jogo.

## 23. Realidade submarina com pacotes de shaders

Os looks submarinos constam de 3 camadas:

| Camada | Conteúdo | Operável desde pacotes? |
|---|---|---|
| ① Render de terreno/líquido | Processável por hooks. Os hooks light são chamados normalmente debaixo d'água | Sim (funciona "sob o véu") |
| ② Véu de definição líquida | Quad emissive de tela cheia da cor/alpha de definição do bloco líquido da câmera, desenhado na frente de tudo. O ajuste `cameraTint` ganha se existir | Não (nem cor nem densidade mudáveis) |
| ③ cameraTint | Ajuste do jogo | Não |

Pontos práticos: os pacotes seguem funcionando debaixo d'água / o véu não se remove / debaixo d'água não se ramifica (fogStart / fogEnd / fogColour não mudam debaixo d'água: fogVisibility tampouco o detecta).

---

# Parte VII: Suplemento de interioridades

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

O cômputo de névoa é sempre modo LINEAR (`fogVisibility = (fogEnd - dist) / (fogEnd - fogStart)`, clamp 0..1), com `fogStart = 32 × D`, `fogEnd = 32 × (D + 1)` (D = ajuste de névoa; só D = 0 é especial com fogEnd = 5). **A banda de gradiente é de só 32 blocos**, e `l.fogVisibility` é menos "bruma por distância" que **distância normalizada à borda do mundo carregado**. Varia por jogador com a distância de carga: efeitos por distância devem calcular `distance(l.position, bloxdEyePosition())` eles mesmos (receita R-B).

Cor de névoa padrão `rgb(183, 191, 195)` (cinza azul pálido). Criadores de mundos a mudam via `fogColourOverride` (hex). Com modo névoa 0 (NONE), **fogColour chega preto**. A forma padrão `mix(l.fogColour, col, l.fogVisibility)` é segura pois a cor de névoa não se usa a fogVisibility 1.

Ajustar `showFog` para false empurra a névoa a 3200–3328 blocos, desativando de fato (`fogVisibility ≈ 1` segue vindo).

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

Ao decodificar `aPackedLightLevels`, o motor põe a cada canal um **piso de 35% do canal RGB mais brilhante**. Ex. uma "luz vermelha pura" eleva-se a (1.00, 0.35, 0) em vértices antes de interpolação e lift. O laranja de tocha parecendo "rosa esbranquiçado mais que vermelho" vem daqui — ajuste a saturação de receitas de tocha quente (R9.1) contra este default.

A luz de mão (`heldLight`) tem alcance segundo o canal mais brilhante (máx 15 blocos) com pré-processo `dist^0.75`, o mesmo piso 35%, e `l.heldLight` é o valor **pré**-boost ambiental. Objetos personalizados podem fixar `spotlightRange` e ângulo de cone — um modo "feixe enquanto segura" cujo cone segue a câmera. Pacotes não podem saber a direção do feixe.

Blocos personalizados podem levar `skyLightEmission` (0–15), que **injeta no próprio canal skyLight, à parte do BFS de blockLight**. Pacotes estilo R9.12 que julgam sol/sombra por limiar skyLight podem falhar em mundos com skyLight elevado por luzes artificiais. Pacotes de distribuição julgam mais robusto combinado com blockLight.

## 27. Detalhes de pipeline

- **Os hooks surface correm "antes" de alphaTest**: `out.alpha` alimenta o teste de descarte diretamente. Materiais cutout (grama, folhas) permitem efeitos de dissolução tipo dither (receita R-C). Em líquidos (mistura) `out.alpha` é a transparência real (receita R-D). Sem efeito em terreno opaco normal — não confundir
- **Conteúdo de `l.ambient`**: `material.ambient × sceneAmbient`, distinto por material. O lado cena ata ao ajuste gráfico "Ambient Lighting Intensity" (defeito 0.5) — nunca programe defeitos fixos
- **`bloxdTime()` é realmente `performance.now()`**: o uptime do navegador enrolado a 1 hora. Sem relação com dia/noite do jogo nem tempo de mundo decorrido. Para animar sincronizado a um relógio de jogo, estime a hora desde o azimute `bloxdSunDirection()` em mundos com ciclo dia/noite
- Os finos damieiros em bordas de chunk ao carregar são o fundido de chunk por dither Bayer 4×4 em espaço de tela do motor, não bugs do pacote
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

1. **Mundo normal** (skybox default, sem overrides) — bloxdSunDirection() presente, cores padrão
2. **Mundo com skybox espacial** — bloxdSunDirection() = 0. O look do ramo `sunPresent`
3. **Mundo personalizado com `visionMinLightColour` / `skyLightColourOverride`** — escuros elevados e cores

Fontes principais de variação: `lightingOverride` (iluminação forçada) / `skyLightColourOverride`, `ambientLightColourOverride` (trocas hex) / `visionMinLightColour` (piso "cor mais escura visível" sobre sky e ambient; Night Vision o usa — os pacotes "caverna às escuras" não escurecem o previsto) / `heldLightColourOverride`, `Range`, `ConeAngle` / `fogChunkDistanceOverride`, `fogColourOverride`, `fogOnSkybox` / `skyBox` (presença de bloxdSunDirection()). `uSkyLightColour` padrão = (1,1,1) branco, `uAmbientLightColour` padrão = (0.25,0.25,0.30). `l.ambient` lado cena = ajuste gráfico "Ambient Lighting Intensity" (defeito 0.5). `l.fogVisibility` segue os ajustes de névoa/distância de chunks do jogador.

## 29. Meios de depuração

- Parâmetro URL `?renderer=lite` — força o renderizador Lite (`?renderer=webgl2` / `babylon` também valem)
- Parâmetro URL `?vconsole` — consola em tela (VConsole). Útil em verificação móvel real
- A consola mostra `noa-engine v0.33.0` e `Renderer: lite from <fonte>` — revise-os primeiro para não diagnosticar mal a via de render
- O renderizador WebGPU bloqueia-se "forçado ON" com pacote aplicado. O ajuste "Disable Block Texture Atlas" também se bloqueia (o atlas fica ON), e em ambientes sem WebGPU o pacote nem aplica. Base para escrever "precisa navegador WebGPU" em páginas de distribuição
- A revalidação runtime por partida (`checkCompilation`) compila materiais de terreno reais em WebGPU do navegador (mais estrita que a validação estática de ajustes). Os pacotes que falham aqui se excluem desse jogo

---

# Parte VIII: Guia de migração para API Version 2

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

Os três structs `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` ganham `blockId: u32`. É o **ID do bloco dono** (0–65535), uniforme em toda a face (passado com `@interpolate(flat)`). Use-o para identificar tipos de bloco sem depender da cor de textura. Mas a tabela ID-tipo vive dentro do motor e é invisível desde pacotes: **qual ID é qual bloco só pode ser medido no mundo**.

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

Aplicações: absorção/dispersão por espessura, projeção de ondas tipo cáustica desde coordenadas de mundo do fundo via `behind.position`, distinção céu-oclusão com `found=false` para reflexo de céu na água, turbidez por etapas segundo profundidade. Se o pipeline de cópia de profundidade não se constrói, degrada com segurança a "nada atrás".

## 36. Outras mudanças da v2

- **Fallback de hooks**: programas liquid usam o hook de terreno se `bloxdLiquidXxx` não está definido. **Pacotes só-terreno afetam a água como estão**. Defina hooks do lado liquid explícitos se não quiser.
- **Sem guardas `BLOXD_LIGHTING` para campos**: `blockLight` etc. existem em todas as variantes, com defeitos em unlit (0 / 1 / branco / 0). Use `#ifdef BLOXD_LIGHTING` só para detectar iluminação. Manter as guardas existentes não muda nada.
- **Muda a condição de `BLOXD_ALPHA`**: definido em variantes de terreno não estritas e em todas as liquid, indefinido em strict × terrain. Mantenha a guarda ao escrever alpha em hooks de terreno.
- **Construção direta de structs proibida**: chamadas de construtor como `BloxdLight(...)` são rejeitadas na validação estática. Modifique sempre desde `bloxdDefault*` ou use uma cópia da entrada.
- **`let _ =` vira `_ =`**: a atribuição de descarte WGSL `_ = f();` vale, mas `let _ = f();` é rejeitada.
- **offInStrict**: definir um hook vertex, ou um `discard` alcançável desde hooks surface / light, autodesativa todo o pacote em jogos estritos em vez de erro (a UI mostra `shaderPack:offInStrict`; segue rodando em jogos allow). Envolva hooks vertex e `discard` com `#ifndef BLOXD_STRICT`.
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

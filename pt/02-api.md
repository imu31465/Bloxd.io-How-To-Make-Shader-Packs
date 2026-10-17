[← Parte anterior](01-making.md)·[Voltar ao manual](README.md)·[Parte seguinte →](03-recipes.md)

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
- `bloxdSunDirection()` é vetor unitário só enquanto há sol; zero quando o céu não tem sol. **A lua está sempre em `-bloxdSunDirection()`** (o motor calcula a posição lunar como o oposto exato do sol). Mas em mundos padrão o sol é estático e a lua também — uma lua em movimento só importa em mundos com ciclo dia/noite (ver [Parte VII](07-internals.md), seção 24)
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
- **`blockId` distingue tipos de bloco**: identificação independente da cor de textura. Mas a tabela ID-tipo vive dentro do motor: qual ID é qual bloco deve ser medido no mundo (ver [Parte VIII](08-apiv2.md))
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

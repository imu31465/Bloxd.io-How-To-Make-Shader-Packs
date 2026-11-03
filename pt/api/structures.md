# Estruturas de entrada e saída

> API alvo: 5 · Build alvo: `ab90qa` · Estado: Analyzed (restaurado verbatim do cabeçalho em produção)

Sete structs são legíveis/graváveis pelos pacotes. Todo campo está listado abaixo (campos `#ifdef` são condicionais). O cabeçalho completo está em [Interioridades do motor](../internals/engine-header.md).

## BloxdVertexIn (entrada do hook de vértice)

```wgsl
struct BloxdVertexIn {
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `position` | `vec3f` | posição em espaço de render (espaço de mundo via `bloxdWorldPosition()`) |
| `normal` | `vec3f` | vetor unitário apontando para fora da face |
| `localPosition` | `vec3f` | coordenadas locais do modelo; **`vec3f(0.0)` para terreno e líquido**; para o braço de um jogador, uma espada na mão ou as pás de um moinho, gira com o modelo |
| `flags` | `BloxdFlags` | classe de face ([Flags](flags.md)) |

## BloxdVertex (saída do hook de vértice)

```wgsl
struct BloxdVertex {
    position: vec3f,      // The render position output.
}
```

## BloxdSurfaceIn (entrada do hook de surface)

```wgsl
struct BloxdSurfaceIn {
    colour: vec3f,        // RGB colour = texture * tint * ambient occlusion.
    alpha: f32,           // Opacity.

    // Enchanted items and armour only, all 0 for anything else.
    enchantTier: u32,     // 1-5 for Tier 1-5.
    enchantColour: vec4f, // RGB enchant colour, and its animated alpha.
    enchantSpeed: f32,    // How fast the pattern moves, faster at higher tiers.

    // Players and mobs only, 0 for anything else: RGB overlay colour, e.g. the
    // red flash when hurt, and its alpha. bloxdLitColour mixes it into colour.
    overlayColour: vec4f,

    // These mean the same as in BloxdVertexIn, after the vertex hook.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.

    // These are all 0 if the face has no texture. Most models use textureId 0.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `colour` | `vec3f` | RGB = textura × tinta × AO, cozido pelo mesher |
| `alpha` | `f32` | opacidade |
| `enchantTier` | `u32` | nível de encantamento 1–5; 0 para qualquer coisa não encantada |
| `enchantColour` | `vec4f` | RGB de encantamento mais um alfa **animado** (`.a`) — ler `.a` por fragmento dá de graça um padrão em movimento; tudo zero em faces não encantadas |
| `enchantSpeed` | `f32` | velocidade do padrão de encantamento («faster at higher tiers») |
| `overlayColour` | `vec4f` | sobreposição de entidade (clarão de dano etc.) RGB + alfa; 0 fora de jogadores/mobs; misturada por `bloxdLitColour` antes da iluminação |
| `position` / `normal` / `localPosition` / `flags` | — | mesmos significados que em `BloxdVertexIn`, **depois do hook de vértice** (seguem vértices movidos) |
| `textureId` | `u32` | a textura desta face; compare com `bloxdTextureId*`; **0 quando a face não tem textura** — a maioria dos modelos usa textureId 0 (texturas próprias do modelo, skins de jogador) |
| `textureRotation` | `u32` | quartos de volta no sentido horário (0–3), aplicados por `bloxdTexel` |
| `uv` | `vec2f` | a textura abrange 0–1; `fract(uv)` é desenhado (passos inteiros ladrilham) |
| `mipLevel` | `f32` | nível de mipmap: 0 = tamanho completo, 1 = metade… |

## BloxdSurface (saída do hook de surface)

```wgsl
struct BloxdSurface {
    colour: vec3f,        // RGB colour output.
#ifdef BLOXD_ALPHA
    alpha: f32,           // Opacity output.
#endif
    emission: vec3f,      // Emissive RGB, added after lighting, before fog.
    enchantColour: vec4f, // Enchant output, mixed in by bloxdLitColour.
    overlayColour: vec4f, // Overlay output, mixed in by bloxdLitColour.
}
```

| Campo | Tipo | Condição | Descrição |
|---|---|---|---|
| `colour` | `vec3f` | sempre | saída RGB |
| `alpha` | `f32` | `#ifdef BLOXD_ALPHA` (todo líquido + terreno/modelo não strict) | saída de opacidade |
| `emission` | `vec3f` | sempre | RGB emissivo — **somado depois da iluminação, antes da névoa** |
| `enchantColour` | `vec4f` | sempre | saída de encantamento, misturada por `bloxdLitColour` |
| `overlayColour` | `vec4f` | sempre | saída de sobreposição, misturada por `bloxdLitColour` |

`bloxdDefaultSurface` passa `enchantColour` / `overlayColour` adiante sem alteração, então o visual padrão coincide com o comportamento interno do motor na v4. Zere `out.enchantColour` para remover o brilho sob iluminação própria; amplifique `out.overlayColour.a` para destacar o clarão de dano.

## BloxdLightIn (entrada do hook de light)

```wgsl
struct BloxdLightIn {
    litColour: vec3f,  // Lit and enchanted RGB colour, before emission and fog.
    directional: f32,  // Summed Lambert from directional lights; 0 if none.
    diffuse: vec3f,    // The material's RGB response to directional light.
    emissive: vec3f,   // The material's RGB glow, added to directional light.
    ambient: vec3f,    // RGB ambient colour, added to directional light.
    blockLight: vec3f, // RGB block light; 0 when !bloxdLit().
    skyLight: f32,     // Sky light; 1 when !bloxdLit().
    ambientLightColour: vec3f, // Minimum RGB light; 1 when !bloxdLit().
    skyLightColour: vec3f, // RGB colour of skyLight; 1 when !bloxdLit().
    heldLight: vec3f,  // RGB held light; 0 when !bloxdLit() or no light held.
    fogColour: vec3f,  // The game's RGB fog colour; 0 when the game has no fog.
    fogAlpha: f32,     // 0 = no fog, 1 = only fogColour.

    // These are the same as in BloxdSurfaceIn.
    position: vec3f,      // Render position.
    normal: vec3f,        // Unit vector pointing away from the face.
    localPosition: vec3f, // A model's local coordinates. 0 for terrain/liquid.
    flags: BloxdFlags,    // What kind of block, item or lifeform.
    textureId: u32,       // This face's texture. Compare with bloxdTextureId*.
    textureRotation: u32, // Quarter turns clockwise, which bloxdTexel applies.
    uv: vec2f,            // The texture spans 0-1. fract(uv) is drawn.
    mipLevel: f32,        // Texture mipmap level. 0 = full size, 1 = half, etc.
}
```

Significado campo por campo e papel na matemática de iluminação: veja [Iluminação](lighting.md).

**Frente a versões mais antigas da API**: `fogVisibility` (v2–v4) agora é `fogAlpha` com semântica invertida (0 = sem névoa); `engineColour` agora é `litColour`; a redação dos níveis de luz é «0 when !bloxdLit()». As mudanças de campo por versão, completas: [Histórico de versões](../history/).

## BloxdLight (saída do hook de light)

```wgsl
struct BloxdLight {
    colour: vec3f, // RGB colour output.
}
```

## BloxdOpaqueBehind (retorno da função especial)

```wgsl
struct BloxdOpaqueBehind {
    hit: bool,       // False where nothing opaque is behind (sky).
    position: vec3f, // The render position; 0 when !hit.
    distance: f32,   // From the camera; 0 when !hit.
}
```

Valor de retorno de `bloxdOpaqueBehind()`. Use em variantes de líquido atrás de uma guarda `#ifdef BLOXD_SCENE_DEPTH` (o campo era `found: bool` na v2).

## Campos condicionais ↔ macros

| Campo | Existe quando | Nota |
|---|---|---|
| `BloxdSurface.alpha` | `#ifdef BLOXD_ALPHA` | todas as variantes de líquido + terreno/modelo não strict |
| chamada a `bloxdOpaqueBehind()` | `#ifdef BLOXD_SCENE_DEPTH` | todas as variantes de líquido |

`BLOXD_STRICT` controla a **existência de hooks** (os de vértice), não a forma das structs. Veja [Pré-processador](preprocessor.md).

## Convenções de escrita (recapitulação)

- Nunca construa structs de saída diretamente — parta de `bloxdDefault*`; em hooks de light `var out = s;` também funciona
- Um `var x: BloxdSurface;` isolado é um erro de validação
- Os parâmetros dos hooks são somente leitura — copie antes de modificar

## Relacionado

- [Iluminação](lighting.md) · [Flags](flags.md) · [API de texturas](texture-api.md)

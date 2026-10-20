[← Parte anterior](08-apiv2.md)·[Voltar ao manual](README.md)

# Parte IX: Guia de migração para API Version 3

Build alvo: `3ymzdd.main.fae4743f.js` — **a build de produção em execução desde 2026-10-19**. O bundle que o bloxd.io serve em produção é idêntico byte a byte (conferido por md5, tanto o bundle principal quanto os chunks de pacotes de shaders) à implantação de pré-produção contra a qual esta parte foi originalmente pesquisada, então tudo aqui se aplica diretamente à produção. O modelo de pacote mantém a forma da v2 (mesmos campos de `pack.json`, mesmos limites do carregador, mesmo layout de uniform).

As Partes I–VII deste guia ainda estão escritas sobre a base v2. Esta parte reúne, na mesma ordem da [Parte VIII](08-apiv2.md), os pontos de migração v2 → v3 e os novos recursos da v3. A conversão é majoritariamente mecânica (§47), mas duas mudanças realmente alteram o comportamento — a luz padrão agora atenua a emissão com a névoa (§43), e `BLOXD_ALPHA` não é mais definido nas variantes liquid (§46) — e `blockId` é substituído por completo por `blockFlags` (§42), então sempre verifique com uma compilação no jogo antes de distribuir.

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
- O bloco de uniform do motor não muda de forma: `@group(3) @binding(0)`, 64 B, contendo — na ordem de declaração — o tempo, o offset de render, a direção do sol e a posição dos olhos. Dois nomes internos de campo mudaram: `time` → `seconds`, `originOffset` → `renderOffset`. O **layout de bytes é idêntico ao da v2**, e nada muda para o código do pacote de qualquer forma, porque pacotes não podem nomear o uniform diretamente (o cabeçalho do motor o marca como fornecido pelo motor e somente leitura, "which packs can't name"); continue usando as funções de cabeçalho `bloxdSeconds()` / `bloxdRenderOffset()`.
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
aos 8 blocos de grama. Nenhuma exceção em nenhuma das direções. Combine com `vertex.normal`
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
| `BLOXD_ALPHA` | somente variantes **terrain** não strict |
| `BLOXD_SCENE_DEPTH` | **todas as variantes liquid** |

Duas coisas mudam para autores em relação às regras da v2 ([Parte VIII](08-apiv2.md) §36):

- **`BLOXD_ALPHA` não é mais definido em variantes liquid.** Na v2 ele era definido também em todas as variantes liquid; na v3, código `#ifdef BLOXD_ALPHA` do lado liquid simplesmente nunca compila — a lógica condicionada por alpha precisa ficar nos hooks de terreno, ou contar com o fato de as variantes liquid não terem uma flag que force alpha.
- **`BLOXD_SCENE_DEPTH` é sempre definido em variantes liquid**, então o uso de profundidade continua OK sem guarda ali, exatamente como na v2 (§35); em hooks de terreno ele continua exigindo o envelope `#ifdef BLOXD_SCENE_DEPTH`.

## 47. Lista de migração v2 → v3

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`** nas três structs de entrada; expresse a estilização de material como testes de bits contra as constantes `bloxdBlockFlag*` (§42); descarte as heurísticas de faixa de ID da v2
3. **`bloxdTime()` → `bloxdSeconds()`**; declare seu próprio período em vez do `bloxdTimeWrap` removido (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **Reconstrua a matemática de luz de `engineColour` para `litColour` + névoa** conforme a tabela da §43; note que o padrão agora atenua a emissão com a névoa
6. **Hooks liquid**: defina `bloxdLiquid*` explicitamente quando quiser que a água seja tratada de forma diferente; omita-os para cair de volta nos hooks de terreno
7. **Audite as guardas de `BLOXD_ALPHA`** — a flag sumiu das variantes liquid (§46); código do lado liquid condicionado por alpha está morto ali
8. **Use `bloxdPi` / `bloxdTau`** onde constantes de trigonometria eram codificadas à mão; remova redeclarações locais do pacote que agora duplicam o cabeçalho
9. **Mantenha as guardas strict**: hooks vertex e `discard` continuam dentro de `#ifndef BLOXD_STRICT`; o template guarda `bloxdLiquidVertex` da mesma forma que o terreno
10. **Valide no jogo** — compile e teste o pacote em um jogo que suporte pacotes de shaders

## 48. Outras mudanças e notas da v3

- **A validação continua em duas etapas** ([Parte VIII](08-apiv2.md) §38): primeiro a validação estática, depois a compilação WebGPU real do navegador por meio de trechos stub gerados que chamam seus hooks, com erros mapeados de volta para arquivos / linhas de origem, e diagnósticos que restauram os nomes originais dos identificadores do lado do motor por meio de um mapeamento.
- **Diagnósticos strict nomeiam o motivo**: um hook vertex que move o terreno reporta "… moves terrain, which strict games prevent." e `discard` em hooks surface / light reporta "discard makes terrain see-through, which strict games prevent."; a interface de configurações mantém a orientação "wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`." (`offInStrict`).
- **Mensagens do carregador**: os tipos de erro e limites não mudam; "Zip64 archives aren't supported." é exibido como mensagem de interface (`loadZip64`).
- **Editor no jogo**: o editor de shaders foi reformulado para um editor baseado em CodeMirror, com realce ciente de WGSL, correspondência de colchetes e intervalos de diagnóstico.
- **Requisito de hardware**: o Lite exige um driver que suporte o recurso WebGPU `shader-f16`; drivers antigos demais são rejeitados com uma mensagem como "Intel driver too old for Lite (no shader-f16)".
- **Redação**: o texto sobre jogos que aceitam pacotes de shaders agora diz "in games that **support** them".
- **Escopo dos títulos**: o conjunto de jogos em que os pacotes rodam não muda em relação à build anterior.

## 49. Interioridades do motor: como o renderizador Lite invoca seus hooks

Tudo em §40–§48 é o que o carregador e o cabeçalho dizem. Esta seção e as seguintes documentam o que o motor realmente faz em tempo de execução, restaurado do bundle de produção (o renderizador Lite — um chunk de 175 KB; o nome real do arquivo de integração, `lite/terrainShaderPack.ts`, sobrevive dentro de suas strings de erro). Nada disso muda o que você escreve, mas elimina as suposições sobre o que seus hooks recebem — e resolve várias questões que outros guias da comunidade ainda listam como abertas.

O renderizador não "chama" seus hooks a partir de JavaScript. Quando um pacote passa na validação, o motor **injeta as chamadas dos seus hooks no próprio WGSL de terreno** substituindo linhas de âncora fixas no texto do shader. Uma âncora precisa corresponder exatamente uma vez — zero ou múltiplas correspondências abortam com `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Estágio | Linha de âncora no shader do motor | O que é injetado |
|---|---|---|
| vertex | `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` | constrói `BloxdVertexIn`, chama seu hook vertex, grava `worldPos` de volta |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | constrói `BloxdSurfaceIn`, chama seu hook surface, grava `baseColor` / `alpha` de volta |
| cor iluminada | logo antes de `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` | `let bloxdSpLitColour = color.rgb;` — captura a cor antes da névoa |
| light | mesmo ponto | constrói `BloxdLightIn`, chama seu hook light, grava `color` de volta |

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

Três fatos sobre a aplicação das regras decorrem diretamente dessa injeção:

- **Terreno strict ignora mudanças de alpha do hook surface.** A gravação de volta `alpha = bloxdSpSurface.alpha` só é injetada para programas liquid ou variantes não strict — a implementação por trás da tabela de macros da §46. (Em terreno strict, seu código `#ifdef BLOXD_ALPHA` não compila de qualquer forma; agora também está confirmado que gravações de alpha sem guarda são descartadas ali.)
- **Uma variante strict que ainda declara um hook vertex nunca o executa** — o motor reporta isso no momento da build: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. É por isso que o template oficial (§45) envolve `bloxdLiquidVertex` na mesma guarda `#ifndef BLOXD_STRICT` que sua contraparte de terreno.
- Os identificadores `bloxdSp*` (`bloxdSpVertexIn`, `bloxdSpLitColour`, `bloxdSpSceneDepth`, `bloxdSpPixel`, … — 16 no total) são temporários do lado do motor. Seu código nunca os vê, mas eles aparecem em diagnósticos e na saída de engenharia reversa de qualquer pessoa, então vale reconhecê-los à primeira vista.

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

- **As luzes direcionais têm limite rígido de quatro.** O renderizador gera erro com `Terrain supports 4 directional lights, not ${n}` se uma cena tentar registrar mais do que isso. `l.directional` é a soma de Lambert sobre quantas existirem (0–4; as próprias cenas da Bloxd usam 2 — [Parte VII](07-internals.md) §27).
- **Nomes do programa de terreno**: as chaves de cache de pipeline são `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}` — um pacote aparece como o sufixo `-sp{variant}`, um programa por variante da §46.
- **`BLOXD_TERRAIN_DIRECTIONAL` é uma macro interna do motor** (definida quando dirLightCount > 0). Ela *não* é uma das quatro do prelúdio e nunca chega ao código do pacote — mas aparece em dumps WGSL dos próprios shaders do motor, então reconhecê-la evita confusão.
- **Decodificação de nível de luz**: o atributo de vértice `aPackedLightLevels` é um f32 que empacota quatro nibbles, cada um dividido por 15: rgb = a luz de bloco colorida, a = o canal céu/na mão. O estágio de vértice o decodifica no varying `vLightLevels`; `blockLight` lê `.rgb`, o canal céu/na mão lê `.w`. O motor aplica piso de 35% do canal mais brilhante aos canais rgb antes da interpolação — a âncora do lado do motor para a elevação que a [Parte VII](07-internals.md) §26 documenta a partir do jogo.
- **`vTerrainLambert`** (a fonte de `directional`, §49) é gerada como uma soma sobre as luzes direcionais ativas: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`, protegida por `BLOXD_TERRAIN_DIRECTIONAL`.
- **Detalhes do carregamento de manifesto**: entradas zip sob `__MACOSX/`, arquivos com prefixo `._` e `.DS_Store` são filtrados (ruído de arquivo do macOS); `pack.json` é localizado por comparação de caminho em minúsculas — zero correspondências → `loadNoManifest`, duas ou mais → `loadDuplicateManifest`; a leitura do manifesto é limitada a 65.536 bytes.
- **Como tudo isso foi verificado**: os módulos do bundle de produção foram restaurados (165 chunks, 4.951 módulos) e executados em um harness compatível com webpack sob Node.js. O `HEADER_VERSION` medido (§53), o cabeçalho renderizado de 5.637 bytes, a ordem canônica da tabela de variantes e o mapa de funções especiais vêm todos de *executar o código distribuído*, não de ler strings. O mesmo harness é o núcleo natural para um `pack_check` v6 da comunidade — executar o próprio validador do motor contra um pacote reproduz seus veredictos exatamente.

---

Pesquisa de ltf_ahel (realizada com glm)

[← Parte anterior](08-apiv2.md)·[Voltar ao manual](README.md)

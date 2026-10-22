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

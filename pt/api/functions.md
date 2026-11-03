# Funções

> API alvo: 5 · Build alvo: `ab90qa` · Estado: Analyzed (restaurado verbatim do cabeçalho em produção)

Toda função do cabeçalho. A API de texturas (`bloxdTexel` / `bloxdTextureSize` / `bloxdTextureId*`) é tratada em [API de texturas](texture-api.md), junto com `bloxdOpaqueBehind`.

## Funções de frame (mesmo valor durante todo o frame)

Nota do cabeçalho: *"These functions return the same value for the entire frame."* Elas leem o uniform `bloxdPackInputs`, então também são chamáveis de hooks de vértice e de funções de escopo de módulo.

### bloxdEyePosition

```wgsl
fn bloxdEyePosition() -> vec3f
```

- **Retorna**: a posição de render da câmera
- **Chamável de**: todos os 9 hooks + escopo de módulo
- **Usos**: vetores de visão (`normalize(l.position - bloxdEyePosition())`), rim light, distâncias

### bloxdRenderOffset

```wgsl
fn bloxdRenderOffset() -> vec3i
```

- **Retorna**: deslocamento inteiro de blocos; **posição de render + este deslocamento = posição de mundo**
- Muda conforme o jogador viaja (mantém as posições de render perto de 0,0,0)
- Usada internamente por `bloxdWorldPosition()`

### bloxdSunDirection

```wgsl
fn bloxdSunDirection() -> vec3f
```

- **Retorna**: vetor unitário em direção ao sol na orientação de mundo; **vetor zero quando não há sol**
- **Fatos**:
  - **a lua está sempre em `-bloxdSunDirection()`** (o motor a coloca oposta ao sol)
  - **nunca passe o vetor zero a `normalize`** — proteja com `dot(d, d) < 1e-8` e recorra a uma direção constante
  - a build atual não tem ciclo dia/noite; sol, lua e estrelas não se movem durante uma sessão (só a opacidade alterna). No céu de terra padrão o sol fica perto de `(−0.56, 0.81, −0.18)` (elevação ≈ 54°)
- **Usos**: temperatura de cor, direção da luz, porta solar, pseudo luar

### bloxdSeconds

```wgsl
fn bloxdSeconds() -> f32
```

- **Retorna**: segundos desde o carregamento da página (sem wrap — o f32 mantém precisão submilissegundo pelas primeiras 4,5 horas)
- **Usos**: animação; temporizadores recorrentes via `bloxdSeconds() % period`
- **Nota**: ao contrário do `bloxdTime()` da v2 (que dava wrap a 3600 s), não dá wrap

### bloxdLit

```wgsl
// Whether block and sky lighting is on. When it's off, BloxdLightIn's
// blockLight and heldLight are 0, and its skyLight and light colours are 1.
fn bloxdLit() -> bool
```

- **Retorna**: se a iluminação de bloco e céu está ativada
- **Novo na v5**: substitui o ramo em tempo de compilação `#ifdef BLOXD_LIGHTING` da v4 por uma verificação em tempo de execução
- **Garantias quando desativada** (nota do cabeçalho): `blockLight` e `heldLight` valem 0; `skyLight` e as cores de luz (`ambientLightColour` / `skyLightColour`) valem 1
- **Uso**: condicione o código que depende da iluminação:

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    var out = bloxdDefaultLight(surface, light);
    // ... processamento com iluminação ativada
    return out;
}
```

Usar `BLOXD_LIGHTING` produz *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## Conversão de coordenadas

### bloxdWorldPosition

```wgsl
// Convert a render position to a world position, with possible f32 inaccuracy.
fn bloxdWorldPosition(position: vec3f) -> vec3f
```

- **Retorna**: `position + vec3f(bloxdRenderOffset())`
- **Nota**: os limites de precisão do f32 fazem com que coordenadas distantes possam ser inexatas (cabeçalho: *"with possible f32 inaccuracy"*)

### bloxdFragmentBlockPosition — indocumentada, mas ainda injetada

```wgsl
fn bloxdFragmentBlockPosition(position: vec3f, normal: vec3f) -> vec3i
```

Esta função **não faz mais parte do cabeçalho documentado** (estava no da v4), mas o motor ainda a aceita e a define:

- **Validador**: continua listada na tabela de assinaturas em produção, então as chamadas passam na validação de nomes em todos os hooks (incluindo hooks de vértice)
- **Execução**: o gerador de código ainda injeta uma definição no módulo de terreno/líquido e em ambos os programas de modelo — terreno/líquido usam `vec3i(floor(position - normal * 0.5)) + bloxdRenderOffset()`; os pipelines de modelo usam um deslocamento de 1/64 de bloco, encaixando na célula do modelo para modelos de bloco colocados
- **Ressalva**: por ser uma interna indocumentada, ela pode desaparecer em uma versão futura sem aviso — prefira `bloxdWorldPosition()` para posições contínuas e `flags` para "qual bloco é este" (veja [Histórico de versões: v5](../history/v5.md) para a remoção do cabeçalho)

Pacotes escritos para a v4 que a chamam continuam funcionando; pacotes novos não devem adotá-la.

## Funções padrão (comportamento do motor)

### bloxdDefaultVertex

```wgsl
fn bloxdDefaultVertex(vertex: BloxdVertexIn) -> BloxdVertex
// implementação: return BloxdVertex(vertex.position);
```

### bloxdDefaultSurface

```wgsl
fn bloxdDefaultSurface(surface: BloxdSurfaceIn) -> BloxdSurface
```

Passa `colour` adiante, passa `enchantColour` / `overlayColour` sem alteração, zera `emission` (e passa `alpha` em variantes `BLOXD_ALPHA`). **Structs de saída só podem ser construídas via esta função.**

### bloxdDefaultLight

```wgsl
fn bloxdDefaultLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight
// implementação:
//   let lit = bloxdLitColour(surface, light);
//   return BloxdLight(bloxdApplyFog(lit + surface.emission, light));
```

Literalmente, "aplique a receita do motor e depois aplique a névoa ao resultado com a emissão somada".

## Funções da receita de iluminação

A própria receita de iluminação do motor, documentada como WGSL chamável — componha ou substitua os estágios individualmente. Explicações e o diagrama de fluxo: [Iluminação](lighting.md).

| Função | Assinatura | Papel |
|---|---|---|
| `bloxdShading` | `(light: BloxdLightIn) -> vec3f` | como o material e o ângulo da face a iluminam (Lambert × difusa + emissiva + ambiente, com clamp 0–1) |
| `bloxdWorldLight` | `(light: BloxdLightIn) -> vec3f` | a luz do mundo aqui (a mais brilhante entre bloco/céu/mão, com piso em `ambientLightColour`) |
| `bloxdLitColour` | `(surface: BloxdSurface, light: BloxdLightIn) -> vec3f` | a cor da superfície iluminada como o motor o faz (antes de emissão e névoa) |
| `bloxdApplyFog` | `(colour: vec3f, light: BloxdLightIn) -> vec3f` | aplica a névoa deste fragmento (`mix(colour, fogColour, fogAlpha)`) |

## Funções especiais

### bloxdOpaqueBehind

```wgsl
fn bloxdOpaqueBehind() -> BloxdOpaqueBehind
```

- **Retorna**: `BloxdOpaqueBehind` (`hit: bool`, `position: vec3f`, `distance: f32`)
- **Chamável de**: apenas hooks surface / light (a textura de profundidade é exclusiva do FRAGMENT)
- **Guarda**: `#ifdef BLOXD_SCENE_DEPTH` (definida em variantes de líquido)
- **Significado**: a face opaca atrás deste fragmento (terreno visto através da água); `hit == false` para o céu
- **Renomeação da v2**: `found` → `hit`
- **A fundo**: [Histórico de versões: v3](../history/v3.md) e [Interioridades do motor](../internals/rendering-pipeline.md)

## Relacionado

- [Iluminação](lighting.md) · [API de texturas](texture-api.md) · [Formato do pacote](pack-format.md)

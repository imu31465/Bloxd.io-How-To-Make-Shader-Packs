# Pipeline de renderização

> API alvo: 5 · Build alvo: `v98qt8` (2026-11-08, produção e preprod) · Estado: Analyzed (análise de JavaScript do bundle de produção)
- **Os hooks surface rodam "antes" do alphaTest**: `out.alpha` alimenta o teste de discard diretamente. Materiais cutout (grama, folhas) permitem efeitos de dissolução estilo dither (receita R-C). Em líquidos (com blend) `out.alpha` é a transparência real (receita R-D). Sem efeito sobre terreno opaco normal — não confunda
- **O conteúdo de `l.ambient`** é `material.ambient × sceneAmbient`, diferente por material. O lado da cena se liga ao ajuste gráfico "Ambient Lighting Intensity" (padrão 0.5) — nunca deixe valores padrão fixados no código
- **As luzes direcionais da cena são um esquema de 2 luzes**: a soma de Lambert da luz principal (direção vinda da posição de sol do ajuste de céu, intensidade 1.0) e da luz de preenchimento (direção `[-0.5, -1, -1]`, intensidade 0.35) chega a `l.directional`. A luz de preenchimento aponta para baixo, então não contribui em nada para as faces superiores e capta as superfícies voltadas para baixo (tetos de cavernas etc.). O terreno só considera luzes adicionadas em `_initScene`; luzes adicionadas à cena após a inicialização são ignoradas pelo terreno e pelos modelos de blocos (uma mensagem de aviso oficial diz isso)
- **`bloxdSeconds()` é na verdade `performance.now()`**: o uptime do navegador, que dá a volta em 1 hora. Sem relação com o dia/noite do jogo nem com o tempo decorrido do mundo. Para animar em sincronia com um relógio de jogo, estime a hora a partir do azimute de `bloxdSunDirection()` em mundos com ciclo dia/noite
- **As funções do cabeçalho leem um único uniform**: o motor coloca o uniform de 64 bytes `bloxdPackInputs` em `@group(3) @binding(0)` (5 slots — seconds / lit / renderOffset / sunDirection / eyePosition, little-endian), e `bloxdSeconds()` / `bloxdLit()` / `bloxdRenderOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` correspondem à leitura desses slots ([Formato do pacote: uniform por frame](../api/pack-format.md#uniform-por-frame-bloxdpackinputs)). Pacotes não podem escrever esse uniform e, como o WGSL do pacote e o do motor se fundem em um único módulo, declarar você mesmo o mesmo group/binding também é impossível. `@group(3) @binding(1)` carrega a textura de profundidade de cena dos líquidos, e `@binding(2)` o buffer de armazenamento `bloxdSpTextureLayers`
- **Os dados de vértice são construídos pelo mesher (Web Worker)**: o terreno de blocos é intercalado a 28 bytes por vértice (32 bytes quando o atlas está ativado) — posição = float32×3 / normal = inteiro de 8 bits com sinal×4 / cor = inteiro de 8 bits normalizado×4 (a substância de `s.colour` — tint × AO é assado em 8 bits na etapa do mesher, então separá-lo ou restaurá-lo do lado do pacote é impossível por princípio) / UV = float32×2 / atlasIndex = float32. Só os níveis de luz viajam em um buffer de vértice separado de 4 bytes (valores medidos: [Registro de dados do motor](engine-data.md)). Os vértices são desenhados com instanciação por chunk
- Os finos padrões quadriculados nas bordas de chunk durante o carregamento são o fade de chunk por dither Bayer 4×4 em espaço de tela do motor, não bugs do pacote (desativável pelo ajuste gráfico `chunkFadeIn`)
- **`mod` é uma palavra reservada**: rejeitado com `pack.wgsl:3 'mod' is a reserved word in WGSL.` Escreva restos com o operador `%`

## R-C. Dissolução por dither Bayer — out.alpha controla o discard

Reproduz a **mesma tabela Bayer 4×4** que o motor usa nos fades de chunk, dissolvendo cutouts desde os blocos baixos para cima. O discard dispara em materiais alphaTest (grama, folhas); em líquidos ele se torna transparência de blend.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod é reservado, então use o operador %
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
    // dissolução desde os blocos baixos para cima; dissolve mais alto persiste
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

## R-D. Fade de água perto da câmera — o alpha do líquido preserva as linhas de visão

O `out.alpha` do hook de líquido alimenta o blend diretamente. Faz fade apenas da superfície de água sob a câmera para preservar a visão ao mergulhar e com a câmera fora da água.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // totalmente transparente → normal ao longo de 0–3 blocos
    #endif
    return out;
}
```

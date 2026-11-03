# Detalhes de pipeline



- **Os hooks surface correm "antes" de alphaTest**: `out.alpha` alimenta o teste de descarte diretamente. Materiais cutout (grama, folhas) permitem efeitos de dissolução tipo dither (receita R-C). Em líquidos (mistura) `out.alpha` é a transparência real (receita R-D). Sem efeito em terreno opaco normal — não confundir
- **Conteúdo de `l.ambient`**: `material.ambient × sceneAmbient`, distinto por material. O lado cena ata ao ajuste gráfico "Ambient Lighting Intensity" (defeito 0.5) — nunca programe defeitos fixos
- **As luzes direcionais da cena formam um rig de 2 luzes**: a soma de Lambert da luz principal (direção vinda da posição do sol ajustada no skybox, intensidade 1.0) e da luz de preenchimento (direção `[-0.5, -1, -1]`, intensidade 0.35) chega em `l.directional`. A luz de preenchimento aponta para baixo: não acrescenta nada às faces para cima e cobre as superfícies voltadas para baixo (tetos de cavernas etc.). O terreno só considera luzes adicionadas em `_initScene`; as adicionadas após o início são ignoradas pelo terreno e pelos modelos de blocos (uma mensagem de aviso oficial diz isso)
- **`bloxdSeconds()` é realmente `performance.now()`**: o uptime do navegador enrolado a 1 hora. Sem relação com dia/noite do jogo nem tempo de mundo decorrido. Para animar sincronizado a um relógio de jogo, estime a hora desde o azimute `bloxdSunDirection()` em mundos com ciclo dia/noite
- **As funções de cabeçalho leem um único uniform**: o motor coloca um uniform de 64 bytes em `@group(3) @binding(0)` (4 slots — time / originOffset / sunDirection / eyePosition, little-endian), e `bloxdSeconds()` / `bloxdRenderOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` correspondem à leitura desses slots. Um pacote não pode escrever esse uniform, e como o WGSL do pacote e o do motor se fundem num único módulo, declarar o mesmo group/binding por conta própria também é impossível (a v3 renomeia os dois slots — `seconds` / `renderOffset`, expostos como `bloxdSeconds()` / `bloxdRenderOffset()` — e adiciona a textura de profundidade da cena em `@group(3) @binding(1)`; ver [Parte IX](../history/v3.md) §41 e §51)
- **Os dados de vértice são construídos pelo mesher (Web Worker)**: o terreno de blocos é entrelaçado com 28 bytes por vértice (32 bytes quando o atlas está ativo) — posição = float32×3 / normal = inteiro com sinal de 8 bits×4 / cor = inteiro normalizado de 8 bits×4 (a substância de `s.colour` — tinta × AO é cozida em 8 bits na etapa do mesher, separá-la ou restaurá-la no lado do pacote é portanto impossível por princípio) / UV = float32×2 / atlasIndex = float32. Só os níveis de luz viajam num buffer de vértice separado de 4 bytes ([Parte VII](../internals/) §26, [Parte II](../api/) §11). Os vértices são desenhados por instanciação por chunk
- Os finos damieiros em bordas de chunk ao carregar são o fundido de chunk por dither Bayer 4×4 em espaço de tela do motor, não bugs do pacote (desativável pelo ajuste gráfico `chunkFadeIn`)
- **`mod` é palavra reservada**: rejeitado com `pack.wgsl:3 'mod' is a reserved word in WGSL.` Escreva restos com o operador `%`

## R-C. Dissolução por dither Bayer — out.alpha controla discard

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
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

## R-D. Fundido de água cercana à câmera — o alpha líquido despeja a vista

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

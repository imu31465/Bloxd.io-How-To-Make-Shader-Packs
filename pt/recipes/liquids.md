# Receitas de líquidos



## Superfície ondulada (cintilação de cor)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdRenderOffset().x);
    let worldZ = s.position.z + f32(bloxdRenderOffset().z);
    let ripple = sin(bloxdSeconds() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid sempre tem BLOXD_ALPHA — guarda por hábito
    #endif
    return out;
}
```

## Transparência pseudo por altura (não é teste real de baixio)

> Na v1, profundidade de cena e posição do fundo não podiam ser consultadas: a profundidade real não se calculava só com aquela API. Na v2, `bloxdOpaqueBehind()` limitado a líquidos mede a espessura até a face opaca traseira ([Parte VIII](../history/v2.md) R-E). O que segue é o velho pseudo efeito sem isso: `s.position.y` é coordenada local e usá-la crua desloca o efeito com a origem do chunk. Para altura de mundo converta com `bloxdWorldPosition()`. O trecho só varia alpha por altura de mundo — pseudo efeito, não baixio por costa/fundo. Ajuste `packWaterReferenceY` à sua altura de mundo.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // mais fino em baixa altura, mais perto do alpha base em cima; confira a direção no jogo
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

## Turbidez submarina por dentro

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

## Pacote só-líquidos (terreno intacto)

```wgsl
// não escreva nenhum hook terrain_*. Então:
//  - variantes terrain = sem hooks = padrões do motor
//  - variantes liquid  = só agem os hooks liquid_*
```

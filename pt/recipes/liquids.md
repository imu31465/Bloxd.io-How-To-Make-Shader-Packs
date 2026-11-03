# Receitas de líquidos

> API alvo: 5 · Build alvo: `ab90qa` (2026-11-03, produção) · Estado: Verified (portado para a API atual — reverificação no dispositivo recomendada)
## Superfície ondulada (cintilação de cor)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdRenderOffset().x);
    let worldZ = s.position.z + f32(bloxdRenderOffset().z);
    let ripple = sin(bloxdSeconds() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid sempre tem BLOXD_ALPHA — guarda mantida por hábito
    #endif
    return out;
}
```

## Transparência pseudo por profundidade baseada na altura (não é um teste real de baixio)

> A profundidade real da água precisa do `bloxdOpaqueBehind()` exclusivo de líquidos, que mede a espessura até a face opaca atrás (a receita completa: [Fazendo a água parecer natural](../guides/water.md)). O que segue é um estilizado pseudo mais simples sem ele: `s.position.y` é uma coordenada local, então usá-la crua desloca o efeito conforme a origem do chunk muda. Converta com `bloxdWorldPosition()` para a altura de mundo. O trecho só varia o alpha pela altura de mundo — um pseudo efeito, não um baixio que leve em conta costa/fundo. Ajuste `packWaterReferenceY` à sua altura de mundo.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdRenderOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // mais fino em altitude baixa, mais perto do alpha base no alto; confira a direção no jogo
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
//  - variantes terrain = sem hooks = padrões do motor para o terreno
//  - variantes liquid  = só agem os hooks liquid_*
```

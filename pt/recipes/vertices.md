# Receitas de vértices (só allow)

> API alvo: 5 · Build alvo: `ab90qa` (2026-11-03, produção) · Estado: Verified (portado para a API atual — reverificação no dispositivo recomendada)
> Envolva tudo em `#ifndef BLOXD_STRICT`.
> Para as condições exatas (a lista de títulos allow; Custom Games sendo estrito) veja [Política de shader packs por jogo](../internals/policy.md)

## Grama balançando ao vento (move só as pontas)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdSeconds() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // só faces verticais
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

## Ondas na superfície do líquido (só faces de cima)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdSeconds() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdSeconds() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

## Terreno que respira

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdSeconds() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // leve expansão/contração ao longo das normais
    return out;
}
#endif
```

## Terreno ondulante (ondas seno gigantes)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdSeconds() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdSeconds() * 0.7) * 0.3;
    return out;
}
#endif
```

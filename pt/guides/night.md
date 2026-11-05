# Projetando looks noturnos

> API alvo: 5 · Build alvo: `bny9u` (2026-11-05, produção) · Estado: Verified (portado para a API atual — reverificação em jogo recomendada)

Escurecer só sombras deixa a cor terminada (`engineColour`) brilhante sem sol, e o salto face/sombra fica antinatural. Atenue toda a cor terminada.

O exemplo trata `bloxdSunDirection()` zero como noite e sol direcional como dia, atenuando as cores terminadas do terreno em horas escuras. Onde `blockLight` e `heldLight` são fortes, a atenuação enfraquece para preservar lamparinas próximas como tochas. `0.52` é valor de ajuste — baixe para noites mais escuras.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let nightDim = mix(0.52, 1.0, sunPresent);
    var scale = nightDim;
    if (bloxdLit()) {
        let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let heldAmt = max(l.heldLight.r, max(l.heldLight.g, l.heldLight.b));
        let localLight = clamp(max(blockAmt, heldAmt), 0.0, 1.0);
        let protectLocalLight = smoothstep(0.03, 0.35, localLight);
        scale = mix(nightDim, 1.0, protectLocalLight);
}
    // atenua a cor terminada; soma a emissão do material com névoa por padrão
    out.colour = l.engineColour * scale + s.emission * (1.0 - l.fogAlpha);
    return out;
}
```

**Limites desta correção:** se `bloxdSunDirection()` se comporta como "direção unitária com sol, zero sem ele", dia/noite se distinguem mas o ocaso não se estima suavemente. E como atenua a cor terminada, enfraquece juntos a luz diurna e o ambiente do motor — não é reprodução total do horário. Para aplicar o mesmo a líquidos, revise a relação de fallback dos hooks de líquido.

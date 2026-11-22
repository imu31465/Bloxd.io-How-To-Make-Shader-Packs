# Projetando looks noturnos

> API alvo: 5 · Build alvo: `bbb6l5` (2026-11-20, produção e preprod) · Estado: Verified (portado para a API atual — reverificação em jogo recomendada)

Escurecer apenas as sombras mantém brilhante a cor final produzida pelo motor (`engineColour`) mesmo quando não há sol. Com isso, o contraste entre as faces iluminadas e as áreas sombreadas fica pouco natural. Em vez de alterar apenas as sombras, reduza a intensidade da cor final como um todo.

O exemplo considera um vetor `bloxdSunDirection()` igual a zero como noite e um vetor não nulo como dia, reduzindo a cor final do terreno durante os períodos escuros. Quando `blockLight` ou `heldLight` têm valores altos, a redução é menor para preservar fontes de luz próximas, como tochas. `0.52` é um valor ajustável: diminua-o para deixar as noites mais escuras.

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

**Limitações:** se `bloxdSunDirection()` retorna um vetor unitário quando há sol e zero quando não há, este método distingue o dia da noite, mas não estima o crepúsculo de forma gradual. Além disso, como reduz a cor final, também enfraquece a iluminação diurna e a luz ambiente do motor; não reproduz integralmente as mudanças de iluminação ao longo do dia. Para aplicar o mesmo método aos líquidos, confira o comportamento de fallback dos hooks correspondentes.

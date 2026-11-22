# Projetando looks noturnos

> API alvo: 5 · Build alvo: `bbb6l5` (2026-11-20, produção e preprod) · Estado: Verified (portado para a API atual — reverificação em jogo recomendada)

Escurecer só sombras deixa a cor terminada (`engineColour`) brilhante sem sol, e o salto face/sombra fica antinatural. Atenue toda a cor terminada.

O exemplo interpreta `bloxdSunDirection() == 0` como noite e uma direção solar válida como dia. À noite, reduz a intensidade da cor final do terreno. Nas áreas com valores altos de `blockLight` e `heldLight`, a redução é menor para preservar a luz de fontes próximas, como tochas. `0.52` é valor de ajuste — baixe para noites mais escuras.

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

**Limites deste método:** `bloxdSunDirection()` fornece a direção do sol, então a direção da lua pode ser obtida invertendo-a (`-bloxdSunDirection()`). Nos mundos padrão, o sol é fixo e a lua também não se move; ela só se move em mundos com ciclo dia/noite. Se o valor indicar apenas uma direção unitária ou zero, é possível distinguir dia e noite, mas não representar o crepúsculo de forma gradual. Este exemplo reduz a cor final do terreno e, com isso, enfraquece ao mesmo tempo a luz diurna e a iluminação ambiente do motor; não reproduz toda a iluminação de cada horário. Para aplicar o mesmo aos líquidos, confira a relação de fallback dos hooks de líquido.

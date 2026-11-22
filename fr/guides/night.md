# Concevoir des looks nocturnes

> API cible : 5 · Build cible : `bbb6l5` (2026-11-20, production et preprod) · État : Verified (porté à l'API actuelle — re-vérification sur appareil recommandée)
Assombrir uniquement les ombres laisse la couleur finale produite par le moteur (`engineColour`) trop lumineuse en l'absence de soleil. Le contraste entre les faces éclairées et les zones d'ombre devient alors artificiel. Il vaut mieux atténuer la couleur finale dans son ensemble.

L'exemple considère qu'un vecteur `bloxdSunDirection()` nul correspond à la nuit et qu'un vecteur non nul correspond au jour. Il atténue alors la couleur finale du terrain pendant les heures sombres. Lorsque `blockLight` ou `heldLight` est élevé, l'atténuation est réduite afin de préserver les sources lumineuses proches, comme les torches. La valeur `0.52` est réglable : diminuez-la pour obtenir des nuits plus sombres.

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
    // atténue la couleur terminée ; ajoute l'émission du matériau à travers le brouillard par défaut
    out.colour = l.engineColour * scale + s.emission * (1.0 - l.fogAlpha);
    return out;
}
```

**Limites de cette méthode :** si `bloxdSunDirection()` renvoie un vecteur unitaire lorsqu'il y a du soleil et zéro en son absence, elle permet de distinguer le jour de la nuit, mais pas d'estimer progressivement l'aube ou le crépuscule. Comme elle atténue la couleur finale, elle réduit également la lumière du jour et l'éclairage ambiant du moteur ; elle ne reproduit donc pas toute l'évolution de la lumière au fil de la journée. Pour appliquer la même méthode aux liquides, vérifiez le comportement de repli des hooks concernés.

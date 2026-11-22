# Concevoir des looks nocturnes

> API cible : 5 · Build cible : `bbb6l5` (2026-11-20, production et preprod) · État : Verified (porté à l'API actuelle — re-vérification sur appareil recommandée)
Assombrir seulement les ombres laisse la couleur terminée du moteur (`engineColour`) brillante en l'absence de soleil, et rend l'écart faces/ombres contre-nature. Atténuez plutôt toute la couleur terminée.

L'exemple ci-dessous traite un `bloxdSunDirection()` nul comme la nuit et le soleil directionnel comme le jour, en atténuant les couleurs terminées du terrain aux heures sombres. Là où `blockLight` et `heldLight` sont forts, l'atténuation s'affaiblit pour préserver les lampes proches comme les torches. `0.52` est une valeur de réglage — baissez-la pour des nuits plus sombres.

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

**Limites de cette méthode :** `bloxdSunDirection()` fournit la direction du soleil ; celle de la lune se déduit donc en prenant son opposé (`-bloxdSunDirection()`). Dans les mondes par défaut, le soleil est fixe et la lune ne bouge pas non plus ; elle ne se déplace que dans les mondes dotés d’un cycle jour/nuit. Si la valeur ne fournit qu’une direction unitaire ou zéro, elle permet de distinguer le jour de la nuit, mais pas de représenter progressivement l’aube ou le crépuscule. Cet exemple atténue la couleur finale du terrain : il réduit donc à la fois la lumière du jour et l’éclairage ambiant du moteur, sans reproduire tout le cycle lumineux. Pour appliquer la même méthode aux liquides, vérifiez le mécanisme de repli des hooks correspondants.

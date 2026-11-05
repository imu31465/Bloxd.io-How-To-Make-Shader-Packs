# Concevoir des looks nocturnes

> API cible : 5 · Build cible : `bny9u` (2026-11-05, production) · État : Verified (porté à l'API actuelle — re-vérification sur appareil recommandée)
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

**Limites de ce correctif :** si `bloxdSunDirection()` se comporte en « direction unitaire avec soleil, zéro sans », jour et nuit se distinguent, mais le crépuscule ne peut pas s'estimer en douceur. Et comme elle atténue la couleur terminée, elle affaiblit ensemble la lumière du jour et l'ambiant du moteur — pas une reproduction complète du cycle horaire. Pour appliquer la même chose aux liquides, revoyez la relation de repli du hook liquide.

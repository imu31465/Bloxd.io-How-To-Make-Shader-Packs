# Émission

> API cible : 5 · Build cible : `ab90qa` (2026-11-03, production) · État : Verified (porté à l'API actuelle — revérification sur appareil recommandée)
> `emission` s'ajoute après le calcul d'éclairage, mais le traitement par défaut **l'atténue avec la quantité de brouillard (`fogAlpha`). En pleine brume au loin, l'émission disparaît aussi. Pour garder de l'éclat à distance, n'ajoutez pas à emission — ajoutez directement en `out.colour += ...` dans le hook light** (la sortie par défaut est déjà brumée, donc au loin la lumière se pose par-dessus la couleur du brouillard)

## Lampes pulsantes (torches qui respirent)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let pulse = 0.5 + 0.5 * sin(bloxdSeconds() * 2.3 + l.position.x * 0.8);
        out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
}
    return out;
}
```

## Aspect de minerai lumineux (les matériaux clairs émettent)

```wgsl
// côté surface : plus le matériau est clair (blanc), plus il y a d'émission
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

## Aspect de nuée de lucioles (points de lumière dérivant au fil du temps)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // quelques « orbes de lumière » dérivant lentement ; éclat par distance inverse
    let t = bloxdSeconds() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdSeconds() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

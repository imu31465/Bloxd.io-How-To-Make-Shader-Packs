# Éclairage

> API cible : 5 · Build cible : `xkg8x` (2026-11-04, production) · État : Verified (porté à l'API actuelle — revérification sur appareil recommandée)
## Courbe en S de contraste

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

## Brume de distance (brouillard maison)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // ajoute 0..0.35 de brouillard maison de 64 à 192 blocs
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

## Nuit (virage bleu piloté par skyLight + protection des lampes)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
        let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
}
    return out;
}
```

## Grottes d'un noir profond (assombrir davantage les zones sans ciel)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        out.colour *= mix(1.0, 0.35, underground * underground);
}
    return out;
}
```

> `skyLight` arrive post-lift (section 10) : l'occlusion légère (p. ex. sous les arbres : brut 0.87 → lifté 0.97) s'assombrit à peine avec cette méthode. Cela fonctionne pour les grottes (brut 0). Pour accentuer « l'ombre des arbres », utilisez la méthode d'inversion du lift + coupe par seuil de R9.12.

## Bleu nocturne ambiant (pseudo look sans direction lunaire)

> Dans cette API, `bloxdSunDirection()` vaut zéro quand le ciel n'a pas de soleil. Ce qui suit n'est pas un clair de lune directionnel, juste un faible ambiant bleu ajouté quand le ciel est sombre. La direction de la lune elle-même est disponible via `-bloxdSunDirection()` (mondes à cycle jour/nuit uniquement — [Le soleil et la lune](../internals/sun-and-moon.md)).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let upward = clamp(l.normal.y, 0.0, 1.0);
        out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
}
    return out;
}
```

## Chaleur de couchant (teinte par hauteur du soleil)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 1 à l'horizon / 0 au zénith
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

## Remplacement total de la sortie moteur (rééclairage simple)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    if (bloxdLit()) {
        // NOTE : la construction directe de BloxdLight(...) est interdite ; réécrivez colour depuis default
        var out = bloxdDefaultLight(s, l);
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let level = clamp(sky * 0.7 + block, 0.0, 1.0);
        // écarte engineColour (le résultat d'éclairage du moteur) et utilise « couleur de base × luminosité calculée soi-même »
        var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));   // engineColour écarté : refaire le brouillard est obligatoire
        out.colour = col + s.emission * (1.0 - l.fogAlpha);   // ajoutez aussi emission vous-même (obligatoire)
        return out;
} else {
        return bloxdDefaultLight(s, l);
}
}
```

# Realismus

> Ziel-API: 5 · Ziel-Build: `v98qt8` (2026-11-08, Produktion und Preprod) · Status: Verified (auf die aktuelle API portiert — Prüfung auf dem Gerät empfohlen)

> Physik-Rezepte zum „Vanilla-Look aus Materialien neu aufbauen". Erst diese Prämissen lesen:
>
> 1. **Der Light-Hook läuft in der letzten Fragment-Stufe**. Seine zurückgegebene Farbe wird unverändert zur Endfarbe. **Fog selbst neu anwenden** (R9.10)  
> 2. **Das Engine-Standardlicht ist nur Multiplikation**. Specular / Fresnel / Warm-Kalt-Trennung / Hemisphären-Ambiente werden von null aufgebaut  
> 3. `l.engineColour` ist die fertige Farbe (bereits gefoggt). Neuaufbau aus `s.colour` (Albedo) ist der Königsweg  
> 4. Texturen verboten → alle Details müssen **prozedural** sein (Hash/Rauschen) (R9.8)

## R9.1 Warme Fackeln × kaltes Himmelslicht

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
        let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
        let voxel   = max(torch, sky);
        var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // Zwischen-Clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                    // Fog-Neuanwendung
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                 // Emission-Re-Addition
}
    return out;
}
```

## R9.2 Sonnen-Specular (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let h = normalize(viewDir + sunDir);          // Halbvektor
            let ndh = max(dot(n, h), 0.0);
            let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
            let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
            out.colour += spec * vec3f(1.0, 0.97, 0.90);
        }
}
    return out;
}
```

## R9.3 Schlick-Fresnel

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let F = pack_schlick(dot(n, viewDir), 0.02);
        out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // zarter Randglanz
}
    return out;
}
```

## R9.4 Hemisphären-Ambiente (Himmel oben / Boden-Bounce unten)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let upness = n.y * 0.5 + 0.5;
        let ground = l.ambientLightColour * 0.55;                          // unten: Bounce
        let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // oben: Himmelslicht
        let hemi = vec3f(0.25) + mix(ground, skyH, upness);
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // Zwischen-Clamp
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                           // Fog-Neuanwendung
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                        // Emission-Re-Addition
}
    return out;
}
```

## R9.5 ACES-Filmic (Narkowicz-Näherung)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = Belichtung
    return out;
}
```

## R9.6 Luftperspektive („Atmosphäre" per Distanz-Entsättigung)

> Anders als Fog (Farbtausch) macht überlagerte „Distanz-Entsättigung" Fernen deutlich realistischer.  
> Vorsicht: nur Sättigung senken — nie Luminanz anfassen.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // Abfall (~30% bei 100blk / ~75% bei 400blk)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // nur Sättigung senken (Luminanz unverändert)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

## R9.7 Wellennormalen + Sonnenglitzer („Sonnenstraße" auf Wasser)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // Höhe h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // dh/dx
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // dh/dz
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let baseN = normalize(l.normal);
        let worldPos = bloxdWorldPosition(l.position);
        let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdSeconds()), clamp(baseN.y * 2.0, 0.0, 1.0)));
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let h = normalize(viewDir + sunDir);
            let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
            out.colour += glint * vec3f(1.0);
        }
}
    return out;
}
```

## R9.8 Prozedurales Mikro-Bump (Texturverbots-Workaround)

```wgsl
fn pack_hash(p: vec3f) -> f32 {
    return fract(sin(dot(p, vec3f(12.9898, 78.233, 37.719))) * 43758.5453);
}
fn pack_bumpNormal(p: vec3f, n: vec3f, strength: f32) -> vec3f {
    let e = 0.15;
    let h0 = pack_hash(p);
    let hx = pack_hash(p + vec3f(e, 0.0, 0.0));
    let hz = pack_hash(p + vec3f(0.0, 0.0, e));
    let tangentX = normalize(cross(vec3f(0.0, 1.0, 0.0), n) + vec3f(0.0001, 0.0, 0.0));
    let tangentZ = normalize(cross(n, tangentX));
    return normalize(n + tangentX * (hx - h0) * strength + tangentZ * (hz - h0) * strength);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let local = fract(l.position - l.normal * 0.5);   // blocklokale Koordinaten
        let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let lam = clamp(dot(n, sunDir), 0.0, 1.0);
            let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
            out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
        }
}
    return out;
}
```

## R9.9 Nichtlineare Höhlenabdunklung + Lampenschutz

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let keep = 0.12 + 0.88 * blockInt;          // Lampenstellen anheben
        out.colour *= mix(keep, 1.0, sky * sky);     // nichtlineare (quadrierte) Abdunklung
}
    return out;
}
```

## R9.10 Fog neu anwenden (Pflicht beim Verwerfen von engineColour)

> Ein Floor wie `min(l.fogAlpha, 0.75)` begrenzt „nicht dichter als dies"
> (0.0 = engine-treu / 0.3–0.5 = klarere Ferne).
> Hinweis: Der Engine-Fog ist reiner Horizont-Linear-Fog (nur nahe Sichtweite); mittleren Dunst muss das Paket bauen.
> Echte Fog-Einstellungen (implementierungsverifiziert): linear fixiert / `fogStart` = Chunk-Sichtweite / `fogEnd` = +1 Chunk / bei Fog-aus auf 100–101 Chunks faktisch deaktiviert / Standardfarbe RGB(183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = s.colour * (voxel * 1.1 + vec3f(0.05));
        col = clamp(col, vec3f(0.0), vec3f(1.0));
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));  // Fog-Neuanwendung (0.15 = leichter Floor)
        col += s.emission * (1.0 - l.fogAlpha);            // Emission ebenfalls gefoggt
        out.colour = col;
}
    return out;
}
```

## R9.11 Cinema-Grade (kalte Schatten / warme Highlights / Nacht-Entsättigung)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let lum = pack_luma(out.colour);
        out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;  // Nacht nur bei Sonnenrichtung null; kein Abendrot-Gradient
        out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
}
    return out;
}
```

## R9.12 Projektionsschatten — Lift-Inversion + Schwellenwert-Schnitt (definitiv)

> **Prämissen-Recheck (Abschnitt 10)**: `l.skyLight` ist nicht der rohe Voxel-Wert (n/15), sondern der Wert nach der Engine-„Lift-Kurve"  
> `y = 1-(1-x/(3-2x))³` (dunkle Bereiche anhebende S-Kurve).
>
> | Ort | Voxel roh | geliftet (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | offener Himmel | 1.00 | 1.00 | 1.00 |  
> | unterm Baum (Radius 2) | 0.87 | **0.97** | **0.86** ← fast unversehrt |  
> | Radius 3 | 0.80 | **0.92** | 0.66 |  
> | Radius 5 | 0.67 | 0.78 | 0.29 |
>
> **Dies ist die bewiesene Wurzel von „Schatten werden mit Gamma nie tiefer"**. Die Kurve ist aber monoton und damit algebraisch exakt invertierbar:  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Nach Wiederherstellung der Rohwerte genügt Binarisierung per Schwellenschnitt (`smoothstep`).  
> Die LightEngine-BFS-Seitenausbreitung ist „1 Block = -1", also wählt die Schwelle `th = 1 - r/15` direkt  
> „Verdeckung ab Radius r zählt als Schatten". Blöcke zu brechen bewegt Schatten sofort (LightEngine rechnet in Echtzeit neu).  
> Limit: Schatten basieren auf „Himmel nach oben", rotieren also nicht mit der Sonne (Abschnitt 15, „Die Wahrheit über Schatten").

```wgsl
// Engine-Lift exakt invertieren, um rohes Voxel-skyLight (n/15) wiederherzustellen
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // kein cbrt in WGSL, pow nehmen
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // Schattenradius-Regler: th = 1 - r/15 (0.87 = Radius 2+ ist Schatten)
const shSoft = 0.04;   // Kantenweichheit (0.02 = hart / 0.08 = weich)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // 1. Rohwerte wiederherstellen (überspringen gibt niemals Schatten)
        let skyRaw = sh_unlift(l.skyLight);
        // 2. Schwellenschnitt — trennt sauber Sonne=1 / Schatten=0
        let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
        // Sonnen-Lambert (Fallback auf l.directional ohne Sonne)
        let sunLen = length(bloxdSunDirection());
        let sunL = select(clamp(l.directional, 0.0, 1.0),
                          clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                          sunLen > 0.5);
        // Essenz der Projektion: direkte Sonne erreicht nur sichtbaren Himmel
        let lit = sunL * sky;
        // Schattenseite: himmelblau getönt, nicht schwarz + Mindest-Ambiente
        let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
        var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
        // Fackellicht durchdringt Schatten (blockLight auch geliftet: zusammen restaurieren)
        let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                             sh_unlift(l.blockLight.g),
                             sh_unlift(l.blockLight.b));
        let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
        col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
        // Fog neu anwenden (Anteil des verworfenen engineColour)
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));
        out.colour = clamp(col + s.emission * (1.0 - l.fogAlpha), vec3f(0.0), vec3f(1.0));   // Emission nicht vergessen (gefoggt)
}
    return out;
}
```

> Tuning-Guide: **Schattenfläche entscheidet allein `shTh`** — `0.93` = Radius 1.5+ / `0.87` = Radius 2 / `0.80` = Radius 3 / `0.67` = Radius 5.  
> Kanten­härte ist `shSoft` (0.02 = hart / 0.08 = weich). Kern­dunkelheit ist die Zwei-Punkt-Verschiebung aus `0.09` (Mindest-Ambiente) und `0.16` (Himmelsstreulicht).  
> Für breitere Abend­schatten `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` addieren (Näherung langer Abendschatten.  
> `sunDir` ist `bloxdSunDirection() / length(bloxdSunDirection())`). Für blauere Schatten das B von `vec3f(0.72, 0.82, 1.05)` erhöhen.
>

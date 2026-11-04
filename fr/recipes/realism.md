# Réalisme

> API cible : 5 · Build cible : `xkg8x` (2026-11-04, production) · État : Verified (porté à l'API actuelle — revérification sur appareil recommandée)
> Recettes physiques pour « reconstruire le look vanille depuis les matériaux ». Lisez d'abord ces prémisses :
>
> 1. **Le hook light est appelé à l'étape finale du fragment**. Sa couleur renvoyée devient la couleur finale telle quelle. **Vous devez réappliquer le brouillard vous-même** (R9.10)  
> 2. **L'éclairage par défaut du moteur n'est que multiplication**. Specular / fresnel / séparation chaud-froid / ambiant hémisphérique peuvent tous se construire de zéro  
> 3. `l.engineColour` est la couleur finie (déjà brumée). Reconstruire depuis `s.colour` (albedo) est l'approche complète  
> 4. Les textures sont interdites → tout détail doit être **procédural** (hash/bruit) (R9.8)

## R9.1 Torches chaudes × ciel froid

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
        let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
        let voxel   = max(torch, sky);
        var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // clamp intermédiaire
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                    // refaire brouillard
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                 // re-ajouter emission
}
    return out;
}
```

## R9.2 Specular solaire (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let viewDir = normalize(bloxdEyePosition() - l.position);
        let sunLen = length(bloxdSunDirection());
        if (sunLen > 0.5) {
            let sunDir = bloxdSunDirection() / sunLen;
            let h = normalize(viewDir + sunDir);          // vecteur médian
            let ndh = max(dot(n, h), 0.0);
            let lambert = clamp(dot(n, sunDir), 0.0, 1.0);
            let spec = pow(ndh, 90.0) * 0.38 * lambert * (0.25 + 0.75 * l.skyLight);
            out.colour += spec * vec3f(1.0, 0.97, 0.90);
        }
}
    return out;
}
```

## R9.3 Fresnel de Schlick

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
        out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // faible éclat de bord
}
    return out;
}
```

## R9.4 Ambiant hémisphérique (ciel dessus / rebond du sol dessous)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let n = normalize(l.normal);
        let upness = n.y * 0.5 + 0.5;
        let ground = l.ambientLightColour * 0.55;                          // dessous : rebond
        let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // dessus : lumière du ciel
        let hemi = vec3f(0.25) + mix(ground, skyH, upness);
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // clamp intermédiaire
        col = mix(l.fogColour, col, (1.0 - l.fogAlpha));                           // refaire brouillard
        out.colour = col + s.emission * (1.0 - l.fogAlpha);                        // re-ajouter emission
}
    return out;
}
```

## R9.5 ACES filmique (approximation de Narkowicz)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1.2 = exposition
    return out;
}
```

## R9.6 Perspective aérienne (« atmosphère » par désaturation à distance)

> Contrairement au brouillard (remplacement de couleur), superposer « désaturation à distance » rend les vues lointaines bien plus réalistes.  
> Prudence : ne réduisez que la saturation — ne touchez jamais à la luminance.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // chute (~30 % à 100blk / ~75 % à 400blk)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // ne réduit que la saturation (luminance inchangée)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

## R9.7 Normales de vague + scintillement solaire (« route du soleil » sur l'eau)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // hauteur h = 0.50 sin(px+1.6t) + 0.35 sin(1.35pz+1.28t) + 0.15 sin(0.7(px+pz)-1.76t)
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

## R9.8 Micro-relief procédural (contournement de l'interdit des textures)

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
        let local = fract(l.position - l.normal * 0.5);   // coords locales du bloc
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

## R9.9 Assombrissement non linéaire des grottes + protection des lampes

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let sky = clamp(l.skyLight, 0.0, 1.0);
        let underground = 1.0 - sky;
        let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
        let keep = 0.12 + 0.88 * blockInt;          // relève les foyers à lampes
        out.colour *= mix(keep, 1.0, sky * sky);     // assombrissement non linéaire (au carré)
}
    return out;
}
```

## R9.10 Réappliquer le brouillard (obligatoire en écartant engineColour)

> Poser un plancher comme `min(l.fogAlpha, 0.75)` limite « pas plus dense que ceci »
> (0.0 = fidèle au moteur / 0.3–0.5 = distance plus claire).
> Note : le brouillard du moteur est un brouillard linéaire d'horizon seul (près de la distance de rendu uniquement) ; la brume à mi-distance doit être construite côté pack.
> Réglages réels du brouillard (vérifiés sur l'implémentation) : linear fixe / `fogStart` = distance de rendu des chunks / `fogEnd` = +1 chunk / de fait désactivé à 100–101 chunks avec brouillard off / couleur par défaut RGB(183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
        var col = s.colour * (voxel * 1.1 + vec3f(0.05));
        col = clamp(col, vec3f(0.0), vec3f(1.0));
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));  // refaire brouillard (0.15 = plancher léger)
        col += s.emission * (1.0 - l.fogAlpha);            // émission aussi brumée
        out.colour = col;
}
    return out;
}
```

## R9.11 Grade cinéma (ombres froides / hautes lumières chaudes / désaturation nocturne)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        let lum = pack_luma(out.colour);
        out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
        let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
        let night = 1.0 - sunPresent;  // nuit seulement quand la direction solaire est zéro ; sans dégradé de couchant
        out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
}
    return out;
}
```

## R9.12 Ombres projetées — inversion du lift + coupe par seuil (définitif)

> **Rappel de prémisse (section 10)** : `l.skyLight` n'est pas la valeur voxel brute (n/15) mais la valeur après la « courbe de lift » du moteur  
> `y = 1-(1-x/(3-2x))³` (courbe en S qui relève les zones sombres).
>
> | Lieu | voxel brut | lifté (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | ciel ouvert | 1.00 | 1.00 | 1.00 |  
> | sous un arbre (rayon 2) | 0.87 | **0.97** | **0.86** ← presque intact |  
> | rayon 3 | 0.80 | **0.92** | 0.66 |  
> | rayon 5 | 0.67 | 0.78 | 0.29 |
>
> **C'est la cause démontrée de « les ombres ne se creusent pas, quel que soit le gamma »**. Mais la courbe est monotone, donc inversible algébriquement :  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Après restauration des valeurs brutes, il suffit de binariser par une coupe de seuil (`smoothstep`).  
> La dispersion BFS latérale de LightEngine vaut « 1 bloc = -1 » : le seuil `th = 1 - r/15` règle donc directement  
> « l'occlusion de rayon r ou plus compte comme ombre ». Casser des blocs déplace les ombres aussitôt (LightEngine recalcule en temps réel).  
> Limite : les ombres partent du « ciel vers le haut » et ne tournent donc pas avec le soleil (section 15, « La vérité sur les ombres »).

```wgsl
// Inverse exactement le lift moteur pour restaurer le skyLight voxel brut (n/15)
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // pas de cbrt en WGSL, utiliser pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // cadran de rayon d'ombre : th = 1 - r/15 (0.87 = rayon 2+ en ombre)
const shSoft = 0.04;   // douceur de bord (0.02 = dur / 0.08 = doux)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    if (bloxdLit()) {
        // 1. restaure les valeurs brutes (le sauter ne donne jamais d'ombres)
        let skyRaw = sh_unlift(l.skyLight);
        // 2. coupe par seuil — sépare proprement ensoleillé=1 / ombre=0
        let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
        // Lambert solaire (repli sur l.directional sans soleil)
        let sunLen = length(bloxdSunDirection());
        let sunL = select(clamp(l.directional, 0.0, 1.0),
                          clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                          sunLen > 0.5);
        // l'essence de la projection : le soleil direct n'atteint que là où le ciel est visible
        let lit = sunL * sky;
        // côté ombre : teinté bleu ciel, pas noir + ambiant minimum
        let shade = 0.09 + 0.16 * sky * vec3f(0.72, 0.82, 1.05);
        var col = s.colour * (shade + lit * vec3f(1.00, 0.90, 0.72) * 1.18);
        // la lumière de torche perce les ombres (blockLight aussi lifté : restaurer ensemble)
        let blockRaw = vec3f(sh_unlift(l.blockLight.r),
                             sh_unlift(l.blockLight.g),
                             sh_unlift(l.blockLight.b));
        let blockInt = max(blockRaw.r, max(blockRaw.g, blockRaw.b));
        col = max(col, s.colour * mix(blockRaw, blockInt * vec3f(1.0, 0.7, 0.4), 0.6) * 1.40);
        // réapplique le brouillard (la part d'engineColour écartée)
        col = mix(l.fogColour, col, min(l.fogAlpha, 0.85));
        out.colour = clamp(col + s.emission * (1.0 - l.fogAlpha), vec3f(0.0), vec3f(1.0));   // n'oubliez pas emission (brumée)
}
    return out;
}
```

> Guide de réglage : **la surface d'ombre tient au seul `shTh`** — `0.93` = rayon 1.5+ / `0.87` = rayon 2 / `0.80` = rayon 3 / `0.67` = rayon 5.  
> La dureté du bord, c'est `shSoft` (0.02 = dur / 0.08 = doux). L'obscurité du cœur d'ombre est le réglage à deux points de `0.09` (ambiant minimum) et `0.16` (diffusion du ciel).  
> Pour élargir les ombres au couchant, ajoutez `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (approximation des longues ombres du crépuscule.  
> `sunDir` vaut `bloxdSunDirection() / length(bloxdSunDirection())`). Pour des ombres plus bleues, montez le B de `vec3f(0.72, 0.82, 1.05)`.
>

[← Partie précédente](02-api.md)·[Retour au manuel](README.md)·[Partie suivante →](04-realism.md)

# Partie III : Recettes

- [R1. Recettes de couleur (surface)](#r1-recettes-de-couleur-surface)
- [R2. Recettes d'éclairage (light)](#r2-recettes-déclairage-light)
- [R3. Recettes d'émission](#r3-recettes-démission)
- [R4. Recettes de coordonnées (monde / bloc / vue)](#r4-recettes-de-coordonnées-monde--bloc--vue)
- [R5. Recettes de temps (animation)](#r5-recettes-de-temps-animation)
- [R6. Recettes de liquides](#r6-recettes-de-liquides)
- [R7. Recettes de sommets (allow seul)](#r7-recettes-de-sommets-allow-seul)
- [R8. Astuces math](#r8-astuces-math)
- [R9. Recettes réalistes](#r9-recettes-réalistes)

---

> **Important :** les recettes ci-dessous sont des exemples individuels, pas à concaténer de haut en bas. Coller plusieurs définitions du même nom de hook (`bloxdTerrainLight` etc.) ou du même nom de fonction auxiliaire duplique les définitions dans un module et échoue la compilation. Pour combiner des effets, fusionnez-les en une fonction par type de hook.

## R1. Recettes de couleur (surface)

### Teinte unique (le plus basique)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Booster / couper la saturation

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount : +0,3 vif / -1,0 monochrome total
```

### Température de couleur (chaud ⇄ froid)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth : +1,0 = chaud (rouge fort), -1,0 = froid (bleu fort)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### Vintage / sépia

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### Dégradé d'altitude (plaines chaudes)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 1..0 sur hauteur 0..50
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Peindre par orientation (haut = clair, murs = sombres)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // sol 1 / mur 0 / plafond -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // murs et plafonds un peu plus sombres
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Postérisation (moins de couleurs)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

## R2. Recettes d'éclairage (light)

### Courbe en S de contraste

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### Brume de distance (brouillard maison)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 0..0,35 de brouillard maison de 64 à 192 blocs
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### Nuit (virage bleu par skyLight + protection des lampes)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    out.colour = mix(out.colour, out.colour * vec3f(0.55, 0.68, 1.0), sky * 0.55);
    let blockAmt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    out.colour += vec3f(1.0, 0.72, 0.38) * blockAmt * 0.30;
    #endif
    return out;
}
```

### Grottes bien noires (assombrir où il n'y a pas de skyLight)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    out.colour *= mix(1.0, 0.35, underground * underground);
    #endif
    return out;
}
```

> `skyLight` arrive post-lift (section 10) : l'occlusion légère (sous arbres : brut 0,87 → lifté 0,97) s'assombrit à peine avec cette méthode. Efficace pour les grottes (brut 0). Pour marquer « l'ombre des arbres », utilisez inversion + seuil de R9.12.

### Bleu nocturne ambiant (pseudo look sans direction lunaire)

> Dans cette API, `bloxdSunDirection()` vaut zéro quand le ciel n'a pas de soleil. Ce qui suit n'est pas un clair de lune directionnel, juste un faible ambiant bleu quand le ciel est sombre. La direction lunaire elle-même est disponible via `-bloxdSunDirection()` (mondes à cycle jour/nuit seuls. [Partie VII](07-internals.md) R-A).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let upward = clamp(l.normal.y, 0.0, 1.0);
    out.colour += vec3f(0.025, 0.04, 0.075) * night * sky * upward;
    #endif
    return out;
}
```

### Chaleur de couchant (teinte par hauteur du soleil)

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

### Remplacement total de la sortie moteur (rééclairage simple)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    #ifdef BLOXD_LIGHTING
    // NOTE : construction directe de BloxdLight(...) interdite ; réécrire colour depuis default
    var out = bloxdDefaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // écarte engineColour (le résultat d'éclairage du moteur) et utilise « couleur de base × luminosité calculée »
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogVisibility);   // engineColour écarté : refaire brouillard obligatoire
    out.colour = col + s.emission * l.fogVisibility;   // ajoutez emission vous-même aussi (obligatoire)
    return out;
    #else
    return bloxdDefaultLight(s, l);
    #endif
}
```

## R3. Recettes d'émission

> `emission` s'ajoute après le calcul d'éclairage, mais le traitement par défaut **l'atténue avec `fogVisibility`. Au loin totalement brumeux, l'émission disparaît aussi. Pour garder de l'éclat au loin, n'ajoutez pas à emission — ajoutez directement en `out.colour += ...` dans le hook light** (engineColour porte déjà le brouillard : au loin, la lumière tombe sur la couleur de brouillard)

### Lampes pulsantes (torches qui respirent)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let glow = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let pulse = 0.5 + 0.5 * sin(bloxdTime() * 2.3 + l.position.x * 0.8);
    out.colour += vec3f(1.0, 0.62, 0.25) * glow * 0.25 * (0.6 + 0.4 * pulse);
    #endif
    return out;
}
```

### Allure de minerai lumineux (les matériaux clairs émettent)

```wgsl
// côté surface : plus le matériau est clair (blanc), plus d'émission
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### Nuée de lucioles (points de lumière à la dérive)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // quelques « orbes de lumière » à la dérive lente ; éclat par inverse de distance
    let t = bloxdTime() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdTime() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. Recettes de coordonnées (monde / bloc / vue)

### Coordonnées monde

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### Coordonnées de bloc

```wgsl
let worldBlock = bloxdFaceBlock(l.position, l.normal);
```

### Damier (par bloc)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 ou 1
out.colour *= mix(0.96, 1.04, checker);
```

### Pseudo-aléatoire par bloc (hachage)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// usages : variation d'herbe, mouchetage de pierre, etc.
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### Vecteur de vue et rim light

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### Angle de vue (fresnel maison — pour liquides)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 de face / 0 rasant
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. Recettes de temps (animation)

> `bloxdTime()` boucle toutes les 3600 secondes (1 heure). C'est le temps écoulé du shader, sans garantie de synchro avec le jour/nuit du jeu. Pour l'animation périodique visuelle OK, mais préférez `bloxdSunDirection()` et les entrées d'éclairage pour détecter la vraie nuit.

### Cycle jour-nuit (1 jour par heure)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdTime() * 6.2831853 / 3600.0);   // 0..1 période d'une heure ; pas forcément synchro avec le jour/nuit du jeu
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### Oscillation (sinus superposés)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### Bandes d'aurore / franges fluorescentes

```wgsl
// mélange 3 couleurs par position XZ et temps
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

## R6. Recettes de liquides

### Surface ridée (scintillement de couleur)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdOriginOffset().x);
    let worldZ = s.position.z + f32(bloxdOriginOffset().z);
    let ripple = sin(bloxdTime() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // liquid a toujours BLOXD_ALPHA — garde par habitude
    #endif
    return out;
}
```

### Transparence pseudo par hauteur (pas un vrai test de bas-fond)

> En v1, profondeur de scène et position du fond inconsultables : la vraie profondeur ne se calculait pas avec cette seule API. En v2, `bloxdOpaqueBehind()` mesure l'épaisseur jusqu'à la face opaque derrière, en liquides seuls ([partie VIII](08-apiv2.md) R-E). Ci-dessous l'ancien pseudo-effet sans cela : `s.position.y` est une coordonnée locale et l'utiliser brute déplace l'effet avec l'origine du chunk. Il ne fait varier alpha que par hauteur monde — pseudo effet, pas une vraie représentation de bas-fond suivant le littoral ou le fond. Ajustez `packWaterReferenceY` à votre hauteur monde.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // plus fin en bas, plus proche de l'alpha de base en haut ; vérifiez le sens en jeu
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### Trouble sous-marin vu de l'intérieur

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### Pack liquides seuls (terrain intact)

```wgsl
// n'écrivez aucun hook terrain_*. Alors :
//  - variantes terrain = sans hooks = défauts moteur
//  - variantes liquid  = seuls les hooks liquid_* agissent
```

## R7. Recettes de sommets (allow seul)

> Tout entourer de `#ifndef BLOXD_STRICT`.
> Pour les conditions exactes (liste des titres allow ; Custom Games est strict) voir §30 : [§30 Modes d'application par jeu](07-internals.md#30-modes-dapplication-par-jeu-shaderpackpolicy)

### Herbe au vent (ne bouger que les pointes)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdTime() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // faces verticales seules
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### Vagues en liquide (faces du dessus seules)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let topness = clamp(v.normal.y * 2.0, 0.0, 1.0);
    if (topness > 0.001) {
        let h = sin(v.position.x * 0.9 + bloxdTime() * 1.6) * 0.5
              + sin(v.position.z * 1.2 + bloxdTime() * 1.3) * 0.3;
        out.position.y += h * 0.14 * topness;
    }
    return out;
}
#endif
```

### Terrain pulsant

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdTime() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // légère expansion/contraction le long des normales
    return out;
}
#endif
```

### Terrain ondulant (vagues sinus géantes)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(v.position.x * 0.15 + bloxdTime() * 0.9) * 0.4
                    + sin(v.position.z * 0.11 - bloxdTime() * 0.7) * 0.3;
    return out;
}
#endif
```

## R8. Astuces math

```wgsl
// quantification douce de 0..1 (n paliers)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// seuil 2 niveaux (ombre toon)
let shadow = smoothstep(0.35, 0.37, level);   // ±0,02 autour du seuil crée des marches

// toon 3 niveaux
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// luma (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// pulsation douce
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// onde triangulaire (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// secondes → « phase lente » (pour effets ignorant le cycle de 3600 s)
let phase = t * 0.15;
```

## R9. Recettes réalistes

> Recettes physiques pour « reconstruire le look vanille depuis les matériaux ». Lisez ces prémisses d'abord :
>
> 1. **Le hook light est appelé à l'étape finale du fragment**. Sa couleur rendue devient la couleur finale telle quelle. **Vous devez réappliquer le brouillard** (R9.10)  
> 2. **L'éclairage par défaut du moteur n'est que multiplication**. Specular / fresnel / séparation chaud-froid / ambiant hémisphérique se construisent de zéro  
> 3. `l.engineColour` est la couleur terminée (déjà brumée). Reconstruire depuis `s.colour` (albedo) est l'approche complète  
> 4. Textures interdites → tout détail doit être **procédural** (hash/bruit) (R9.8)

### R9.1 Torches chaudes × ciel froid

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // clamp intermédiaire
    col = mix(l.fogColour, col, l.fogVisibility);                    // refaire brouillard
    out.colour = col + s.emission * l.fogVisibility;                 // re-ajouter emission
    #endif
    return out;
}
```

### R9.2 Specular solaire (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
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
    #endif
    return out;
}
```

### R9.3 Fresnel de Schlick

```wgsl
fn pack_schlick(cosT: f32, f0: f32) -> f32 {
    return f0 + (1.0 - f0) * pow(1.0 - clamp(cosT, 0.0, 1.0), 5.0);
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let F = pack_schlick(dot(n, viewDir), 0.02);
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // fin éclat de bord
    #endif
    return out;
}
```

### R9.4 Ambiant hémisphérique (ciel dessus / rebond du sol dessous)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // dessous : rebond
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // dessus : lumière du ciel
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // clamp intermédiaire
    col = mix(l.fogColour, col, l.fogVisibility);                           // refaire brouillard
    out.colour = col + s.emission * l.fogVisibility;                        // re-ajouter emission
    #endif
    return out;
}
```

### R9.5 ACES filmique (approximation de Narkowicz)

```wgsl
fn pack_aces(x: vec3f) -> vec3f {
    return clamp((x * (vec3f(2.51) * x + vec3f(0.03))) /
                 (x * (vec3f(2.43) * x + vec3f(0.59)) + vec3f(0.14)),
                 vec3f(0.0), vec3f(1.0));
}
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    out.colour = pack_aces(out.colour * 1.2);   // 1,2 = exposition
    return out;
}
```

### R9.6 Perspective aérienne (« atmosphère » par désaturation à distance)

> Contrairement au brouillard (remplacement de couleur), superposer « désaturation à distance » rend les lointains bien plus réalistes.  
> Prudence : ne baissez que la saturation — jamais la luminance.

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let aerial = 1.0 - exp(-dist * 0.0035);        // chute (~30 % à 100blk / ~75 % à 400blk)
    let luma = dot(out.colour, vec3f(0.2126, 0.7152, 0.0722));
    let hazy = mix(vec3f(luma), out.colour, 0.5);  // ne baisse que la saturation (luminance intacte)
    out.colour = mix(out.colour, hazy, aerial * 0.16);
    return out;
}
```

### R9.7 Normales de vague + scintillement solaire (« route du soleil » sur l'eau)

```wgsl
fn pack_waveNormal(p: vec3f, t: f32) -> vec3f {
    // hauteur h = 0,50 sin(px+1,6t) + 0,35 sin(1,35pz+1,28t) + 0,15 sin(0,7(px+pz)-1,76t)
    let c1 = cos(p.x * 1.00 + t * 1.60);
    let c2 = cos(p.z * 1.35 + t * 1.28);
    let c3 = cos((p.x + p.z) * 0.70 - t * 1.76);
    let dhdx = 0.50 * c1 + 0.15 * 0.70 * c3;      // dh/dx
    let dhdz = 0.35 * 1.35 * c2 + 0.15 * 0.70 * c3; // dh/dz
    return normalize(vec3f(-dhdx * 0.55, 1.0, -dhdz * 0.55));
}
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let baseN = normalize(l.normal);
    let worldPos = bloxdWorldPosition(l.position);
    let n = normalize(mix(baseN, pack_waveNormal(worldPos, bloxdTime()), clamp(baseN.y * 2.0, 0.0, 1.0)));
    let viewDir = normalize(bloxdEyePosition() - l.position);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let h = normalize(viewDir + sunDir);
        let glint = pow(max(dot(n, h), 0.0), 240.0) * 1.1 * (0.25 + 0.75 * l.skyLight);
        out.colour += glint * vec3f(1.0);
    }
    #endif
    return out;
}
```

### R9.8 Micro-relief procédural (astuce contre l'interdit textures)

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
    #ifdef BLOXD_LIGHTING
    let local = fract(l.position - l.normal * 0.5);   // coords locales du bloc
    let n = pack_bumpNormal(local * 16.0, normalize(l.normal), 0.35);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lam = clamp(dot(n, sunDir), 0.0, 1.0);
        let lamFlat = clamp(dot(normalize(l.normal), sunDir), 0.0, 1.0);
        out.colour *= mix(1.0, 0.85 + 0.15 * (lam / max(lamFlat, 0.001)), 0.5);
    }
    #endif
    return out;
}
```

### R9.9 Assombrissement non linéaire des grottes + protection des lampes

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let keep = 0.12 + 0.88 * blockInt;          // relève les foyers à lampes
    out.colour *= mix(keep, 1.0, sky * sky);     // assombrissement non linéaire (au carré)
    #endif
    return out;
}
```

### R9.10 Réappliquer le brouillard (obligatoire en écartant engineColour)

> Un plancher comme `max(l.fogVisibility, 0.25)` limite « pas plus dense que ceci »  
> (0,0 = fidèle au moteur / 0,3–0,5 = lointain plus clair).  
> Note : le brouillard moteur est linéaire d'horizon seul (près de la distance de dessin) ; la brume moyenne doit être construite côté pack.
> Réglages réels du brouillard (vérifiés en implémentation) : linear fixe / `fogStart` = distance de chunks / `fogEnd` = +1 chunk / de fait désactivé à 100–101 chunks avec brouillard off / couleur par défaut RGB(183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));  // refaire brouillard (0,15 = plancher léger)
    col += s.emission * l.fogVisibility;            // émission aussi brumée
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 Grade cinéma (ombres froides / hautes chaudes / désaturation nocturne)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;  // nuit seulement quand la direction solaire est zéro ; sans dégradé de couchant
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

### R9.12 Ombres projetées — inversion du lift + coupe par seuil (définitif)

> **Rappel de prémisse (section 10)** : `l.skyLight` n'est pas la valeur voxel brute (n/15) mais la valeur après la « courbe de lift » du moteur  
> `y = 1-(1-x/(3-2x))³` (courbe S relevant les zones sombres).
>
> | Lieu | voxel brut | lifté (= l.skyLight) | pow(·, 5.0) |  
> |---|---|---|---|  
> | ciel ouvert | 1,00 | 1,00 | 1,00 |  
> | sous arbre (rayon 2) | 0,87 | **0,97** | **0,86** ← presque intact |  
> | rayon 3 | 0,80 | **0,92** | 0,66 |  
> | rayon 5 | 0,67 | 0,78 | 0,29 |
>
> **C'est la cause démontrée de « les ombres ne se creusent pas avec gamma »**. Mais la courbe est monotone et inversible algébriquement :  
> `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Après restauration des valeurs brutes, il suffit de binariser par coupe de seuil (`smoothstep`).  
> La dispersion BFS de LightEngine vaut « 1 bloc = -1 » : le seuil `th = 1 - r/15` règle donc directement  
> « l'occlusion de rayon r ou plus compte comme ombre ». Casser des blocs déplace les ombres aussitôt (LightEngine recalcule en temps réel).  
> Limite : les ombres partent du « ciel vers le haut » et ne tournent donc pas avec le soleil (section 15, « La vérité sur les ombres »).

```wgsl
// Inverse exactement le lift moteur pour restaurer le skyLight voxel brut (n/15)
fn sh_unlift(y: f32) -> f32 {
    let t = clamp(1.0 - clamp(y, 0.0, 1.0), 0.0, 1.0);
    let c = pow(t, 1.0 / 3.0);               // pas de cbrt en WGSL, utiliser pow
    return clamp(3.0 * (1.0 - c) / (3.0 - 2.0 * c), 0.0, 1.0);
}
const shTh   = 0.87;   // cadran de rayon d'ombre : th = 1 - r/15 (0,87 = rayon 2+ en ombre)
const shSoft = 0.04;   // douceur de bord (0,02 = dur / 0,08 = doux)
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    // 1. restaure valeurs brutes (le sauter ne donne jamais d'ombres)
    let skyRaw = sh_unlift(l.skyLight);
    // 2. coupe par seuil — sépare proprement soleil=1 / ombre=0
    let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
    // Lambert solaire (repli sur l.directional sans soleil)
    let sunLen = length(bloxdSunDirection());
    let sunL = select(clamp(l.directional, 0.0, 1.0),
                      clamp(dot(normalize(l.normal), bloxdSunDirection() / sunLen), 0.0, 1.0),
                      sunLen > 0.5);
    // l'essence de la projection : le soleil direct n'atteint que le ciel visible
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
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));
    out.colour = clamp(col + s.emission * l.fogVisibility, vec3f(0.0), vec3f(1.0));   // n'oubliez pas emission (brumée)
    #endif
    return out;
}
```

> Guide de réglage : **la surface d'ombre tient au seul `shTh`** — `0,93` = rayon 1,5+ / `0,87` = rayon 2 / `0,80` = rayon 3 / `0,67` = rayon 5.  
> La dureté du bord, c'est `shSoft` (0,02 = dur / 0,08 = doux). L'obscurité du cœur, c'est le double réglage de `0,09` (ambiant minimum) et `0,16` (lumière dispersée du ciel).  
> Pour élargir les ombres au couchant, ajoutez `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` (approximation des longues ombres du soir.  
> `sunDir` vaut `bloxdSunDirection() / length(bloxdSunDirection())`). Pour des ombres plus bleues, montez le B de `vec3f(0.72, 0.82, 1.05)`.
>

[← Partie précédente](02-api.md)·[Retour au manuel](README.md)·[Partie suivante →](04-realism.md)

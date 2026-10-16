> [← Zurück zum Handbuch](../README.de.md)

# Teil III: Rezeptsammlung

- [R1. Farbrezepte (Surface)](#r1-farbrezepte-surface)
- [R2. Lichtrezepte (Light)](#r2-lichtrezepte-light)
- [R3. Emissionsrezepte](#r3-emissionsrezepte)
- [R4. Koordinatenrezepte (Welt / Block / Sicht)](#r4-koordinatenrezepte-welt--block--sicht)
- [R5. Zeitrezepte (Animation)](#r5-zeitrezepte-animation)
- [R6. Flüssigkeitsrezepte](#r6-flüssigkeitsrezepte)
- [R7. Vertex-Rezepte (nur allow)](#r7-vertex-rezepte-nur-allow)
- [R8. Mathe-Tricks](#r8-mathe-tricks)
- [R9. Realismus-Rezepte](#r9-realismus-rezepte)

---

> **Wichtig:** Die Rezepte unten sind einzelne Beispiele, nicht zum Aneinanderhängen von oben nach unten gedacht. Mehrere Definitionen desselben Hook-Namens (`bloxdTerrainLight` etc.) oder desselben Hilfsfunktionsnamens erzeugen doppelte Definitionen in einem Modul und lassen die Kompilierung scheitern. Zum Kombinieren von Effekten in jeweils eine Funktion pro Hook-Typ zusammenführen.

## R1. Farbrezepte (Surface)

### Einzelfarbton (am grundlegendsten)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = clamp(out.colour * vec3f(1.05, 1.0, 0.95), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Sättigung boosten / entsättigen

```wgsl
fn pack_saturation(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    return clamp(mix(vec3f(luma), c, 1.0 + amount), vec3f(0.0), vec3f(1.0));
}
// amount: +0.3 lebendig / -1.0 total monochrom
```

### Farbtemperatur (warm ⇄ kalt)

```wgsl
fn pack_colorTemp(c: vec3f, warmth: f32) -> vec3f {
    // warmth: +1.0 = warm (stark rot), -1.0 = kalt (stark blau)
    let warm = vec3f(1.08, 1.0, 0.90);
    let cool = vec3f(0.92, 1.0, 1.10);
    let tint = mix(cool, warm, warmth * 0.5 + 0.5);
    return clamp(c * tint, vec3f(0.0), vec3f(1.0));
}
```

### Vintage / Sepia

```wgsl
fn pack_sepia(c: vec3f, amount: f32) -> vec3f {
    let luma = dot(c, vec3f(0.299, 0.587, 0.114));
    let sepia = vec3f(luma) * vec3f(1.12, 0.98, 0.78);
    return clamp(mix(c, sepia, amount), vec3f(0.0), vec3f(1.0));
}
```

### Höhengradient (warmes Tiefland)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let low = clamp(1.0 - worldY * 0.02, 0.0, 1.0);        // 1..0 über Höhe 0..50
    out.colour = clamp(mix(out.colour, out.colour * vec3f(1.10, 0.95, 0.80), low * 0.6), vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Nach Flächenausrichtung färben (oben = hell, Wände = dunkel)

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let upness = clamp(s.normal.y, 0.0, 1.0);              // Boden 1 / Wand 0 / Decke -1
    let downness = clamp(-s.normal.y, 0.0, 1.0);
    let shade = mix(0.82, 1.02, upness) - downness * 0.12; // Wände und Decken etwas dunkler
    out.colour = clamp(out.colour * shade, vec3f(0.0), vec3f(1.0));
    return out;
}
```

### Posterisieren (weniger Farben)

```wgsl
fn pack_posterize(c: vec3f, steps: f32) -> vec3f {
    return clamp(floor(c * steps + vec3f(0.5)) / steps, vec3f(0.0), vec3f(1.0));
}
```

## R2. Lichtrezepte (Light)

### Kontrast-S-Kurve

```wgsl
fn pack_scurve(c: vec3f, strength: f32) -> vec3f {
    let c01 = clamp(c, vec3f(0.0), vec3f(1.0));
    return mix(c01, c01 * c01 * (vec3f(3.0) - 2.0 * c01), strength);
}
```

### Distanz-Dunst (eigener Fog)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    // 0..0.35 eigenen Fog von 64 bis 192 Blöcken dazugeben
    let haze = clamp((dist - 64.0) / 128.0, 0.0, 1.0) * 0.35;
    out.colour = mix(out.colour, l.fogColour, haze);
    return out;
}
```

### Nacht (skyLight-Blauverschiebung + Lampenschutz)

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

### Höhlen stockdunkel (skylight-lose Stellen weiter abdunkeln)

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

> `skyLight` kommt post-Lift an (Abschnitt 10): flache Verdeckung (unterm Baum: roh 0,87 → geliftet 0,97) dunkelt mit dieser Methode kaum. Für Höhlen (roh 0) tauglich. Um „Baumschatten" zu schärfen, Lift-Inversion + Schwellenwert aus R9.12 verwenden.

### Blaues Nacht-Ambiente (Pseudo-Look ohne Mondrichtung)

> In dieser API ist `bloxdSunDirection()` null, wenn der Himmel keine Sonne hat. Folgendes ist kein gerichtetes Mondlicht, nur schwaches blaues Ambiente bei dunklem Himmel. Die Mondrichtung selbst ist via `-bloxdSunDirection()` verfügbar (nur Welten mit Tag/Nacht-Zyklus. Teil VII R-A).

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

### Abendrot-Wärme (Farbton nach Sonnenhöhe)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let sunLen = length(bloxdSunDirection());
    if (sunLen > 0.5) {
        let sunDir = bloxdSunDirection() / sunLen;
        let lowness = clamp(1.0 - sunDir.y, 0.0, 1.0);   // 1 am Horizont / 0 im Zenit
        let sunset = lowness * lowness;
        out.colour = mix(out.colour, out.colour * vec3f(1.12, 0.88, 0.72), sunset * 0.55);
    }
    return out;
}
```

### Totaler Engine-Output-Ersatz (einfachstes Relighting)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    #ifdef BLOXD_LIGHTING
    // HINWEIS: direkte BloxdLight(...)-Konstruktion verboten; colour ab default umschreiben
    var out = bloxdDefaultLight(s, l);
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let block = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let level = clamp(sky * 0.7 + block, 0.0, 1.0);
    // engineColour (das Engine-Lichtergebnis) verwerfen und „Basisfarbe × selbst berechnete Helligkeit" einsetzen
    var col = clamp(s.colour, vec3f(0.0), vec3f(1.0)) * level;
    col = mix(l.fogColour, col, l.fogVisibility);   // engineColour verworfen: Fog-Neuanwendung Pflicht
    out.colour = col + s.emission * l.fogVisibility;   // Emission selbst dazugeben (Pflicht)
    return out;
    #else
    return bloxdDefaultLight(s, l);
    #endif
}
```

## R3. Emissionsrezepte

> `emission` wird nach der Lichtberechnung addiert, aber die Standardverarbeitung **dämpft es mit `fogVisibility`. In völlig vernebelter Ferne verschwindet Emission ebenfalls. Um Glanz in der Ferne zu behalten, nicht auf emission addieren — direkt als `out.colour += ...` im Light-Hook addieren** (engineColour ist bereits gefoggt, also landet Licht in der Ferne auf der Fog-Farbe)

### Pulsierende Lampen (atmende Fackeln)

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

### Leuchterz-Look (helle Materialien strahlen)

```wgsl
// Surface-Seite: je heller (weißer) das Material, desto mehr Emission
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let luma = dot(out.colour, vec3f(0.299, 0.587, 0.114));
    let shine = smoothstep(0.75, 0.9, luma);
    out.emission += out.colour * shine * 0.5;
    return out;
}
```

### Glühwürmchen-Schwarm (treibende Lichtpunkte)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let world = bloxdWorldPosition(l.position);
    // ein paar langsam treibende „Lichtkugeln"; Glühen per inverser Distanz
    let t = bloxdTime() * 0.15;
    let p1 = vec3f(sin(t) * 40.0, 20.0 + sin(t * 1.3) * 6.0, cos(t * 0.7) * 40.0);
    let d1 = distance(world, p1);
    let firefly = clamp(1.0 - d1 / 6.0, 0.0, 1.0);
    let flicker = 0.6 + 0.4 * sin(bloxdTime() * 9.0 + d1);
    out.colour += vec3f(0.9, 1.0, 0.4) * firefly * firefly * flicker * 0.6;
    return out;
}
```

## R4. Koordinatenrezepte (Welt / Block / Sicht)

### Weltkoordinaten

```wgsl
let worldPos = bloxdWorldPosition(s.position);
```

### Blockkoordinaten

```wgsl
let worldBlock = bloxdFaceBlock(l.position, l.normal);
```

### Schachbrett (pro Block)

```wgsl
let checker = f32((worldBlock.x + worldBlock.z) & 1);   // 0 oder 1
out.colour *= mix(0.96, 1.04, checker);
```

### Block-Pseudozufall (Hash)

```wgsl
fn pack_hash3(b: vec3i) -> f32 {
    var h = u32(b.x) * 747796405u + u32(b.y) * 28997533u + u32(b.z) * 1911520717u;
    h = h ^ (h >> 16u);
    h = h * 2246822519u;
    h = h ^ (h >> 13u);
    return f32(h & 4095u) / 4095.0;   // 0..1
}
// Nutzen: Grasfarbvariation, Steinmarmorierung etc.
out.colour *= mix(0.94, 1.06, pack_hash3(worldBlock));
```

### Sichtvektor und Rim-Light

```wgsl
let viewDir = normalize(bloxdEyePosition() - l.position);
let rim = pow(1.0 - clamp(dot(viewDir, l.normal), 0.0, 1.0), 2.2);
out.colour += vec3f(0.9, 0.95, 1.0) * rim * 0.2;
```

### Sichtwinkel (Fresnel-Hausmittel — für Flüssigkeiten)

```wgsl
let viewDir = normalize(bloxdEyePosition() - s.position);
let facing = clamp(dot(viewDir, s.normal), 0.0, 1.0);   // 1 frontal / 0 streifend
let fresnel = pow(1.0 - facing, 3.0);
```

## R5. Zeitrezepte (Animation)

> `bloxdTime()` wrappt alle 3600 Sekunden (1 Stunde). Es ist Shader-Laufzeit ohne garantierte Synchronisation mit Tag/Nacht im Spiel. Für sichtbare periodische Animation ok, aber für echte Nachterkennung `bloxdSunDirection()` und Licht-Inputs bevorzugen.

### Tag-Nacht-Zyklus (1 Tag pro Stunde)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let day = 0.5 + 0.5 * sin(bloxdTime() * 6.2831853 / 3600.0);   // 0..1 Stundenperiode; nicht unbedingt mit Tag/Nacht im Spiel synchron
    out.colour = mix(out.colour * vec3f(0.6, 0.7, 1.0), out.colour, day);
    return out;
}
```

### Wobbeln (überlagerte Sinus)

```wgsl
fn pack_wobble(x: f32, t: f32) -> f32 {
    return sin(x * 0.8 + t * 1.7) * 0.5 + sin(x * 1.9 - t * 1.1) * 0.3 + sin(x * 3.7 + t * 2.3) * 0.2;
}
```

### Wandernde Aurora-Bänder / Fluoreszenzstreifen

```wgsl
// 3 Farben über XZ-Position und Zeit mischen
fn pack_auroraColour(x: f32, t: f32) -> vec3f {
    let phase = x * 0.05 + t * 0.05;
    let w1 = 0.5 + 0.5 * sin(phase);
    let w2 = 0.5 + 0.5 * sin(phase * 1.7 + 2.1);
    let w3 = 0.5 + 0.5 * sin(phase * 0.6 + 4.2);
    return (vec3f(0.2, 0.9, 0.55) * w1 + vec3f(0.55, 0.3, 0.95) * w2 + vec3f(0.95, 0.35, 0.75) * w3) / (w1 + w2 + w3 + 0.001);
}
```

## R6. Flüssigkeitsrezepte

### Gekräuselte Oberfläche (Farbschimmer)

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldX = s.position.x + f32(bloxdOriginOffset().x);
    let worldZ = s.position.z + f32(bloxdOriginOffset().z);
    let ripple = sin(bloxdTime() * 2.1 + worldX * 1.3 + worldZ * 0.9);
    out.colour = clamp(out.colour * (1.0 + ripple * 0.06), vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;   // Liquid hat immer BLOXD_ALPHA — Guard aus Gewohnheit
    #endif
    return out;
}
```

### Höhen-Pseudo-Transparenz (kein echter Flachwassertest)

> In v1 waren Szenentiefe und Grundposition nicht abfragbar: echte Wassertiefe ließ sich mit dieser API allein nicht berechnen. In v2 misst `bloxdOpaqueBehind()` — nur in Flüssigkeiten — die Dicke bis zur opaken Fläche dahinter (Teil VIII R-E). Folgendes ist der alte Pseudo-Effekt ohne das: `s.position.y` ist eine lokale Koordinate und roh verwendet verschiebt sich der Effekt mit dem Chunk-Ursprung. Er variiert alpha nur über Welthöhe — Pseudo-Effekt, kein küsten-/grundbewusstes Flachwasser. `packWaterReferenceY` an die eigene Welthöhe anpassen.

```wgsl
const packWaterReferenceY: f32 = 0.0;
const packWaterHeightSpan: f32 = 8.0;

fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let worldY = s.position.y + f32(bloxdOriginOffset().y);
    let heightFactor = clamp((worldY - packWaterReferenceY) / packWaterHeightSpan, 0.0, 1.0);
    #ifdef BLOXD_ALPHA
    // unten dünner, oben näher am Basis-Alpha; Richtung im Spiel prüfen
    out.alpha = mix(0.45, 0.9, heightFactor) * s.alpha;
    #endif
    return out;
}
```

### Unterwassertrübung von innen

```wgsl
fn bloxdLiquidLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    let dist = distance(bloxdEyePosition(), l.position);
    let murk = clamp(dist / 40.0, 0.0, 0.5);
    out.colour = mix(out.colour, out.colour * vec3f(0.35, 0.55, 0.9) + vec3f(0.0, 0.02, 0.06), murk);
    return out;
}
```

### Nur-Flüssigkeits-Paket (Terrain unberührt)

```wgsl
// Keine terrain_*-Hooks schreiben. Dann:
//  - Terrain-Varianten = ohne Hooks = Engine-Defaults
//  - Liquid-Varianten  = nur liquid_*-Hooks wirken
```

## R7. Vertex-Rezepte (nur allow)

> Alles in `#ifndef BLOXD_STRICT` einpacken.

### Gras im Wind (nur Spitzen bewegen)

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let sway = sin(bloxdTime() * 1.7 + v.position.x * 0.6 + v.position.z * 0.5);
    let sideFactor = max(0.0, 1.0 - abs(v.normal.y));   // nur vertikale Flächen
    out.position.y += sway * 0.05 * sideFactor;
    return out;
}
#endif
```

### Flüssigkeitswellen (nur Oberseiten)

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

### Pulsierendes Terrain

```wgsl
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    let pulse = sin(bloxdTime() * 0.8 + v.position.x * 0.2 + v.position.z * 0.2);
    out.position += v.normal * pulse * 0.03;   // leichtes Aufblähen/Schrumpfen entlang Normalen
    return out;
}
#endif
```

### Wogendes Terrain (riesige Sinuswellen)

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

## R8. Mathe-Tricks

```wgsl
// weiche Quantisierung von 0..1 (n Stufen)
fn pack_bands(x: f32, n: f32) -> f32 { return floor(x * n) / n; }

// 2-Stufen-Schwelle (Toon-Schatten)
let shadow = smoothstep(0.35, 0.37, level);   // ±0.02 um die Schwelle baut Stufen

// 3-Stufen-Toon
let b1 = smoothstep(0.20, 0.24, level);
let b2 = smoothstep(0.55, 0.59, level);
let toon = 0.45 + 0.05 * b1 + 0.5 * b2;

// Luma (BT.601)
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.299, 0.587, 0.114)); }

// weicher Puls
let glow = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);

// Dreieckswelle (0..1..0)
fn pack_triangle(x: f32) -> f32 { return abs(fract(x) * 2.0 - 1.0); }

// Sekunden → „langsame Phase" (für Effekte, die den 3600-s-Umlauf ignorieren)
let phase = t * 0.15;
```

## R9. Realismus-Rezepte

> Physik-Rezepte zum „Vanilla-Look aus Materialien neu aufbauen". Erst diese Prämissen lesen:
>
> 1. **Der Light-Hook läuft in der letzten Fragment-Stufe**. Seine zurückgegebene Farbe wird unverändert zur Endfarbe. **Fog selbst neu anwenden** (R9.10)  
> 2. **Das Engine-Standardlicht ist nur Multiplikation**. Specular / Fresnel / Warm-Kalt-Trennung / Hemisphären-Ambiente werden von null aufgebaut  
> 3. `l.engineColour` ist die fertige Farbe (bereits gefoggt). Neuaufbau aus `s.colour` (Albedo) ist der Königsweg  
> 4. Texturen verboten → alle Details müssen **prozedural** sein (Hash/Rauschen) (R9.8)

### R9.1 Warme Fackeln × kaltes Himmelslicht

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let torch   = mix(l.blockLight, blockInt * vec3f(1.00, 0.72, 0.42), 0.55);
    let sky     = mix(l.ambientLightColour, l.skyLightColour, l.skyLight) * vec3f(0.90, 0.95, 1.08);
    let voxel   = max(torch, sky);
    var col = clamp(s.colour * voxel, vec3f(0.0), vec3f(1.0));   // Zwischen-Clamp
    col = mix(l.fogColour, col, l.fogVisibility);                    // Fog-Neuanwendung
    out.colour = col + s.emission * l.fogVisibility;                 // Emission-Re-Addition
    #endif
    return out;
}
```

### R9.2 Sonnen-Specular (Blinn-Phong)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
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
    #endif
    return out;
}
```

### R9.3 Schlick-Fresnel

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
    out.colour += F * 0.15 * l.skyLightColour * l.skyLight;   // zarter Randglanz
    #endif
    return out;
}
```

### R9.4 Hemisphären-Ambiente (Himmel oben / Boden-Bounce unten)

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let n = normalize(l.normal);
    let upness = n.y * 0.5 + 0.5;
    let ground = l.ambientLightColour * 0.55;                          // unten: Bounce
    let skyH   = l.ambientLightColour * 0.30 + l.skyLightColour * 0.45 * l.skyLight; // oben: Himmelslicht
    let hemi = vec3f(0.25) + mix(ground, skyH, upness);
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = clamp(s.colour * voxel * hemi, vec3f(0.0), vec3f(1.0));   // Zwischen-Clamp
    col = mix(l.fogColour, col, l.fogVisibility);                           // Fog-Neuanwendung
    out.colour = col + s.emission * l.fogVisibility;                        // Emission-Re-Addition
    #endif
    return out;
}
```

### R9.5 ACES-Filmic (Narkowicz-Näherung)

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

### R9.6 Luftperspektive („Atmosphäre" per Distanz-Entsättigung)

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

### R9.7 Wellennormalen + Sonnenglitzer („Sonnenstraße" auf Wasser)

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

### R9.8 Prozedurales Mikro-Bump (Texturverbots-Workaround)

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
    let local = fract(l.position - l.normal * 0.5);   // blocklokale Koordinaten
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

### R9.9 Nichtlineare Höhlenabdunklung + Lampenschutz

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let sky = clamp(l.skyLight, 0.0, 1.0);
    let underground = 1.0 - sky;
    let blockInt = max(l.blockLight.r, max(l.blockLight.g, l.blockLight.b));
    let keep = 0.12 + 0.88 * blockInt;          // Lampenstellen anheben
    out.colour *= mix(keep, 1.0, sky * sky);     // nichtlineare (quadrierte) Abdunklung
    #endif
    return out;
}
```

### R9.10 Fog neu anwenden (Pflicht beim Verwerfen von engineColour)

> Ein Floor wie `max(l.fogVisibility, 0.25)` begrenzt „nicht dichter als dies"
> (0.0 = engine-treu / 0.3–0.5 = klarere Ferne).
> Hinweis: Der Engine-Fog ist reiner Horizont-Linear-Fog (nur nahe Sichtweite); mittleren Dunst muss das Paket bauen.
> Echte Fog-Einstellungen (implementierungsverifiziert): linear fixiert / `fogStart` = Chunk-Sichtweite / `fogEnd` = +1 Chunk / bei Fog-aus auf 100–101 Chunks faktisch deaktiviert / Standardfarbe RGB(183, 191, 195).

```wgsl
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let voxel = mix(l.ambientLightColour, l.skyLightColour, l.skyLight);
    var col = s.colour * (voxel * 1.1 + vec3f(0.05));
    col = clamp(col, vec3f(0.0), vec3f(1.0));
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));  // Fog-Neuanwendung (0.15 = leichter Floor)
    col += s.emission * l.fogVisibility;            // Emission ebenfalls gefoggt
    out.colour = col;
    #endif
    return out;
}
```

### R9.11 Cinema-Grade (kalte Schatten / warme Highlights / Nacht-Entsättigung)

```wgsl
fn pack_luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(s, l);
    #ifdef BLOXD_LIGHTING
    let lum = pack_luma(out.colour);
    out.colour *= mix(vec3f(0.93, 1.00, 1.06), vec3f(1.06, 1.00, 0.93), lum);
    let sunPresent = smoothstep(0.0, 0.5, length(bloxdSunDirection()));
    let night = 1.0 - sunPresent;  // Nacht nur bei Sonnenrichtung null; kein Abendrot-Gradient
    out.colour = mix(out.colour, vec3f(pack_luma(out.colour)), night * 0.28);
    #endif
    return out;
}
```

### R9.12 Projektionsschatten — Lift-Inversion + Schwellenwert-Schnitt (definitiv)

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
    #ifdef BLOXD_LIGHTING
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
    col = mix(l.fogColour, col, max(l.fogVisibility, 0.15));
    out.colour = clamp(col + s.emission * l.fogVisibility, vec3f(0.0), vec3f(1.0));   // Emission nicht vergessen (gefoggt)
    #endif
    return out;
}
```

> Tuning-Guide: **Schattenfläche entscheidet allein `shTh`** — `0.93` = Radius 1.5+ / `0.87` = Radius 2 / `0.80` = Radius 3 / `0.67` = Radius 5.  
> Kanten­härte ist `shSoft` (0.02 = hart / 0.08 = weich). Kern­dunkelheit ist die Zwei-Punkt-Verschiebung aus `0.09` (Mindest-Ambiente) und `0.16` (Himmelsstreulicht).  
> Für breitere Abend­schatten `thEff = shTh + 0.10 * (1.0 - clamp(sunDir.y, 0.0, 1.0))` addieren (Näherung langer Abendschatten.  
> `sunDir` ist `bloxdSunDirection() / length(bloxdSunDirection())`). Für blauere Schatten das B von `vec3f(0.72, 0.82, 1.05)` erhöhen.
>
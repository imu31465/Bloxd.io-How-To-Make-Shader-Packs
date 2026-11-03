# Rendering-Pipeline

> Ziel-API: 5 · Ziel-Build: `ab90qa` (2026-11-03, Produktion) · Status: Analyzed (Analyse des Produktions-Bundles auf JavaScript-Ebene)

- **Surface-Hooks laufen „vor" alphaTest**: `out.alpha` speist den Verwerfungstest direkt. Cutout-Materialien (Gras, Blätter) erlauben Dissolve-Dither-Effekte (Rezept R-C). In Flüssigkeiten (Blending) ist `out.alpha` die echte Transparenz (Rezept R-D). Kein Effekt auf normalem opakem Terrain — nicht verwechseln
- **`l.ambient`-Inhalt**: `material.ambient × sceneAmbient`, pro Material verschieden. Die Szenenseite hängt an der Grafik-Einstellung „Ambient Lighting Intensity" (Standard 0.5) — nie Fixes einprogrammieren
- **Die Richtlichter der Szene sind ein 2-Lampen-Aufbau**: Die Lambert-Summe aus Hauptlicht (Richtung aus der Sonnenposition der Sky-Einstellung, Intensität 1.0) und Fülllicht (Richtung `[-0.5, -1, -1]`, Intensität 0.35) erreicht `l.directional`. Das Fülllicht zeigt nach unten, trägt also nichts zu Oberseiten bei und fängt nach unten weisende Flächen ein (Höhlendecken usw.). Terrain berücksichtigt nur in `_initScene` hinzugefügte Lichter; nach dem Start zur Szene hinzugefügte Lichter werden von Terrain und Blockmodellen ignoriert (eine offizielle Warnmeldung sagt das)
- **`bloxdSeconds()` ist wirklich `performance.now()`**: die Browser-Uptime, auf 1 Stunde gewrappt. Ohne Bezug zu Spiel-Tag/Nacht und Welt-Laufzeit. Für uhr-synchrone Animation die Uhrzeit aus dem `bloxdSunDirection()`-Azimut in Tag/Nacht-Zyklus-Welten schätzen
- **Header-Funktionen lesen ein Uniform**: Die Engine platziert das 64-Byte-Uniform `bloxdPackInputs` auf `@group(3) @binding(0)` (5 Slots — seconds / lit / renderOffset / sunDirection / eyePosition, Little-Endian), und `bloxdSeconds()` / `bloxdLit()` / `bloxdRenderOffset()` / `bloxdSunDirection()` / `bloxdEyePosition()` entsprechen dem Lesen dieser Slots ([Pack-Format: Uniform pro Frame](../api/pack-format.md#per-frame-uniform-bloxdpackinputs)). Pakete können dieses Uniform nicht schreiben, und da Paket- und Engine-WGSL zu einem Modul verschmelzen, ist auch das eigene Deklarieren derselben group/binding unmöglich. `@group(3) @binding(1)` trägt die Szenentiefe-Textur der Flüssigkeitsprogramme, und `@binding(2)` den `bloxdSpTextureLayers`-Storage-Buffer
- **Vertex-Daten baut der Mesher (Web Worker)**: Block-Terrain ist mit 28 Byte pro Vertex verschachtelt (32 Byte mit Atlas) — Position = float32×3 / Normale = vorzeichenbehaftete 8-Bit-Ganzzahl×4 / Farbe = 8-Bit-normalisierte Ganzzahl×4 (die Substanz von `s.colour` — Tint × AO ist schon im Mesher in 8 Bit eingebacken, ein Auftrennen oder Wiederherstellen im Paket ist prinzipiell unmöglich) / UV = float32×2 / atlasIndex = float32. Nur die Lichtlevel liegen in einem separaten 4-Byte-Vertex-Buffer (Messwerte: [Engine-Daten-Ledger](engine-data.md)). Vertices werden per Chunk-Instancing gezeichnet
- Feine Schachbrettmuster an Chunk-Rändern beim Laden sind das Chunk-Fading per Screen-Space-Bayer-4×4-Dither der Engine, keine Paket-Bugs (abschaltbar über die Grafik-Einstellung `chunkFadeIn`)
- **`mod` ist ein reserviertes Wort**: abgelehnt mit `pack.wgsl:3 'mod' is a reserved word in WGSL.` Reste mit `%`-Operator schreiben

## R-C. Bayer-Dither-Dissolve — out.alpha steuert discard

Reproduziert die **gleiche Bayer-4×4-Tabelle**, die die Engine in Chunk-Fades nutzt, und löst Cutouts von unteren Blöcken auf. discard feuert in alphaTest-Materialien (Gras, Blätter); in Flüssigkeiten ist es Misch-Transparenz.

```wgsl
fn sp_bayer4(pos: vec2f) -> f32 {
    // mod ist reserviert: %-Operator verwenden
    let p = floor(vec2f(pos.x % 4.0, pos.y % 4.0));
    if (p.y < 0.5) {
        if (p.x < 0.5) { return 1.0 / 16.0; }
        else if (p.x < 1.5) { return 9.0 / 16.0; }
        else if (p.x < 2.5) { return 3.0 / 16.0; }
        else { return 11.0 / 16.0; }
    } else if (p.y < 1.5) {
        if (p.x < 0.5) { return 13.0 / 16.0; }
        else if (p.x < 1.5) { return 5.0 / 16.0; }
        else if (p.x < 2.5) { return 15.0 / 16.0; }
        else { return 7.0 / 16.0; }
    } else if (p.y < 2.5) {
        if (p.x < 0.5) { return 4.0 / 16.0; }
        else if (p.x < 1.5) { return 12.0 / 16.0; }
        else if (p.x < 2.5) { return 2.0 / 16.0; }
        else { return 10.0 / 16.0; }
    } else {
        if (p.x < 0.5) { return 16.0 / 16.0; }
        else if (p.x < 1.5) { return 8.0 / 16.0; }
        else if (p.x < 2.5) { return 14.0 / 16.0; }
        else { return 6.0 / 16.0; }
    }
}

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    // löst von unteren Blöcken auf; höheres dissolve bleibt
    let dissolve = smoothstep(-8.0, 24.0, s.position.y + vec3f(bloxdRenderOffset()).y);
    let thresh   = sp_bayer4(s.position.xz);
    out.alpha    = select(0.0, out.alpha, dissolve >= thresh);
    #endif
    return out;
}
```

## R-D. Wasser-Nahkamera-Fade — Flüssigkeits-Alpha hält Sicht frei

Flüssigkeits-Hook-`out.alpha` speist das Blending direkt. Blendet nur die Fläche unter der Kamera aus, um Tauch-/Überwasser-Kamera-Sicht zu sichern.

```wgsl
fn bloxdLiquidSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    #ifdef BLOXD_ALPHA
    let d = distance(s.position, bloxdEyePosition());
    out.alpha *= smoothstep(0.0, 3.0, d);   // 0–3 Blöcke von total transparent bis normal
    #endif
    return out;
}
```

[← Vorheriger Teil](07-internals.md)·[Zurück zum Handbuch](README.md)

# Teil VIII: Migrationsleitfaden für API Version 2

Ziel-Build: `6qxffk.main.5912a15f.js` (Produktions-Deployment mit Stand 2026-10-16). Teile I bis VII dieses Leitfadens sind bereits auf v2-Standard umgeschrieben; dieser Teil VIII fasst die Migrationspunkte von v1 und die v2-Neuerungen zusammen. Die Code-Beispiele der Neuerungen haben die 8/8-Variantenprüfung des v2-Compilers und die Browser-WGSL-Compiler-Prüfung (Tint) (§38) bestanden, und die v2-Konvertierung bestehender Rezepte ist rein mechanischer Bezeichnerersatz: vor Verteilung unbedingt per In-Game-Kompilierung prüfen.

## 31. Das Schicksal von v1-Paketen (erst das Fazit)

Das Spiel verlangt, dass die `apiVersion` des Manifests **strikt 2** ist. V1-Pakete werden beim Laden mit `This pack is for shader pack API version 1. Bloxd supports version 2.` (i18n-Key `shaderPack:loadWrongApiVersion`) abgelehnt. Es gibt **keinen parallelen v1/v2-Support**. Außerdem prüft die Engine das `validation.headerVersion` gespeicherter Pakete (Hash des gesamten Headers) erneut: Der Mechanismus, der gespeicherte Pakete bei Engine-Updates automatisch „recheck-pflichtig" macht, ist derselbe wie in v1.

## 32. Komplettumbenennung der Bezeichner (Zuordnungstabelle)

In v2 wurde die Underscore-Benennung zu CamelCase vereinheitlicht. **Alte Namen sind durchweg unbrauchbar**.

| v1 | v2 |
|---|---|
| `bloxd_terrain_vertex` | `bloxdTerrainVertex` |
| `bloxd_terrain_surface` | `bloxdTerrainSurface` |
| `bloxd_terrain_light` | `bloxdTerrainLight` |
| `bloxd_liquid_vertex` | `bloxdLiquidVertex` |
| `bloxd_liquid_surface` | `bloxdLiquidSurface` |
| `bloxd_liquid_light` | `bloxdLiquidLight` |
| `bloxd_defaultVertex` | `bloxdDefaultVertex` |
| `bloxd_defaultSurface` | `bloxdDefaultSurface` |
| `bloxd_defaultLight` | `bloxdDefaultLight` |
| `bloxd_VertexIn` | `BloxdVertexIn` |
| `bloxd_Vertex` | `BloxdVertex` |
| `bloxd_SurfaceIn` | `BloxdSurfaceIn` |
| `bloxd_Surface` | `BloxdSurface` |
| `bloxd_LightIn` | `BloxdLightIn` |
| `bloxd_Light` | `BloxdLight` |
| `bloxd_packInputs` (internes Uniform) | `bloxdPackInputs` (`@group(3) @binding(0)`, 64 B) |

Die Hook-Arten (vertex / surface / light × Terrain / Flüssigkeit, 6 Stück) und das `pack.json`-Format (`apiVersion` / `name` / `author`) ändern sich nicht. Auch die Loader-Limits sind unverändert (Zip 32 MB / 1024 Einträge / 256 `.wgsl`-Dateien / 256 KB gesamt / Manifest 64 KB).

## 33. Wohin gelöschte Felder wandern

In v1 waren `time` / `eyePosition` / `sunDirection` / `originOffset` Struct-Felder. In v2 sind **diese Felder gelöscht und durch Header-Funktionen ersetzt**, die das Engine-Uniform (`bloxdPackInputs`) lesen. Da die Funktionen das Uniform direkt lesen, sind sie **auch aus Modul-Scope-Funktionen außerhalb von Hooks und aus Vertex-Hooks aufrufbar**.

| v1 | v2 |
|---|---|
| `s.time` / `v.time` / `l.time` | `bloxdTime()` |
| `s.sunDirection` / `l.sunDirection` | `bloxdSunDirection()` |
| `s.eyePosition` / `l.eyePosition` | `bloxdEyePosition()` |
| `s.originOffset` / `l.originOffset` | `bloxdOriginOffset()` |
| Weltkoordinatenbildung per `s.position + vec3f(...)` | `bloxdWorldPosition(s.position)` |
| `vec3i(floor(pos - normal*0.5)) + originOffset` | `bloxdFaceBlock(pos, normal)` |

## 34. Neuerung ①: `blockId` (blockeigenes Shading)

Alle 3 Structs `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` erhalten `blockId: u32`. Die **ID des Blocks, dem die Fläche gehört** (0–65535), über die ganze Fläche konstant (per `@interpolate(flat)` übergeben). Dient zur texturfarben-unabhängigen Blockart-Erkennung. Die ID-Blockart-Tabelle liegt aber engine-intern und ist aus Paketen nicht referenzierbar: **Welche ID welcher Block ist, lässt sich in der Welt vermessen oder in der Referenz unten nachschlagen**.

**Referenz**: Der Autor veröffentlicht eine Liste der Spiel-Einträge unter [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (`entries.json`: Tabelle id ↔ Blockname; Rotations-/Meta-Varianten wie `Furnace|meta|rot2` stehen als eigene IDs drin). Zuordnungen können sich mit Spiel-Updates ändern — endgültige Werte im echten Spiel prüfen.

### R-F. Blockart-Tönung per blockId

```wgsl
fn blockTint(blockId: u32) -> vec3f {
    // z. B.: Steinfamilie (High-Bit-Muster der ID) kalt tönen
    let stripe = f32((blockId >> 4u) & 1u);
    return mix(vec3f(1.0), vec3f(0.85, 0.95, 1.0), stripe * 0.5);
}

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    result.colour *= blockTint(surface.blockId);
    return result;
}
```

## 35. Neuerung ②: `BLOXD_SCENE_DEPTH` und `bloxdOpaqueBehind()` (die wichtigste)

Der in v1 strukturell unmögliche Tiefenzugriff ist **nur für Liquid-Programme** freigegeben. Keine Farbe, aber **Geometrieinfo zu Distanz und Position der opaken Fläche dahinter**. Typische Nutzung: Absorptionsfarbe aus gemessener Wasserdicke berechnen.

Nutzungsregeln:

| Verwendung | Ergebnis |
|---|---|
| Guard-loser Aufruf in `bloxdLiquidSurface` / `bloxdLiquidLight` | OK (in Liquid-Varianten immer definiert) |
| Guard-loser Aufruf in `bloxdTerrainSurface` | FEHLER. Mit `#ifdef BLOXD_SCENE_DEPTH` umschließen |
| Aufruf in Vertex-Hooks | FEHLER (nur Surface-/Light-Hooks) |

Wer Tiefe auch in Terrain-Hooks nutzen will, umschließt mit `#ifdef BLOXD_SCENE_DEPTH` (Terrain-Hooks werden auch von Liquid-Programmen wiederverwendet, Tiefe gilt dort nur liquid-seitig).

### R-E. Wasserdicken-Absorption (Beer-Lambert)

```wgsl
fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var result = bloxdDefaultSurface(surface);
    let behind = bloxdOpaqueBehind();
    if (behind.found) {
        // Wassersäulenlänge = von aktueller Position bis zur opaken Fläche dahinter
        let thickness = distance(behind.position, surface.position);
        // Beer-Lambert-Absorption: Rot fällt schnell, Blau trägt weit
        let absorb = exp(-thickness * vec3f(0.35, 0.14, 0.08));
        result.colour *= absorb;
    } else {
        // dahinter Himmel = zu tiefem Wasserblau ziehen
        result.colour = mix(result.colour, vec3f(0.05, 0.15, 0.30), 0.4);
    }
    return result;
}
```

Anwendungen: dickenbasierte Absorption/Streuung, Wellen-/Kaustik-artige Musterprojektion aus Boden-Weltkoordinaten via `behind.position`, Himmelsreflexion an der Oberfläche mit Himmel-vs-Verdeckung-Unterscheidung per `found=false`, tiefengestaffelte Schaum- und Trübungsgrade. Schlägt der Aufbau der Tiefenkopie-Pipeline fehl, sichere Degradation zu „nichts dahinter".

## 36. Sonstige v2-Änderungen

- **Hook-Fallback**: Liquid-Programme fallen ohne definiertes `bloxdLiquidXxx` auf Terrain-Hooks zurück. **Pakete mit nur Terrain-Hooks wirken unverändert auch auf Wasser**. Falls unerwünscht, Liquid-seitige Hooks explizit definieren.
- **`BLOXD_LIGHTING`-Feld-Guards überflüssig**: `blockLight` etc. existieren in allen Varianten, in unlit mit Defaults (0 / 1 / Weiß / 0). `#ifdef BLOXD_LIGHTING` nur für Lichtabfragen nutzen. Bestehende Guards zu behalten ändert nichts.
- **`BLOXD_ALPHA`-Definitionsbedingung geändert**: In Nicht-Strict-Terrain-Varianten und allen Liquid-Varianten definiert, in strict × Terrain nicht. Beim Schreiben von alpha in Terrain-Hooks den Guard behalten.
- **Direkte Struct-Konstruktion verboten**: Konstruktoraufrufe wie `BloxdLight(...)` werden von der statischen Prüfung abgelehnt. Immer ab `bloxdDefault*` ändern oder die Eingabe kopieren.
- **`let _ =` wird `_ =`**: Die WGSL-Verwerfungszuweisung `_ = f();` ist gültig, aber `let _ = f();` wird abgelehnt.
- **offInStrict**: Eine Vertex-Hook-Definition oder ein aus Surface-/Light-Hooks erreichbares `discard` gibt keinen Fehler, sondern deaktiviert das ganze Paket in strikten Spielen automatisch (Einstellungs-UI zeigt `shaderPack:offInStrict`, in Allow-Spielen läuft es). Vertex-Hooks und `discard` mit `#ifndef BLOXD_STRICT` umschließen.
- **Fog-Erweiterung**: In der Fog-Berechnung sind 3 Modi LINEAR / EXP / EXP2 implementiert, aber die Spiel-Einstellung bleibt wie bisher immer LINEAR, also gilt die bestehende Fog-Spec weiter. Auch die Bedeutung von `fogColour` ist offiziell festgeschrieben (nur in völlig fog-freien Szenen schwarz).
- **Unverändert**: Lift-Kurve, 35-%-Kanal-Floor, heldLight-Dämpfung (`pow(lightDist, 0.75)`) und Ambient-Boost, Sonnen-/Mondrichtungs-Spec, Standard-Fog-Farbe, Time-Wrap (3600 s), Richtlichter (max 4), nur Lite (WebGPU), Speichermechanismus (IndexedDB), reserviertes Wort `mod`.

## 37. v1 → v2-Migrationscheckliste

1. **pack.json**: `"apiVersion": 1` → `"apiVersion": 2`
2. **Bezeichner**: alles per §32-Tabelle ersetzen (Hook-Namen, Struct-Namen, Default-Funktionen)
3. **Gelöschte Felder portieren**: per §33-Tabelle zu Header-Funktionen (`s.time` → `bloxdTime()` etc.)
4. **`fogFactor` → `fogVisibility`** umbenennen
5. **Direkte Struct-Konstruktionen entfernen**
6. **`let _ =` zu `_ =`** korrigieren
7. **Vertex-Hooks und discard mit `#ifndef BLOXD_STRICT` umschließen**
8. Prüfen, dass **Wasser auch Terrain-Hook-Effekte abbekommt**; falls unerwünscht, Liquid-Hooks explizit definieren
9. (Optional) Fog ab `litColour` selbst verwalten / Wasserdicken-Absorption per `bloxdOpaqueBehind()` addieren / blockeigene Looks per `blockId`
10. **Auch Stufe 2 (Browser-Tint) prüfen** — besonders Klammern bei Ausdrücken mit `^` `&` `|` `<<` `>>`. Code kann die statische Prüfung bestehen und trotzdem vom Browser abgelehnt werden (§38)

## 38. Zweite Prüfstufe — der Browser-WGSL-Compiler ist strenger als der eingebaute Parser

Die Spiel-Paketprüfung läuft in **2 Stufen**. Stufe 1 ist die statische Prüfung (engine-eingebauter JS-Parser — Hook-Signaturen, verbotene Syntax, paketeigene Regeln wie die sceneDepth-Nutzung), und Stufe 2 ist die Browser-Prüfung (die dem Kompilierungsergebnis beigelegten Stubs werden mit der echten WebGPU-Implementierung kompiliert, und Fehler werden auf die Ursprungsdateizeilen des Pakets zurückgemappt angezeigt. Das „Saved, but it won't run until you fix these errors" der UI ist diese Stufe). Suffixe wie `(only in terrain)` am Ende der Fehleranzeige bezeichnen „die program-Art der Variante, in der der Fehler auftrat".

Der eingebaute Parser implementiert die WGSL-Operator-Bindungs-(Binding-)Regeln nicht, und **Code kann die statische Prüfung bestehen und trotzdem vom Browser abgelehnt werden**. Häufig betroffen ist das Standardmuster des Integer-Hashings:

| Operator | Folge |
|---|---|
| `<<` `>>` | Nur bis Unary-Level direkt kombinierbar. `a + b << c` ist ein Fehler |
| `&` `^` `\|` | Nur bis Unary-Level direkt kombinierbar. `a * b ^ c` ist ein Fehler |
| `&&` `\|\|` | Vermischung verboten. `a && b \|\| c` ist ein Fehler |

### Klammerung (NG / OK)

```wgsl
// NG — besteht die statische Prüfung, wird aber vom Browser (Tint) abgelehnt:
//     mixing '*' and '^' requires parenthesis
let h = a * 73856093u ^ b * 19349663u ^ c * 83492791u;

// OK — jede Multiplikation klammern (Kette desselben Operators A ^ B ^ C ist linksassoziativ legal)
let h = (a * 73856093u) ^ (b * 19349663u) ^ (c * 83492791u);
```

Kein abgedruckter Code in diesem Leitfaden enthält dieses Muster (die `+`/`*`-Mischungen von `pack_hash3` und `h ^ (h >> 16u)` sind bereits geklammert, also spec-konform). Nach dem Schreiben eines Pakets sowohl Stufe 1 als auch Stufe 2 durchlaufen.

## 39. Über unabhängig ähnliche Materialien

Es existiert ein Community-Material mit fast gleichem Inhalt: [Shader von GlitchHunterCoder/Bloxd-Essay](https://github.com/GlitchHunterCoder/Bloxd-Essay/tree/main/Shader). Vor diesem Leitfaden publiziert, aber **dieser Leitfadeninhalt stammt aus glms eigener Analyse der echten Bloxd-Bundle-Dateien (Webpack-Chunk-Satz) — kein Copy-Paste**. Beide stimmen überein, weil unabhängiges Untersuchen derselben Implementierung zu denselben Schlüssen führt.

---

Recherchiert von ltf_ahel (recherchiert mit glm)

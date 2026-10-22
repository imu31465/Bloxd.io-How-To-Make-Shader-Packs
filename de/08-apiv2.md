[← Vorheriger Teil](07-internals.md)·[Zurück zum Handbuch](README.md)

# Teil VIII: Migrationsleitfaden für API Version 2

> Das aktuelle Spiel verlangt seit dem 2026-10-19 `apiVersion: 3` und lehnt v1/v2-Pakete beim Laden ab — der folgende Inhalt ist auf der v2-Spezifikation geschrieben. Siehe [Teil IX](09-apiv3.md) zum Migrieren vor der Verteilung.

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

Alle 3 Structs `BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn` erhalten `blockId: u32`. Die **ID des Blocks, dem die Fläche gehört** (0–65535), über die ganze Fläche konstant (per `@interpolate(flat)` übergeben). Dient zur texturfarben-unabhängigen Blockart-Erkennung. Die ID-Blockart-Tabelle liegt aber engine-intern und ist aus Paketen nicht referenzierbar: **Welche ID welcher Block ist, lässt sich in der Welt vermessen oder in der Referenz unten nachschlagen**. Intern wird die ID in das Alpha der Vertexfarbe (untere 8 Bit) und in das w der Normalen (obere 8 Bit) gebacken — 16 Bit insgesamt; daher rührt auch die 65535-Obergrenze. Das blockId-System selbst wird nur aktiv, solange ein aktives Shader-Pack existiert (ohne Pack behalten die Leitungen ihre Füllziele, aber innerhalb der Struct-Definitionen aus Teil II ist dieser Unterschied nicht beobachtbar).

**Referenz**: Der Autor veröffentlicht eine Liste der Spiel-Einträge unter [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) (`entries.json`: Tabelle id ↔ Blockname; Rotations-/Meta-Varianten wie `Furnace|meta|rot2` stehen als eigene IDs drin). Zuordnungen können sich mit Spiel-Updates ändern — endgültige Werte im echten Spiel prüfen.

Häufige Blockarten (aus entries.json, Stand 2026-10-18; nur die Terrain-Familien mit den niedrigen IDs aufgelistet):

| ID | Blockname | ID | Blockname |
|---|---|---|---|
| 0 | Air | 15 | Maple Wood Planks |
| 1 | Unloaded | 28 | Stone |
| 2 | Dirt | 29 | Messy Stone |
| 3 | Messy Dirt | 31 | Smooth Stone |
| 4 | Grass Block | 126 | Water |
| 5 | Sand | 128 | Bricks |
| 6 | Clay | 139 | Ice |
| 7 | Gravel | 147 | Bedrock |
| 8 | Snow | 149 | Cactus |
| 9 | Maple Log | 1491 | Lava |

entries.json listet auch Nicht-Block-Einträge (Werkzeuge etc.), aber nur Block-Familien-IDs erreichen die Terrain-/Liquid-Hooks.

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

### R-G. blockId in der Welt ausmessen — das Bit-Plane-Anzeige-Pack

Ein Debug-Rezept, um in der Welt die IDs von Blöcken auszumessen, die in der Tabelle fehlen. Durchlaufe die vordere Konstante `plane` mit `0, 1, 2, …`, während du die Farbe der Fläche des Blocks abliest, den du identifizieren willst.

```wgsl
const plane: u32 = 0u;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let d = (s.blockId >> (plane * 3u)) & 7u;
    var palette = array<vec3f, 8>(
        vec3f(0.0, 0.0, 0.0), vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), vec3f(1.0, 1.0, 0.0),
        vec3f(0.0, 0.0, 1.0), vec3f(1.0, 0.0, 1.0), vec3f(0.0, 1.0, 1.0), vec3f(1.0, 1.0, 1.0));
    out.colour = palette[d];
    return out;
}
```

Die Fläche zeigt die 3 Bits von blockId direkt als RGB (schwarz = 0 / rot = 1 / grün = 2 / gelb = 3 / blau = 4 / magenta = 5 / cyan = 6 / weiß = 7). Eine Beobachtung liest eine Oktalziffer. Liest p0 → p3 nacheinander 3, 2, 7, 2, ist die von der oberen Ziffer gelesene Oktalzahl 2723 = 1491 die id (Lava). Terrain-Familien mit niedriger id kommen mit 2 Beobachtungen (p0, p1) aus. Verwendet nur den surface hook, läuft also auch in strict-Titeln.

### R-H. Nur die Blätter schwanken lassen — Eingrenzung des Vertex-Hooks per blockId

Das R7-Wind-Rezept ([Teil III](03-recipes.md)) wellt das ganze Terrain, aber auch der Vertex-Hook kann `blockId` lesen — die Ziele lassen sich also auf Blattblöcke begrenzen. Die ID-Liste und das WGSL-Array (gemessen am 2026-10-18; 22 Sorten — Pine / Aspen / Maple / Jungle / Plum / Cedar / Palm / Autumn Maple / Fallen Maple / Pear / Cherry / Fallen Cherry / Spectral / Mango / Fruchtvarianten / Autumn Aspen):

```wgsl
const LEAF_IDS = array<u32, 22>(
    100u, 101u, 102u, 103u, 491u, 492u, 493u, 653u, 655u, 911u,
    1226u, 1227u, 1636u, 1969u, 2019u, 2020u, 2021u, 2022u, 2023u,
    2024u, 2025u, 2085u);

// vertex hooks werden in strict-Titeln automatisch deaktiviert (siehe §36)
#ifndef BLOXD_STRICT

fn sp_isLeaf(id: u32) -> bool {
    for (var i = 0u; i < 22u; i++) {
        if (LEAF_IDS[i] == id) { return true; }
    }
    return false;
}

fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    if (sp_isLeaf(v.blockId)) {
        let wp   = bloxdWorldPosition(v.position);
        let t    = bloxdTime();
        // Die Verschiebung ist eine glatte Funktion der Weltposition. Gemeinsam benutzte Vertices,
        // die auf denselben Weltpunkt zeigen, bewegen sich identisch, sodass Flächen nicht abreißen ([Teil III](03-recipes.md) R7 folgt demselben Prinzip)
        let sway = sin(wp.x * 0.9 + t * 1.7) * cos(wp.z * 0.7 + t * 1.1);
        out.position.x += sway * 0.045;
        out.position.z += sway * 0.030;
    }
    return out;
}

#endif
```

- Die ID-Liste wächst mit den Engine-Updates (allein bei der Messung kamen in einem neuen Build 50 Blocksorten hinzu). Um weiter zu nutzen, ergänze Neuheiten über [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) oder durch Messen mit der Bit-Plane-Anzeige aus R-G und erweitere das Array
- `Fallen Maple Leaves` (655) / `Fallen Cherry Leaves` (1227) sind unsolide, auf den Boden gelegte Blattmatten. Wankt sie, scheint sie vom Boden abzuheben — eine Option ist, sie vom Array auszuschließen
- In strict-Titeln wird der Vertex-Hook pauschal deaktiviert, aber mit der obigen Guard schaltet das Pack einfach „auf Ruhe ab“ — die Fragment-seitigen Effekte bleiben aktiv

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

Anwendungen: dickenbasierte Absorption/Streuung, Wellen-/Kaustik-artige Musterprojektion aus Boden-Weltkoordinaten via `behind.position`, Himmelsreflexion an der Oberfläche mit Himmel-vs-Verdeckung-Unterscheidung per `found=false`, tiefengestaffelte Schaum- und Trübungsgrade. Schlägt der Aufbau der Tiefenkopie-Pipeline fehl, sichere Degradation zu „nichts dahinter". Die Verfügbarkeit der Tiefentextur wird bei der Erzeugung des Seiten-Renderers einmalig fixiert — maßgeblich ist „liest das aktive Paket Tiefe?". **Beim Einsatz eines Tiefe lesenden Pakets daher immer die Seite neu laden**. Wird Tiefe angefordert, während ein Paket aktiv ist, die Seite aber nicht neu geladen wurde, zeigt die Konsole einmalig eine `…reads scene depth on a page that didn't turn it on`-Warnung, und die Tiefentextur wird durch einen 1×1-Fallback ersetzt, sodass `bloxdOpaqueBehind()` immer `found = false` liefert.

## 36. Sonstige v2-Änderungen

- **Hook-Fallback**: Liquid-Programme fallen ohne definiertes `bloxdLiquidXxx` auf Terrain-Hooks zurück. **Pakete mit nur Terrain-Hooks wirken unverändert auch auf Wasser**. Falls unerwünscht, Liquid-seitige Hooks explizit definieren.
- **`BLOXD_LIGHTING`-Feld-Guards überflüssig**: `blockLight` etc. existieren in allen Varianten, in unlit mit Defaults (0 / 1 / Weiß / 0). `#ifdef BLOXD_LIGHTING` nur für Lichtabfragen nutzen. Bestehende Guards zu behalten ändert nichts.
- **`BLOXD_ALPHA`-Definitionsbedingung geändert**: In Nicht-Strict-Terrain-Varianten und allen Liquid-Varianten definiert, in strict × Terrain nicht. Beim Schreiben von alpha in Terrain-Hooks den Guard behalten.
- **Direkte Struct-Konstruktion verboten**: Konstruktoraufrufe wie `BloxdLight(...)` werden von der statischen Prüfung abgelehnt. Immer ab `bloxdDefault*` ändern oder die Eingabe kopieren.
- **`let _ =` wird `_ =`**: Die WGSL-Verwerfungszuweisung `_ = f();` ist gültig, aber `let _ = f();` wird abgelehnt.
- **offInStrict**: Eine Vertex-Hook-Definition oder ein aus Surface-/Light-Hooks erreichbares `discard` gibt keinen Fehler, sondern deaktiviert das ganze Paket in strikten Spielen automatisch (Einstellungs-UI zeigt `shaderPack:offInStrict`, in Allow-Spielen läuft es). Vertex-Hooks und `discard` mit `#ifndef BLOXD_STRICT` umschließen. Beachte: die Meldung der offiziellen Einstellungs-UI selbst weist an, den Rest mit `#ifndef BLOXD_STRICT` zu umschließen — ist keine bloße Konvention, sondern offizielle Empfehlung.
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

[← Vorheriger Teil](07-internals.md)·[Zurück zum Handbuch](README.md)

[← Vorheriger Teil](08-apiv2.md)·[Zurück zum Handbuch](README.md)

# Teil IX: Migrationsleitfaden für API Version 3

> **Seit 2026-10-26 ersetzt: die aktuelle API ist Version 4** — v3-Pakete werden beim Laden genau so abgelehnt, wie es hier für v2 beschrieben ist. Diesen Teil *und danach* [Teil X](10-apiv4.md) anwenden (v3 → v4: Textur-API, `fogAlpha`-Umbenennung, `bloxdFragmentBlockPosition`, `hit`).

Ziel-Build: `3ymzdd.main.fae4743f.js` — **der seit 2026-10-19 live ausgelieferte Produktions-Build**. Das Bundle, das bloxd.io in Produktion ausliefert, ist byte-identisch (per md5 geprüft, Haupt-Bundle und Shader-Pack-Chunks gleichermaßen) mit dem Preprod-Deploy, gegen das dieser Teil ursprünglich untersucht wurde; alles hier gilt also unverändert für die Produktion. Das Paketmodell behält seine v2-Form (gleiche `pack.json`-Felder, gleiche Loader-Limits, gleiches Uniform-Layout).

Die Teile I–VII dieser Anleitung sind weiterhin auf v2-Basis geschrieben. Dieser Teil sammelt in derselben Reihenfolge wie [Teil VIII](08-apiv2.md) die Migrationspunkte v2 → v3 und die Neuerungen von v3. Die Umstellung ist größtenteils mechanisch (§47), aber nur eine Änderung verändert tatsächlich das Verhalten — das Standardlicht dämpft Emission jetzt durch Fog (§43) — und `blockId` wird vollständig durch `blockFlags` ersetzt (§42); vor der Verteilung daher immer per In-Game-Kompilierung prüfen.

Neu in dieser Revision: Die Abschnitte **§49–§54** gehen über die Migration hinaus in Engine-Interna, die aus dem Produktions-Build restauriert wurden — wie der Lite-Renderer deine Hooks tatsächlich aufruft, die echte Fog-Funktion mit vier Modi, die exakte Implementierung von `bloxdOpaqueBehind()`, den vollständigen blockFlags-Übertragungsweg von der Blockregistrierung bis zu deinem Hook und die Validierungspipeline mit ihrem gemessenen Header-Hash. Das sind die detailliertesten bislang öffentlich dokumentierten Fakten über das Paketsystem, und sie beantworten mehrere Fragen, die andere Anleitungen noch als offen führen.

## 40. Das Schicksal von v2-Paketen (erst das Fazit)

**Update 2026-10-19: v3 hat Preprod verlassen und ist jetzt das, was die Live-Seite ausliefert.** Jedes vor dem Rollout gespeicherte v2-Paket — einschließlich jedes als v2 verteilten Pakets — scheitert in Produktion genau wie unten beschrieben; die Migration aus §47 ist für alle, die heute Pakete verteilen, nicht mehr optional.

Der Build verlangt, dass die Manifest-`apiVersion` **exakt 3 entspricht**, und es gibt **keinen parallelen v2/v3-Support**. Ein v2-Paket wird beim Laden mit den Meldungen zur falschen API-Version abgelehnt (i18n-Keys, Platzhaltertext):

> `loadWrongApiVersion`: "This pack is for shader pack API version {{packVersion}}. Bloxd supports version {{version}}."
>
> `statusWrongApiVersion`: "This shader pack is for API version {{packVersion}}, so it won't run. Load a version {{version}} pack to replace it."
>
> `loadNoApiVersion`: "pack.json needs \"apiVersion\": {{version}}."

Gespeicherte Pakete behalten den v2-Lebenszyklus ([Teil VIII](08-apiv2.md) §31): Jeder Build hasht seinen Engine-Header, Engine-Updates markieren gespeicherte Pakete automatisch als „muss erneut geprüft werden“, und ein gespeichertes Paket, dessen `apiVersion` eine andere als die aktuelle ist, wird als nicht ausführbar markiert (mit der obigen Statusmeldung, die auf den Ersatz verweist), statt einen Fehler auszulösen.

## 41. pack.json und der Uniform-Buffer (was unverändert bleibt)

- Die Pflichtfelder im Manifest sind unverändert: `{ apiVersion, name, author }`.
- Die Loader-Limits sind unverändert: 32 MB Zip / 1024 Einträge / 256 `.wgsl`-Dateien / 256 KB Code gesamt / 64 KB Manifest.
- Das Uniform der Engine ist in seiner Form unverändert: `@group(3) @binding(0)`, 64 B, mit — in Deklarationsreihenfolge — Zeit, Render-Offset, Sonnenrichtung und Augenposition. Das Layout ist mit `minBindingSize: 64` registriert, und die exakte Feldanordnung ist `seconds: f32` @ Byte 0, `renderOffset: vec3i` @ 16, `sunDirection: vec3f` @ 32, `eyePosition: vec3f` @ 48. Zwei interne Feldnamen haben sich geändert: `time` → `seconds`, `originOffset` → `renderOffset`. Die **Byte-Anordnung ist identisch mit v2**, und für Paketcode ändert sich ohnehin nichts, weil Pakete das Uniform nicht direkt benennen dürfen (der Engine-Header markiert es als engine-provided und read-only, „which packs can't name“); weiter über die Header-Funktionen `bloxdSeconds()` / `bloxdRenderOffset()` gehen.
- In Gruppe 3 des Pakets ist jetzt ein zweiter Platz dokumentiert: `@group(3) @binding(1)` ist die Szenentiefe-Textur, die `bloxdOpaqueBehind()` liest (vollständige Implementierung in §51). Das 64-Byte-Uniform bleibt bei Binding 0; Pakete können weiterhin keines der beiden Bindings benennen.

## 42. blockId wird blockFlags: Materialien pro Block als Bitflags (die Hauptänderung)

In allen drei Hook-Eingabestrukturen (`BloxdVertexIn` / `BloxdSurfaceIn` / `BloxdLightIn`) wird das v2-Feld `blockId: u32` **ersetzt** durch `blockFlags: u32`. Engine-Text zum Feld: *"What kind of block this face is: `bloxdBlockFlag*` bits, the same across the face."* Die Engine liefert jetzt die Materialdaten selbst, daher ist der v2-Weg, Materialien aus numerischen ID-Bereichen zu raten oder ID-Tabellen in der Welt zu pflegen ([Teil VIII](08-apiv2.md) §34), nicht mehr nötig.

Die Bits sind als benannte Konstanten exponiert:

```wgsl
// Einen Test mit (blockFlags & bloxdBlockFlagRock) != 0 ausführen.
const bloxdBlockFlagOpaque: u32 = 1;
const bloxdBlockFlagEmissive: u32 = 2;
const bloxdBlockFlagVegetation: u32 = 4;
const bloxdBlockFlagDirt: u32 = 8;
const bloxdBlockFlagSand: u32 = 16;
const bloxdBlockFlagRock: u32 = 32;
```

| Wert | Konstante | Bedeutung (Engine-Hinweise, verdichtet) |
|---|---|---|
| 1 | `bloxdBlockFlagOpaque` | Vollständig opak — Blätter und Eis eingeschlossen. Nicht Glas, Wasser, Lava, Spawner oder Geister- und unsichtbare Blöcke. |
| 2 | `bloxdBlockFlagEmissive` | Gibt Blocklicht ab, wie Neon, Portale, Lampen, Lava und Beacon. Leuchtende Erze zählen, egal wie schwach. |
| 4 | `bloxdBlockFlagVegetation` | Blätter und das Gras auf Grasblöcken (Grasblöcke tragen auch Dirt). Keine Kakteen, Pilzblöcke oder Heu. |
| 8 | `bloxdBlockFlagDirt` | Dirt und Erde, Grasblöcke eingeschlossen. Rocky Dirt ist ebenfalls Gestein. |
| 16 | `bloxdBlockFlagSand` | Sand, Red Sand und jeder Sandstein — der auch Gestein ist. |
| 32 | `bloxdBlockFlagRock` | Stein und seine Varianten, Andesit, Diorit, Granit, Kies, Erze, Sandstein, Rocky Dirt, Bedrock, Obsidian und Magma. |

Ein Block aus mehreren Materialien trägt **jedes** passende Flag (das Engine-Beispiel selbst: Sandstein ist Sand und Gestein, bekommt also beide). Blätter sind Vegetation, aber kein Dirt; Grasblöcke sind gleichzeitig Vegetation und Dirt.

Die Flags vegetation / dirt / sand / rock werden anhand des registrierten **Anzeigenamens** des Blocks vergeben (opaque / emissive stammen stattdessen aus den Opazitäts- und Emissionsdaten der Engine): Namen, die auf `Leaves` enden, sowie `Grass Block` sind Vegetation; Namen wie `Dirt` / `Soil` (und jeder `Grass Block`) sind Dirt; genau `Sand` und `Red Sand` sowie jeder Name, der `Sandstone` enthält, sind Sand; Namen mit `Stone` / `Andesite` / `Diorite` / `Granite`, jedes `Ore`, außerdem Yellowstone, Gravel, Bedrock, Obsidian, Magma, Rocky Dirt (und Sandstein) sind Gestein.

### Die exakten Namensregeln (die Flags jedes Blocks selbst ableiten)

Die vier Material-Bits stammen aus einem festen Klassifikator über den registrierten Anzeigenamen des Blocks. Varianten-Namen (alles nach `|`) werden zuerst entfernt, sodass Varianten die Flags des Basisblocks erben. Dann gilt:

| Bit | Regel (auf dem bereinigten Namen ausgewertet) |
|---|---|
| vegetation | der Name **endet auf** ` Leaves` oder **endet auf** ` Grass Block` |
| dirt | der Name **ist exakt** `Dirt`, **endet auf** ` Dirt` oder ` Soil`, oder **endet auf** ` Grass Block` |
| sand | der Name **ist exakt** `Sand` oder `Red Sand`, oder **enthält** `Sandstone` |
| rock | der Name **ist exakt** einer von `Yellowstone` / `Gravel` / `Bedrock` / `Obsidian` / `Magma` / `Rocky Dirt`, **enthält** `Sandstone`, **endet auf** ` Ore`, oder enthält `Stone` / `Andesite` / `Diorite` / `Granite` als eigenständiges Wort |

Yellowstone ist ausdrücklich aufgeführt, weil `Stone` in `Yellowstone` kein eigenständiges Wort ist. Opaque und Emissive kommen **nicht** aus dem Namen — sie stammen aus den Opazitäts- und Blocklicht-Emissionsdaten der Engine, lassen sich mit diesen Regeln also nicht ableiten.

Quelle: der Namensklassifikator der Engine (Modul 28537, Bundle `3ymzdd`); gegen alle 7.861 benannten Blöcke verifiziert, 2026-10-20.

Beispiel — Tönung pro Block nach Material:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if ((surface.blockFlags & bloxdBlockFlagVegetation) != 0) {
        out.colour *= vec3f(0.92, 1.10, 0.86);
    }
    return out;
}
```

Wirkung auf v2-Rezepte: Das 22 Einträge umfassende Blatt-ID-Array von R-H ([Teil VIII](08-apiv2.md) §34) schrumpft auf `(blockFlags & bloxdBlockFlagVegetation) != 0`. Die Referenz zwischen Block-IDs und Blocknamen bei [Bloxd-Entries-Data](https://github.com/imu31465/Bloxd-Entries-Data) bleibt für Nicht-Shader-Zwecke nützlich, muss für Material-Styling aber nicht mehr in der Welt nachgeschlagen werden.

### Blätter ohne das Gras (die Frage, die alle stellen)

`vegetation` allein trifft Blätter **und** das Gras auf Grasblöcken, die auch
`dirt` tragen. Dirt ausschließen, um nur Blätter zu bewegen — der Diskriminator,
den die Feldnotizen der Engine selbst ausbuchstabieren:

```wgsl
// Nur Blätter: Vegetation ohne Dirt. Grasblöcke sind Vegetation UND Dirt.
let isLeaf = (blockFlags & bloxdBlockFlagVegetation) != 0u
           && (blockFlags & bloxdBlockFlagDirt) == 0u;

// Nur Grasblöcke (die grasbewachsenen Flächen der Terrain-Oberfläche):
let isGrassBlock = (blockFlags & bloxdBlockFlagVegetation) != 0u
                 && (blockFlags & bloxdBlockFlagDirt) != 0u;
```

Gegen die Live-Registry verifiziert (2026-10-20, Bundle `3ymzdd`):
`vegetation && !dirt` trifft exakt die 45 Blattregistrierungen (22 Basistypen —
dieselben 22, die das v2-R-H-ID-Array gemessen hat); `vegetation && dirt` trifft exakt
die 8 Grasblöcke. Keine Ausnahmen in beide Richtungen — Registry-Zahlen zum Stand jenes Builds; neue Blöcke erhöhen die Zahlen, ohne die Regel zu ändern. Mit `vertex.normal`
(oben/unten) kombinieren, um Flächen auszuwählen, z. B. nur Grasblock-Oberseiten.

## 43. Funktionsumbenennungen und semantische Änderungen

| v2 | v3 | Hinweise |
|---|---|---|
| `bloxdTime()` | `bloxdSeconds()` | Sekunden seit dem Laden der Seite (Hinweis zur f32-Präzision unten) |
| `bloxdOriginOffset()` | `bloxdRenderOffset()` | Dieselbe Größe: Renderposition + dies = Weltposition |
| `const bloxdTimeWrap: f32 = 3600` | **entfernt** | Zeiträume selbst auf der Paketseite definieren |
| `engineColour` (in `BloxdLightIn`) | **entfernt** (14 → 13 Felder) | Aus `litColour` + Fog neu aufbauen |
| Hook-Parameter `v` / `s` / `l` | `vertex` / `surface` / `light` | Schreibweise im Template; Signaturen unverändert |

- **`bloxdSeconds()`** — Sekunden seit dem Laden der Seite. In f32 zählt es in Schritten von unter 1 ms für die ersten 4,5 Stunden und von etwa 4 ms zwischen 9 und 18 Stunden. Der Header empfiehlt das Idiom `bloxdSeconds() % period`, das von 0 bis `period` zählt und dann neu beginnt — ein sauberer Ersatz für die entfernte Wrap-Konstante.
- **`bloxdRenderOffset()`** — ganze Blöcke: „a render position plus this is a world position.“ Es ändert sich, während der Spieler reist, daher bleiben Renderpositionen nahe am Spieler — und damit präzise. In der gesamten Anleitung heißt die Größe, die der v2-Text noa-lokaler Offset nannte, jetzt einheitlich **Renderposition** / Render-Offset; es ist dieselbe Größe, die `bloxdOriginOffset()` zurückgab.
- **`bloxdTimeWrap` entfernt** — ein Paket, das die Zeit bei 3600 s umbrechen ließ, deklariert jetzt seine eigene Konstante, z. B. `const timeWrap: f32 = 3600.0;` und `% timeWrap`.
- **Semantik des Standardlichts** — der v2-Standard war `engineColour + emission × fogVisibility`; der v3-Standard setzt es als `bloxdApplyFog(litColour + emission, light)` zusammen — **Emission wird jetzt innerhalb des Standards durch Fog gedämpft**, sodass die kombinierte Ausgabe gemeinsam durch den Fog-Blend geht. Portierungstabelle:

  | v2-Ausdruck | v3-Portierung |
  |---|---|
  | `l.engineColour` | `bloxdApplyFog(l.litColour, l)` |
  | `l.engineColour + s.emission * l.fogVisibility` | `bloxdApplyFog(l.litColour + s.emission, l)` |

  ```wgsl
  // v3-Portierung des v2-Lesezugriffs `l.engineColour + s.emission * l.fogVisibility`:
  out.colour = bloxdApplyFog(light.litColour + surface.emission, light);
  ```
- **In Name und Bedeutung unverändert**: `bloxdEyePosition()`, `bloxdSunDirection()`, `bloxdFaceBlock()`, `bloxdApplyFog()`, `bloxdWorldPosition()`.

## 44. Neue Header-Konstanten: `bloxdPi` und `bloxdTau`

```wgsl
// Eine halbe Umdrehung und eine volle Umdrehung, in Radiant.
const bloxdPi: f32 = 3.1415926535898;
const bloxdTau: f32 = 6.2831853071796;
```

Nützlich sowohl für trigonometrische Tricks als auch weil Pakete π nicht mehr hartcodieren müssen. Auf Namenskollisionen achten: Eine paketlokale Konstante gleichen Namens kollidiert jetzt mit der Prüfung des Headers auf doppelte Bezeichner — jede Neudeklaration von `bloxdPi` / `bloxdTau` im eigenen Code entfernen oder umbenennen.

## 45. Das Sechs-Hook-Template (Flüssigkeits-Hooks offiziell gezeigt)

Der mit dem Build veröffentlichte Standard-Pakettext enthält jetzt **alle sechs Hooks** — Terrain / Flüssigkeit × Vertex / Surface / Light —, jeder gibt seinen Engine-Standard zurück. Die Engine-Kommentare führen es so ein: *"Every hook returns its engine default. Copy a hook and change its output to start a shader pack."*

```wgsl
// Jeder Hook gibt seinen Engine-Standard zurück. Kopiere einen Hook und ändere
// seine Ausgabe, um ein Shader-Paket zu beginnen.

// Strict-Spiele lassen Terrain, wo es ist: Ohne Guard würde dieser Hook
// das ganze Shader-Paket dort abschalten.
#ifndef BLOXD_STRICT
fn bloxdTerrainVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}

// Wasser nutzt diese. Wenn gelöscht, nutzt Wasser stattdessen deine Terrain-Hooks.
#ifndef BLOXD_STRICT
fn bloxdLiquidVertex(vertex: BloxdVertexIn) -> BloxdVertex {
    return bloxdDefaultVertex(vertex);
}
#endif

fn bloxdLiquidSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    return bloxdDefaultSurface(surface);
}

fn bloxdLiquidLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    return bloxdDefaultLight(surface, light);
}
```

- Die Kommentare der Hooks nennen die Flüssigkeitsregeln direkt: **Wasser braucht das Trio; löschst du es, verwendet Wasser wieder deine Terrain-Hooks** (das aus v2 bekannte Fallback-Verhalten, [Teil VIII](08-apiv2.md) §36, jetzt im Template selbst festgeschrieben).
- `bloxdLiquidVertex` liegt im selben `#ifndef BLOXD_STRICT`-Guard wie `bloxdTerrainVertex` — ohne Guard würde es das ganze Paket in Strict-Spielen abschalten, genau wie Vertex-Effekte auf der Terrain-Seite.
- Die Template-Schreibweisen sind jetzt die vollen Parameternamen `vertex` / `surface` / `light` (das v2-Template nutzte die kurzen `v` / `s` / `l`). Die Parameternamen im eigenen Code sind frei — nur die Signaturen zählen.

## 46. Variantenmatrix: die Programm-Achse und Makro-Änderungen

Varianten werden über eine Matrix aus **strict × lighting × program** erzeugt — dieselben 8 Kombinationen wie in v2, aber Terrain / Flüssigkeit ist jetzt eine explizite Achse der Matrix. Die Variantennamen schreiben das als `allow|strict · unlit|lit · terrain|liquid` aus und erscheinen in der UI als ``terrain`` / `liquid`, `strict` / `non-strict`, `lighting on` / `lighting off` (Fehleranzeigen können „(only in {{variants}})“ anhängen).

| Makro | Definiert in |
|---|---|
| `BLOXD_STRICT` | Strict-Varianten (beide Programme) |
| `BLOXD_LIGHTING` | Varianten mit Lighting an (beide Programme) |
| `BLOXD_ALPHA` | **alle Flüssigkeitsvarianten** plus Nicht-Strict-**Terrain**-Varianten |
| `BLOXD_SCENE_DEPTH` | **alle Flüssigkeitsvarianten** |

Zwei Dinge ändern sich für Autoren gegenüber den v2-Regeln ([Teil VIII](08-apiv2.md) §36):

- **`BLOXD_ALPHA` ist gegenüber v2 unverändert.** Der Variantengenerator enthält die Literalzeile `"liquid"!==program&&strict||push("BLOXD_ALPHA")` — die JS-Operatorpriorität macht *(Terrain **und** strict)* zum einzigen Fall, der den push überspringt, sodass das Makro in **jeder Flüssigkeitsvariante (strict oder nicht strict) und in Nicht-Strict-Terrain** definiert ist; nur Strict-Terrain lässt es weg. Flüssigkeitsseitiger `#ifdef BLOXD_ALPHA`-Code wird genau wie immer hineinkompiliert, und das Alpha-Zurückschreiben aus §49 (eingefügt für Flüssigkeitsprogramme oder Nicht-Strict-Varianten) deckt sich exakt mit dieser Menge.
- **`BLOXD_SCENE_DEPTH` ist in Flüssigkeitsvarianten immer definiert**, daher bleibt die Tiefennutzung dort ohne Guard in Ordnung, genau wie in v2 (§35); in Terrain-Hooks braucht sie weiterhin den `#ifdef BLOXD_SCENE_DEPTH`-Wrap.

## 47. v2 → v3-Migrationscheckliste

1. **pack.json**: `"apiVersion": 2` → `"apiVersion": 3`
2. **`blockId` → `blockFlags`** in allen drei Eingabestrukturen; Material-Styling als Bittests gegen `bloxdBlockFlag*`-Konstanten ausdrücken (§42); ID-Bereichs-Heuristiken aus v2 entfernen
3. **`bloxdTime()` → `bloxdSeconds()`**; eigenen Zeitraum statt des entfernten `bloxdTimeWrap` deklarieren (`% period`)
4. **`bloxdOriginOffset()` → `bloxdRenderOffset()`**
5. **Lichtmathematik von `engineColour` auf `litColour` + Fog umbauen** gemäß der Tabelle in §43; beachten, dass der Standard Emission jetzt durch Fog dämpft
6. **Flüssigkeits-Hooks**: `bloxdLiquid*` explizit definieren, wenn Wasser anders behandelt werden soll; weglassen, um auf die Terrain-Hooks zurückzufallen
7. **Keine `BLOXD_ALPHA`-Prüfung nötig** — die Variantenmenge ist gegenüber v2 unverändert: alle Flüssigkeitsvarianten plus Nicht-Strict-Terrain definieren es, nur Strict-Terrain lässt es weg (§46)
8. **`bloxdPi` / `bloxdTau` verwenden**, wo trigonometrienahe Konstanten hartcodiert waren; paketlokale Neudeklarationen entfernen, die jetzt den Header duplizieren
9. **Strict-Guards behalten**: Vertex-Hooks und `discard` bleiben in `#ifndef BLOXD_STRICT` gewrappt; das Template schützt `bloxdLiquidVertex` genauso wie Terrain
10. **Im Spiel validieren** — das Paket in einem Spiel kompilieren und testen, das Shader-Pakete unterstützt

## 48. Weitere v3-Änderungen und Hinweise

- **Die Validierung bleibt zweistufig** ([Teil VIII](08-apiv2.md) §38): zuerst statische Validierung, dann die echte WebGPU-Kompilierung des Browsers über generierte Stub-Schnipsel, die deine Hooks aufrufen, mit Fehlern, die auf Quelldateien / -zeilen zurückgeführt werden, und Diagnosen, die die ursprünglichen Namen engine-seitiger Bezeichner über ein Mapping wiederherstellen.
- **Strict-Diagnosen nennen den Grund**: Ein Vertex-Hook, der Terrain verschiebt, meldet „… moves terrain, which strict games prevent.“, und `discard` in Surface-/Light-Hooks meldet „discard makes terrain see-through, which strict games prevent.“; die Einstellungsoberfläche behält den Hinweis „wrap each one listed below in `#ifndef BLOXD_STRICT ... #endif`.“ (`offInStrict`).
- **Loader-Meldungen**: Fehlerarten und Limits sind unverändert; "Zip64 archives aren't supported." wird als UI-Meldung angezeigt (`loadZip64`). Das Inventar der Paket-UI-Strings umfasst 57 `shaderPack:*`-Keys; unter den Ladephase-Fehlern vervollständigen `loadNoWgsl` (ein Zip mit null `.wgsl`-Dateien) und `loadNotZip` (eine Datei ohne Zip-End-of-Archive-Signatur) die Menge.
- **Mit der Paket-UI wird kein WGSL-Editor im Spiel ausgeliefert.** Der Einstellungsbildschirm bietet keinen Shader-Code-Editor — Pakete werden außerhalb des Spiels als Zip-Dateien erstellt. (Ein CodeMirror-Editor existiert zwar im Bundle, ist aber der JavaScript-Editor der Custom-Game-Scripting-UI; er hat keine WGSL-Unterstützung und keine Verbindung zum Paketsystem.)
- **Hardware-Gate**: Lite benötigt einen Treiber, der das WebGPU-Feature `shader-f16` unterstützt; zu alte Treiber werden mit einer Meldung wie "Intel driver too old for Lite (no shader-f16)" abgelehnt.
- **Lichtänderungen validieren gespeicherte Pakete neu**: Wenn die Lighting-Einstellung zur Laufzeit geändert wird, führt die Engine die Paketprüfung erneut aus (`changed → recheck`); die Replay-Ansicht ruft denselben Hook mit `changed: false` auf und überspringt die erneute Prüfung.
- **Formulierung**: Text über Spiele, die Shader-Pakete akzeptieren, lautet jetzt „in games that **support** them“.
- **Geltungsbereich der Titel**: Die Menge der Spiele, in denen Pakete laufen, ist gegenüber dem vorherigen Build unverändert.

## 49. Engine-Interna: wie der Lite-Renderer deine Hooks aufruft

Alles in §40–§48 ist das, was Loader und Header dir sagen. Dieser Abschnitt und die folgenden dokumentieren, was die Engine zur Laufzeit tatsächlich tut, restauriert aus dem Produktions-Bundle (dem Lite-Renderer — ein 175-KB-Chunk; der echte Name der Integrationsquelldatei `lite/terrainShaderPack.ts` überlebt in ihren Fehlermeldungen). Nichts davon ändert, was du schreibst, aber es beseitigt das Rätselraten darüber, was deine Hooks erhalten — und beantwortet mehrere Fragen, die andere Community-Anleitungen noch als offen führen.

Der Renderer „ruft“ deine Hooks nicht aus JavaScript auf. Wenn ein Paket die Validierung besteht, **fügt die Engine deine Hook-Aufrufe in ihr eigenes Terrain-WGSL ein**, indem sie feste Ankerzeilen im Shader-Text ersetzt. Ein Anker muss genau einmal passen — null oder mehrere Treffer brechen ab mit `at the shader pack ${hook} hook: ${no|more than one} anchor (lite/terrainShaderPack.ts)`.

| Stufe | Ankerzeile im Engine-Shader | Was eingefügt wird |
|---|---|---|
| vertex | ein vierzeiliger Block von `let worldPos = vec4f(vertexInputs.position + chunk.xyz, 1.0);` bis `vertexOutputs.vNormalW = normalize(vertexInputs.normal.xyz);` | `BloxdVertexIn` bauen, deinen Vertex-Hook aufrufen, `worldPos` zurückschreiben — das Einfügen schreibt außerdem `let worldPos` in `var worldPos` um |
| surface | `baseColor = vec4f(baseColor.rgb * fragmentInputs.vColor, baseColor.a);` | `BloxdSurfaceIn` bauen, deinen Surface-Hook aufrufen, `baseColor` / `alpha` zurückschreiben |
| lit colour | kurz vor `color = vec4f(mix(uniforms.vFogColor, color.rgb, fog), …)` | `let bloxdSpLitColour = color.rgb;` — fängt die Farbe vor dem Fog ein |
| light | der abschließende `return color;` des Fragment-Shaders | `BloxdLightIn` bauen, deinen Light-Hook aufrufen, `color` zurückschreiben — nach dem Fog-Mix |

Der eingefügte Code, restauriert aus dem ausgelieferten Bundle (Ausdrücke für Lichtlevel-Proben gekürzt, wo die Engine-Formatierung lang läuft):

```wgsl
// Vertex-Stufe — Nicht-Strict-Varianten mit Vertex-Hook
{
    let bloxdSpVertexIn = BloxdVertexIn(worldPos.xyz, vertexOutputs.vNormalW,
                                        vertexOutputs.vBlockFlags);
    let bloxdSpVertex = /* dein bloxdTerrainVertex / bloxdLiquidVertex */(bloxdSpVertexIn);
    worldPos = vec4f(bloxdSpVertex.position, worldPos.w);
}
```

```wgsl
// Fragment-Stufe — Surface
let bloxdSpSurfaceIn = BloxdSurfaceIn(baseColor.rgb, alpha,
        normalize(fragmentInputs.vNormalW), fragmentInputs.vPositionW,
        fragmentInputs.vBlockFlags);
let bloxdSpSurface = /* dein Surface-Hook */(bloxdSpSurfaceIn);
baseColor = vec4f(bloxdSpSurface.colour, baseColor.a);
alpha = bloxdSpSurface.alpha;   // nur eingefügt, wenn das Programm Flüssigkeit oder die Variante nicht strict ist
```

```wgsl
// Fragment-Stufe — Light
{
    let bloxdSpLightIn = BloxdLightIn(
        bloxdSpLitColour,                        // litColour
        fragmentInputs.vTerrainLambert,          // directional
        ambient,                                 // ambient
        /* Lichtlevel-Varying */.rgb,            // blockLight
        /* Himmelskanal desselben Varyings */,   // skyLight
        uniforms.uAmbientLightColour,            // ambientLightColour
        uniforms.uSkyLightColour,                // skyLightColour
        /* Term des gehaltenen Lichts (siehe unten) */, // heldLight
        select(vec3f(0.0), uniforms.vFogColor,
               uniforms.vFogInfos.x != 0.0),     // fogColour — nur ohne jeglichen Fog schwarz
        fog,                                     // fogVisibility
        fragmentInputs.vPositionW,               // position
        normalize(fragmentInputs.vNormalW),      // normal
        fragmentInputs.vBlockFlags);             // blockFlags
    let bloxdSpLight = /* dein Light-Hook */(bloxdSpSurface, bloxdSpLightIn);
    color = vec4f(bloxdSpLight.colour, color.a);
}
```

Vier Fakten zur Durchsetzung ergeben sich direkt aus diesem Einfügen:

- **Strict-Terrain ignoriert Alpha-Änderungen des Surface-Hooks.** Das Zurückschreiben von `alpha = bloxdSpSurface.alpha` wird nur für Flüssigkeitsprogramme oder Nicht-Strict-Varianten eingefügt — die Implementierung hinter der Makrotabelle aus §46. (In Strict-Terrain wird dein `#ifdef BLOXD_ALPHA`-Code ohnehin nicht hineinkompiliert; jetzt ist außerdem bestätigt, dass ungeschützte Alpha-Schreibzugriffe dort verworfen werden.)
- **Eine Strict-Variante, die trotzdem einen Vertex-Hook deklariert, führt ihn nie aus** — die Engine meldet das zur Build-Zeit: `Shader pack code ${variant} is strict and has a vertex hook, which strict mode never runs`. Deshalb umschließt das offizielle Template (§45) `bloxdLiquidVertex` mit demselben `#ifndef BLOXD_STRICT` wie sein Terrain-Gegenstück.
- Die `bloxdSp*`-Bezeichner — **14 insgesamt**: `bloxdSpVertexIn`, `bloxdSpVertex`, `bloxdSpSurfaceIn`, `bloxdSpSurface`, `bloxdSpLightIn`, `bloxdSpLight`, `bloxdSpLitColour`, `bloxdSpSceneDepth`, `bloxdSpPixel`, `bloxdSpPositionW`, `bloxdSpZ`, `bloxdSpEye`, `bloxdSpScale`, `bloxdSpBehind` — sind engine-seitige Temporaries. Dein Code sieht sie nie, aber sie tauchen in Diagnosen und in jeder Reverse-Engineering-Ausgabe auf, daher lohnt es sich, sie auf Anhieb zu erkennen.
- **Die Abkürzung für die Standard-Surface.** Wenn der Surface-Hook einer Variante buchstäblich `bloxdDefaultSurface` ist, überspringt die Engine das Einfügen der Zurückschreibzeilen für `baseColor` / `alpha` vollständig — der Standard erzeugt diese Werte bereits, die Zuweisung wäre also toter Code. Unveränderte Hook-Ketten kosten nichts.

**Was `BloxdLightIn` tatsächlich speist** — Feld für Feld, aus dem eingefügten Code:

| Feld | Engine-seitige Quelle |
|---|---|
| `litColour` | die Fragmentfarbe, die kurz vor dem Fog-Mix eingefangen wird (der Anker `bloxdSpLitColour`) — „before emission and fog“, wie der Header es formuliert |
| `directional` | `vTerrainLambert` — eine vertex-interpolierte Summe von `max(0, dot(normal, lightDirection)) × intensity` über die Richtlichter der Szene (Formel in §54); 0, wenn die Szene keine hat |
| `ambient` | `material.ambientAndCutoff.xyz × uniforms.sceneAmbient` — pro Material, pro Frame |
| `blockLight` | das `.rgb` des dekodierten Lichtlevel-Varyings (Dekodierung in §54) |
| `skyLight` | der Himmelskanal desselben Lichtlevel-Varyings — *"Voxel sky light, tone-mapped; 1 without BLOXD_LIGHTING"* (Header-Text) |
| `ambientLightColour` / `skyLightColour` | `uniforms.uAmbientLightColour` / `uniforms.uSkyLightColour` |
| `heldLight` | der Term des gehaltenen Lichts, gebaut aus dem w-Kanal des Lichtlevel-Varyings zusammen mit den Frame-Uniforms `uHeldLightPos` / `uHeldLightColour` ([Teil VII](07-internals.md) §26 dokumentiert Abfall und Kanal-Floor-Verhalten) |
| `fogColour` | `select(vec3f(0.0), uniforms.vFogColor, uniforms.vFogInfos.x != 0.0)` — **nur in einer Szene ganz ohne Fog schwarz** (Modus 0, §50) |
| `fogVisibility` | der geclampte Fog-Koeffizient — exakt der Wert, den die Funktion aus §50 zurückgibt |
| `position` / `normal` | die Varyings `vPositionW` / `vNormalW` (Normale pro Fragment renormalisiert) |
| `blockFlags` | das flache Varying `vBlockFlags` — vollständiger Übertragungsweg in §52 |

Zur Orientierung beim Lesen älteren Materials: Die identische Einfügearchitektur existierte im v2-Renderer, und die einzigen Integrationsunterschiede von v3 sind `vBlockId` → `vBlockFlags` und die hinzugekommenen Flüssigkeitsvarianten. Das Hook-System ist über den Bruch v2 → v3 hinweg architektonisch stabil.

## 50. Die Fog-Funktion: vier Modi, ein Feld

Wortgetreu aus dem Produktions-Terrain-Shader restauriert:

```wgsl
fn calcFogFactor(fogDistance: vec3f) -> f32 {
    var fogCoeff: f32 = 1.0;
    let fogStart   = uniforms.vFogInfos.y;
    let fogEnd     = uniforms.vFogInfos.z;
    let fogDensity = uniforms.vFogInfos.w;
    let dist = length(fogDistance);
    if (uniforms.vFogInfos.x == 3.0) {        // linear
        fogCoeff = (fogEnd - dist) / (fogEnd - fogStart);
    } else if (uniforms.vFogInfos.x == 1.0) { // exponentiell
        fogCoeff = 1.0 / pow(2.71828, dist * fogDensity);
    } else if (uniforms.vFogInfos.x == 2.0) { // exponentiell zum Quadrat
        fogCoeff = 1.0 / pow(2.71828, dist * dist * fogDensity * fogDensity);
    }                                          // 0.0 = Fog aus (Koeffizient bleibt 1.0)
    return clamp(fogCoeff, 0.0, 1.0);
}
```

- `vFogInfos = vec4f(mode, start, end, density)` — ein einziges vec4 steuert alles.
- **Im Shader existieren vier Modi: 0 = aus, 1 = exponentiell, 2 = exponentiell zum Quadrat, 3 = linear.** `fogVisibility` ist der geclampte Koeffizient, welcher Modus auch läuft — es gibt genau ein Feld, und kein Modus-Flag wird jemals an Pakete exponiert.
- Bloxds eigene Titel fahren Modus 3 (linear) mit dem 32-Block-Band aus [Teil VII](07-internals.md) §25 (`fogStart = 32 × D`, `fogEnd = 32 × (D + 1)`), daher beschreibt die Beobachtung „immer linear“ aus jenem Teil weiterhin das ausgelieferte Spielgeschehen. Die exponentiellen Modi sind jedoch echter, aktiver Engine-Code — ein Titel kann `vFogInfos.x` umschalten und die Rampe ohne jegliches Client-Update ändern. Distanzrezepte, die `distance(l.position, bloxdEyePosition())` selbst berechnen (Rezept R-B), sind der robuste Weg für distanzgetriebene Looks, da sie durch einen Moduswechsel nicht verschoben werden können.
- Damit ist die Frage „welche Fog-Rampe die Engine tatsächlich verwendet“ aus dem Quellcode geklärt: Alle vier sind implementiert; ausgelieferte Titel nutzen linear. (Dieselbe Funktion erklärt auch den fogColour-Kommentar des Headers — Modus 0 ist der einzige Fall, in dem `fogColour` schwarz ankommt, und Bloxds Spiele liefern nie Modus 0 aus; sie schieben den Fog stattdessen weit nach außen, [Teil VII](07-internals.md) §25.)

## 51. bloxdOpaqueBehind(): die exakte Implementierung

Die vollständige Funktion, wortgetreu aus dem Produktions-Build restauriert:

```wgsl
@group(3) @binding(1) var bloxdSpSceneDepth: texture_2d<f32>;
var<private> bloxdSpPixel: vec2i;
var<private> bloxdSpPositionW: vec3f;

fn bloxdOpaqueBehind() -> BloxdOpaqueBehind {
    let bloxdSpZ = textureLoad(bloxdSpSceneDepth, bloxdSpPixel, 0).r;
    if (bloxdSpZ <= 0.0) {
        return BloxdOpaqueBehind(false, vec3f(0.0), 0.0);
    }
    let bloxdSpEye = bloxdPackInputs.eyePosition;
    let bloxdSpScale = max(bloxdSpZ / (scene.view * vec4f(bloxdSpPositionW, 1.0)).z, 1.0);
    let bloxdSpBehind = bloxdSpEye + (bloxdSpPositionW - bloxdSpEye) * bloxdSpScale;
    return BloxdOpaqueBehind(true, bloxdSpBehind, distance(bloxdSpBehind, bloxdSpEye));
}
```

- **Die Tiefentextur liegt bei `@group(3) @binding(1)`** — Gruppe 3 ist die eigene Gruppe des Pakets: Binding 0 ist das 64-Byte-Uniform `bloxdPackInputs` (§41), Binding 1 ist diese Tiefentextur. Beide werden von der Engine bereitgestellt und können von deiner Seite nicht benannt werden.
- **Die Tiefentextur ist eine unfilterable-float-Ressource nur für Fragments.** Das Bind-Group-Layout registriert sie als `texture: { sampleType: "unfilterable-float" }` allein mit `GPUShaderStage.FRAGMENT`-Sichtbarkeit — genau deshalb baut `bloxdOpaqueBehind()` auf `textureLoad` (explizite Texel-Koordinaten, Mip-Level 0) statt auf `textureSample`: Hardware-Filterung ist bei dieser Textur schlicht nicht verfügbar.
- `z ≤ 0` bedeutet, dass die Tiefenprobe nichts getroffen hat (ferne Ebene / Himmel): `found = false`, und `position` / `distance` sind bedeutungslos — prüfe immer zuerst `found`.
- Die zurückgegebene Position ist ein **skalierter Strahlschnittpunkt**: Die opake Oberfläche wird bei `eye + (fragment − eye) × max(z / viewDepth, 1)` platziert. `distance` wird vom Auge zu diesem Punkt gemessen — für Wasseroberflächen-Pakete ist das effektiv „wie viel Wasser der Strahl durchquert hat, bevor er auf etwas Festes traf“, was tiefengetönte Wasserrezepte ohne zweiten Tiefenpuffer möglich macht.

## 52. blockFlags von Ende zu Ende: von der Registrierung bis zu deinem Hook

§42 erklärt, was die Bits bedeuten. Dieser Abschnitt ist der vollständige Weg, den ein Flag-Bit von der Blockregistrierung bis zu deinem Hook zurücklegt — jede Station aus der Produktionsquelle bestätigt, was zugleich die Aussage „the same across the face“ des Headers bis auf Byte-Ebene belegt.

**1. Registrierung (Blockdefinitions-Datenbank).** Die Flags jedes Blocks werden einmal bei der Registrierung berechnet:

```js
flags[id] = nameFlags                     // Regeln für Anzeigenamen (§42): Vegetation / Dirt / Sand / Gestein
          | (definition.opaque === true ? 1 : 0)   // Opak-Bit — Opazitätsdaten der Engine
          | (anyFaceEmission >= 1       ? 2 : 0);  // Emissions-Bit — Blocklicht-Emissionsdaten
```

Die Anzeigenamen-Regeln decken nur die vier Material-Bits ab; die beiden physikalischen Bits stammen aus separaten Engine-Daten — `opaque` direkt aus der Blockdefinition, `emissive` aus dem Emissionsarray für Blocklicht pro Fläche. Das „Glowing ores count, however faint“ des Headers ist wörtlich gemeint: Jede Fläche mit Emission ≥ 1 setzt das Bit.

**2. Pro Block → pro Material (Initialisierung des Meshers).** Terrain wird pro *Material* gezeichnet, nicht pro Block-ID, daher werden die Flags in eine Materialtabelle umtabelliert (ein `Uint16Array`, indexiert nach Material-ID; jedes Material übernimmt die Flags der ersten Fläche seines Besitzerblocks). Die Tabelle geht an den Meshing-Web-Worker — aber **nur in Konfigurationen, in denen die Paket-Pipeline aktiviert ist**; andernfalls ist die Tabelle `null` und es werden nie Flag-Bytes geschrieben. Spieler ohne Pakete zahlen konstruktionsbedingt null Overhead.

**3. In die Vertex-Bytes (Mesher-Worker).** Die Flags reiten in zwei freien Bytes der vorhandenen verschachtelten Vertex-Daten:

```js
addBlockFlagValues(buffer, stride, faceIndex, flags) {
    for (var base = 4*faceIndex*stride, v = 0; v < 4; v++) {
        var o = base + v*stride;
        buffer[o + colorOffset  + 3] = 255 & flags;   // niedrige 8 Bits → Alpha-Byte des Farbattributs
        buffer[o + normalOffset + 3] = flags >> 8;    // hohe 8 Bits → w-Byte des Normalenattributs
    }
}
```

Alle vier Vertices einer Fläche erhalten denselben Wert — die Bedeutung von „the same across the face“ auf Implementierungsebene.

**4. Dekodierung auf der GPU (Lite-Terrain-Shader).** Die zwei Bytes reisen als Vertex-Attribut `blockFlagWords: vec2u` (Location 7, nur vorhanden, wenn die Paket-Pipeline an ist) und werden in der Vertex-Stufe wieder zusammengesetzt:

```wgsl
vertexOutputs.vBlockFlags = ((vertexInputs.blockFlagWords.x >> 24u) << 8u)
                          |  (vertexInputs.blockFlagWords.y >> 24u);
```

`vBlockFlags` ist als `@interpolate(flat)` deklariert — pro Fläche konstant bis in die Fragment-Stufe, weshalb die Bittests aus §42 innerhalb einer Fläche stabil sind und nie einen Blend mitten in einer Fläche erzeugen können.

- Die Pipeline reserviert **16 Bits** Kapazität (diese Dekodierung setzt zwei volle Bytes zusammen), während v3 nur 6 definiert — künftige Flags können ohne weitere Vertex-Format-Änderung oder API-Sprung erscheinen.
- Im Packed-Vertex-Modus reisen dieselben zwei Bytes in `packed.y` und dem oberen Byte des Farbworts statt in einem dedizierten Attribut — gleiche Werte, anderer Container.
- Zur Blätter-gegen-Gras-Frage, zu der diese Flags am häufigsten befragt werden, siehe [Blätter ohne das Gras](#blätter-ohne-das-gras-die-frage-die-alle-stellen) unter §42.

## 53. Interna der Validierung: HEADER_VERSION, Signaturen, reservierte Namen

**Der gemessene Header-Hash.** Jede Paketvalidierung wird mit dem `HEADER_VERSION` der Engine gestempelt. Das Produktions-Validierungsmodul direkt auszuführen (siehe Harness-Hinweis am Ende von §54) misst ihn:

```
v2 (sjr0p7):  6.bc5e8338
v3 (3ymzdd):  6.5bc26a63   ← aus dem Live-Produktions-Bundle gemessen
```

Es ist ein FNV-1a-32-Hash (Präfix `6.`) über fünf Eingaben: den Engine-Header, vorverarbeitet und **pro Variante** tokenisiert (ein Eintrag für jede der 8 Varianten), das vollständige lexikalische WGSL-Universum des Parsers, die vier Makronamen, die Tabelle der Spezialfunktionen und die Deklaration `BloxdPackInputs` zusammen mit ihrer Uniform-Zeile `@group(3) @binding(0)`. Zwei Konsequenzen für Autoren:

- **Jede Header-Änderung auf Engine-Seite berechnet ihn neu** — das ist der Mechanismus hinter dem automatischen „muss erneut geprüft werden“, das gespeicherte Pakete nach Engine-Updates erhalten ([Teil VIII](08-apiv2.md) §31).
- Der Hash deckt den *Engine-Header* ab, nicht deinen Code. Ein Paket, das nach einem Engine-Update weiter lädt, ist nicht „noch gültig“ — es hat nur noch keine Header-Änderung ausgelöst. Die einzige Versionsprüfung, an der dein Manifest teilnimmt, ist das `apiVersion`-Gate (§40).

**Hook-Signaturprüfung: token-genau bei Typen, frei bei Namen.** Der Validator hält eine Signatur pro Hook-Slot:

```js
{
  vertex:  { params: [{ type: "BloxdVertexIn" }],                      returns: "BloxdVertex"  },
  surface: { params: [{ type: "BloxdSurfaceIn" }],                     returns: "BloxdSurface" },
  light:   { params: [{ type: "BloxdSurface" }, { type: "BloxdLightIn" }], returns: "BloxdLight" }
}
```

Der Abgleich erfolgt **Token für Token**: Parametertypnamen müssen exakt passen, `->` und der Rückgabetyp müssen exakt passen, und Parameteranzahl sowie Kommaplatzierung werden geprüft. Parameter*namen* sind frei — jeder Bezeichner an der Parameterposition wird akzeptiert, weshalb dein `fn bloxdTerrainLight(s, l)` kompiliert, obwohl das Template `(surface, light)` schreibt. Der Light-Hook nimmt genau zwei Parameter.

**Reservierte Namen.** Die Regel ist eine einzige Regex: `/^bloxd/i`. Jeder Bezeichner, der mit `bloxd` beginnt, ist reserviert — alles `bloxd*` wird von der Engine bereitgestellt, und ein Paket kann nicht in diesen Namensraum deklarieren (deshalb kollidieren auch die `bloxdPi` / `bloxdTau`-Neudeklarationen aus §44).

**Spezialfunktionen.** Genau eine ist in v3 registriert:

```js
["bloxdOpaqueBehind", { returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }]
```

„Spezial“ bedeutet *an ein Makro gebunden* — eine Engine-Funktion, deren Verfügbarkeit von einem Variantensymbol abhängt. Zwei Guard-Diagnosen erzwingen den korrekten Einsatz:

> `${vertexHook} reaches ${name}, which only surface and light hooks can use.` — ein Vertex-Hook erreicht eine Funktion, die nur Surface- und Light-Hooks nutzen können.
>
> `${hook} reaches ${name}, which needs ${symbol}, but this hook also runs on ${program}, which doesn't define it; guard the call with #ifdef ${symbol}.` — zum Beispiel terrain-seitiges `bloxdOpaqueBehind()` ohne `#ifdef BLOXD_SCENE_DEPTH`-Wrap.

**Der Engine-Header (Präludium), festgeschrieben.** Der v3-Header ist eine 5.637-Byte-Zeichenkette, die mit `// Engine-provided and read-only, prepended to all packs. apiVersion 3.` beginnt. Er trägt `#if` / `#ifdef`-Direktiven, die der WGSL-Präprozessor der Engine selbst pro Variante auswertet — die Engine führt tatsächlich die Auswertung von `#if`-Ausdrücken aus, und ein fehlerhafter Ausdruck endet mit `Cannot evaluate #if ...`. Jede Struktur, jede Funktionssignatur und jeder zitierte Kommentar in dieser Anleitung stammt aus diesem gerenderten Text, daher können Anleitung und ausgelieferter Header nicht auseinanderlaufen.

**Parser-Hinweise für Autoren.**

- Paketseitige Funktionen werden beim Verschmelzen in den Engine-Shader mit dem Präfix `pack_` umbenannt (Kollisionsvermeidung); Diagnosen führen sie auf deine ursprünglichen Namen zurück — derselbe Mechanismus, den [Teil VIII](08-apiv2.md) §38 für die zweite Validierungsstufe beschreibt.
- Die Meldung für nicht deklarierte Bezeichner lautet `'${name}' isn't declared. Packs can use their own names, WGSL built-ins and the Bloxd header.`; `_ can only be the target of a phony assignment, as in _ = f();` und `'${name}' is a WGSL keyword or reserved word, so it can't be a member name.` vervollständigen die neu bestätigte Menge.
- Das lexikalische Universum des Parsers enthält Bezeichner, die **kein Standard-WGSL** sind: `bufferView`, `bufferArrayView`, `bufferLength`, `atomicStoreMax`, `atomicStoreMin`. Die Engine kennt sie als Built-ins, aber ob die WGSL-Implementierung eines bestimmten Browsers sie bereitstellt, ist nicht garantiert — baue niemals ein Vertriebspaket darauf auf.

## 54. Bestätigte Konstanten, Limits und Layouts

Das vollständige Ressourcenlayout des Terrain-Programms, direkt aus dem Produktions-Lite-Renderer:

| Binding | Inhalt |
|---|---|
| `@group(0) @binding(0)` | `scene`: `LiteSceneUniforms` — `viewProjection` mat4x4f, `view` mat4x4f, `vEyePosition` |
| `@group(1) @binding(0)` | `uniforms`: `TerrainFrameUniforms` — `uHeldLightColour` / `uHeldLightPos`, `uSkyLightColour`, `uAmbientLightColour`, **`vFogInfos`**, `vFogColor`, `outputHeight`, `sceneAmbient`, **`uDirLights: array<vec4f, 4>`** |
| `@group(1) @binding(1)` | `chunks`: Storage `array<vec4f>` — xyz = Übersetzung in den Render-Frame, w = Sichtbarkeit beim Einblenden |
| `@group(2) @binding(0)` | `material`: `vDiffuseColor`, `ambientAndCutoff`, `emissiveAndLevel`, `anim` |
| `@group(3) @binding(0)` | `bloxdPackInputs` — das Paket-Uniform (§41) |
| `@group(3) @binding(1)` | `bloxdSpSceneDepth` — die Tiefentextur (§51) |

- **Richtlichter sind hart auf vier begrenzt.** Der Renderer bricht mit `Terrain supports 4 directional lights, not ${n}` ab, wenn eine Szene mehr registrieren will. `l.directional` ist die summierte Lambert-Beleuchtung über alle vorhandenen (0–4; Bloxds eigene Szenen nutzen 2 — [Teil VII](07-internals.md) §27). Terrain warnt außerdem über Lichter, die es nicht berücksichtigen kann, wortlautgetreu: ein nachträglich hinzugefügtes Licht — `Light "…" was added to the scene after startup; terrain and block models will ignore it. Add it in _initScene, alongside rendering.dirLights.`; ein getöntes — `Terrain directional light "…" is tinted (r, g, b); the per-vertex Lambert term carries one scalar per light and will render it as white.`; und ein mesh-filterndes — `Terrain directional light "…" filters which meshes it affects; the per-vertex Lambert term is written per material and cannot honour that, so terrain ignores it.`
- **Benennung des Terrain-Programms**: Pipeline-Cache-Keys lauten `terrain-{texture}{-anim}{-test}{-lit}-dir{dirLightCount}{-packed}{-sp{packVariant}}{-liquid}` — ein Paket erscheint als Suffix `-sp{variant}`, ein Programm pro Variante aus §46. Ein Watcher (`watchPipelineFailures`) gleicht Live-Pipeline-Namen gegen `/^terrain-.*?(-lit)?-dir\d+(?:-packed)?-sp(\d+)(?:-liquid)?$/` ab und prüft die passende Paketvariante erneut, wenn eine Pipeline-Kompilierung fehlschlägt; bei GPU-Device-Verlust (`device.lost`) wird die Prüfung übersprungen.
- **`BLOXD_TERRAIN_DIRECTIONAL` ist ein engine-internes Makro** (definiert, wenn dirLightCount > 0). Es ist *nicht* eines der vier aus dem Präludium und erreicht nie Paketcode — aber es erscheint in WGSL-Dumps der Engine-eigenen Shader, daher spart das Erkennen Verwirrung.
- **Dekodierung des Lichtlevels**: Das Vertex-Attribut `aPackedLightLevels` ist ein f32, das vier Nibbles packt, jeweils durch 15 geteilt: rgb = das farbige Blocklicht, a = der Himmel-/Handlicht-Kanal. Die Vertex-Stufe dekodiert es in das Varying `vLightLevels`; `blockLight` liest `.rgb`, der Himmel-/Handlicht-Kanal liest `.w`. Die Engine legt die rgb-Kanäle vor der Interpolation auf mindestens 35 % des hellsten Kanals — der engine-seitige Anker des Lifts, den [Teil VII](07-internals.md) §26 aus dem Gameplay dokumentiert.
- **`vTerrainLambert`** (die Quelle von `directional`, §49) wird als Summe über die aktiven Richtlichter erzeugt: `max(0.0, dot(vNormalW, uDirLights[i].xyz)) * uDirLights[i].w`, geschützt durch `BLOXD_TERRAIN_DIRECTIONAL`.
- **Indexpuffer werden beim ersten großen Mesh 32 Bit breit.** Der Lite-Renderer wählt `Uint16Array`-Indizes nur, solange jeder Indexwert ≤ 65.534 bleibt — sobald ein Index 65.535 erreicht, wird der Puffer ein `Uint32Array` (pro Puffer über ein `is32Bits`-Flag verfolgt). Praktisch: Ein Chunk-Mesh mit höchstens 65.535 Vertices passt in 16-Bit-Indizes; eines mit genau 65.536 Vertices erzeugt zwangsläufig einen Index von 65.535 und schaltet den ganzen Puffer auf 32 Bit.
- **Details des Manifest-Ladens**: Zip-Einträge unter `__MACOSX/`, Dateien mit Präfix `._` und `.DS_Store` werden herausgefiltert (macOS-Archivrauschen); `pack.json` wird per kleingeschriebenem Pfadvergleich gefunden — null Treffer → `loadNoManifest`, zwei oder mehr → `loadDuplicateManifest`; das Lesen des Manifests ist auf 65.536 Bytes begrenzt.
- **Wie all das verifiziert wurde**: Die Module des Produktions-Bundles wurden restauriert (165 Chunks; die webpack-Registry zählt in diesem Bundle 4.951 Module — die Modulzahl verschiebt sich um einige, je nachdem ob asynchrone Kind-Abhängigkeiten mitgezählt werden, daher die exakte Zahl als bundle-spezifisch behandeln) und in einem webpack-kompatiblen Harness unter Node.js ausgeführt. Der gemessene `HEADER_VERSION` (§53), der gerenderte 5.637-Byte-Header, die kanonische Reihenfolge der Variantentabelle und die Tabelle der Spezialfunktionen stammen alle aus *der Ausführung des ausgelieferten Codes*, nicht aus dem Lesen von Zeichenketten. Derselbe Harness ist der natürliche Kern für ein Community-`pack_check` v6 — den Validator der Engine selbst gegen ein Paket auszuführen reproduziert exakt seine Ergebnisse.

---

Recherchiert von ltf_ahel (recherchiert mit glm)

[← Vorheriger Teil](08-apiv2.md)·[Zurück zum Handbuch](README.md)

[Zurück zum Handbuch](README.md)·[Nächster Teil →](02-api.md)

# Teil I: Pakete erstellen

> Das aktuelle Spiel verlangt seit dem 2026-10-26 `apiVersion: 4` und lehnt v1/v2/v3-Pakete beim Laden ab — der folgende Inhalt ist auf der v2-Spezifikation geschrieben. Siehe [Teil IX](09-apiv3.md) und [Teil X](10-apiv4.md) zum Migrieren vor der Verteilung.

## 1. Überblick und Voraussetzungen

- Shader-Pakete sind **nur für den WebGPU-Renderer**. Solange ein Paket installiert ist, wird der WebGPU-Renderer in den Einstellungen zwangsweise aktiviert
- Pakete werden in einer **eingeschränkten WGSL-Untermenge** geschrieben. Sie betreffen nur das Aussehen von **Terrain und Flüssigkeiten**
- Möglich: Farben, Transparenz und Emission ändern; Beleuchtung neu aufbauen; projektionsartige Schatten (R9.12); Vertex-Animation (nur in bestimmten Spielen)
- Nicht möglich: eigene Texturen hinzufügen, Post-Processing (Bloom etc.), pixelgenaue mit der Sonne rotierende Schatten (Shadowmaps) oder echte Reflexionen (SSR), Himmel oder Entities beeinflussen (Sampling des bestehenden Block-Textur-Atlas ist **seit v4 möglich** — `bloxdTexel`, [Teil X](10-apiv4.md) §57)
- Möglich (wird aber leicht übersehen): **projektionsartige Schatten mit `skyLight` (Voxel-Himmelsverdeckung)** — Bereiche unter Bäumen und Dächern deutlich abdunkeln (R9.12). Blöcke zu zerstören lässt die LightEngine sofort neu berechnen, Schatten folgen also in Echtzeit
- **Die meisten Spiele laufen im Strict-Modus** (keine Vertex-Animation, kein `discard`). Pakete für die allgemeine Verteilung bitte strict-tauglich gestalten

## 2. Schnellstart

1. Ordner anlegen, `pack.json` und `.wgsl`-Dateien hineinlegen
2. Zip oder Ordner über Spieleinstellungen → Shader Pack laden
3. Fehler beheben und neu laden (siehe [Teil V](05-troubleshooting.md))
4. In unterstützten Spielen testen
5. Fertig zippen und verteilen

## 3. Paketstruktur

- **Vertriebsform**: eine einzelne `.zip` oder ein Ordner (Ordnerladen nur in Desktop-Browsern)
- **Inhalt**: eine `pack.json` (oberste Ebene des Pakets; Groß-/Kleinschreibung egal) + 1–256 `.wgsl`-Dateien
- Mehrere `.wgsl` werden verkettet und als ein Modul behandelt, Aufteilen und Unterordner sind also frei. Keine Dateinamen-Einschränkungen. Die Verkettung erfolgt in **Wörterbuch-Reihenfolge nach Eintrags-(Pfad-)Namen** (Modul-Scope-Deklarationen sind reihenfolgeunabhängig, deshalb stört das normalerweise nicht — es beißt nur Code, der von der `var`-Initialisierungsreihenfolge abhängt). Nicht-`.wgsl`-Dateien (READMEs etc.) werden ignoriert
- Zip-Tipp: Liegt alles unter einem gemeinsamen Wurzelordner, wird dieses Präfix automatisch abgestreift (macOS-„Komprimieren"-Zips funktionieren direkt; OS-Müll wie `__MACOSX`, `._`-Präfixe und `.DS_Store` wird automatisch ausgeschlossen). Fremddateien auf Root-Ebene brechen aber die Top-Level-Erkennung; am sichersten in den Ordner gehen und `pack.json` plus `.wgsl` direkt packen (prüfen, dass `pack.json` im ZIP-Root landet)

| Punkt | Limit |
|---|---|
| Zip-Größe / Einträge | 32MB / 1024 |
| pack.json-Größe | 64KB, UTF-8 |
| .wgsl gesamt | 256KB, UTF-8 |
| Zip-Format | zip64, geteilte und verschlüsselte Zips werden abgelehnt. Kompression: nur store / deflate. Doppelte Pfade nicht erlaubt |

## 4. pack.json

```json
{
  "apiVersion": 3,
  "name": "My Pack",
  "author": "your name"
}
```

| Feld | Pflicht | Beschreibung |
|---|---|---|
| `apiVersion` | Pflicht | Muss exakt `3` sein. `1`/`2`-Pakete werden beim Laden mit `shaderPack:loadWrongApiVersion` abgelehnt — Migration: [Teil IX](09-apiv3.md) |
| `name` | Pflicht | Nicht leer. Wird in der Einstellungs-UI angezeigt |
| `author` | optional | Darf fehlen. Nicht-String-Werte (Zahlen etc.) sind Fehler |

Andere Felder werden ignoriert.

## 5. Minimalvorlage

Funktionsfähiges Paket mit nur `pack.json` (Abschnitt 4) und diesem `pack.wgsl`:

```wgsl
// Minimalpaket mit leichtem Warmton
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    #ifdef BLOXD_ALPHA
    out.alpha = s.alpha;
    #endif
    return out;
}
```

Zu befolgende Regeln:

- Ausgabe-Structs **nie direkt konstruieren** (`BloxdSurface(...)` ist ein Fehler). Immer von `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` / `bloxdDefaultVertex(v)` ausgehen und Felder ändern. Ausnahme: Der erste Light-Hook-Parameter (`s: BloxdSurface`) hat den Ausgabe-Typ, also geht auch `var out = s;`
- Uninitialisiertes `var x: BloxdSurface;` (nur Typ-Annotation) ist ebenfalls ein Fehler
- Hook-Parameter sind **schreibgeschützt**. Zum Ändern erst kopieren, z. B. `var sv = s;`
- Das Präfix `bloxd_` darf nicht für eigene Bezeichner verwendet werden (außer den 6 Hook-Namen)
- Konstanten mit `const` schreiben (`#define` kann keine Werte halten)

## 6. Die 6 Hooks

Alle optional. Signaturen müssen typgenau übereinstimmen (Parameternamen frei).

| Hook | Rolle |
|---|---|
| `fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex` | Terrain-Vertex-Animation. **Im Strict-Modus nicht verfügbar** |
| `fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface` | Terrain-Farbe, Transparenz, Emission. `s.colour` ist Textur × Vertex-Farbe |
| `fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight` | Terrain-Endfarbe. Wird in der **letzten Fragment-Stufe** aufgerufen, der Rückgabewert wird unverändert zur Endfarbe |
| `fn bloxdLiquidVertex / bloxdLiquidSurface / bloxdLiquidLight` (gleiche Formen) | Flüssigkeits-Versionen. `alpha` wirkt als Flüssigkeitstransparenz |

Fallback-Regeln:

- Ohne Liquid-Hook wird **der gleichnamige Terrain-Hook verwendet** (nie umgekehrt). Nur surface zu schreiben wirkt auch auf Flüssigkeiten
- Ohne Light-Hook gilt das Standardverhalten (`engineColour + emission × fogVisibility`)
- Wer `engineColour` verwirft und aus der Basisfarbe neu aufbaut, muss den Fog selbst neu anwenden: `mix(l.fogColour, col, l.fogVisibility)`. Emission beim Addieren erst mit `fogVisibility` multiplizieren

## 7. 8 Varianten und Guards

Ein Code wird geschrieben, muss aber in allen **8 Kombinationen aus {strict, allow} × {Licht an, Licht aus} × {Terrain, Flüssigkeit}** kompilieren.
Nur `#define` (nur Flag, keine Werte) / `#ifdef` / `#ifndef` / `#else` / `#endif` verfügbar. `#` muss am Zeilenanfang stehen (auch in Funktionen ok).

| Guard | Bedeutung | Verwendung |
|---|---|---|
| `#ifndef BLOXD_STRICT` | Nur außerhalb von strict (allow) | Umschließt den ganzen Vertex-Hook und `discard` |
| `#ifdef BLOXD_LIGHTING` | Nur bei eingeschaltetem Licht | Umschließt Code mit `blockLight`, `skyLight`, `ambientLightColour` etc. **Gemeinsame Hilfsfunktionen (Modul-fn) als ganze Funktion umschließen** (nur die Aufrufstelle zu schützen reicht nicht) |
| `#ifdef BLOXD_ALPHA` | Wenn das `alpha`-Feld existiert (Flüssigkeiten immer, Terrain nur in allow) | Umschließt Code mit `alpha` |

## 8. Verfügbare Sprachfeatures und Verbote

Verfügbar:

- WGSL-Builtin-Funktionen (`sin`, `mix`, `clamp`, `distance`, `smoothstep`, `reflect`, `select` etc.)
- Eigene `fn` / `struct` / `const` / `alias` / `var<private>`, dazu `let` und Kontrollfluss (if/for/while/switch etc.) in Funktionen
- Ableitungen (`dpdx` / `dpdy` / `fwidth`) nur in Surface-/Light-Hooks (Fragment-Stufe). Nicht in Vertex
- `const`-Arrays (z. B. Farbpaletten-LUTs), Pointer (`ptr<function, T>`), Matrizen (`mat3x3f` etc.)
- Flag-Definitionen `#define NAME` + `#ifdef`-Verzweigung

Verbote / Vorsicht:

- **Keine Texturen**: `texture_*`- / `sampler`-Typen unbenutzbar. Details prozedural mit Hash-Rauschen etc. bauen
- **`discard` im Strict-Modus verboten** (mit `#ifndef BLOXD_STRICT` umschließen)
- `@attribute` / `enable` / `requires` / `override` verboten. Da `enable f16;` nicht schreibbar ist, sind **f16-Typen faktisch unbenutzbar**
- Auch `@builtin`-Attribute verboten, daher `fragCoord` (Bildschirmkoordinaten) und `vertex_index` nicht lesbar
- **Kein `let` auf Modulebene** (`const` oder `var` verwenden)
- `atomic` unbenutzbar
- Koordinaten sind noa-lokal. Für Weltkoordinaten `bloxdOriginOffset()` addieren. Blockkoordinaten sind `bloxdFaceBlock(position, normal)`

## 9. Prüfung, Test und Verteilung

Beim Laden laufen diese Prüfungen der Reihe nach:

1. Loader-Limit-Prüfungen (Limits aus Abschnitt 3)
2. Statische Kompilierung (alle 8 Varianten)
3. Echte Kompilierung im Browser-WebGPU (die statische Prüfung typprüft nicht vollständig; mancher Code fällt erst hier – Fallen aus Abschnitt 8 meiden)

Schritte:

1. Zip / Ordner über Einstellungen → Shader Pack laden
2. Status prüfen. Direkt nach der Auswahl erscheint "Ready. Reload the page to use it." — nach dem Neuladen der Seite bedeutet "Ready to use" Erfolg. Bei "Saved, but it won't run until you fix these errors..." die gelisteten Fehler (Datei:Zeile + Variante) beheben und neu laden
3. Seite neu laden zum Aktivieren. Renderer-Overrides in URL-Parametern oder localStorage vorher entfernen, sonst verweigert das Paket den Start
4. Erst in permissiven Spielen testen, dann in strikten Spielen (die Mehrheit). Vertex-Animation geht nur in Allow-Spielen
5. Zum Verteilen mit `pack.json` obenauf zippen (innerhalb der Abschnitt-3-Limits). Das Paket lässt sich auf derselben Seite ersetzen, wirkt aber erst nach einem Seiten-Neuladen (Schritte 2–3); Remove Pack löscht es. Re-Validierung nach Spiel-Updates läuft beim Seitenladen automatisch

[Zurück zum Handbuch](README.md)·[Nächster Teil →](02-api.md)

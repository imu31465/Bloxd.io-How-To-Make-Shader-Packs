# Forschungslog

> Status: Verified — wie die Messungen dieser Dokumentation gewonnen wurden

Die technischen Aussagen hier ruhen nicht auf offizieller Entwickler-Dokumentation, sondern auf **Produktions-Bundle-Analyse**. Diese Seite hält Methodik und Evidenz fest, damit künftige Builds nachverifiziert werden können.

## Kernprinzipien

1. **Direkter Produktions-Bundle-Abgriff** — rohe main.js und Chunks aus Produktion und Preprod geholt, Identität per md5 verifiziert
2. **Wortwörtliche Wertschätzung** — Header, Fehlermeldungen und i18n-Strings werden **wie vorliegend zitiert**, nie paraphrasiert
3. **Reproduzierte Messung** — abgeleitete Werte wie die Registry werden neu berechnet, indem die eigenen Module der Engine in einem Harness laufen (echte Ausgabe, keine nachgebaute Re-Implementierung)
4. **Benannte Builds** — jede Messung trägt Build-id und Datum

## Build-Historie, auf die sich diese Dokumentation bezieht

| Build | API | Datum | Hinweis |
|---|---|---|---|
| `szby6g` | v3-Ära | 2026-10-17 | erste allow/strict-Staticanalyse (111 Spieldefinitionen) |
| `3ymzdd` | v3 | 2026-10-20 | der Evidenz-Build des v3-Leitfadens |
| `sjr0p7` | v3-Ära | 2026-10-17 | Drift-Vergleichsbasis |
| `cnty9` | v4 | 2026-10-27 | Evidenz des v4-Leitfadens & des 905-Namen-Katalogs |
| `6pf78` / `tcwczu` | v4 | 2026-10-31 | v4-Freeze-Bestätigung (Halloween-Event + Skyblock-Rework) |
| `ab90qa` | **v5** | 2026-11-03 | v5-Start-Build; ursprüngliche v5-Basislinie. prod = preprod (md5 `fc3322212d15be2445c0e8dfc9733fcc`) |
| `xkg8x` | **v5** | 2026-11-04 | Registry-Drift (+10 Namen); preprod `2lcqcl` auf jeder Shader-Pack-Oberfläche identisch gemessen |
| `bny9u` | **v5** | 2026-11-05 | ; Baseline dieser Dokumentation. prod = preprod (md5 `60eea80ec48253b7ac6cc45604dc8273` auf dem Haupt-Bundle, live von beiden Hosts geladen) |
| `v98qt8` | **v5** | 2026-11-08 | **aktuell**; Baseline dieser Dokumentation. prod = preprod (md5 `7458fd47ff88331d9f451d1456ff48ac`). Registry-Drift (netto −5), Spiele 115 → 116, und die **Texturkonstanten-Faltungs-Regression** ([Texture registry](texture-registry.md#the-v98qt8-folding-regression)) |

## Kern-Methodik

### Engine-Header-Restaurierung

Rendern der c55-Header-Vorlage mit ihren Live-Interpolationen (`${vC}` = apiVersion, die 5 Uniform-Lesezugriffe über `${Gq.j}`) — 6 Interpolationen auf v5 ([Engine-Header](engine-header.md)).

### Textur-Registry-Neuberechnung

Laufenlassen des Registry-Bau-Moduls der Engine (29812, getragen von den Chunks 52/53/54) gegen die Texturdaten (Datenmodul 1351 im Haupt-Bundle) gegen die Texturdaten des ausgelieferten Block-Registry in einem Mini-Webpack-Harness; Aufzeichnen der Ausgabe (named 911 / aliases 424 / Atlas 1.232 auf dem aktuellen Build `bny9u`, 2026-11-05 — Modul 29812 + Datenmodul 1351; 906 / 416 / 1.220 auf `xkg8x` via Module 30093 + 1391; 896 beim v5-Start) ([Textur-Registry](texture-registry.md)).

Die Animationsintervalle stammen aus der `animDataPerTex`-artigen Tabelle (pro Layer `numAnimStates` / `animationInterval`) — es existieren nur drei Intervallwerte: 200 / 250 / 300 ms ([der Katalog](../api/texture-catalog.md#animationsfamilien-43-namen)).

### Fehlermeldungs-Erfassung

Loader-Meldungen wortwörtlich aus dem Live-i18n-Wörterbuch; Validator-Meldungen aus den String-Literalen des Validierungsmoduls.

### allow / strict-Staticanalyse

Statische Analyse aller 111 Spieldefinitionen: `shaderPackPolicy`-`"allow"`-Literale — 8 direkte + 4 Basis-Variable = 12 Titel (26 Einträge), Spread-Vererbung (`{...tb,...}`) ebenfalls verfolgt ([Policy](policy.md)).

### Uniform-/Pipeline-Restaurierung

Das `BloxdPackInputs`-Feld-Layout aus dem Uniform-Layout-Modul (29838); der 3-Varianten-Textur-Codegen aus dem WebGPU-Generator (c56) ([Textur-Sampling](texture-sampling.md)).

## Drift-Beobachtungen

| Vergleich | Zeitraum | Ergebnis |
|---|---|---|
| sjr0p7 → cnty9 | 10 Tage | 98 hinzugekommen, 79 entfernt; 779/1121 Namen änderten die id (69 %) |
| cnty9 → ab90qa | 7 Tage | +1 (`scorpion_eggs`), −10 (Doppel-Truhe ×8, Spawner-Seiten ×2); 334/905 Namen änderten die id |
| ab90qa → xkg8x | 1 Tag | +10 (alle v5-Start-Entfernungen kehrten zurück: Double-Chest ×8, Spawner-Seiten ×2); 376/896 Namen änderten die id; keine entfernt |
| xkg8x → bny9u | 1 Tag | +5 (Trading Terminal ×3, Stone Generator ×2); 864/906 Namen änderten die id (95 %); keine entfernt; Animationsfamilien 42 → 43 |
| bny9u → v98qt8 | 3 days | +1 `hay_block_top`, −6 (Furnace/Workbench/Artisan Bench became models); 716/905 names changed id (79%); families unchanged; **folding regression** — engine resolves 1,047 unfolded names |

## Unverifiziert / spekulativ

- Pixelgenaue Shadow-Maps als „geplante Zukunft“ sind eine **Interpretation** (abgeleitet aus dem unbenutzten `var shadow: f32 = 1.;` in der Beleuchtungs-Vorlage)
- Die allow/strict-Aufteilung kann sich pro Build ändern (12-Titel-Identität auf ab90qa und xkg8x nachbestätigt; künftige Spiele unbekannt)
- `bloxdFragmentBlockPosition` (aus dem v5-Header): Signaturentabellen-Eintrag und Laufzeit-Injektion beide live bestätigt — Aufrufe validieren und kompilieren; ob das Engine-Team ihn behalten will, ist unbekannt

## Wann neu zu verifizieren ist

Beim Erkennen eines Spiel-Updates (ein neuer main.js-Hash): den Header (9.125 B) prüfen, die apiVersion-Konstante, die Registry neu berechnen und die allow/strict-Liste erneut bestätigen. Die detaillierte Monitoring-Methodik liegt außerhalb des Umfangs dieser Dokumentation, aber die oben genannten Modul-Orte (c55 / c116 / c56) waren die Ausgangspunkte — auf `bny9u`: Header/apiVersion-Modul 29815 und Validatormodule in Chunk c56, Loader (Zip/Manifest/Limits) Modul 32942 in Chunk c54, Registry-Builder 29812 in den Chunks c52/c53/c54, WebGPU-Codegen Chunk c57, Standard-Pack-Vorlage Modul 33350 in Chunk c122, Spiele-/Policy-Modul 517 im Haupt-Bundle.

## Verwandte Seiten

- [Engine-Daten](engine-data.md) · [Textur-Registry](texture-registry.md) · [Versionsgeschichte](../history/)

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
| `ab90qa` | **v5** | 2026-11-03 | **aktuell**; die Basislinie dieser Dokumentation. prod = preprod (md5 `fc3322212d15be2445c0e8dfc9733fcc`) |

## Kern-Methodik

### Engine-Header-Restaurierung

Rendern der c55-Header-Vorlage mit ihren Live-Interpolationen (`${vC}` = apiVersion, die 5 Uniform-Lesezugriffe über `${Gq.j}`) — 6 Interpolationen auf v5 ([Engine-Header](engine-header.md)).

### Textur-Registry-Neuberechnung

Laufenlassen der Registry-Bau-Module der Engine (29833 + 1371 + 1391 + 1384 + 219) gegen die Texturdaten des ausgelieferten Block-Registry in einem Mini-Webpack-Harness; Aufzeichnen der Ausgabe (named 896 / aliases 416 / layers 228) ([Textur-Registry](texture-registry.md)).

Die Animationsintervalle stammen aus der `animDataPerTex`-artigen Tabelle (pro Layer `numAnimStates` / `animationInterval`) — es existieren nur drei Intervallwerte: 200 / 250 / 300 ms ([der Katalog](../api/texture-catalog.md#animationsfamilien-42-namen)).

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

## Unverifiziert / spekulativ

- Pixelgenaue Shadow-Maps als „geplante Zukunft“ sind eine **Interpretation** (abgeleitet aus dem unbenutzten `var shadow: f32 = 1.;` in der Beleuchtungs-Vorlage)
- Die allow/strict-Aufteilung kann sich pro Build ändern (12-Titel-Identität auf ab90qa nachbestätigt; künftige Spiele unbekannt)
- `bloxdFragmentBlockPosition` (aus dem v5-Header): Signaturentabellen-Eintrag und Laufzeit-Injektion beide live bestätigt — Aufrufe validieren und kompilieren; ob das Engine-Team ihn behalten will, ist unbekannt

## Wann neu zu verifizieren ist

Beim Erkennen eines Spiel-Updates (ein neuer main.js-Hash): den Header (9.125 B) prüfen, die apiVersion-Konstante, die Registry neu berechnen und die allow/strict-Liste erneut bestätigen. Die detaillierte Monitoring-Methodik liegt außerhalb des Umfangs dieser Dokumentation, aber die oben genannten Modul-Orte (c55 / c116 / c56) sind die Ausgangspunkte.

## Verwandte Seiten

- [Engine-Daten](engine-data.md) · [Textur-Registry](texture-registry.md) · [Versionsgeschichte](../history/)

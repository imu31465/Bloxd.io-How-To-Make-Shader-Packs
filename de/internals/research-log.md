# Forschungsnotizen

> Status: Analyzed

Diese Seite erläutert, wie technische Hinweise zur Spielimplementierung einzuordnen sind. Interne Abläufe sind kein öffentlicher API-Vertrag und können sich mit Spielupdates ändern.

## Grundsätze der Untersuchung

1. **Beobachtbares Verhalten prüfen** — Dokumentation mit der Validierung im Spiel und dem Laufzeitverhalten abgleichen.
2. **Implementierung und API trennen** — zwischen Funktionen für Shader-Packs und rein internen Engine-Mechanismen unterscheiden.
3. **Erkenntnisgrundlage nennen** — bei dokumentierten Werten und Abläufen angeben, welcher Engine-Vorgang zugrunde liegt.
4. **Vermutungen nicht als Fakten darstellen** — Beobachtungen, Interpretationen und offene Fragen getrennt halten.
5. **Beobachtungszeit nicht als Veröffentlichungszeit ausgeben** — eine Prüfung während einer Untersuchung belegt nicht, wann eine Funktion bereitgestellt wurde.

## Referenzseiten

| Seite | Inhalt |
|---|---|
| [Engine-Header](engine-header.md) | Typen, Funktionen und Konstanten für Packs |
| [Shader-Validierung](shader-validation.md) | Regeln zur Pack-Validierung |
| [WGSL-Kompilierung](wgsl-compilation.md) | Kompilierungsverhalten |
| [Textur-Registry](texture-registry.md) | Auflösung und Sampling von Textur-Namen |
| [Richtlinien pro Spiel](policy.md) | Einschränkungen einzelner Spiele |
| [Engine-Datenübersicht](engine-data.md) | Für Packs sichtbare API |

## Grenzen

- Interne Funktionen und Datenstrukturen sind nicht garantiert dauerhaft verfügbar.
- Bundle-Aufbau und interne Kennungen sind kein Teil der API-Spezifikation.
- Verwende dokumentierte Pack-APIs statt privater Implementierungsdetails.

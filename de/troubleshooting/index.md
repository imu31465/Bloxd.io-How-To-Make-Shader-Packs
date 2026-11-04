# Fehlerbehebung

Fehler und visuelle Probleme, **nach Symptom** auffindbar. Die Seiten folgen der Struktur: Symptom → Ursache → Prüfen → Fix → Vorbeugen.

## Symptom-Index

| Symptom | Seite |
|---|---|
| Paket lädt nicht / Zip- & pack.json-Fehler | [Ladefehler](loading.md) |
| `apiVersion`-Meldungen / alte Pakete laufen nicht | [API-Versionsfehler](api-version.md) |
| Kompiliert nicht / `must be declared as` / WGSL-Syntax | [Kompilierfehler](compilation.md) |
| Validierungsfehler (reservierte Namen, strict-Vertrag, `reaches`) | [Validierungsfehler](validation.md) |
| Scheitert nur in manchen Varianten / in strict-Spielen rausgeworfen | [Varianten-spezifische Probleme](variants.md) |
| Sieht falsch aus (weißer Dunst, keine Schatten, seltsame Nacht) | [Visuelle Probleme](visual.md) |
| Texturnamen-Fehler / `did you mean` | [Textur-Probleme](textures.md) |
| Helligkeits-/Schatten-/Fog-Probleme | [Beleuchtungsprobleme](lighting.md) |
| Modell-/Entity-/Enchant-Probleme | [Modell-Probleme](models.md) |
| Langsam / von der Geräte-Prüfung rausgeworfen | [Performance](performance.md) |
| Rechtliches, Sicherheit, häufige Fragen | [FAQ](faq.md) |

> Ziel-API: 5 · Ziel-Build: `xkg8x` (2026-11-04, Produktion) · Status: Verified (Meldungen wortwörtlich aus dem Live-Validator & Loader aufgezeichnet)

## Wo Fehler erscheinen

1. **Statuszeile unter Einstellungen → Shader Pack** — Fehler der Loader-Stufe (ids sind `shaderPack:load*`)
2. **Die Fehlerliste des Loader-Bildschirms** — Validierung & Kompilierung (Datei:Zeile + Variante)
3. **Browser-Devtools-Konsole** — Laufzeit- & Stufe-2-Fehler (WGSL-Compiler des Browsers)

Die 3-stufige Ladeprüfung steht detailliert in [Erste Schritte: Validierung](../getting-started/validation.md).

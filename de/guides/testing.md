# Checkliste für Tests im Spiel

> Ziel-API: 5 · Ziel-Build: `ab90qa` (2026-11-03, Produktion) · Status: Verified (auf die aktuelle API portiert — Prüfung auf dem Gerät empfohlen)

Kompiliererfolg und „gutes Aussehen" sind verschiedene Dinge. In dieser Reihenfolge prüfen:

1. **Laden:** `pack.json` im ZIP-Root. Direkt nach der Auswahl erscheint `Ready. Reload the page to use it.` und das Paket wird **beim Neuladen der Seite** aktiv; danach `Ready to use` bestätigen. Gespeicherte Pakete werden beim nächsten Seitenladen automatisch revalidiert: Wann immer sich der engine-seitige Spec-Header aktualisiert, wird der Header-Inhalt per Fingerprint geprüft (bestanden = bleibt unverändert aktiv / fehlgeschlagen = wird als blockiert angezeigt) — ein defektes altes Paket bleibt also nie still aktiv.
2. **6 Varianten:** keine Typ-Guard-Lücken in strict / allow, Licht an / aus, Terrain / Flüssigkeit. Auch wenn ein Spiel nur manche Bedingungen nutzt, sollten Vertriebspakete alle 8 annehmen.
3. **Tag:** Farben pro Material nicht ausgebrannt (Gras, Stein, Sand, Holz); natürlicher Hell/Dunkel-Sprung zwischen Oben und Seiten.
4. **Nacht:** dieselben Materialien im einstigen Tageslicht, Schatten und Fackelnähe vergleichen. Bleiben nur beleuchtete Flächen, Belichtungsdämpfung tunen; wird alles dunkel, lokalen Lichtschutz tunen.
5. **Wasser:** von oben, streifende Winkel, Ufer, unter Wasser und nachts getrennt ansehen. Alpha-Verhalten und Unterwasser-Look hängen vom Spiel-Compositing ab — nie von einem Blickwinkel urteilen. Unter Wasser deckt der Flüssigkeitsdefinitions-Schleier vorne ab (siehe [Was Shader-Pakete können und was nicht](constraints.md#unterwasser-realität)), sodass Paket-Unterschiede vor allem an Oberfläche und Terrain hinterm Schleier zeigen.
6. **Ränder und Ferne:** keine Wellen-/Mustersprünge an Chunk-/Ursprungsübergängen; kein Doppel-Fog und kein weißer Dunst in der Ferne.
7. **Performance:** fragment-schwere Hash/Trig/`pow`-Effekte minimal. Details schrittweise dazugeben und FPS vergleichen.

## Bekannte Einschränkungen als Prämissen

- Pakete beschränken sich auf Terrain-/Flüssigkeits-Hooks — kein Himmel, keine Entities, keine UI mit demselben Code.
- Keine Inputs, um Shadowmaps, Screen-Space-Reflexionen, Refraktion, Bloom etc. hinzuzufügen (Szenentiefe ist nur in Flüssigkeiten als `bloxdOpaqueBehind()` freigegeben — siehe [Funktionen](../api/functions.md)).
- `bloxdSeconds()` ist Animationszeit ohne garantierte Bindung an Tag/Nacht im Spiel.
- Bei `bloxdSunDirection()`-null ist die wahre Mondrichtung unbekannt, keine „Mondlichtphysik" sondern Stimmungsnäherung. Gerichtetes Mondlicht baut man aus `-bloxdSunDirection()` (nur Welten mit Tag/Nacht-Zyklus — [Sonne und Mond](../internals/sun-and-moon.md)).
- `s.position` / `l.position` sind lokale Koordinaten: `bloxdRenderOffset()` für weltabhängige Effekte addieren. Für blocklokale Muster sind lokale Koordinaten bewusst das Werkzeug.

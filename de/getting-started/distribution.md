# Vertrieb

> Ziel-API: 5 · Status: Verified

## Release-Format

1. Zip mit `pack.json` im Root, innerhalb der Größenlimits ([Pack-Struktur](pack-structure.md))
2. Prüfen, dass `pack.json` am Zip-Root liegt (ein einzelner gemeinsamer Wurzelordner wird automatisch abgeschnitten)
3. `name` / `author` für den Release polieren

## Checkliste vor dem Release

- [ ] `apiVersion: 5` (Zahl, kein String)
- [ ] Alle 6 Varianten bestehen die Validierung (leere Fehlerliste auf dem Loader-Bildschirm)
- [ ] Visuell verifiziert in einem allow-Spiel und einem strict-Spiel
- [ ] Vertex-Animations- / `discard`-Pakete klar als allow-only markiert
- [ ] Getestete Spiele und Datum in den Release-Notes vermerkt (Builds ändern sich)

## Nach dem Release

- Von Spielern gespeicherte Pakete revalidieren automatisch, wenn Engine-Header oder Textur-Registry sich mit einem Spiel-Update ändern
- **Als v1–v4 vertriebene Pakete werden auf v5 still deaktiviert** (siehe [pack.json](manifest.md)) — Spieler sehen nur die Statuszeile, also eine aktualisierte Version veröffentlichen und ankündigen
- Wenn sich die API aktualisiert: den Migrationsschritten der [Versionsgeschichte](../history/) folgen, Version anheben und neu veröffentlichen

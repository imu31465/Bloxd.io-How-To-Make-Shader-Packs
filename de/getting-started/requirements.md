# Voraussetzungen

> Ziel-API: 5 · Status: Verified

## Browser

Shader Packs laufen nur auf dem WebGPU-Renderer. Du brauchst einen WebGPU-fähigen Browser:

- Chromium-basierte Browser (Chrome / Edge / Opera etc.) — auf dem Desktop stabil
- Safari 17+ / Firefox (die WebGPU-Unterstützung hängt von Browser und Version ab)
- **Mobil**: WebGPU-Support kann auf iOS / Android beschränkt sein. Erwähne das auf der Release-Seite deines Pakets

Während ein Paket installiert ist, ist die Spiel-Einstellung für den WebGPU-Renderer automatisch aktiviert.

## Entwicklungsumgebung

Keine spezielle Toolchain nötig, aber das hier hilft:

- Ein Texteditor (WGSL-Syntax-Highlighting ist ein Plus)
- Ein Zip-Werkzeug für den Vertrieb; während der Entwicklung kannst du Ordner-Laden benutzen (nur Desktop-Browser)
- Browser-Entwicklertools — Kompilierfehler erscheinen in der In-Game-UI und zusätzlich in der Konsole

## Tests auf dem Gerät

Vor dem Vertrieb verifizieren auf ([Validierung](validation.md)):

1. Einem allow-Modus-Spiel (Pflicht, wenn du Vertex-Animation benutzt)
2. Einem strict-Modus-Spiel (die meisten Spiele sind strict)
3. Einem Seiten-Reload (gespeicherte Pakete revalidieren automatisch)

## URL-Parameter-Vorbehalt

In URL-Parametern oder localStorage zurückgebliebene Renderer-Overrides lassen Pakete den Start verweigern — diese löschen und die Seite neu laden.

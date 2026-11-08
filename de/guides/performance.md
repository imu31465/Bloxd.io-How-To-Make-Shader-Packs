# Performance

> Ziel-API: 5 · Ziel-Build: `v98qt8` (2026-11-08, Produktion und Preprod) · Status: Verified (messbasierte Praxis)

Paket-Hooks laufen auf jedem Fragment (alle Pixel von Terrain / Liquid / Model), deshalb bewegen Stilentscheidungen die Framerate deutlich.

## Erste Fakten

- **Der Light-Hook ist die finale Stufe**: er läuft für jedes gezeichnete Pixel von Terrain, Liquid und Model — der Großteil des Bildschirms
- **Pakete laufen auf WebGPU**: Kosten unter Annahme einer Bandbreite von GPUs bewerten, Mobil eingeschlossen
- Die Größen-Obergrenze des Loaders (256 KB `.wgsl`) ist zugleich eine praktische **Compile-Zeit**-Decke

## Kostenleiter (billig → teuer)

| Operation | Kosten | Hinweis |
|---|---|---|
| `mix` / `clamp` / Arithmetik | ◎ minimal | |
| Eingabe-Lesezugriffe (`l.skyLight`…) | ◎ | aus Uniform/Vertex-Attributen |
| `smoothstep` / `pow` | ○ | `pow` variiert je Exponent |
| `sin` / `cos` | ○ | Animations-Brot-und-Butter |
| `dot` / `normalize` | ○ | |
| `bloxdTexel()` (Textur-Sample) | △ | auf höheren Mips billiger |
| `dpdx` / `dpdy` / `fwidth` | △ | nur Surface-/Light-Hooks |
| Verzweigungen (`if`) | △ | WGSL kann beide Seiten auswerten; uniform-artige Bedingungen (Flag-Prüfungen) sind billig |
| Hash-Noise (viele `sin`/`fract`) | △ | Mikro-Bump-Effekte nach Distanz gaten |

## Praxis

1. **Effekte auf die Flächen gaten, die sie brauchen** — `flags`-Auswahl schlägt „+20 % überall“
2. **Detail mit Distanz abwerfen** — früh aussteigen, wenn `distance(surface.position, bloxdEyePosition())` eine Schwelle überschreitet
3. **Mips benutzen** — `bloxdTexel(id, uv, mipLevel + 1.0)` ist ein ¼-Auflösungs-Durchschnitt ([ausgearbeitete Beispiele](../api/texture-api.md#ausgearbeitete-beispiele))
4. **Für Farb-Justierungen lieber Surface-Hooks** — der Light-Hook ist die Alle-Pixel-Finalstufe
5. **Detail schrittweise dazugeben und FPS vergleichen** ([Testen](testing.md))
6. **`#ifdef`-Guards sparen keine Laufzeit** — Varianten sind Compile-Einheiten; Laufzeit-Ersparnisse kommen aus Flags und Distanz

## Messen

- FPS mit/ohne Paket über die Browser-Devtools vergleichen (Performance-Panel / WebGPU-Statistiken)
- Terrain-lastige Szenen (schattenreicher Wald) und Wasser (Liquid-Hooks) getrennt messen
- Mobil-Hardware prüfen — sie kann Zehnerpotenzen langsamer sein

## Verwandte Seiten

- [Testen](testing.md) · [Rendering-Pipeline](../internals/rendering-pipeline.md) · [Textur-API](../api/texture-api.md)

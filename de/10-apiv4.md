[← Vorheriger Teil](09-apiv3.md)·[Zurück zum Handbuch](README.md)

# Teil X: Migrationsleitfaden für API Version 4 (2026-10-26, Zusammenfassung)

> Dieser Text ist die kurze Zusammenfassung für diese Sprache. Die vollständige Fassung mit allen Details, Beispielrezepten und restaurierten Engine-Interna (§55–§66) gibt es auf [Englisch](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/10-apiv4.md) und [Japanisch](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/10-apiv4.md).

Ziel-Build: `cnty9.main.669f8081.js` — **seit 2026-10-26 gleichzeitig in Produktion und Preprod live** (beide byte-identisch). Das Pack-Modell behält seine Form: gleiche `pack.json`-Felder, gleiche Loader-Limits, gleiches 64-B-Uniform, dieselben 6 Hooks.

## Was sich ändert

- `pack.json` verlangt `"apiVersion": 4` (strikt `===`, Zahl) — v3-Pakete werden beim Laden abgelehnt.
- **Neue Textur-API (das Highlight):** `bloxdTexel(textureId, uv, mipLevel) -> vec4f` sampelt den Block-Textur-Atlas genau wie die Engine selbst (id 0 = weiß; animierte Texturen liefern automatisch den aktuellen Frame), `bloxdTextureSize(mipLevel) -> vec2u`, und benannte Konstanten `bloxdTextureId*` (CamelCase aus dem Dateinamen, z. B. `grass_top` → `bloxdTextureIdGrassTop`; die offizielle Namensliste ist `BLOCK_TEXTURES.md`).
- **Vier neue Eingabefelder** in `BloxdSurfaceIn` *und* `BloxdLightIn`: `textureId`, `textureRotation` (Vierteldrehungen im Uhrzeigersinn, die `bloxdTexel` anwendet), `uv` (in Blöcken; `fract(uv)` wird gezeichnet), `mipLevel`.
- **Umbenennungen mit Bedeutungswechsel:** `fogVisibility` → `fogAlpha` mit **invertierter** Bedeutung (`0 = kein Nebel, 1 = nur fogColour`; Port: `l.fogVisibility` → `1.0 - l.fogAlpha`); `bloxdFaceBlock()` → `bloxdFragmentBlockPosition()` (identischer Körper); `BloxdOpaqueBehind.found` → `hit`.
- **Strict Games werden jetzt vom eingebauten Validator durchgesetzt:** ein ungeschützter Vertex-Hook oder ein erreichbares `discard` meldet `... moves terrain, which strict games prevent.` / `... makes terrain see-through, ...` und deaktiviert **alle** Hooks in Strict-Spielen. Mit `#ifndef BLOXD_STRICT`-Wrappern laufen Surface/Light weiter.
- Alles andere bleibt eingefroren: 6 Hooks, `blockFlags`-Bits (1/2/4/8/16/32), Uniform-Layout, Loader-Limits, Varianten-Matrix, die 12 Allow-Titel (auf `cnty9` am 2026-10-27 unverändert bestätigt).

## Migration in Kürze

| v3 | v4 |
|---|---|
| `"apiVersion": 3` | `"apiVersion": 4` (Zahl) |
| `l.fogVisibility` | `1.0 - l.fogAlpha` |
| `mix(l.fogColour, col, VIS)` | `mix(col, l.fogColour, ALPHA)` bzw. `bloxdApplyFog(col, l)` |
| `bloxdFaceBlock(pos, nrm)` | `bloxdFragmentBlockPosition(pos, nrm)` |
| `behind.found` | `behind.hit` |
| Vertex-Hooks ungeschützt | `#ifndef BLOXD_STRICT ... #endif` |

Offizielle Referenzen existieren jetzt (`bloxd-api.wgsl` und `BLOCK_TEXTURES.md`, offizieller Discord). Die vollständigen Details — Rotations-Feinheit von `bloxdTexel`, das restaurierte Sampling-`WGSL`, die Namens-Registry mit ≈900 nutzbaren Konstanten, die neue `HEADER_VERSION`-Struktur mit Registry-Hash — stehen in der englischen und japanischen Vollfassung.

[← Vorheriger Teil](09-apiv3.md)·[Zurück zum Handbuch](README.md)

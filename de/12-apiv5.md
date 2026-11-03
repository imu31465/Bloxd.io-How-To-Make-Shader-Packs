[← Vorheriger Teil](11-reference.md)·[Zurück zum Handbuch](README.md)

# Teil XII: Migrationsleitfaden für API Version 5 (2026-11-03, Zusammenfassung)

> Dieser Text ist die kurze Zusammenfassung für diese Sprache. Die vollständige Fassung mit allen Details, Beispielrezepten, dem restaurierten v5-Header im Volltext und den Engine-Interna (§69–§82) gibt es auf [Englisch](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/en/12-apiv5.md) und [Japanisch](https://github.com/imu31465/Bloxd.io-How-To-Make-Shader-Packs/blob/main/ja/12-apiv5.md).

Ziel-Build: `ab90qa.main.6188124c.js` — **seit Messung am 2026-11-03 gleichzeitig in Produktion und Preprod live** (beide byte-identisch, md5-verifiziert). Dies ist die größte API-Revision seit v3: der dekodierte Engine-Header wächst von 6,021 auf **8,954 Byte**, und fast jede Struktur erhält neue Felder.

## Was sich ändert

- `pack.json` verlangt `"apiVersion": 5` (strikt `===`, Zahl) — v4-Pakete werden beim Laden abgelehnt; gespeicherte v4-Pakete sind still inaktiv.
- **`blockFlags` wird durch eine Struktur ersetzt (die große Umstellung):** die sechs Bit-Konstanten `bloxdBlockFlag*` (opaque/emissive/vegetation/dirt/sand/rock) entfallen; stattdessen **`flags: BloxdFlags`** mit 14 benannten bool-Feldern — sechs davon sind die alten Bits unter neuem Namen, acht sind neu: **`slab` `stairs` `flat` `placed` `held` `dropped` `thrown` `lifeform`**. Modelle, gehaltene Items und Lebewesen sind jetzt von Terrain unterscheidbar.
- **`#ifdef BLOXD_LIGHTING` ist entfernt:** der Kompilier-Schalter weicht einem Laufzeittest mit der neuen Header-Funktion **`bloxdLit()`**; das Uniform erhält das Feld `lit: u32` (Offset 4, weiterhin 64 B gesamt). Die Variantenmatrix schrumpft von 8 auf 6 (`strict|allow` × `terrain|liquid|model`).
- **Die Beleuchtungsrezept der Engine wird öffentlich:** drei neue Header-Funktionen — **`bloxdShading(light)`**, **`bloxdWorldLight(light)`**, **`bloxdLitColour(surface, light)`** — plus zwei neue `BloxdLightIn`-Eingaben (`diffuse`, `emissive`).
- **Neue Eingaben:** `localPosition: vec3f` (Modellkoordinaten, 0 für Terrain) überall; `enchantTier` / `enchantColour` / `enchantSpeed` / `overlayColour` (Verzauberung und Treffer-Blitz) auf Surface/Light; **neue Ausgaben** `enchantColour` / `overlayColour` auf `BloxdSurface`, die `bloxdLitColour` einmischt.
- **Entfernt:** `bloxdFragmentBlockPosition()` (ohne Ersatz), die `bloxdBlockFlag*`-Konstanten, `bloxdSpLitColour`.
- **Die Standard-Pack-Vorlage liefert jetzt alle 9 Hooks** (Light-Hooks inklusive, 1,122 → 1,683 Byte) — und der neue Kommentar dokumentiert das Lösch-Modell: *„If you delete a hook, the default is used instead."*
- Neu im Header: `const bloxdChunkSize: i32 = 32;`. Der Y-Ableitungs-Schutz wird automatisiert: `dpdy`/`dpdyCoarse`/`dpdyFine` schreibt die Engine als `(-dpdy(...))` um. `HEADER_VERSION` steigt auf `9.<hash>.<hash>`.
- `bloxdSp*`-Namespace wächst von 27 auf **46 Symbole**; die Texturnamen-Registry misst jetzt **896 nutzbare Namen** (+1 `scorpion_eggs`, −10 u. a. die `chest_double_*`-Familie und `mob_spawner_*_block_side`) — Namen sind die API, ids nur Snapshot.
- Alles andere bleibt eingefroren: Loader-Limits (256 `.wgsl` / 256 KB / 64 KB / 32 MB / 1,024 Einträge), Hook-Namen, Strict-Vertrag (allow 12 Titel), Group-3-Bindungen.

## Migration in Kürze

| v4 | v5 |
|---|---|
| `"apiVersion": 4` | `"apiVersion": 5` (Zahl) |
| `(s.blockFlags & bloxdBlockFlagVegetation) != 0u` | `s.flags.vegetation` |
| `#ifdef BLOXD_LIGHTING … #endif` | `if (bloxdLit()) { … } else { return bloxdDefaultLight(s, l); }` |
| `bloxdFragmentBlockPosition(p, n)` | entfallen — `bloxdWorldPosition()` / `flags` verwenden |
| (nicht vorhanden) | `s.flags.held`, `s.flags.lifeform`, `s.localPosition`, `s.enchantTier` … |

Der vollständige restaurierte v5-Engine-Header (8,954 Byte, Wort für Wort) und die komplette Drift-Liste der Texturnamen stehen in der englischen und japanischen Vollfassung (§82 bzw. §80).

[← Vorheriger Teil](11-reference.md)·[Zurück zum Handbuch](README.md)

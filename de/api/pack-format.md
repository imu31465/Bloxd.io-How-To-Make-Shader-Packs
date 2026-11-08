# Packformat

> Ziel-API: 5 · Ziel-Build: `v98qt8` (2026-11-08, Produktion und Preprod) · Status: Verified (am Live-Loader nachgemessen)

Das ganze Paketmodell auf einer Seite — Manifest, Loader-Limits, Per-Frame-Uniform. Für die Schritt-für-Schritt-Version siehe [Erste Schritte](../getting-started/manifest.md).

## pack.json

```json
{
  "apiVersion": 5,
  "name": "My Pack",
  "author": "your name"
}
```

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `apiVersion` | Zahl | Pflicht | **muss strikt `5` entsprechen** (`===`). Ein String `"5"` scheitert und wird mit seiner JSON-Schreibweise gemeldet |
| `name` | String | Pflicht | nach dem Trimmen nicht leer; wird in den Einstellungen angezeigt |
| `author` | String | optional | muss, falls vorhanden, ein String sein |

Alles andere im Manifest wird ignoriert. `pack.json` muss exakt ein JSON-Objekt im Zip-Root sein.

## Loader-Limits (am Live-c53 nachgemessen)

| Limit | Wert | Meldung bei Überschreitung |
|---|---|---|
| `.wgsl`-Dateien pro Paket | 256 | `The pack has more than 256 .wgsl files.` |
| `.wgsl`-Quelltext gesamt | 256 KB | `The pack's .wgsl files are over 256 KB in total.` |
| `pack.json`-Größe | 64 KB | `pack.json is over 64 KB.` |
| Zip-Größe | 32 MB | `The zip is over 32 MB.` |
| Zip-Einträge | 1.024 | `The zip has more than 1024 entries.` |
| Zip-Form | — | Split-Zip / zip64 / verschlüsselt / nicht unterstützte Kompression werden je mit eigener Meldung abgelehnt; alle Dateien valides UTF-8; exakt eine `pack.json`; keine doppelten Pfade |

## API-Versionsprüfung

Der Loader vergleicht `manifest.apiVersion !== 5` mit JavaScript-strikt `!==`. Die Versionskonstante `5` und die Header-Vorlage leben im selben Modul (c55 / Modul 29836), daher bewegen sich Validierung und der Header, den sie voraussetzt, gemeinsam. Meldungen bei Nichtübereinstimmung: siehe [Kompatibilität](compatibility.md).

## Per-Frame-Uniform: bloxdPackInputs

`@group(3) @binding(0) var<uniform> bloxdPackInputs: BloxdPackInputs` — weiterhin 64 Byte, aber v5 hat ein Member hinzugefügt (aus dem Live-Uniform-Layout-Modul):

| Offset | Feld | Typ | Hinweis |
|---|---|---|---|
| 0 | `seconds` | `f32` | unterlegt `bloxdSeconds()` |
| 4 | `lit` | `u32` | 1, wenn Block-/Himmels-Beleuchtung an ist; unterlegt `bloxdLit()` |
| 16 | `renderOffset` | `vec3i` | unterlegt `bloxdRenderOffset()` |
| 32 | `sunDirection` | `vec3f` | unterlegt `bloxdSunDirection()` |
| 48 | `eyePosition` | `vec3f` | unterlegt `bloxdEyePosition()` |

`lit` passte in das Padding, das v4 bereits zwischen `seconds` und `renderOffset` hatte (Offsets 4–15 waren Alignment-Lücken; `vec3i` braucht 16-Byte-Alignment, daher bleibt `renderOffset` bei 16). Gesamtgröße und alle anderen Offsets sind unverändert. Die Engine schreibt es mit einem einzigen `setUint32(4, lit ? 1 : 0)` — es ist ein Flag, keine Lichtstufe (die JS-seitigen Namen `terrainLightLevels` / `terrainHeldLight` von v4 sind komplett aus dem Bundle verschwunden).

**Das Uniform nie direkt aus einem Paket referenzieren.** Es über die Header-Funktionen benutzen (`bloxdSeconds()` usw.). Die Stage-Sichtbarkeit ist VERTEX|FRAGMENT, deshalb funktionieren Header-Funktionen auch aus Modul-Funktionen und Vertex-Hooks.

## Bind-Group-Layout

| Binding | Inhalt |
|---|---|
| 0 | `bloxdPackInputs`-Uniform (64 B) |
| 1 | Szenentiefe-Textur (Liquid-Varianten) |
| 2 | `bloxdSpTextureLayers`-Storage-Buffer |

`minBindingSize` bleibt 64. Die Tiefentextur (Binding 1) ist FRAGMENT-only — deshalb ist `bloxdOpaqueBehind()` nur aus Surface-/Light-Hooks aufrufbar.

## WGSL-Konkatenation

Mehrere `.wgsl`-Dateien werden in **Wörterbuch-Reihenfolge des Pfadnamens** zu einem Modul konkateniert. Modul-Ebene-Deklarationen sind reihenfolgeunabhängig; nur die `var`-Initialisierungsreihenfolge kann relevant werden. Nicht-`.wgsl`-Dateien werden ignoriert.

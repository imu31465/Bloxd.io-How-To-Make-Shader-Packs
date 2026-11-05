# Shader-Validierung

> Ziel-API: 5 · Ziel-Build: `bny9u` · Status: Analyzed (aus dem Live-Validator restauriert)

Die statische Validierung (Analyzer, Stufe 1 der Ladeprüfung). Nutzerseitige Fixes: [Validierungsfehler](../troubleshooting/validation.md).

## Die Stufen

1. **Loader-Limits** (Zip-/pack.json-Form) → [Packformat](../api/pack-format.md)
2. **Statische Validierung (Analyzer)** — diese Seite; Syntax, Typen, reservierte Namen, Hook-Verträge über alle 6 Varianten
3. **Echte Browser-Kompilierung** → [WGSL-Kompilierung](wgsl-compilation.md)
4. **Laufzeit-Re-Validierung beim Spiel-Beitritt** — kompiliert tatsächlich jedes existierende Terrain-Material (strenger als die Prüfung im Einstellungsbildschirm); ihr Scheitern wirft das Paket für dieses Spiel raus

## Die Signaturentabelle der Spezialfunktionen

Der Validator hält eine Tabelle in Modul 29849 und prüft hook-übergreifende Aufrufbeschränkungen:

```js
const Jq = new Map([
  ["bloxdFragmentBlockPosition", { params: "position: vec3f, normal: vec3f", returns: "vec3i", symbol: null, vertex: true }],
  ["bloxdOpaqueBehind", { params: "", returns: "BloxdOpaqueBehind", symbol: "BLOXD_SCENE_DEPTH" }],
  ["bloxdTexel", { params: "textureId: u32, uv: vec2f, mipLevel: f32", returns: "vec4f", symbol: null }],
  ["bloxdTextureSize", { params: "mipLevel: f32", returns: "vec2u", symbol: null }],
]);
```

Restaurierte Logik:

- eine Spezialfunktion ohne `vertex: true` aus einem Vertex-Hook aufrufen → *"X reaches Y, which only surface and light hooks can use."*
- eine Funktion mit `symbol` (`bloxdOpaqueBehind` → `BLOXD_SCENE_DEPTH`), erreicht aus einer Variante, die dieses Makro nicht definiert → *"X reaches Y, which needs BLOXD_SCENE_DEPTH, and Z doesn't define it; in code other programs' hooks share, guard the call with #ifdef BLOXD_SCENE_DEPTH."*

Hinweis: `bloxdFragmentBlockPosition` ist aus der Header-Generierung verschwunden, aber ihr Eintrag bleibt in dieser Live-Tabelle — und die Tabelle ist es, die die Bezeichnerprüfung befragt, daher bestehen Aufrufe weiterhin die Validierung. Der Codegenerator injiziert außerdem weiterhin die Definition (Terrain/Liquid und beide Model-Programme), die Funktion bleibt also praktisch aufrufbar. Als deprecated behandelt: undokumentiert, und kann in jeder künftigen Version fallen gelangen.

## Diagnosen reservierter Namen

- **die allgemeine Regel `/^bloxd/i`**: *"Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"*
- **direkte Textur-/Sampler-Deklarationen**: *"Packs can't use X: the engine binds every texture and sampler. Surface and light hooks can read atlas textures with bloxdTexel."*

## Texturnamen-Auflösung & Diagnosen

Die `bloxdTextureId*`-Auflösung hat einen eigenen Pfad ([die Meldungen](../api/texture-api.md#fehler-der-namensauflösung-wortwörtlich-aus-dem-validator)):

- **Falten**: an Nicht-Alphanumerisches splitten, CamelCase, `bloxdTextureId`-Präfix; das Rückwärts-Matching ist Case-/Unterstrich-insensitiv
- **Schreibweisen-Vorschläge** (neu in v5): nicht gematchte Namen bekommen Levenshtein-Vorschläge an der Schwelle `max(2, floor(len/4)) + 1`
- eigene Meldungen für Rahmen-Schreibweisen und gedrehte-Kopie-Schreibweisen
- nach dem Falten mehrdeutige Namen sind unbenutzbar

## Die neuen Diagnosen von v5

- *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."* — nennt das entfernte Makro
- Pakete, die `blockFlags` lesen oder `bloxdBlockFlag*` referenzieren, scheitern an der Reserved-Name-Diagnose — **kein Paket verhält sich still falsch**

## Die Y-Ableitungs-Umschreibung

Der Token-Rewrite-Pass des Analyzers schreibt jeden `dpdy` / `dpdyCoarse` / `dpdyFine`-Aufruf zu `(-dpdy(...))` um (die dpdy-Familie ist explizit als Inversionsmenge aufgeführt). `dpdx` und `fwidth` bleiben unberührt ([Einschränkungen](../api/restrictions.md#automatische-umschreibungen)).

## Header- & Texturkonstanten-Generierung

- der Header wird read-only vorangestellt ([Engine-Header](engine-header.md))
- der `bloxdTextureId*`-Block wird **pro Paket** aus referenzierten Namen generiert

## HEADER_VERSION

`HEADER_VERSION` ist `9.<fnv1a32(header)>.<fnv1a32(texture registry)>` (führende Ganzzahl 8 → 9 von v4). Die beiden fnv1a32-Suffixe fingerprinten das Header-Material und die sortierte Name-id-Registry. Die Re-Validierung gespeicherter Pakete entscheidet mit diesem Fingerprint über „muss erneut geprüft werden“ ([Kompatibilität](../api/compatibility.md#re-validierung-gespeicherter-pakete-muss-erneut-geprüft-werden)).

## Validierungs-Stubs

Code, der die statische Validierung besteht, bekommt vor der echten Browser-WGSL-Prüfung Stub-Code synthetisiert: `var<private> bloxdValidationP: vec4f` plus `bloxdValidateVertex` / `bloxdValidateFragment` — die Typ-Stub-Tabelle (`bool` → `p.x > 0.0`, `vec3f` → `p.xyz`, …) baut Eingabe-Strukturen und ruft die Hooks auf. Details: [WGSL-Kompilierung](wgsl-compilation.md).

## Verwandte Seiten

- [Validierungsfehler](../troubleshooting/validation.md) · [WGSL-Kompilierung](wgsl-compilation.md) · [Textur-Registry](texture-registry.md) · [Engine-Daten](engine-data.md)

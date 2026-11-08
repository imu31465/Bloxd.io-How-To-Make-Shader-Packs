# Präprozessor

> Ziel-API: 5 · Ziel-Build: `v98qt8` (2026-11-08, Produktion und Preprod) · Status: Analyzed (aus dem Live-Validator restauriert)

Die bedingte Kompilierung unterstützt nur `#define NAME` (ohne Wert) / `#ifdef` / `#ifndef` / `#else` / `#endif`. Die `#` steht am Zeilenanfang (auch innerhalb von Funktionen ist das zulässig). Das Abgleichen der Flag-Namen ist case-insensitive; ein falscher `#ifdef`-Name lässt die Fehlermeldung die offizielle Menge auflisten.

## Definierte Makros (3)

| Makro | Definiert in | Typische Verwendung |
|---|---|---|
| `BLOXD_STRICT` | Strict-Spiel-Varianten (strict.terrain / strict.liquid / strict.model) | `#ifndef BLOXD_STRICT` um ganze Vertex-Hooks und `discard` |
| `BLOXD_ALPHA` | Varianten, in denen `BloxdSurface.alpha` existiert — alle Liquid + nicht-strict Terrain/Model | Alpha-berührenden Code einpacken |
| `BLOXD_SCENE_DEPTH` | alle Liquid-Varianten | `bloxdOpaqueBehind()`-Aufrufe einpacken |

## Makro-×-Varianten-Matrix

| Variante | `BLOXD_STRICT` | `BLOXD_ALPHA` | `BLOXD_SCENE_DEPTH` |
|---|---|---|---|
| `allow.terrain` | – | ✓ | – |
| `allow.liquid` | – | ✓ | ✓ |
| `allow.model` | – | ✓ | – |
| `strict.terrain` | ✓ | – | – |
| `strict.liquid` | ✓ | ✓ | ✓ |
| `strict.model` | ✓ | – | – |

Die Unterschiede Terrain / Liquid / Model sind **separate Programme, keine Makros** — ein `#ifdef BLOXD_TERRAIN` existiert nicht.

## Entfernte Makros

- **`BLOXD_LIGHTING`** — in v5 entfernt. Der Beleuchtungszustand ist eine Laufzeitfrage für [`bloxdLit()`](lighting.md#bloxdlit--das-gate), kein Compile-Zweig. Die Verwendung scheitert an der Validierung mit:

> *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

v4-Migrationsmuster:

```wgsl
// v4 (fails validation on v5)
#ifdef BLOXD_LIGHTING
fn bloxdTerrainLight(s: BloxdSurface, l: BloxdLightIn) -> BloxdLight { ... }
#endif

// v5 (migrated)
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    if (!bloxdLit()) { return bloxdDefaultLight(surface, light); }
    // ... lighting-enabled processing
}
```

## Beispiel

```wgsl
fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    out.colour = out.colour * vec3f(1.0, 0.9, 0.8);
    #ifdef BLOXD_ALPHA                          // terrain has alpha only in allow
    out.alpha = s.alpha;
    #endif
    return out;
}

#ifndef BLOXD_STRICT                            // vertex hooks always need this guard
fn bloxdTerrainVertex(v: BloxdVertexIn) -> BloxdVertex {
    var out = bloxdDefaultVertex(v);
    out.position.y += sin(bloxdSeconds()) * 0.05;
    return out;
}
#endif
```

## Makros formen die Strukturen

- `BloxdSurface.alpha` existiert nur innerhalb von `#ifdef BLOXD_ALPHA`
- `bloxdOpaqueBehind()` ist nur innerhalb von `#ifdef BLOXD_SCENE_DEPTH` aufrufbar

Siehe [Strukturen](structures.md#bedingte-felder--makros).

## Verwandte Seiten

- [Erste Schritte: Varianten](../getting-started/variants.md) · [Engine-Interna: Shader-Validierung](../internals/shader-validation.md)

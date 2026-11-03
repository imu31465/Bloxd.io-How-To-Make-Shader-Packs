# Validierungsfehler

> Ziel-API: 5 · Status: Verified (Meldungen wortwörtlich aus dem Live-Validator aufgezeichnet)

Fehler der statischen Validierung (Analyzer, Stufe 1) — meist reservierte Namen, der strict-Vertrag und hook-übergreifende Aufrufbeschränkungen.

## „Packs can't construct BloxdSurface directly" / „Packs can't construct BloxdLight directly, since header structs gain fields; ..."

- **Ursache**: Konstruktoren wie `BloxdSurface(...)` aufgerufen
- **Fix**: bei `bloxdDefaultSurface(s)` / `bloxdDefaultLight(s, l)` beginnen und Felder mutieren (`var out = s;` funktioniert in Light-Hooks)

## „Packs can't declare names starting with bloxd, other than the hook functions bloxd<Terrain|Liquid|Model><Vertex|Surface|Light>"

- **Ursache**: ein Bezeichner, der mit `bloxd` beginnt (case-insensitive)
- **Fix**: umbenennen (z. B. `packTint`). Nur die 9 Hook-Namen sind erlaubt
- **Vorbeugen**: eigene Namen mit `pack` / `my` etc. prefixen

## „bloxdPackInputs isn't part of the bloxd_ header"

- **Ursache**: das Uniform direkt referenziert
- **Fix**: über die Header-Funktionen benutzen ([Packformat](../api/pack-format.md#per-frame-uniform-bloxdpackinputs))

## „... reaches bloxdTexel, which only surface and light hooks can use."

- **Ursache**: aus einem Vertex-Hook (oder einer von dort erreichbaren Funktion) aufgerufen — „reaches“ meint **den Aufrufpfad**
- **Fix**: den Aufruf in einen Surface-/Light-Hook verschieben

## „... reaches bloxdOpaqueBehind, which needs BLOXD_SCENE_DEPTH, and <program> doesn't define it; ..."

- **Ursache**: `bloxdOpaqueBehind()` braucht `BLOXD_SCENE_DEPTH`, nur in allen Liquid-Varianten definiert; den Aufruf aus Terrain-/Model-Hook-Code zu teilen erzeugt unkompilierbare Varianten
- **Fix**: den Aufruf in `#ifdef BLOXD_SCENE_DEPTH` einpacken
- **Vorbeugen**: Tiefen-Lesezugriffe als Liquid-only-Verarbeitung isolieren

## Der strict-Vertrag

| Meldung | Bedeutung |
|---|---|
| `<hook> moves terrain, which strict games prevent.` | ungeschützter Vertex-Hook |
| `discard makes terrain see-through, which strict games prevent.` | erreichbares `discard` |

- **Wichtig**: das sind keine Kompilierfehler — strict-Spiele **schalten das ganze Paket automatisch ab** (`shaderPack:offInStrict`)
- **Fix**: Vertex-Hooks und `discard` in `#ifndef BLOXD_STRICT` einpacken ([Varianten](../getting-started/variants.md))

## Meldungen der aktuellen Version

| Meldung | Aktion |
|---|---|
| `BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead.` | `#ifdef BLOXD_LIGHTING` → `if (bloxdLit())` migrieren ([Beleuchtung](../api/lighting.md#bloxdlit--the-gate)) |
| `bloxdBlockFlagRock isn't part of the shader pack API...` | übrig gebliebene Bitkonstante → `flags.rock` ([Flags](../api/flags.md)) |
| `bloxdSpLitColour isn't part of the shader pack API...` | v4-internes Symbol → die öffentliche `bloxdLitColour()` benutzen |

Der Analyzer gibt Paketen, die weiterhin `blockFlags` lesen oder Light-Hooks in `#ifdef BLOXD_LIGHTING` verpacken, **eigene Meldungen**, sodass nichts still falsch läuft (die Migrationsschritte: [v5-Migration](../history/v5.md)).

Fehler der Texturnamen-Auflösung (Schreibweisen-Vorschläge, Rahmen-/Rotations-Schreibweisen) leben in [Textur-Probleme](textures.md).

## Verwandte Seiten

- [Einschränkungen & reservierte Namen](../api/restrictions.md) · [Engine-Interna: Shader-Validierung](../internals/shader-validation.md) · [Varianten-spezifische Probleme](variants.md)

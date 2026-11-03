# Varianten-spezifische Probleme

> Ziel-API: 5 · Status: Verified

Probleme, die nur in einem Teil der 6 Varianten (`strict|allow` × `terrain|liquid|model`) auftreten. v5 entfernte die Beleuchtungs-Achse (das alte `BLOXD_LIGHTING`), und der Loader validiert beim Laden **alle 6 Varianten auf einmal**.

## Lädt nur in nicht-strict Spielen / in strict rausgeworfen

- **Ursache**: ein ungeschützter Vertex-Hook oder ein erreichbares `discard`; strict-Spiele verbieten beides, und ein Verstoß = **Auto-Deaktivierung des ganzen Pakets** (`shaderPack:offInStrict`)
- **Prüfen**: der Loader-Bildschirm zeigt `<hook> moves terrain, which strict games prevent.` / `discard makes terrain see-through, which strict games prevent.`
- **Fix**: Vertex-Hooks und `discard` in `#ifndef BLOXD_STRICT` einpacken
- **Vorbeugen**: Vertex-Hooks immer von der geschützten Vorlage ausgehend starten ([Varianten](../getting-started/variants.md))

## „.alpha is undefined"

- **Ursache**: `alpha` existiert nur hinter `#ifdef BLOXD_ALPHA` (alle Liquid + nicht-strict Terrain/Model)
- **Fix**: Alpha-berührenden Code in `#ifdef BLOXD_ALPHA` einpacken ([Präprozessor](../api/preprocessor.md#makro--varianten-matrix))

## „BloxdVertex only exists when BLOXD_STRICT isn't defined"

- **Ursache**: strict-Varianten haben überhaupt keine Vertex-Hooks, also auch kein `BloxdVertex`; der Vertex-Code ist aus strict-Varianten erreichbar
- **Fix**: den Vertex-Hook schützen

## bloxdOpaqueBehind scheitert nur in manchen Varianten

- **Ursache**: `BLOXD_SCENE_DEPTH` ist nur in allen Liquid-Varianten definiert
- **Fix**: `#ifdef BLOXD_SCENE_DEPTH` ([Validierungsfehler](validation.md))

## Wasser ignoriert das Paket (Liquid)

- **Symptom**: Terrain-Hooks geschrieben, Wasser unverändert
- **Ursache**: **in v5 läuft, wenn ein Paket keinen Liquid-Hook definiert, auch kein Terrain-Hook auf Wasser** (das Vor-v4-Verhalten „Liquid fällt auf Terrain zurück“ ist weg)
- **Fix**: Liquid-Hooks schreiben ([Hook-Aufteilung](../api/hooks.md#was-jedes-programm-zeichnet))

## Modelle (Entities, Block-Modelle) unbeeinflusst

- **Ursache**: vor v5 außerhalb des Umfangs; erfordert jetzt `bloxdModel*`-Hooks
- **Fix**: `bloxdModelSurface` / `bloxdModelLight` definieren ([Modelle-Leitfaden](../guides/models.md))

## Zur 6-Varianten-Validierung

Der Loader validiert beim Laden **alle 6 Varianten auf einmal** (die Beleuchtungs-Achse wird nicht mehr separat kompiliert). Selbst wenn ein Spiel nur manche Bedingungen nutzt, müssen vertriebene Pakete alle sechs vorhersehen.

| Variante | Definierte Makros |
|---|---|
| `allow.terrain` | `BLOXD_ALPHA` |
| `allow.liquid` | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | `BLOXD_ALPHA` |
| `strict.terrain` | — |
| `strict.liquid` | `BLOXD_SCENE_DEPTH` |
| `strict.model` | — |

## Verwandte Seiten

- [Varianten](../getting-started/variants.md) · [Präprozessor](../api/preprocessor.md) · [Policy](../internals/policy.md)

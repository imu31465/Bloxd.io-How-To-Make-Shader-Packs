# Varianten und Guards

> Ziel-API: 5 · Ziel-Build: `bny9u` (2026-11-05, Produktion) · Status: Analyzed

## 6 Varianten

Du schreibst einen Codekörper, aber er muss in allen **6 Varianten** kompilieren: `{strict, allow} × {terrain, liquid, model}`. Der Loader validiert beim Laden alle sechs.

Die Achse „Beleuchtung an/aus“ aus v4 und früher ist weg (v4 hatte 8 Varianten). Der Beleuchtungszustand ist jetzt eine Laufzeitfrage für [`bloxdLit()`](../api/lighting.md), kein Compile-Zeit-Zweig.

| Variante | Beispiel | Definierte Makros |
|---|---|---|
| `allow.terrain` | Terrain in einem allow-Spiel | `BLOXD_ALPHA` |
| `allow.liquid` | Wasser in einem allow-Spiel | `BLOXD_ALPHA` · `BLOXD_SCENE_DEPTH` |
| `allow.model` | Modelle in einem allow-Spiel | `BLOXD_ALPHA` |
| `strict.terrain` | Terrain in einem strict-Spiel | — |
| `strict.liquid` | Wasser in einem strict-Spiel | `BLOXD_SCENE_DEPTH` |
| `strict.model` | Modelle in einem strict-Spiel | — |

## Bedingungen

Verfügbar sind nur `#define NAME` (ohne Wert) / `#ifdef` / `#ifndef` / `#else` / `#endif`. Die `#` steht am Zeilenanfang (auch innerhalb von Funktionen ist das zulässig).

| Guard | Bedeutung | Typische Verwendung |
|---|---|---|
| `#ifndef BLOXD_STRICT` | nur nicht-strict (allow) Varianten | ganze Vertex-Hooks einpacken, `discard` einpacken |
| `#ifdef BLOXD_ALPHA` | Varianten, in denen `alpha` existiert (alle Liquid + nicht-strict Terrain/Model) | Alpha-berührenden Code einpacken |
| `#ifdef BLOXD_SCENE_DEPTH` | alle Liquid-Varianten | `bloxdOpaqueBehind()`-Aufrufe einpacken |

`BLOXD_LIGHTING` wurde **in v5 entfernt**. Die Verwendung scheitert an der Validierung mit: *"BLOXD_LIGHTING was removed in apiVersion 5; test bloxdLit() in code instead."*

## Der strict-Spiele-Vertrag

Die meisten Spiele sind strict (keine Vertex-Animation, kein `discard`). Ein ungeschützter Vertex-Hook meldet `<hook> moves terrain, which strict games prevent.`, und ein erreichbares `discard` meldet `discard makes terrain see-through, which strict games prevent.` — beides schaltet **alle Hooks** in diesem strict-Spiel ab. Vertex-Hooks immer in `#ifndef BLOXD_STRICT` einpacken.

Zu den Interna der Policy je Spiel siehe [Engine-Interna: Policy](../internals/policy.md).

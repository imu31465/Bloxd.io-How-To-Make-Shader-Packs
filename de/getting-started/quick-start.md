# Quick Start

> Ziel-API: 5 · Ziel-Build: `bny9u` (2026-11-05, Produktion) · Status: Verified

Dein erstes Paket in fünf Minuten.

## 1. Die Dateien anlegen

Einen Ordner mit `pack.json` und `pack.wgsl` anlegen:

**`pack.json`**:

```json
{
  "apiVersion": 5,
  "name": "My First Pack",
  "author": "your name"
}
```

**`pack.wgsl`** — ein minimales Paket mit warmem Tint:

```wgsl
const packWarmth = 0.18;

fn bloxdTerrainSurface(s: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(s);
    let tint = mix(vec3f(1.0), vec3f(1.06, 1.0, 0.92), packWarmth);
    out.colour = clamp(out.colour * tint, vec3f(0.0), vec3f(1.0));
    return out;
}
```

> Der Engine-Header (Konstanten, Strukturen, Funktionen) wird beim Laden jedem Paket automatisch vorangestellt — du schreibst ihn nie selbst. Der vollständige Header ist in [Engine-Interna](../internals/engine-header.md) abgedruckt.

## 2. Im Spiel laden

1. Einstellungen → Shader Pack öffnen und die Zip oder den Ordner laden (Ordner-Laden geht nur in Desktop-Browsern)
2. Den Status prüfen: direkt nach der Auswahl erscheint „Ready. Reload the page to use it.“ — nach einem **Seiten-Reload** bedeutet „Ready to use“ Erfolg
3. Erscheint „Saved, but it won't run until you fix these errors...“, die aufgelisteten Fehler beheben (Datei:Zeile + Variante) und neu laden

## 3. Verifizieren

1. Zuerst in einem permissiven Spiel testen
2. Dann in einem strict-Modus-Spiel (die meisten Spiele sind strict)
3. Vertex-Animation funktioniert nur in Spielen mit allow

## 4. Vertreiben

Als Zip packen — siehe [Vertrieb](distribution.md).

## Festgefahren?

- Was Fehler bedeuten → [Fehlerbehebung](../troubleshooting/)
- Wie man Hooks schreibt → [Shader-Hooks](hooks.md)
- Die vollständige 9-Hook-Vorlage steht auf der nächsten Seite, [Shader-Hooks](hooks.md)

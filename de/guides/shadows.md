# Schatten

> Ziel-API: 5 · Ziel-Build: `v98qt8` (2026-11-08, Produktion und Preprod) · Status: Verified (LightEngine-Verhalten seit der v4-Messung unverändert)

Die drei Wege, in einem Shader-Pack „Schatten“ zu erzeugen — und ihre Grenzen.

## Möglich / unmöglich

| Effekt | Möglich? | Wie |
|---|---|---|
| Unter Bäumen/Dächern klar abdunkeln (projektionsartig) | ◎ | `skyLight`-Lift-Inversion + Schwellenwert-Schnitt (unten) |
| Schatten folgen Block-Edits in Echtzeit | ◎ | LightEngine rechnet sofort neu — automatisch |
| Schatten kühl / Sonnenlicht warm färben | ◎ | Zwei-Farb-Verschiebung |
| Schatten, die mit der Sonne rotieren (Shadow-Map) | ✕ | Tiefe ist liquid-only; Lichtstrahl-Okklusion ist keine Eingabe |
| Physische Penumbra | ✕ | begrenzt durch die Voxel-auflösende BFS-Ausbreitung |
| Echtzeit-AO (SSAO) | ✕ | nur das in Vertex-Farben gebackene AO |

## skyLight ist eine Voxel-Shadow-Map

`l.skyLight` ist mehr als ein Helligkeitsparameter. Der LightEngine des Meshers berechnet Minecraft-artige **Voxel-Okklusionsdaten „kann diese Position den Himmel sehen“ — eine Shadow-Map**:

1. **Spalten-Scan**: jede (x,z)-Spalte von oben nach unten; Himmelslicht startet bei 15, wird an opaken Blöcken 0, schwächt sich um `lightFilter` ab (Luft 1 / Wasser 3 / opak 15)
2. **BFS-Flood-Fill**: breitet sich horizontal auf 6 Nachbarn aus (−1 pro Block) — das weicht Schattenkanten auf. Unter einem Okkluder mit Radius r ist der Rohwert (15−r)/15
3. blockLight (Fackeln) ist eine separate RGB-3-Kanal- (4-Bit-gepackte) BFS

Unter Bäumen, Dächern und in Gebäuden ist der Wert bereits niedrig und interpoliert pro Vertex weich. Einen Block setzen oder abbauen rechnet sofort neu — **Schatten, die in Echtzeit folgen**.

## Die Lift-Kurven-Falle

`l.skyLight` kommt **nach der Lift-Kurve** an (`y = 1-(1-x/(3-2x))³`, eine S-Kurve, die dunkle Werte anhebt):

| Ort | Voxel-Rohwert | Geliftet (= l.skyLight) | pow(·, 5.0) |
|---|---|---|---|
| freier Himmel | 1.00 | 1.00 | 1.00 |
| unter Baum (Radius 2) | 0.87 | **0.97** | **0.86** ← fast erhalten |
| Radius 3 | 0.80 | **0.92** | 0.66 |
| Radius 5 | 0.67 | 0.78 | 0.29 |

**Das ist die belegte Ursache für „Gamma dunkelt Schatten nicht ab“** — selbst γ=5 senkt Unter-Baum 0.97 nur auf 0.86.

## Die Lösung: Lift-Inversion + Schwellenwert-Schnitt

Die Kurve ist monoton und invertiert sich exakt: `c=(1-y)^(1/3); x=3(1-c)/(3-2c)`. Den Rohwert wiederherstellen, dann mit einer **`smoothstep`-Schwelle** binarisieren. Die BFS-Ausbreitung der LightEngine ist „−1 pro Nachbarblock“, daher ist `th = 1 - r/15` direkt der „Okklusionsradius, der als Schatten zählt“-Regler.

Die vollständige Implementierung (Sonnen-Gating + Warm/Kalt-Trennung + blockLight-Durchreichen) steht in den [Realismus-Rezepten](../recipes/realism.md). Kernschritte:

```wgsl
// 1. restore the raw value (skipping this means shadows never appear)
let skyRaw = sh_unlift(l.skyLight);
// 2. threshold-cut — sunlit 1 / shadow 0
let sky = smoothstep(shTh - shSoft, shTh + shSoft, skyRaw);
// the essence of projection: direct sun only reaches places that see the sky
let lit = sunL * sky;
```

Regler: **Fläche** = `shTh` (0.93→Radius 1.5 / 0.87→2 / 0.80→3 / 0.67→5); **Kanten-Weichheit** = `shSoft`; **Kerndunkelheit** = die Zwei-Punkt-Verschiebung aus Mindest-Ambiente und Himmelsstreulicht; lange Abend-Schatten ≈ `thEff = shTh + 0.10 * (1 - clamp(sunDir.y, 0.0, 1.0))`.

## Ehrliche Grenzen

- Schatten referenzieren den **Himmel nach oben**, daher **rotieren sie nicht mit der Sonne** (Voxel-Auflösung; weiche Kanten kommen aus der BFS-Ausbreitung)
- Die Beleuchtungs-Vorlage der Engine behält ein unbenutztes `var shadow: f32 = 1.;` (immer 1.0 = deaktiviert) — eine plausible Spur „geplante Zukunft“ für pixelgenaue rotierende Schatten
- Pixelgenaue rotierende Schatten liegen außerhalb der aktuellen API ([Unerreichbare Effekte](constraints.md))

## Verwandte Seiten

- [Realismus-Rezepte](../recipes/realism.md) (das vollständige Projektions-Schatten-Rezept) · [Beleuchtungs-Interna](../internals/lighting-internals.md) · [Debugging-Tipps](debugging.md)

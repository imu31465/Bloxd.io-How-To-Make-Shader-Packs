# Textur-API

> Ziel-API: 5 · Ziel-Build: `xkg8x` · Status: Verified (API seit v4 unverändert, am v5-Build erneut bestätigt)

Die API zum Lesen der Texturen des Spiels selbst: zwei Funktionen, eine Familie benannter Konstanten und vier Eingabefelder. Der Einzeiler des Headers selbst: *"This face's texture. Compare with `bloxdTextureId*`."*

## bloxdTexel

```wgsl
fn bloxdTexel(textureId: u32, uv: vec2f, mipLevel: f32) -> vec4f
```

- **Aufrufbar von**: **nur Surface-/Light-Hooks** (aus einem Vertex-Hook zu reaching scheitert mit einer „reaches“-Diagnose)

Liest ein Texel **genau so, wie der eigene Sampler der Engine es tut** — derselbe `texture_2d_array<f32>`-Atlas, derselbe Sampler, `textureSampleLevel` bei `round(mipLevel)` — das gelesene Texel entspricht strukturell also dem Texel, das die Engine gezeichnet hat.

### Was `bloxdTexel` liest, hängt von der Pipeline ab

Die Engine generiert pro Pipeline eine andere Definition von `bloxdTexel`, deshalb hat eine Funktion drei Verhaltensweisen:

| Pipeline | `textureId == 0` | `textureId` ≠ 0 | Hinweise |
|---|---|---|---|
| **Atlas-Pipelines** — Terrain, Liquid und aus dem Block-Atlas gezeichnete Block-Modelle | `vec4f(1.0)` (weiß — „keine Textur“) | sampelt genau diesen **Atlas-Eintrag** | benannte Konstanten greifen; Animation und Rotation laufen automatisch |
| **Eigen-Textur-Pipelines** — Modelle, deren Mesh eine eigene Diffuse-Textur trägt (Spieler-Skins, Mob-Texturen, Item-Sprites) | sampelt **die eigene Textur des Mesh** an der übergebenen uv | `vec4f(1.0)` (weiß) | exakt eine Textur ist im Scope; benannte Konstanten greifen nicht |
| **Texturlose Pipelines** | weiß | weiß | Stub; `bloxdTextureSize() -> vec2u(1u)` |

Die Semantik der Atlas-Pipelines im Detail:

- **`textureId == 0` liefert `vec4f(1.0)` (weiß).** Das ist die „keine Textur“-id; texturlose Flächen tragen in allen vier Eingabefeldern 0, daher ist `bloxdTexel(surface.textureId, ...)` immer sicher aufrufbar
- **Animierte Texturen liefern automatisch den aktuellen Rahmen.** Rahmen rücken auf der Animationsuhr des Spiels weiter — anhalten oder schrittweise steuern geht nicht und ist nie nötig
- **`mipLevel` clampt exakt wie das eigene der Engine**: `clamp(round(mipLevel), 0, textureNumLevels(textureAtlas0) - 1)`; Mips außerhalb des Bereichs sättigen, statt zu fehlschlagen
- **Das `textureRotation` des Fragments selbst wird auf die übergebene uv angewendet** (siehe unten)

`textureId` ist auf Atlas-Pipelines **1-basiert**: `bloxdTextureIdGrassTop` ist die id, und die Atlas-Layer, die die Engine dafür sampelt, ist `id - 1`. Ids sind stabil pro Textur*namen*, nicht pro Atlas-Slot — die Engine mischt den Atlas zwischen Builds um, aber der benannte Vergleich behält seine Bedeutung.

### Das universelle Aufrufmuster

```wgsl
// Works in every pipeline: on atlas faces it samples the atlas entry;
// on own-texture models textureId is 0 and it samples the model's own texture.
let texel = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
```

`surface.colour` enthält bereits `Textur × Tint × Ambient Occlusion` (Skins und Tints eingeschlossen), Texel-Lesezugriffe sind also für *zusätzliches* Detail da — Luminanz-Schätzungen, pro-Textur-Effekte — nicht zum Neuaufbau der Grundfarbe.

## bloxdTextureSize

```wgsl
fn bloxdTextureSize(mipLevel: f32) -> vec2u
```

- **Aufrufbar von**: nur Surface-/Light-Hooks

`textureDimensions(textureAtlas0, <geclamptes mip>)`. Jede Textur belegt eine Array-Layer, das ist also auch *die Texelgröße jeder einzelnen Textur auf diesem Mip* (alle Blocktexturen einer Atlas-Stufe haben dieselbe quadratische Größe).

```wgsl
// texel-aligned resampling for a "pixel-art" look
let size = bloxdTextureSize(surface.mipLevel);
let uv = fract(surface.uv);
let texel = bloxdTexel(surface.textureId, uv, surface.mipLevel);
```

## Modell-eigene Texturen (textureId: 0)

Der Header notiert: *"These are all 0 if the face has no texture. **Most models use textureId 0.**"* — die meisten Modell-Flächen haben keine *Atlas*-Textur, weil ihre Meshes eigene Texturen tragen:

- **Spieler-Skins** und andere Nicht-Atlas-Modelltexturen (Mobs, Item-Sprites) kommen als `textureId: 0` an
- Auf diesen Pipelines sampelt `bloxdTexel(0u, uv, mip)` **die eigene Textur des Mesh** (siehe Tabelle oben); jede id ≠ 0 liefert weiß — es ist kein Atlas im Scope
- Die Header-Felder funktionieren weiterhin wie dokumentiert: `uv` spannt die Modelltextur 0–1, `mipLevel` ist das Mip der Fläche
- **`bloxdTextureSize()`** meldet die Größe *der Textur, die die Pipeline sampelt*: den Atlas auf Atlas-Pipelines, die eigene Textur des Modells auf Eigen-Textur-Pipelines

Effekte, die nur auf Atlas-Flächen Sinn ergeben, sollten gegated werden:

```wgsl
fn bloxdModelSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    if (surface.textureId != 0u) {
        // only faces whose texture lives in the block atlas (block models)
        let t = bloxdTexel(surface.textureId, fract(surface.uv), surface.mipLevel);
        out.colour = mix(out.colour, t.rgb, 0.2);
    }
    return out;
}
```

- **Skins gegen den Atlas**: der Atlas bildet Textur*namen* auf Layer ab und ist per `bloxdTextureId*` vergleichbar. Modell-eigene Texturen (Skins) liegen nicht in diesem Namensraum und kommen als id 0 an. `surface.colour` enthält bereits Skin × Tint — davon ausgehend arbeiten

## bloxdTextureId*: benannte Texturkonstanten

Jeder benutzbare Texturname wird zu einer vergleichbaren `const`. **Die Schreibweise ist der Dateiname in CamelCase**:

| Texturdatei | Konstante | Hinweis |
|---|---|---|
| `grass_top.png` | `bloxdTextureIdGrassTop` | das eigene Beispiel der Engine |
| `lava0.png` (Rahmen `lava0`–`lava7`) | `bloxdTextureIdLava` | Animationsfamilie: Rahmen-Suffixe fallen aus dem kanonischen Namen weg |
| `black_portal0.png` (Rahmen 0–3) | `bloxdTextureIdBlackPortal` | dieselbe Regel |
| `radar_screen0` (gedrehte Kopien `[rot[1`–`[rot[4`) | `bloxdTextureIdRadarScreen0` | Rotationsfamilie: faltet zum Wurzelnamen |

### Schreibregeln und Namensfreiheit

- **Generierungsregel** (aus dem Validator restauriert): den Namen an nicht-alphanumerischen Läufen splitten, jeden Teil kapitalisieren, nach dem `bloxdTextureId`-Präfix konkatenieren
- **Groß/Klein und Unterstriche werden nicht unterschieden**: das Rückwärts-Matching (der Name, den ein Paket schrieb → Registry-Name) faltet sowohl deine Schreibweise als auch die der Engine, sodass z. B. `bloxdTextureIdGrassTop` und `bloxdTextureId_grass_top` auf **dieselbe Konstante** auflösen
- **Animierte Texturen tragen keine Rahmennummer**: `lava` ist der Name; `lava0` ist ein eigener Fehler
- **Rotationsfamilien nutzen den Wurzelnamen**: eine gedrehte Kopie zu schreiben erzeugt eine eigene Meldung

### Fehler der Namensauflösung (wortwörtlich aus dem Validator)

> **Präfix falsch geschrieben / Case:** `bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?`
>
> **Animationsrahmen:** `...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates.`
>
> **Gedrehte Kopie:** `...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, which bloxdTexel turns as each face shows it.`
>
> **Nach dem Falten mehrdeutig:** `...could name X and Y, which differ only by case or underscores, so it can't be used.`
>
> **Nicht gefunden (mit Vorschlag):** `There's no texture called X. Did you mean bloxdTextureIdY?` — Vorschlagsschwelle ist die Levenshtein-Distanz `max(2, floor(len/4)) + 1`
>
> **Nicht gefunden (ohne Vorschlag):** `There's no texture called X. Texture names are the file names texture packs use, as in bloxdTextureIdGrassTop for grass_top.png; BLOCK_TEXTURES.md lists them.`

> `BLOCK_TEXTURES.md` in dieser Meldung ist die interne Textur-Namensliste des Spiels, auf die der Validator der Engine verweist — keine Seite dieser Website. Das Äquivalent hier ist der [Texturkatalog](texture-catalog.md).

### Nur referenzierte Konstanten werden emittiert

Der `bloxdTextureId*`-Block des Headers wird **pro Paket** aus den Namen generiert, die es tatsächlich referenziert — ein Paket mit 3 Konstanten bekommt 3 `const`-Zeilen, nicht ~900.

## Eingabefelder

Die vier Textur-Felder auf `BloxdSurfaceIn` / `BloxdLightIn`:

| Feld | Typ | Beschreibung |
|---|---|---|
| `textureId` | `u32` | Textur dieser Fläche; Vergleich mit `bloxdTextureId*`; 0 = keine |
| `textureRotation` | `u32` | Vierteldrehungen im Uhrzeigersinn (0–3), angewendet von `bloxdTexel` |
| `uv` | `vec2f` | die Textur spannt 0–1; gezeichnet wird `fract(uv)` |
| `mipLevel` | `f32` | Mip-Level: 0 = volle Größe, 1 = halbe… |

## Die Rotations-Subtilität — ein neutraler Sampler

`bloxdTexel` dreht die übergebene uv gegen die `textureRotation` des **aktuellen Fragments** — unabhängig davon, welche id übergeben wurde. Zwei häufige Fälle:

- **Erneutes Sampeln der eigenen Textur der Fläche** mit `surface.uv` — die uv liegt im gedrehten Bezugssystem der Fläche, und die Gegendrehung bildet zurück in den Atlas-Raum; der vorgesehene Hauptanwendungsfall
- **Sampeln einer anderen Textur** mit Atlas-Raum-uv, während die Fläche gedreht ist — die Gegendrehung feuert trotzdem, und das Sample landet gedreht. Genau das ist die Falle

Die Engine kann die Rotation pro Textur nicht nachschlagen (Rotation sind Flächengeometrie-Daten) und benutzt immer den Wert des Fragments. Um eine andere Textur rotationsneutral zu sampeln, die uv vorab um dieselbe Vierteldrehung drehen, um sie aufzuheben:

```wgsl
// Rotation-neutral texel sampling: pre-rotate uv so bloxdTexel's counter-rotation
// (by this face's textureRotation) cancels out. Pass surface.textureRotation as r.
fn texelNeutral(id: u32, uv: vec2f, mip: f32, r: u32) -> vec4f {
    var turned = uv;
    if (r == 1u) {
        turned = vec2f(1.0 - uv.y, uv.x);
    } else if (r == 2u) {
        turned = vec2f(1.0 - uv.x, 1.0 - uv.y);
    } else if (r == 3u) {
        turned = vec2f(uv.y, 1.0 - uv.x);
    }
    return bloxdTexel(id, turned, mip);
}
```

(`textureRotation == 0` braucht keine Korrektur. Die meisten Flächen tragen 0, aber vertriebene Pakete dürfen das nicht annehmen.)

## Ausgearbeitete Beispiele

### Emission aus der Texel-Luminanz

Ein Mip über dem der Fläche sampeln für einen distanzrobusten weichen blockigen Durchschnitt:

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let avg = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + 1.0);
    let lum = dot(avg.rgb, vec3f(0.2126, 0.7152, 0.0722));
    if (surface.flags.emissive) {
        out.emission += avg.rgb * lum * 0.5;
    }
    return out;
}
```

### Texturspezifische Effekte

`textureId` vergleichen, um ausgewählte Texturen herauszufischen (der offizielle Weg z. B. für funkelnde Erze):

```wgsl
fn bloxdTerrainLight(surface: BloxdSurface, light: BloxdLightIn) -> BloxdLight {
    var out = bloxdDefaultLight(surface, light);
    if (light.textureId == bloxdTextureIdDiamondOre) {
        let p = bloxdWorldPosition(light.position);
        let s = sin(bloxdSeconds() * 3.0 + p.x * 2.7 + p.y * 1.3 + p.z * 4.1);
        out.colour += vec3f(0.35, 0.45, 0.55) * max(0.0, s);
    }
    return out;
}
```

### Distanz-Blur im Tiefenschärfe-Stil

```wgsl
fn bloxdTerrainSurface(surface: BloxdSurfaceIn) -> BloxdSurface {
    var out = bloxdDefaultSurface(surface);
    let d = distance(surface.position, bloxdEyePosition());
    if (d > 40.0 && surface.textureId != 0u) {
        let own = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel);
        if (any(abs(own.rgb - vec3f(0.0)) > vec3f(1e-6))) {          // division guard
            let blur = clamp((d - 40.0) / 60.0, 0.0, 3.0);
            let t = bloxdTexel(surface.textureId, surface.uv, surface.mipLevel + blur);
            out.colour = t.rgb / own.rgb * out.colour;
        }
    }
    return out;
}
```

(Der Quotienten-Trick erhält das `colour = Textur × Tint × AO` der Engine: Das Dividieren des geblendeten Texels durch das native hebt den Texturinhalt auf, und nur der Blur-Faktor bleibt, der zurück in `surface.colour` multipliziert wird. Weiße Reads — texturlose Flächen — lassen den Guard den Effekt überspringen.)

## Wohin die Textur-API nicht gehen kann

- **Aus Vertex-Hooks nicht aufrufbar** — „reaches“-Diagnosen lehnen es ab
- **Texturen lassen sich nicht hinzufügen** — der Atlas gehört der Engine; die API liest ihn nur. Eigene Texturen bleiben Aufgabe des Texturpack-Systems
- **Nicht-Atlas-Renderer-Konfigurationen fallen auf Stubs zurück** — `bloxdTextureSize() -> vec2u(1u)` und `bloxdTexel(...) -> vec4f(1.0)`, wobei die vier Eingaben `0u, 0u, vec2f(0.0), 0.0` fließen. Code, der für den echten Atlas geschrieben ist, kompiliert und läuft weiterhin — er sieht nur weiße Texel und die Größe 1×1. Code, der `textureId == 0` verträgt, verträgt auch das

## Verwandte Seiten

- **Alle 896 benutzbaren Namen** → [Texturkatalog](texture-catalog.md)
- [Engine-Interna: Textur-Registry](../internals/texture-registry.md) · [Textur-Sampling](../internals/texture-sampling.md)

# Textur-Probleme

> Ziel-API: 5 · Ziel-Build: `ab90qa` · Status: Verified (Meldungen wortwörtlich aus dem Live-Validator aufgezeichnet)

Probleme rund um `bloxdTextureId*` / `bloxdTexel`. Alle 896 Namen im [Texturkatalog](../api/texture-catalog.md) durchsuchen.

## „There's no texture called X. Did you mean bloxdTextureIdY?"

- **Ursache**: ein Tippfehler; der Validator hat **Levenshtein-Vorschläge** (Schwelle `max(2, floor(len/4)) + 1`)
- **Fix**: den Vorschlag annehmen; gegen den [Katalog](../api/texture-catalog.md) abgleichen
- **Vorbeugen**: Namen aus dem Katalog kopieren

## „...names a frame of the animated texture lava: use bloxdTextureIdLava, which bloxdTexel animates."

- **Ursache**: eine **Rahmennummer** auf einer animierten Textur geschrieben (`lava0` etc.)
- **Fix**: den Basisnamen benutzen — Sampeln liefert automatisch den aktuellen Rahmen
- **Vorbeugen**: für die 42 Animationsfamilien nie Rahmen-Suffixe schreiben ([Namensgebung](../api/texture-api.md#schreibregeln-und-namensfreiheit))

## „...names a turned copy of radar_screen0: use bloxdTextureIdRadarScreen0, ..."

- **Ursache**: eine Rotationsfamilien-Gedrehtkopie-Schreibweise geschrieben (`[rot[N`)
- **Fix**: den Wurzelnamen benutzen — `bloxdTexel` wendet die Rotation erneut an

## „...could name X and Y, which differ only by case or underscores, so it can't be used."

- **Ursache**: das Case-/Unterstrich-insensitive Falten ließ den Namen **mehrdeutig**
- **Fix**: die Schreibweise disambiguieren

## „bloxdTextureIdGrassTop isn't part of the shader pack API. Texture names start with exactly bloxdTextureId: did you mean bloxdTextureIdGrassTop?"

- **Ursache**: Präfix falsch geschrieben (z. B. `bloxdTextureID`, `bloxdtextureid`)
- **Fix**: Namen exakt mit `bloxdTextureId` beginnen lassen

## „Case and underscores are not distinguished“ — wie koexistieren beide Regeln?

Die Namensauflösung faltet Case und `_`, daher lösen `bloxdTextureId_grass_top` und `bloxdTextureIdGrassTop` auf **dieselbe** Konstante auf. Nur wenn das Falten mehrere Kandidaten übrig lässt, feuert der eigene Mehrdeutigkeitsfehler ([Namensregeln](../api/texture-api.md#schreibregeln-und-namensfreiheit)).

## bloxdTexel liefert auf Modellen immer weiß

- **Absicht**: die meisten Modelle nutzen `textureId: 0` (keine Textur — Spieler-Skins etc.); `bloxdTexel(0, ...)` liefert `vec4f(1.0)`
- **Fix**: mit `surface.textureId != 0u` auswählen ([modell-eigene Texturen](../api/texture-api.md#modell-eigene-texturen-textureid-0))

## Texturen hinzufügen wollen

- **Grenze**: die Shader-Pack-API **liest** den Atlas nur; Texturen hinzuzufügen ist Aufgabe des Texturpack-Systems ([Kombinationen](../guides/combinations.md))

## „Packs can't use X: the engine binds every texture and sampler..."

- **Ursache**: `texture_*` / `sampler`-Typen direkt deklariert
- **Fix**: über `bloxdTexel()` gehen ([Einschränkungen](../api/restrictions.md))

## Roh-ids brachen nach einem Spiel-Update

- **Ursache**: **ids sind Momentaufnahmen** — gemessen änderten 334 von 905 überlebenden Namen die id zwischen zwei Builds
- **Fix**: `bloxdTextureIdLava` schreiben, nicht `19` ([Namen sind die API](../api/texture-catalog.md#gemessener-drift-cnty9--ab90qa))

## Verwandte Seiten

- [Textur-API](../api/texture-api.md) · [Texturkatalog](../api/texture-catalog.md) · [Textur-Registry-Interna](../internals/texture-registry.md)
